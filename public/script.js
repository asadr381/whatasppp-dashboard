const socket = io();

const userList = document.getElementById('users');
const adminList = document.getElementById('admins'); // New admin list
const messagesDiv = document.getElementById('messages');
const messageInput = document.getElementById('message-input');
const sendButton = document.getElementById('send-button');
const deleteChatButton = document.getElementById('delete-chat');
const exportChatButton = document.getElementById('export-chat');
const refreshUsersButton = document.getElementById('refresh-users');
const loginContainer = document.getElementById('login-container');
const appContainer = document.getElementById('app');
const logoutButton = document.getElementById('logout-button');
const notificationSound = document.getElementById('notification-sound');
const agentNotificationSound = document.getElementById('agent-notification-sound');
const timeRemainingDiv = document.getElementById('time-remaining');
 
let selectedUser = null;
let userName = '';
let users = [];
let admins = []; // New admins array
let agentName = '';
let timeLeft = 0;
let isReplyDisabled = false;
let isAdmin = false;
let blockedUsers = new Set(); // Set to store blocked users

// Check if user is already logged in
document.addEventListener('DOMContentLoaded', () => {
    const loggedInUser = sessionStorage.getItem('loggedInUser');
    const liveAgentsSection = document.getElementById('live-agents-section');
    const liveAgentsList = document.getElementById('live-agents-list');

    if (loggedInUser) {
        const userData = JSON.parse(loggedInUser);
        agentName = userData.name;
        isAdmin = userData.isAdmin;
        loginContainer.style.display = 'none';
        appContainer.style.display = 'flex';
        socket.emit('agentLoggedIn', agentName); // Emit agentLoggedIn event
        if (isAdmin) {
            document.getElementById('admin-form-btn').style.display = 'block';
            document.getElementById('view-users-btn').style.display = 'block';
        }
        liveAgentsSection.style.display = 'block'; // Show live agents section after login
        updateLiveAgents(); // Fetch the latest live agents immediately

        // Emit agent activity every 30 seconds
        setInterval(() => {
            socket.emit('agentActivity', agentName);
        }, 30 * 1000);
    } else {
        liveAgentsSection.style.display = 'none'; // Hide live agents section on login page
    }

    // Fetch and display live agents
    function updateLiveAgents() {
        fetch('/live-agents')
            .then(response => response.json())
            .then(agents => {
                liveAgentsList.innerHTML = ''; // Clear existing list
                if (agents.length === 0) {
                    liveAgentsList.innerHTML = '<p>No agents are currently online.</p>';
                } else {
                    agents.forEach(agent => {
                        const div = document.createElement('div');
                        div.innerHTML = `<span style="color: green;">●</span> ${agent}`;
                        liveAgentsList.appendChild(div);
                    });
                }
            })
            .catch(error => console.error('Error fetching live agents:', error));
    }

    // Listen for live agents updates
    socket.on('liveAgentsUpdated', (agents) => {
        liveAgentsList.innerHTML = ''; // Clear existing list
        if (agents.length === 0) {
            liveAgentsList.innerHTML = '<p>No agents are currently online.</p>';
        } else {
            agents.forEach(agent => {
                const div = document.createElement('div');
                div.innerHTML = `<span style="color: green;">●</span> ${agent}`;
                liveAgentsList.appendChild(div);
            });
        }
    });

    updateLiveAgents(); // Call updateLiveAgents on page load

    // Attach event listeners to quick reply buttons
    document.querySelectorAll('.quick-reply').forEach(button => {
        button.addEventListener('click', () => {
            const messageInput = document.getElementById('message-input'); // Ensure this references the correct input field
            if (messageInput) {
                messageInput.value = button.getAttribute('data-message'); // Set the quick reply text
                messageInput.focus(); // Focus on the input field
            } else {
                console.error('Message input field not found.');
            }
        });
    });

    // Fetch and display quick replies
    function fetchQuickReplies() {
        fetch('/quick-replies')
            .then(response => response.json())
            .then(quickReplies => {
                const quickRepliesList = document.getElementById('quick-replies-list');
                quickRepliesList.innerHTML = ''; // Clear the list to avoid duplication
                quickReplies.forEach(reply => {
                    const button = document.createElement('button');
                    button.classList.add('quick-reply');
                    button.textContent = reply.message;
                    button.setAttribute('data-id', reply._id);

                    const removeButton = document.createElement('button');
                    removeButton.classList.add('remove-reply');
                    removeButton.textContent = '✖';
                    removeButton.addEventListener('click', () => removeQuickReply(reply._id));

                    button.appendChild(removeButton);
                    quickRepliesList.appendChild(button);

                    button.addEventListener('click', () => {
                        messageInput.value = reply.message;
                        messageInput.focus();
                    });
                });
            })
            .catch(error => console.error('Error fetching quick replies:', error));
    }

    // Add new quick reply
    document.getElementById('add-quick-reply-form').addEventListener('submit', event => {
        event.preventDefault();
        const newQuickReply = document.getElementById('new-quick-reply').value;
        fetch('/quick-replies', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: newQuickReply })
        })
            .then(response => response.json())
            .then(() => {
                document.getElementById('new-quick-reply').value = '';
                fetchQuickReplies(); // Refresh quick replies after adding
            })
            .catch(error => console.error('Error adding quick reply:', error));
    });

    // Remove quick reply
    function removeQuickReply(id) {
        fetch(`/quick-replies/${id}`, { method: 'DELETE' })
            .then(() => fetchQuickReplies()) // Refresh quick replies after removing
            .catch(error => console.error('Error removing quick reply:', error));
    }

    // Call fetchQuickReplies on page load
    document.addEventListener('DOMContentLoaded', fetchQuickReplies);

    // Fetch and display quick replies on page load
    fetchQuickReplies();
});

