let express = require('express');
let router = express.Router();

let Promise = require('bluebird');
let argv = require('yargs').argv;
let packageIdApiHandlers = require('../package-identificators');
let licenseIdApiHandlers = require('../license-extractors');

let cacheBackend = argv['cache'] || 'postgres';
if (['nedb', 'postgres'].indexOf(cacheBackend) === -1) {
  console.warn(`Unknown/unsupported cache backend '${cacheBackend}' for --cache - setting to 'postgres' instead`);
  cacheBackend = 'postgres';
}
console.log('Cache backend ' + cacheBackend);
let cache = require('../cache/' + cacheBackend);

let concurrency = +argv.concurrency || +argv.c || 8;
console.log('Concurrency ' + concurrency);
const config = {
  concurrency,
  defaultIdentifyMethod: 'grepcode',
  defaultGetLicenseMethod: 'grepcode'
};


//
// API
//

router.post('/', function(req, res, next) {

  let DEBUG = (req.headers.referer && req.headers.referer.indexOf('debug') > req.headers.referer.indexOf('?'));
  if (DEBUG) {
    console.warn('DEBUG is on');
  }

  let filePaths = req.body;
  let filesList = normalizeFilePaths(filePaths);

  let licensesPromise = Promise.map(filesList, function (file) {
    let { className } = file;

    let classPackagePromise = identifyPackage(className, config.defaultIdentifyMethod);

    let licensePromise = classPackagePromise.then(function (classPackageData) {
      let packageCoords = classPackageData['package'];

      if (packageCoords === null) {
        return {
          className,
          path: file.filePath,
          'package': null,
          license: null
        };
      }

      return getPackageLicense(packageCoords, config.defaultGetLicenseMethod)
        .then(function constructResult (packageLicenseData) {
          return {
            className,
            path: file.filePath,
            'package': classPackageData['package'],
            license: packageLicenseData.license
          }
        });
    });

    return licensePromise;

  }, { concurrency: config.concurrency });

  licensesPromise.then(function (classesLicenseData) {
    if (DEBUG) {
      getFullData(classesLicenseData).then(function (classesLicenseData) {
        res.json(classesLicenseData)
      });
    } else {
      res.json(classesLicenseData);
    }
  });

});

module.exports = router;


//
// Function definitions
//

