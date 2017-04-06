// This folder contains different ways of identifying package by class name.

const methods = {
  mavenCentral: require('./maven-central'),
  grepcode: require('./grepcode'),
//  github, findjar, help4j, etc...
};

module.exports = methods;
