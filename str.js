const fs = require('fs');
const moment = require('moment');

exports.trimLast = function (str) { return str.length > 1 ? str.substring(0, str.length - 1) : str; };

exports.beginWith = function (str, s) { return str.length < s.length ? false : str.substring(0, s.length) === s; }

exports.endWith = function (str, s) { return str.length < s.length ? false : str.substring(str.length - s.length) === s; }

exports.chopRest = function(str, delimiter){
    var chop = str.substring(0, str.indexOf(delimiter));
    var rest = str.substring(str.indexOf(delimiter)+1);
    return {chop, rest};
}

var ShowLog = false;
exports.setShowLog = function (flag) {
    ShowLog = flag;
}

exports.SaveLog = function (logPath, title, msg) {
    try {
        title = moment().format('HH:mm:ss') + "\t" + title;

        if (!fs.existsSync(logPath)) {
            fs.writeFileSync(logPath, moment().format('HH:mm:ss') + "\t" + "Begin Log\r\n");
        }

        fs.appendFileSync(logPath, title + '\r\n');
        if (msg) {
            fs.appendFileSync(logPath, JSON.stringify(msg, null, '\t') + '\r\n');
        }

        if (ShowLog) {
            console.log(title);
            if (msg) { console.log(JSON.stringify(msg, null, '\t')); }
        }
    }
    catch (ex) {
        console.log("Failed log file:" + JSON.stringify(ex, null, '\t'));
    }
};

exports.Nakeit = function (obj, path) {
    if(path.length === 0){return "";}
    try {
        path.split('/').forEach(l => obj = obj[l]);
        return obj;
    } catch (ex) {
        return ex.message ? ex.message : 'error catched!';
    }
}

exports.dig = function(line, type){
    var pattern = [
        /\((.+?)\)/g,
        /\[(.+?)\]/g,
        /\{(.+?)\}/g
    ];
    return line.match(pattern[type]);
}

exports.digOut = function(line, a, b){
    return line.substring(line.indexOf(a) + 1, line.lastIndexOf(b));
}