require('dotenv').config();
const { KiteConnect } = require('kiteconnect');
const fs = require('fs');

const apiKey = process.env.API_KEY;
const apiSecret = process.env.API_SECRET;

const kc = new KiteConnect({ api_key: apiKey });

async function refreshAccessToken() {
  const readline = require('readline').createInterface({
    input: process.stdin,
    output: process.stdout
  });

  readline.question('Enter request_token: ', async (requestToken) => {
    try {
      const session = await kc.generateSession(requestToken, apiSecret);
      console.log('Access Token:', session.access_token);

      let envFile = fs.readFileSync('.env', 'utf-8');
      envFile = envFile.replace(/ACCESS_TOKEN=.*/g, `ACCESS_TOKEN=${session.access_token}`);
      fs.writeFileSync('.env', envFile);

      console.log('✅ .env file updated successfully!');
    } catch (error) {
      console.error('Error refreshing access token:', error);
    }
    readline.close();
  });
}

refreshAccessToken();
