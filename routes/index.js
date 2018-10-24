const express = require('express');
const router = express.Router();

// config load
if (!process.env.NODE_ENV) {
  config = require('../config/development');
} else if (process.env.NODE_ENV == 'production') {
  config = require('../config/production');
} else if (process.env.NODE_ENV == 'development') {
  config = require('../config/development');
}

/* GET home page. */
router.get('/', function (req, res, next) {
  res.render('index', {
    svc: config.info['svcList'],
    slack: config.info['slackInfo'],
    socketIp: config.info['socketIp']
  });
});

/* GET home page. */
router.get('/:where', function(req, res, next) {
  res.render('index', {
    svc: config.info['svcList'],
    slack: config.info['slackInfo'],
    socketIp: config.info['socketIp']
  });
});

module.exports = router;
