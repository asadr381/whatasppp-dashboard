const express = require('express');
const axios = require('axios');
const bodyParser = require('body-parser');
const cors = require('cors');
const app = express();
const port = 3000; // Ensure this port matches the one the client is trying to connect to
const cloudscraper = require('cloudscraper');
const WHATSAPP_API_URL = 'https://graph.facebook.com/v21.0/475808092293189/messages';
const ACCESS_TOKEN = 'EAAIazcNERPEBO5kmUZBr9N5h56g42TjwFkV0pfVb4taplNIlPu6uA06GGZCL8aTcLhLa8snXDcDWSGh35wUmCSjP8QRE94ZBhZC4eJZCLxEFS79YWn2evvGZBRQfGXsRAGgu6VHlQFrgwZA7BV7stZC4cv1VFWFAi9rnaOXR8ov8JYNxoRldWPy09HuD0IJ9ynQ3DAZDZD'; // Replace with your actual access token
const VERIFY_TOKEN = 'EAAIazcNERPEBO5kmUZBr9N5h56g42TjwFkV0pfVb4taplNIlPu6uA06GGZCL8aTcLhLa8snXDcDWSGh35wUmCSjP8QRE94ZBhZC4eJZCLxEFS79YWn2evvGZBRQfGXsRAGgu6VHlQFrgwZA7BV7stZC4cv1VFWFAi9rnaOXR8ov8JYNxoRldWPy09HuD0IJ9ynQ3DAZDZD';
const FRAPPE_URL = "https://ups.sowaanerp.com";
const API_KEY = "6deab0c07f750cc";
const API_SECRET = "588f60f1a3a5255";
const moment = require('moment-timezone');
const mongoose = require('mongoose');
const http = require('http').Server(app);
const io = require('socket.io')(http);
const path = require('path');
const session = require('express-session');
const FormData = require('form-data');
const bcrypt = require('bcryptjs');
const nodemailer = require('nodemailer');
const { Resend } = require('resend');
const resend = new Resend('re_ZyECWkWh_5KKrMfAFf1JqkaXqiwNogJGh');
const postmark = require('postmark'); // Add Postmark library
const postmarkClient = new postmark.ServerClient('50146b14-0b3d-4e10-8ca8-209e32e03e1f'); // Replace with your Postmark server token
const ExcelJS = require('exceljs'); // Add this library for Excel generation

mongoose.connect('mongodb+srv://admin:admin@cluster0.0katx.mongodb.net/?retryWrites=true&w=majority', { useNewUrlParser: true, useUnifiedTopology: true })
    .then(() => console.log('MongoDB connected'))
    .catch(err => console.error('MongoDB connection error:', err));

const chatSchema = new mongoose.Schema({
    senderId: String,
    message: String,
    timestamp: { type: Date, default: Date.now },
    status: { type: String, default: 'open' },
    sender: String,
    name: String,
    mediaUrl: String, // Add mediaUrl field to store image URL
    mediaType: String, // Add mediaType field to store media type
    lastMsgTimestamp: Date // Add this field to store the last message timestamp
});

const Chat = mongoose.model('Chat', chatSchema);

const userSchema = new mongoose.Schema({
    senderId: String,
    name: String,
    newMessages: { type: Number, default: 0 },
    lastMessage: String,
    lastTimestamp: Date
});

const User = mongoose.model('User', userSchema);

const loginSchema = new mongoose.Schema({
    name: String,
    email: String,
    password: String,
    isAdmin: { type: Boolean, default: false },
    tempPassword: String // Temporary password field
});

const Login = mongoose.model('Login', loginSchema);

// Create initial admin user
async function createAdminUser() {
    const adminUser = await Login.findOne({ email: 'admin' });
    if (!adminUser) {
        const hashedPassword = await bcrypt.hash('ULSUPSjan@2024', 10);
        const newAdmin = new Login({ name: 'Admin', email: 'admin', password: hashedPassword, isAdmin: true });
        await newAdmin.save();
        console.log('Admin user created');
    }
}
createAdminUser();

// Create initial admin users
async function createAdminUsers() {
    const adminUsers = [
        { name: 'Shahzad', email: 'shahzadahmed@ups.com', password: 'mar@2025', isAdmin: true },
        { name: 'Asad', email: 'mraza@ups.com', password: 'mar@2025', isAdmin: true }
    ];

    for (const adminUser of adminUsers) {
        const existingUser = await Login.findOne({ email: adminUser.email });
        if (!existingUser) {
            const hashedPassword = await bcrypt.hash(adminUser.password, 10);
            const newAdmin = new Login({ name: adminUser.name, email: adminUser.email, password: hashedPassword, isAdmin: adminUser.isAdmin });
            await newAdmin.save();
            console.log(`Admin user ${adminUser.name} created`);
        }
    }
}
createAdminUsers();

function sendLiveAgentLink(senderId) {
    // Get current time in Pakistan Time (PKT)
    const now = moment().tz("Asia/Karachi");
    const day = now.isoWeekday(); // 1 = Monday, 7 = Sunday
    const hour = now.hour();

    // Business hours: Monday - Friday, 9 AM - 5 PM PKT
    if (day >= 1 && day <= 5 && hour >= 9 && hour < 17) {
        sendWhatsAppMessage(senderId, "Please click the link to talk to a live agent: https://tawk.to/chat/67b325c3a01293190a6e9709/1ik9sn27l");
    } else {
        let nextBusinessDay;
        if (day === 6 || day === 7) {  // If Saturday or Sunday, next business day is Monday
            nextBusinessDay = "Monday, 9 AM to 5 PM PKT";
        } else { // If it's a weekday but outside business hours
            nextBusinessDay = "tomorrow, 9 AM to 5 PM PKT";
        }

        sendWhatsAppMessage(senderId, `Sorry, live agents are unavailable. Please contact us on ${nextBusinessDay}. \n0️⃣ Main Menu`);
    }
}
// Email validation function
function isValidEmail(email) {
    return email.includes("@") && email.includes(".");
}

// Phone number validation function
function isValidPhoneNumber(phone) {
    return /^(0\d{3}-?\d{6,10}|3\d{9,10}|92\d{10,12})$/.test(phone);
}