// Function to show a pop-up message
function showPopup(message, type = 'info') {
    const popupContainer = document.createElement('div');
    popupContainer.classList.add('popup-container', type);

    const popupMessage = document.createElement('p');
    popupMessage.textContent = message;

    const closeButton = document.createElement('button');
    closeButton.textContent = 'Close';
    closeButton.classList.add('popup-close-button');
    closeButton.addEventListener('click', () => {
        popupContainer.remove();
    });

    popupContainer.appendChild(popupMessage);
    popupContainer.appendChild(closeButton);
    document.body.appendChild(popupContainer);

    setTimeout(() => {
        popupContainer.remove();
    }, 5000); // Auto-close after 5 seconds
}

// Login functionality
document.getElementById('login-button').addEventListener('click', async () => {
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    const userCaptcha = document.getElementById('captcha-input').value;
    const generatedCaptcha = sessionStorage.getItem('captcha');

    if (userCaptcha !== generatedCaptcha) {
        alert('Invalid CAPTCHA. Please try again.');
        generateCaptcha();
        return;
    }

    try {
        const response = await fetch('/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ username, password }),
        });

        if (response.ok) {
            const data = await response.json();
            agentName = data.name;
            isAdmin = data.isAdmin;
            sessionStorage.setItem('loggedInUser', JSON.stringify(data)); // Save login state
            loginContainer.style.display = 'none';
            appContainer.style.display = 'flex';
            if (isAdmin) {
                document.getElementById('admin-form-btn').style.display = 'block';
                document.getElementById('view-users-btn').style.display = 'block';
            }
            const liveAgentsSection = document.getElementById('live-agents-section');
            liveAgentsSection.style.display = 'block'; // Show live agents section after login
            socket.emit('agentLoggedIn', agentName); // Notify server of agent login
            showPopup(`Welcome back, ${agentName}! You are now logged in.`, 'success');
        } else {
            showPopup('⚠️ Invalid login credentials. Please check your username and password.', 'error');
        }
    } catch (error) {
        console.error('Error during login:', error);
        showPopup('❌ An error occurred while logging in. Please try again later.', 'error');
    }
});

