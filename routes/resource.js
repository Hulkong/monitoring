const express = require('express');
const router = express.Router();
const request = require('request');
const fs = require('fs');
const zlib = require('zlib');
const readLastLines = require('read-last-lines');
const WebSocketServer = require("ws").Server;
const wss = new WebSocketServer({ port: 3001 });
const Slack = require('slack-node');
const svcList = require('../info/SERVICE-LIST');
const dbFoolInfo = require('../info/DB-FOOL-INFO');
const slackInfo = require('../info/SLACK-INFO');
const dbconn = require('../lib/db-connect');
let pageNm = 'main';
let pageIdx = -1;
let pageStaus = '정상';

/**
 * @description 해당 url에 대한 서버 물리자원 이용률 가져옴
 * * 프로세스:
 *  1. 파라미터로 받은 url로 http 통신 요청
 *  2. response로 받은 해당 서버 자원 이용률 데이터를 nodejs가 설치된 서버 내에 txt파일로 저장
 *  3. 서버 자원 이용률 데이터를 클라이언트로 응답함
 *  4. 위의 두 과정은 비동기 처리!
 */
router.post('/', function (req, res, next) {

  openSocket();

  res.json({
    message: "server socket open",
    statusCode: 200
  });
});

router.get('/sub/dbConn/:idx', function (req, res, next) {
  let path = './resource/dbconn/';
  getResource(path, req.params.idx, res);   // 저장된 서비스 자원 데이터를 가져옴
});

router.get('/sub/svResource/:idx', function (req, res, next) {
  let path = './resource/physics/';
  getResource(path, req.params.idx, res);   // 저장된 서비스 자원 데이터를 가져옴
});

const openConnPool = () => {

  let obj = {};

  dbFoolInfo.forEach((dbconfig) => {
    if (dbconfig['type'] === 'oracle') {
      if(dbconfig['host'] === '115.68.55.203') {
        let tns = '(DESCRIPTION = (ADDRESS = (PROTOCOL = TCP)(HOST = ' + dbconfig['host'] + ')(PORT = ' + dbconfig['port'] + '))(CONNECT_DATA = (SERVER = DEDICATED)(SID = ' + dbconfig['database'] + ')))';
        dbconfig.connectString = tns;
      } else {
        dbconfig.connectString = dbconfig['host'] + ":" + dbconfig['port'] + '/' + dbconfig['database'];
      }
      dbconn.createPool(dbconfig, dbconfig['type']).then((pool) => {
        obj[dbconfig['host']] = pool;
      })
    } else {
      obj[dbconfig['host']] = dbconn.createPool(dbconfig, dbconfig['type']);
    }
  });

  return obj;
};

/**
 * @description 데이터베이스 종류에 따라 쿼리 생성
 * @param {*} type 데이터베이스 종류
 * @param {*} status 활성 / 비활성
 * @returns 쿼리
 */
const makeSql = (type) => {
  let sql = '';

    if (type === 'oracle') {
      sql = `SELECT A.CNT ACT_CNT, B.CNT INACT_CNT, (A.CNT + B.CNT) TOT_CONN_CNT
                FROM (
                          SELECT COUNT(*) CNT FROM V$SESSION WHERE USERNAME = :username AND STATUS = 'ACTIVE'
                        ) A
                      , (
                          SELECT COUNT(*) CNT FROM V$SESSION WHERE USERNAME = :username AND STATUS = 'INACTIVE'
                        ) B`;
    } else if (type === 'maria') {
      sql = "SELECT A.CNT ACT_CNT, B.CNT INACT_CNT, (A.CNT + B.CNT) TOT_CONN_CNT FROM ";
      sql += "(SELECT COUNT(*) CNT FROM information_schema.PROCESSLIST WHERE DB = ? AND USER = ? AND HOST LIKE CONCAT(?, '%') AND COMMAND = 'Sleep') A ";
      sql += ", (SELECT COUNT(*) CNT FROM information_schema.PROCESSLIST WHERE DB = ? AND USER = ? AND HOST LIKE CONCAT(?, '%') AND(COMMAND = 'Query' || COMMAND = 'Execute')) B";
    } else if (type === 'postgres') {
      sql = "SELECT 0 AS ACT_CNT, 0 AS INACT_CNT, SUM(NUMBACKENDS) AS TOT_CONN_CNT FROM PG_STAT_DATABASE WHERE DATNAME=$1::text"
    }

  return sql;
};

