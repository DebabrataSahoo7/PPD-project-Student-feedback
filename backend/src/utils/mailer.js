import nodemailer from 'nodemailer';

let _transporter = null;

function getTransporter() {
  if (!_transporter) {
    _transporter = nodemailer.createTransport({
      host:   process.env.SMTP_HOST || 'smtp.gmail.com',
      port:   Number(process.env.SMTP_PORT) || 587,
      secure: false,
      connectionTimeout: 5000,
      greetingTimeout: 5000,
      socketTimeout: 5000,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }
  return _transporter;
}

export async function sendMail({ to, subject, html }) {
  // Placeholder local config should fail fast instead of hanging during smoke runs.
  if (
    !process.env.SMTP_USER ||
    !process.env.SMTP_PASS ||
    process.env.SMTP_USER === 'your_gmail@gmail.com' ||
    process.env.SMTP_PASS === 'your_app_password'
  ) {
    throw new Error('SMTP is not configured');
  }

  const transporter = getTransporter();
  return transporter.sendMail({
    from: process.env.SMTP_FROM || process.env.SMTP_USER,
    to,
    subject,
    html,
  });
}
