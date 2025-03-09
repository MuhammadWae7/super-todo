const express = require('express');
const path = require('path');
const app = express();

// Serve static files from the 'static' directory
app.use('/static', express.static(path.join(__dirname, 'static')));

// Serve the main HTML file
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'templates', 'index.html'));
});

// For local development
if (process.env.NODE_ENV !== 'production') {
    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => {
        console.log(`Server is running on port ${PORT}`);
    });
}

// Export for Vercel
module.exports = app; 