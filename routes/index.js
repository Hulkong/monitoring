const express = require('express');
const router = express.Router();
const svcList = require('../info/svcList');

/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index', {data: svcList});
});

module.exports = router;