app.use(cors({
    origin: '*',  // Allow all domains
    methods: ['GET', 'POST'],  // Allow GET and POST methods
    allowedHeaders: ['Content-Type', 'Authorization'],  // Allow these headers
    credentials: true,  // Allow credentials if needed
}));

app.use(bodyParser.json());

app.use(session({
    secret: 'your-secret-key',
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false } // Set to true if using HTTPS
}));

// Store user states for tracking requests
let userTrackingState = {};
let ticketCreationState = {}; // State for ticket creation
let locationSelectionState = {};
let ticketCreationStates = {}; // State for general query
let ticketCreationStatess = {};
let ticketCreationStatesss = {}; // State for customer service
let liveAgentState = {}; // State for live agent chat

// Define office locations
const officeLocations = {
    "1": { name: "Sialkot", address: "CHOWK ANWAR, KHAWAJA MONUMENT, HAJI PURA ROAD, NEAR FAYSAL BANK, SIALKOT - PAKISTAN. (0092) 52-3556344,3556347", link: "https://www.google.com/maps?q=32.473460674551234,74.51881949317858" },
    "2": { name: "Karachi", address: "E-15/ PECHS, BLOCK 6, SHAHRA-E-FAISAL, NURSERY, KARACHI-PAKISTAN. (0092) 21-34521387-88", link: "https://www.google.com/maps?q=24.8596337,67.0657547" },
    "3": { name: "Lahore", address: "204 - SCOTCH CORNER, UPPER MALL, SCHEME LAHORE - PAKISTAN.0092) 42-35753888,35754666", link: "https://www.google.com/maps?q=31.543372414055295,74.35411971970743" },
    "4": { name: "Faisalabad", address: "OFFICE NO. 13, REGENCY INTERNATIONAL 949, THE MALL, NEAR BEST WESTERN HOTEL, OPP PIA OFFICE, FAISALABAD - PAKISTAN. PH: (0092) 41-2600236", link: "https://www.google.com/maps?q=31.42243233736654,73.08960740199518"  },
    "5": { name: "Peshawar", address: "MDF 23, GROUND FLOOR NAMAL PLAZA, KHYBER SUPER MARKET, BARA ROAD, NEAR QAYYUM STADIUM PESHAWAR - PAKISTAN (0092) 91-5252046-47", link: "https://www.google.com/maps?q=33.98999008689488,71.53431641136997" },
    "6": { name: "Islamabad", address: "BUILDING NO. 19 FAQIR APPI ROAD, NEAR METRO CASH & CARRY SECTOR I - 11/3, ISLAMABAD - PAKISTAN. (0092) 51-8733361-62, 51-4863971-72", link: "https://www.google.com/maps?q=33.643544744771546,73.02197573414695" },
};

const welcomeMessage = `🌟 *Welcome to UNIVERSAL LOGISTICS SERVICES, AUTHORIZED SERVICE CONTRACTOR FOR UPS* 🌟

*This Channel Provides shipment services exclusively for ULS, UPS ASC for Pakistan. For shipments generated byother courier companies, or other countries, please contact the appropriate customer service department.* 

📦 *Thank you for choosing ULS!*  

Please reply with an option number:  
1️⃣ Track your Shipment  
2️⃣ Get Shipment Rates  
3️⃣ Locate Nearest Express Centre  
4️⃣ General Query  
5️⃣ Arrange Call Back for Your Shipment
6️⃣ Talk to Live Agent (9am to 5pm)
`;

// Webhook verification route (GET request)
app.get('/webhook', (req, res) => {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    if (mode && token && mode === 'subscribe' && token === VERIFY_TOKEN) {
        res.status(200).send(challenge);
    } else {
        res.sendStatus(403);
    }
});

const blockedUsers = new Set(); // Set to store blocked users

const sessionSchema = new mongoose.Schema({
    senderId: String,
    isSessionClosed: { type: Boolean, default: false },
    sessionClosedByUser: { type: Boolean, default: false }, // New field to track if user closed the session
    closedAt: Date
});

const Session = mongoose.model('Session', sessionSchema);

