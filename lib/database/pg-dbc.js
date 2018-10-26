const pg = require('pg');
const Pool = require('pg-pool');

// dbconfig values
// Do not hard code your username and password.
/**
 *  host: '<your-db-server-name>.postgres.database.azure.com',
    user: '<your-db-username>',
    password: '<your-password>',
    database: '<name-of-database>',
    port: 5432,
    ssl: true,
    max: 20, // set pool max size to 20
    min: 4, // set min pool size to 4
    idleTimeoutMillis: 1000, // close idle clients after 1 second
    connectionTimeoutMillis: 1000, // return an error after 1 second if connection could not be established
 */
module.exports = {
    createConn: function(dbconfig) {
        return new pg.Client(dbconfig);
    },

    /**
     * @description postgreSQL DB Pool 생성
     * @param {*} dbconfig DB 설정값
     */
    createPool: function(dbconfig) {
        return new Pool(dbconfig);
    },

    execQuery: function(pool, sql, values) {
        /**
         * When you are finished with the pool if all the clients are idle
         * the pool will close them after config.idleTimeoutMillis and your app will shutdown gracefully.
         *  If you don't want to wait for the timeout you can end the pool as follows:
         */
        return new Promise((resolve, reject) => {

            (async () => {

                let client = await pool.connect();

                try {

                    let result = await client.query(sql, values);

                    // console.log(result.rows[0])
                    resolve(result.rows[0]);

                } catch (err) {
                    reject("The query was not executed!", err);
                    // throw err;
                } finally {
                    client.release()
                }

            })().catch(err => {
                reject("DB is not connected!", err);
                return;
                // throw err;
            });
        });
    }
};