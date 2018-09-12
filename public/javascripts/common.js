/**
 * @description 사용할 변수 초기화(한번만 실행해야 함)
 */
const commInit = () => {
    charts = {};
    pageNm = 'main'
    pageIdx = -1;
    $('#resource canvas').each((idx, ele) => { makeGraph(ele);});
    connectNodeJs();   // nodejs 서버 웹소켓 생성 및 연결
};

/**
 * @description 클라이언트 웹소켓 생성 및 서버로부터 데이터 수신 시 로직실행하는 함수
 * * 서버로부터 데이터 받을 시 로직 내용
 *
 *  비동기로 서버에서 데이터 수신
 *
 *  장애 서버에 관한 리스트 효과 생성 및 장애메시지 슬랙앱으로 푸쉬
 */
const openSocket = () => {
    ws = new WebSocket("ws://localhost:3001");                                             // 웹소켓 전역 객체 생성
    ws.onopen = (event) => { ws.send("Client message: Hi"); };                           // 연결 수립되면 서버에 메시지를 전송

    // 서버와 통신
    ws.onmessage = (event) => {
        let data = JSON.parse(event['data']);
        if (data['statusCode'] === 444) return;   // 처음 nodejs 서버와 소켓연결일 때
        console.log("Server message: ", data)

        if(pageNm === 'sub') {
            let cleanData = convertData([data]);
            updateGraphs(cleanData);
        } else {
            changeStatusView(data);   // 메인페이지의 상태값 및 화면 변경
        }
    };

    ws.onerror = (event) => { console.log("Server error message: ", event.data) };   // error event handler
};

/**
 * @description 메인페이지의 상태값 및 화면 변경하는 함수
 * @param {*} data 상태값 및 서비스 구별을 위한 인덱스
 */
const changeStatusView = (data) => {
    let statTxt = $('#allSvcStat tbody tr').eq(data['idx']).find('td').eq(4).text();

    if (data['statusCode'] === 200) {   // 원격 서버와의 통신이 정상일 때

        if (statTxt === '정상') return;
        $('#allSvcStat tbody tr').eq(data['idx']).find('td').eq(4).text('정상');
        $('#allSvcStat tbody tr').eq(data['idx']).attr('status', '-').removeClass('blinkcss');   // 위험리스트에 깜빡이는 효과 제거

    } else {   // 원격 서버 장애발생시

        if (statTxt === '장애') return;
        $('#allSvcStat tbody tr').eq(data['idx']).find('td').eq(4).text('장애');
        $('#allSvcStat tbody tr').eq(data['idx']).attr('status', '장애').addClass('blinkcss');   // 위험리스트에 깜빡이는 효과 생성
        // pushMtoSlack(svcList[idx]);   // 슬랙앱으로 메시지 푸쉬
    }
};

/**
 * @description 웹소켓 연결 및 nodejs서버에서 주기적으로 데이터 가져오는 함수를 실행요청하는 함수
 * * <프로세스>
 *
 *  nodejs 서버에 웹소켓 연결 요청
 *
 *  서버웹소켓 생성 완료 메시지 받은 후 클라이언트 웹소켓 생성
 */
const connectNodeJs = () => {
        $.ajax({
            method: 'POST',
            url: window.location.href + 'resource',
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
 * @description 서비스 서버 자원데이터를 차트데이터에 알맞게 변경
 * @param {*} arr  서비스 서버 자원데이터(배열)
 * @returns 배열
 */
const convertData = (arr) => {
    let svrInfos = {};

    if (arr[0]['act_cnt'] !== undefined) {
        svrInfos = {
            'dbconn': [],
            'date': [],
            'label': []
        };

        arr.forEach((d) => {
            svrInfos['dbconn'].push(d['act_cnt']);
            svrInfos['date'].push(d['date']);
            svrInfos['label'].push('');
        });
    } else {
        svrInfos = {
            'cpu': [],
            'mem': [],
            'disk': [],
            'thread': [],
            'jvmmem': [],
            'date': [],
            'label': []
        };

        arr.forEach((data, idx) => {
            let cpuUse = 0;
            let memUse = 0;
            let totSpace = '';
            let usableSpace = '';
            let diskUse = 0;
            let jvmmemUse = 0;
            let threadCnt = parseInt(data['activeThread']);
            let date = data['date'];

            // cpu 이용률 계산
            if (parseFloat(data['getSystemCpuLoad']) !== 0 && parseFloat(data['getSystemCpuLoad']) >= parseFloat(data['getProcessCpuLoad']) ) {
                cpuUse = ( parseFloat(data['getSystemCpuLoad']) - parseFloat(data['getProcessCpuLoad']) ) / parseFloat(data['getSystemCpuLoad']) * 100;
            }

            // memory 이용률 계산
            if ( parseInt(data['getTotalPhysicalMemorySize']) !== 0 && parseInt(data['getTotalPhysicalMemorySize']) >= parseInt(data['getFreePhysicalMemorySize']) ) {
                memUse = ( parseInt(data['getTotalPhysicalMemorySize']) - parseInt(data['getFreePhysicalMemorySize']) ) / parseInt(data['getTotalPhysicalMemorySize']) * 100;
            }

            // 하드디스크 이용율 계산
            if (data['fileSystems'] !== undefined) {
                data['fileSystems'].forEach((d, idx) => {
                    totSpace += parseInt(d['totSpace']);
                    usableSpace += parseInt(d['usableSpace']);
                });
                diskUse = (usableSpace / totSpace) * 100;
            }

            // let dbconnCnt =
            if ( parseInt(data['totMemJVM']) !== 0 && parseInt(data['totMemJVM']) >= parseInt(data['freeMemJVM']) ) {
                jvmmemUse = ( parseInt(data['totMemJVM']) - parseInt(data['freeMemJVM']) ) / parseInt(data['totMemJVM']) * 100;
            }

            svrInfos['cpu'].push(Math.round(cpuUse * 100) / 100.0);
            svrInfos['mem'].push(Math.round(memUse * 100) / 100.0);
            svrInfos['disk'].push(Math.round(diskUse * 100) / 100.0);
            svrInfos['thread'].push(threadCnt);
            svrInfos['jvmmem'].push(Math.round(jvmmemUse * 100) / 100.0);
            svrInfos['date'].push(date);
            svrInfos['label'].push('');
        });
    }


    return svrInfos;
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
                    let label = data.date[idx] || (tooltipItem.yLabel + '%');

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