logoutButton.addEventListener('click', () => {
    sessionStorage.removeItem('loggedInUser'); // Clear login state
    socket.emit('agentLoggedOut', agentName); // Notify server of agent logout
    loginContainer.style.display = 'flex';
    appContainer.style.display = 'none';
    document.getElementById('admin-form-btn').style.display = 'none';
    document.getElementById('view-users-btn').style.display = 'none';
    const liveAgentsSection = document.getElementById('live-agents-section');
    liveAgentsSection.style.display = 'none'; // Hide live agents section after logout
    isAdmin = false;
    showPopup('✅ You have successfully logged out.', 'success');
});

socket.on('connect', () => {
    console.log('Connected to server');
    socket.emit('getAllUsers', (receivedUsers) => {
        console.log('Users received:', receivedUsers);
        users = receivedUsers.filter(user => !user.isAdmin);
        admins = receivedUsers.filter(user => user.isAdmin);
        updateUserList();
        updateAdminList();
    });
    updateLiveAgents(); // Ensure live agents are fetched on socket connection
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
    if (data.sender === 'agent') {
        agentNotificationSound.play().catch(error => {
            console.error('Error playing agent notification sound:', error);
        });
    } else {
        notificationSound.play().catch(error => {
            console.error('Error playing notification sound:', error);
        });
    }
    sortUserList();
});

socket.on('ticketCreated', (data) => {
    if (data.senderId === selectedUser) {
        const timestamp = new Date().toLocaleString();
        addMessage("Your query has been created. Our team will contact you very soon.", 'agent', timestamp, agentName);
    }
});

socket.on('blockedUsers', (blocked) => {
    blockedUsers = new Set(blocked);
    updateUserList();
});

socket.on('liveAgentSessionEnded', (data) => {
    if (data.senderId === selectedUser) {
        const timestamp = new Date().toLocaleString();
        addMessage("The live agent session has ended. Press 0️⃣ for the main menu.", 'agent', timestamp, agentName);
    }
});

socket.on('liveSessionCreated', (data) => {
    if (data.senderId === selectedUser) {
        showPopup('✅ A live session has been created for the selected user.', 'success');
        sendButton.disabled = false;
        messageInput.disabled = false;
        createSessionButton.style.display = 'none'; // Hide the button
    }
    // Update the user list to reflect the state change
    const user = users.find(u => u.senderId === data.senderId);
    if (user) {
        user.lastMessage = "Live session started";
        user.lastTimestamp = new Date().toLocaleString();
        updateUserList();
    }
});

sendButton.addEventListener('click', () => {
    if (isReplyDisabled) {
        showPopup('⏳ Reply time has expired. You can no longer send messages in this session.', 'warning');
        return;
    }
    const message = messageInput.value;
    if (message && selectedUser) {
        fetch(`/check-session-status?senderId=${selectedUser}`)
            .then(response => response.json())
            .then(data => {
                if (data.isSessionClosed && data.sessionClosedByUser) {
                    showPopup('⚠️ The user has ended the chat. You cannot send messages.', 'warning');
                } else {
                    const timestamp = new Date().toLocaleString();
                    socket.emit('sendMessage', { senderId: selectedUser, message, agentName }); // Include agentName
                    addMessage(message, 'agent', timestamp, agentName);
                    messageInput.value = '';
                }
            })
            .catch(error => {
                console.error('Error checking session status before sending message:', error);
                showPopup('❌ An error occurred while sending the message. Please try again.', 'error');
            });
    }
});

messageInput.addEventListener('keypress', (event) => {
    if (event.key === 'Enter') {
        event.preventDefault();
        sendButton.click();
    }
});

