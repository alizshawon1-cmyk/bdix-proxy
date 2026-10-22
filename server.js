const express = require('express');
const request = require('request'); // আগের request প্যাকেজটি ব্যবহার করা হচ্ছে
const cors = require('cors');
const { URL } = require('url');

const app = express();
app.use(cors());

app.get('/proxy', (req, res) => {
    const targetUrl = req.query.url;
    if (!targetUrl) {
        return res.status(400).send('URL parameter is missing');
    }

    const headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Referer': targetUrl,
        'Accept': '*/*'
    };

    // যদি লিংকটি .m3u8 প্লেলিস্ট হয়, তবে কনটেন্ট মডিফাই করতে হবে
    if (targetUrl.includes('.m3u8')) {
        request({ url: targetUrl, headers: headers }, (error, response, body) => {
            if (error || response.statusCode !== 200) {
                return res.status(500).send('Error fetching m3u8 playlist');
            }

            const baseUrl = targetUrl.substring(0, targetUrl.lastIndexOf('/') + 1);
            const updatedContent = body.split('\n').map(line => {
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
            }).join('\n');

            res.setHeader('Content-Type', 'application/vnd.apple.mpegurl');
            res.send(updatedContent);
        });
    } else {
        // .ts ফাইল বা অন্যান্য সেগমেন্ট হলে সরাসরি পাইপ করে পাঠিয়ে দেওয়া হবে
        req.pipe(request({ url: targetUrl, headers: headers, encoding: null })).pipe(res);
    }
});

app.listen(8080, () => {
    console.log('Proxy running on port 8080');
});
