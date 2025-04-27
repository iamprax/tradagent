import axios from 'axios';

const API_BASE_URL = 'http://localhost:5001';

export const apiService = {
  getStatus: async () => {
    const { data } = await axios.get(`${API_BASE_URL}/status`);
    return data;
  },

  getMode: async () => {
    const { data } = await axios.get(`${API_BASE_URL}/mode`);
    return data;
  },

  setMode: async (mode: 'live' | 'paper') => {
    const { data } = await axios.post(`${API_BASE_URL}/mode`, { mode });
    return data;
  },

  getHistory: async () => {
    const { data } = await axios.get(`${API_BASE_URL}/history`);
    return data;
  },
};
