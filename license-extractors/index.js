// This folder contains different ways of identifying license by package coords.

const methods = {
  mavenCentralPom: require('./maven-central-pom'),
  grepcode: require('./grepcode'),
//  mavenCentralLicenseFile
};

module.exports = methods;
