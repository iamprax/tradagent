'use client';

import { useState, useEffect } from 'react';
import { Line } from 'react-chartjs-2';
import { Chart as ChartJS, LineElement, PointElement, CategoryScale, LinearScale } from 'chart.js';
import { Toaster, toast } from 'react-hot-toast';
import { apiService } from './lib/apiService';

ChartJS.register(LineElement, PointElement, CategoryScale, LinearScale);

interface OpenPosition {
  entryPrice: number;
  dynamicStopLoss: number;
  highestPrice: number;
  stock: {
    token: string;
    symbol: string;
    shortPeriod: number;
    longPeriod: number;
    quantity: number;
    stopLossPercent: number;
    targetPercent: number;
  };
}

interface StatusData {
  openPositions: Record<string, OpenPosition>;
  lastPrices: Record<string, number>;
  mode: 'live' | 'paper';
  trendingStocks: { symbol: string; movePercent: number }[];
}

interface Order {
  symbol: string;
  type: string;
  quantity: number;
  price: number;
  time: string;
}

export default function Home() {
  const [status, setStatus] = useState<StatusData | null>(null);
  const [mode, setMode] = useState<'live' | 'paper'>('paper');
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [history, setHistory] = useState<Order[]>([]);

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const [statusData, modeData, historyData] = await Promise.all([
          apiService.getStatus(),
          apiService.getMode(),
          apiService.getHistory(),
        ]);

        setStatus(statusData);
        setMode(modeData.mode);
        setHistory(historyData.orders || []);
      } catch (error) {
        console.error('Error fetching data:', error);
        toast.error('Failed to fetch dashboard data!');
      }
    };

    fetchAll();
    const interval = setInterval(fetchAll, 5000);

    return () => clearInterval(interval);
  }, []);

  function calculatePnL(entryPrice: number, lastPrice: number) {
    return ((lastPrice - entryPrice) / entryPrice) * 100;
  }

  async function switchMode(newMode: 'live' | 'paper') {
    try {
      await apiService.setMode(newMode);
      setMode(newMode);
      toast.success(`Switched to ${newMode.toUpperCase()} mode!`);
    } catch (error) {
      console.error('Failed to switch mode:', error);
      toast.error('Failed to switch mode!');
    }
  }

  function toggleTheme() {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
    toast.success(`Switched to ${newTheme === 'dark' ? 'Dark Mode' : 'Light Mode'}`);
  }

  if (!status) return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100 dark:bg-gray-900">
      <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-blue-500 border-opacity-50"></div>
    </div>
  );

  return (
    <main className={`p-10 min-h-screen transition-all duration-500 ease-in-out ${theme === 'dark' ? 'bg-gray-900 text-white' : 'bg-gray-100 text-black'}`}>
      <Toaster position="bottom-center" reverseOrder={false} />

      <h1 className="text-2xl md:text-3xl font-bold mb-5">
        Trading Bot Dashboard
      </h1>

      <div className="flex gap-4 mb-6 flex-wrap">
        <button
          className={`p-2 px-4 rounded-xl ${mode === 'paper' ? 'bg-blue-400' : 'bg-gray-300'}`}
          onClick={() => switchMode('paper')}
        >
          Paper Mode
        </button>
        <button
          className={`p-2 px-4 rounded-xl ${mode === 'live' ? 'bg-green-400' : 'bg-gray-300'}`}
          onClick={() => switchMode('live')}
        >
          Live Mode
        </button>

        <button
          className={`p-2 px-4 rounded-xl flex items-center gap-2 ${theme === 'dark' ? 'bg-gray-800 text-white' : 'bg-gray-200 text-black'}`}
          onClick={toggleTheme}
        >
          {theme === 'dark' ? '☀️ Light Mode' : '🌙 Dark Mode'}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className={`${theme === 'dark' ? 'bg-gray-800' : 'bg-white'} p-5 rounded-xl shadow-md`}>
          <h2 className="text-xl font-semibold mb-3">Open Positions</h2>
          {Object.keys(status.openPositions).length === 0 ? (
            <p>No open positions.</p>
          ) : (
            <ul>
              {Object.entries(status.openPositions).map(([symbol, pos]) => {
                const lastPrice = status.lastPrices[symbol];
                const pnl = calculatePnL(pos.entryPrice, lastPrice);

                return (
                  <li key={symbol} className="mb-2">
                    {symbol} @ ₹{pos.entryPrice.toFixed(2)} (Now ₹{lastPrice?.toFixed(2) || '--'})
                    {" "}
                    <span className={pnl >= 0 ? "text-green-500" : "text-red-500"}>
                      {pnl.toFixed(2)}%
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className={`${theme === 'dark' ? 'bg-gray-800' : 'bg-white'} p-5 rounded-xl shadow-md`}>
          <h2 className="text-xl font-semibold mb-3">Last Prices</h2>
          <ul>
            {Object.entries(status.lastPrices).map(([symbol, price]) => (
              <li key={symbol}>
                {symbol}: ₹{price.toFixed(2)}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {status.trendingStocks && (
        <div className={`${theme === 'dark' ? 'bg-gray-800' : 'bg-white'} p-5 mt-10 rounded-xl shadow-md`}>
          <h2 className="text-xl font-semibold mb-3">Trending Stocks</h2>
          <ul>
            {status.trendingStocks.map(({ symbol, movePercent }) => (
              <li key={symbol}>
                {symbol}: <span className={movePercent >= 0 ? "text-green-500" : "text-red-500"}>
                  {movePercent.toFixed(2)}%
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {history.length > 0 && (
        <div className={`${theme === 'dark' ? 'bg-gray-800' : 'bg-white'} p-5 mt-10 rounded-xl shadow-md`}>
          <h2 className="text-xl font-semibold mb-3">Trade History</h2>
          <table className="table-auto w-full">
            <thead>
              <tr>
                <th className="p-2">Symbol</th>
                <th className="p-2">Type</th>
                <th className="p-2">Qty</th>
                <th className="p-2">Price</th>
                <th className="p-2">Time</th>
              </tr>
            </thead>
            <tbody>
              {history.slice(-20).reverse().map((order, index) => (
                <tr key={index} className="border-t">
                  <td className="p-2">{order.symbol}</td>
                  <td className="p-2">{order.type}</td>
                  <td className="p-2">{order.quantity}</td>
                  <td className="p-2">{order.price?.toFixed(2) || '--'}</td>
                  <td className="p-2">{new Date(order.time).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {status.lastPrices && (
        <div className={`${theme === 'dark' ? 'bg-gray-800' : 'bg-white'} p-5 mt-10 rounded-xl shadow-md`}>
          <h2 className="text-xl font-semibold mb-3">Live Prices Chart</h2>
          <div className="h-[400px]">
            <Line
              data={{
                labels: Object.keys(status.lastPrices),
                datasets: [
                  {
                    label: 'Price',
                    data: Object.values(status.lastPrices),
                    borderColor: theme === 'dark' ? 'lightblue' : 'blue',
                    backgroundColor: theme === 'dark' ? 'gray' : 'white',
                  },
                ],
              }}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: {
                    labels: {
                      color: theme === 'dark' ? 'white' : 'black',
                    }
                  }
                },
                scales: {
                  x: {
                    ticks: {
                      color: theme === 'dark' ? 'white' : 'black',
                    }
                  },
                  y: {
                    ticks: {
                      color: theme === 'dark' ? 'white' : 'black',
                    }
                  }
                }
              }}
            />
          </div>
        </div>
      )}
    </main>
  );
}
