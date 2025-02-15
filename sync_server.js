const WebSocket = require('ws');
const http = require('http');
const server = http.createServer();
const wss = new WebSocket.Server({ server });

// Store connected clients
const clients = new Set();
let lastKnownState = null;

wss.on('connection', (ws) => {
    console.log('New device connected');
    clients.add(ws);

    // Send last known state to new client
    if (lastKnownState) {
        ws.send(JSON.stringify({
            type: 'sync',
            data: lastKnownState
        }));
    }

    ws.on('message', (message) => {
        try {
            const data = JSON.parse(message);
            lastKnownState = data.tasks;
            
            // Broadcast to all other clients
            clients.forEach(client => {
                if (client !== ws && client.readyState === WebSocket.OPEN) {
                    client.send(JSON.stringify({
                        type: 'sync',
                        data: lastKnownState
                    }));
                }
            });
        } catch (error) {
            console.error('Error processing message:', error);
        }
    });

    ws.on('close', () => {
        console.log('Device disconnected');
        clients.delete(ws);
    });
});

// Start server
const PORT = 3000;
server.listen(PORT, () => {
    console.log(`Sync server running on port ${PORT}`);
    console.log(`Local network address: http://${getLocalIP()}:${PORT}`);
});

// Get local IP address
function getLocalIP() {
    const { networkInterfaces } = require('os');
    const nets = networkInterfaces();
    
    for (const name of Object.keys(nets)) {
        for (const net of nets[name]) {
            if (net.family === 'IPv4' && !net.internal) {
                return net.address;
            }
        }
    }
    return 'localhost';
} 