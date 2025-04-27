require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { ticker } = require('./kite');
const { stocks } = require('./config');
const { checkCrossover, monitorOpenPositions, getBotStatus, setMode, getMode } = require('./strategy');
const { sendTelegramMessage } = require('./telegram');
const fs = require('fs-extra');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());

const tokenSymbolMap = {};

stocks.forEach(stock => {
  tokenSymbolMap[stock.token] = stock;
});

ticker.connect();
ticker.on("connect", () => {
  console.log("Connected to Kite ticker");
  const tokens = stocks.map(stock => stock.token);
  ticker.subscribe(tokens);
});

ticker.on("ticks", (ticks) => {
  ticks.forEach(tick => {
    const stock = tokenSymbolMap[tick.instrument_token];
    if (stock) {
      const price = tick.last_price;
      checkCrossover(price, stock);
      monitorOpenPositions(price);
    }
  });
});

app.get('/status', (req, res) => {
  res.json(getBotStatus());
});

app.post('/mode', (req, res) => {
  const { mode } = req.body;
  if (mode === "live" || mode === "paper") {
    setMode(mode);
    sendTelegramMessage(`⚡ Mode switched to: ${mode.toUpperCase()} MODE`);
    res.json({ success: true, mode });
  } else {
    res.status(400).json({ success: false });
  }
});

app.get('/mode', (req, res) => {
  res.json({ mode: getMode() });
});

app.get('/history', (req, res) => {
  const ordersPath = path.join(__dirname, 'orders.json');

  if (!fs.existsSync(ordersPath)) {
    return res.json({ orders: [] });
  }

  try {
    const orders = JSON.parse(fs.readFileSync(ordersPath, 'utf-8'));
    res.json({ orders });
  } catch (error) {
    console.error("Error parsing orders.json:", error);
    res.status(500).json({ error: "Error fetching history" });
  }
});


const PORT = process.env.PORT || 5001;

const server = app.listen(PORT, () => {
  console.log(`Server started on port ${PORT}`);
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`Port ${PORT} is already in use. Exiting.`);
    process.exit(1);
  } else {
    throw err;
  }
});
