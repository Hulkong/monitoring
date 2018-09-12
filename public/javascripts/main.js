/**
 * @description 전체서비스 상태표 페이지 구성을 위한 초기화 함수
 * @param {*} svcList 서비스 리스트
 */
const mainPageInit = () => {
    makeTbAllSvcList();
    modScreenSize();   // 모니터 해상도에 따라 테이블 높이 조정하는
    // intervalView();
};

/**
 * @description 동적으로 테이블리스트 생성 함수
 * @param {*} svcList 서비스 리스트
 */
const makeTbAllSvcList = () => {
    $.each(svcList, function(idx, svc) {
        const port = (svc['port'] === '' || svc['port'] === null) ? '-' : svc['port'],
            status = (svc['status'] === undefined || svc['status'] === '' || svc['status'] === null) ? '-' : svc['status'];

        let html = '<tr idx=' + idx + ' status=' + status + '>';
            html += '<td>' + svc['nm'] + '</td>';
            html += '<td>' + svc['usage'] + '</td>';
            html += '<td>' + svc['ip'] + '</td>';
            html += '<td>' + port + '</td>';
            html += '<td>' + status + '</td>';
            html += '</tr>';

        $('#allSvcStat tbody').append(html);
    });

    $('#allSvcStat tbody tr[status="장애"]').addClass('blinkcss');   // 위험리스트에 깜빡이는 효과 생성

    // 테이블 리스트 클릭 이벤트
    $('#allSvcStat tbody tr').click(function() {
        let idx = $(this).attr('idx');

        if (svcList[idx]['os'].length > 0) {
            const svcNm = $(this).find('td').eq(0).text();
            $('#allSvcStat').hide();
            $('#search').hide();
            $('#svcStat').css('display', 'grid');
            $('#title').html(svcNm + '서버 상태');
            $('#back').show();
            pageNm = 'sub';
            pageIdx = idx;
            ws.send(pageNm + ',' + pageIdx);

            // 현재 클릭된 리스트의 데이터들을 임시 저장함
            $(this).data('idx', idx);
            $(this).data('dbconn', true);
            $(this).data('was', true);

            if (svcList[idx]['dbHost'] === undefined) {
                $('#dbconn').hide();
                $(this).data('dbconn', false);
            }

            if (svcList[idx]['was'].length === 0) {
                $(this).data('was', false);
            }

            subPageInit(this);   // sub page 초기화
        }
    });

    // 테이블 마우스 엔터 이벤트
    $('#allSvcStat tbody tr').mouseenter(function () {
        $(this).css('background-color', '#7F7F7F');
    });

    // 테이블 리스트 마우스 리브 이벤트
    $('#allSvcStat tbody tr').mouseleave(function () {
        $(this).css('background-color', '#EAEAEA');
    });

    // setInterval(callRemoteServer, 3000);   // 원격 서버의 sc.jsp 호출
};

/**
 * @description 스크롤바 생성을 위한 높이값 조정
 */
const modScreenSize = () => {
    const hdHeight = $('header').height();
    $('section').height(screen.availHeight - hdHeight -150);
};

/**
 * @description 검색키워드 입력 함수
 */
const typingSearch = () => {

    let data = $('#search input').val();
    let hangulReq = /[ㄱ-ㅎ|ㅏ-ㅣ|가-힣]/;

    console.log(data)
    // 검색이 하나도 없을 경우
    if (data.length === 0) {
        $('#allSvcStat tbody tr').show();
        modScreenSize();
        return;
    }

    $('#allSvcStat tbody tr').hide();
    svcList.forEach((obj, idx) => {
        if (hangulReq.test(data)) {
            if (obj['nm'].search(data) >= 0) {
                $('#allSvcStat tbody tr').eq(idx).show();
            }
        } else {
            if (obj['nm'].toUpperCase().search(data.toUpperCase()) >= 0) {
                $('#allSvcStat tbody tr').eq(idx).show();
            }
        }
    });

    $('section').height('');
};
/**
 * @description 검색버튼 클릭 함수
 * @param {*} e 이벤트파라미터
 */
const clickSearch = (e) => {
    e.preventDefault();
    typingSearch();
}