let Promise = require('bluebird');
let Datastore = require('nedb');
let db = new Datastore({ filename: './cache/nedb.db', autoload: true });

//db.remove({ packageIdentificationMethod: 'mavenCentralGuess' }, { multi: true }); // Clean on app launch, for test purposes! TODO

let asyncFindOne = Promise.promisify(db.findOne, { context: db });
let asyncInsert = Promise.promisify(db.insert, { context: db });

let service = {
  fetch: function (searchObj) {
    let cachePromise = asyncFindOne(searchObj)
      .then(function (doc) {
        if (doc == null) {
          return Promise.reject('not found');
        }

        return doc;
      })

    return cachePromise;
  },
  put: function (doc) {
    let insertPromise = asyncInsert(doc); // So that we don't put a document twice on occasions.

    return insertPromise;
  }
};

module.exports = service;
