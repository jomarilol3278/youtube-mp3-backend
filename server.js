const express = require('express');
const cors = require('cors');
const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');

const app = express();

app.use(cors({ origin: '*' }));
app.use(express.json());

const downloadsDir = path.join(__dirname, 'downloads');
if (!fs.existsSync(downloadsDir)) {
    fs.mkdirSync(downloadsDir);
}

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

app.post('/api/convert', (req, res) => {
    let { videoUrl } = req.body;

    if (!videoUrl) {
        return res.status(400).json({ error: 'Please enter a valid video URL.' });
    }

    videoUrl = cleanYoutubeUrl(videoUrl);
    const fileId = Date.now();
    const outputPath = path.join(downloadsDir, `${fileId}.mp3`);

    console.log('Downloading with yt-dlp:', videoUrl);

    const protocol = req.protocol;
    const host = req.get('host');

    // Uses the mweb client and forces player JS fetch to bypass datacenter blocks
    const command = `yt-dlp -x --audio-format mp3 --audio-quality 0 --extractor-args "youtube:player_client=mweb;player_skip=webpage" -o "${outputPath}" --no-check-certificates --no-warnings "${videoUrl}"`;

    exec(command, (error, stdout, stderr) => {
        if (error) {
            console.error('yt-dlp error:', stderr || error.message);
            return res.status(500).json({ error: 'Failed to extract audio stream.' });
        }

        console.log('Download complete:', fileId);
        res.json({ 
            success: true, 
            downloadUrl: `${protocol}://${host}/download/${fileId}.mp3` 
        });
    });
});

app.get('/download/:filename', (req, res) => {
    const filePath = path.join(downloadsDir, req.params.filename);
    res.download(filePath, (err) => {
        if (!err && fs.existsSync(filePath)) {
            fs.unlinkSync(filePath); // Clean up file after download
        }
    });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
});