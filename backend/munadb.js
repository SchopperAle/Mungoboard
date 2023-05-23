const sqlite = require("sqlite3");
let muna = {};

/**
 * Setzt die Datenbank
 * @param {sqlite.Database} db 
 */
muna.setDB = (db) => {
    muna.db = db;
}

/**
 * Async Version von db.all
 * @param {String} sql SQL-Code
 * @returns {Promise}
 */
muna.allS = (sql) => {
    return new Promise((resolve, reject) => {
        muna.db.all(sql, (err, rows) => {
            if(err){
                return resolve({err: err});
            }

            resolve(rows);
        });
    });
}

/**
 * Async Version von db.exec
 * @param {String} sql SQL-Code
 * @returns {Promise}
 */
muna.execS = (sql) => {
    return new Promise((resolve, reject) => {
        muna.db.exec(sql, (err) => {
            if(err){
                return resolve({err: err});
            }

            resolve();
        })
    })
}

/**
 * Async Version von db.get
 * @param {String} sql SQL-Code
 * @returns {Promise}
 */
muna.getS = (sql) => {
    return new Promise((resolve, reject) => {
        muna.db.get(sql, (err, row) => {
            if(err){
                return resolve({err: err});
            }
            resolve(row);
        })
    })
}

/**
 * Async Version von db.all mit Args
 * @param {String} sql SQL-Code
 * @param {[*] | *} args Argumente
 * @returns {Promise}
 */
muna.all = (sql, args) => {
    return new Promise((resolve, reject) => {
        muna.db.all(sql, args, (err, rows) => {
            if(err){
                return resolve({err: err});
            }

            resolve(rows);
        });
    });
}

/**
 * Prepared ein Statement mit Promises
 * @param {String} sql SQL-Code
 * @returns {sqlite.Statement}
 */
muna.prepare = (sql) => {
    let statement = muna.db.prepare(sql, (err) => {
        if(err){
            console.log("Error preparing statement: " + err);
            process.exit(50);
        }
    });
    return statement;
}

/**
 * Async Version von db.get
 * @param {String} sql SQL-Code
 * @param {[*] | *} args Argumente
 * @returns {Promise}
 */
muna.get = (sql, args) => {
    return new Promise((resolve, reject) => {
        muna.db.get(sql, args, (err, row) => {
            if(err){
                return resolve({err: err});
            }
            resolve(row);
        })
    })
}

/**
 * Rennt das Statement
 * @param {sqlite.Statement} statement SQL-Statement
 * @returns {Promise}
 */
muna.runPrepared = (statement) => {
    return new Promise((resolve, reject) => {
        statement.run((err) => {
            if(err){
                console.log(err);
                return resolve({err:err});
            }

            resolve();
        });
    });
}

/**
 * Überprüft auf Fehler und sendet 
 * @param {*} row Response der DB
 * @param {import("express").Response} res Express-Response
 * @param {* | undefined} msg Nachricht
 * @param {Number | undefined} code ResponseCode
 * @returns 
 */
muna.checkError = (row, res, msg, code = 500) => {
    msg = msg ?? row?.err ?? row?.[0]?.err;
    if(row?.err ?? false){
        console.log(row.err);
        res.status(code).send(msg);
        return true;
    }
    if(row?.[0]?.err ?? false){
        console.log(row.err);
        res.status(code).send(msg);
        return true;
    }
    return false;
}

module.exports = muna;