// Webhook for incoming messages
app.post('/webhook', async (req, res) => {
    let data = req.body;
    console.log("📥 Received webhook data:", JSON.stringify(data, null, 2));

    const message = data?.entry?.[0]?.changes?.[0]?.value?.messages?.[0];
    const contact = data?.entry?.[0]?.changes?.[0]?.value?.contacts?.[0];

    if (message && contact) {
        const senderId = message.from;
        const userMessage = message.text?.body.trim();
        const userName = contact.profile?.name || 'User';

        // Check if the user is blocked
        if (blockedUsers.has(senderId)) {
            console.log(`Blocked message from ${senderId}`);
            return res.sendStatus(200);
        }

        // Handle image messages
        if (message.type === "image") {
            const mediaId = message.image.id;
            const mimeType = message.image.mime_type;

            // Fetch the image URL from WhatsApp
            const imageUrl = await getMediaUrl(mediaId);

            if (imageUrl) {
                // Save the image message to the database
                const chat = new Chat({ senderId, message: null, mediaUrl: imageUrl, mediaType: mimeType, sender: 'user', name: userName });
                await chat.save();

                // Send image details to the frontend
                io.emit("newMessage", { senderId, timestamp: message.timestamp, type: "image", url: imageUrl, mimeType });
            }
            return res.sendStatus(200);
        }

        // Handle "EXIT" command to end live agent session
        if (userMessage.toUpperCase() === "EXIT" && liveAgentState[senderId]) {
            delete liveAgentState[senderId];
            sendWhatsAppMessage(senderId, "The live agent session has ended. Press 0️⃣ for the main menu.");
            io.emit('liveAgentSessionEnded', { senderId });

            // Save session close status in the database
            await Session.updateOne(
                { senderId },
                { $set: { isSessionClosed: true, sessionClosedByUser: true, closedAt: new Date() } },
                { upsert: true }
            );

            return res.sendStatus(200);
        }

        // Save the message to the database if live agent chat is active
        if (liveAgentState[senderId]) {
            const chat = new Chat({ senderId, message: userMessage, sender: 'user', name: userName, lastMsgTimestamp: new Date() });
            await chat.save();
            io.emit('newMessage', { senderId, message: userMessage, sender: 'user', timestamp: new Date().toLocaleString(), name: userName });
            return res.sendStatus(200);
        }

        // TRACKING FLOW (Option 1)
        if (userTrackingState[senderId]) {
            const trackingNumber = userMessage;
            delete userTrackingState[senderId]; // Clear state

            sendWhatsAppMessage(senderId, `\ud83d\udd0d Fetching details for tracking number: *${trackingNumber}*...`);
            try {
                const trackingResponse = await axios.get(`https://excel-api-0x2r.onrender.com/track/${trackingNumber}`);
                const packageData = trackingResponse.data.trackResponse?.shipment[0]?.package[0];

                if (packageData) {
                    const formattedActivities = packageData.activity?.map(activity =>
                        `\ud83d\udfe1 ${activity.status.description || " "}  - ${activity.location.address.city || " "}, ${activity.location.address.country || " "} on ${activity.date.slice(0, 4) || " "}-${activity.date.slice(4, 6) || " "}-${activity.date.slice(6, 8) || " "}`
                    ).join("\n") || "No activity available.";

                    const trackingDetails = `\ud83d\udce6 *Tracking Number:* ${trackingNumber}
\ud83d\ude9a *Status:* ${packageData.currentStatus?.description || "N/A"}
\ud83d\udcc5 *Delivery Date:* ${packageData.deliveryDate ? packageData.deliveryDate[0]?.date : "N/A"}
\ud83d\udce6 *Weight:* ${packageData.weight?.weight || "N/A"} kg

✈️ *Shipment Journey:*
${formattedActivities}`;

                    sendWhatsAppMessage(senderId, trackingDetails);
                    sendWhatsAppMessage(senderId, "0️⃣ Main Menu");
                } else {
                    sendWhatsAppMessage(senderId, "⚠️ No shipment details found for this tracking number.");
                }
            } catch (error) {
                sendWhatsAppMessage(senderId, "⚠️ Error fetching shipment details. \n0️⃣ Main Menu");
      
            }
            return res.sendStatus(200);
        }

        // LOCATION SELECTION FLOW (Option 3)
        if (locationSelectionState[senderId]) {
            const selectedLocation = officeLocations[userMessage];
            if (selectedLocation) {
                sendWhatsAppMessage(senderId, `📍 *${selectedLocation.name} Office Location:*\n${selectedLocation.address} \n${selectedLocation.link} \n0️⃣ Main Menu` );
     
            } else {
                sendWhatsAppMessage(senderId, "⚠️ Invalid selection. Please choose a valid option. \n0️⃣ Main Menu");
    
            }
            delete locationSelectionState[senderId]; // Clear state
            return res.sendStatus(200);
        }

        // TICKET CREATION FLOW (Option 2)
        if (ticketCreationState[senderId]) {
            ticketCreationState[senderId].push(userMessage);
        
            switch (ticketCreationState[senderId].length) {
                case 1:
                    sendWhatsAppMessage(senderId, "📧 Please enter your email:");
                    break;
        
                case 2:
                    if (!isValidEmail(ticketCreationState[senderId][1])) {
                        sendWhatsAppMessage(senderId, "⚠️ Invalid email. Please enter a valid email:");
                        ticketCreationState[senderId].pop(); // Remove invalid email
                    } else {
                        sendWhatsAppMessage(senderId, "📱 Please enter your mobile number:");
                    }
                    break;
        
                case 3:
                    if (!isValidPhoneNumber(ticketCreationState[senderId][2])) {
                        sendWhatsAppMessage(senderId, "⚠️ Invalid phone number. Please enter a valid phone number (9 to 13 digits):");
                        ticketCreationState[senderId].pop(); // Remove invalid phone number
                    } else {
                        sendWhatsAppMessage(senderId, "🌍 Please enter shipment country from:");
                    }
                    break;
        
                case 4:
                    sendWhatsAppMessage(senderId, "🌍 Please enter shipment country to:");
                    break;
        
                case 5:
                    sendWhatsAppMessage(senderId, "📦 Please select shipment type:\n1️⃣ Letter (0.5kg only)\n2️⃣ Document (0.5kg to 5kg only)\n3️⃣ Parcel (0.5kg to 70kg)");
                    break;
        
                case 6:
                    if (!["1", "2", "3"].includes(userMessage)) {
                        sendWhatsAppMessage(senderId, "⚠️ Invalid selection. Please choose a valid shipment type:\n1️⃣ Letter (0.5kg only)\n2️⃣ Document (0.5kg to 5kg only)\n3️⃣ Parcel (0.5kg to 70kg only)");
                        ticketCreationState[senderId].pop(); // Remove invalid selection
                    } else {
                        sendWhatsAppMessage(senderId, "⚖️ Please enter shipment weight in kg:");
                    }
                    break;
        
                case 7:
                    if (isNaN(userMessage) || parseFloat(userMessage) <= 0) {
                        sendWhatsAppMessage(senderId, "⚠️ Invalid weight. Please enter a valid shipment weight in kg:");
                        ticketCreationState[senderId].pop(); // Remove invalid weight
                    } else {
                        // Extract all collected data
                        const [customerName, email, mobile, shipmentFrom, shipmentTo, shipmentType, weight] = ticketCreationState[senderId];
        
                        // Map shipment type to human-readable format
                        const shipmentTypeMap = {
                            "1": "Letter (0.5kg only)",
                            "2": "Document (0.5kg to 5kg only)",
                            "3": "Parcel (0.5kg to 70kg)"
                        };
        
                        const formattedShipmentType = shipmentTypeMap[shipmentType] || shipmentType;
        
                        // If user is selecting location, handle it separately
                        if (locationSelectionState[senderId]) {
                            const selectedLocation = officeLocations[userMessage];
                            if (selectedLocation) {
                                sendWhatsAppMessage(senderId, `📍 *${selectedLocation.name} Office Location:*\n${selectedLocation.address}\n${selectedLocation.link}\n0️⃣ Main Menu`);
                            } else {
                                sendWhatsAppMessage(senderId, "⚠️ Invalid selection. Please choose a valid option. \n0️⃣ Main Menu");
                            }
                            delete locationSelectionState[senderId]; // Clear state
                            return res.sendStatus(200);
                        }
        
                        // Prepare the ticket data for the API
                        const ticketData = {
                            custom_customer_name: customerName,
                            custom_customer_email_address: email,
                            custom_customer_contact_number: mobile,
                            subject: "Whatsapp Rate Inquiry",
                            raised_by: email,
                            agent_group: "TeleSales",
                            custom_employee: "WebAPI",
                            ticket_type: "Rate Inquiry",
                            description: `Shipment From: ${shipmentFrom}, Shipment To: ${shipmentTo}, Shipment Type: ${formattedShipmentType}, Weight: ${weight}kg`
                        };
        
                        // Clear the state after ticket creation
                        delete ticketCreationState[senderId];
        
                        // Create the ticket in the system
                        createTicket(senderId, ticketData);
                    }
                    break;
            }
            return res.sendStatus(200);
        }
        

        // GENERAL QUERY FLOW (Option 4)
        if (ticketCreationStates[senderId]) {
            ticketCreationStates[senderId].push(userMessage);
        
            switch (ticketCreationStates[senderId].length) {
                case 1:
                    sendWhatsAppMessage(senderId, "📧 Please enter your email:");
                    break;
                case 2:
                    if (!isValidEmail(ticketCreationStates[senderId][1])) {
                        sendWhatsAppMessage(senderId, "⚠️ Invalid email. Please enter a valid email.");
                        ticketCreationStates[senderId].pop(); // Remove invalid email
                    } else {
                        sendWhatsAppMessage(senderId, "📱 Please enter your mobile number:");
                    }
                    break;
                case 3:
                    if (!isValidPhoneNumber(ticketCreationStates[senderId][2])) {
                        sendWhatsAppMessage(senderId, "⚠️ Invalid phone number. Please enter a valid phone number (9 to 13 digits).");
                        ticketCreationStates[senderId].pop(); // Remove invalid phone number
                    } else {
                        sendWhatsAppMessage(senderId, "❓ Please select your Request type:\n1️⃣ Commodity Information\n2️⃣ Customs Requirements / Paper Work\n3️⃣ Product Inquiry\n4️⃣ Transit Time\n5️⃣ Corporate or Business Account");
                    }
                    break;
                case 4:
                    if (!["1", "2", "3", "4", "5"].includes(ticketCreationStates[senderId][3])) {
                        sendWhatsAppMessage(senderId, "⚠️ Invalid option. Please select a valid Request type:\n1️⃣ Commodity Information\n2️⃣ Customs Requirements / Paper Work\n3️⃣ Product Inquiry\n4️⃣ Transit Time\n5️⃣ Corporate or Business Account");
                        ticketCreationStates[senderId].pop(); // Remove invalid option
                    } else {
                        sendWhatsAppMessage(senderId, "📦 (Optional) Enter tracking number if any:\n0️⃣ to skip");
                    }
                    break;
                case 5:
                    sendWhatsAppMessage(senderId, "🏦 (Optional) Enter your customer account number if any:\n0️⃣ to skip");
                    break;
                case 6:
                    sendWhatsAppMessage(senderId, "✍️ Please describe your issue or query:");
                    break;
                case 7:
                    const [customerName, email, mobile, ticketType, trackingNumber, accountNumber, description] = ticketCreationStates[senderId];
        
                    const ticketTypeMap = {
                        "1": "Commodity Information",
                        "2": "Customs Requirements / Paper Work",
                        "3": "Product Inquiry",
                        "4": "Transit Time",
                        "5": "Corporate or Business Account",
                        "6": "Rate Inquiry CS" // Add mapping for "6"
                    };
        
                    const formattedTicketType = ticketTypeMap[ticketType] || ticketType;
        
                    const ticketData = {
                        custom_customer_name: customerName,
                        subject: "Whatsapp General Query",
                        raised_by: email,
                        agent_group: "Customer Support",
                        custom_employee: "WebAPI",
                        ticket_type: formattedTicketType,
                        description: description,
                        custom_customer_email_address: email,
                        custom_customer_contact_number: mobile
                    };
        
                    if (trackingNumber.toLowerCase() !== '0') {
                        ticketData.custom_tracking_number_if_any = trackingNumber;
                    }
                    if (accountNumber.toLowerCase() !== '0') {
                        ticketData.custom_customer_account_number = accountNumber;
                    }
        
                    delete ticketCreationStates[senderId];
        
                    createTicket(senderId, ticketData);
                    break;
            }
            return res.sendStatus(200);
        }
        

        // CUSTOMER SERVICE FLOW (Option 5)
        
        if (ticketCreationStatess[senderId]) {
            ticketCreationStatess[senderId].push(userMessage);
        
            switch (ticketCreationStatess[senderId].length) {
                case 1:
                    sendWhatsAppMessage(senderId, "📧 Please enter your email:");
                    break;
                case 2:
                    if (!isValidEmail(ticketCreationStatess[senderId][1])) {
                        sendWhatsAppMessage(senderId, "⚠️ Invalid email. Please enter a valid email.");
                        ticketCreationStatess[senderId].pop(); // Remove invalid email
                    } else {
                        sendWhatsAppMessage(senderId, "📱 Please enter your mobile number:");
                    }
                    break;
                case 3:
                    if (!isValidPhoneNumber(ticketCreationStatess[senderId][2])) {
                        sendWhatsAppMessage(senderId, "⚠️ Invalid phone number. Please enter a valid phone number (9 to 13 digits).");
                        ticketCreationStatess[senderId].pop(); // Remove invalid phone number
                    } else {
                        sendWhatsAppMessage(senderId, "📱 Please Enter Your CallBack Number");
                    }
                    break;
            
                case 4:
                    sendWhatsAppMessage(senderId, "📦 Please provide your tracking number.");
                    break;
                case 5:
                        sendWhatsAppMessage(senderId, "✍️ Please describe your issue or query:");
                        break;    
                case 6:
                    // Extract all collected data
                    const [customerName, email, mobile, callback, trackingNumber, query] = ticketCreationStatess[senderId];
        
                    // Prepare the ticket data for the API
                    const ticketData = {
                        custom_customer_name: customerName,
                        subject: "Whatsapp Call Back",
                        raised_by: email,
                        agent_group: "Customer Support",
                        custom_employee: "WebAPI",
                        ticket_type: "Call Back",
                        description: `Details: ${query}, CallBack Number: ${callback} `,
                        custom_customer_email_address: email,
                        custom_customer_contact_number: mobile,
                        custom_tracking_number_if_any: trackingNumber
                    };
        
                    // Include tracking number only if it starts with "1Z"
                    if (trackingNumber && trackingNumber.toUpperCase().startsWith("1Z")) {
                        ticketData.custom_tracking_number_if_any = trackingNumber;
                    }
        
                    // Clear the state after ticket creation
                    delete ticketCreationStatess[senderId];
        
                    // Create the ticket in the system
                    createTicket(senderId, ticketData);
                    break;
            }
            return res.sendStatus(200);
        }

        // OPTION SELECTION HANDLING
        switch (userMessage) {
            case "0":
                sendWhatsAppMessage(senderId, welcomeMessage);
                break;
            case "1":
                userTrackingState[senderId] = true;
                sendWhatsAppMessage(senderId, "📦 Please enter your tracking number:");
                break;
            case "2":
                ticketCreationState[senderId] = [];
                sendWhatsAppMessage(senderId, "📝 Please enter your full name:");
                break;
            case "3":
                locationSelectionState[senderId] = true;
                const locationList = Object.entries(officeLocations)
                    .map(([key, location]) => `${key}️⃣ ${location.name}`)
                    .join("\n");
                sendWhatsAppMessage(senderId, `🏢 Please select a location:\n${locationList}`);
                break;
            case "4":
                ticketCreationStates[senderId] = [];
                sendWhatsAppMessage(senderId, "📝 Please enter your full name:");
                break;
            case "5":
                ticketCreationStatess[senderId] = [];
                sendWhatsAppMessage(senderId, "📝 Please enter your full name:");
                break;
            case "6":
                liveAgentState[senderId] = true;

                // Reset session status in the database
                await Session.updateOne(
                    { senderId },
                    { $set: { isSessionClosed: false, sessionClosedByUser: false } },
                    { upsert: true }
                );

                sendWhatsAppMessage(senderId, "You are now connected to a live agent. Please type your message. Type 'EXIT' to end the session.");
                break;
            default:
                sendWhatsAppMessage(senderId, welcomeMessage);
        }

        await User.updateOne(
            { senderId },
            { $set: { name: userName, lastMessage: userMessage, lastTimestamp: new Date() }, $inc: { newMessages: 1 } },
            { upsert: true }
        );

        // Update the last message timestamp
        await Chat.updateOne(
            { senderId },
            { $set: { lastMsgTimestamp: new Date() } },
            { upsert: true }
        );
    }
    res.sendStatus(200);
});

