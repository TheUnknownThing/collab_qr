const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Serve static files from the 'public' folder
app.use(express.static(path.join(__dirname, 'public')));

// Store the latest scanned URL
let latestUrl = null;
let latestUrlTimestamp = null;

// Endpoint to fetch the latest redirected URL
app.get('/api/latest-url', (req, res) => {
    res.json({
        url: latestUrl,
        timestamp: latestUrlTimestamp,
        available: latestUrl !== null
    });
});

function getOnlineCount() {
    return io.engine.clientsCount;
}

io.on('connection', (socket) => {
    console.log('A user connected: ' + socket.id);
    
    // Send current user count to all clients
    io.emit('user_count', getOnlineCount());

    // Listen for the 'scan_success' event from a client
    socket.on('scan_success', (url, ack) => {
        console.log(`User ${socket.id} scanned: ${url}`);
        
        // Store the latest URL
        latestUrl = url;
        latestUrlTimestamp = new Date().toISOString();
        
        // Broadcast to everyone ELSE (excluding the sender)
        // If you want the sender to redirect too, use io.emit instead of socket.broadcast.emit
        socket.broadcast.emit('navigate_now', url);
        
        // Acknowledge receipt if callback provided
        if (typeof ack === 'function') {
            ack({ success: true });
        }
    });

    socket.on('disconnect', () => {
        console.log('User disconnected');
        // Update count for remaining clients
        io.emit('user_count', getOnlineCount());
    });
});

const PORT = process.env.PORT || 18888;
server.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
