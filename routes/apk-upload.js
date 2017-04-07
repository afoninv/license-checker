let express = require('express');
let router = express.Router();

let request = require('request');
let requestP = require('request-promise');


const config = {
  apiKey: '552b9f47-e36a-4f8a-a1d4-cff9dc420332'
};


router.post('/', function(req, res, next) {
  let scanConnection = request('https://api.codifiedsecurity.com/scan?apiKey=' + config.apiKey, function (err, resp, body) {
      if (err) {
        return res.json(err);
      }

      let { _id: id, status } = JSON.parse(body);

      if (status !== 'completed') {
        return res.json({ error: 'Unexpected response from scan' });
      }
  
      let resultConnection = requestP({
        uri: `https://api.codifiedsecurity.com/scans/${id}?apiKey=${config.apiKey}`
        json: true
      }).then(function (scanResults) {
        let memo = {};
        findClasses(scanResults, memo);
        let filesList = Object.keys(memo);
        res.json(filesList);
      })
      .catch(function (err) {
        res.json(err);
      });

  });

  req.pipe(scanConnection);

});

function findClasses (obj, memo) {
  // Recursively parses object looking for 'classes' property, which is an array
  // of objects with 'class' property that is a string. Collects such strings.

  if (!obj) {
    return;
  }

  if (Array.isArray(obj)) {
    for (let item of obj) {
      findClasses(item, memo);
    }
  }

  if (typeof(obj) === 'object') {

    if (Array.isArray(obj.classes)) {
      for (let cls of obj.classes) {
        if (cls && typeof(cls) === 'object' && cls.class && typeof(cls.class) === 'string') {
          memo[cls.class] = true;
        }
      }
    }

    for (let key in obj) {
      if (key !== 'classes') {
        findClasses(obj[key], memo);
      }
    }
  }
}

module.exports = router;