deleteChatButton.addEventListener('click', () => {
    if (selectedUser) {
        socket.emit('deleteMessage', selectedUser);
        messagesDiv.innerHTML = '';
        showPopup('🗑️ Chat history has been successfully deleted.', 'success');
    } else {
        showPopup('⚠️ Please select a user to delete their chat history.', 'warning');
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
            showPopup('📁 Chat history has been exported successfully.', 'success');
        });
    } else {
        showPopup('⚠️ Please select a user to export their chat history.', 'warning');
    }
});

refreshUsersButton.addEventListener('click', () => {
    socket.emit('getAllUsers', (receivedUsers) => {
        users = receivedUsers.filter(user => !user.isAdmin);
        admins = receivedUsers.filter(user => user.isAdmin);
        updateUserList();
        updateAdminList();
    });
});

// Add a button to create a live session
const createSessionButton = document.createElement('button');
createSessionButton.textContent = 'Create Live Session';
createSessionButton.id = 'create-session-button';
createSessionButton.style.display = 'none'; // Initially hidden
createSessionButton.addEventListener('click', () => {
    if (selectedUser) {
        socket.emit('createLiveSession', selectedUser);
        showPopup('✅ Live session has been created successfully.', 'success');
        createSessionButton.style.display = 'none'; // Hide button after session creation
    } else {
        showPopup('⚠️ Please select a user to create a live session.', 'warning');
    }
});
document.body.appendChild(createSessionButton); // Append the button to the body

function checkSessionStatus(senderId) {
    fetch(`/check-session-status?senderId=${senderId}`)
        .then(response => response.json())
        .then(data => {
            if (data.isSessionClosed) {
                sendButton.disabled = true;
                messageInput.disabled = true;

                let alertDiv = document.getElementById('session-closed-alert');
                if (!alertDiv) {
                    alertDiv = document.createElement('div');
                    alertDiv.id = 'session-closed-alert';
                    alertDiv.classList.add('modal-alert');
                    alertDiv.innerHTML = `
                        <div class="modal-content">
                            <p>⚠️ The user has ended the chat session. You cannot send messages.</p>
                            <div class="modal-buttons">
                                <button id="create-session-btn" class="primary-button">Create Live Session</button>
                                <button id="close-alert-btn" class="secondary-button">Close</button>
                            </div>
                        </div>
                    `;
                    document.body.appendChild(alertDiv);

                    // Attach event listeners to the buttons
                    document.getElementById('create-session-btn').addEventListener('click', () => {
                        if (selectedUser) {
                            console.log('Create Live Session button clicked'); // Debug log
                            socket.emit('createLiveSession', selectedUser);
                            showPopup('✅ Live session has been created successfully.', 'success');
                            alertDiv.remove(); // Remove the alert after session creation
                        } else {
                            showPopup('⚠️ Please select a user to create a live session.', 'warning');
                        }
                    });

                    document.getElementById('close-alert-btn').addEventListener('click', () => {
                        console.log('Close button clicked'); // Debug log
                        alertDiv.remove(); // Remove the alert when the agent closes it
                    });
                }
                addMessage("The session has ended. You cannot send messages.", 'system', new Date().toLocaleString(), 'System');
            } else {
                sendButton.disabled = false;
                messageInput.disabled = false;
                const alertDiv = document.getElementById('session-closed-alert');
                if (alertDiv) {
                    alertDiv.remove(); // Remove the alert if session is active
                }
            }
        })
        .catch(error => {
            console.error('Error checking session status:', error); // Debug log
        });
}

function loadMessages(senderId) {
    socket.emit('getMessages', senderId, (messages) => {
        messagesDiv.innerHTML = '';
        messages.forEach(msg => {
            const sender = msg.sender === 'agent' ? 'agent' : 'user';
            const name = msg.sender === 'agent' ? msg.name : msg.name || 'User'; // Use msg.name for agent
            addMessage(msg.message, sender, new Date(msg.timestamp).toLocaleString(), name, msg.mediaType, msg.mediaUrl);
        });
        if (messages.length > 0) {
            lastMessage = messages[messages.length - 1];
            updateReplyButtonState();
        }
        checkSessionStatus(senderId); // Check session status after loading messages
    });
}

