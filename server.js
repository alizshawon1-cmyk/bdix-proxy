const express = require('express');
const request = require('request');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 8080;

app.use(cors());

app.get('/', (req, res) => {
    res.send('BDIX Proxy Server running!');
});

app.get('/proxy', (req, res) => {
    const streamUrl = req.query.url;
    
    if (!streamUrl) {
        return res.status(400).send('URL parameter missing!');
    }

    // Custom Headers to bypass 403 Protection
    const options = {
        url: streamUrl,
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Referer': streamUrl,
            'Origin': new URL(streamUrl).origin
        }
    };

    req.pipe(request(options)).pipe(res);
});

app.listen(PORT, () => {
    console.log(`Proxy running on port ${PORT}`);
});
