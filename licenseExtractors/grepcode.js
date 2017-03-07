let request = require('request-promise');
let cheerio = require('cheerio');

let grepcode = { title: 'grepcode.com' };

const settings = {
  fetchUri: 'http://grepcode.com/snapshot'
};

grepcode.extractByRepoPath = function (repoPath) {

  if (!repoPath) {
    return {};
  }

  let licensePromise = request({
    method: 'GET',
    uri: settings.fetchUri + repoPath
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

module.exports = grepcode;
