const config = require("./config.js").load();
const nodemailer = require('nodemailer');

// create reusable transporter object using the default SMTP transport
let transporter = nodemailer.createTransport(config.mailserver);


module.exports = {
    sendEmail: function (emailTo, subject, message, attachedFile, callback) {

        // setup email data with unicode symbols
        let mailOptions = {
            from: config.mailserver.defaultFrom, // sender address
            to: emailTo, // list of receivers
            subject: subject, // Subject line
            text: '', // plain text body
            html: message, // html body
            attachments: []
        };
        
        if(attachedFile) {
            mailOptions.attachments.push(
                {   // stream as an attachment
                    filename: 'contratto.pdf',
                    content: fs.createReadStream(attachedFile)
                });
        }

        transporter.sendMail(mailOptions, (error, info) => {
            if (error) {
                callback({status: "error", msg: "Errore invio email", results: {}})
            }
            else
                callback({status: "OK", msg: "Email inviata", results : {infoEmail: info}})   
        });
    }

}
