const production = module.exports;

production.info = {
    'svcList': require('../info/SERVICE-LIST'),
    'slackInfo': require('../info/SLACK-INFO'),
    'socketIp': 'localhost',
    'httpStatus': require('../info/HTTP-STATUS')
};
