const express = require('express');
const router = express.Router();
const request = require('request');
const fs = require('fs');
const readLastLines = require('read-last-lines');
const WebSocketServer = require("ws").Server;
const wss = new WebSocketServer({ port: 3001 });
const svcLists = require('../info/svcList');
const svcList = svcLists['svcList'];
let pageNm = 'main';

/**
 * @description 해당 url에 대한 서버 물리자원 이용률 가져옴
 * * 프로세스:
 *  1. 파라미터로 받은 url로 http 통신 요청
 *  2. response로 받은 해당 서버 자원 이용률 데이터를 nodejs가 설치된 서버 내에 txt파일로 저장
 *  3. 서버 자원 이용률 데이터를 클라이언트로 응답함
 *  4. 위의 두 과정은 비동기 처리!
 */
router.post('/', function(req, res, next) {
  openSocket();

  res.json({
    message: "server socket open",
    statusCode: 200
  });
});

router.get('/sub/:idx', function (req, res, next) {
  getResource(req.params.idx, res);   // 저장된 서비스 자원 데이터를 가져옴
  pageNm = 'sub';
});

/**
 * @description
 * 서버 소켓 생성 및 클라이언트 소켓과 연결
 *
 * 연결 후 서비스 서버의 물리자원 이용률 요청 함수 호출
 */
const openSocket = () => {

  // 연결이 수립되면 클라이언트에 메시지를 전송하고 클라이언트로부터 메시지를 송수신
  wss.on('connection', (ws) => {
    ws.send(JSON.stringify({message: 'hello! I am a server.', statusCode: 444}));
    setInterval(() => { getRmtSvResource(ws)}, 3000);
    ws.on('message', (message) => {console.log("Receive: %s", message);});
  });
};

/**
 * @description 서비스 서버의 물리자원 이용률 반복요청하는 함수
 * @param {*} websocket 연결된 웹소켓
 * @returns 서비스 서버의 물리자원(json)
 */
const getRmtSvResource = (websocket) => {
  // svcLists.forEach((data, idx) => {

  let data = svcList[4];

  /**
   * 로컬 테스트 데이터

  let data = {
      nm: 'test',
      usage: '애플리케이션 + 맵',
      ip: '127.0.0.1',
      port: '8080',
      url: 'http://localhost:8080/test2',
  };
  */

  request(data['url'] + '/sc.jsp', { json: true }, (err, res, body) => {
    if (err) { return console.log(err); }   // 서비스 서버의 요청에 대한 에러처리

    let today = getToday();   // 현재 시간 구함
    let logTxt = today + ' ' + res['statusCode'] + ' ' + makeLogText(data);  // 로그데이터 생성
    let returnData = makeReturnData(res, 4);

    makeLogFile(data, today);   // 로그파일을 만듬
    saveReource(data['nm'], body);   // 서비스 서버의 물리자원 이용 데이터 저장

    if (pageNm === 'sub') return websocket.send(JSON.stringify(body));   // 서비스 서버의 물리자원 이용률 리턴
    else return websocket.send(JSON.stringify(returnData));
  });

  // });
};

/**
 *
 * @param {*} res reponse데이터
 * @param {*} index 서비스 구별을 위한 인덱스
 */
const makeReturnData = (res, index) => {
  return {
    idx: index,
    statusCode: res['statusCode']
  };
};

/**
 * @description 로그파일을 만드는 함수
 * @param {*} logTxt 로그파일에 입력할 데이터
 * @param {*} date 파일이름을 날짜를 기본으로 생성
 */
const makeLogFile = (logTxt, date) => {
  fs.appendFile('./logs/' + date.split(' ')[0] + '.log', logTxt + '\n', (err) => { if (err) throw err; });
};

/**
 * @description 저장된 서비스 자원 데이터를 가져오는 함수
 * @param {*} idx 서비스 구별을 위한 인덱스
 * @param {*} res response
 */
const getResource = (idx, res) => {
  readLastLines.read('./resource/' + svcList[idx].nm + '.txt', 50)
    .then((lines) => {
      returnLines = '[' + lines.substring(0, lines.lastIndexOf(",")) + ']';
      res.json(returnLines);
    });
};

/**
 * 원격 서비스의 물리자원 데이터를 노드서버에 저장하는 함수
 * @param {*} name 서비스 이름
 * @param {*} data 저장할 데이터
 */
const saveReource = (name, data) => {
  fs.appendFile('./resource/' + name + '.txt', JSON.stringify(data) + ',\n', (err) => { if (err) throw err; });
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
 * @description 로그 데이터를 만드는 함수
 * @param {*} params
 * @returns 로그 데이터
 */
const makeLogText = (params) => {
  let nm = params['nm'];
  let usage = '(' + params['usage'] + ')';
  let ip = params['ip'] + ':' + params['port'];
  let url = params['url'];
  let log = nm + ' ' + usage + ' ' + ip + ' ' + url;

  return log;
};

module.exports = router;