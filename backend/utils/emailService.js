const { Resend } = require("resend");
require("dotenv").config();

const resend = new Resend(process.env.RESEND_API_KEY);

const sendEmail = async (to, subject, text, html = null) => {
    try {
        await resend.emails.send({
            from: process.env.FROM_EMAIL,
            to,
            subject,
            text,
            html: html || `<p>${text}</p>`
        });

        console.log(`Email sent successfully to ${to}`);
        return true;
    } catch (error) {
        console.error("Resend email error:", error);
        return false;
    }
};

module.exports = sendEmail;