/**
 * @description
 * 서버 소켓 생성 및 클라이언트 소켓과 연결
 *
 * 연결 후 서비스 서버의 물리자원 이용률 요청 함수 호출
 */
const openSocket = () => {
  // 연결이 수립되면 클라이언트에 메시지를 전송하고 클라이언트로부터 메시지를 송수신
  wss.on('connection', (ws) => {
    let pools = openConnPool();

    let cleanData = svcList.reduce((pre, curr) => {
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
        type: curr['type'] === undefined ? [] : curr['type']
      };

      pre.push(obj);

      return pre;
    }, []);

    ws.send(JSON.stringify({message: 'hello! I am a server.', statusCode: 444}));

    makeDirectory('./logs/');
    makeDirectory('./resource/dbconn/');
    makeDirectory('./resource/physics/');

    // repeatExecution(ws, undefined, cleanData);
    // setInterval(() => { repeatExecution(ws, pools, cleanData)}, 10000);

    ws.on('message', (message) => {
      console.log("Receive: %s", message);
      pageNm = message.split(',')[0];
      pageIdx = message.split(',')[1];
      pageStaus = message.split(',')[2];
    });

    ws.on('error', (err) => {
      console.log(err);
    })
  });
};

/**
 * @description db커넥션 정보 가져오는 함수
 * @param {*} data 서비스 정보
 * @returns 커넥션 개수
 */
const getDBconn = (pools, data) => {
  return new Promise((resolve, reject) => {
    data['dbHost'].forEach((host, i) => {
      let type = data['type'][i];
      let database = data['database'][i];
      let user = data['dbUser'][i];
      let sql = makeSql(type);
      let parameter = [];

      if (type === 'oracle') {
        parameter = [user];
      } else if (type === 'maria') {
        parameter = [database, user, host, database, user, host];
      } else if (type === 'postgres') {
        parameter = [database];
      }

      // 우선 해당 호스트는 제외
      // DB커넥션 개수 가져오는 쿼리 실행
      dbconn.execQuery(pools[host], sql, parameter, type).then(function (result) {
        let saveDataFormat = {
          act_cnt: 0,
          in_act_cnt: 0,
          tot_conn_cnt: 0,
          date: getToday()
        };

        if (type === 'oracle') {
          saveDataFormat['act_cnt'] = result[0][0];
          saveDataFormat['in_act_cnt'] = result[0][1];
          saveDataFormat['tot_conn_cnt'] = result[0][2];
        } else {
          (Object.keys(result)).forEach((key) => { saveDataFormat[key.toLowerCase()] = result[key]; });
        }

        resolve(saveDataFormat);
      }).catch((msg, err) => reject(msg, err));
    });
  });
};

const getSvResource = (data, idx) => {
  return new Promise((resolve, reject) => {
    request(data['url'], { json: true }, (err, res, body) => {

      // 서비스 서버의 요청에 대한 에러처리
      if (err) {
        let sendData = makeStatData(503, idx, data['nm']);
        reject({
          msg: 'request of ' + data['nm'] + '(' + data['usage'] + ')' + ' is failed!',
          err: err,
          sendData: sendData
        });
        return;
      }

      let today = getToday();   // 현재 시간 구함
      let logTxt = today + ' ' + res['statusCode'] + ' ' + makeLogText(data);  // 로그데이터 생성

      makeLogFile(logTxt, today);   // 로그파일을 만듬

      resolve(res);
    });
  });
};

/**
 * @description 서비스 서버의 물리자원 이용률 반복요청하는 함수
 * @param {*} websocket 연결된 웹소켓
 * @returns 서비스 서버의 물리자원(json)
 */
