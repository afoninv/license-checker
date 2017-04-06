let request = require('request-promise');
let cheerio = require('cheerio');

const settings = {
  fetchUri: 'http://grepcode.com/snapshot'
};


//
// API
//

let grepcode = {
  title: 'grepcode.com',
  extractByRepoPath, //TODO deprecated
  fetchLicense
};

module.exports = grepcode;


//
// Function definitions
//

function extractByRepoPath (repoPathFull) {
  // TODO error handling
  if (!repoPathFull) {
    return null;
  }

  let licensePromise = request({
    method: 'GET',
    uri: repoPathFull
  }).then(function (body) {

    let $ = cheerio.load(body);
    let licenseLink = $('.snapshot-info-entry>span').filter(function (i, el) {
      return $(el).text().search(/license/i) !== -1;
    }).next('a');
    let license = { title: licenseLink.text(), link: licenseLink.attr('href') };

    return license;
  });

  return licensePromise;
}

function fetchLicense (groupId, artifactId, version, repoPath) {
  let repoPathFull = `${settings.fetchUri}/${repoPath}/${groupId}/${artifactId}/${version}`;

  return extractByRepoPath(repoPathFull);
}
