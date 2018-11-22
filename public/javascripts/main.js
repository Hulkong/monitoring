/**
 * @description 전체서비스 상태표 페이지 구성을 위한 초기화 함수
 * @param {*} svcList 서비스 리스트
 */
const mainPageInit = () => {
    // history.replaceState({ data: 'replace' }, '', '/resource/main');
    makeTbAllSvcList(); // 동적으로 테이블리스트 생성
    modScreenSize('allSvcStat');   // 모니터 해상도에 따라 테이블 높이 조정
    makeErrArr();
};

/**
 * @description 동적으로 테이블리스트 생성 함수
 * @param {*} svcList 서비스 리스트
 */
const makeTbAllSvcList = () => {
    $.each(svcList, function(idx, svc) {

        // 데이터가 없을 시 '-'로 표현
        const port = (svc['port'] === '' || svc['port'] === null) ? '-' : svc['port'],
            nm = (svc['nm'] === '' || svc['nm'] === null) ? '-' : svc['nm'],
            usage = (svc['usage'] === '' || svc['usage'] === null) ? '-' : svc['usage'],
            ip = (svc['ip'] === '' || svc['ip'] === null) ? '-' : svc['ip'],
            status = (svc['status'] === undefined || svc['status'] === '' || svc['status'] === null) ? '-' : svc['status'];

        let html = '<tr idx=' + idx + ' status=' + status + '>';
            html += '<td>' + nm + '</td>';
            html += '<td>' + usage + '</td>';
            html += '<td>' + ip + '</td>';
            html += '<td>' + port + '</td>';
            html += '<td>' + status + '</td>';
            html += '</tr>';

        $('#allSvcStat tbody').append(html);
    });

    $('#allSvcStat tbody tr[status="장애"]').addClass('blinkcss');   // 위험리스트에 깜빡이는 효과 생성

    // 테이블 리스트 클릭 이벤트
    $('#allSvcStat tbody tr').click(function(event) {

        let idx = $(this).attr('idx');   // 선택된 서비스 리스트의 인덱스

        // 해당 서비스에 모니터링 에이전트가 존재할 경우
        let svcNm = $(this).find('td').eq(0).text();
        let usage = $(this).find('td').eq(1).text();
        let status = $(this).find('td').eq(4).text();
        let url = svcList[idx]['url'];
        let realUrl = /(http(s)?:\/\/|www.)([a-z0-9\w]+\.*)+[a-z0-9]{2,4}([\/a-z0-9-%#?&=\w])+(\.[a-z0-9]{2,4}(\?[\/a-z0-9-%#?&=\w]+)*)*/gi.exec(url)[0];

        if(svcList[idx]['was'].length === 0) return;

        if (event['originalEvent']) {
            if (errTimerId !== undefined) {
                clearInterval(errTimerId);
                errTimerId = undefined;
            }

            if (viewTimerId !== undefined) {
                clearInterval(viewTimerId);
                viewTimerId = undefined;
            }
        }

        $('#allSvcStat').hide();
        $('#search').hide();
        $('#svcStat').css('display', 'grid');
        $('#title').attr('href', realUrl);
        $('#title').html(svcNm + '(' + usage + ')');
        $('#back').show();

        // 현재 클릭된 리스트의 데이터들을 임시 저장함
        $(this).data('idx', idx);
        $(this).data('dbconn', true);
        $(this).data('was', true);
        $(this).data('status', status);

        if (svcList[idx]['dbHost'] === undefined) {
            // $('#dbconn').hide();
            $(this).data('dbconn', false);
        }

        if (svcList[idx]['was'].length === 0) {
            $(this).data('was', false);
        }

        subPageInit(this);   // sub page 초기화
    });

    // 테이블 마우스 엔터 이벤트
    $('#allSvcStat tbody tr').mouseenter(function () {
        $(this).css('background-color', '#7F7F7F');
    });

    // 테이블 리스트 마우스 리브 이벤트
    $('#allSvcStat tbody tr').mouseleave(function () {
        $(this).css('background-color', '#EAEAEA');
    });
};

/**
 * @description 검색키워드 입력 함수
 */
const typingSearch = () => {

    let data = $('#search input').val();
    let hangulReq = /[ㄱ-ㅎ|ㅏ-ㅣ|가-힣]/;

    // 검색이 하나도 없을 경우
    if (data.length === 0) {
        $('#allSvcStat tbody tr').show();
        modScreenSize('allSvcStat');
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

/**
 * @description 서비스리스트의 테이블 offset 전역으로 관리
 * 스크롤에 사용하기 위해서
 */
const makeErrArr = () => {
    $('#allSvcStat tbody tr').each((idx, tr) => {
        let offset = $(tr).offset();
        offset.top = offset.top - ($('#allSvcStat').offset()).top;

        let pushData = {
            index: idx,
            offset: offset,
            occur: 'no'
        };

        errArr.push(pushData);
    });
};

const viewChange = () => {

    let idx = 0;
    viewTimerId = setInterval(() => {
        if (svcList.length  === idx) idx = 0;

        if (pageNm === 'main') {
            if (svcList[idx]['was'].length !== 0) {
                $('#allSvcStat tbody tr').eq(idx++).trigger('click');
            } else {
                $('#allSvcStat tbody tr').eq(++idx).trigger('click');
                idx++;
            }
        } else if (pageNm === 'sub') {
            $('#back').trigger('click');
        }

    }, 10000);
};

/**
 * @description 에러발생시 리스트 자동으로 스크롤 이동하는 함수
 * @param {*} err 에러발생 여부
 */
const errChangeScroll = () => {
    let idx = 0;
    errTimerId = setInterval(() => {
        let offsetArr = errArr.filter((d) => { if (d['occur'] === 'yes') return d['offset'] });
        if (offsetArr.length === idx) idx = 0;

        $('#allSvcStat').animate({ scrollTop: offsetArr[idx]['offset']['top'] }, 800);
        idx++;
    }, 8500);
};
