const express = require('express');
const router = express.Router();
const request = require('request');
const fs = require('fs');
const zlib = require('zlib');
const readLastLines = require('read-last-lines');
const WebSocketServer = require("ws").Server;
const wss = new WebSocketServer({ port: 3001 });
const svcList = require('../info/SERVICE-LIST');
const dbSvcInfo = require('../info/DB-SERVICE-INFO');
const dbInfo = require('../info/DB-FOOL-INFO');
const dbconn = require('../lib/db-connect');
let pageNm = 'main';

/**
 * @description 해당 url에 대한 서버 물리자원 이용률 가져옴
 * * 프로세스:
 *  1. 파라미터로 받은 url로 http 통신 요청
 *  2. response로 받은 해당 서버 자원 이용률 데이터를 nodejs가 설치된 서버 내에 txt파일로 저장
 *  3. 서버 자원 이용률 데이터를 클라이언트로 응답함
 *  4. 위의 두 과정은 비동기 처리!
 */
router.post('/', function (req, res, next) {
  let pools = openConnPool();
  openSocket(pools);

  res.json({
    message: "server socket open",
    statusCode: 200
  });
});

router.get('/sub/:idx', function (req, res, next) {
  getResource(req.params.idx, res);   // 저장된 서비스 자원 데이터를 가져옴
  pageNm = 'sub';
});

router.get('/dbconnection', function (req, res, next) {
  /*
  let dbconfig = {
    host: "115.68.55.200",
    port: '3306',
    user: "selfmap",
    password: "@zkdlwj7540",
    database: 'svc_v3_new',
    multipleStatements: true
  };
  */

  /*
  let dbconfig = {
    host: '115.68.215.144',
    user: 'postgres',
    password: 'zkdlwj',
    database: 'onmapdb',
    port: 5432,
    ssl: false,
    max: 20, // set pool max size to 20
    min: 4, // set min pool size to 4
    idleTimeoutMillis: 1000, // close idle clients after 1 second
    connectionTimeoutMillis: 1000, // return an error after 1 second if connection could not be established
  };
  */

  // let dbconfig = {
  //   connectString: '115.68.55.254/opendw',
  //   user: 'Y_H_KIM',
  //   password: '!dydgus12'
  // };

  // let pool = dbconn.createPool(dbconfig, 'maria');
  // let sql = "SELECT COUNT(*) CONN_CNT FROM information_schema.PROCESSLIST WHERE DB = 'svc_v3_new' AND USER = 'selfmap' AND HOST LIKE CONCAT('115.68.55.224', '%') AND COMMAND = 'Sleep'";
  // dbconn.execQuery(pool, sql, 'maria');

  // let pool = dbconn.createPool(dbconfig, 'postgres');
  // dbconn.execQuery(pool, sql, 'postgres');

  // let pool = dbconn.createPool(dbconfig, 'oracle');
  // let sql = "SELECT COUNT(*) CONN_CNT FROM V$SESSION WHERE USERNAME='Y_H_KIM' AND STATUS='ACTIVE'";
  // pool.then((pool) => dbconn.execQuery(pool, sql, 'oracle'))
});


const openConnPool = () => {
  let pools = [];

  dbInfo.forEach((dbconfig, idx) => {
    if (dbconfig['type'] === 'oracle') dbconfig.connectString = dbconfig['host'] + '/' + dbconfig['database'];

    pools.push(dbconn.createPool(dbconfig, dbconfig['type']));
  });

  return pools;
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
      sql = "SELECT SUM(NUMBACKENDS) TOT_CONN_CNT FROM PG_STAT_DATABASE WHERE DATNAME=$1::text"
    }

  return sql;
};

/**
 * @description
 * 서버 소켓 생성 및 클라이언트 소켓과 연결
 *
 * 연결 후 서비스 서버의 물리자원 이용률 요청 함수 호출
 */
const openSocket = (pools) => {
  // 연결이 수립되면 클라이언트에 메시지를 전송하고 클라이언트로부터 메시지를 송수신
  wss.on('connection', (ws) => {
    ws.send(JSON.stringify({message: 'hello! I am a server.', statusCode: 444}));
    setInterval(() => { getRmtSvResource(ws, pools)}, 3000);
    ws.on('message', (message) => {console.log("Receive: %s", message);});
  });
};

