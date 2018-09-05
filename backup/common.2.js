/**
 * @description 사용할 변수 초기화(한번만 실행해야 함)
 */
const initVariables = () => {
    svrInfos = {};   // 각 서비스의 서버 자원 데이터를 저장할 객체 생성
    charts = {};

    // svcList의 개수만큼 서버자원 이용률 데이터 객체 생성
    svcList.forEach((data, idx) => {
        svrInfos[idx] = {
            cpu: [],
            mem: [],
            disk: [],
            dbconn: [],
            thread: [],
            jvmmem: [],
            date:[]
        };
    });

    $('#resource canvas').each((idx, ele) => { makeGraph(ele); });
    getRmtSvrData();   // nodejs 서버 웹소켓 생성 및 연결
};

/**
 * @description 클라이언트 웹소켓 생성 및 서버로부터 데이터 수신 시 로직실행하는 함수
 * * 서버로부터 데이터 받을 시 로직 내용
 *
 *  비동기로 서버에서 데이터 수신
 *
 *  그래프를 그리기위하여 데이터 메모리에 임시저장: saveToMem();
 *
 *  장애 서버에 관한 리스트 효과 생성 및 장애메시지 슬랙앱으로 푸쉬
 */
const openSocket = () => {
    ws = new WebSocket("ws://localhost:3001");                                             // 웹소켓 전역 객체 생성
    ws.onopen = (event) => { ws.send("Client message: Hi"); };                           // 연결 수립되면 서버에 메시지를 전송

    // 서버로부터 메시지를 수신
    ws.onmessage = (event) => {
        let data = JSON.parse(event['data']);

        if (data['statusCode'] === 444) return;   // 처음 nodejs 서버와 소켓연결일 때

        let statTxt = $('#allSvcStat tbody tr').eq(data.body['idx']).find('td').eq(4).text();
        console.log("Server message: ", data)

        if (data['statusCode'] === 200) {   // 원격 서버와의 통신이 정상일 때
            saveToMem(4, data['body']);

            if ($('#svcStat:visible').length > 0) {
                updateGraphs(4);   // 차트 업데이트
            }

            if (statTxt === '정상') return;
            $('#allSvcStat tbody tr').eq(data.body['idx']).find('td').eq(4).text('정상');
            $('#allSvcStat tbody tr').eq(data.body['idx']).attr('status', '-').removeClass('blinkcss');   // 위험리스트에 깜빡이는 효과 제거

        } else {   // 원격 서버 장애발생시

            if (statTxt === '장애') return;
            $('#allSvcStat tbody tr').eq(data.body['idx']).find('td').eq(4).text('장애');
            $('#allSvcStat tbody tr').eq(data.body['idx']).attr('status', '장애').addClass('blinkcss');   // 위험리스트에 깜빡이는 효과 생성
            // pushMtoSlack(svcList[idx]);   // 슬랙앱으로 메시지 푸쉬
        }
    };

    ws.onerror = (event) => { console.log("Server error message: ", event.data) };   // error event handler
};

/**
 * @description 웹소켓 연결 및 nodejs서버에서 주기적으로 데이터 가져오는 함수를 실행요청하는 함수
 * * <프로세스>
 *
 *  nodejs 서버에 웹소켓 연결 요청
 *
 *  서버웹소켓 생성 완료 메시지 받은 후 클라이언트 웹소켓 생성
 */
const getRmtSvrData = () => {
        $.ajax({
            method: 'POST',
            url: 'http://localhost:3000/resource',
            statusCode: {
                404: function () {alert("page not found");},
                500: function () {alert("nodeJS server error");}
            }
        }).done(function (data) {   // 원격 서버와의 통신이 정상일 때
            // console.log(data)
            openSocket();
        }).fail(function (jqXHR, textStatus) {   // nodeJS 서버와의 통신이 비정상일 때
            // alert("Request failed: " + textStatus);
            console.log(jqXHR)
            console.log(textStatus);
        });
};

