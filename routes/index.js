const express = require('express');
const router = express.Router();

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
