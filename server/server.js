const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 3000;
const DATA_FILE = path.join(__dirname, 'data', 'orders.json');

app.use(cors());
app.use(bodyParser.json());

// Helper to read orders
const readOrders = () => {
    try {
        if (!fs.existsSync(DATA_FILE)) {
            return [];
        }
        const data = fs.readFileSync(DATA_FILE, 'utf8');
        return JSON.parse(data);
    } catch (err) {
        console.error('Error reading orders file:', err);
        return [];
    }
};

// Helper to write orders
const writeOrders = (orders) => {
    try {
        fs.writeFileSync(DATA_FILE, JSON.stringify(orders, null, 2));
        return true;
    } catch (err) {
        console.error('Error writing orders file:', err);
        return false;
    }
};

// GET /api/orders - List all orders (for verified checking)
app.get('/api/orders', (req, res) => {
    const orders = readOrders();
    res.json(orders);
});

// POST /api/orders - Create a new order
app.post('/api/orders', (req, res) => {
    const { items, total } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ error: 'Cart is empty or invalid format.' });
    }

    const newOrder = {
        id: Date.now().toString(),
        date: new Date().toISOString(),
        items,
        total,
        status: 'pending'
    };

    const orders = readOrders();
    orders.push(newOrder);

    if (writeOrders(orders)) {
        console.log(`Order created: ${newOrder.id}`);
        res.status(201).json({ message: 'Order created successfully', orderId: newOrder.id });
    } else {
        res.status(500).json({ error: 'Failed to save order.' });
    }
});

app.use('/api/survey', require('./survey'));

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