function normalizeFilePaths (filePaths) {
  // At this point we check that request input is correct, and throw otherwise.
  // We do not do value guesses, type coercion or deduplication, let frontend
  // handle that to reduce load on server.

  if (!Array.isArray(filePaths) || filePaths.length === 0) {
    throw new Error('Request is not an array with values');
  }

  let filesSet = new Set(filePaths);
  if (filesSet.size !== filePaths.length) {
    throw new Error('List contains duplicates');
  }

  let pathRegex = /^[a-z0-9]+\/[a-z0-9\/]+\.java$/i;
  let classNameRegex = /^[a-z0-9]+\.[a-z0-9\.]+[a-z0-9]$/i;

  let filesList = filePaths.map(function (filePath) {

    if (!filePath ||
        typeof filePath !== 'string' ||
        (!pathRegex.test(filePath) && !classNameRegex.test(filePath) )) {
      throw new Error('List contains invalid value: ' + filePath);
    }

    return {
      filePath,
      className: filePath.replace(/\.java$/, '').replace(/\//g, '.')
    };
  });

  return filesList;
}

function selectPackage(packageData, className) {
  // Strategy pattern for selecting fitting package
  // Simplistic as for now
  if (!packageData) {
    return false;
  }

  if (packageData.packages.length && packageData.source.confidence >= 50) {
    return {
      'package': packageData.packages[0],
      source: packageData.source
    };
  }

  return false;
}

function identifyPackage(className, packageIdentificationMethod) {
  // Get (possibly from cache) package data associated with className, via packageIdentificationMethod

  let apiHandler = packageIdApiHandlers[packageIdentificationMethod];

  if (!apiHandler) {
    throw new Error('Invalid package identification method ' + packageIdentificationMethod);
  }

  function selectPackageWrapped(packageData) { // wrapper to retain className
    let package_ = selectPackage(packageData, className);
    return package_ || Promise.reject('no fitting package');
  }

  let packageInCachePromise = cache.fetch({ className, packageIdentificationMethod })
    .catch(function coldIdentifyPackage () { // cache miss

      let packageFromIdentifierPromise = apiHandler(className)
        .then(selectPackageWrapped)
        .catch(function handleUnidentifiedPackage (reason) {

          if (reason !== 'no fitting package') {
            return Promise.reject(reason);
          };

          return { 'package': null, source: undefined };

        }); // here we have promise of package 

      return packageFromIdentifierPromise.then(function putInCache (identifiedPackage) {
        return cache.put({
          className,
          packageIdentificationMethod,
          'package': identifiedPackage['package'],
          source: identifiedPackage.source
        });
      }).catch(function (reason) {
        // Handle http errors
        if (typeof(reason) === 'object' &&
            reason.name === 'StatusCodeError' ||
            reason.name === 'RequestError' ) {
          return { 'package': null, source: undefined }; // TODO here's code duplication... types are not defined
        }

        return Promise.reject(reason);
      });

    });
  
  return packageInCachePromise;
}

function getPackageLicense(packageCoords, licenseIdentificationMethod) {
  // Get (possibly from cache) license data associated with package coords, via licenseIdentificationMethod

  let apiHandler = licenseIdApiHandlers[licenseIdentificationMethod];

  if (!apiHandler) {
    throw new Error('Invalid license identification method ' + licenseIdentificationMethod);
  }

  let { groupId, artifactId, version, repoPath } = packageCoords;

  let licenseInCachePromise = cache.fetch({ groupId, artifactId, version, licenseIdentificationMethod })
    .catch(function coldGetPackageLicense () { // cache miss

      let licenseFromIdentifierPromise = apiHandler(groupId, artifactId, version, repoPath);

      return licenseFromIdentifierPromise.then(function putInCache (identifiedLicense) {
        return cache.put({
          groupId,
          artifactId,
          version,
          licenseIdentificationMethod,
          license: identifiedLicense
        });
      }).catch(function (reason) {
        // Handle http errors
        if (typeof(reason) === 'object' &&
            reason.name === 'StatusCodeError' ||
            reason.name === 'RequestError' ) {
          return null; // TODO here's code duplication... types are not defined
        }

        return Promise.reject(reason);
      });

    });

  return licenseInCachePromise;
}

function getFullData(classesLicenseData) {
  return Promise.map(classesLicenseData, function (classLicenseData) {

    let { className } = classLicenseData;

    return Promise.map(Object.keys(packageIdApiHandlers), function (packageIdApiHandler) {
      return identifyPackage(className, packageIdApiHandler).then(function (classPackageData) {
        let packageCoords = classPackageData['package'];

        if (packageCoords === null) {
          return {
            'package': null,
            packageIdentificationMethod: packageIdApiHandler,
            licenses: null
          };
        }

        return Promise.map(Object.keys(licenseIdApiHandlers), function (licenseIdApiHandler) {
          return getPackageLicense(packageCoords, licenseIdApiHandler)
            .then(function constructResult (packageLicenseData) {
              return {
                license: packageLicenseData.license,
                licenseIdentificationMethod: licenseIdApiHandler
              };
            });
        }, { concurrency: config.concurrency }).then(function (licenses) {
          return {
            'package': classPackageData['package'],
            source: classPackageData.source,
            packageIdentificationMethod: packageIdApiHandler,
            licenses
          };
        });
      });
    }, { concurrency: config.concurrency }).then(function (packages) {
      classLicenseData._packages = packages;
      return classLicenseData;
    });
  }, { concurrency: config.concurrency });
}