/**
 * @description 장애 or 경고 발생시 해당 서버에 대하여 관리자에게 슬랙 앱으로 메시지 푸쉬하는 함수
 * @param token: 슬랙에서 발급받은 토큰
 * @param channel: 메시지 수신 경로(채널)
 * @param text: 메시지
 * @param username: 송신자
 */
const pushMtoSlack = (svcInfo) => {
    const data = {
        token: 'xoxp-334004932067-334057480820-420123985027-ccf47ec453b6e4bf258bcbe5fcb9555c',
        channel: 'C9U1GKAEQ',
        text: svcInfo['nm'] + '(' + svcInfo['usage'] + ') 서버에 장애가 발생하였습니다.',
        username: 'hulkong'
    };

    $.ajax({
        method: 'POST',
        url: 'https://slack.com/api/chat.postMessage',
        data: data,
        statusCode: {/* 404: function () {alert("page not found");}*/}
    }).done(function (data) {
        console.log(data);
    }).fail(function (jqXHR, textStatus) {
        // alert("Request failed: " + textStatus);
        console.log(textStatus);
    });
};

/**
 * @description 바이트 파라미터를 원하는 단위로 계산
 * @param {*} byte 바이트
 * @param {*} unit 변경할  단위
 * @returns kb, mb, gb, tb
 */
const changeUnit = (byte, unit) => {
    if (unit === 'kb') {
        let kb = byte / (1024);
        return Math.round(kb * 100) / 100.0;
    } else if (unit === 'mb') {
        let mb= byte / (1024 * 1024);
        return Math.round(mb * 100) / 100.0;
    } else if (unit === 'gb') {
        let gb = byte / (1024 * 1024 * 1024);
        return Math.round(gb * 100) / 100.0;
    } else if (unit === 'tb') {
        let tb = size / (1024 * 1024 * 1024 * 1024);
        return Math.round(tb * 100) / 100.0;
    } else {
        alert('단위를 입력해주세요.(kb, mb, gb, tb)');
    }
};

/**
 * @description 서비스 서버 자원데이터를 차트데이터에 알맞게 변경
 * @param {*} index 서비스리스트 배열데이터 인덱스
 * @param {*} data  서비스 서버 자원데이터
 */
const convertData = (index, data) => {
    // console.log(data)
    let cpuUse = ((data['getSystemCpuLoad'] - data['getProcessCpuLoad']) / data['getSystemCpuLoad']) * 100;
    let memUse = ((data['getTotalPhysicalMemorySize'] - data['getFreePhysicalMemorySize']) / data['getTotalPhysicalMemorySize']) * 100;

    let totSpace = '';
    let usableSpace = '';
    data['fileSystems'].forEach((d, idx) => {
        totSpace += d['totSpace'];
        usableSpace += d['usableSpace'];
    });
    let diskUse = (usableSpace / totSpace) * 100;

    // let dbconnCnt =
    let threadCnt = data['activeThread'];
    let jvmmemUse = ((data['totMemJVM'] - data['freeMemJVM']) / data['totMemJVM']) * 100;

    svrInfos[index]['cpu'].push(Math.round(cpuUse * 100) / 100.0);
    svrInfos[index]['mem'].push(Math.round(memUse * 100) / 100.0);
    svrInfos[index]['disk'].push(Math.round(diskUse * 100) / 100.0);
    // svrInfos[index]['dbconn'].push(dbconnCnt);
    svrInfos[index]['thread'].push(threadCnt);
    svrInfos[index]['jvmmem'].push(Math.round(jvmmemUse * 100) / 100.0);
    svrInfos[index]['date'].push(getToday());
};

/**
 * @description 원격 서버의 물리자원 이용률 데이터를 메모리에 저장하는 함수
 * * 데이터 보존기간은 2시간
 * @param {*} index 서비스리스트 배열데이터 인덱스
 * @param {*} inputData 서비스 서버 자원데이터
 */
