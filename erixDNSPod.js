const axios = require("axios");
const fs = require("fs");
const str = require("./str");

exports.erixDNSPod = function (logPath) {
    var me = {};

    me.logPath = logPath;

    me.init = function () {
        me.sys.loadConf();
    }

    me.sys = {
        conf: {},
        loadConf: function () {
            var rows = fs.readFileSync('./config.json');
            me.sys.conf = JSON.parse(rows);
        },
        saveConf: function () {
            fs.writeFileSync('./config.json', JSON.stringify(me.sys.conf, null, '\t'));
        }
    };

    me.getIp = async function () {
        try {
            //get current ip address
            var res = await axios.get('https://api.ipify.org?format=json');

            str.SaveLog(me.logPath, 'Get current IP address:\t' + res.data.ip);

            if (!me.sys.conf.currentIp || me.sys.conf.currentIp.ip !== res.data.ip) {
                me.sys.conf.currentIp = res.data;
                me.sys.conf.currentIp.lastUpdate = new Date();
                me.sys.saveConf();
                return { ok: true, expired: true };
            }

            me.sys.conf.currentIp.lastUpdate = new Date();
            me.sys.saveConf();

            return { ok: true, expired: false };
        } catch (ex) {
            str.SaveLog(me.logPath, 'error when getting ip address', ex.message);
            return { ok: false, message: ex.message };
        }
    }

    me.getAllDNSRecs = async function () {

        try {
            if (!me.sys.conf || !me.sys.conf.domains) {
                return false;
            }

            var ok = true;
            for (let d of me.sys.conf.domains) {
                for (let s of d.subs) {
                    var r = await me.getDNSRec(d, s);
                    if (!r.ok) {
                        console.log(r.message);
                        ok = false;
                    }
                }
            }

            if (ok) { me.sys.saveConf(); }
            return { ok: ok };
        }
        catch (ex) {
            str.SaveLog(me.logPath, 'Get All DNS Records error', ex.message);
            return { ok: false, message: ex.message };
        }
    }

    me.updateAllDNSRecs = async function () {
        try {
            if (!me.sys.conf || !me.sys.conf.domains) {
                return false;
            }

            var ok = true;
            for (let d of me.sys.conf.domains) {
                for (let s of d.subs) {
                    var r = await me.updateDNS(d, s);
                    if (!r.ok) {
                        console.log(r.message);
                        ok = false;
                    }
                }
            }

            return { ok: ok };
        }
        catch (ex) {
            str.SaveLog(me.logPath, 'Update All DNS Records error', ex.message);
            return { ok: false, message: ex.message };
        }
    }

    me.getDNSRec = async function (domain, sub) {
        try {
            var para = "login_token=" + me.sys.conf.id + ',' + me.sys.conf.token + "&format=json&domain=" + domain.name + '&sub_domain=' + sub.name;

            var res = await axios.post(me.sys.conf.baseUrl + 'Record.List', para, { headers: me.sys.conf.headers });

            if (res.data.status.code !== '1') {
                str.SaveLog(me.logPath, 'Update DNS Record error:', res.data.status);
                return { ok: false, message: res.data.status };
            }

            domain.id = res.data.domain.id;
            if (res.data.records.length === 1) {
                sub.id = res.data.records[0].id;
                sub.type = res.data.records[0].type;
                sub.line = res.data.records[0].line;
                sub.line_id = res.data.records[0].line_id;
            }
            return { ok: true };
        } catch (ex) {
            str.SaveLog(logPath, 'Error when get dns record:' + ex.message);
            return { ok: false, message: ex.message };
        }
    }

    me.updateDNS = async function (domain, sub) {
        try {
            var para = "login_token=" + me.sys.conf.id + ',' + me.sys.conf.token;
            para += "&format=json";
            para += "&domain_id=" + domain.id;
            para += "&record_id=" + sub.id;
            para += "&sub_domain=" + sub.name;
            para += "&record_type=" + sub.type;
            para += "&record_line_id=" + sub.line_id;
            para += "&value=" + me.sys.conf.currentIp.ip;

            var res = await axios.post(me.sys.conf.baseUrl + 'Record.Modify', para, { headers: me.sys.conf.headers });

            if (res.data.status.code !== '1') {
                str.SaveLog(me.logPath, 'Update DNS Record error:', res.data.status);
                return { ok: false, message: res.data.status };
            }

            return { ok: true };
        } catch (ex) {
            str.SaveLog(me.logPath, 'Update DNS record error', ex.message);
            return { ok: false, message: ex.message };
        }
    }

    me.setRemark = async function (domain, sub, remark) {
        try {
            var para = "login_token=" + me.sys.conf.id + ',' + me.sys.conf.token;
            para += "&format=json";
            para += "&domain_id=" + domain.id;
            para += "&record_id=" + sub.id;
            para += "&remark=" + remark;

            var res = await axios.post(me.sys.conf.baseUrl + 'Record.Modify', para, { headers: me.sys.conf.headers });

            if (res.data.status.code !== '1') {
                str.SaveLog(me.logPath, 'Update DNS Record error:', res.data.status);
                return { ok: false, message: res.data.status };
            }

            return { ok: true };
        } catch (ex) {
            return { ok: false, message: ex.message };
        }
    }

    me.run = async function () {
        if (!me.sys.conf.domains) {
            return false;
        }

        var res = await me.getAllDNSRecs();
        if (!res) { return res; }

        res = await me.getIp();
        if (!res.ok) { return res; }

        if (res.expired) {
            me.updateAllDNSRecs();
        }
        me.sys.loadConf();
    }

    me.init();
    return me;
}