function addMessage(message, sender, timestamp, name, type, url) {
    const div = document.createElement('div');
    div.classList.add('message', sender);
    div.innerHTML = `
        <div class="message-header">
            <span class="name">${name}</span>
            <span class="timestamp">${timestamp}</span>
        </div>`;

    if (url) {
        addImageMessage(div, url);
    } else if (message) {
        addTextMessage(div, message);
        addTrackingButton(div, message); // Add tracking button if message contains a tracking number
        addEmailButton(div, message); // Add email button if message contains an email address
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

function addTrackingButton(div, message) {
    const trackingNumberPattern = /\b1Z[A-Z0-9]{16,18}\b/;
    const match = message.match(trackingNumberPattern);
    if (match) {
        const trackingNumber = match[0];
        const button = document.createElement('button');
        button.textContent = 'Track Shipment';
        button.classList.add('tracking-button');
        button.addEventListener('click', () => {
            window.open(`https://tracking.ulspakistan.com/shipment-details?trackingNumber=${trackingNumber}`, '_blank');
        });
        div.appendChild(button);
    }
}

function addEmailButton(div, message) {
    const emailPattern = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i;
    const match = message.match(emailPattern);
    if (match) {
        const email = match[0];
        const button = document.createElement('button');
        button.textContent = 'Send Email';
        button.classList.add('email-button');
        button.addEventListener('click', () => {
            const mailtoLink = `mailto:${email}`;
            window.location.href = mailtoLink;
        });
        div.appendChild(button);
    }
}

function updateUserList() {
    userList.innerHTML = '';
    users.sort((a, b) => new Date(b.lastTimestamp) - new Date(a.lastTimestamp));
    users.forEach(user => {
        const li = document.createElement('li');
        console.log(`User: ${user.name || 'User'}, Is Admin: ${user.isAdmin}`); // Log user and admin status
        li.textContent = `${user.name || 'User'}${user.isAdmin ? ' (Admin)' : ''} (${user.senderId})`; // Indicate if user is admin
        if (user.newMessages) {
            const notification = document.createElement('span');
            notification.classList.add('notification');
            notification.textContent = user.newMessages;
            li.appendChild(notification);
        }
        if (user.senderId === selectedUser) {
            li.classList.add('active');
        }
        if (blockedUsers.has(user.senderId)) {
            li.classList.add('blocked');
        } else {
            li.addEventListener('click', () => {
                selectedUser = user.senderId;
                userName = user.name || 'User';
                user.newMessages = 0;
                loadMessages(user.senderId);
                updateUserList();
                socket.emit('clearNotifications', user.senderId); // Notify the server to clear notifications
            });
        }

        if (isAdmin) {
            const buttonContainer = document.createElement('div');
            buttonContainer.classList.add('user-list-buttons');

            const deleteButton = document.createElement('button');
            deleteButton.textContent = 'Delete Chat';
            deleteButton.addEventListener('click', () => {
                socket.emit('deleteMessage', user.senderId);
                messagesDiv.innerHTML = '';
                showPopup('🗑️ Chat history has been successfully deleted.', 'success');
            });

            const exportButton = document.createElement('button');
            exportButton.textContent = 'Export Chat';
            exportButton.addEventListener('click', () => {
                socket.emit('getMessages', user.senderId, (messages) => {
                    const chatContent = messages.map(msg => `${msg.timestamp} - ${msg.name || 'User'}: ${msg.message || 'Image'}`).join('\n');
                    const blob = new Blob([chatContent], { type: 'text/plain' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `${userName}_chat.txt`;
                    a.click();
                    URL.revokeObjectURL(url);
                    showPopup('📁 Chat history has been exported successfully.', 'success');
                });
            });

            const blockButton = document.createElement('button');
            if (blockedUsers.has(user.senderId)) {
                blockButton.textContent = 'Unblock User';
                blockButton.classList.add('unblock-button');
                blockButton.addEventListener('click', () => {
                    socket.emit('unblockUser', user.senderId);
                    showPopup(`User ${user.name || 'User'} has been unblocked.`, 'success');
                });
            } else {
                blockButton.textContent = 'Block User';
                blockButton.classList.add('block-button');
                blockButton.addEventListener('click', () => {
                    socket.emit('blockUser', user.senderId);
                    showPopup(`User ${user.name || 'User'} has been blocked.`, 'success');
                });
            }

            buttonContainer.appendChild(deleteButton);
            buttonContainer.appendChild(exportButton);
            buttonContainer.appendChild(blockButton);
            li.appendChild(buttonContainer);
        }

        userList.appendChild(li);
    });
}

function updateAdminList() {
    adminList.innerHTML = '';
    admins.sort((a, b) => new Date(b.lastTimestamp) - new Date(a.lastTimestamp));
    admins.forEach(admin => {
        console.log(`Admin: ${admin.name}`); // Log admin name
        const li = document.createElement('li');
        li.textContent = `${admin.name} (Admin)`; // Indicate that this user is an admin
        // Additional logic can be added here if needed
        adminList.appendChild(li);
    });
}

function sortUserList() {
    users.sort((a, b) => new Date(b.lastTimestamp) - new Date(a.lastTimestamp));
    updateUserList();
}

document.getElementById('open-ticket-btn').addEventListener('click', async () => {
    if (!selectedUser) {
        showPopup('⚠️ Please select a user first.', 'warning');
        return;
    }

    try {
        const response = await fetch(`/get-user-details?senderId=${selectedUser}`);
        if (response.ok) {
            const userDetails = await response.json();
            document.getElementById('customerName').value = userDetails.name || '';
            document.getElementById('email').value = userDetails.email || '';
            document.getElementById('mobile').value = userDetails.mobile || selectedUser; // Pre-fill mobile with senderId if mobile is not available
            document.getElementById('trackingNumber').value = userDetails.trackingNumber || '';
        } else {
            showPopup('❌ Failed to fetch user details.', 'error');
        }
    } catch (error) {
        console.error('Error fetching user details:', error);
        showPopup('❌ An error occurred while fetching user details. Please try again later.', 'error');
    }

    document.getElementById('ticket-form-container').style.display = 'block';
});

document.getElementById('ticket-form').addEventListener('submit', async (event) => {
    event.preventDefault();

    const formData = new FormData(event.target);
    const ticketData = Object.fromEntries(formData.entries());
    ticketData.senderId = selectedUser; // Add senderId to the ticket data

    try {
        const response = await fetch('/create-ticket', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(ticketData),
        });

        if (response.ok) {
            showPopup('✅ Ticket created successfully.', 'success');
            document.getElementById('ticket-form-container').style.display = 'none';
            event.target.reset();
        } else {
            showPopup('❌ Failed to create ticket. Please try again.', 'error');
        }
    } catch (error) {
        console.error('Error creating ticket:', error);
        showPopup('❌ An error occurred while creating the ticket. Please try again later.', 'error');
    }
});

document.getElementById('close-ticket-form').addEventListener('click', () => {
    document.getElementById('ticket-form-container').style.display = 'none';
});

document.getElementById('close-chat').addEventListener('click', () => {
    if (selectedUser) {
        socket.emit('closeChat', selectedUser);
        selectedUser = null;
        messagesDiv.innerHTML = '';
        updateUserList();
        showPopup('✅ The chat session has been closed successfully.', 'success');
    } else {
        showPopup('⚠️ Please select a user to close the chat session.', 'warning');
    }
});

document.getElementById('admin-form-btn').addEventListener('click', () => {
    document.getElementById('admin-form-container').style.display = 'block';
});

document.getElementById('close-admin-form').addEventListener('click', () => {
    document.getElementById('admin-form-container').style.display = 'none';
});

document.getElementById('add-user-btn').addEventListener('click', async () => {
    const name = document.getElementById('userName').value;
    const email = document.getElementById('userEmail').value;
    const password = document.getElementById('userPassword').value;

    try {
        const response = await fetch('/add-user', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ name, email, password }),
        });

        if (response.ok) {
            showPopup('✅ User has been added successfully.', 'success');
        } else {
            showPopup('❌ Failed to add the user. Please try again.', 'error');
        }
    } catch (error) {
        console.error('Error adding user:', error);
        showPopup('❌ An error occurred while adding the user. Please try again later.', 'error');
    }
});

