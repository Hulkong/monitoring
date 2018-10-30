const dbFoolInfo = require('../../info/DB-FOOL-INFO');
const dbconn = require('../database/db-connect');
const request = require('request');

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
    },

    sendToClient: function(socket, data) {
        if (socket['readyState'] === 3) {
            socket.close();
        } else {
            socket.send(data);
        }
    },

    errorHandling: function(msg, err) {
        // console.log(msg)
        // console.log(err)
        // comm.pushMtoSlack(msg);
    },

    /**
         * @description 커넥션풀 생성하는 함수
         * @returns 커넥션풀 리스트 객체
         */
    openConnPool: function () {
        return new Promise((resolve, reject) => {
            let obj = {};
            let cnt = 0;
            // DB커넥션이 하나도 없을 경우 빈 객체 리턴
            if(dbFoolInfo.length === 0) {
                resolve(obj);
                return;
            };

            dbFoolInfo.forEach((dbconfig, idx) => {
                if (dbconfig['type'] === 'oracle') {   // 오라클일 경우
                    if (dbconfig['host'] === '115.68.55.203') {    // 115.68.55.203 DB는 TNS 필요
                        let tns = '(DESCRIPTION = (ADDRESS = (PROTOCOL = TCP)(HOST = ' + dbconfig['host'] + ')(PORT = ' + dbconfig['port'] + '))(CONNECT_DATA = (SERVER = DEDICATED)(SID = ' + dbconfig['database'] + ')))';
                        dbconfig.connectString = tns;
                    } else {
                        dbconfig.connectString = dbconfig['host'] + ":" + dbconfig['port'] + '/' + dbconfig['database'];
                    }

                    // 커넥션풀 생성
                    dbconn.createPool(dbconfig, dbconfig['type']).then(pool => {
                        obj[dbconfig['host']] = pool;

                        if (cnt === dbFoolInfo.length - 1) {
                            resolve(obj);
                        }
                        cnt++;
                    });
                } else {   // MariaDB or Postgresql일 경우
                    // 커넥션풀 생성
                    obj[dbconfig['host']] = dbconn.createPool(dbconfig, dbconfig['type']);

                    if (cnt === dbFoolInfo.length - 1) {
                        resolve(obj);
                    }
                    cnt++;
                }
            });
        });
    },

    /**
     * @description db커넥션 정보 가져오는 함수
     * @param {*} pools 커넥션풀 리스트 객체
     * @param {*} data 서비스 정보
     * @returns 커넥션 개수
     */
    getDBconn: function (pools, data) {
        return new Promise((resolve, reject) => {
            let that = this;
            data['dbHost'].forEach((host, i) => {
                let type = data['type'][i];
                let database = data['database'][i];
                let user = data['dbUser'][i];
                let sql = dbconn.makeSql(type);
                let parameter = [];

                if (type === 'oracle') {
                    parameter = [user];
                } else if (type === 'maria') {
                    parameter = [database, user, host, database, user, host];
                } else if (type === 'postgres') {
                    parameter = [database, user, host];
                }

                // 우선 해당 호스트는 제외
                // DB커넥션 개수 가져오는 쿼리 실행
                dbconn.execQuery(pools[host], sql, parameter, type).then(function (result) {
                    let saveDataFormat = {
                        act_cnt: 0,
                        in_act_cnt: 0,
                        tot_conn_cnt: 0,
                        max_conn_cnt: 0,
                        date: that.getToday()
                    };

                    if (type === 'oracle') {
                        saveDataFormat['act_cnt'] = result[0][0];
                        saveDataFormat['in_act_cnt'] = result[0][1];
                        saveDataFormat['tot_conn_cnt'] = result[0][2];
                        saveDataFormat['max_conn_cnt'] = result[0][3];
                    } else {
                        (Object.keys(result)).forEach((key) => { saveDataFormat[key.toLowerCase()] = result[key]; });
                    }

                    resolve(saveDataFormat);
                }).catch((msg, err) => reject(msg, err));
            });
        });
    },

    /**
         *
         * @param {*} data 서비스 정보
         * @param {*} idx 서비스리스트 인덱스
         */
    getSvResource: function (data, idx) {
        return new Promise((resolve, reject) => {
            let that = this;
            request(data['url'], { json: true }, (err, res, body) => {

                // 서비스 서버의 요청에 대한 에러처리
                if (err) {
                    let sendData = that.makeStatData(503, idx, data['nm']);
                    reject({
                        msg: 'request of ' + data['nm'] + '(' + data['usage'] + ')' + ' is failed!',
                        err: err,
                        sendData: sendData
                    });
                    return;
                }

                resolve(res);
            });
        });
    },

    /**
     *
     * @param {*} res reponse데이터
     * @param {*} index 서비스 구별을 위한 인덱스
     */
    makeStatData: function (statusCode, index, nm) {
        return {
            idx: index,
            statusCode: statusCode,
            nm: nm
        };
    }
};