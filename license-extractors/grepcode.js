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
  fetchLicense
};

module.exports = grepcode;


//
// Function definitions
//

function fetchLicense (groupId, artifactId, version, repoPath) {
  let repoPathFull = `${settings.fetchUri}/${repoPath}/${groupId}/${artifactId}/${version}`;

  if (!repoPathFull) {
    return null;
  }

  let licensePromise = request(repoPathFull).then(function parseHtmlForLicenseData (body) {

    let $ = cheerio.load(body);
    let licenseLink = $('.snapshot-info-entry>span').filter(function (i, el) {
      return $(el).text().search(/license/i) !== -1;
    }).next('a');

    if (!licenseLink.length) {
      return null;
    }

    let license = { name: licenseLink.text(), url: licenseLink.attr('href') };

    return license;
  });

  return licensePromise;
}
