require('dotenv').config();
const nodemailer = require('nodemailer');
const fs = require('fs-extra');
const path = require('path');

async function sendDailyReport() {
  const orders = JSON.parse(fs.readFileSync(path.join(__dirname, 'orders.json'), 'utf-8'));

  const htmlContent = `
    <h2>Daily Trading Summary</h2>
    <table border="1" cellpadding="5" cellspacing="0">
      <tr>
        <th>Symbol</th>
        <th>Type</th>
        <th>Qty</th>
        <th>Price</th>
        <th>Time</th>
      </tr>
      ${orders.slice(-20).map(order => `
        <tr>
          <td>${order.symbol}</td>
          <td>${order.type}</td>
          <td>${order.quantity}</td>
          <td>${order.price?.toFixed(2) || '--'}</td>
          <td>${new Date(order.time).toLocaleString()}</td>
        </tr>
      `).join('')}
    </table>
  `;

  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });

  await transporter.sendMail({
    from: process.env.EMAIL_USER,
    to: process.env.EMAIL_USER,
    subject: "Daily Trading Bot Report",
    html: htmlContent,
  });

  console.log("✅ Daily Email Report Sent");
}

module.exports = { sendDailyReport };
