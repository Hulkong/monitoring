const oracledb = require('oracledb');

module.exports = {
    /**
     *
     * @param {*} dbconfig
     *  user          : "JH",
        password      : "JH",
        connectString : "localhost/XE"
     */
    createConn: function(dbconfig) {
        oracledb.getConnection(dbConfig, (err, connection) => {
            if (err) throw err;

            return connection;
        });
    },

    /**
     * @description Oracle DB Pool 생성
     * @param {*} dbconfig DB 설정값
     * @returns promise타입
       [----- nessary config------]
        connectString : The Oracle database instance used by connections in the pool.(ex. "localhost/XE", etc. nessary)
        user
        password

       [----- option config------]
        edition : Sets the name used for Edition-Based Redefinition by connections in the pool.(ex. ed_2)
        events : Determines whether Oracle Client events mode should be enabled.(default. fasle)
        externalAuth: If this property is true then connections are established using external authentication(default false)
        homogeneous: Indicate whether connections in the pool all have the same credentials (a 'homogeneous' pool), or whether different credentials can be used (a 'heterogeneous' pool).
        poolAlias: The poolAlias is an optional property that is used to explicitly add pools to the connection pool cache.(ex. "hrpool")
        poolIncrement: The number of connections that are opened whenever a connection request exceeds the number of currently open connections.(default 1)
        poolMax: The maximum number of connections to which a connection pool can grow. (default 4)
        poolMin: The minimum number of connections a connection pool maintains, even when there is no activity to the target database. (default 0)
        poolPingInterval: When a pool getConnection() is called and the connection has been idle in the pool for at least poolPingInterval seconds, an internal "ping" will be performed first to check the aliveness of the connection. (default 0)
        poolTimeout: The number of seconds after which idle connections (unused in the pool) may be terminated. Idle connections are terminated only when the pool is accessed. (default 60)
        queueTimeout: The number of milliseconds after which connection requests waiting in the connection request queue are terminated. If queueTimeout is set to 0, then queued connection requests are never terminated. (default 60000)
        stmtCacheSize: The number of statements to be cached in the statement cache of each connection in the pool.
     */
    createPool: function(dbconfig) {
        return oracledb.createPool(dbconfig);
    },

    execQuery: function(pool, sql, values) {

        return new Promise((resolve, reject) => {
            pool.getConnection((err, conn) => {
                // not connected!
                if (err) {
                    reject("DB is not connected!", err);
                    return;
                    // throw err;
                }

                // Use the connection
                // console.log("Connected!");
                conn.execute(sql, values, function (err, result) {

                    // When done with the connection, release it.
                    // 커넥션을 풀에 반환
                    conn.release();

                    if (err) {
                        reject("The query was not executed!", err);
                        return;
                        // throw err;
                    }
                    // console.log(result.rows);
                    resolve(result.rows);
                });
            });
        });
    }
};