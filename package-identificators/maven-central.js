let request = require('request-promise');
let cheerio = require('cheerio');


const config = {
  searchClassUrl: 'http://search.maven.org/solrsearch/select?q=fc:',
  viewClassUrl:   'http://search.maven.org/#search%7Cga%7C1%7Cfc%3A',
  guessThreshold: 0.5 // Crop path no more than this fraction of length
};


//
// API
//

let mavenCentral = {
  title: 'search.maven.org',
  fetchClass,
  guessByPath
};

module.exports = mavenCentral;


//
// Function definitions
//

function fetchClass (className) {

  let searchUrl = config.searchClassUrl + className;
  let viewUrl = config.viewClassUrl + className;

  // NB when Maven Central fails to find by exact class, it gives no results (= no guesses)
  let responsePromise = request(searchUrl, { json: true })
    .then(function parseJsonForPackageData (apiResponse) {
      let result = {
        packages: [],
        source: {
          reasoning: 'classExact',
          confidence: 100,
          searchUrl,
          viewUrl
        }
      };

      let packages = (apiResponse.response || {}).docs || [];

      result.packages = packages
        .map(function transformPackageData (rawData) {
          let { g: groupId, a: artifactId, v: version } = rawData;

          if (!groupId || !artifactId || !version) {
            return false;
          }

          return {
            groupId,
            artifactId,
            version,
            repoPath: 'repo1.maven.org/maven2'  // Mainly for grepcode
          };
        })
        .filter(function (package_) {
          return !!package_;
        });

      if (result.packages.length) {
        console.log('Got exact match for class ' + className);
        return result;
      } else {
        console.log('Failed to get exact match for class ' + className);
        return false;
      };
    })

  return responsePromise;
};

function guessByPath(className, initialClassName) {

  if (!initialClassName) { // First call in recursion
    initialClassName = className;
    className = className.slice(0, className.lastIndexOf('.'));
  }

  let partFraction = className.split('.').length / initialClassName.split('.').length;
  if (partFraction < config.guessThreshold) {
    console.log('Failed to make a guess for class ' + className);
    return false;
  }

  let searchUrl = config.searchClassUrl + className;
  let viewUrl = config.viewClassUrl + className;

  // NB when Maven Central fails to find by path, it may give results that contain search query.
  // E.g. query - com.google.android.gms.common , response - com.google.android.gms.common.util.VisibleForTesting

  let responsePromise = request(searchUrl, { json: true })
    .then(function parseJsonForPackageData (apiResponse) {
      let result = {
        packages: [],
        source: {
          reasoning: 'pathPart',
          confidence: partFraction * 100,
          searchUrl,
          viewUrl
        }
      };

      let packages = (apiResponse.response || {}).docs || [];

      result.packages = packages
        .map(function transformPackageData (rawData) {
          let { g: groupId, a: artifactId, v: version } = rawData;

          if (!groupId || !artifactId || !version) {
            return false;
          }

          return {
            groupId,
            artifactId,
            version,
            repoPath: 'repo1.maven.org/maven2'  // Mainly for grepcode
          };
        })
        .filter(function (package_) {
          return !!package_;
        });

      if (result.packages.length) {
        console.log(`Got a guess for class ${className} with ${result.source.confidence}% confidence`);
        return result;
      } else {
        return guessByPath(className.slice(0, className.lastIndexOf('.')), initialClassName);
      };
    });

  return responsePromise;
};
