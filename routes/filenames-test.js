let express = require('express');
let router = express.Router();

let Promise = require('bluebird');
let cache = require('../cache/nedb');
let packageIdApiHandlers = require('../package-identificators');
let licenseIdApiHandlers = require('../license-extractors');

const config = {
  concurrency: 8
};


//
// API
//

router.post('/', function(req, res, next) {
  // TODO id methods; 'all' method

  let filePaths = req.body;
  let filesList = normalizeFilePaths(filePaths);

  let licensesPromise = Promise.map(filesList, function (file) {
    let { className } = file;

    let classPackagePromise = identifyPackage(className, 'grepcode'); // TODO id method hardcoded

    let licensePromise = classPackagePromise.then(function (classPackageData) {
      let packageCoords = classPackageData['package'];

      if (packageCoords === null) {
        return null;
      }

      return getPackageLicense(packageCoords, 'grepcode') //TODO id method hardcoded
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

  licensesPromise.then(function (licenses) {
    res.json(licenses);
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

  let filesList = filePaths.map(function (filePath) {
    if (!filePath || typeof filePath !== 'string') {
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

  if (packageData.packages.length && packageData.source.confidence >= 90) {
    return packageData.packages[0];
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

      let packageFromIdentifierPromise = apiHandler.fetchClass(className)
        .then(selectPackageWrapped)
        .catch(function (reason) { // fetch by class failed to provide fitting package...

          if (reason !== 'no fitting package') {
            return Promise.reject(reason);
          };

          return apiHandler.fetchPackage(className)
            .then(selectPackageWrapped);

        })  // here we have promise of package or strategy rejection
        .catch(function handleUnidentifiedPackage (reason) {

          if (reason !== 'no fitting package') {
            return Promise.reject(reason);
          };

          return null;

        }); // here we have promise of package 

      return packageFromIdentifierPromise.then(function putInCache (identifiedPackage) {
        return cache.put({ className, packageIdentificationMethod, 'package': identifiedPackage });
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

      let licenseFromIdentifierPromise = apiHandler.fetchLicense(groupId, artifactId, version, repoPath);

      return licenseFromIdentifierPromise.then(function putInCache (identifiedLicense) {
        return cache.put({ groupId, artifactId, version, licenseIdentificationMethod, license: identifiedLicense });
      });
    });

  return licenseInCachePromise;
}