// Function to create a ticket
async function createTicket(senderId, ticketData, attempt = 1) {
    try {
        const options = {
            method: 'POST',
            url: `${FRAPPE_URL}/api/resource/HD%20Ticket`,
            headers: {
                "Authorization": `token ${API_KEY}:${API_SECRET}`,
                "Content-Type": "application/json",
               "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/109.0.0.0 Safari/537.36",
               "Accept": "application/json, text/javascript, */*; q=0.01",
               "Accept-Language": "en-US,en;q=0.9"
       
            },
            body: JSON.stringify(ticketData)
        };

        const response = await cloudscraper(options);
        sendWhatsAppMessage(senderId, "✅ Your query has been received. Our team will contact you very soon. \n Enter *EXIT* for Main Menu");

        // Emit event to frontend
        io.emit('ticketCreated', { senderId, ticketData });

        console.log("📌 Ticket created successfully:", response);
    } catch (error) {
        console.error("🚨 Error creating ticket:", error.message);
        if (attempt < 2) { // You can change 2 to however many attempts you want.
            sendWhatsAppMessage(senderId, "⚠️ Please wait While we are submitting your request to our customer service agent... ");
            setTimeout(() => {
              createTicket(senderId, ticketData, attempt + 1);
            }, 10000); // 10,000 milliseconds = 10 seconds
          } else {
            sendWhatsAppMessage(senderId, "⚠️ Failed to create request after multiple attempts. Please try again later. \n0️⃣ Main Menu");
          }
    }
}
// Function to send a WhatsApp message
async function sendWhatsAppMessage(to, message) {
    const payload = {
        messaging_product: 'whatsapp',
        to: to,
        type: 'text',
        text: { body: message }
    };

    try {
        const response = await axios.post(WHATSAPP_API_URL, payload, {
            headers: {
                Authorization: `Bearer ${ACCESS_TOKEN}`,
                'Content-Type': 'application/json',
            },
        });
        console.log('✅ Message sent successfully:', JSON.stringify(response.data, null, 2));
    } catch (error) {
        console.error('❌ Error sending message:', error.response ? error.response.data : error.message);
    }
}

