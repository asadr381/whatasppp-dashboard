"# whatasppp-dashboard" 
"# whatasppp-dashboard" 
echo "# whatasppp-dashboard" >> README.md
git init
git add *
git commit -m "first commit"
git branch -M main
git remote add origin https://github.com/asadr381/whatasppp-dashboard.git
git push -u origin main

git push -u origin main --force



/* General styles */
body {
    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
    background-color: #f0f2f5;
    margin: 0;
    padding: 0;
    color: #333;
    display: flex;
    height: 100vh;
    overflow: hidden;
}

.container {
    display: flex;
    width: 100%;
    height: 100%;
}




curl -X POST http://localhost:3000/reset-hardcoded-admin-password \
-H "Content-Type: application/json" \
-d '{
  "email": "mraza@ups.com",
  "newPassword": "mar@2025"
}'
/* Sidebar styles */
.sidebar {
    width: 30%;
    background-color: #fff;
    border-right: 1px solid #ccc;
    overflow-y: auto;
    box-shadow: 2px 0 5px rgba(0, 0, 0, 0.1);
}

.sidebar h2 {
    background-color: #075E54;
    color: white;
    padding: 15px;
    margin: 0;
    text-align: center;
    font-size: 1.5em;
}

.sidebar ul {
    list-style: none;
    padding: 0;
    margin: 0;
}

.sidebar ul li {
    position: relative;
    padding: 15px;
    border-bottom: 1px solid #ccc;
    cursor: pointer;
    transition: background-color 0.3s;
}

.sidebar ul li .notification {
    position: absolute;
    top: 10px;
    right: 10px;
    background-color: red;
    color: white;
    border-radius: 50%;
    padding: 5px 10px;
    font-size: 0.8em;
}

.sidebar ul li:hover {
    background-color: #f4f4f9;
}

.sidebar ul li.selected {
    background-color: #d4edda;
    border-left: 5px solid #28a745;
}

.sidebar ul li.active {
    background-color: #d4edda;
    border-left: 5px solid #28a745;
}

/* Chat box styles */
.chat-box {
    width: 70%;
    display: flex;
    flex-direction: column;
    background-color: #fff;
}

.chat-header {
    background-color: #075E54;
    color: white;
    padding: 15px;
    text-align: center;
    font-size: 1.5em;
    box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
    display: flex;
    justify-content: space-between;
    align-items: center;
}

.chat-header .options {
    display: flex;
    gap: 10px;
}

.chat-header .options button {
    background-color: #075E54;
    color: white;
    border: none;
    padding: 5px 10px;
    cursor: pointer;
    border-radius: 5px;
    transition: background-color 0.3s;
}

.chat-header .options button:hover {
    background-color: #128C7E;
}

.chat-messages {
    flex: 1;
    padding: 20px;
    overflow-y: auto;
    border-bottom: 1px solid #ccc;
    background-color: #e5ddd5;
}

.chat-input {
    display: flex;
    padding: 10px;
    border-top: 1px solid #ccc;
    background-color: #f0f2f5;
    align-items: center;
}

.chat-input input[type="text"] {
    flex: 1;
    padding: 15px;
    border: 1px solid #ccc;
    border-radius: 25px;
    margin-right: 10px;
    font-size: 16px;
}

.chat-input button {
    padding: 15px 20px;
    background-color: #075E54;
    border: none;
    color: white;
    font-size: 16px;
    cursor: pointer;
    border-radius: 25px;
    transition: background-color 0.3s;
}

.chat-input button:hover {
    background-color: #128C7E;
}

/* Message styles */
.message {
    margin-bottom: 15px;
    padding: 10px;
    border-radius: 25px;
    display: inline-block; /* Use inline-block to adjust width based on content */
    max-width: 80%; /* Set a maximum width to prevent overly wide messages */
    word-wrap: break-word;
}

.message.user {
    background-color: #dcf8c6;
    align-self: flex-start;
    text-align: left;
    float: left; /* Align user messages to the left */
    clear: both; /* Ensure messages do not overlap */
}

.message.agent {
    background-color: #fff;
    align-self: flex-end;
    border: 1px solid #ccc;
    text-align: right;
    float: right; /* Align agent messages to the right */
    clear: both; /* Ensure messages do not overlap */
}

.message .timestamp {
    display: block;
    font-size: 0.8em;
    color: #999;
    margin-bottom: 5px;
}

.message img {
    max-width: 200px;
    border-radius: 8px;
    margin-top: 5px;
}

/* Footer styles */
footer {
    background-color: #333;
    color: white;
    text-align: center;
    padding: 10px 0;
    position: fixed;
    width: 100%;
    bottom: 0;
}

/* Login styles */
.login-container {
    display: flex;
    justify-content: center;
    align-items: center;
    height: 100vh;
    width: 100%;
    background-color: #f0f2f5;
    position: relative;
    overflow: hidden;
}

.login-button {
    background-color: #4285F4;
    color: white;
    border: none;
    padding: 15px 30px;
    font-size: 18px;
    cursor: pointer;
    border-radius: 5px;
    transition: background-color 0.3s, transform 0.3s;
    z-index: 1;
}

.login-button:hover {
    background-color: #357ae8;
    transform: scale(1.1);
}

@keyframes backgroundAnimation {
    0% { background-position: 0% 50%; }
    50% { background-position: 100% 50%; }
    100% { background-position: 0% 50%; }
}

.login-container::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: linear-gradient(270deg, #ff9a9e, #fad0c4, #fad0c4, #ff9a9e);
    background-size: 400% 400%;
    animation: backgroundAnimation 15s ease infinite;
    z-index: 0;
}

.logout-button {
    background-color: #d9534f;
    color: white;
    border: none;
    padding: 5px 10px;
    cursor: pointer;
    border-radius: 5px;
    transition: background-color 0.3s;
}

.logout-button:hover {
    background-color: #c9302c;
}

/* Modal styles */
.modal {
    display: none;
    position: fixed;
    z-index: 1000;
    padding-top: 60px;
    left: 0;
    top: 0;
    width: 100%;
    height: 100%;
    overflow: auto;
    background-color: rgb(0,0,0);
    background-color: rgba(0,0,0,0.9);
}

.modal-content {
    margin: auto;
    display: block;
    width: 80%;
    max-width: 700px;
}

.modal-content, #caption {
    animation-name: zoom;
    animation-duration: 0.6s;
}

@keyframes zoom {
    from {transform: scale(0)}
    to {transform: scale(1)}
}

.close {
    position: absolute;
    top: 15px;
    right: 35px;
    color: #f1f1f1;
    font-size: 40px;
    font-weight: bold;
    transition: 0.3s;
}

.close:hover,
.close:focus {
    color: #bbb;
    text-decoration: none;
    cursor: pointer;
}

/* Ticket form styles */
#ticket-form-container {
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    background-color: white;
    padding: 20px;
    border: 1px solid #ccc;
    box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
    z-index: 1000;
}

#ticket-form {
    display: flex;
    flex-direction: column;
}

#ticket-form label {
    margin-top: 10px;
}

#ticket-form input,
#ticket-form select,
#ticket-form textarea {
    margin-top: 5px;
    padding: 10px;
    border: 1px solid #ccc;
    border-radius: 5px;
}

#ticket-form button {
    margin-top: 20px;
    padding: 10px;
    background-color: #007bff;
    color: white;
    border: none;
    border-radius: 5px;
    cursor: pointer;
}

#ticket-form button:hover {
    background-color: #0056b3;
}