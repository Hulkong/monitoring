const express = require('express');
const router = express.Router();
const request = require('request');
const fs = require('fs');
const zlib = require('zlib');
const readLastLines = require('read-last-lines');
const WebSocketServer = require("ws").Server;
const Slack = require('slack-node');
const svcList = config.info['svcList'];
const slackInfo = config.info['slackInfo'];
const dbFoolInfo = require('../info/DB-FOOL-INFO');
const dbconn = require('../lib/database/db-connect');
const fsCont = require('../lib/file/file-control');
const comm = require('../lib/common/common');
process.env['NODE_TLS_REJECT_UNAUTHORIZED'] = 0;

let ports = [3000];
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

  // 임의 포트 생성후 배열로 관리
  let i = 0;
  let port = 0;

  // 랜덤포트 생성
  while(i < 1) {
    port = parseInt('300' + Math.floor(Math.random() * 10));   // 포트는 3000번대

    if(ports.indexOf(port) < 0) break;
    ports.push(port);
  }

  wss = new WebSocketServer({ port: port });

  openSocket();   // 소켓 오픈

  // client로의 response
  res.json({
    port: port,   // 포트번호
    message: "server socket open",  // 메시지
    statusCode: 200   // 상태코드
  });
});

/**
 * @description DB커넥션 수 가져오는 라우터
 */
router.get('/sub/dbConn/:idx', function (req, res, next) {
  let path = './resource/dbconn/';
  getResource(path, req.params.idx, res);   // 저장된 서비스 자원 데이터를 가져옴
});

/**
 * @description 서비스 서버자원 가져오는 라우터
 */
router.get('/sub/svResource/:idx', function (req, res, next) {
  let path = './resource/physics/';
  getResource(path, req.params.idx, res);   // 저장된 서비스 자원 데이터를 가져옴
});

/**
 * @description 서버 소켓 생성 및 클라이언트 소켓과 연결
 *
 * 연결 후 서비스 서버의 물리자원 이용률 요청 함수 호출
 */
const openSocket = () => {
  // 연결이 수립되면 클라이언트에 메시지를 전송하고 클라이언트로부터 메시지를 송수신
  wss.on('connection', (websocket) => {
    // client로의 연결성공 메시지 송신
    sendToClient(websocket, { message: 'hello! I am a server.', statusCode: 444 });

    let pools = openConnPool();   // 커넥션풀 오픈

    // 정제 데이터
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

    // 디렉토리 없을시 생성
    fsCont.makeDirectory('./logs/');
    fsCont.makeDirectory('./resource/dbconn/');
    fsCont.makeDirectory('./resource/physics/');

    // 처음 서버 구동시 먼저 실행
    repCommunication({
      websocket: websocket,
      cleanData: cleanData
    });

    // 10초단위로 서비스 서버와의 통신
    setInterval(() => {
      repCommunication({
        websocket: websocket,
        pools: pools,
        cleanData: cleanData
      }) }, 10000);

    websocket.on('message', (message) => {
      console.log("Receive: %s", message);
      if (message.split(',')[1] === '444') return;

      pageNm = message.split(',')[0];
      pageIdx = parseInt(message.split(',')[1]);
      pageStaus = message.split(',')[2];
    });

    websocket.on('error', (err) => {
      console.log(err);
    })
  });
};

/**
 * @description 커넥션풀 생성하는 함수
 * @returns 커넥션풀 리스트 객체
 */
const openConnPool = () => {
  let obj = {};

  dbFoolInfo.forEach((dbconfig) => {
    if (dbconfig['type'] === 'oracle') {   // 오라클일 경우
      if(dbconfig['host'] === '115.68.55.203') {    // 115.68.55.203 DB는 TNS 필요
        let tns = '(DESCRIPTION = (ADDRESS = (PROTOCOL = TCP)(HOST = ' + dbconfig['host'] + ')(PORT = ' + dbconfig['port'] + '))(CONNECT_DATA = (SERVER = DEDICATED)(SID = ' + dbconfig['database'] + ')))';
        dbconfig.connectString = tns;
      } else {
        dbconfig.connectString = dbconfig['host'] + ":" + dbconfig['port'] + '/' + dbconfig['database'];
      }

      // 커넥션풀 생성
      dbconn.createPool(dbconfig, dbconfig['type']).then(pool => obj[dbconfig['host']] = pool );
    } else {   // MariaDB or Postgresql일 경우
      // 커넥션풀 생성
      obj[dbconfig['host']] = dbconn.createPool(dbconfig, dbconfig['type']);
    }
  });

  return obj;
};

/**
 * @description db커넥션 정보 가져오는 함수
 * @param {*} pools 커넥션풀 리스트 객체
 * @param {*} data 서비스 정보
 * @returns 커넥션 개수
 */
