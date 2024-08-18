const nodemailer = require("nodemailer");

// configure nodemailer to use sendgrid
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.NODEMAILER_EMAIL,
    pass: process.env.NODEMAILER_PASSWORD,
  },
});

class EmailUtils {
  static sendMail(to, subject, html) {
    return transporter.sendMail({
      to: to,
      from: process.env.NODEMAILER_EMAIL,
      subject: subject,
      html: html,
    });
  }
}

module.exports = EmailUtils;
