var express = require('express')
var app = express()
const fs = require('fs')
const morgan = require('morgan')
const logdb = require('./database.js')
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

const args = require('minimist')(process.argv.slice(2))
const port = args.port || args.p || process.env.PORT || 5000

const server = app.listen(port, () => {
    console.log("Server running on port %PORT%".replace("%PORT%", port))
});

const help = (`
server.js [options]
--port, -p	Set the port number for the server to listen on. Must be an integer
            between 1 and 65535.
--debug, -d If set to true, creates endlpoints /app/log/access/ which returns
            a JSON access log from the database and /app/error which throws 
            an error with the message "Error test successful." Defaults to 
            false.
--log		If set to false, no log files are written. Defaults to true.
            Logs are always written to database.
--help, -h	Return this message and exit.
`)
if (args.help || args.h) {
    console.log(help)
    process.exit(0)
}

if (args.log == 'false') {
    console.log("NOTICE: not creating file access.log")
} else {
    const accessLog = fs.createWriteStream('access.log', { flags: 'a' })
    app.use(morgan('combined', { stream: accessLog }))
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
    console.log(logdata)
    const stmt = logdb.prepare('INSERT INTO accesslog (remoteaddr, remoteuser, time, method, url, protocol, httpversion, status, referrer, useragent) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
    const info = stmt.run(logdata.remoteaddr, logdata.remoteuser, logdata.time, logdata.method, logdata.url, logdata.protocol, logdata.httpversion, logdata.status, logdata.referrer, logdata.useragent)
    next();
})

if (args.debug || args.d) {
    app.get('/app/log/access/', (req, res, next) => {
        const stmt = logdb.prepare("SELECT * FROM accesslog").all();
        res.status(200).json(stmt);
    })
    app.get('/app/error/', (req, res, next) => {
        throw new Error('Error test works.')
    })
}

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

app.get("/app/", (req, res, next) => {
    res.json({ "message": "Your API workd! (200)" })
    res.status(200);
});

app.get('/app/flip/', (req, res) => {
    const flip = coinFlip()
    res.status(200).json({ "flip": flip })
});

app.get('/app/flips/:number', (req, res) => {
    const flips = coinFlips(req.params.number)
    const count = countFlips(flips)
    res.status(200).json({ "raw": flips, "summary": count })
});

app.get('/app/flip/call/heads', (req, res) => {
    res.status(200).json(flipACoing('heads'))
})

app.get('/app/flip/call/tails', (req, res) => {
    res.status(200).json(flipACoin('tails'))
})



app.use(function (req, res) {
    const statusCode = 404
    const statusMessage = 'NOT FOUND'
    res.status(statusCode).end(statusCode + ' ' + statusMessage)
});


