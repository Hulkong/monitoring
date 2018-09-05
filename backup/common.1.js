// 사용할 변수 초기화(한번만 실행해야 함)
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
};

const openSocket = () => {
    ws = new WebSocket("ws://localhost:3001");                                             // 웹소켓 전역 객체 생성
    ws.onopen = (event) => { ws.send("Client message: Hi"); }                           // 연결 수립되면 서버에 메시지를 전송
    ws.onmessage = (event) => { console.log("Server message: ", event.data) }      // 서버로부터 메시지를 수신
    ws.onerror = (event) => { console.log("Server error message: ", event.data) }   // error event handler
};

// monitor 데이터베이스 생성, svclist 테이블 생성, 데이터 삽입
const makeDB = () => {
    if (window.openDatabase) {                                                        // 데이터베이스 생성
        db = openDatabase("monitor", "1.0", " 서비스 정보", "1024*1024");   // monitor라는 DB 1MB 크기로 생성

        db.transaction (
            // db 접근했음을 알리는 경고창
            function (tx) {
                // tx.executeSql("drop table svclist");
                tx.executeSql("CREATE TABLE IF NOT EXISTS SVCLIST(NM, USAGE, IP, PORT, STATUS, URL, VIRTUALCORE, MEMORY, HARDDISK, OS, JDK, WAS)");  //svclist테이블 생성

                tx.executeSql("SELECT * FROM SVCLIST", undefined, function (tx, result) {
                    let resultCnt = result.rows.length;
                    if(resultCnt <= 0) {
                        tx.executeSql("INSERT INTO SVCLIST (NM, USAGE, IP, PORT, URL, VIRTUALCORE, MEMORY, HARDDISK, OS, JDK, WAS) VALUES(?,?,?,?,?,?,?,?,?,?,?)", ["D.A.R.T", "애플리케이션+맵", "115.68.55.206", "9079", "http://dart.geo-marketing.co.kr", "1", "10GB", "250GB", "Ubuntu 14.04.4 LTS", "1.7.0_101", "Apche Tomcat 5.5.23"]);
                        tx.executeSql("INSERT INTO SVCLIST (NM, USAGE, IP, PORT, URL, VIRTUALCORE, MEMORY, HARDDISK, OS, JDK, WAS) VALUES(?,?,?,?,?,?,?,?,?,?,?)", ["D.A.R.T", "배경지도", "115.68.55.206", "8081", "http://115.68.55.206:8081/tilemap/6/63/27", "1", "10GB", "250GB", "Ubuntu 14.04.4 LTS", "1.7.0_101", ""]);
                        tx.executeSql("INSERT INTO SVCLIST (NM, USAGE, IP, PORT, URL, VIRTUALCORE, MEMORY, HARDDISK, OS, JDK, WAS) VALUES(?,?,?,?,?,?,?,?,?,?,?)", ["새주소정제 지오코딩서비스", "애플리케이션", "115.68.55.206", "9059", "http://www.geocoding.co.kr", "1", "10GB", "250GB", "Ubuntu 14.04.4 LTS", "1.7.0_101", "Apche Tomcat 5.5.23"]);
                        tx.executeSql("INSERT INTO SVCLIST (NM, USAGE, IP, PORT, URL, VIRTUALCORE, MEMORY, HARDDISK, OS, JDK, WAS) VALUES(?,?,?,?,?,?,?,?,?,?,?)", ["새주소정제 지오코딩서비스", "배경지도(다음)", "", "", "", "", "", "", "", "", ""]);
                        tx.executeSql("INSERT INTO SVCLIST (NM, USAGE, IP, PORT, URL, VIRTUALCORE, MEMORY, HARDDISK, OS, JDK, WAS) VALUES(?,?,?,?,?,?,?,?,?,?,?)", ["홈페이지", "애플리케이션", "115.68.55.206", "11080", "http://www.openmate.co.kr", "1", "10GB", "250GB", "Ubuntu 14.04.4 LTS", "1.7.0_101", "Apche Tomcat 7.0.68"]);
                        tx.executeSql("INSERT INTO SVCLIST (NM, USAGE, IP, PORT, URL, VIRTUALCORE, MEMORY, HARDDISK, OS, JDK, WAS) VALUES(?,?,?,?,?,?,?,?,?,?,?)", ["XGS", "애플리케이션", "115.68.55.206", "80", "http://xgs.openmate.co.kr", "1", "10GB", "250GB", "Ubuntu 14.04.4 LTS", "1.7.0_101", ""]);
                        tx.executeSql("INSERT INTO SVCLIST (NM, USAGE, IP, PORT, URL, VIRTUALCORE, MEMORY, HARDDISK, OS, JDK, WAS) VALUES(?,?,?,?,?,?,?,?,?,?,?)", ["XGE-TEST", "애플리케이션", "115.68.55.206", "80", "http://xge.openmate.co.kr", "1", "10GB", "250GB", "Ubuntu 14.04.4 LTS", "1.7.0_101", ""]);
                        tx.executeSql("INSERT INTO SVCLIST (NM, USAGE, IP, PORT, URL, VIRTUALCORE, MEMORY, HARDDISK, OS, JDK, WAS) VALUES(?,?,?,?,?,?,?,?,?,?,?)", ["APP", "애플리케이션", "115.68.55.206", "9065", "http://app.openmate.co.kr", "1", "10GB", "250GB", "Ubuntu 14.04.4 LTS", "1.7.0_101", "Apche Tomcat 5.5.23"]);
                        tx.executeSql("INSERT INTO SVCLIST (NM, USAGE, IP, PORT, URL, VIRTUALCORE, MEMORY, HARDDISK, OS, JDK, WAS) VALUES(?,?,?,?,?,?,?,?,?,?,?)", ["rtc", "애플리케이션", "115.68.55.206", "9089", "http://rtc.openmate.co.kr/", "1", "10GB", "250GB", "Ubuntu 14.04.4 LTS", "1.7.0_101", "Apche Tomcat 5.5.23"]);
                        tx.executeSql("INSERT INTO SVCLIST (NM, USAGE, IP, PORT, URL, VIRTUALCORE, MEMORY, HARDDISK, OS, JDK, WAS) VALUES(?,?,?,?,?,?,?,?,?,?,?)", ["API", "애플리케이션", "115.68.55.206", "9035", "http://api.geocoding.co.kr", "1", "10GB", "250GB", "Ubuntu 14.04.4 LTS", "1.7.0_101", "Apche Tomcat 5.5.23"]);
                        tx.executeSql("INSERT INTO SVCLIST (NM, USAGE, IP, PORT, URL, VIRTUALCORE, MEMORY, HARDDISK, OS, JDK, WAS) VALUES(?,?,?,?,?,?,?,?,?,?,?)", ["SGM", "애플리케이션", "115.68.55.206", "9100", "http://sgm.openmate.co.kr/", "1", "10GB", "250GB", "Ubuntu 14.04.4 LTS", "1.7.0_101", "Apche Tomcat 7.0.59"]);
                        tx.executeSql("INSERT INTO SVCLIST (NM, USAGE, IP, PORT, URL, VIRTUALCORE, MEMORY, HARDDISK, OS, JDK, WAS) VALUES(?,?,?,?,?,?,?,?,?,?,?)", ["셀프맵1.0 체험판1", "애플리케이션+맵", "115.68.55.206", "10006", "http://selfbeta.openmate.co.kr", "1", "10GB", "250GB", "Ubuntu 14.04.4 LTS", "1.7.0_101", "Apche Tomcat 7.0.88"]);
                        tx.executeSql("INSERT INTO SVCLIST (NM, USAGE, IP, PORT, URL, VIRTUALCORE, MEMORY, HARDDISK, OS, JDK, WAS) VALUES(?,?,?,?,?,?,?,?,?,?,?)", ["셀프맵1.0 체험판1", "배경지도", "115.68.55.221", "8081", "http://tmap0.selfmap.co.kr:8081/TileMap/14/6343/13973.png", "2", "5GB", "300GB", "Ubuntu 14.04.4 LTS", "1.6.0_41", ""]);
                        tx.executeSql("INSERT INTO SVCLIST (NM, USAGE, IP, PORT, URL, VIRTUALCORE, MEMORY, HARDDISK, OS, JDK, WAS) VALUES(?,?,?,?,?,?,?,?,?,?,?)", ["셀프맵1.0 체험판2", "애플리케이션+맵", "115.68.55.217", "8080", "http://basic.selfmap.co.kr", "1", "2GB", "200GB", "Ubuntu 14.04.4 LTS", "1.7.0_95", "Apche Tomcat 7.0.68"]);
                        tx.executeSql("INSERT INTO SVCLIST (NM, USAGE, IP, PORT, URL, VIRTUALCORE, MEMORY, HARDDISK, OS, JDK, WAS) VALUES(?,?,?,?,?,?,?,?,?,?,?)", ["JTI관리자", "애플리케이션", "115.68.55.206", "9099", "http://jtiwvs.openmate.co.kr", "1", "10GB", "250GB", "Ubuntu 14.04.4 LTS", "1.7.0_101", "Apche Tomcat 5.5.23"]);
                        tx.executeSql("INSERT INTO SVCLIST (NM, USAGE, IP, PORT, URL, VIRTUALCORE, MEMORY, HARDDISK, OS, JDK, WAS) VALUES(?,?,?,?,?,?,?,?,?,?,?)", ["JTI관리자", "배경지도(다음)", "", "", "", "", "", "", "", "", ""]);
                        tx.executeSql("INSERT INTO SVCLIST (NM, USAGE, IP, PORT, URL, VIRTUALCORE, MEMORY, HARDDISK, OS, JDK, WAS) VALUES(?,?,?,?,?,?,?,?,?,?,?)", ["JTI", "애플리케이션+맵", "115.68.55.224", "8080", "https://jti.selfmap.co.kr", "8", "4.8GB", "50GB", "Ubuntu 14.04.4 LTS", "1.7.0_80", "Apche Tomcat 7.0.73"]);
                        tx.executeSql("INSERT INTO SVCLIST (NM, USAGE, IP, PORT, URL, VIRTUALCORE, MEMORY, HARDDISK, OS, JDK, WAS) VALUES(?,?,?,?,?,?,?,?,?,?,?)", ["JTI", "배경지도", "115.68.55.221", "8081", "http://tmap0.selfmap.co.kr:8081/TileMap/14/6343/13973.png", "2", "5GB", "300GB", "Ubuntu 14.04.4 LTS", "1.6.0_41", ""]);
                        tx.executeSql("INSERT INTO SVCLIST (NM, USAGE, IP, PORT, URL, VIRTUALCORE, MEMORY, HARDDISK, OS, JDK, WAS) VALUES(?,?,?,?,?,?,?,?,?,?,?)", ["XGE209", "", "115.68.55.209", "8080", "http://115.68.55.209:8080", "3", "8GB", "120GB", "Windows Server 2007 Enterprise", "", ""]);
                        tx.executeSql("INSERT INTO SVCLIST (NM, USAGE, IP, PORT, URL, VIRTUALCORE, MEMORY, HARDDISK, OS, JDK, WAS) VALUES(?,?,?,?,?,?,?,?,?,?,?)", ["중국인 관광통계 분석시스템", "애플리케이션+맵", "115.68.55.210", "9011", "http://china.openmate.co.kr", "1", "4GB", "200GB", "Ubuntu 14.04.1 LTS", "1.7.0_181", "Apche Tomcat 5.5.23"]);
                        tx.executeSql("INSERT INTO SVCLIST (NM, USAGE, IP, PORT, URL, VIRTUALCORE, MEMORY, HARDDISK, OS, JDK, WAS) VALUES(?,?,?,?,?,?,?,?,?,?,?)", ["중국인 관광통계 분석시스템", "배경지도(네이버)", "", "", "", "", "", "", "", "", ""]);
                        tx.executeSql("INSERT INTO SVCLIST (NM, USAGE, IP, PORT, URL, VIRTUALCORE, MEMORY, HARDDISK, OS, JDK, WAS) VALUES(?,?,?,?,?,?,?,?,?,?,?)", ["뉴스레터", "애플리케이션", "115.68.55.211", "80", "http://newsletter.openmate.co.kr", "2", "2GB", "100GB", "Ubuntu 16.04.3 LTS", "", "Apche Tomcat 2.4.18"]);
                        tx.executeSql("INSERT INTO SVCLIST (NM, USAGE, IP, PORT, URL, VIRTUALCORE, MEMORY, HARDDISK, OS, JDK, WAS) VALUES(?,?,?,?,?,?,?,?,?,?,?)", ["DTA", "애플리케이션", "115.68.55.213", "8080", "http://115.68.55.213:8080/dta", "1", "4GB", "40GB", "Windows Server 2008 R2 Standard", "1.7.0_04", ""]);
                        tx.executeSql("INSERT INTO SVCLIST (NM, USAGE, IP, PORT, URL, VIRTUALCORE, MEMORY, HARDDISK, OS, JDK, WAS) VALUES(?,?,?,?,?,?,?,?,?,?,?)", ["트렌드온", "애플리케이션", "115.68.218.196", "8080", "https://www.trend-on.co.kr", "", "8GB", "100GB", "CentOS 7", "1.7.0_80", "Apche Tomcat"]);
                        tx.executeSql("INSERT INTO SVCLIST (NM, USAGE, IP, PORT, URL, VIRTUALCORE, MEMORY, HARDDISK, OS, JDK, WAS) VALUES(?,?,?,?,?,?,?,?,?,?,?)", ["트렌드온", "배경지도(vworld)", "", "", "", "", "", "", "", "", ""]);
                        tx.executeSql("INSERT INTO SVCLIST (NM, USAGE, IP, PORT, URL, VIRTUALCORE, MEMORY, HARDDISK, OS, JDK, WAS) VALUES(?,?,?,?,?,?,?,?,?,?,?)", ["cctv공개용", "", "", "", "", "", "", "", "", "", ""]);
                        tx.executeSql("INSERT INTO SVCLIST (NM, USAGE, IP, PORT, URL, VIRTUALCORE, MEMORY, HARDDISK, OS, JDK, WAS) VALUES(?,?,?,?,?,?,?,?,?,?,?)", ["cctv안동", "애플리케이션", "115.68.55.218", "8080", "http://pub.selfmap.co.kr/omsc/cctv/andong", "1", "2GB", "200GB", "Ubuntu 14.04.4 LTS", "1.7.0_95", "Apche Tomcat 7.0.68"]);
                        tx.executeSql("INSERT INTO SVCLIST (NM, USAGE, IP, PORT, URL, VIRTUALCORE, MEMORY, HARDDISK, OS, JDK, WAS) VALUES(?,?,?,?,?,?,?,?,?,?,?)", ["cctv안산", "애플리케이션", "115.68.55.218", "8080", "http://pub.selfmap.co.kr/omsc/cctv/ansan", "1", "2GB", "200GB", "Ubuntu 14.04.4 LTS", "1.7.0_95", "Apche Tomcat 7.0.68"]);
                        tx.executeSql("INSERT INTO SVCLIST (NM, USAGE, IP, PORT, URL, VIRTUALCORE, MEMORY, HARDDISK, OS, JDK, WAS) VALUES(?,?,?,?,?,?,?,?,?,?,?)", ["안동-안산CCTV", "맵", "115.68.55.215", "8080", "", "4", "12GB", "400GB", "Ubuntu 14.04.4 LTS", "1.7.0_95", "Apche Tomcat 7.0.68"]);
                        tx.executeSql("INSERT INTO SVCLIST (NM, USAGE, IP, PORT, URL, VIRTUALCORE, MEMORY, HARDDISK, OS, JDK, WAS) VALUES(?,?,?,?,?,?,?,?,?,?,?)", ["셀프맵2.0 플랫폼", "애플리케이션", "115.68.55.219", "8090", "http://beta.selfmap.co.kr", "1", "2GB", "200GB", "Ubuntu 14.04.4 LTS", "1.7.0_95", "Apche Tomcat 7.0.73"]);
                        tx.executeSql("INSERT INTO SVCLIST (NM, USAGE, IP, PORT, URL, VIRTUALCORE, MEMORY, HARDDISK, OS, JDK, WAS) VALUES(?,?,?,?,?,?,?,?,?,?,?)", ["셀프맵2.0 플랫폼", "맵", "115.68.55.216", "8080", "", "8", "4GB", "200GB", "Ubuntu 14.04.4 LTS", "1.7.0_95", "Apche Tomcat 7.0.68"]);
                        tx.executeSql("INSERT INTO SVCLIST (NM, USAGE, IP, PORT, URL, VIRTUALCORE, MEMORY, HARDDISK, OS, JDK, WAS) VALUES(?,?,?,?,?,?,?,?,?,?,?)", ["대한A&C", "애플리케이션+맵", "115.68.55.218", "9080", "http://www.rtdmp.co.kr", "1", "2GB", "200GB", "Ubuntu 14.04.4 LTS", "1.7.0_95", "Apche Tomcat 7.0.68"]);
                        tx.executeSql("INSERT INTO SVCLIST (NM, USAGE, IP, PORT, URL, VIRTUALCORE, MEMORY, HARDDISK, OS, JDK, WAS) VALUES(?,?,?,?,?,?,?,?,?,?,?)", ["대한A&C", "배경지도", "115.68.55.221", "8081", "http://tmap0.selfmap.co.kr:8081/TileMap/14/6343/13973.png", "2", "5GB", "300GB", "Ubuntu 14.04.4 LTS", "1.6.0_41", ""]);
                        tx.executeSql("INSERT INTO SVCLIST (NM, USAGE, IP, PORT, URL, VIRTUALCORE, MEMORY, HARDDISK, OS, JDK, WAS) VALUES(?,?,?,?,?,?,?,?,?,?,?)", ["Amore", "애플리케이션", "115.68.55.219", "8090", "http://beta.selfmap.co.kr/omsc/amore", "1", "2GB", "200GB", "Ubuntu 14.04.4 LTS", "1.7.0_95", "Apche Tomcat 7.0.73"]);
                        tx.executeSql("INSERT INTO SVCLIST (NM, USAGE, IP, PORT, URL, VIRTUALCORE, MEMORY, HARDDISK, OS, JDK, WAS) VALUES(?,?,?,?,?,?,?,?,?,?,?)", ["Amore", "맵", "115.68.55.216", "8080", "", "8", "4GB", "200GB", "Ubuntu 14.04.4 LTS", "1.7.0_95", "Apche Tomcat 7.0.68"]);
                        tx.executeSql("INSERT INTO SVCLIST (NM, USAGE, IP, PORT, URL, VIRTUALCORE, MEMORY, HARDDISK, OS, JDK, WAS) VALUES(?,?,?,?,?,?,?,?,?,?,?)", ["Amore", "배경지도", "115.68.55.221", "8081", "http://tmap0.selfmap.co.kr:8081/TileMap/14/6343/13973.png", "2", "5GB", "300GB", "Ubuntu 14.04.4 LTS", "1.6.0_41", ""]);
                        tx.executeSql("INSERT INTO SVCLIST (NM, USAGE, IP, PORT, URL, VIRTUALCORE, MEMORY, HARDDISK, OS, JDK, WAS) VALUES(?,?,?,?,?,?,?,?,?,?,?)", ["BBQ", "애플리케이션", "115.68.55.219", "8080", "http://fran.selfmap.co.kr", "1", "2GB", "200GB", "Ubuntu 14.04.4 LTS", "1.7.0_95", "Apche Tomcat 7.0.73"]);
                        tx.executeSql("INSERT INTO SVCLIST (NM, USAGE, IP, PORT, URL, VIRTUALCORE, MEMORY, HARDDISK, OS, JDK, WAS) VALUES(?,?,?,?,?,?,?,?,?,?,?)", ["BBQ", "애플리케이션", "115.68.55.227", "8080", "http://bbq.selfmap.co.kr", "2", "4GB", "10GB", "Ubuntu 14.04.4 LTS", "1.7.0_101", "Apche Tomcat 7.0.68"]);
                        tx.executeSql("INSERT INTO SVCLIST (NM, USAGE, IP, PORT, URL, VIRTUALCORE, MEMORY, HARDDISK, OS, JDK, WAS) VALUES(?,?,?,?,?,?,?,?,?,?,?)", ["BBQ", "맵", "115.68.55.230", "9080", "", "3", "6GB", "190GB", "Ubuntu 14.04.4 LTS", "1.7.0_101", "Apche Tomcat 7.0.68"]);
                        tx.executeSql("INSERT INTO SVCLIST (NM, USAGE, IP, PORT, URL, VIRTUALCORE, MEMORY, HARDDISK, OS, JDK, WAS) VALUES(?,?,?,?,?,?,?,?,?,?,?)", ["BBQ", "맵", "115.68.55.231", "9080", "", "2", "6GB", "150GB", "Ubuntu 14.04.4 LTS", "1.7.0_101", "Apche Tomcat 7.0.68"]);
                        tx.executeSql("INSERT INTO SVCLIST (NM, USAGE, IP, PORT, URL, VIRTUALCORE, MEMORY, HARDDISK, OS, JDK, WAS) VALUES(?,?,?,?,?,?,?,?,?,?,?)", ["BBQ", "데이터", "115.68.55.230", "10080", "", "3", "6GB", "190GB", "Ubuntu 14.04.4 LTS", "1.7.0_101", "Apche Tomcat 7.0.68"]);
                        tx.executeSql("INSERT INTO SVCLIST (NM, USAGE, IP, PORT, URL, VIRTUALCORE, MEMORY, HARDDISK, OS, JDK, WAS) VALUES(?,?,?,?,?,?,?,?,?,?,?)", ["BBQ", "데이터", "115.68.55.231", "10080", "", "2", "6GB", "150GB", "Ubuntu 14.04.4 LTS", "1.7.0_101", "Apche Tomcat 7.0.68"]);
                        tx.executeSql("INSERT INTO SVCLIST (NM, USAGE, IP, PORT, URL, VIRTUALCORE, MEMORY, HARDDISK, OS, JDK, WAS) VALUES(?,?,?,?,?,?,?,?,?,?,?)", ["BBQ", "배경지도", "115.68.55.230", "8081", "http://wmap2.openmate.com:8081/tilemap/L12/R00000630/C00000da2.png", "3", "6GB", "190GB", "Ubuntu 14.04.4 LTS", "1.7.0_101", "Apche Tomcat 7.0.68"]);
                    }
                });
            },
            function (error) { alert("db 연결실패") },   // db 접근을 실패 했음을 알리는 경고창
            function () { /*alert("db 연결성공")*/ }
        );
    }
};

