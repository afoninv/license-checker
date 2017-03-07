let express = require('express');
let router = express.Router();

let Promise = require('bluebird');
let licenseExtractor = require('../licenseExtractors/grepcode'); // Hardcoded for now
let cache = require('../cache/nedb');

const apiConfig = {
  path: '../searchApis',
  concurrency: 8,
  apis: {
    help4j: {
      // Some settings
    }
  }
};

router.post('/', function(req, res, next) {

  let filePaths = req.body;
  let filesList = normalizeFilePaths(filePaths);
  
  let licensesPromise = fetchLicenses(filesList);
  licensesPromise.then(function (licenses) {
    res.json(licenses);
  });
});

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

function fetchLicenses (filesList) {
  // At this point we assume filesList is correct, deduped, contains class names.
  // Do queueing/caching/aggregating here.

  for (let apiName in apiConfig.apis) {
    let apiHandler = require(`${apiConfig.path}/${apiName}`);

    let licensesPromise = Promise.map(filesList, function (file) {
      // The interface between fetching class origin and getting its license is
      // actually not very well thought through. Point of improvement!

      return cache
        .fetch(file.className)
        .catch(function () { //cache miss
          apiHandler
            .fetch(file.className)
            .then(licenseExtractor.extractByRepoPath)
            .then(function (license) {
              cache.put({ className: file.className, license });
              return license;
            });

          return { status: 'pending' };
        })
        .then(function (license) {
          return { path: file.filePath, 'class': file.className, license: license };
        });
    }, { concurrency: apiConfig.concurrency });
    
    return licensesPromise;
  }
}

module.exports = router;
