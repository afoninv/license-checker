var should = require('should'); 
var assert = require('assert');
var request = require('supertest'); 

describe('List API', function() {
  this.timeout(10000);
  let url = 'http://localhost:3000';

  describe('POST', function() {
    it('should return JSON array of documents with license field', function(done) {
      let filenames = [
        'org/apache/commons/collections4/map/ListOrderedMap.java'
      ];

    request(url)
      .post('/filenames')
      .send(filenames)
      .expect('Content-Type', /json/)
      .expect(200) //Status code
      .end(function(err, res) {
        if (err) {
          throw err;
        }

        res.body.should.be.instanceof(Array).and.have.lengthOf(1);
        res.body[0].should.be.instanceof(Object).and.have.property('license');
        res.body[0].license.should.be.instanceof(Object).and.have.property('title', 'The Apache Software License, Version 2.0');
        done();
      });
    });
  });
});
