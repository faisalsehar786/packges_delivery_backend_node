const nodemailer = require('nodemailer')
const sgMail = require('@sendgrid/mail')

const sgMailApiKey = process.env.SENDGRID_API_KEY
sgMail.setApiKey(sgMailApiKey)

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: process.env.EMAIL_PORT,
  secure: false, // true for 465, false for other ports
  auth: {
    user: process.env.EMAIL_USER, // Admin Gmail ID
    pass: process.env.EMAIL_PASS, // Admin Gmail Password
  },
})

// send email using nodemailer
exports.send = (from, to, subject, html) =>
  // send mail with defined transport object
  // visit https://nodemailer.com/ for more options
  transporter.sendMail({
    from, // sender address e.g. no-reply@xyz.com or "Fred Foo 👻" <foo@example.com>
    to, // list of receivers e.g. bar@example.com, baz@example.com
    subject, // Subject line e.g. 'Hello ✔'
    // text: text, // plain text body e.g. Hello world?
    html, // html body e.g. '<b>Hello world?</b>'
  })

// <p>Hello ${fullName}, <br> Welocome to TagTap AR Application. <br>Your new password is: <b>${password}</b></p>
// send email using sendgrid
module.exports.sendEmail =async (toEmail, emailSubject, emailBody) => {
  await new Promise((resolve, reject) => {
    transporter.sendMail({
      to: toEmail,
      from: { name: 'HYHM', email: 'tech@hmhy.no' },
      subject: emailSubject,
      text: emailBody,
      html: `<img src="https://hyhm.netlify.app/media/logos/SlogoNew.jpg" alt="HYhm" width="50" height="50"> <br><br> ${emailBody}`,
    }, function (err) {
      if (!err) {
        resolve('Email sent!');
      } else {
        reject(err);
      }
    });  
  });
  // transporter
  //   .sendMail({
  //     to: toEmail,
  //     from: { name: 'HYHM', email: 'tech@hmhy.no' },
  //     subject: emailSubject,
  //     text: emailBody,
  //     html: `<img src="https://hyhm.netlify.app/media/logos/SlogoNew.jpg" alt="HYhm" width="50" height="50"> <br><br> ${emailBody}`,
  //   })
    // .then(
    //   () => {},
    //   (error) => {
    //     console.error(error)

    //     if (error.response) {
    //       console.error(error.response.body)
    //     }
    //   }
    // )
}

// send email with sendgrid dynamic template
module.exports.sendTemplate = (to, from, templateId, dynamic_template_data) => {
  const msg = {
    to,
    from: { name: 'HYhm', email: from },
    templateId,
    dynamic_template_data,
  }
  console.log(msg)
  sgMail
    .send(msg)
    .then((response) => {
      console.log('mail-sent-successfully', {
        templateId,
        dynamic_template_data,
      })
      console.log('response', response)
      /* assume success */
    })
    .catch((error) => {
      /* log friendly error */
      console.error('send-grid-error: ', error.toString())
    })
}
