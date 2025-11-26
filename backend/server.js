const express = require('express');
const cors = require('cors');
const IPLocate = require('node-iplocate').default;

const app = express();
const PORT = process.env.PORT || 3000;
const API_KEY = 'aba10914d71cde63c16df0dd796a6b41';

// Create IPLocate client
const client = new IPLocate(API_KEY);

app.use(cors());
app.use(express.json());

// Request logging middleware
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
    next();
});

// Helper to map iplocate response to our frontend format
const mapResponse = (result) => {
    if (!result) return null;
    return {
        ip: result.ip,
        city: result.city,
        country: result.country,
        region: result.subdivision,
        ll: [result.latitude, result.longitude],
        timezone: result.time_zone
    };
};

// Single IP Lookup Endpoint
app.get('/api/lookup/:ip', async (req, res) => {
    const ip = req.params.ip;
    try {
        const result = await client.lookup(ip);
        if (result && result.latitude && result.longitude) {
            res.json(mapResponse(result));
        } else {
            res.status(404).json({ error: 'IP not found or invalid location data' });
        }
    } catch (err) {
        console.error('Error looking up IP:', err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// Bulk IP Lookup Endpoint
app.post('/api/lookup/bulk', async (req, res) => {
    const { ips } = req.body;
    if (!ips || !Array.isArray(ips)) {
        return res.status(400).json({ error: 'Invalid input. Expected an array of IPs.' });
    }

    try {
        // Process in parallel
        const promises = ips.map(async (ip) => {
            try {
                const result = await client.lookup(ip);
                if (result && result.latitude && result.longitude) {
                    return mapResponse(result);
                }
                return { ip, error: 'Location not found' };
            } catch (err) {
                console.error(`Error looking up ${ip}:`, err);
                return { ip, error: 'Lookup failed' };
            }
        });

        const results = await Promise.all(promises);
        res.json(results);
    } catch (err) {
        console.error('Error processing bulk lookup:', err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