// Function to get the image URL from WhatsApp API
async function getMediaUrl(mediaId) {
    try {
        // Step 1: Get the media URL from WhatsApp
        const mediaResponse = await axios.get(`https://graph.facebook.com/v13.0/${mediaId}`, {
            headers: { Authorization: `Bearer ${ACCESS_TOKEN}` },
        });

        const mediaUrl = mediaResponse.data.url;

        // Step 2: Download the image using the media URL
        const imageResponse = await axios.get(mediaUrl, {
            headers: { Authorization: `Bearer ${ACCESS_TOKEN}` },
            responseType: "arraybuffer",
        });

        const base64Image = Buffer.from(imageResponse.data, "binary").toString("base64");
        return `data:${imageResponse.headers["content-type"]};base64,${base64Image}`;
    } catch (error) {
        console.error("Error fetching media:", error);
        return null;
    }
}

app.use(express.static(path.join(__dirname, 'public')));

const liveAgents = new Set(); // Track live agents connected via socket

const agentSchema = new mongoose.Schema({
    name: String,
    email: String,
    status: { type: String, default: 'logged out' },
    lastActive: { type: Date, default: Date.now } // Track last active timestamp
});

const Agent = mongoose.model('Agent', agentSchema);

// Clear all previously logged-in agents from the database on server start
async function clearLoggedInAgents() {
    await Agent.updateMany({}, { $set: { status: 'logged out' } });
    console.log('Cleared all previously logged-in agents from the database.');
}
clearLoggedInAgents();

