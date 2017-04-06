let request = require('request-promise');
let cheerio = require('cheerio');
let Promise = require('bluebird');


const config = {
  searchTypeUrl:    'http://grepcode.com/search?start=0&entity=type&query=',
  searchProjectUrl: 'http://grepcode.com/search?start=0&entity=project&query=',
  searchMethodUrl:  'http://grepcode.com/search?start=0&entity=method&query=',
};


//
// API
//

let grepcode = {
  title: 'grepcode.com',
  fetchClass,
  fetchPackage
};

module.exports = grepcode;


//
// Function definitions
//

function fetchClass(className) {

  let url = config.searchTypeUrl + className;

  let responsePromise = request(url)
    .then(function (page) {

      let $ = cheerio.load(page);
      let $searchResults = $('.search-result');
      let result = {
        packages: [],
        source: {
          reasoning: 'classExact',
          confidence: 100,
          searchUrl: url,
          viewUrl: url
        }
      };

      if ($searchResults.find('.no-results').length) {
        console.log('No results for class ' + className + ' on grepcode');
        console.log(url);
        return false;
      };

      $searchResults.find('.search-result-item').each(function (idx, itemEl) {

        let $item = $(itemEl);
        if ($item.find('.entity-name').text() === className) {

          console.log('Found exact match for class ' + className);
          let $artifacts = $item.find('.container-group, .container-group-hidden'); // including container-group-hidden

          $artifacts.each(function (idx, artifactEl) {
            let $artifact = $(artifactEl);

            let $label = $artifact.find('.container-label'); // artifactId
            if (!$label.length) {
              return true; // may be empty - service div on page; continue
            }
            let artifactId = $label.text().trim();
            let groupId;
            let repoPath;
            console.log('found artifact id ' + artifactId);

            let $versions = $artifact.find('.result-list>.container-name');
            $versions.each(function (idx, versionEl) {
              let $version = $(versionEl);

              // Parse a href to extract data... not convenient, but it's something
              let version = $version.text();
              let hrefParts = $version.attr('href').split('/');
              let artifactIndex = hrefParts.indexOf(artifactId);
              let versionIndex = hrefParts.indexOf(version);
              groupId = groupId || hrefParts[artifactIndex - 1];
              let groupIndex = hrefParts.indexOf(groupId);

              // sanity checks...
              if (versionIndex === -1 ||
                  artifactIndex === -1 ||
                  groupIndex === -1 ||
                  versionIndex - artifactIndex !== 1 ||
                  artifactIndex - groupIndex !== 1) {
                throw new Error(`parser choked at grepcode.com, class ${className}, artifact ${artifactId}, version ${version}`);    
              };

              repoPath = repoPath || hrefParts.slice(1, groupIndex);
              result.packages.push({
                groupId,
                artifactId,
                version,
                repoPath: repoPath.join('/')
              });

            });
          });
          console.log('Got results for class ' + className);
          console.log(result);
          return false; //break
        };

      });

      return (result.packages.length) ?
        result : false;
    });

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
