const axios = require("axios");
const erixConf = require("./erixConf");

exports.erixDNSPod = class {

    constructor(log) {
        this.log = log;
        this.sys = new erixConf.erixConf('dnspod', log);
    }

    async getIp() {
        try {
            if (!this.sys.conf || !this.sys.conf.domains) {
                return { ok: false, message: 'Configure is not loaded.' };
            }

            //get current ip address
            var res = await axios.get('https://api.ipify.org?format=json');

            this.sys.saveLog(1, 'Get current IP address:\t' + res.data.ip);

            if (!this.sys.conf.currentIp || this.sys.conf.currentIp.ip !== res.data.ip) {
                this.sys.conf.currentIp = res.data;
                this.sys.conf.currentIp.lastUpdate = new Date();
                this.sys.saveConf();
                return { ok: true, expired: true };
            }

            this.sys.conf.currentIp.lastUpdate = new Date();
            this.sys.saveConf();

            return { ok: true, expired: false };
        } catch (ex) {
            this.sys.saveLog(3, 'error when getting ip address', ex.message);
            return { ok: false, message: ex.message };
        }
    }

    async getAllDNSRecs() {
        try {
            if (!this.sys.conf || !this.sys.conf.domains) {
                return { ok: false, message: 'Configure is not loaded.' };
            }

            var ok = true;
            for (let d of this.sys.conf.domains) {
                for (let s of d.subs) {
                    var r = await this.getDNSRec(d, s);
                    if (!r.ok) {
                        this.sys.saveLog(2, r.message);
                        ok = false;
                    }
                }
            }

            if (ok) { this.sys.saveConf(); }
            return { ok: ok };
        }
        catch (ex) {
            this.sys.saveLog(3, 'Get All DNS Records error', ex.message);
            return { ok: false, message: ex.message };
        }
    }

    async updateAllDNSRecs() {
        try {
            if (!this.sys.conf || !this.sys.conf.domains) {
                return { ok: false, message: 'Configure is not loaded.' };
            }

            var ok = true;
            for (let d of this.sys.conf.domains) {
                for (let s of d.subs) {
                    var r = await this.updateDNS(d, s);
                    if (!r.ok) { ok = false; }
                }
            }

            return { ok: ok };
        }
        catch (ex) {
            this.sys.saveLog(3, 'Update All DNS Records error', ex.message);
            return { ok: false, message: ex.message };
        }
    }

    async getDNSRec(domain, sub) {
        try {
            var para = "login_token=" + this.sys.conf.id + ',' + this.sys.conf.token + "&format=json&domain=" + domain.name + '&sub_domain=' + sub.name;

            var res = await axios.post(this.sys.conf.baseUrl + 'Record.List', para, { headers: this.sys.conf.headers });

            if (res.data.status.code !== '1') {
                this.sys.saveLog(3, 'Get DNS Record error:' + sub.name + '.' + domain.name, res.data.status);
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
            this.sys.saveLog(3, 'Error when get dns record:' + ex.message, {domain:domain, sub:sub});
            return { ok: false, message: ex.message };
        }
    }

    async updateDNS(domain, sub) {
        try {
            var para = "login_token=" + this.sys.conf.id + ',' + this.sys.conf.token;
            para += "&format=json";
            para += "&domain_id=" + domain.id;
            para += "&record_id=" + sub.id;
            para += "&sub_domain=" + sub.name;
            para += "&record_type=" + sub.type;
            para += "&record_line_id=" + sub.line_id;
            para += "&value=" + this.sys.conf.currentIp.ip;

            var res = await axios.post(this.sys.conf.baseUrl + 'Record.Modify', para, { headers: this.sys.conf.headers });

            if (res.data.status.code !== '1') {
                this.sys.saveLog(3, 'Failed update DNS Record:' + sub.name + '.' + domain.name, res.data.status);
                return { ok: false, message: res.data.status };
            }

            this.sys.saveLog(1, 'Successed update DNS record:' + sub.name + '.' + domain.name);
            return { ok: true };
        } catch (ex) {
            this.sys.saveLog(3, 'Update DNS record error:' + ex.message, { domain: domain, sub: sub });
            return { ok: false, message: ex.message };
        }
    }

    async setRemark(domain, sub, remark) {
        try {
            var para = "login_token=" + this.sys.conf.id + ',' + this.sys.conf.token;
            para += "&format=json";
            para += "&domain_id=" + domain.id;
            para += "&record_id=" + sub.id;
            para += "&remark=" + remark;

            var res = await axios.post(this.sys.conf.baseUrl + 'Record.Modify', para, { headers: this.sys.conf.headers });

            if (res.data.status.code !== '1') {
                this.sys.saveLog(3, 'Update DNS Record error:', res.data.status);
                return { ok: false, message: res.data.status };
            }

            this.sys.saveLog(1, 'Successed update remark of domain:' + sub.name + '.' + domain.name);

            return { ok: true };
        } catch (ex) {
            this.sys.saveLog(3, 'Set remark failed:' + ex.message,{ domain: domain, sub: sub });
            return { ok: false, message: ex.message };
        }
    }

    async update() {
        if (!this.sys.conf || !this.sys.conf.domains) {
            return { ok: false, message: 'Configure is not loaded.' };
        }

        var res = await this.getAllDNSRecs();
        if (!res) { return res; }

        res = await this.getIp();
        if (!res.ok) { return res; }

        if (res.expired) {
            this.updateAllDNSRecs();
        }
        this.sys.loadConf();
    }
}