const saveToMem = (index, inputData) => {
    convertData(index, inputData);   // 해당 서비스의 서버 자원 이용률 데이터 추가
    let firstDate = svrInfos[index]['date'][0];
    let today = getToday();

    // 처음 데이터의 삽입 일자와 현재 일자가 같을경우
    if (compDate(firstDate, today, 'year') && compDate(firstDate, today, 'month') && compDate(firstDate, today, 'day')) {
        let firstTime = firstDate.split(' ')[1];   // 처음 데이터의 시간을 가져옴
        let currTime = today.split(' ')[1];   // 현재시간을 가져옴

        // 데이터 보존기간이 2시간이 지났을 경우 처음 데이터 삭제
        if ((currTime.split(':')[0] - firstTime.split(':')[0]) >= 2) {
            svrInfos[index].splice(0, 1);
        }
    }
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

    if (dd < 10) {
        dd = '0' + dd;
    }

    if (mm < 10) {
        mm = '0' + mm;
    }

    let today = [yyyy, mm, dd].join('-');
    today = today + " " + hhmmss;

    return today;
};

/**
 * @description 시간 비교하는 함수
 * @param {*} before 비교되는 시간
 * @param {*} current 비교할 시간
 * @param {*} sep 구분자(년도, 월, 일, 시, 분, 초)
 * @returns true or false
 */
const compDate = (before, current, sep) => {
    let befTime = before.split(' ')[1];
    let currTime = current.split(' ')[1];

    if (sep === 'year' || sep === 'YEAR') {   // 년도 비교
        if (before.split('-')[0] === current.split('-')[0]) return true;
    } else if (sep === 'month' || sep === 'MONTH') {   // 월 비교
        if (before.split('-')[1] === current.split('-')[1]) return true;
    } else if (sep === 'day' || sep === 'DAY') {   // 일 비교
        if (before.split('-')[2] === current.split('-')[2]) return true;
    } else if (sep === 'hour' || sep === 'HOUR') {   // 시 비교
        if (befTime.split(':')[0] === currTime.split(':')[0]) return true;
    } else if (sep === 'minute' || sep === 'MINUTE') {   // 분 비교
        if (befTime.split(':')[1] === currTime.split(':')[1]) return true;
    } else if (sep === 'second' || sep === 'SECOND') {   // 초 비교
        if (befTime.split(':')[2] === currTime.split(':')[2]) return true;
    }

    return false;
};

/**
 * @description 그래프 프레임 만드는 함수
 * @param {*} ele 차트그리기 위한 html 엘리먼트
 */
const makeGraph = (ele) => {
    let key = $(ele).attr('id');
    let data = {
        labels: [],
        datasets: [
            {
                label: "",
                fill: true,
                backgroundColor: "rgba(32, 162, 219, 0.3)", // <-- supposed to be light blue
                data: []
            }
        ]
    };

    let options = {
        title: {
            display: true,
            text: key
        },
        scales: {
            xAxes: [{
                stacked: true,
            }],
            yAxes: [{
                stacked: true,
            }]
        },
        legend: {
            display: false,
        },
        tooltips: {
            callbacks: {
                label: function (tooltipItem, data) {
                    let dataIdx = tooltipItem.datasetIndex;
                    let idx = tooltipItem.index;
                    let label = data.datasets[dataIdx].date[idx] || (tooltipItem.yLabel + '%');

                    return label;
                }
            }
        }
    }
    let myChart = new Chart(ele, {
        type: 'line',
        data: data,
        options: options,
    });

    charts[key] = myChart;
};

/**
 * @description 주기적으로 메인화면과 서브화면을 번갈아 보여주는 함수
 */
const intervalView = () => {
    let idx = 0;
    let executeInterval = () => {
        let interval = setInterval(() => {
            clearInterval(interval);
            if(idx + 1 > svcList.length) idx = 0;

            $('#allSvcStat tbody tr').eq(idx).trigger('click');
            idx++;
            setTimeout(() => {
                $('#back').trigger('click');
                executeInterval();
            }, 5000);
        }, 5000);
    };

    executeInterval();
};