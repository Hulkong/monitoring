
const router = require('express').Router();
const readLastLines = require('read-last-lines');
const WebSocketServer = require("ws").Server;
const Slack = require('slack-node');
const svcList = config.info['svcList'];
const slackInfo = config.info['slackInfo'];
const comm = require('../lib/common/common');

let ports = [3000];

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
    port = parseInt('30' + Math.floor(Math.random() * 100));   // 포트는 3000번대

    // 웹소켓 포트가 중복되지 않을 경우
    if(ports.indexOf(port) < 0) {
      ports.push(port);
      break;
    }
  }

  // 소켓 오픈
  openSocket(port).then(() => {});

  // client로의 response
  res.json({
    port: port,   // 포트번호
    message: "server socket open",  // 메시지
    statusCode: 200   // 상태코드
  });
});

/**
 * @description 포트 제거하는 라우터
 */
router.delete('/port/:num', function (req, res) {
  let port = parseInt(req.params.num, 10);
  let idx = ports.indexOf(port);

  ports.splice(idx, 1);
});

const startMainInterval = (s) => {
  return setInterval(() => {
    comm.sendToClient(s, JSON.stringify(cleData));
  }, 60000);
};

const startSubInterval = (s, pageIndex) => {

  let startTimer = false;
  let readCnt = 20;
  return setInterval(() => {

    if (startTimer) {
      readCnt = 1;
    } else {
      startTimer = true;
    }
    // 저장된 서비스 자원 데이터를 가져옴
    ['./resource/dbconn/', './resource/physics/'].forEach((path, idx) => {
      getResource(path, pageIndex, readCnt)
        .then((d) => {
        let data = '[' + d.substring(0, d.lastIndexOf(",")) + ']';
        comm.sendToClient(s, data);
      })
        .catch(() => {
        comm.sendToClient(s, '[]');
      });
    });

  }, 10000);
};

/**
 * @description 서버 소켓 생성 및 클라이언트 소켓과 연결
 *
 * 연결 후 서비스 서버의 물리자원 이용률 요청 함수 호출
 */
const openSocket = (port) => {
  return new Promise((resolve, reject) => {
    let wss = new WebSocketServer({ port: port });
    wss.mainTimerId = undefined;
    wss.subTimerId = undefined;

    // 연결이 수립되면 클라이언트에 메시지를 전송하고 클라이언트로부터 메시지를 송수신
    wss.on('connection', (ws) => {

      let hiMsg = { message: 'hello! I am a server.', statusCode: 444 };

      // client로의 연결성공 메시지 송신
      ws.send(JSON.stringify(hiMsg));

      ws.on('message', (message) => {
        let msg = JSON.parse(message);

        // console.log(msg)
        if (msg['pageNm'] === 'main') {
          clearInterval(wss.subTimerId);
          wss.subTimerId = undefined;
          wss.mainTimerId = startMainInterval(ws);

        } else {
          clearInterval(wss.mainTimerId);
          wss.mainTimerId = undefined;
          wss.subTimerId = startSubInterval(ws, msg['pageIdx']);
        }
      });

      ws.on('error', (err) => {
        console.log(err);
      });

      ws.on('close', (code, reason) => {
        clearInterval(wss.mainTimerId);
        clearInterval(wss.subTimerId);
        wss.close();
        console.log(code)
        // console.log(reason)
      });
    });
  });
};

/**
 * @description 저장된 서비스 자원 데이터를 가져오는 함수
 * @param {*} idx 서비스 구별을 위한 인덱스
 * @param {*} res response
 */
const getResource = (path, idx, readCnt = 0) => {
  return new Promise((resolve, reject) => {
    readLastLines.read(path + cleData[idx].nm + '(' + cleData[idx].usage + ')' + '.txt', readCnt)
      .then((lines) => {
        resolve(lines);
      }).catch((err) => {
        reject();
        comm.errorHandling('Could not read the contents of ' + path + cleData[idx].nm, err);
      });
  });
};

module.exports = router;