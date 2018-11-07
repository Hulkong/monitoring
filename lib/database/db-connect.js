let oracle = require('./oracle-dbc.js');
let pg = require('./pg-dbc.js');
let maria = require('./maria-dbc.js');
let type =  {
    'oracle': oracle,
    'postgres': pg,
    'maria': maria
};

module.exports = {
    /**
     * @description DB Connection 생성하는 함수
     * @param {*} dbconfig DB 설정값
     * @param {*} category DB 종류
     */
    createConn: (dbconfig, category) => {return type[category].createConn(dbconfig);},

    /**
     * @description DB Connection Pool 생성하는 함수
     * @param {*} dbconfig DB 설정값
     * @param {*} category DB 종류
     */
    createPool: (dbconfig, category) => {return type[category].createPool(dbconfig);},

    /**
     * @description DB Query 실행하는 함수
     * @param {*} pool DB Pool
     * @param {*} sql 실행할 쿼리
     */
    execQuery: (pool, sql, values, category) => { return type[category].execQuery(pool, sql, values);},

    /**
     * @description 데이터베이스 종류에 따라 쿼리 생성
     * @param {*} type 데이터베이스 종류
     * @param {*} status 활성 / 비활성
     * @returns 쿼리
     */
    makeSql: (type) => {
        let sql = '';

        if (type === 'oracle') {   // 오라클일 경우
            sql = `SELECT A.CNT ACT_CNT, B.CNT IN_ACT_CNT, (A.CNT + B.CNT) TOT_CONN_CNT, C.MAX_CONN_CNT
                FROM (
                          SELECT COUNT(*) CNT FROM V$SESSION WHERE USERNAME = :username AND STATUS = 'ACTIVE'
                        ) A
                      , (
                          SELECT COUNT(*) CNT FROM V$SESSION WHERE USERNAME = :username AND STATUS = 'INACTIVE'
                        ) B
                      , (
                          SELECT COUNT(*) AS MAX_CONN_CNT FROM V$SESSION
                        ) C`;
        } else if (type === 'maria') {   // maria일 경우
            sql = "SELECT A.CNT ACT_CNT, B.CNT IN_ACT_CNT, (A.CNT + B.CNT) TOT_CONN_CNT, C.MAX_CONN_CNT MAX_CONN_CNT FROM ";
            sql += " (SELECT COUNT(*) CNT FROM information_schema.PROCESSLIST WHERE DB = ? AND USER = ? AND HOST LIKE CONCAT(?, '%') AND COMMAND = 'Sleep') A ";
            sql += ", (SELECT COUNT(*) CNT FROM information_schema.PROCESSLIST WHERE DB = ? AND USER = ? AND HOST LIKE CONCAT(?, '%') AND(COMMAND = 'Query' || COMMAND = 'Execute')) B";
            sql += ", (SELECT VARIABLE_VALUE AS MAX_CONN_CNT FROM information_schema.GLOBAL_STATUS WHERE VARIABLE_NAME = 'Max_used_connections') C";
        } else if (type === 'postgres') {   // postgresql일 경우
            sql = "SELECT A.ACT_CNT, B.IN_ACT_CNT, (A.ACT_CNT + B.IN_ACT_CNT) AS TOT_CONN_CNT, C.MAX_CONN_CNT FROM ";
            sql += " (SELECT COUNT(*) AS ACT_CNT FROM PG_STAT_ACTIVITY WHERE DATNAME = $1::text AND USENAME = $2::text AND CLIENT_ADDR = $3::inet AND STATE = 'active') A";
            sql += " ,(SELECT COUNT(*) AS IN_ACT_CNT FROM PG_STAT_ACTIVITY WHERE DATNAME = $1::text AND USENAME = $2::text AND CLIENT_ADDR = $3::inet AND STATE = 'idle') B";
            sql += " ,(SELECT SETTING::INT MAX_CONN_CNT FROM PG_SETTINGS WHERE NAME=$$max_connections$$) C";
        }

        return sql;
    }
};