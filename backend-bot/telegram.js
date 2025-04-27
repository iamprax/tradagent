require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');

let bot = null;

if (process.env.TELEGRAM_BOT_TOKEN) {
  bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, { polling: false });
}

function sendTelegramMessage(message) {
  if (!bot || !process.env.TELEGRAM_CHAT_ID) {
    console.warn('Telegram bot not configured properly. Skipping message.');
    return;
  }

  bot.sendMessage(process.env.TELEGRAM_CHAT_ID, message).catch((err) => {
    console.error('Failed to send Telegram message:', err.message);
  });
}

module.exports = { sendTelegramMessage };
