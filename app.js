console.log("NODE_ENV : " + process.env.NODE_ENV)

// config load
if (!process.env.NODE_ENV) {
  config = require('./config/development');
} else if (process.env.NODE_ENV == 'production') {
  config = require('./config/production');
} else if (process.env.NODE_ENV == 'development') {
  config = require('./config/development');
}

const createError = require('http-errors');
const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const indexRouter = require('./routes/index');
const resourceRouter = require('./routes/resource');
const server = require('./server/server');
const comm = require('./lib/common/common');
const fs = require('fs');
const app = express();
process.env['NODE_TLS_REJECT_UNAUTHORIZED'] = 0;

// view engine setup
// app.set('view engine', 'jade');

// html 을 템플릿을 사용하기 위해서는 ejs가 필요
// app.engine('html', require('ejs').renderFile);
// app.set('view engine', 'html');

// app.use(logger('dev'));

app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/js', express.static(__dirname + '/node_modules/jquery/dist'));
app.use('/js', express.static(__dirname + '/node_modules/chart.js/dist'));
app.use('/js', express.static(__dirname + '/node_modules/bootstrap/dist/js'));
app.use('/css', express.static(__dirname + '/node_modules/bootstrap/dist/css'));

app.use('/', indexRouter);
app.use(['/resource'], resourceRouter);

process.on('uncaughtException', function (message) {
  let msg = (message && message.stack) ? message.stack : message;
  console.error(msg)
  fs.appendFile(
    __dirname + '/logs/server.log',
    msg + '\n',
    (err) => {
      if (err) {
        comm.errorHandling('Failed to add content to the file!', err);
        return;
      }
    });
});

// catch 404 and forward to error handler
app.use(function (req, res, next) {
  if (req.originalUrl === '/favicon.ico') {
    res.status(204).json({ nope: true });
  } else {
    next(createError(404));
  }
});

// error handler
app.use(function (err, req, res, next) {

  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

server.makeDirectory();   // 필요 디렉토리 생성
cleData = server.cleanData();

// 커넥션풀 오픈
comm.openConnPool().then((pools) => {
  // 300000
  setInterval(() => {
    server.processOfDB(pools, cleData);
    server.processOfSRsc(cleData);
  }, 5000);
});

module.exports = app;