/**
 * @description 서비스 서버의 물리자원 이용률 반복요청하는 함수
 * @param {*} websocket 연결된 웹소켓
 * @returns 서비스 서버의 물리자원(json)
 */
const getRmtSvResource = (websocket, pools) => {
  /*
  dbInfo.forEach((info, idx) => {
    let sql = makeSql(info['type']);
    let type = info['type'];

    if (type === 'oracle') {
      pools[idx].then((pool) => dbconn.execQuery(pool, sql, [info['user']], info['type']));
    } else if (type === 'maria') {
      dbconn.execQuery(pools[idx], sql, [info['database'], info['user'], info['host'], info['database'], info['user'], info['host']], info['type']);
    } else if (type === 'postgres') {
      dbconn.execQuery(pools[idx], sql, [info['database']], info['type']);
    }
  });
  */
  svcLists.forEach((data, idx) => {

  // let data = svcList[4];

  if(!(data['usage'].indexOf('배경지도') >= 0)) {
    let findIdx = [];
    dbSvcInfo.forEach((d, i) => {
      if(data['nm'].trim() === d[i].trim()) 
    });
  }
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

    makeLogFile(logTxt, today);   // 로그파일을 만듬
    saveReource(data['nm'], body);   // 서비스 서버의 물리자원 이용 데이터 저장

    if (pageNm === 'sub') return websocket.send(JSON.stringify(body));   // 서비스 서버의 물리자원 이용률 리턴
    else return websocket.send(JSON.stringify(returnData));
  });

  });
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
  let path = './logs/';

  // 폴더가 존재하는지 확인 후 로직 실행
  searchFolder(path).then((files) => {
    if(files === undefined) {
      createFolder(path);
    } else {
      // 디렉토리안 모든 파일에 대하여 1GB이상일 때 압축
      files.forEach(function (file) {
        fs.stat(path + file, function (err, stats) {
          // console.log(stats);
          let size = changeUnit(stats['size'], 'gb');

          // 파일사이즈가 1GB이상일 때 파일압축 후 기존파일 제거
          if(size >= 1) {
            compact(path, file);   // 파일을 압축
            if(file.indexOf('gz') < 0) removeFile(path + file);   // 압축한 원본파일을 삭제(압축파일 제외)
          }
        });
      });
      fs.appendFile(path + date.split(' ')[0] + '.log', logTxt + '\n', (err) => { if (err) throw err; });
    }
  });
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
  let path = './resource/';

  // 폴더가 존재하는지 확인 후 로직 실행
  searchFolder(path).then((files) => {
    if(files === undefined) {
      createFolder(path);
    } else {
      // 디렉토리안 모든 파일에 대하여 1GB이상일 때 압축
      files.forEach(function (file) {

        fs.stat(path + file, function (err, stats) {
          // console.log(stats);
          let size = changeUnit(stats['size'], 'gb');

          // 파일사이즈가 1GB이상일 때 파일압축 후 기존파일 제거
          if(size >= 1) {
            compact(path, file);   // 파일을 압축
            if(file.indexOf('gz') < 0) removeFile(path + file);   // 압축한 원본파일을 삭제(압축파일 제외)
          }

          fs.appendFile(path + name + '.txt', JSON.stringify(data) + ',\n', (err) => { if (err) throw err; });
        });
      });
    }
  });
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
  let url = params['url'];
  let log = nm + ' ' + usage + ' ' + ip + ' ' + url;

  return log;
};

/**
 * @description 폴더를 생성하는 함수
 * @param {*} path 폴더를 생성할 경로
 */
const createFolder = (path) => {
  fs.mkdir(path, 0666, function (err) {
    if (!err) console.log('create new directory');
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
      if (err) console.log('not search directory');
      resolve(files);
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
      return console.error(err);
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
  let fileName = file.substring(0, file.lastIndexOf(".txt"));   // 확장자 제거
  let today = getToday();

  if (fileName.length === 0) return;

  fs.createReadStream(path + file)
    .pipe(zlib.createGzip())
    .on('data', () => process.stdout.write('compact ing...\n'))
    .pipe(fs.createWriteStream(path + fileName + '_' + today.split(' ')[0] + '.gz'))
    .on('finish', () => console.log('Compact Finished'));
};

module.exports = router;