const http = require("http");

// Require Express.js
const express = require('express');
const app = express();
app.use(express.urlencoded({extended: true}))
app.use(express.json)
const db = require('./database.js')
const md5 = require("md5")
const morgan = require('morgan')
const fs = require('fs');
const { argv } = require("process");

// Require minimist module
const args = require('minimist')(process.argv.slice(2));
args['port'];
const port = args.port || process.env.PORT || 5555;

args['debug']
const debug = args.debug || 'false'

args['log']
const log = args.log || 'true'

// See what is stored in the object produced by minimist
console.log(args)
// Store help text 
const help = (`
server.js [options]
  --port		    Set the port number for the server to listen on. Must be an integer
              	between 1 and 65535.

  --debug	    If set to true, creates endpoints /app/log/access/ which returns
              	a JSON access log from the database and /app/error which throws 
              	an error with the message "Error test successful." Defaults to 
                false.

  --log		    If set to false, no log files are written. Defaults to true.
		        Logs are always written to database.

  --help	    Return this message and exit.
`)

// If --help or -h, echo help text to STDOUT and exit
if (args.help || args.h) {
    console.log(help)
    process.exit(0)
}

args['help']

// Start an app server
const server = app.listen(port, () => {
    console.log('App listening on port %PORT%'.replace('%PORT%', port))
});

if (argv.log != "false" && argv.log != false) {
    // Use morgan for logging to files
    // Create a write stream to append (flags: 'a') to a file
    const writeStream = fs.createWriteStream('access.log', { flags: 'a' })
    // Set up the access logging middleware
    app.use(morgan('combined', { stream: writeStream }))
}

app.use((req, res, next) => {
    let logdata = {
        remoteaddr: req.ip,
        remoteuser: req.user,
        time: Date.now(),
        method: req.method,
        url: req.url,
        protocol: req.protocol,
        httpversion: req.httpVersion,
        status: res.statusCode,
        referer: req.headers['referer'],
        useragent: req.headers['user-agent']
    }
    const stmt = db.prepare(`INSERT INTO accesslog (remoteaddr, remoteuser, time method, url, protocol, httpversion, secure, status, referer, useragent)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`)
    const info = stmt.run(logdata.remoteaddr, logdata.remoteuser, logdata.time, logdata.method, logdata.url, logdata.protocol, logdata.httpversion, logdata.secure, logdata.status, logdata.referer, logdata.useragent)
    next();
})

if (argv.debug == "true" || argv.debug == true) {
    app.get("/app/log/access", (req, res) => {
        try {
            const stmt = db.prepare('SELECT * FROM accesslogs').all()
            res.status(200).json(stmt)
        } catch(er) {
            console.error(e)
        }
    });
    app.get('/app/error', (req, res) => {
        res.status(500);
        throw new Erro('Error test successful.')
    })
}

app.get('/app/', (req, res) => {
    res.status(200).end("OK");
    res.type("text/plain");
});

app.get('/app/', (req, res) => {
    const statusCode = 200
    const statusMessage = 'OK'
    res.status(statusCode).end(statusCode + ' ' + statusMessage)
});

app.get('/app/flip', (req, res) => {
    res.status(200).json({
        "flip": coinFlip()
    });
});

app.get('/app/flips/:number', (req, res) => {
    const raw = coinFlips(req.params.number);
    const summary = countFlips(raw);
    res.status(200).json({
        "raw": raw,
        "summary": summary
    });
});

app.get('/app/flip/call/:call', (req, res) => {
    res.status(200).json(flipACoin(req.params.call))
});


// Default response for any other request
app.use(function (req, res) {
    res.status(404).send('404 NOT FOUND')
});

// Coin functions from a02
function coinFlip() {
    let result = Math.random();
    if (result < 0.5) {
        result = "heads";
    } else {
        result = "tails";
    }
    return result;
}

function coinFlips(flips) {
    let array = [];
    for (let i = 0; i < flips; i++) {
        array.push(coinFlip());
    }
    return array;
}

function countFlips(array) {
    const result = { heads: 0, tails: 0 };
    for (let i = 0; i < array.length; i++) {
        if (array[i] == "heads") {
            result.heads++;
        } else {
            result.tails++;
        }
    }
    return result;
}

function flipACoin(call) {
    const result = { call: call, flip: coinFlip(), result: "" };
    if (result.call == result.flip) {
        result.result = "win";
    } else {
        result.result = "lose";
    }
    return result;
}