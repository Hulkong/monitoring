// 서비스 서버 상태 페이지 구성을 위한 초기화 함수
subPageInit = (data) => {
    let idx = $(data).data('idx');
    let dbconn = $(data).data('dbconn');
    let was = $(data).data('was');

    makeTbSvcList(idx);   // 동적으로 테이블리스트 생성
    initGraphs();   // 라인차트 초기화

    if (was) getSvResource(idx);
    if (dbconn) getDBConn(idx);
};

/**
 * @description nodejs 서버에 원격서비스 자원 데이터 요청(json)
 * * 파일에서 몇 라인 읽어옴
 * @param {*} idx
 */
const getSvResource = (idx) => {
    console.log(1111)
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
 * @description nodejs 서버에 원격서비스 자원 데이터 요청(json)
 * * 파일에서 몇 라인 읽어옴
 * @param {*} idx
 */
const getDBConn = (idx) => {
    console.log(2222)
    $.ajax({
        method: 'GET',
        url: window.location.href + 'resource/sub/dbConn/' + idx,
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
 * @description 서버 자원 그래프 그리는 함수
 * @param {*} chartData 차트에 사용될 배열 데이터
 */
const drawGraphs = (chartData) => {
    $.each(chartData, (key, data) => {
        if(key !== 'label' && key !== 'date') {
            charts[key].data.labels = chartData['label'];
            charts[key].data.date = chartData['date'];
            charts[key].data.datasets.forEach((dataset) => {
                dataset.data = chartData[key];
            });
            charts[key].update();
        }
    });
};

/**
 * @description 차트 데이터 업데이트 함수
 * @param {*} chartData 차트에 사용될 배열 데이터
 */
const updateGraphs = (chartData) => {

    $.each(chartData, (key, data) => {
        if (key !== 'label' && key !== 'date') {
            charts[key].data.labels[charts[key].data.datasets[0].data.length] = chartData['label'][0];

            if (charts[key].data.date !== undefined)
                charts[key].data.date[charts[key].data.datasets[0].data.length] = chartData['date'][0];

            charts[key].data.datasets.forEach((dataset) => {
                dataset.data.push(chartData[key][0]);
            });
            charts[key].update();
        }
    });
};

/**
 * @description 그래프 초기화 하는 함수
 */
const initGraphs = () => {
    $.each(charts, (key, chart) => {
        chart.data.datasets.forEach((dataset) => {
            dataset.data.pop();
        });
        charts[key].update();
    });
};

// 뒤로가기 클릭 이벤트
$('#back').click(function() {
    $(this).hide();   // 뒤로가기 버튼 숨김
    $('#allSvcStat').show();   // 전체 서비스 상태표 페이지 보여줌
    $('#search').show();   // 검색창 보여줌
    $('#svcStat').hide();   // 서비스 상태 페이지 숨김
    $('#title').html('전체 서비스 상태표');   // 상단 타이틀 변경
    pageNm = 'main';
    pageIdx = -1;
    ws.send(pageNm + ',' + pageIdx);
});