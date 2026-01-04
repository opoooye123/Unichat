// utils/emailService.js
const { Resend } = require("resend");
require("dotenv").config();

const resend = new Resend(process.env.RESEND_API_KEY);

const sendEmail = async (to, subject, text, html = null) => {
  try {
    if (!process.env.RESEND_API_KEY) {
      throw new Error('RESEND_API_KEY not set in env');
    }
    if (!process.env.FROM_EMAIL) {
      throw new Error('FROM_EMAIL not set in env');
    }

    console.log(`Attempting to send email to ${to} with subject: ${subject}`);

    const { data, error } = await resend.emails.send({
      from: process.env.FROM_EMAIL,
      to,
      subject,
      text,
      html: html || `<p>${text}</p>`
    });

    if (error) throw error;

    console.log(`Email sent successfully to ${to}:`, data);
    return true;
  } catch (err) {
    console.error("Resend email error:", err && err.message ? err.message : err);
    return false;
  }
};

module.exports = sendEmail;
