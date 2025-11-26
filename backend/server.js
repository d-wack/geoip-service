const express = require('express');
const cors = require('cors');
const multer = require('multer');
const csv = require('csv-parser');
const { Readable } = require('stream');
const IPLocate = require('node-iplocate').default;

const app = express();
const PORT = process.env.PORT || 3000;
const API_KEY = 'aba10914d71cde63c16df0dd796a6b41';
const BATCH_LIMIT = 100;
const CHUNK_SIZE = 10;

// Create IPLocate client
const client = new IPLocate(API_KEY);

// Configure multer for file uploads
const upload = multer({ storage: multer.memoryStorage() });

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

// Helper to process IPs in chunks
const processInChunks = async (ips, chunkSize) => {
    const results = [];

    for (let i = 0; i < ips.length; i += chunkSize) {
        const chunk = ips.slice(i, i + chunkSize);
        console.log(`Processing chunk ${Math.floor(i / chunkSize) + 1}/${Math.ceil(ips.length / chunkSize)}`);

        const chunkPromises = chunk.map(async (ip) => {
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

        const chunkResults = await Promise.all(chunkPromises);
        results.push(...chunkResults);
    }

    return results;
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

    // Check batch limit
    if (ips.length > BATCH_LIMIT) {
        return res.status(400).json({
            error: `Batch size exceeds limit. Maximum ${BATCH_LIMIT} IPs allowed per request.`,
            limit: BATCH_LIMIT,
            received: ips.length
        });
    }

    try {
        const results = await processInChunks(ips, CHUNK_SIZE);
        res.json(results);
    } catch (err) {
        console.error('Error processing bulk lookup:', err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// CSV Upload Endpoint
app.post('/api/lookup/csv', upload.single('file'), async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
    }

    try {
        const ips = [];
        const stream = Readable.from(req.file.buffer.toString());

        // Parse CSV
        await new Promise((resolve, reject) => {
            stream
                .pipe(csv({ headers: false }))
                .on('data', (row) => {
                    // Get the first column value (assuming single column CSV)
                    const ip = Object.values(row)[0]?.trim();
                    if (ip && ip.match(/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/)) {
                        ips.push(ip);
                    }
                })
                .on('end', resolve)
                .on('error', reject);
        });

        if (ips.length === 0) {
            return res.status(400).json({ error: 'No valid IP addresses found in CSV' });
        }

        // Check batch limit
        if (ips.length > BATCH_LIMIT) {
            return res.status(400).json({
                error: `CSV contains too many IPs. Maximum ${BATCH_LIMIT} IPs allowed.`,
                limit: BATCH_LIMIT,
                received: ips.length
            });
        }

        const results = await processInChunks(ips, CHUNK_SIZE);

        // Return as JSON by default, or CSV if requested
        const format = req.query.format || 'json';

        if (format === 'csv') {
            // Convert to CSV
            const csvLines = ['IP,City,Country,Region,Latitude,Longitude,Timezone'];
            results.forEach(result => {
                if (result.ll) {
                    csvLines.push(
                        `${result.ip},${result.city || ''},${result.country || ''},${result.region || ''},${result.ll[0]},${result.ll[1]},${result.timezone || ''}`
                    );
                } else {
                    csvLines.push(`${result.ip},,,,,,"${result.error}"`);
                }
            });

            res.setHeader('Content-Type', 'text/csv');
            res.setHeader('Content-Disposition', 'attachment; filename=geoip-results.csv');
            res.send(csvLines.join('\n'));
        } else {
            res.json(results);
        }
    } catch (err) {
        console.error('Error processing CSV:', err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
