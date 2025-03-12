const socket = io();

const userList = document.getElementById('users');
const messagesDiv = document.getElementById('messages');
const messageInput = document.getElementById('message-input');
const sendButton = document.getElementById('send-button');
const deleteChatButton = document.getElementById('delete-chat');
const exportChatButton = document.getElementById('export-chat');
const refreshUsersButton = document.getElementById('refresh-users');
const loginContainer = document.getElementById('login-container');
const appContainer = document.getElementById('app');
const logoutButton = document.getElementById('logout-button');
const googleLoginButton = document.getElementById('google-login');
const notificationSound = document.getElementById('notification-sound');

let selectedUser = null;
let userName = '';
let users = [];
let agentName = '';

// Ensure Firebase is initialized before using it
if (!firebase.apps.length) {
    firebase.initializeApp({
        apiKey: "AIzaSyCOp0wG6gV9hWfpxWdcLYVOebXGOFRnKQQ",
        authDomain: "dapp-3e65d.firebaseapp.com",
        databaseURL: "https://dapp-3e65d-default-rtdb.firebaseio.com",
        projectId: "dapp-3e65d",
        storageBucket: "dapp-3e65d.firebasestorage.app",
        messagingSenderId: "933097501621",
        appId: "1:933097501621:web:c546dd733ee4d02daf1ffc",
        measurementId: "G-6K221WXTJE"
    });
}

googleLoginButton.addEventListener('click', () => {
    const provider = new firebase.auth.GoogleAuthProvider();
    firebase.auth().signInWithPopup(provider).then((result) => {
        const user = result.user;
        agentName = user.displayName;
        loginContainer.style.display = 'none';
        appContainer.style.display = 'flex';
    }).catch((error) => {
        console.error('Error during sign-in:', error);
    });
});

logoutButton.addEventListener('click', () => {
    firebase.auth().signOut().then(() => {
        console.log('User signed out.');
        loginContainer.style.display = 'flex';
        appContainer.style.display = 'none';
    }).catch((error) => {
        console.error('Error during sign-out:', error);
    });
});

// Check for existing session
firebase.auth().onAuthStateChanged((user) => {
    if (user) {
        agentName = user.displayName;
        loginContainer.style.display = 'none';
        appContainer.style.display = 'flex';
    } else {
        loginContainer.style.display = 'flex';
        appContainer.style.display = 'none';
    }
});

socket.on('connect', () => {
    console.log('Connected to server');
    socket.emit('getAllUsers', (receivedUsers) => {
        console.log('Users received:', receivedUsers);
        users = receivedUsers.map(user => ({
            senderId: user.senderId,
            name: user.name,
            newMessages: user.newMessages,
            lastMessage: user.lastMessage,
            lastTimestamp: user.lastTimestamp
        }));
        updateUserList();
    });
});

socket.on('newMessage', (data) => {
    const user = users.find(u => u.senderId === data.senderId);
    if (user) {
        user.newMessages = (user.newMessages || 0) + 1;
        user.lastMessage = data.message || 'Image';
        user.lastTimestamp = data.timestamp;
    } else {
        users.push({
            senderId: data.senderId,
            name: data.name || 'User',
            newMessages: 1,
            lastMessage: data.message || 'Image',
            lastTimestamp: data.timestamp
        });
    }
    updateUserList();
    if (data.senderId === selectedUser && data.sender !== 'agent') {
        addMessage(data.message, 'user', data.timestamp, data.name || 'User', data.type, data.url);
    }
    notificationSound.play().catch(error => {
        console.error('Error playing notification sound:', error);
    });
    sortUserList();
});

sendButton.addEventListener('click', () => {
    const message = messageInput.value;
    if (message && selectedUser) {
        const timestamp = new Date().toLocaleString();
        socket.emit('sendMessage', { senderId: selectedUser, message });
        addMessage(message, 'agent', timestamp, agentName);
        messageInput.value = '';
    }
});

deleteChatButton.addEventListener('click', () => {
    if (selectedUser) {
        socket.emit('deleteMessage', selectedUser);
        messagesDiv.innerHTML = '';
    }
});

exportChatButton.addEventListener('click', () => {
    if (selectedUser) {
        socket.emit('getMessages', selectedUser, (messages) => {
            const chatContent = messages.map(msg => `${msg.timestamp} - ${msg.name || 'User'}: ${msg.message || 'Image'}`).join('\n');
            const blob = new Blob([chatContent], { type: 'text/plain' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${userName}_chat.txt`;
            a.click();
            URL.revokeObjectURL(url);
        });
    }
});

refreshUsersButton.addEventListener('click', () => {
    socket.emit('getAllUsers', (receivedUsers) => {
        users = receivedUsers;
        updateUserList();
    });
});

function loadMessages(senderId) {
    socket.emit('getMessages', senderId, (messages) => {
        messagesDiv.innerHTML = '';
        messages.forEach(msg => {
            const sender = msg.sender === 'agent' ? 'agent' : 'user';
            const name = sender === 'agent' ? agentName : msg.name || 'User';
            addMessage(msg.message, sender, new Date(msg.timestamp).toLocaleString(), name, msg.mediaType, msg.mediaUrl);
        });
    });
}

function addMessage(message, sender, timestamp, name, type, url) {
    const div = document.createElement('div');
    div.classList.add('message', sender);
    div.innerHTML = `<span class="timestamp">${timestamp} - ${name}</span>`;

    if (url) {
        addImageMessage(div, url);
    } else if (message) {
        addTextMessage(div, message);
    } else {
        div.innerHTML += `<p>Unsupported message type</p>`;
    }

    messagesDiv.appendChild(div);
    messagesDiv.scrollTop = messagesDiv.scrollHeight; // Scroll to the bottom
}

function addImageMessage(div, url) {
    const img = document.createElement('img');
    img.src = url;
    img.alt = "Received Image";
    img.style.maxWidth = "200px";
    img.style.borderRadius = "8px";
    img.style.cursor = "pointer";
    img.addEventListener('click', () => openModal(url));
    div.appendChild(img);
}

function openModal(url) {
    const modal = document.getElementById("imageModal");
    const modalImg = document.getElementById("modalImage");
    modal.style.display = "block";
    modalImg.src = url;
}

const modal = document.getElementById("imageModal");
const span = document.getElementsByClassName("close")[0];

span.onclick = function() {
    modal.style.display = "none";
}

window.onclick = function(event) {
    if (event.target == modal) {
        modal.style.display = "none";
    }
}

function addTextMessage(div, message) {
    div.innerHTML += `<h5>${message}</h5>`;
}

function updateUserList() {
    userList.innerHTML = '';
    users.sort((a, b) => new Date(b.lastTimestamp) - new Date(a.lastTimestamp));
    users.forEach(user => {
        const li = document.createElement('li');
        li.textContent = `${user.name || 'User'} (${user.senderId})`;
        if (user.newMessages) {
            const notification = document.createElement('span');
            notification.classList.add('notification');
            notification.textContent = user.newMessages;
            li.appendChild(notification);
        }
        if (user.senderId === selectedUser) {
            li.classList.add('active');
        }
        li.addEventListener('click', () => {
            selectedUser = user.senderId;
            userName = user.name || 'User';
            user.newMessages = 0;
            loadMessages(user.senderId);
            updateUserList();
            socket.emit('clearNotifications', user.senderId); // Notify the server to clear notifications
        });
        userList.appendChild(li);
    });
}

function sortUserList() {
    users.sort((a, b) => new Date(b.lastTimestamp) - new Date(a.lastTimestamp));
    updateUserList();
}