// Periodically check for inactive agents
setInterval(async () => {
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    await Agent.updateMany(
        { status: 'logged in', lastActive: { $lt: fiveMinutesAgo } },
        { $set: { status: 'logged out' } }
    );
    const loggedInAgents = await Agent.find({ status: 'logged in' }, 'name');
    io.emit('liveAgentsUpdated', loggedInAgents.map(agent => agent.name)); // Notify all clients
}, 60 * 1000); // Run every 1 minute

io.on('connection', (socket) => {
    console.log('Agent connected');

    socket.on('agentLoggedIn', async (agentName) => {
        socket.agentName = agentName; // Store agent name in the socket
        await Agent.updateOne(
            { name: agentName },
            { $set: { status: 'logged in', lastActive: new Date() } },
            { upsert: true }
        );
        const loggedInAgents = await Agent.find({ status: 'logged in' }, 'name');
        io.emit('liveAgentsUpdated', loggedInAgents.map(agent => agent.name)); // Notify all clients
    });

    socket.on('agentActivity', async (agentName) => {
        await Agent.updateOne(
            { name: agentName },
            { $set: { lastActive: new Date() } }
        );
    });

    socket.on('agentLoggedOut', async (agentName) => {
        await Agent.updateOne({ name: agentName }, { $set: { status: 'logged out' } });
        const loggedInAgents = await Agent.find({ status: 'logged in' }, 'name');
        io.emit('liveAgentsUpdated', loggedInAgents.map(agent => agent.name)); // Notify all clients
    });

    socket.on('disconnect', async () => {
        if (socket.agentName) {
            await Agent.updateOne({ name: socket.agentName }, { $set: { status: 'logged out' } });
            const loggedInAgents = await Agent.find({ status: 'logged in' }, 'name');
            io.emit('liveAgentsUpdated', loggedInAgents.map(agent => agent.name)); // Notify all clients
        }
    });

    // Provide live agents list to clients
    socket.on('getLiveAgents', (callback) => {
        callback(Array.from(liveAgents).map(name => ({ name })));
    });

    // Emit the list of blocked users to the client
    socket.emit('blockedUsers', Array.from(blockedUsers));

    socket.on('sendMessage', async (data) => {
        const { senderId, message, agentName } = data;
        console.log('Sending message:', data);
        await sendWhatsAppMessage(senderId, message);
        const chat = new Chat({ senderId, message, sender: 'agent', name: agentName, lastMsgTimestamp: new Date() });
        await chat.save();
        await User.updateOne({ senderId }, { $set: { lastMessage: message, lastTimestamp: new Date() } });
        io.emit('newMessage', { senderId, message, sender: 'agent', timestamp: new Date().toLocaleString(), name: agentName }); // Include agent's name
    });

    socket.on('deleteMessage', async (senderId) => {
        console.log('Deleting messages for user:', senderId);
        await Chat.deleteMany({ senderId });
        io.emit('messagesDeleted', senderId);
    });

    socket.on('changeStatus', async (data) => {
        const { id, status } = data;
        console.log('Changing status:', data);
        await Chat.findByIdAndUpdate(id, { status });
        io.emit('statusChanged', { id, status });
    });

    socket.on('getMessages', async (senderId, callback) => {
        try {
            console.log('Fetching messages for user:', senderId);
            const messages = await Chat.find({ senderId }).sort({ timestamp: 1 });
            console.log('Messages fetched:', messages);
            callback(messages);
        } catch (error) {
            console.error('Error fetching messages:', error);
        }
    });

    socket.on('getAllUsers', async (callback) => {
        try {
            console.log('Fetching all users');
            const users = await User.find().sort({ lastTimestamp: -1 });
            callback(users.map(user => ({
                senderId: user.senderId,
                name: user.name,
                newMessages: user.newMessages,
                lastMessage: user.lastMessage,
                lastTimestamp: user.lastTimestamp
            })));
        } catch (error) {
            console.error('Error fetching users:', error);
        }
    });

    socket.on('clearNotifications', async (senderId) => {
        try {
            await User.updateOne({ senderId }, { $set: { newMessages: 0 } });
            console.log(`Notifications cleared for user: ${senderId}`);
        } catch (error) {
            console.error('Error clearing notifications:', error);
        }
    });

    socket.on('closeChat', async (senderId) => {
        console.log('Closing chat for user:', senderId);
        delete liveAgentState[senderId];
        sendWhatsAppMessage(senderId, "The chat has been closed by the agent. You can now use the menu options again. \n0️⃣ Main Menu");
    });

    socket.on('blockUser', (senderId) => {
        console.log('Blocking user:', senderId);
        blockedUsers.add(senderId);
        io.emit('blockedUsers', Array.from(blockedUsers)); // Emit updated list of blocked users
    });

    socket.on('unblockUser', (senderId) => {
        console.log('Unblocking user:', senderId);
        blockedUsers.delete(senderId);
        io.emit('blockedUsers', Array.from(blockedUsers)); // Emit updated list of blocked users
    });

    socket.on('createLiveSession', async (senderId) => {
        console.log('Creating live session for user:', senderId);
        await Session.updateOne(
            { senderId },
            { $set: { isSessionClosed: false, sessionClosedByUser: false } },
            { upsert: true }
        );

        // Update the user's state to reflect the live session
        liveAgentState[senderId] = true; // Set the user state to live agent mode
        await User.updateOne(
            { senderId },
            { $set: { lastMessage: "Live session started", lastTimestamp: new Date() } },
            { upsert: true }
        );

        sendWhatsAppMessage(senderId, "A live session has been created. You can now chat with the agent.");
        io.emit('liveSessionCreated', { senderId }); // Notify the frontend about the live session creation
    });

    socket.on('disconnect', () => {
        console.log('Agent disconnected');
    });
});