document.getElementById('view-users-btn').addEventListener('click', async () => {
    try {
        const response = await fetch('/view-users');
        if (response.ok) {
            const users = await response.json();
            console.log('Fetched users:', users); // Log the fetched users data
            const userList = document.getElementById('saved-users-list');
            userList.innerHTML = '';
            users.forEach(user => {
                if (user.email !== 'admin') { // Exclude the default admin user
                    const li = document.createElement('li');
                    li.textContent = `${user.name} (${user.email})${user.isAdmin ? ' (Admin)' : ''}`; // Indicate if user is admin

                    const hardcodedAdmins = ['shahzadahmed@ups.com', 'mraza@ups.com'];
                    if (!hardcodedAdmins.includes(user.email)) { // Ensure hardcoded admin users are not removable
                        const removeButton = document.createElement('button');
                        removeButton.textContent = 'Remove';
                        removeButton.addEventListener('click', async () => {
                            try {
                                const response = await fetch('/remove-user', {
                                    method: 'POST',
                                    headers: {
                                        'Content-Type': 'application/json',
                                    },
                                    body: JSON.stringify({ email: user.email }),
                                });

                                if (response.ok) {
                                    showPopup('✅ User removed successfully.', 'success');
                                    li.remove();
                                } else {
                                    showPopup('❌ Failed to remove user. Please try again.', 'error');
                                }
                            } catch (error) {
                                console.error('Error removing user:', error);
                                showPopup('❌ An error occurred while removing the user. Please try again later.', 'error');
                            }
                        });
                        li.appendChild(removeButton);

                        const makeAdminButton = document.createElement('button');
                        makeAdminButton.textContent = 'Make Admin';
                        makeAdminButton.addEventListener('click', async () => {
                            try {
                                const response = await fetch('/make-admin', {
                                    method: 'POST',
                                    headers: {
                                        'Content-Type': 'application/json',
                                    },
                                    body: JSON.stringify({ email: user.email }),
                                });

                                if (response.ok) {
                                    showPopup('✅ User promoted to admin successfully.', 'success');
                                } else {
                                    showPopup('❌ Failed to promote user to admin. Please try again.', 'error');
                                }
                            } catch (error) {
                                console.error('Error promoting user to admin:', error);
                                showPopup('❌ An error occurred while promoting the user to admin. Please try again later.', 'error');
                            }
                        });
                        li.appendChild(makeAdminButton);
                    }
                    userList.appendChild(li);
                }
            });
            document.getElementById('view-users-container').style.display = 'block';
        } else {
            showPopup('❌ Failed to fetch users. Please try again.', 'error');
        }
    } catch (error) {
        console.error('Error fetching users:', error);
        showPopup('❌ An error occurred while fetching users. Please try again later.', 'error');
    }
});

