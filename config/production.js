const production = module.exports;

production.info = {
    'svcList': require('../info/SERVICE-LIST'),
    'slackInfo': require('../info/SLACK-INFO'),
    'socketIp': '192.168.0.194',
    'httpStatus': require('../info/HTTP-STATUS')
};