// 서비스 리스트의 데이터를 가져오는 함수
const getData = (callback) => {
    if (window.openDatabase) {        //데이터베이스 생성
        db.transaction(
            function(tx) {
                tx.executeSql("SELECT * FROM SVCLIST", undefined, function (tx, result) {
                    callback(result.rows);
                });
            },
            function (error) { alert("db 연결실패") },   // db 접근을 실패 했음을 알리는 경고창
            function () { /*alert("db 연결성공")*/ }
        )
    }
};

// 원격 서버의 sc.jsp 호출하는 함수
const callRemoteServer = () => {
    // $.each(svcList, function (idx, list) {
        $.ajax({
            method: 'POST',
            url: 'http://localhost:3000/resource',
            /*
            data: {
                nm: 'test',
                usage: '애플리케이션 + 맵',
                ip: '127.0.0.1',
                port: '8080',
                url: 'http://localhost:8080/test2',
                length: 5
            },*/
            /*
            data: {
                nm: list['nm'],
                usage: list['usage'],
                ip: list['ip'],
                port: list['port'],
                url: list['url'],
                length: 5
            },*/
            data: {
                nm: svcList[4]['nm'],
                usage: svcList[4]['usage'],
                ip: svcList[4]['ip'],
                port: svcList[4]['port'],
                url: svcList[4]['url'],
                length: 5
            },
            statusCode: {
                404: function () {alert("page not found");},
                500: function () {alert("nodeJS server error");}
            }
        }).done(function (data) {   // 원격 서버와의 통신이 정상일 때
            // console.log(data)
            if (data['statusCode'] === 200) {   // 원격 서버와의 통신이 정상일 때
                openSocket();
                saveToMem(4, data['body']);

                if ($('#svcStat:visible').length > 0) {
                    updateGraphs(4);
                }
                // $('#allSvcStat tbody tr').eq(idx).find('td').eq(4).text('정상');
                // $('#allSvcStat tbody tr').eq(idx).attr('status', '-').removeClass('blinkcss');   // 위험리스트에 깜빡이는 효과 생성

            } else {   // 원격 서버 장애발생시
                // $('#allSvcStat tbody tr').eq(idx).find('td').eq(4).text('장애');
                // $('#allSvcStat tbody tr').eq(idx).attr('status', '장애').addClass('blinkcss');   // 위험리스트에 깜빡이는 효과 생성
                // pushMtoSlack(svcList[idx]);   // 슬랙앱으로 메시지 푸쉬하는 함수 호출
            }
        }).fail(function (jqXHR, textStatus) {   // nodeJS 서버와의 통신이 비정상일 때
            // alert("Request failed: " + textStatus);
            console.log(jqXHR)
            console.log(textStatus);
        });
//    });
};

// 장애 or 경고 발생시 해당 서버에 대하여 관리자에게 슬랙 앱으로 메시지 푸쉬하는 함수
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
        statusCode: {
            // 404: function () {alert("page not found");}
        }
    }).done(function (data) {
        console.log(data);
    }).fail(function (jqXHR, textStatus) {
        // alert("Request failed: " + textStatus);
        console.log(textStatus);
    });
};

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

const convertData = (index, data) => {
    console.log(data)
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
 *  원격 서버의 물리자원 이용률 데이터를 메모리에 저장
 *  데이터 보존기간은 2시간
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

// 현재 시간을 구하는 함수
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

// 시간 비교하는 함수
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

// 그래프 프레임 만드는 함수
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