document.getElementById('close-view-users').addEventListener('click', () => {
    document.getElementById('view-users-container').style.display = 'none';
});

document.getElementById('change-password-btn').addEventListener('click', async () => {
    const oldPassword = document.getElementById('oldPassword').value;
    const newPassword = document.getElementById('newPassword').value;

    try {
        const response = await fetch('/change-password', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ oldPassword, newPassword }),
        });

        if (response.ok) {
            showPopup('✅ Your password has been changed successfully.', 'success');
        } else {
            showPopup('⚠️ Failed to change the password. Please check your old password and try again.', 'warning');
        }
    } catch (error) {
        console.error('Error changing password:', error);
        showPopup('❌ An error occurred while changing the password. Please try again later.', 'error');
    }
});

function calculateTimeLeft(timestamp) {
    const lastMsgTime = new Date(timestamp);
    const currentTime = new Date();
    const timeDiff = 23 * 60 * 60 * 1000 + 50 * 60 * 1000 - (currentTime - lastMsgTime);

    if (timeDiff > 0) {
        return timeDiff; // Return remaining time in milliseconds
    } else {
        return 0; // Time exceeded, disable reply button
    }
}

function updateReplyButtonState() {
    const remainingTime = calculateTimeLeft(lastMessage.timestamp);
    timeLeft = remainingTime;
    isReplyDisabled = remainingTime <= 0;
    sendButton.disabled = isReplyDisabled;

    // Update the time remaining display
    if (timeLeft > 0) {
        const hours = Math.floor(timeLeft / (1000 * 60 * 60));
        const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((timeLeft % (1000 * 60)) / 1000);
        timeRemainingDiv.innerHTML = `
            <div class="timer-container">
                <div class="clock">
                    <div class="hand hour-hand"></div>
                    <div class="hand minute-hand"></div>
                    <div class="hand second-hand"></div>
                </div>
                <span class="timer">${hours}h ${minutes}m ${seconds}s</span>
            </div>`;
        sendButton.style.backgroundColor = ''; // Reset to default color
    } else {
        timeRemainingDiv.innerHTML = `
            <div class="timer-container">
                <div class="clock expired">
                    <div class="hand hour-hand"></div>
                    <div class="hand minute-hand"></div>
                    <div class="hand second-hand"></div>
                </div>
                <span class="timer expired">Reply time expired!</span>
            </div>`;
        sendButton.style.backgroundColor = 'grey'; // Change to grey color
    }
}

