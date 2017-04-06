// This folder contains different ways of identifying license by package coords.

const methods = {
//  mavenCentral: require('./maven-central'),
  grepcode: require('./grepcode')
};

module.exports = methods;
