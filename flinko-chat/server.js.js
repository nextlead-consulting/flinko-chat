const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

const users = new Map();
const messages = [];

app.use(express.static('public'));
app.use(express.json());

app.post('/api/login', (req, res) => {
    const { username, avatar } = req.body;
    const userId = Date.now().toString();
    
    users.set(userId, { username, avatar, online: true });
    
    io.emit('user-joined', { userId, username, avatar });
    
    res.json({ userId, username, avatar, messages });
});

app.post('/api/logout', (req, res) => {
    const { userId } = req.body;
    const user = users.get(userId);
    
    if (user) {
        io.emit('user-left', { userId, username: user.username });
        users.delete(userId);
    }
    
    res.json({ success: true });
});

io.on('connection', (socket) => {
    console.log('User connected:', socket.id);
    
    socket.on('chat-message', (data) => {
        const message = {
            id: Date.now(),
            userId: data.userId,
            username: data.username,
            avatar: data.avatar,
            text: data.text,
            timestamp: new Date().toISOString()
        };
        
        messages.push(message);
        if (messages.length > 100) messages.shift();
        
        io.emit('chat-message', message);
    });
    
    socket.on('typing', (data) => {
        socket.broadcast.emit('typing', data);
    });
    
    socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`🚀 Flinko server running on http://localhost:${PORT}`);
});