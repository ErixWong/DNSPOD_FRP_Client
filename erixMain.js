const moment = require("moment");
const erixDNSPod = require('./erixDNSPod');

var log = {
    path: './log/erixLog_' + moment().format('yyyyMMDD') + '_' + moment().format('HHmmss') + '.log',
    show: true
};

var working = false;

//Check && update IP Address

var dp = new erixDNSPod.erixDNSPod(log);

setInterval(async function () {

    if (working) { return false; }
    console.log('Begin');
    working = true;
    await dp.update();
    working = false;
    console.log('End');

}, dp.sys.conf.interval * 1000 * 60);


//Check mail
//Upload frp config

//Set a timmer to check mail
//if there's new mail with right subject but can't parse, send a how-to mail


