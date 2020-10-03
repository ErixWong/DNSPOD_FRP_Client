const moment = require("moment");

var logPath = './log/erixLog_'+moment().format('yyyyMMDD') + '_' + moment().format('HHmmss')+'.log';
var dp = require('./erixDNSPod').erixDNSPod(logPath);

//Check && update IP Address
//Check mail
//Upload frp config

setInterval(dp.run, dp.sys.conf.interval * 1000 * 60);
