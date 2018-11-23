/**
 * @description 사용할 변수 초기화(한번만 실행해야 함)
 */
const commInit = () => {
    charts = {};
    pageNm = 'main'
    errArr = [];
    errTimerId = undefined;
    viewTimerId = undefined;

    $('#svcStat canvas').each((idx, ele) => {
        let key = $(ele).attr('id');
        let option = {};
        if (!(key === 'dbconn' || key === 'thread')) {
            option.scales = {
                xAxes: [{
                    stacked: true,
                    gridLines: {
                        color: "white",
                        borderDash: [2, 5],
                    },
                }],
                yAxes: [{
                    gridLines: {
                        color: "white",
                        borderDash: [2, 5],
                    },
                    ticks: {
                        beginAtZero: true,
                        steps: 10,
                        stepValue: 5,
                        max: 100,
                        fontColor: "white"
                    }
                }]
            };
        }
        makeGraph(ele, option);
    });
    connectNodeJs();   // nodejs 서버 웹소켓 생성 및 연결
    preventHistory();   // 뒤로가기, 앞으로가기 비활성화
};

/**
 * @description 뒤로가기, 앞으로가기 비활성화 하는 함수
 */
const preventHistory = () => {
    history.pushState(null, null, location.href);
    window.onpopstate = function () {
        history.go(1);
    };
};
/**
 * @description 그래프 프레임 만드는 함수
 * @param {*} ele 차트그리기 위한 html 엘리먼트
 */
