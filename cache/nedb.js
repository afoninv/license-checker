let Promise = require('bluebird');
let Datastore = require('nedb');
let db = new Datastore({ filename: './cache/nedb.db', autoload: true });

db.remove({}, { multi: true }); // Clean on app launch, for test purposes! TODO

let asyncFindOne = Promise.promisify(db.findOne, { context: db });

let service = {
  fetch: function (className) {
    let cachePromise = asyncFindOne({ className })
      .then(function (doc) {
        if (doc == null) {
          return Promise.reject('not found');
        }

        return doc.license;
      })

    return cachePromise;
  },
  put: function (doc) {
    db.insert(doc);
  }
};

module.exports = service;
