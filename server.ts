require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Enable CORS so Telegram WebApp can securely communicate with your server
app.use(cors({ origin: '*' }));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Global configuration variables managed via Admin Panel
let adminConfig = {
    telegramBotToken: process.env.BOT_TOKEN || "8929895559:AAF4HlwMMgwTh4jhxiC7imrP3X5FKCZL2iA",
    paymentApiLink: "https://vsvpay.com", // Default gateway link
    allowedGateways: ["UPI", "ULTRA_PAY", "VSV", "COMING_SOON"] // Removed all other options
};

// Mock Database Users for verification
const mockUsers = {
    "6601602327": { balance: 2550.00, token: "session_token_xyz_123" }
};

// 1. API: Validate Session Token and Check User Balance
app.post('/api/wallet/balance', (req, res) => {
    const { userId, token } = req.body;

    if (!userId || !token) {
        return res.status(400).json({ error: "Missing required identification parameters" });
    }

    const user = mockUsers[userId];
    if (!user || user.token !== token) {
        return res.status(401).json({ error: "Unauthorized access token or invalid user session" });
    }

    // Special monitoring context for your requested ID
    if (userId === "6601602327") {
        console.log(`[Admin Log] Protected User ID 6601602327 checked balance: ${user.balance}`);
    }

    res.json({
        userId: userId,
        balance: user.balance,
        gateways: adminConfig.allowedGateways
    });
});

// 2. API: Process Withdrawal Requests
app.post('/api/wallet/withdraw', (req, res) => {
    const { userId, amount, gateway, paymentAddress } = req.body;

    if (!adminConfig.allowedGateways.includes(gateway) || gateway === "COMING_SOON") {
        return res.status(400).json({ error: "Selected withdrawal gateway option is strictly disabled." });
    }

    const user = mockUsers[userId];
    if (!user || user.balance < amount) {
        return res.status(400).json({ error: "Insufficient wallet balance to perform transaction." });
    }

    // Process logic using the api link configured in admin settings
    console.log(`Routing ${amount} withdrawal via ${gateway} endpoint: ${adminConfig.paymentApiLink}`);
    user.balance -= amount; // Deduct balance

    res.json({ success: true, message: `Withdrawal successfully requested via ${gateway}.`, newBalance: user.balance });
});

// 3. API: Admin Panel Configurations Updates
app.post('/api/admin/config', (req, res) => {
    const { botToken, apiLink } = req.body;
    
    if (botToken) adminConfig.telegramBotToken = botToken;
    if (apiLink) adminConfig.paymentApiLink = apiLink;

    res.json({ success: true, message: "Admin system configurations successfully updated.", currentSettings: adminConfig });
});

app.listen(PORT, () => {
    console.log(`Panthet Wallet Server running successfully on port ${PORT}`);
});
