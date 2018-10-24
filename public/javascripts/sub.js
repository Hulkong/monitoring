/**
 * @description 서비스 서버 상태 페이지 구성을 위한 초기화 함수
 * @param {*} data 선택된 서비스리스트의 인덱스, db커넥션 존재여부, was존재여부
 */
const subPageInit = (data) => {
    let idx = $(data).data('idx');   // 선택된 서비스리스트의 인덱스
    let dbconn = $(data).data('dbconn');   // 선택된 서비스의 db커넥션 존재여부(true or false)
    let was = $(data).data('was');   // 선택된 서비스의 was 존재여부(true or false)
    let status = $(data).data('status');

    makeTbSvcList(idx);   // 동적으로 테이블리스트 생성
    initGraphs();   // 라인차트 초기화

    // if (status === '장애' || status === '-') return;
    if (was) getSvResource(idx);   // was가 존재할 경우 서비스 서버의 물리자원 데이터 가져옴
    if (dbconn) getDBConn(idx);  // db커넥션이 존재할 경우 커넥션 개수 가져옴
};

/**
 * @description nodejs 서버에 원격서비스 자원 데이터 요청(json)
 * * 파일에서 몇 라인 읽어옴
 * @param {*} idx 선택된 서비스 리스트의 인덱스
 */
const getSvResource = (idx) => {
    $.ajax({
        method: 'GET',
        url: window.location.href + 'resource/sub/svResource/' + idx,
        statusCode: {/* 404: function () {alert("page not found");}*/ }
    }).done(function (data) {
        // console.log(JSON.parse(data));
        let cleanData = convertData(JSON.parse(data));   // nodejs 서버에서 읽어온 파일을 json파싱 및 데이터 정제
        drawGraphs(cleanData);   // 라인차트 그리기
    }).fail(function (jqXHR, textStatus) {
        // alert("Request failed: " + textStatus);
        console.log(textStatus);
    });
};

/**
 * @description nodejs 서버에 DB커넥션 개수 데이터 요청(json)
 * * 파일에서 몇 라인 읽어옴
 * @param {*} idx 선택된 서비스 리스트의 인덱스
 */
const getDBConn = (idx) => {
    $.ajax({
        method: 'GET',
        url: window.location.href + 'resource/sub/dbConn/' + idx,
        statusCode: {/* 404: function () {alert("page not found");}*/ }
    }).done(function (data) {
        // console.log(JSON.parse(data));
        if(data.length === 0) return;

        let cleanData = convertData(JSON.parse(data));   // nodejs 서버에서 읽어온 파일을 json파싱 및 데이터 정제
        drawGraphs(cleanData);   // 라인차트 그리기
    }).fail(function (jqXHR, textStatus) {
        // alert("Request failed: " + textStatus);
        console.log(textStatus);
    });
};

/**
 * @description 동적으로 테이블리스트 생성 함수
 * @param {*} idx 서비스 리스트를 구분하기 위한 인덱스
 */
const makeTbSvcList = (idx) => {
    const svc = svcList[idx];
    $('#svcStat tbody').empty();
    $('#svcStat tbody').append('<tr><td>IP</td><td>' + svc['ip'] + '</td></tr>');
    $('#svcStat tbody').append('<tr><td>port</td><td>' + svc['port'] + '</td></tr>');
    $('#svcStat tbody').append('<tr><td>virtual core</td><td>' + svc['virtualCore'] + '</td></tr>');
    $('#svcStat tbody').append('<tr><td>memory</td><td>' + svc['memory'] + '</td></tr>');
    $('#svcStat tbody').append('<tr><td>harddisk</td><td>' + svc['hardDisk'] + '</td></tr>');
    $('#svcStat tbody').append('<tr><td>os</td><td>' + svc['os'] + '</td></tr>');
    $('#svcStat tbody').append('<tr><td>jdk</td><td>' + svc['jdk'] + '</td></tr>');
    $('#svcStat tbody').append('<tr><td>was</td><td>' + svc['was'] + '</td></tr>');
};

/**
 * @description 그래프 초기화 하는 함수
 */
const initGraphs = () => {
    $.each(charts, (key, chart) => {
        chart.data.labels = [];
        chart.data.date = [];
        chart.data.datasets.forEach((dataset) => {
            dataset.data = [];
        });
        charts[key].update();
    });
};

/**
 * @description 서버 자원 그래프 그리는 함수
 * @param {*} chartData 차트에 사용될 배열 데이터
 */
const drawGraphs = (chartData) => {
    $.each(chartData, (key, data) => {
        if(key !== 'label' && key !== 'date') {
            charts[key].data.labels = chartData['label'];   // X축에 표시할 데이터(존재해야지 데이터가 늘어남)
            charts[key].data.date = chartData['date'];   // 해당 점위에 마우스를 올렸을 때 표시할 데이터

            // 차트에서 보여질 실데이터 추가
            charts[key].data.datasets.forEach((dataset) => {
                dataset.data = chartData[key];
                if (dataset.data[dataset.data.length - 1] > 90) {
                    dataset['backgroundColor'] = 'rgba(255, 0, 0, 0.3)';
                    dataset['borderColor'] = 'rgba(255, 0, 0, 0.3)';
                }
            });

            charts[key].update();   // 차트 업데이트
        }
    });
};

const removeGraphs = (chart) => {
    chart.data.labels.splice(0, 1);
    chart.data.date.splice(0, 1);

    chart.data.datasets.forEach((dataset) => {
        dataset.data.splice(0, 1);
    });

    chart.update();   // 차트 업데이트
};

/**
 * @description 차트 데이터 업데이트 함수
 * @param {*} chartData 차트에 사용될 배열 데이터
 */
const updateGraphs = (chartData) => {

    $.each(chartData, (key, data) => {
        if (key !== 'label' && key !== 'date') {

            if (charts[key].data.labels.length > 15) {
                removeGraphs(charts[key]);
            }

            let dataLng = charts[key].data.datasets[0].data.length;

            charts[key].data.labels[dataLng] = chartData['label'][0];   // 기존 X축 데이터에 추가

            if (charts[key].data.date !== undefined)
                charts[key].data.date[charts[dataLng]] = chartData['date'][0];   // 해당 점위에 마우스를 올렸을 때 표시할 기존 데이터에 추가

            // 차트에서 보여질 기존 실데이터에 추가
            charts[key].data.datasets.forEach((dataset) => {
                dataset.data.push(chartData[key][0]);
            });

            charts[key].update();   // 차트 업데이트
        }
    });
};

// 뒤로가기 클릭 이벤트
$('#back').click(function() {
    if (viewTimerId === undefined && window.location.pathname.indexOf('slack') < 0) viewChange();
    $(this).hide();   // 뒤로가기 버튼 숨김
    $('#allSvcStat').show();   // 전체 서비스 상태표 페이지 보여줌
    $('#search').show();   // 검색창 보여줌
    $('#svcStat').hide();   // 서비스 상태 페이지 숨김
    $('#title').html('전체 서비스 상태표');   // 상단 타이틀 변경
    pageNm = 'main';   // 소켓통신시 공통으로 이용할 플래그 값(페이지이름)
    pageIdx = -1;   // 소켓통신시 공통으로 이용할 플래그 값(서버리스트 인덱스)
    pageStatus = '정상';   // 소켓통신시 공통으로 이용할 플래그 값(서버리스트 인덱스)
    sendToClient(ws, pageNm + ',' + pageIdx + ',' + status);   // nodeJS 서버로 데이터 송신
});