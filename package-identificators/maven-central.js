let request = require('request-promise');
let cheerio = require('cheerio');


const config = {
  searchClassUrl: 'http://search.maven.org/solrsearch/select?q=fc:',
  viewClassUrl:   'http://search.maven.org/#search%7Cga%7C1%7Cfc%3A'
};


//
// API
//

let mavenCentral = {
  title: 'search.maven.org',
  fetchClass,
  fetchPackage
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

function fetchPackage(className) {
  // TODO Function for getting package by part of class path

  // split path
  // call api (projects/types/methods?)
  // see if exact match
    // if yes - return packages { reasoning: 'packageExact' exact: [{PKG}]}  // packageParent1, packageChild1

  return false;
};
