const express = require('express');
const axios = require('axios');
const cors = require('cors');
const { URL } = require('url');

const app = express();
app.use(cors());

app.all('/proxy', async (req, res) => {
    let targetUrl = req.query.url;
    if (!targetUrl) {
        return res.status(400).send('URL parameter is missing');
    }

    const headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Referer': targetUrl,
        'Accept': '*/*'
    };

    try {
        if (targetUrl.includes('.m3u8') || targetUrl.includes('mono.m3u8') || targetUrl.includes('index.m3u8')) {
            const response = await axios.get(targetUrl, { headers, responseType: 'text' });
            let content = response.data;
            const baseUrl = targetUrl.substring(0, targetUrl.lastIndexOf('/') + 1);

            if (typeof content === 'string') {
                const lines = content.split('\n');
                const updatedLines = lines.map(line => {
                    const trimmed = line.trim();
                    if (trimmed && !trimmed.startsWith('#')) {
                        let absoluteUrl;
                        if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
                            absoluteUrl = trimmed;
                        } else if (trimmed.startsWith('/')) {
                            const parsedOriginal = new URL(targetUrl);
                            absoluteUrl = `${parsedOriginal.protocol}//${parsedOriginal.host}${trimmed}`;
                        } else {
                            absoluteUrl = new URL(trimmed, baseUrl).href;
                        }
                        return `${req.protocol}://${req.get('host')}/proxy?url=${encodeURIComponent(absoluteUrl)}`;
                    }
                    return line;
                });
                content = updatedLines.join('\n');
            }

            res.setHeader('Access-Control-Allow-Origin', '*');
            res.setHeader('Content-Type', 'application/vnd.apple.mpegurl');
            return res.send(content);
        } else {
            const response = await axios({
                method: req.method,
                url: targetUrl,
                headers: headers,
                responseType: 'stream'
            });

            if (response.headers['content-type']) res.setHeader('Content-Type', response.headers['content-type']);
            if (response.headers['content-length']) res.setHeader('Content-Length', response.headers['content-length']);
            if (response.headers['content-range']) res.setHeader('Content-Range', response.headers['content-range']);

            res.setHeader('Access-Control-Allow-Origin', '*');
            res.status(response.status);
            response.data.pipe(res);
        }
    } catch (error) {
        console.error('Proxy Error:', error.message);
        if (!res.headersSent) {
            res.status(500).send('Error fetching stream segment');
        }
    }
});

app.listen(8080, () => {
    console.log('Proxy running on port 8080');
});
