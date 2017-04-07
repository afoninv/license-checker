// This folder contains different ways of identifying license by package coords.

const methods = {
  mavenCentralPom: require('./maven-central-pom').fetchLicense,
  grepcode: require('./grepcode').fetchLicense,
//  mavenCentralLicenseFile
};

module.exports = methods;
