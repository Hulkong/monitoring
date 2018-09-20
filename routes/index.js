const express = require('express');
const router = express.Router();
const svcList = require('../info/SERVICE-LIST');
const slackInfo = require('../info/SLACK-INFO');

/* GET home page. */
router.get('/', function (req, res, next) {
  res.render('index', { svc: svcList, slack: slackInfo, where: req.params.where});
});

/* GET home page. */
router.get('/:where', function(req, res, next) {
  res.render('index', { svc: svcList, slack: slackInfo, where: req.params.where});
});

module.exports = router;
