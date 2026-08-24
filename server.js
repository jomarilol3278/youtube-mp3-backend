const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();

app.use(cors({ origin: '*' }));
app.use(express.json());

function cleanYoutubeUrl(rawUrl) {
    try {
        const urlObj = new URL(rawUrl);
        if (urlObj.hostname.includes('youtube.com') || urlObj.hostname.includes('youtu.be')) {
            const videoId = urlObj.searchParams.get('v');
            if (videoId) {
                return `https://www.youtube.com/watch?v=${videoId}`;
            }
        }
        return rawUrl;
    } catch (e) {
        return rawUrl;
    }
}

app.post('/api/convert', async (req, res) => {
    let { videoUrl } = req.body;

    if (!videoUrl) {
        return res.status(400).json({ error: 'Please enter a valid video URL.' });
    }

    videoUrl = cleanYoutubeUrl(videoUrl);
    console.log('Converting via Cobalt API:', videoUrl);

    try {
        const response = await fetch('https://api.cobalt.tools/', {
            method: 'POST',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                url: videoUrl,
                downloadMode: 'audio',
                audioFormat: 'mp3'
            })
        });

        const data = await response.json();

        if (data.status === 'tunnel' || data.status === 'redirect') {
            console.log('Conversion successful!');
            return res.json({
                success: true,
                downloadUrl: data.url
            });
        } else {
            console.error('Cobalt error response:', data);
            return res.status(500).json({ error: data.text || 'Failed to process YouTube video.' });
        }
    } catch (error) {
        console.error('Server error during request:', error.message);
        return res.status(500).json({ error: 'Failed to connect to media processing service.' });
    }
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
});