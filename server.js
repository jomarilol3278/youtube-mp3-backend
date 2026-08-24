const express = require('express');
const cors = require('cors');

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

// List of active public Cobalt API instances
const COBALT_INSTANCES = [
    'https://cobalt.stream',
    'https://api.cobalt.tools',
    'https://cobalt.q1.02.ls'
];

app.post('/api/convert', async (req, res) => {
    let { videoUrl } = req.body;

    if (!videoUrl) {
        return res.status(400).json({ error: 'Please enter a valid video URL.' });
    }

    videoUrl = cleanYoutubeUrl(videoUrl);
    console.log('Converting URL:', videoUrl);

    for (const instance of COBALT_INSTANCES) {
        try {
            console.log(`Trying instance: ${instance}`);
            const response = await fetch(`${instance}/`, {
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
                console.log('Conversion successful via:', instance);
                return res.json({
                    success: true,
                    downloadUrl: data.url
                });
            } else {
                console.warn(`Instance ${instance} returned status:`, data.status || data.error?.code);
            }
        } catch (err) {
            console.warn(`Failed reaching instance ${instance}:`, err.message);
        }
    }

    return res.status(500).json({ error: 'All conversion nodes are currently busy. Please try again in a few seconds.' });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
});