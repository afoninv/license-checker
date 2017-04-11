// Very simple cache implementation in Postgres, mainly to get away from nedb
// and work out deployment integration with Postgres.

let pg = require('pg');
var url = require('url');
let Promise = require('bluebird');

//
// Configure connection
//

// TODO joi scheme
// TODO indices

let connectionUrl = process.env.POSTGRES_PORT;

if (!connectionUrl) {
  throw new Error("FATAL: can't connect to postgres - environment variable missing!");
}

let params = url.parse(connectionUrl);
let auth = (params.auth || '').split(':');
let envPassword = process.env.POSTGRES_ENV_POSTGRES_PASSWORD;

const poolConfig = {
  user: auth[0] || 'postgres', //env var: PGUSER
  database: 'postgres', //env var: PGDATABASE
  password: envPassword || auth[1], //env var: PGPASSWORD
  host: params.hostname, // Server hosting the postgres database
  port: params.port, //env var: PGPORT
  max: 10, // max number of clients in the pool
  idleTimeoutMillis: 30000, // how long a client is allowed to remain idle before being closed
  Promise
};

const config = {
  tableName: 'objects'
};


let pool = new pg.Pool(poolConfig);

pool.query(`CREATE TABLE IF NOT EXISTS ${config.tableName} (
  ID serial NOT NULL PRIMARY KEY,
  data json NOT NULL
);`);


//
// API
//

let service = {
  fetch: fetchFromPostgres,
  put: putToPostgres
};

module.exports = service;


//
// Function definitions
//

function fetchFromPostgres (searchObj) {
  let filter = [];
  for (let key in searchObj) {
    let value = searchObj[key];

    if (value && typeof(value) === 'object') {
      throw new Error('Nested objects are not supported in current cache implementation');
    };

    if (typeof(value) === 'string') {
      filter.push(`data ->> '${key}' = '${value}'`);
    } else if (typeof(value) === 'number' && Number.isInteger(value)) {
      filter.push(`CAST (data ->> '${key}' AS INTEGER) = ${value}`);
    } else {
      throw new Error('UNEXPECTED') // TODO
    }

  };

  let where = 'WHERE (' + filter.join(') AND (') + ')';

  let cachePromise = pool.query(`SELECT data
                                  FROM ${config.tableName}
                                  ${where}
                                  LIMIT 1`)
    .then(function (result) {
      let row = result.rows[0] || {};
      return row.data || Promise.reject('not found');
    });

  return cachePromise;
}

function putToPostgres (doc) {
  let insertPromise = pool.query(`INSERT
                                    INTO ${config.tableName} (data)
                                    VALUES ($1)
                                    RETURNING data`, [doc])  // TODO upsert
    .then(function (result) {
      return result.rows[0].data;
    });

  return insertPromise;
}
