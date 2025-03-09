const express = require('express');
const path = require('path');
const compression = require('compression');
const helmet = require('helmet');
const { Server } = require('socket.io');
const http = require('http');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: process.env.NODE_ENV === 'production' 
            ? ['https://personaltodo-omega.vercel.app'] 
            : ['http://localhost:5000'],
        methods: ['GET', 'POST']
    }
});

// Security middleware
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            ...helmet.contentSecurityPolicy.getDefaultDirectives(),
            "script-src": ["'self'", "https://cdnjs.cloudflare.com"],
            "img-src": ["'self'", "data:", "https:"],
            "connect-src": ["'self'", "wss:", "ws:"]
        },
    },
}));

// Compression middleware
app.use(compression());

// Rate limiting for production
if (process.env.NODE_ENV === 'production') {
    const rateLimit = require('express-rate-limit');
    app.use(rateLimit({
        windowMs: 15 * 60 * 1000, // 15 minutes
        max: 100 // limit each IP to 100 requests per windowMs
    }));
}

// Serve static files with caching
app.use('/static', express.static(path.join(__dirname, '../static'), {
    maxAge: process.env.NODE_ENV === 'production' ? '1d' : 0,
    etag: true
}));

// Socket.IO connection handling
io.on('connection', (socket) => {
    console.log('Client connected');

    socket.on('sync', (data) => {
        if (!data || !data.tasks) {
            socket.emit('sync_error', { message: 'Invalid data format' });
            return;
        }

        // Broadcast to all other clients
        socket.broadcast.emit('sync', {
            type: 'sync',
            data: data.tasks
        });
        socket.emit('sync_success');
    });

    socket.on('disconnect', () => {
        console.log('Client disconnected');
    });

    // Handle errors
    socket.on('error', (error) => {
        console.error('Socket error:', error);
        socket.emit('sync_error', { message: 'Internal server error' });
    });
});

// Serve index.html for all routes (SPA support)
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../index.html'));
});

// 404 handler
app.use((req, res) => {
    res.status(404).sendFile(path.join(__dirname, '../index.html'));
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({
        error: process.env.NODE_ENV === 'production' 
            ? 'Internal server error' 
            : err.message
    });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
    console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
}); 