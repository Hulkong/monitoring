// 서비스 서버 상태 페이지 구성을 위한 초기화 함수
subPageInit = (data) => {
    let idx = $(data).data('idx');
    makeTbSvcList(idx);   // 동적으로 테이블리스트 생성
    getResource(idx);
};

/**
 * @description nodejs 서버에 원격서비스 자원 데이터 요청(json)
 * * 파일에서 몇 라인 읽어옴
 * @param {*} idx
 */
const getResource = (idx) => {
    $.ajax({
        method: 'GET',
        url: window.location.href + 'resource/sub/' + idx,
        statusCode: {/* 404: function () {alert("page not found");}*/ }
    }).done(function (data) {
        // console.log(JSON.parse(data));
        let cleanData = convertData(JSON.parse(data));   // nodejs 서버에서 읽어온 파일을 json파싱 및 데이터 정제
        initGraphs();   // 라인차트 초기화
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
    $.each(charts, (key, chart) => {
        chart.data.labels = chartData['label'];
        chart.data.date = chartData['date'];
        chart.data.datasets.forEach((dataset) => {
            dataset.data = chartData[key];
        });
        charts[key].update();
    });
};

/**
 * @description 차트 데이터 업데이트 함수
 * @param {*} chartData 차트에 사용될 배열 데이터
 */
const updateGraphs = (chartData) => {

    $.each(charts, (key, chart) => {
        chart.data.labels[chart.data.datasets[0].data.length] = chartData['label'][0];

        if (chart.data.date !== undefined)
            chart.data.date[chart.data.datasets[0].data.length] = chartData['date'][0];

        chart.data.datasets.forEach((dataset) => {
            dataset.data.push(chartData[key][0]);
        });
        chart.update();
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
});