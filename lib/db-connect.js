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
    createPool: (dbconfig, category) => {
      return type[category].createPool(dbconfig);
    },

    /**
     * @description DB Query 실행하는 함수
     * @param {*} pool DB Pool
     * @param {*} sql 실행할 쿼리
     */
    execQuery: (pool, sql, values, category) => type[category].execQuery(pool, sql, values)
};