app.post('/create-ticket', async (req, res) => {
    const { senderId, customerName, email, mobile, ticketType, trackingNumber, accountNumber, description } = req.body;

    const ticketTypeMap = {
        "1": "Commodity Information",
        "2": "Customs Requirements / Paper Work",
        "3": "Product Inquiry",
        "4": "Transit Time",
        "5": "Corporate or Business Account",
        "6": "Rate Inquiry CS" // Add mapping for "6"
    };

    const formattedTicketType = ticketTypeMap[ticketType] || ticketType;

    const ticketData = {
        custom_customer_name: customerName,
        subject: "Whatsapp General Query",
        raised_by: email,
        agent_group: "Customer Support",
        custom_employee: "WebAPI",
        ticket_type: formattedTicketType,
        description: description,
        custom_customer_email_address: email,
        custom_customer_contact_number: mobile
    };

    if (trackingNumber.toLowerCase() !== '0') {
        ticketData.custom_tracking_number_if_any = trackingNumber;
    }
    if (accountNumber.toLowerCase() !== '0') {
        ticketData.custom_customer_account_number = accountNumber;
    }

    try {
        await createTicket(senderId, ticketData);
        res.status(200).send('Ticket created successfully');
    } catch (error) {
        console.error('Error creating ticket:', error);
        res.status(500).send('Failed to create ticket');
    }
});

app.get('/get-user-details', async (req, res) => {
    const { senderId } = req.query;

    try {
        const user = await User.findOne({ senderId });
        const chats = await Chat.find({ senderId });

        if (user) {
            let email = '';
            let trackingNumber = '';
            let mobile = '';

            // Extract email, tracking number, and mobile from chat history
            chats.forEach(chat => {
                if (!email && chat.message && chat.message.includes('@') && chat.message.includes('.com')) {
                    const emailMatch = chat.message.match(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/);
                    if (emailMatch) email = emailMatch[0];
                }
                if (!trackingNumber && chat.message && chat.message.match(/\b1Z[A-Z0-9]{16,18}\b/)) {
                    const trackingMatch = chat.message.match(/\b1Z[A-Z0-9]{16,18}\b/);
                    if (trackingMatch) trackingNumber = trackingMatch[0];
                }
                if (!mobile && chat.message && chat.message.match(/^(0\d{3}-?\d{6,10}|3\d{9,10}|92\d{10,12})$/)) {
                    const mobileMatch = chat.message.match(/^(0\d{3}-?\d{6,10}|3\d{9,10}|92\d{10,12})$/);
                    if (mobileMatch) mobile = mobileMatch[0];
                }
            });

            const userDetails = {
                name: user.name,
                email: email || user.email,
                mobile: mobile || user.mobile,
                trackingNumber: trackingNumber
            };
            res.status(200).json(userDetails);
        } else {
            res.status(404).send('User not found');
        }
    } catch (error) {
        console.error('Error fetching user details:', error);
        res.status(500).send('Failed to fetch user details');
    }
});

app.post('/login', async (req, res) => {
    const { username, password } = req.body;
    try {
        const user = await Login.findOne({ email: username });
        if (user) {
            // Check if the provided password matches the main password or the temporary password
            const isMainPasswordValid = await bcrypt.compare(password, user.password);
            const isTempPasswordValid = user.tempPassword && await bcrypt.compare(password, user.tempPassword);

            if (isMainPasswordValid) {
                console.log(`User logged in with main password: ${user.name}`);
                res.status(200).json({ name: user.name, isAdmin: user.isAdmin });
            } else if (isTempPasswordValid) {
                console.log(`User logged in with temporary password: ${user.name}`);
                // Overwrite the main password with the temporary password
                await Login.updateOne(
                    { email: username },
                    { $set: { password: user.tempPassword }, $unset: { tempPassword: "" } }
                );
                res.status(200).json({ name: user.name, isAdmin: user.isAdmin });
            } else {
                res.status(401).send('Invalid credentials.');
            }
        } else {
            res.status(404).send('User not found.');
        }
    } catch (error) {
        console.error('Error during login:', error);
        res.status(500).send('Internal server error.');
    }
});

app.post('/add-user', async (req, res) => {
    const { name, email, password } = req.body;
    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = new Login({ name, email, password: hashedPassword });
        await newUser.save();
        res.status(200).send('User added successfully');
    } catch (error) {
        console.error('Error adding user:', error);
        res.status(500).send('Internal server error');
    }
});

app.post('/remove-user', async (req, res) => {
    const { email } = req.body;
    const hardcodedAdmins = ['shahzadahmed@ups.com', 'mraza@ups.com'];
    if (hardcodedAdmins.includes(email)) {
        return res.status(403).send('Cannot remove hardcoded admin user');
    }
    try {
        await Login.deleteOne({ email });
        res.status(200).send('User removed successfully');
    } catch (error) {
        console.error('Error removing user:', error);
        res.status(500).send('Internal server error');
    }
});

app.post('/make-admin', async (req, res) => {
    const { email } = req.body;
    try {
        await Login.updateOne({ email }, { $set: { isAdmin: true } });
        res.status(200).send('User promoted to admin successfully');
    } catch (error) {
        console.error('Error promoting user to admin:', error);
        res.status(500).send('Internal server error');
    }
});

app.post('/change-admin-password', async (req, res) => {
    const { newPassword } = req.body;
    try {
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        await Login.updateOne({ email: 'admin' }, { $set: { password: hashedPassword } });
        res.status(200).send('Admin password changed successfully');
    } catch (error) {
        console.error('Error changing admin password:', error);
        res.status(500).send('Internal server error');
    }
});

app.get('/view-users', async (req, res) => {
    try {
        const users = await Login.find({}, 'name email isAdmin');
        res.status(200).json(users);
    } catch (error) {
        console.error('Error fetching users:', error);
        res.status(500).send('Internal server error');
    }
});

app.post('/reset-password', async (req, res) => {
    const { email, oldPassword, newPassword } = req.body;
    try {
        const user = await Login.findOne({ email });
        if (user && await bcrypt.compare(oldPassword, user.password)) {
            const hashedPassword = await bcrypt.hash(newPassword, 10);
            await Login.updateOne({ email }, { $set: { password: hashedPassword } });
            res.status(200).send('Password reset successfully');
        } else {
            res.status(401).send('Invalid email or old password');
        }
    } catch (error) {
        console.error('Error resetting password:', error);
        res.status(500).send('Internal server error');
    }
});

