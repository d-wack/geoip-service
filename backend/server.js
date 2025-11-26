const express = require('express');
const cors = require('cors');
const geoip = require('geoip-lite');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Request logging middleware
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
    next();
});

// Single IP Lookup Endpoint
app.get('/api/lookup/:ip', (req, res) => {
    const ip = req.params.ip;
    const geo = geoip.lookup(ip);

    if (geo) {
        res.json({
            ip: ip,
            ...geo
        });
    } else {
        res.status(404).json({ error: 'IP not found' });
    }
});

// Bulk IP Lookup Endpoint
app.post('/api/lookup/bulk', (req, res) => {
    const { ips } = req.body;
    if (!ips || !Array.isArray(ips)) {
        return res.status(400).json({ error: 'Invalid input. Expected an array of IPs.' });
    }

    const results = ips.map(ip => {
        const geo = geoip.lookup(ip);
        return {
            ip,
            ...geo
        };
    });

    res.json(results);
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
