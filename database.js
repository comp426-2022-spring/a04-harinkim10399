"use strict";

const Database = require('better-sqlite3');

const db = new Database('log.db');

const stmt = db.prepare(`
    SELECT name FROM sqlite_master WHERE type='table' and name='accesslogs';`
    );
let row = stmt.get();
if (row === undefined) {
    console.log('Log database appears to be empty. I will initialize it now.')
    const sqlInit = `
        CREATE TABLE accesslogs ( id INTEGER PRIMARY KEY, 
            remote-addr VARCHAR, 
            remote-user VARCHAR, 
            datetime VARCHAR, 
            method VARCHAR, 
            url VARCHAR, 
            protocol TEXT
            http-version NUMERIC, 
            status INTEGER, 
            referer: TEXT,
            useragent: TEXT)`;
    db.exec(sqlInit)
    console.log('Your database has been initialized.')
} else {
    console.log('Database exists.')
}

module.exports = db