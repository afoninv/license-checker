// This folder contains different ways of identifying package by class name.

const methods = {
  mavenCentral: require('./maven-central').fetchClass,
  mavenCentralGuess: require('./maven-central').guessByPath,
  grepcode: require('./grepcode').fetchClass,
//  github, findjar, help4j, etc...
};

module.exports = methods;
