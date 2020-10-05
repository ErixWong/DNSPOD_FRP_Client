const fs = require('fs');
const moment = require('moment');

exports.erixConf = class {

    constructor(type, log) {

        if (!fs.existsSync('./log')) {
            fs.mkdirSync('./log');
        }

        this.cfgPath = './cfg.' + type + '.json';

        this.loadConf();
        this.log = log;
    }

    loadConf() {
        try {
            var rows = fs.readFileSync(this.cfgPath);
            this.conf = JSON.parse(rows);
        } catch (ex) {
            this.saveLog(3, 'Failed read config file ' + this.cfgPath + ':' + ex.message);
        }
    }

    saveConf() {
        try {
            fs.writeFileSync(this.cfgPath, JSON.stringify(this.conf, null, '\t'));
        }
        catch (ex) {
           this.saveLog(3, 'Failed write config file ' + this.cfgPath + ':' + ex.message);
        }
    }

    saveLog(level, title, msg) {
        //3:error, 2:warning, 1: notice
        try {
            var datePart = moment().format('yyyy-MM-DD') + ' ' +  moment().format('HH:mm:ss')
            title = datePart + "\t" + title;
    
            if (!fs.existsSync(this.log.path)) {
                fs.writeFileSync(this.log.path, datePart + "\t" + "Begin Log\r\n");
            }
    
            fs.appendFileSync(this.log.path, title + '\r\n');
            if (msg) {
                fs.appendFileSync(this.log.path, JSON.stringify(msg, null, '\t') + '\r\n');
            }
    
            if (this.log.show) {
                console.log(title);
                if (msg) { console.log(JSON.stringify(msg, null, '\t')); }
            }
        }
        catch (ex) {
            console.log("Failed log file:" + ex.message);
        }
    };
}
