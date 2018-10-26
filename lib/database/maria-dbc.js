const mysql = require('mysql');

module.exports = {
    createConn: function(dbconfig) {
        return mysql.createConnection(dbconfig);
    },

    /**
     * @description  DB Pool 생성
     * @param {*} dbconfig DB 설정값
     */
    createPool: function(dbconfig) {
        return mysql.createPool(dbconfig);
    },

    execQuery: function(pool, sql, values) {

        return new Promise((resolve, reject) => {

            // Get Connection in Pool
            pool.getConnection((err, conn) => {

                // not connected!
                if (err) {
                    reject("DB is not connected!", err);
                    return;
                    // throw err;
                }

                // Use the connection
                // console.log("Connected!");
                conn.query(sql, values, function (err, results, fields) {

                    // When done with the connection, release it.
                    // 커넥션을 풀에 반환
                    conn.release();

                    if (err) {
                        reject("The query was not executed!", err);
                        return;
                        // throw err;
                    }
                    // console.log(results[0]);
                    resolve(results[0]);
                });
            });
        });
    }
};