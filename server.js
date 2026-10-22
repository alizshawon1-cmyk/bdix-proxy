const express = require('express');
const request = require('request');
const cors = require('cors');
const app = express();

app.use(cors());

app.get('/proxy', (req, res) => {
    const targetUrl = req.query.url;
    if (!targetUrl) {
        return res.status(400).send('URL parameter is missing');
    }

    // মূল সার্ভারের জন্য প্রয়োজনীয় হেডার সেট করা
    const options = {
        url: targetUrl,
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Referer': 'http://198.195.239.50:8095/',
            'Origin': 'http://198.195.239.50:8095'
        }
    };

    request(options).pipe(res);
});

app.listen(8080, () => {
    console.log('Proxy running on port 8080');
});
