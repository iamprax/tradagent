const { ticker } = require('./kite');
const { stocks } = require('./config');
const { checkCrossover, monitorOpenPositions } = require('./strategy');

const tokenSymbolMap = {};

stocks.forEach(stock => {
  tokenSymbolMap[stock.token] = stock;
});

// Connect to Kite Ticker
ticker.connect();

ticker.on("connect", () => {
  console.log("✅ Connected to Zerodha Ticker.");
  
  // Subscribe to required tokens
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

ticker.on("error", (error) => {
  console.error("❌ Ticker Error:", error);
});

ticker.on("close", () => {
  console.warn("⚠️ Ticker Connection Closed. Trying to reconnect...");
});
