const socket = io();

let currentUser = null;
let selectedAvatar = '😃';
let typingTimeout = null;

// DOM Elements
const loginScreen = document.getElementById('loginScreen');
const chatScreen = document.getElementById('chatScreen');
const loginForm = document.getElementById('loginForm');
const messageForm = document.getElementById('messageForm');
const messageInput = document.getElementById('messageInput');
const messagesContainer = document.getElementById('messagesContainer');
const usernameInput = document.getElementById('username');
const logoutBtn = document.getElementById('logoutBtn');
const typingIndicator = document.getElementById('typingIndicator');
const onlineCount = document.getElementById('onlineCount');

// Avatar selection
document.querySelectorAll('.avatar-option').forEach(option => {
    option.addEventListener('click', () => {
        document.querySelectorAll('.avatar-option').forEach(o => o.classList.remove('selected'));
        option.classList.add('selected');
        selectedAvatar = option.dataset.avatar;
    });
});

// Login
loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const username = usernameInput.value.trim();
    if (!username) return;
    
    try {
        const response = await fetch('/api/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, avatar: selectedAvatar })
        });
        
        const data = await response.json();
        currentUser = data;
        
        loginScreen.classList.add('hidden');
        chatScreen.classList.remove('hidden');
        
        // Load existing messages
        messagesContainer.innerHTML = '';
        data.messages.forEach(msg => addMessage(msg));
        
    } catch (error) {
        console.error('Login error:', error);
        alert('Failed to join chat. Please try again.');
    }
});

// Logout
logoutBtn.addEventListener('click', async () => {
    if (!currentUser) return;
    
    try {
        await fetch('/api/logout', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: currentUser.userId })
        });
    } catch (error) {
        console.error('Logout error:', error);
    }
    
    location.reload();
});

// Send message
messageForm.addEventListener('submit', (e) => {
    e.preventDefault();
    
    const text = messageInput.value.trim();
    if (!text || !currentUser) return;
    
    socket.emit('chat-message', {
        userId: currentUser.userId,
        username: currentUser.username,
        avatar: currentUser.avatar,
        text: text
    });
    
    messageInput.value = '';
    messageInput.focus();
});

// Typing indicator
messageInput.addEventListener('input', () => {
    if (!currentUser) return;
    
    socket.emit('typing', {
        userId: currentUser.userId,
        username: currentUser.username,
        isTyping: messageInput.value.trim().length > 0
    });
    
    clearTimeout(typingTimeout);
    typingTimeout = setTimeout(() => {
        socket.emit('typing', {
            userId: currentUser.userId,
            username: currentUser.username,
            isTyping: false
        });
    }, 1000);
});

// Receive message
socket.on('chat-message', (message) => {
    addMessage(message);
});

// User joined
socket.on('user-joined', (data) => {
    updateOnlineCount(1);
    if (data.userId !== currentUser?.userId) {
        addSystemMessage(`${data.username} joined the chat`);
    }
});

// User left
socket.on('user-left', (data) => {
    updateOnlineCount(-1);
    addSystemMessage(`${data.username} left the chat`);
});

// Typing status
const typingUsers = new Map();
socket.on('typing', (data) => {
    if (data.userId === currentUser?.userId) return;
    
    if (data.isTyping) {
        typingUsers.set(data.userId, data.username);
    } else {
        typingUsers.delete(data.userId);
    }
    
    updateTypingIndicator();
});

function addMessage(message) {
    const isOwn = message.userId === currentUser?.userId;
    
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${isOwn ? 'own' : ''}`;
    
    const time = new Date(message.timestamp).toLocaleTimeString([], { 
        hour: '2-digit', 
        minute: '2-digit' 
    });
    
    messageDiv.innerHTML = `
        <div class="message-avatar">${message.avatar}</div>
        <div class="message-content">
            <div class="message-header">
                <span class="message-username">${message.username}</span>
                <span class="message-time">${time}</span>
            </div>
            <div class="message-text">${escapeHtml(message.text)}</div>
        </div>
    `;
    
    messagesContainer.appendChild(messageDiv);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

function addSystemMessage(text) {
    const div = document.createElement('div');
    div.style.cssText = 'text-align: center; color: #a0aec0; font-size: 13px; margin: 12px 0;';
    div.textContent = text;
    messagesContainer.appendChild(div);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

function updateTypingIndicator() {
    const users = Array.from(typingUsers.values());
    
    if (users.length === 0) {
        typingIndicator.textContent = '';
    } else if (users.length === 1) {
        typingIndicator.textContent = `${users[0]} is typing...`;
    } else if (users.length === 2) {
        typingIndicator.textContent = `${users[0]} and ${users[1]} are typing...`;
    } else {
        typingIndicator.textContent = `${users.length} people are typing...`;
    }
}

function updateOnlineCount(change) {
    const current = parseInt(onlineCount.textContent) || 1;
    onlineCount.textContent = Math.max(1, current + change);
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Auto-focus input
messageInput.focus();