const { kc } = require('./kite');
const { saveOrder } = require('./db');
const { sendTelegramMessage } = require('./telegram');
const { stocks } = require('./config');

let liveBotStatus = {
  openPositions: {},
  lastPrices: {},
  mode: "paper", // Default
  trendingStocks: [],
};

function setMode(newMode) {
  liveBotStatus.mode = newMode;
}

function getMode() {
  return liveBotStatus.mode;
}

function getBotStatus() {
  const positions = {};
  for (const symbol in liveBotStatus.openPositions) {
    const pos = liveBotStatus.openPositions[symbol];
    positions[symbol] = {
      entryPrice: pos.entryPrice,
      dynamicStopLoss: pos.dynamicStopLoss,
      highestPrice: pos.highestPrice,
      stock: pos.stock,
    };
  }
  return {
    openPositions: positions,
    lastPrices: liveBotStatus.lastPrices,
    mode: liveBotStatus.mode,
    trendingStocks: liveBotStatus.trendingStocks,
  };
}

const priceMap = {};

async function placeOrder(type, stock, price = null) {
  try {
    if (liveBotStatus.mode === "paper") {
      console.log(`[PAPER] ${type} ${stock.symbol} x${stock.quantity}`);
      saveOrder({ type, symbol: stock.symbol, quantity: stock.quantity, time: new Date(), price, mode: "paper" });
      sendTelegramMessage(`(PAPER) ${type} Order: ${stock.symbol} x${stock.quantity}`);
      updatePositionMemory(type, stock, price);
      return;
    }

    const order = await kc.placeOrder("regular", {
      exchange: "NSE",
      tradingsymbol: stock.symbol,
      transaction_type: type,
      quantity: stock.quantity,
      product: "MIS",
      order_type: "MARKET",
      validity: "DAY"
    });

    console.log(`${type} Order placed for ${stock.symbol}:`, order);

    saveOrder({ type, symbol: stock.symbol, quantity: stock.quantity, time: new Date(), price });
    sendTelegramMessage(`✅ ${type} Order: ${stock.symbol} x${stock.quantity}`);

    updatePositionMemory(type, stock, price);

  } catch (error) {
    console.error(`Error placing ${type} order for ${stock.symbol}:`, error);
    sendTelegramMessage(`❌ Error placing ${type} order for ${stock.symbol}: ${error.message}`);
  }
}

function updatePositionMemory(type, stock, price) {
  if (type === "BUY" && price) {
    liveBotStatus.openPositions[stock.symbol] = {
      entryPrice: price,
      stock,
      highestPrice: price,
      dynamicStopLoss: price * (1 - stock.stopLossPercent / 100)
    };
  } else if (type === "SELL") {
    delete liveBotStatus.openPositions[stock.symbol];
  }
}

function calculateMA(prices, period) {
  if (prices.length < period) return null;
  const slice = prices.slice(prices.length - period);
  return slice.reduce((a, b) => a + b, 0) / period;
}

async function checkCrossover(price, stock) {
  if (!priceMap[stock.symbol]) priceMap[stock.symbol] = [];
  priceMap[stock.symbol].push(price);

  if (priceMap[stock.symbol].length > stock.longPeriod) {
    priceMap[stock.symbol].shift();
  }

  liveBotStatus.lastPrices[stock.symbol] = price;
  updateTrendingStocks();

  const shortMA = calculateMA(priceMap[stock.symbol], stock.shortPeriod);
  const longMA = calculateMA(priceMap[stock.symbol], stock.longPeriod);

  if (!shortMA || !longMA) return;

  if (shortMA > longMA && !liveBotStatus.openPositions[stock.symbol]) {
    await placeOrder("BUY", stock, price);
  }
}

async function monitorOpenPositions(currentPrice) {
  for (const symbol in liveBotStatus.openPositions) {
    const position = liveBotStatus.openPositions[symbol];
    const { entryPrice, stock, highestPrice, dynamicStopLoss } = position;

    if (currentPrice > highestPrice) {
      position.highestPrice = currentPrice;
      const newSL = currentPrice * (1 - stock.stopLossPercent / 100);
      if (newSL > position.dynamicStopLoss) {
        position.dynamicStopLoss = newSL;
      }
    }

    const profitLossPercent = ((currentPrice - entryPrice) / entryPrice) * 100;

    if (profitLossPercent >= stock.targetPercent) {
      console.log(`[${symbol}] Target reached. Exiting.`);
      await placeOrder("SELL", stock);
    } else if (currentPrice <= position.dynamicStopLoss) {
      console.log(`[${symbol}] Stop loss hit. Exiting.`);
      await placeOrder("SELL", stock);
    }
  }
}

function updateTrendingStocks() {
  const movements = [];
  for (const symbol in liveBotStatus.lastPrices) {
    const price = liveBotStatus.lastPrices[symbol];
    const basePrice = priceMap[symbol]?.[0] || price;
    const movePercent = ((price - basePrice) / basePrice) * 100;
    movements.push({ symbol, movePercent });
  }
  movements.sort((a, b) => Math.abs(b.movePercent) - Math.abs(a.movePercent));
  liveBotStatus.trendingStocks = movements.slice(0, 5);
}

module.exports = {
  checkCrossover,
  monitorOpenPositions,
  getBotStatus,
  setMode,
  getMode,
  liveBotStatus,
};
