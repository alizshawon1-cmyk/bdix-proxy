const express = require('express');
const axios = require('axios');
const cors = require('cors');
const { URL } = require('url');

const app = express();
app.use(cors());

app.all('*', async (req, res) => {
    let targetUrl = req.query.url;

    // যদি সরাসরি /proxy?url= ছাড়া রিকোয়েস্ট আসে (যেমন .ts সেগমেন্ট), তবে Referer দেখে আসল লিংক বের করবে
    if (!targetUrl) {
        const referer = req.headers['referer'] || req.headers['referrer'];
        if (referer && referer.includes('url=')) {
            try {
                const refererUrlParam = referer.split('url=')[1];
                const decodedReferer = decodeURIComponent(refererUrlParam);
                const baseUrl = decodedReferer.substring(0, decodedReferer.lastIndexOf('/') + 1);
                targetUrl = new URL(req.url, baseUrl).href;
            } catch (err) {
                return res.status(400).send('Invalid path URL');
            }
        } else {
            return res.status(400).send('URL parameter is missing');
        }
    }

    const headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Referer': targetUrl,
        'Accept': '*/*'
    };

    try {
        if (targetUrl.includes('.m3u8')) {
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
                        } else {
                            absoluteUrl = new URL(trimmed, baseUrl).href;
                        }
                        return `${req.protocol}://${req.get('host')}/proxy?url=${encodeURIComponent(absoluteUrl)}`;
                    }
                    return line;
                });
                content = updatedLines.join('\n');
            }

            res.setHeader('Content-Type', 'application/vnd.apple.mpegurl');
            return res.send(content);
        } else {
            // .ts ভিডিও সেগমেন্ট স্ট্রিম করার জন্য
            const response = await axios({
                method: req.method,
                url: targetUrl,
                headers: headers,
                responseType: 'stream'
            });

            if (response.headers['content-type']) res.setHeader('Content-Type', response.headers['content-type']);
            if (response.headers['content-length']) res.setHeader('Content-Length', response.headers['content-length']);

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
