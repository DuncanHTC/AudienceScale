const express = require('express');
const https = require('https');
const request = require('request');
const querystring = require('querystring');

const app = express();

var testvar = 'testvar';
var token = {};

app.listen(4300, () => {
    console.log('Server server listening on port 4300');
});

app.use(function(req, res, next) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    next();
});

app.route('/api/test').get((req,res) => {
    console.log('API TEST');
    res.send('API TEST');
});

app.route('/api/test-setup/:var').get((req,res) => {
    testvar = req.params['var'];
    res.send('testvar set to: ' + testvar);
});

app.route('/api/test-setup').get((req,res) => {
    res.send('testvar is ' + testvar);
});

/**
 * Get the OAuth Token from the platform API
 */
app.route('/api/token/:platform').get((req, res) => {
    console.log('/api/token/:platform');
    const platform = req.params['platform'];    
    if (platform === 'aam' || platform === 'adobe') {
        console.log('/api/token/aam');
        const clientID = 'traderca-baaam';
        const secretKey = '1n7uvhtl5r2vhhuj402h5tdpt8gt19dvs4mj93daudholqkj0g94';
        var t = Buffer.from(clientID + ':' + secretKey).toString("base64");
        
        var options = {
            url: 'https://api.demdex.com/oauth/token',            
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Authorization': 'Basic ' + t
            },
            body: querystring.stringify({
                grant_type: 'password',
                username: 'Audience Data',
                password: 'aamAudDa!123'
            })
        }
        request.post(options, function(error, response, body) {
            if (!error && response.statusCode < 400) {                
                token.aam = JSON.parse(body);
                res.send(token);
            }
        });
    } else if (platform === 'lotame') {
        console.log('/api/token/lotame');
        options = {
            url: 'https://crowdcontrol.lotame.com/auth/v1/tickets',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: querystring.stringify({
                username: 'audiencedata@trader.ca',
                password: 'Audience123!'
            })
        }
        request.post(options, function(error, response, body) {
            if (!error && response.statusCode < 400) {
                token.lotame = { 'TGT': response.headers.location };
                res.send(token);
            }
        });
    }
});

/**
 * Segments
 */
app.route('/api/segments/reports/largest-segments').get((req, res, next) => {
    const ltoken = token.aam['access_token'];
    res.send('token: ' + ltoken);
    const options = {
        host: 'api.demdex.com',
        path: '/v1/reports/largest-segments?interval=7D',
        method: 'GET',
        
        headers: {
            'Accept': 'application/json',
            'Authorization': 'Bearer ' + ltoken
        }
    }
    var respBody;
    //making the https get call
    var getReq = https.request(options, function(getRes) {
        console.log("\nstatus code: ", getRes.statusCode);
        getRes.on('data', function(data) {
            respBody = data.toString('utf8');
        });
    });
 
    //end the request
    getReq.end(() => {
        res.send(respBody);
    });
    getReq.on('error', function(err){
        console.log("Error: ", err);
    }); 
    next();
});

app.route('/api/segments').get((req, res, next) => {console.log(token);
    const ltoken = token.aam['access_token'];
    const options = {
        url: 'https://api.demdex.com/v1/segments/?includeMetrics=true&status=ACTIVE',
        'auth': {
            'bearer': ltoken
        },
        json: true
    }

    request(options, function(error, response, body) {
        res.send(body);
    });
});

app.route('/api/audience/metrics').get((req, res, next) => {
    const options = {
        url: 'https://api.lotame.com/2/statistics/audiences?date_range=YESTERDAY&universe_id=1&device_graph=true',
        json: true
    }
    getLotameServiceTicket(options.url, function(ticket) {
        options.url = options.url + '&ticket=' + ticket;console.log('/api/audience/metrics:', options);
        request.get(options, function(error, response, body) {
            if (!error && response.statusCode < 400) {console.log(body);
                res.send(body);
            }           
        });
    });
});

function getLotameServiceTicket(requestLocation, callback) {
    const options = {
        url: token.lotame.TGT,
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: querystring.stringify({
            service: requestLocation
        })
    }
    request.post(options, function(error, response, body) {
        console.log('getLotameServiceTicket:',body);
        if (!error && response.statusCode < 400) {
            callback(body);
        }
    });    
}