setInterval(updateReplyButtonState, 1000); // Update every second

function toggleLiveAgents() {
    const section = document.getElementById('live-agents-section');
    const refreshButton = document.getElementById('refresh-live-agents');
    section.classList.toggle('expanded');
    refreshButton.style.display = section.classList.contains('expanded') ? 'inline-block' : 'none';

    if (section.classList.contains('expanded')) {
        updateLiveAgents(); // Fetch and update the live agents list when expanded
    }
}

// Chart.js Graph Generation Functions
function generateChatsGraph(data) {
    new Chart(document.getElementById('chats-graph'), {
        type: 'line',
        data: {
            labels: data.labels,
            datasets: [{
                label: 'Chats',
                data: data.values,
                borderColor: 'blue',
                fill: false
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false
        }
    });
}

function generateAgentRepliesGraph(data) {
    new Chart(document.getElementById('agent-replies-graph'), {
        type: 'bar',
        data: {
            labels: data.agents,
            datasets: [{
                label: 'Messages Sent',
                data: data.values,
                backgroundColor: 'green'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false
        }
    });
}

function generateTrackingPieChart(data) {
    new Chart(document.getElementById('tracking-pie-chart'), {
        type: 'pie',
        data: {
            labels: ['With Tracking Numbers', 'Without Tracking Numbers'],
            datasets: [{
                data: data.values,
                backgroundColor: ['orange', 'gray']
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false
        }
    });
}

function generateAgentLoginBarChart(data) {
    new Chart(document.getElementById('agent-login-bar-chart'), {
        type: 'bar',
        data: {
            labels: data.agents,
            datasets: [{
                label: 'Login Frequency',
                data: data.values,
                backgroundColor: 'purple'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false
        }
    });
}

document.querySelectorAll('.quick-reply').forEach(button => {
    button.addEventListener('click', () => {
        const messageInput = document.getElementById('message-input'); // Ensure this references the correct input field
        if (messageInput) {
            messageInput.value = button.getAttribute('data-message'); // Set the quick reply text
            messageInput.focus(); // Focus on the input field
        } else {
            console.error('Message input field not found.');
        }
    });
});