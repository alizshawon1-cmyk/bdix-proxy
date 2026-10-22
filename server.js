const express = require('express');
const axios = require('axios');
const cors = require('cors');
const { URL } = require('url');

const app = express();
app.use(cors());

// app.all ব্যবহার করা হয়েছে যাতে GET, HEAD বা অন্য কোনো মেথডে রিকোয়েস্ট আসলে 405 এরর না দেয়
app.all('/proxy', async (req, res) => {
    const targetUrl = req.query.url;
    if (!targetUrl) {
        return res.status(400).send('URL parameter is missing');
    }

    const headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Referer': targetUrl,
        'Accept': '*/*'
    };

    try {
        // যদি লিংকটি .m3u8 প্লেলিস্ট হয়
        if (targetUrl.includes('.m3u8')) {
            const response = await axios.get(targetUrl, { headers });
            const content = response.data;
            const baseUrl = targetUrl.substring(0, targetUrl.lastIndexOf('/') + 1);

            const updatedContent = typeof content === 'string' 
                ? content.split('\n').map(line => {
                    line = line.trim();
                    if (line && !line.startsWith('#')) {
                        let absoluteUrl;
                        if (line.startsWith('http://') || line.startsWith('https://')) {
                            absoluteUrl = line;
                        } else {
                            absoluteUrl = new URL(line, baseUrl).href;
                        }
                        return `${req.protocol}://${req.get('host')}/proxy?url=${encodeURIComponent(absoluteUrl)}`;
                    }
                    return line;
                }).join('\n')
                : content;

            res.setHeader('Content-Type', 'application/vnd.apple.mpegurl');
            return res.send(updatedContent);
        } else {
            // .ts বা অন্য মিডিয়া ফাইল হলে সরাসরি স্ট্রিম বা পাইপ করা হবে
            const response = await axios({
                method: req.method,
                url: targetUrl,
                headers: headers,
                responseType: 'stream'
            });

            if (response.headers['content-type']) {
                res.setHeader('Content-Type', response.headers['content-type']);
            }
            if (response.headers['content-length']) {
                res.setHeader('Content-Length', response.headers['content-length']);
            }
            if (response.headers['content-range']) {
                res.setHeader('Content-Range', response.headers['content-range']);
            }

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
