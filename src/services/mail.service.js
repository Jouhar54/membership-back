const transporter = require('../config/mail');

const sendPosterEmail = async (email, fullName, posterUrl) => {
  try {
    const mailOptions = {
      from: process.env.EMAIL_FROM || 'noreply@aalia.com',
      to: email,
      subject: 'Welcome to AALIA - Your Membership Poster',
      html: `
        <h3>Hi ${fullName},</h3>
        <p>Your membership has been approved! Welcome to AALIA.</p>
        <p>You can find your membership poster attached or view it using the link below:</p>
        <a href="${posterUrl}">View Poster</a>
      `,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('Email sent: ' + info.response);
    return true;
  } catch (error) {
    console.error('Error sending email:', error);
    return false; // don't fail the whole process if email fails, just log it
  }
};

module.exports = { sendPosterEmail };