const repeatExecution = (websocket, pools, cleanData) => {
  cleanData.forEach((data, idx) => {

    // DB에 접속하는 서비스가 있을경우 커넥션 개수 가져옴
    if(pools !== undefined && data['dbHost'].length > 0) {

      getDBconn(pools, data)
        .then((saveDataFormat) => {
          let path = './resource/dbconn/';
          saveReource(path, data['nm'] + '(' + data['usage'] + ')', saveDataFormat);   // 포맷팅이 완료된 데이터 저장

          if (pageNm === 'sub') {
            if (pageIdx == idx && pageStaus !== '장애') {
              return websocket.send(JSON.stringify(saveDataFormat));
            }
          }
        }).catch(errorHandling);
    }

    // 서비스 서버에 was가 있을 경우 sc.jsp 호출
    if(data['url'].length > 0) {
      // 일단 BBQ, JTI, 뉴스레터 서비스 서버는 제외
      if ( !(data['nm'] === 'BBQ' || data['nm'] === 'JTI') ) {
        /*
         * 테스트 데이터
         * 데이터 이름 : TEST
         */

        getSvResource(data, idx)
          .then((res) => {
            if (data['was'].length > 0 && res['statusCode'] === 200 && data['nm'] !== '뉴스레터') {
              let path = './resource/physics/';
              saveReource(path, data['nm'] + '(' + data['usage'] + ')', res['body']);   // 서비스 서버의 물리자원 이용 데이터 저장
            }

            if (pageNm === 'sub') {   // sub페이지 일 때
              if (pageIdx == idx && pageStaus !== '장애') {   // 선택된 페이지의 서비스 인덱스일 때와 장애가 아닐 때
                return websocket.send(JSON.stringify(res['body']));   // 서비스 서버의 물리자원 이용률 리턴
              }
            } else {   // main페이지 일 때
              let sendData = makeStatData(res['statusCode'], idx, data['nm']);   // 상태
              return websocket.send(JSON.stringify(sendData));
            }
          }).catch(({msg, err, sendData}) => {
            errorHandling(msg, err);
            if (pageNm !== 'sub') {
              return websocket.send(JSON.stringify(sendData));
            }
          });
      }
    }
  });
};

const errorHandling = (msg, err) => {
  console.log(msg)
  // pushMtoSlack(msg);
  //if(err !== undefined) console.error(err.message, err.stack);
};

/**
 *
 * @param {*} res reponse데이터
 * @param {*} index 서비스 구별을 위한 인덱스
 */
const makeStatData = (statusCode, index, nm) => {
  return {
    idx: index,
    statusCode: statusCode,
    nm: nm
  };
};

/**
 * @description 디렉토리가 없을 시 생성하는 함수
 * @param {*} path 저장할 디렉토리 경로
 */
const makeDirectory = (path) => {

  // 폴더가 존재하는지 확인 후 로직 실행
  searchFolder(path).then((files) => {
    if (files === undefined) createFolder(path);
  });
};

/**
 * @description 로그파일을 만드는 함수
 * @param {*} logTxt 로그파일에 입력할 데이터
 * @param {*} date 파일이름을 날짜를 기본으로 생성
 */
const makeLogFile = (logTxt, date) => {
  let path = './logs/';
  fs.appendFile(path + date.split(' ')[0] + '.log', logTxt + '\n'
    , (err) => {

      if (err) {
        errorHandling('Failed to add content to the file!', err);
        return;
        // throw err;
      }
    });
};

/**
 * @description 저장된 서비스 자원 데이터를 가져오는 함수
 * @param {*} idx 서비스 구별을 위한 인덱스
 * @param {*} res response
 */
const getResource = (path, idx, res) => {
  readLastLines.read(path + svcList[idx].nm + '(' + svcList[idx].usage + ')' + '.txt', 50)
    .then((lines) => {
      returnLines = '[' + lines.substring(0, lines.lastIndexOf(",")) + ']';
      res.json(returnLines);
    }).catch((err) => {
      returnLines = '[]';
      res.json(returnLines);
      errorHandling('Could not read the contents of the file!', err);
    });
};

/**
 * @description 원격 서비스의 물리자원 데이터를 노드서버에 저장하는 함수
 * @param {*} name 서비스 이름
 * @param {*} data 저장할 데이터
 */
const saveReource = (path, name, data) => {

  let file = name + '.txt';

  // 파일을 압축
  compact(path, file).then(() => {
    fs.appendFile(path + file, JSON.stringify(data) + ',\n'
      , (err) => {

        if (err) {
          errorHandling('Failed to add content to the file!', err);
          return;
          // throw err;
        }
      });
  }).catch(errorHandling);
};

