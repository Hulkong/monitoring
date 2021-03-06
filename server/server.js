const fs = require('fs');
const fsCont = require('../lib/file/file-control');
const comm = require('../lib/common/common');
const svcList = config.info['svcList'];

module.exports = {
    that: this,

    // 필요 디렉토리 생성
    makeDirectory: function() {
        fsCont.makeDirectory('./logs/');
        fsCont.makeDirectory('./resource/');
        fsCont.makeDirectory('./resource/dbconn/');
        fsCont.makeDirectory('./resource/physics/');
    },

    processOfDB: function (pools = [], data = []) {
        let that = this;

        /**
         * 커넥션 개수 가져오는 로직
         */
        // 커넥션 풀이 존재하거나, 정제된 데이터가 존재할 경우 아래 로직 실행
        if (pools !== undefined && data.length > 0) {
            data.forEach((d, idx) => {

                // DB에 접속하는 서비스가 있을경우 커넥션 개수 가져옴
                if (d['dbHost'].length > 0) {


                    // DB 커넥션 수 가져옴
                    comm.getDBconn(pools, d).then((saveDataFormat) => {
                        let path = './resource/dbconn/';
                        let fileNm = d['nm'] + '(' + d['usage'] + ').txt';
                        that.saveReource(path, fileNm, saveDataFormat);   // 포맷팅이 완료된 데이터 저장

                    }).catch(comm.errorHandling);   // 에러 처리
                }
            });
        }
    },

    /**
     * @description 서비스 서버 자원 및 상태값 가져오는 로직
     */
    processOfSRsc: function (data = []) {
        let that = this;

        // 정제된 데이터가 있을 경우 아래 로직 실행
        if (data.length > 0) {

            data.forEach((d, idx) => {

                // URL이 있을 경우 아래 로직 실행
                // 일단 BBQ, 뉴스레터 서비스 서버는 제외
                if (d['url'].length > 0) {

                    // 서버 자원 가져옴
                    comm.getSvResource(d, idx).then((res) => {
                        that.processAfterSReq(d, idx, res);
                    }).catch(({ msg, err, sendData }) => {
                        that.processAfterSReq(d, idx, {statusCode: 555});
                        comm.errorHandling(msg, err);
                    });
                }
            });
        }
    },

    processAfterSReq: function(data = [], index = 0, res) {
        let that = this;
        let today = comm.getToday();   // 현재 시간 구함
        let path = '';
        let fileNm = '';

        cleData[index]['code'] = res['statusCode'];
        cleData[index]['date'] = today;

        // 장애일 경우만 로그로 저장
        if (res['statusCode'] === 200) {
            if (data['was'].length > 0 && data['nm'] !== '뉴스레터') {
                // 서비스 서버의 물리자원 이용 데이터 저장
                path = './resource/physics/';
                fileNm = data['nm'] + '(' + data['usage'] + ').txt';
                that.saveReource(path, fileNm, res['body']);
            }
        } else {
            let msg = data['nm'] + '(' + data['usage'] + ') 서버에 장애가 발생하였습니다.' + '\n' + data['ip'] + ':' + data['port'];
            let errTime = cleData[index]['errTime'];
            path = './logs/';
            fileNm = today.split(' ')[0] + '.log';

            that.saveReource(path, fileNm, today + ' ' + res['statusCode'] + ' ' + that.makeLogText(data));

            if (res['statusCode'] === 406) return;

            if (errTime.length === 0) {
                cleData[index]['errTime'] = comm.getToday();
            } else {
                if (that.reservMsgAfter30(today, errTime, msg)) {
                    cleData[index]['errTime'] = today;
                }
            }
        }
    },

    reservMsgAfter30: function(today, before, msg) {

        // 슬랙앱으로 메시지 보낸 후 다음 메시지는 1시간 후에 장애 발생했을 때 보냄
        let currH = today.split(' ')[1].split(':')[0];   // 현재 시각(시 단위)
        let befH = before.split(' ')[1].split(':')[0];   // 직전 에러 발생한 시각(시 단위)
        let currM = today.split(' ')[1].split(':')[1];   // 현재 시각(시 단위)
        let befM = before.split(' ')[1].split(':')[1];   // 직전 에러 발생한 시각(시 단위)

        if ((currH - befH) >= 0 && (currH - befH) >= 1) {   // 양수 이면서 1시간 초과했을 경우
            if (currM - befM === 0) {
                comm.pushMtoSlack(msg);   // 슬랙앱으로 메시지 푸쉬
                return true;
            }
        } else if ((currH - befH) < 0 && ((currH - befH) + 24) >= 1) {   // 음수 이면서 1시간 초과했을 경우
            if (currM - befM === 0) {
                comm.pushMtoSlack(msg);   // 슬랙앱으로 메시지 푸쉬
                return true;
            }
        }

        return false;
        /*
        let currM = today.split(' ')[1].split(':')[1];   // 현재 시각(분 단위)
        let befM = before.split(' ')[1].split(':')[1];   // 직전 에러 발생한 시각(분 단위)

        if ((currM - befM) >= 0 && (currM - befM) >= 30) {   // 양수 이면서 30분 초과했을 경우
            pushMtoSlack(msg);   // 슬랙앱으로 메시지 푸쉬
        } else if ((currM - befM) < 0 && ((currM - befM) + 60) >= 30) {   // 음수 이면서 30분 초과했을 경우
            pushMtoSlack(msg);   // 슬랙앱으로 메시지 푸쉬
        }
        */
    },

    /**
     * @description 원격 서비스의 물리자원 데이터를 노드서버에 저장하는 함수
     * @param {*} name 서비스 이름
     * @param {*} data 저장할 데이터
     */
    saveReource: function(path, file, data) {

        fsCont.getFileInfo(path, file).then((info) => {
            let fsInfo = info;
            let size = 0;

            (fsInfo === undefined) ? size : (size = comm.changeUnit(fsInfo['size'], 'gb'));

            // 파일사이즈가 1GB이상일 때 파일압축 후 기존파일 제거
            if (size >= 1) {
                fsCont.compact(path, file);
            } else {
                fs.appendFile(
                    path + file,
                    JSON.stringify(data) + ',\n',
                    (err) => {
                        if (err) {
                            comm.errorHandling('Failed to add content to the file!', err);
                            return;
                        }
                    });
            }
        });
    },

    /**
     * @description 로그 데이터를 만드는 함수
     * @param {*} params
     * @returns 로그 데이터
     */
    makeLogText: function(params) {
        let nm = params['nm'];
        let usage = '(' + params['usage'] + ')';
        let ip = params['ip'] + ':' + params['port'];
        let url = params['url'].split('/sc')[0];
        let log = nm + ' ' + usage + ' ' + ip + ' ' + url;

        return log;
    },


    cleanData: function() {
        // 정제 데이터
        let cleD = svcList.reduce((pre, curr) => {
            let obj = {
                nm: curr['nm'],
                usage: curr['usage'],
                ip: curr['ip'],
                port: curr['port'],
                url: curr['url'],
                was: curr['was'],
                dbHost: curr['dbHost'] === undefined ? [] : curr['dbHost'],
                database: curr['database'] === undefined ? [] : curr['database'],
                dbUser: curr['dbUser'] === undefined ? [] : curr['dbUser'],
                type: curr['type'] === undefined ? [] : curr['type'],
                code: curr['code'] === undefined ? 200 : curr['code'],
                date: curr['date'] === undefined ? '' : curr['date'],
                errTime: curr['errTime'] === undefined ? '' : curr['errTime']
            };

            pre.push(obj);

            return pre;
        }, []);

        return cleD;
    }
};