app.post('/forget-password', async (req, res) => {
    const { email } = req.body;
    try {
        const user = await Login.findOne({ email });
        if (user) {
            const newPassword = Math.random().toString(36).slice(-8); // Generate a random password
            const hashedTempPassword = await bcrypt.hash(newPassword, 10);

            // Save the temporary password in the database
            await Login.updateOne({ email }, { $set: { tempPassword: hashedTempPassword } });

            // Send the new password using Postmark
            try {
                await postmarkClient.sendEmail({
                    From: 'info@ulspakistan.com',
                    To: email,
                    Subject: 'Your Temporary Password',
                    HtmlBody: `<p>Your temporary password is: <strong>${newPassword}</strong></p><p>Please log in with this password to activate it.</p>`
                });
                res.status(200).send('Temporary password sent successfully.');
            } catch (error) {
                console.error('Error sending email via Postmark:', error);
                res.status(500).send('Failed to send email.');
            }
        } else {
            res.status(404).send('Email not found.');
        }
    } catch (error) {
        console.error('Error during forget-password:', error);
        res.status(500).send('Internal server error.');
    }
});

app.get('/check-session-status', async (req, res) => {
    const { senderId } = req.query;
    try {
        const session = await Session.findOne({ senderId });
        if (session && session.isSessionClosed) {
            res.status(200).json({ isSessionClosed: true, sessionClosedByUser: session.sessionClosedByUser });
        } else {
            res.status(200).json({ isSessionClosed: false });
        }
    } catch (error) {
        console.error('Error checking session status:', error);
        res.status(500).send('Internal server error');
    }
});

app.post('/reset-hardcoded-admin-password', async (req, res) => {
    const { email, newPassword } = req.body;
    const hardcodedAdmins = ['shahzadahmed@ups.com', 'mraza@ups.com'];

    if (!hardcodedAdmins.includes(email)) {
        return res.status(403).send('This endpoint is only for hardcoded admin users.');
    }

    try {
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        await Login.updateOne({ email }, { $set: { password: hashedPassword } });
        res.status(200).send(`Password for ${email} has been reset successfully.`);
    } catch (error) {
        console.error('Error resetting hardcoded admin password:', error);
        res.status(500).send('Failed to reset password.');
    }
});

app.get('/export-customers', async (req, res) => {
    try {
        const users = await User.find({}, 'name senderId'); // Fetch name and senderId (number)
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Customers');

        worksheet.columns = [
            { header: 'Name', key: 'name', width: 30 },
            { header: 'Number', key: 'senderId', width: 20 }
        ];

        worksheet.addRows(users);

        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', 'attachment; filename=customers.xlsx');

        await workbook.xlsx.write(res);
        res.end();
    } catch (error) {
        console.error('Error exporting customers:', error);
        res.status(500).send('Failed to export customers');
    }
});

app.get('/get-reports-data', async (req, res) => {
    try {
        // Fetch chat data for the last 30, 7, and 1 days
        const now = new Date();
        const chatsGraph = {
            labels: ['Last 30 Days', 'Last 7 Days', 'Last 1 Day'],
            values: [
                await Chat.countDocuments({ timestamp: { $gte: new Date(now - 30 * 24 * 60 * 60 * 1000) } }),
                await Chat.countDocuments({ timestamp: { $gte: new Date(now - 7 * 24 * 60 * 60 * 1000) } }),
                await Chat.countDocuments({ timestamp: { $gte: new Date(now - 1 * 24 * 60 * 60 * 1000) } })
            ]
        };

        // Fetch agent replies data
        const agentReplies = await Chat.aggregate([
            { $match: { sender: 'agent' } },
            { $group: { _id: '$name', count: { $sum: 1 } } }
        ]);
        const agentRepliesData = {
            agents: agentReplies.map(a => a._id),
            values: agentReplies.map(a => a.count)
        };

        // Fetch tracking stats
        const trackingStats = {
            values: [
                await Chat.countDocuments({ message: { $regex: /\b1Z[A-Z0-9]{16,18}\b/ } }),
                await Chat.countDocuments({ message: { $not: { $regex: /\b1Z[A-Z0-9]{16,18}\b/ } } })
            ]
        };

        // Fetch agent login frequency
        const agentLoginStats = await Agent.aggregate([
            { $group: { _id: '$name', count: { $sum: 1 } } }
        ]);
        const agentLoginData = {
            agents: agentLoginStats.map(a => a._id),
            values: agentLoginStats.map(a => a.count)
        };

        // Fetch total customers data for the last 30 days
        const totalCustomersGraph = {
            labels: ['Last 30 Days'],
            values: [
                await User.countDocuments({ lastTimestamp: { $gte: new Date(now - 30 * 24 * 60 * 60 * 1000) } })
            ]
        };

        res.status(200).json({
            chatsGraph,
            agentReplies: agentRepliesData,
            trackingStats,
            agentLoginStats: agentLoginData,
            totalCustomersGraph // Include new data
        });
    } catch (error) {
        console.error('Error fetching reports data:', error);
        res.status(500).send('Failed to fetch reports data');
    }
});

const quickReplySchema = new mongoose.Schema({
    message: String
});

const QuickReply = mongoose.model('QuickReply', quickReplySchema);

// Fetch all quick replies
app.get('/quick-replies', async (req, res) => {
    try {
        const quickReplies = await QuickReply.find();
        res.status(200).json(quickReplies);
    } catch (error) {
        console.error('Error fetching quick replies:', error);
        res.status(500).send('Failed to fetch quick replies');
    }
});

// Add a new quick reply
app.post('/quick-replies', async (req, res) => {
    const { message } = req.body;
    try {
        const newQuickReply = new QuickReply({ message });
        await newQuickReply.save();
        res.status(201).json(newQuickReply);
    } catch (error) {
        console.error('Error adding quick reply:', error);
        res.status(500).send('Failed to add quick reply');
    }
});

// Remove a quick reply
app.delete('/quick-replies/:id', async (req, res) => {
    const { id } = req.params;
    try {
        await QuickReply.findByIdAndDelete(id);
        res.status(200).send('Quick reply removed successfully');
    } catch (error) {
        console.error('Error removing quick reply:', error);
        res.status(500).send('Failed to remove quick reply');
    }
});

http.listen(port, () => {
    console.log(`🚀 Server is running on http://localhost:${port}`);
});