/**
 * @description 현재 날짜계산 함수
 * * ex) 2018-08-03
 * @returns 현재날짜
 */
const getToday = () => {
  let date = new Date();
  let dd = date.getDate();
  let mm = date.getMonth() + 1; // January is 0!
  let yyyy = date.getFullYear();
  let hhmmss = date.getHours() + ":" + date.getMinutes() + ":" + date.getSeconds();

  if(dd < 10) {
    dd = '0' + dd;
  }

  if(mm < 10) {
    mm = '0' + mm;
  }

  let today = [yyyy, mm, dd].join('-');
  today = today + " " + hhmmss;

  return today;
};

/**
 * @description 원하는 바이트단위로 변경해주는 함수
 * @param {*} byte 바이트
 * @param {*} unit 변경할 단위
 */
const changeUnit = (byte, unit) => {

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
};

/**
 * @description 로그 데이터를 만드는 함수
 * @param {*} params
 * @returns 로그 데이터
 */
const makeLogText = (params) => {
  let nm = params['nm'];
  let usage = '(' + params['usage'] + ')';
  let ip = params['ip'] + ':' + params['port'];
  let url = params['url'].split('/sc')[0];
  let log = nm + ' ' + usage + ' ' + ip + ' ' + url;

  return log;
};

/**
 * @description 폴더를 생성하는 함수
 * @param {*} path 폴더를 생성할 경로
 */
const createFolder = (path) => {
  fs.mkdir(path, 0666, function (err) {
    if (err) {
      errorHandling('not create new directory!', err);
    } else {
      console.log('create new directory');
    }
  });
};

/**
 * @description 폴더가 존재하는지 찾는 함수
 * @param {*} path 찾을 폴더 경로 및 이름
 * @returns 찾은 파일들
 */
const searchFolder = (path) => {
  return new Promise((resolve, reject) => {
    fs.readdir(path, function (err, files) {

      if (err) {
        console.log('not search directory');
        resolve(files);
        return;
      }

      console.log('search directory');
    });
  });
}

/**
 * @description 폴더를 삭제하는 함수
 * @param {*} path 삭제할 폴더경로
 */
const removeFile = (path) => {
  fs.unlink(path, function (err) {

    if (err) {
      errorHandling('Unable to remove file!', err);
      return;
    }

    console.log("remove file");
  });
};
/**
 * @description 파일을 압축하는 함수
 * @param {*} path 저장할 파일경로
 * @param {*} fileName 저장할 파일이름
 */
const compact = (path, file) => {

  return new Promise((resolve, reject) => {
    fs.stat(path + file, function (err, stats) {

      if(err) {
        reject('Unable to get file information!', err);
        return;
      }

      let size = changeUnit(stats['size'], 'gb');

      // 파일사이즈가 1GB이상일 때 파일압축 후 기존파일 제거
      if (size >= 1) {
        let fileName = file.substring(0, file.lastIndexOf(".txt"));   // 확장자 제거
        let today = getToday();

        if (fileName.length === 0) return;

        fs.createReadStream(path + file)
          .pipe(zlib.createGzip())
          .on('data', () => process.stdout.write('compact ing...\n'))
          .pipe(fs.createWriteStream(path + fileName + '_' + today.split(' ')[0] + '.gz'))
          .on('finish', () => {
            console.log('Compact Finished');
            if (file.indexOf('gz') < 0) removeFile(path + file);   // 압축한 원본파일을 삭제(압축파일 제외)

            resolve();
          });
      } else {
        resolve();
      }
    });
  });
};

/**
 * @description 장애 or 경고 발생시 해당 서버에 대하여 관리자에게 슬랙 앱으로 메시지 푸쉬하는 함수
 * @param token: 슬랙에서 발급받은 토큰
 * @param channel: 메시지 수신 경로(채널)
 * @param text: 메시지
 * @param username: 송신자
 */
const pushMtoSlack = (text) => {

  webhookUri = 'https://hooks.slack.com/services/' + slackInfo['accessKey'];

  slack = new Slack();
  slack.setWebhook(webhookUri);

  slack.webhook({
    channel: slackInfo['channel'],
    username: slackInfo['username'],
    text: text,
    icon_emoji: ":ghost:"
  }, (err, response) => console.log(response) );
};

module.exports = router;