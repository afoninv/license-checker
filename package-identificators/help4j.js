// TODO API is incorrect now. Left for reference / future refactoring

let request = require('request-promise');

let help4j = { title: 'help4j.com' };

const settings = {
  fetchUri: 'http://help4j.com/jar/search.qsp?q='
};

help4j.fetch = function (className) {

  let linkPromise = request({
    method: 'GET',
    uri: settings.fetchUri + className,
    json: true
  }).then(function (repos) {

    // Matching.
    let repoBestMatch = repos.result.find(function (repo) {
      return repo.name === className;
    }) || repos.result[0];

    let repoPath;

    try {
      repoPath = repoBestMatch.jars[0].jarVersions[0].linkurl;  //TODO versions match etc // TODO types
    } catch (e) {
      console.warn(e);
    }

    return repoPath;
  });

  return linkPromise;
}

module.exports = help4j;
