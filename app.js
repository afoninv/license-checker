var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var argv = require('yargs').argv;

var index = require('./routes/index');
var filenames = require('./routes/filenames');
var apkUpload = require('./routes/apk-upload');

var app = express();

//TESTS

// For killing test server by process name.
//    npm start -- --title=my_title
process.title = argv.title || process.title;


//DEBUG

// You may write outbound requests data to log file by specifying command-line
// option. 'info' level does not record response data, 'debug' level does.
//    npm start -- --debug-request=info

let logLevel = argv['debug-request'];
if (logLevel) {
  if (!(logLevel in ['debug', 'info'])) {
    console.warn(`Unknown/unsupported log level ${logLevel} for --debug-request - setting to 'info' instead`);
    logLevel = 'info';
  };

  let globalLog = require('./log/global-request-logger-with-timing');
  globalLog.initialize();

  let winston = require('winston');
  let transports = [
    new (winston.transports.File)({
      name: 'info-file',
      filename: 'filelog-info.log',
      level: 'info'
    })
  ];
  if (logLevel.toLowerCase() === 'debug') {
    transports.push(new (winston.transports.File)({
      name: 'debug-file',
      filename: 'filelog-debug.log',
      level: 'debug'
    }))
  };

  let logger = new (winston.Logger)({ transports });

  // Logging for http calls happens here.
  globalLog.on('success', handleHttpLogEvent.bind('successful outgoing http call'));
  globalLog.on('error', handleHttpLogEvent.bind('error in outgoing http call'));

  function handleHttpLogEvent (request, response) {
    let noResponseBody = Object.assign({}, response);
    if (response && response.body) {
      delete noResponseBody.body;
    };

    let message = String(this) || '';

    logger.info(message, { request, response: noResponseBody });
    logger.debug(message, { request, response });
  }
}

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'hbs');

// uncomment after placing your favicon in /public
app.use(favicon(path.join(__dirname, 'public/images', 'favicon.png')));
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(require('less-middleware')(path.join(__dirname, 'public')));
app.use(express.static(path.join(__dirname, 'public')));

app.use('/', index);
app.use('/filenames', filenames);
app.use('/apk-upload', apkUpload);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  var err = new Error('Not Found');
  err.status = 404;
  next(err);
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;
