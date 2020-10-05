const fs = require('fs');
const Pop3Command = require('node-pop3');
const mailParser = require('mailparser');
const moment = require('moment');
const voca = require('voca');
const erixConf = require('./erixConf');

exports.erixMailChecker = class {

    constructor(log){

        this.log = log;

        this.sys = new erixConf.erixConf('mail', log);

        var option = {
            user: this.sys.conf.account.username,
            password: this.sys.conf.account.password,
            host: this.sys.conf.pop3Server.host,
            tls: this.sys.conf.pop3Server.tls,
            port : this.sys.conf.pop3Server.port
        };

        this.pop3 = new Pop3Command(option);
    }

    //Get mails in allow list
    async CheckMail(next) {
        try {
            var msgIDs = await this.pop3.UIDL();
            
            for(let u of msgIDs){
                
                //Compare with history to check if it's been processed
                
                
                //retr
                var msg = await this.pop3.RETR(u[0]);

                var mail = await mailParser.simpleParser(msg);

                //mail.from.value
                if(mail.from.value.length !== 1){
                    continue;
                }

                //Check if the from is in the white list
                var available = this.sys.conf.from.filter(function(f){
                    return f.toLowerCase() === mail.from.value[0].address.toLowerCase();
                });

                //not in allowed list, drop it
                //mail date greater than 1 day, drop it
                
                var gap = moment.duration(new Date() - mail.date, 'ms');

                var x = gap.asHours();

                if(available.length === 0 || gap.asHours() >= 240){
                    //DELETE
                    var res = await this.pop3.command('DELE', u[0]);
                    continue;
                }

                if(typeof next === 'function'){
                    var para = {
                        uid:u[1],
                        from:mail.from.value[0].address.toLowerCase(),
                        subject:mail.subject,
                        text:mail.text,
                        date: new Date(mail.date)
                    };
                    
                    var res = await next(para);

                    this.sys.conf.history.push(para);
                    this.sys.conf.saveConf();
                }
            }

            await this.pop3.QUIT();

            //Clear

        } catch (ex) {
            this.sys.saveLog(3,'failed when check mail:', ex.message);
        }
    };
};
