let request = require('request-promise');
let cheerio = require('cheerio');


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
  fetchClass
};

module.exports = grepcode;


//
// Function definitions
//

function fetchClass(className) {

  let searchUrl = config.searchTypeUrl + className;

  let responsePromise = request(searchUrl)
    .then(function parseHtmlForPackageData (page) {

      let $ = cheerio.load(page);
      let $searchResults = $('.search-result');
      let result = {
        packages: [],
        source: {
          reasoning: 'classExact',
          confidence: 100,
          searchUrl,
          viewUrl: searchUrl
        }
      };

      if ($searchResults.find('.no-results').length) {
        console.log('No results for class ' + className + ' on grepcode');
        return false;
      };

      $searchResults.find('.search-result-item').each(function (idx, itemEl) {

        let $item = $(itemEl);
        if ($item.find('.entity-name').text() === className) {

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

            let $versions = $artifact.find('.result-list>.container-name');
            $versions.each(function (idx, versionEl) {
              let $version = $(versionEl);

              // Parse a href to extract data about groupId, version and
              // repoPath... not convenient, but it's something
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

          return false; //break
        };

      });

      if (result.packages.length) {
        console.log('Got exact match for class ' + className);
        return result;
      } else {
        console.log('Failed to get exact match for class ' + className);
        return false;
      };
    });

  return responsePromise;

};
