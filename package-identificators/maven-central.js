let mavenCentral = { title: 'search.maven.org' };

mavenCentral.fetchClass = function (className) {
  // call api
  // see if exact match 
    // if yes - return packages { source: {reasoning: 'exact', confidence: 100, searchUrl: , viewUrl: }, packages: [{PKG}]}
    // if no - 
};

mavenCentral.fetchPackage = function (className) {
  // split path
  // call api
  // see if exact match
    // if yes - return packages { reasoning: '' exact: [{PKG}]}
};

module.exports = mavenCentral;








// get full class match
// get package 1st level, 2nd level etc
