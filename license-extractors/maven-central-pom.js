let request = require('request-promise');
let xml2js = require('xml2js');
let Promise = require('bluebird');

const settings = {
  fetchUri: 'http://search.maven.org/remotecontent?filepath='
};
//http://search.maven.org/remotecontent?filepath=org/osgi/org.amdatu.remote.topology.promiscuous/0.1.2/org.amdatu.remote.topology.promiscuous-0.1.2.pom TODO

//
// API
//

let mavenCentralPom = {
  title: 'search.maven.org',
  fetchLicense
};

module.exports = mavenCentralPom;


//
// Function definitions
//

function fetchLicense (groupId, artifactId, version, repoPath) {
  //TODO error handling
  let filepath = `${groupId.replace(/\./g, '/')}/${artifactId}/${version}/${artifactId}-${version}.pom`;
  // e.g. 'org/osgi/org.amdatu.remote.topology.promiscuous/0.1.2/org.amdatu.remote.topology.promiscuous-0.1.2.pom'

  let pomUri = settings.fetchUri + filepath;

  let licensePromise = request(pomUri).then(function parseXMLForLicenseData (xmlResponse) {

    let xmlParser = new xml2js.Parser()
    let asyncParse = Promise.promisify(xmlParser.parseString, { context: xmlParser });

    return asyncParse(xmlResponse).then(function constructResult (pom) {

      let licenses = (pom.project.licenses || []).map(extractLicenseFromXml);
      let license = extractLicenseFromXml(pom.project.license) || licenses[0];

      if (licenses.length) {
        license = Object.assign({ all: licenses }, license); // to prevent circular reference
      }

      return license;
    });
  });

  return licensePromise;
}

function extractLicenseFromXml (licenseStruct={}) {
  let license = (licenseStruct.license || [])[0];
  if (license) {
    for (let key in license) {
      license[key] = license[key][0];
    }
  }
  return license;
}
