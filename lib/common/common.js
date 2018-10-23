module.exports = {
    /**
     * @description 장애 or 경고 발생시 해당 서버에 대하여 관리자에게 슬랙 앱으로 메시지 푸쉬하는 함수
     * @param token: 슬랙에서 발급받은 토큰
     * @param channel: 메시지 수신 경로(채널)
     * @param text: 메시지
     * @param username: 송신자
     */
    pushMtoSlack: function(text) {

        webhookUri = 'https://hooks.slack.com/services/' + slackInfo['accessKey'];

        slack = new Slack();
        slack.setWebhook(webhookUri);

        slack.webhook({
            channel: slackInfo['channel'],
            username: slackInfo['username'],
            text: text,
            icon_emoji: ":ghost:"
        }, (err, response) => console.log(response));
    },

    getUsersToSlack: function() {
        apiToken = slackInfo['accessKey'];

        slack = new Slack(apiToken);

        slack.api("users.list", function (err, response) {
            console.log(response);
        });
    },
    /**
     * @description 원하는 바이트단위로 변경해주는 함수
     * @param {*} byte 바이트
     * @param {*} unit 변경할 단위
     */
    changeUnit: function(byte, unit) {

        if (unit === 'kb') {
            let kb = byte / (1024);
            return Math.round(kb * 100) / 100.0;

        } else if (unit === 'mb') {
            let mb = byte / (1024 * 1024);
            return Math.round(mb * 100) / 100.0;

        } else if (unit === 'gb') {
            let gb = byte / (1024 * 1024 * 1024);
            return Math.round(gb * 100) / 100.0;

        } else if (unit === 'tb') {
            let tb = size / (1024 * 1024 * 1024 * 1024);
            return Math.round(tb * 100) / 100.0;

        } else {
            console.log('단위를 입력해주세요.(kb, mb, gb, tb)');
        }
    },

    /**
     * @description 현재 날짜계산 함수
     * * ex) 2018-08-03
     * @returns 현재날짜
     */
    getToday: function() {
        let date = new Date();
        let dd = date.getDate();
        let mm = date.getMonth() + 1; // January is 0!
        let yyyy = date.getFullYear();
        let hhmmss = date.getHours() + ":" + date.getMinutes() + ":" + date.getSeconds();

        if (dd < 10) {
            dd = '0' + dd;
        }

        if (mm < 10) {
            mm = '0' + mm;
        }

        let today = [yyyy, mm, dd].join('-');
        today = today + " " + hhmmss;

        return today;
    }
};