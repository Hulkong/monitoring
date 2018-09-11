const mysql = require('mysql');

module.exports = {
    createConn: (dbconfig) => {
        return mysql.createConnection(dbconfig);
    },

    /**
     * @description  DB Pool 생성
     * @param {*} dbconfig DB 설정값
     */
    createPool: (dbconfig) => {
        return mysql.createPool(dbconfig);
    },

    execQuery: (pool, sql, values) => {

        return new Promise((resolve, reject) => {
            // Get Connection in Pool
            pool.getConnection((err, conn) => {

                if (err) throw err;   // not connected!
                // console.log("Connected!");

                // Use the connection
                    conn.query(sql, values, function (error, results, fields) {
                    // When done with the connection, release it.

                    // 커넥션을 풀에 반환
                    conn.release();

                    if (err) throw err;
                    // console.log(results[0]);
                    resolve(results[0]);
                });
            });
        });
    }
};