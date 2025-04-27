require('dotenv').config();
const { KiteConnect, KiteTicker } = require('kiteconnect');

const kc = new KiteConnect({ api_key: process.env.API_KEY });
kc.setAccessToken(process.env.ACCESS_TOKEN);

const ticker = new KiteTicker({
  api_key: process.env.API_KEY,
  access_token: process.env.ACCESS_TOKEN,
});

module.exports = { kc, ticker };
