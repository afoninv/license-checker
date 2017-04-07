var should = require('should'); 
var assert = require('assert');
var request = require('supertest'); 

should.Assertion.add('oneLicenseResponse', function() {
  this.params = { operator: 'to be list response with single license data item' };
  this.obj.should.be.instanceof(Array).and.have.lengthOf(1);
  this.obj[0].should.be.instanceof(Object).and.have.property('license');
});

describe('List API', function() {
  this.timeout(10000);
  let url = 'http://localhost:3009';

  describe('org/apache/commons/collections4/map/ListOrderedMap.java', function() {
    it('should return JSON array of 1 document with license field like \'Apache 2\'', function(done) {
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

        res.body.should.be.oneLicenseResponse();
        res.body[0].license.should.be.instanceof(Object).and.have.property('name');
        res.body[0].license.name.should.match(/apache.*?2/i);
        done();
      });
    });
  });

  describe('a/b/c/d.java', function() {
    it('should return JSON array of 1 document with null license field', function(done) {
      let filenames = [
        'a/b/c/d.java'
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

        res.body.should.be.oneLicenseResponse();
        res.body[0].should.have.property('license', null);
        done();
      });
    });
  });

  describe('a/b/c/d', function() {
    it('should return error', function(done) {
      let filenames = [
        'a/b/c/d'
      ];

    request(url)
      .post('/filenames')
      .send(filenames)
      .expect(500) //Status code
      .end(function(err, res) {
        if (err) {
          throw err;
        }

        done();
      });
    });
  });
});
