const fetch     = require('node-fetch'),
readlineSync    = require('readline-sync'),
colors          = require('colors'),
fs              = require('fs-extra'),
uuidv4          = require('uuid/v4'),
uuid            = uuidv4();

const genUniqueId = length => new Promise((resolve) => {
    var text = "";
    var possible = "abcdefghijklmnopqrstuvwxyz1234567890";
    for (var i = 0; i < length; i++) 
        text += possible.charAt(Math.floor(Math.random() * possible.length));
    resolve(text);
});

const reqLoginApp = (uuid, uniqueid, askNoHP) => new Promise((resolve, reject) => {
    var url     = 'https://api.gojekapi.com/v4/customers/login_with_phone';
    var header  = {
        'X-Session-ID': uuid,
        'X-Platform': 'Android',
        'X-UniqueId': uniqueid,
        'X-AppVersion': '3.37.2',
        'X-AppId': 'com.gojek.apq',
        'Accept': 'application/json',
        'X-PhoneModel': 'Android,Custom',
        'X-PushTokenType': 'FCM',
        'X-DeviceOS': 'Android,6.0',
        'Authorization': 'Bearer',
        'Accept-Language': 'en-ID',
        'X-User-Locale': 'en_ID',
        'Content-Type': 'application/json; charset=UTF-8',
        'User-Agent': 'okhttp/3.12.1'
    };
    var body    = {"phone": `+${askNoHP}`};
    fetch(url, {
        method: 'POST',
        headers: header,
        body: JSON.stringify(body)
    })
    .then(res => res.json())
    .then(result => resolve(result))
    .catch(err => reject(err))
});

const reqVerifyOTP = (uuid, uniqueid, askOTP, tokenOTP) => new Promise((resolve, reject) => {
    var url     = 'https://api.gojekapi.com/v4/customers/login/verify';
    var header  = {
        'X-Session-ID': uuid,
        'X-Platform': 'Android',
        'X-UniqueId': uniqueid,
        'X-AppVersion': '3.37.2',
        'X-AppId': 'com.gojek.apq',
        'Accept': 'application/json',
        'X-PhoneModel': 'Android,Custom',
        'X-PushTokenType': 'FCM',
        'X-DeviceOS': 'Android,6.0',
        'Authorization': 'Bearer',
        'Accept-Language': 'en-ID',
        'X-User-Locale': 'en_ID',
        'Content-Type': 'application/json; charset=UTF-8',
        'User-Agent': 'okhttp/3.12.1'
    };
    var body    = {"client_name": "gojek:cons:android","client_secret": '83415d06-ec4e-11e6-a41b-6c40088ab51e',"data": {"otp": askOTP, "otp_token": tokenOTP},"grant_type": "otp","scopes": "gojek:customer:transaction gojek:customer:readonly"};
    fetch(url, {
        method: 'POST',
        headers: header,
        body: JSON.stringify(body)
    })
    .then(res => res.json())
    .then(result => resolve(result))
    .catch(err => reject(err))
});

const reqPaymentHistory = (uuid, uniqueid, access_token, userid) => new Promise((resolve, reject) => {
    var url     = 'https://api.gojekapi.com/wallet/history?page=1&limit=9999999';
    var header  = {
        'X-Session-ID': uuid,
        'X-Platform': 'Android',
        'X-UniqueId': uniqueid,
        'Authorization': 'Bearer '+access_token,
        'User-uuid': userid,
        'X-AppVersion': '3.37.2',
        'X-AppId': 'com.gojek.apq',
        'Accept': 'application/json',
        'X-PhoneModel': 'Android,Custom',
        'X-PushTokenType': 'FCM',
        'Accept-Language': 'en-ID',
        'X-User-Locale': 'en_ID',
        'Content-Type': 'application/json; charset=UTF-8',
        'User-Agent': 'okhttp/3.12.1',
    };
    fetch(url, {
        method: 'GET',
        headers: header,
    })
    .then(res => res.json())
    .then(result => resolve(result))
    .catch(err => reject(err))
});

(async () => {
    try {
        var uniqueid = await genUniqueId(16);
        //-- Login into Application
        var askNoHP  = await readlineSync.question('[?] Masukan No HP (62xxx): ');
        var logGojek = await reqLoginApp(uuid, uniqueid, askNoHP);
        if (logGojek.success === false) { console.log(logGojek.errors[0].message.red+'\n') } else {
            console.log(logGojek.data.message.green+'\n');
            //-- Verify OTP Code
            var tokenOTP  = logGojek.data.login_token;
            var askOTP    = await readlineSync.question('[?] Kode OTP: ');
            var verOTP    = await reqVerifyOTP(uuid, uniqueid, askOTP, tokenOTP);
            if (verOTP.success === false) { console.log(verOTP.errors[0].message.red+'\n') } else {
                console.log('You have been logged in Application'.green+'\n');
                //-- Get Payment History
                var askFilename  = await readlineSync.question('[?] Nama File Output History Payment: ');
                var access_token = verOTP.data.access_token;
                var userid       = verOTP.data.customer.id;
                var getHistory   = await reqPaymentHistory(uuid, uniqueid, access_token, userid);
                if (getHistory.success === false) { console.log(getHistory.errors[0].message.red+'\n') } else {
                    //-- Return Result & Save <3
                    var dataHistory  = getHistory.data.success;
                    dataHistory.forEach(async function (data) {
                        var harga    = data.amount;
                        var currency = data.currency;
                        var desc     = data.description;
                        var tgltrans = data.transacted_at;
                        var output   = `[${tgltrans}] ${currency} ${harga} - ${desc}\n`;
                        await fs.appendFile(askFilename, output+'\n', err => {
                            if (err) throw err;
                        });
                    });
                    console.log('[>] History payment telah disimpan pada file '+askFilename.green);
                };
            };
        };
    } catch (e) {
        console.log(e)
    }
})();