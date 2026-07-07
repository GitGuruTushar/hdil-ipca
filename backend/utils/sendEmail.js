const { Resend } = require('resend');

let resend = null;
const getClient = () => {
  if (!resend) {
    if (!process.env.RESEND_API_KEY) {
      throw new Error('RESEND_API_KEY is not set — cannot send email');
    }
    resend = new Resend(process.env.RESEND_API_KEY);
  }
  return resend;
};

// opts: { to, subject, html, text }
module.exports = async function sendEmail(opts) {
  const client = getClient();
  const from = process.env.EMAIL_FROM || 'HDIL-IPCA Federation <onboarding@resend.dev>';

  const { data, error } = await client.emails.send({
    from,
    to: opts.to,
    subject: opts.subject,
    html: opts.html,
    text: opts.text,
  });

  if (error) {
    throw new Error(`Email send failed: ${error.message || error}`);
  }

  return data;
};