const getDBconn = (pools, data) => {
  return new Promise((resolve, reject) => {
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
        parameter = [database];
      }

      // 우선 해당 호스트는 제외
      // DB커넥션 개수 가져오는 쿼리 실행
      dbconn.execQuery(pools[host], sql, parameter, type).then(function (result) {
        let saveDataFormat = {
          act_cnt: 0,
          in_act_cnt: 0,
          tot_conn_cnt: 0,
          date: comm.getToday()
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

/**
 *
 * @param {*} data 서비스 정보
 * @param {*} idx 서비스리스트 인덱스
 */
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

      let today = comm.getToday();   // 현재 시간 구함
      let logTxt = today + ' ' + res['statusCode'] + ' ' + makeLogText(data);  // 로그데이터 생성

      fsCont.makeLogFile(logTxt, today);   // 로그파일을 만듬

      resolve(res);
    });
  });
};

/**
 * @description 서비스 서버와의 통신을 반복하는 함수
 * @param {*} websocket 연결된 웹소켓(undefined)
 * @param {*} pools 커넥션풀 리스트 객체([])
 * @param {*} cleanData 정제된 데이터([])
 *
 * 데이터 타입: json
 */
const repCommunication = ({
  websocket= undefined,
  pools = undefined,
  cleanData = []
} = {} ) => {

  /**
   * 커넥션 개수 가져오는 로직
   */
  // 정제된 데이터가 있을 경우 아래 로직 실행
  if(cleanData.length > 0) {

    cleanData.forEach((data, idx) => {
      // DB에 접속하는 서비스가 있을경우 커넥션 개수 가져옴
      if (pools !== undefined && data['dbHost'].length > 0) {

        // DB 커넥션 수 가져옴
        getDBconn(pools, data)
          .then((saveDataFormat) => {
            let path = './resource/dbconn/';
            saveReource(path, data['nm'] + '(' + data['usage'] + ')', saveDataFormat);   // 포맷팅이 완료된 데이터 저장

            // sub페이지일 경우 client 소켓에 데이터 송신
            if (pageNm === 'sub') {
              if (pageIdx === idx && pageStaus !== '장애') {   // 뷰의 서비스와 일치하고, 장애가 아닐 경우 데이터 송신
                return sendToClient(websocket, saveDataFormat); // 클라이언트 웹소켓으로 데이터 송신
              }
            }
          }).catch(errorHandling);   // 에러 처리
      }

      /**
       * 서비스 서버 자원 및 상태값 가져오는 로직
       */
      // URL이 있을 경우 아래 로직 실행
      if(data['url'].length > 0) {
        // 일단 BBQ, 뉴스레터 서비스 서버는 제외
        if ( data['nm'] !== 'BBQ' || data['nm'] !== '뉴스레터') {

          if (data['was'].length > 0) {   // 서비스 서버에 was가 있을 경우 sc.jsp 호출

            getSvResource(data, idx).then((res) => {

              let path = './resource/physics/';
              saveReource(path, data['nm'] + '(' + data['usage'] + ')', res['body']);   // 서비스 서버의 물리자원 이용 데이터 저장

              if (res['statusCode']  !== 200) {
                  // console.log('상태코드가 ' + res['statusCode'] + '입니다!');
              }

              if (pageNm === 'sub') {    // sub페이지일 경우

                if (pageIdx === idx && pageStaus !== '장애') {   // 뷰의 서비스와 일치하고, 장애가 아닐 경우 데이터 송신
                  return sendToClient(websocket, res['body']);  // 클라이언트 웹소켓으로 데이터 송신
                }

              } else {   // main페이지일 경우

                let sendData = makeStatData(res['statusCode'], idx, data['nm']);   // 상태 데이터 생성
                return sendToClient(websocket, sendData);   // 클라이언트 웹소켓으로 데이터 송신

              }

            }).catch(({msg, err, sendData}) => {

              errorHandling(msg, err);

              if (pageNm === 'main') {   // main페이지일 경우
                return sendToClient(websocket, sendData);   // 클라이언트 웹소켓으로 데이터 송신
              }
            });

          } else {   // 배경지도 호출 URL일 경우

            getSvResource(data, idx).then((res) => {

              if(pageNm === 'main') {   // main페이지일 경우

                let sendData = makeStatData(res['statusCode'], idx, data['nm']);   // 상태
                return sendToClient(websocket, sendData);

              }
            }).catch(({ msg, err, sendData }) => {

              errorHandling(msg, err);

              if (pageNm === 'main') {   // main페이지 일 때
                return sendToClient(websocket, sendData);
              }
            });
          }
        }
      }
    });
  }
};

const sendToClient = (socket, data) => {
  if (socket['readyState'] === 3) {
    socket.close();
  } else {
    socket.send(JSON.stringify(data));
  }
};

const errorHandling = (msg, err) => {
  console.log(msg)
  console.log(err)
  // comm.pushMtoSlack(msg);
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

  let fsInfo = fsCont.getFileInfo(path, file);
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
          errorHandling('Failed to add content to the file!', err);
          return;
        }
      });
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

module.exports = router;