const makeGraph = (ele, customOption) => {
    let key = $(ele).attr('id');
    let title = $(ele).attr('title');
    let data = {
        labels: [],
        datasets: [
            {
                label: "",
                fill: true,
                backgroundColor: "rgba(32, 162, 219, 0.3)", // <-- supposed to be light blue
                borderColor: 'rgba(32, 162, 219, 0.3)',
                data: []
            }
        ]
    };

    let options = {
        title: {
            display: true,
            fontColor: "white",
            text: title
        },
        scales: {
            xAxes: [{
                stacked: true,
                gridLines: {
                    color: "white",
                    borderDash: [2, 5],
                },
            }],
            yAxes: [{
                stacked: true,
                display: true,
                gridLines: {
                    color: "white",
                    borderDash: [2, 5],
                },
                ticks: {
                    suggestedMin: 0,
                    suggestedMax: 100,
                    fontColor: "white"
                }
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
        options: $.extend({}, options, customOption)
    });
    charts[key] = myChart;
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
    let url = window.location.href;

    $.ajax({
        method: 'PUT',
        url: url + 'resource/conn',
        statusCode: {
            404: function () { alert("page not found"); },
            500: function () { alert("nodeJS server error"); }
        }
    }).done(function (data) {   // 원격 서버와의 통신이 정상일 때
        // console.log(data)

        openSocket(data['port']);
    }).fail(function (jqXHR, textStatus) {   // nodeJS 서버와의 통신이 비정상일 때
        // alert("Request failed: " + textStatus);
        console.log(jqXHR)
        console.log(textStatus);
    });
};

/**
 * @description 클라이언트 웹소켓 생성 및 서버로부터 데이터 수신 시 로직실행하는 함수
 * * 서버로부터 데이터 받을 시 로직 내용
 *
 *  비동기로 서버에서 데이터 수신
 *
 *  장애 서버에 관한 리스트 효과 생성 및 장애메시지 슬랙앱으로 푸쉬
 */
const openSocket = (port) => {
    // let ws = new WebSocket("ws://192.168.0.33:" + port);                       // 웹소켓 전역 객체 생성
    ws = new WebSocket('ws://' + socketIp + ':' + port);                       // 웹소켓 전역 객체 생성
    ws = $.extend(ws, { port: port });

    // 서버와 웹소켓 생성
    ws.onopen = (event) => {
        let hiMsg = {
            message: 'hello! I am a client.',
            pageNm: 'main',
            pageIdx: -1
        };
        ws.send(JSON.stringify(hiMsg));
    };

    // 서버와 통신
    ws.onmessage = (event) => {
        let data = JSON.parse(event['data']);

        // console.log("Server message: ", data)

        if (data['statusCode'] === 222) return;   // 처음 nodejs 서버와 소켓연결일 때

        if (data.length === 0) return;

        // console.log(data)
        // 메인페이지의 상태값 및 화면 변경
        if (pageNm === 'main') {
            if(data[0]['code'] !== undefined) changeStat(data);
        } else {
            let cleanData = convertData(data);   // nodejs 서버에서 읽어온 파일을 json파싱 및 데이터 정제

            if(data.length > 1) drawGraphs(cleanData);   // 라인차트 그리기
            else updateGraphs(cleanData);
        }
    };

    // 에러 핸들링
    ws.onerror = (event) => {
        console.log("Server error message: ", event);
        ws.close();
    };

    // 웹소켓 종료
    ws.onclose = (event) => {
        // console.log(event)
        // console.log(ws)
        let port = ws.port;
        ws = undefined;
        $.ajax({
            method: 'DELETE',
            url: window.location.href + 'resource/port/' + port
            // dataType: 'json'
        }).done(function (data) {
            console.log(data);
        }).fail(function (jqXHR, textStatus) {
            // alert("Request failed: " + textStatus);
            console.log(textStatus);
        });
    };

    return ws;
};

/**
 * @description 스크롤바 생성을 위한 높이값 조정
 */
const modScreenSize = (id) => {
    const hdHeight = $('header').height();
    const secHeight = $('#' + id).height();
    const applyHeight = screen.availHeight - hdHeight - 400;

    if (secHeight < applyHeight) return;

    $('section').height(screen.availHeight - hdHeight - 130);
};

const controlInterval = (status) => {
    let errCount = errArr.filter((d) => { if (d['occur'] === 'yes') return d['offset'] }).length;

    if (status === 'normal' && errCount === 0) {
        if (errTimerId !== undefined) {
            clearInterval(errTimerId);
            errTimerId = undefined;
        }

        if (viewTimerId === undefined) viewChange();
    } else if(status === 'error') {
        if (viewTimerId !== undefined) {
            clearInterval(viewTimerId);
            viewTimerId = undefined;

            if (pageNm === 'sub') $('#back').trigger('click');
        }

        if (errTimerId === undefined) errChangeScroll();
    }
};

/**
 * @description 메인페이지의 상태값 및 화면 변경하는 함수
 * @param {*} data 상태값 및 서비스 구별을 위한 인덱스
 */
const changeStat = (data) => {
    let errOccur = false;

    data.forEach((d, i) => {
        let stat= $('#allSvcStat tbody tr').eq(i).attr('status');
        let statTxt = httpStatus[d['code']];

        // 원격 서버와의 통신이 정상일 때
        if (d['code'] === 200 || d['code'] === 406) {
            errArr[i]['occur'] = 'no';

            // 이미 기존에 정상표시가 되어있으면 아래 코드 실행 안함
            if (stat !== 'normal') {
                $('#allSvcStat tbody tr').eq(i).find('td').eq(4).text(statTxt);
                $('#allSvcStat tbody tr').eq(i).attr('status', 'normal').removeClass('blinkcss');   // 위험리스트에 깜빡이는 효과 제거
            }

        // 원격 서버와의 통신이 정상이 아닐 경우
        } else {

            errArr[i]['occur'] = 'yes';
            errOccur = true;

            // 화면 로직 실행 안함
            if (stat !== 'error') {
                $('#allSvcStat tbody tr').eq(i).find('td').eq(4).text(statTxt);
                $('#allSvcStat tbody tr').eq(i).attr('status', 'error').addClass('blinkcss');   // 위험리스트에 깜빡이는 효과 생성
            }
        }
    });

    if(errOccur) controlInterval('error');
    else controlInterval('normal');
};

/**
 * @description 서비스 서버 자원데이터를 차트데이터에 알맞게 변경
 * @param {*} arr  서비스 서버 자원데이터(배열)
 * @returns 배열
 */
const convertData = (arr = []) => {
    let svrInfos = {};

    if (arr.length > 0 && arr[0]['act_cnt'] !== undefined) {
        svrInfos = {
            'dbconn': [],
            'date': [],
            'label': []
        };

        arr.forEach((d) => {
            svrInfos['dbconn'].push((parseFloat(d['act_cnt']) / parseFloat(d['max_conn_cnt'])).toFixed(2) * 100);
            svrInfos['date'].push(d['date']);
            svrInfos['label'].push('');
        });
    } else {
        svrInfos = {
            'cpu': [],
            'mem': [],
            'disk': [],
            'thread': [],
            'jvmcpu': [],
            'jvmmem': [],
            'date': [],
            'label': []
        };

        arr.forEach((data, idx) => {
            let cpuUse = 0;
            let memUse = 0;
            let totSpace = 0;
            let usableSpace = 0;
            let diskUse = 0;
            let jvmCpuUse = 0;
            let jvmmemUse = 0;
            let threadCnt = parseInt(data['activeThread']);
            let date = data['date'];

            // 전체 시스템 cpu 이용률 계산
            if (parseFloat(data['getSystemCpuLoad']) !== 0) {
                cpuUse = parseFloat(data['getSystemCpuLoad']) * 100;
            }

            // JVM cpu 이용률 계산
            if (parseFloat(data['getProcessCpuLoad']) !== 0) {
                jvmCpuUse = parseFloat(data['getProcessCpuLoad']) * 100;
            }

            // memory 이용률 계산
            if (parseInt(data['getTotalPhysicalMemorySize']) !== 0 && parseInt(data['getTotalPhysicalMemorySize']) >= parseInt(data['getFreePhysicalMemorySize'])) {
                memUse = (parseInt(data['getTotalPhysicalMemorySize']) - parseInt(data['getFreePhysicalMemorySize'])) / parseInt(data['getTotalPhysicalMemorySize']) * 100;
            }

            // 하드디스크 이용율 계산
            if (data['fileSystems'] !== undefined) {
                data['fileSystems'].forEach((d, idx) => {
                    totSpace += parseInt(d['totSpace']);
                    usableSpace += parseInt(d['usableSpace']);
                });
                diskUse = ((totSpace - usableSpace) / totSpace) * 100;
            }

            if (parseInt(data['totMemJVM']) !== 0 && parseInt(data['totMemJVM']) >= parseInt(data['freeMemJVM'])) {
                jvmmemUse = (parseInt(data['totMemJVM']) - parseInt(data['freeMemJVM'])) / parseInt(data['totMemJVM']) * 100;
            }

            svrInfos['cpu'].push(Math.round(cpuUse * 100) / 100.0);
            svrInfos['mem'].push(Math.round(memUse * 100) / 100.0);
            svrInfos['disk'].push(Math.round(diskUse * 100) / 100.0);
            svrInfos['thread'].push(threadCnt);
            svrInfos['jvmcpu'].push(Math.round(jvmCpuUse * 100) / 100.0);
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
const compDate = (before, today, sep) => {
    let befTime = before.split(' ')[1];
    let currTime = current.split(' ')[1];

    if (sep === undefined) {
        return alert('구분자를 넣어주세요!');
    }

    if (sep.toUpperCase() === 'YEAR') {   // 년도 비교
        if (before.split('-')[0] === current.split('-')[0]) return true;
    } else if (sep.toUpperCase() === 'MONTH') {   // 월 비교
        if (before.split('-')[1] === current.split('-')[1]) return true;
    } else if (sep.toUpperCase() === 'DAY') {   // 일 비교
        if (before.split('-')[2] === current.split('-')[2]) return true;
    } else if (sep.toUpperCase() === 'HOUR') {   // 시 비교
        if (befTime.split(':')[0] === currTime.split(':')[0]) return true;
    } else if (sep.toUpperCase() === 'MINUTE') {   // 분 비교
        if (befTime.split(':')[1] === currTime.split(':')[1]) return true;
    } else if (sep.toUpperCase() === 'SECOND') {   // 초 비교
        if (befTime.split(':')[2] === currTime.split(':')[2]) return true;
    }

    return false;
};

const sendToClient = (socket, data) => {
    if (socket['readyState'] === 3) {
        socket.close();
    } else {
        socket.send(JSON.stringify(data));
    }
};