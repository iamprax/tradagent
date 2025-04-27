const fs = require('fs-extra');
const path = require('path');

const dbPath = path.join(__dirname, 'orders.json');

function saveOrder(order) {
  let data = [];

  // Check if file exists, else create an empty file
  if (!fs.existsSync(dbPath)) {
    fs.writeFileSync(dbPath, JSON.stringify([], null, 2));
  }

  try {
    data = JSON.parse(fs.readFileSync(dbPath, 'utf-8'));
  } catch (error) {
    console.error("Error reading orders.json:", error);
    // Reset corrupted file
    data = [];
  }

  data.push(order);

  try {
    fs.writeFileSync(dbPath, JSON.stringify(data, null, 2));
  } catch (error) {
    console.error("Error writing orders.json:", error);
  }
}

module.exports = { saveOrder };
