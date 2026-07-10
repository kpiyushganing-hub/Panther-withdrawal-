import { Router, Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { User } from '../models/User.js';
import { Transaction } from '../models/Transaction.js';
import { Config } from '../models/Config.js';
import { sendTelegramProof } from '../services/telegram.js';
import crypto from 'crypto';

const router = Router();

// Middleware to authenticate admin (simplified for demo: checking static password or JWT)
// Real implementation should have a proper admin login, but we'll create a basic one.
const ADMIN_PASSWORD = 'admin'; // Hardcoded for demo, normally hashed in DB
const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret';

router.post('/admin/login', (req, res) => {
  const { password } = req.body;
  if (password === ADMIN_PASSWORD) {
    const token = jwt.sign({ role: 'admin' }, JWT_SECRET, { expiresIn: '1d' });
    res.json({ token });
  } else {
    res.status(401).json({ error: 'Invalid credentials' });
  }
});

const authAdmin = (req: Request, res: Response, next: NextFunction) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Unauthorized' });
  try {
    jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
};

// --- User Routes ---
// Mock endpoint to register/login via Telegram WebApp initData
router.post('/auth/telegram', async (req: Request, res: Response) => {
  const { initData } = req.body;
  // In a real app, validate initData using BOT_TOKEN
  // For demo, we assume initData is a parsed JSON of the user
  if (!initData || !initData.id) return res.status(400).json({ error: 'Invalid data' });
  
  try {
    let user = await User.findOne({ telegramId: initData.id.toString() });
    if (!user) {
      user = new User({
        telegramId: initData.id.toString(),
        username: initData.username || '',
        firstName: initData.first_name || 'User',
        balance: 5000 // Give initial balance for demo
      });
      await user.save();
    }
    const token = jwt.sign({ userId: user._id }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, user });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

const authUser = (req: any, res: Response, next: NextFunction) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Unauthorized' });
  try {
    const decoded: any = jwt.verify(token, JWT_SECRET);
    req.userId = decoded.userId;
    next();
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
};

router.get('/user/me', authUser, async (req: any, res: Response) => {
  try {
    const user = await User.findById(req.userId);
    res.json(user);
  } catch {
    res.status(500).json({ error: 'Server error' });
  }
});

// Payout request
router.post('/withdraw', authUser, async (req: any, res: Response) => {
  const { amount, gateway, accountId } = req.body;
  
  try {
    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ error: 'User not found' });
    
    let config = await Config.findOne({ key: 'main' });
    if (!config) {
      config = new Config({ key: 'main' });
      await config.save();
    }

    if (amount < config.minWithdrawal || amount > config.maxWithdrawal) {
      return res.status(400).json({ error: `Amount must be between ${config.minWithdrawal} and ${config.maxWithdrawal}` });
    }

    if (user.balance < amount) {
      return res.status(400).json({ error: 'Insufficient balance' });
    }

    // Validate UPI
    if (gateway === 'UPI' && !accountId.includes('@')) {
      return res.status(400).json({ error: 'Invalid UPI ID format' });
    }

    const txId = crypto.randomBytes(8).toString('hex');
    let status = 'Pending';

    // Auto-process ULTRA_PAY and VSV if configured (mock API call)
    if (gateway === 'ULTRA_PAY' || gateway === 'VSV') {
      const endpoint = gateway === 'ULTRA_PAY' ? config.ultraPayEndpoint : config.vsvEndpoint;
      const token = gateway === 'ULTRA_PAY' ? config.ultraPayToken : config.vsvToken;
      
      if (endpoint && token) {
        // Mock external API call
        // const response = await fetch(endpoint, { method: 'POST', headers: { Authorization: `Bearer ${token}` } });
        // if (response.ok) status = 'Success';
        
        // Simulating immediate success for automated proxies
        status = 'Success';
      } else {
        return res.status(400).json({ error: `${gateway} gateway is not configured by admin.` });
      }
    }

    // Deduct balance and create transaction
    user.balance -= amount;
    await user.save();

    const tx = new Transaction({
      userId: user._id,
      amount,
      gateway,
      accountId,
      status,
      txId
    });
    await tx.save();

    if (status === 'Success') {
      const mask = accountId.substring(0, accountId.length - 4).replace(/./g, '*') + accountId.slice(-4);
      const msg = `✅ <b>New Payout Successful!</b>\n👤 <b>User Identifier:</b> ${mask}\n💰 <b>Amount Credited:</b> ₹${amount}\n💳 <b>Channel Engine:</b> ${gateway}\n🆔 <b>Tx ID:</b> ${txId}`;
      await sendTelegramProof(msg, config.proofChannel);
    }

    res.json({ success: true, transaction: tx, newBalance: user.balance });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/transactions', authUser, async (req: any, res: Response) => {
  const txs = await Transaction.find({ userId: req.userId }).sort({ createdAt: -1 });
  res.json(txs);
});

// --- Admin Routes ---
router.get('/admin/stats', authAdmin, async (req, res) => {
  const usersCount = await User.countDocuments();
  const txs = await Transaction.find();
  const totalPayout = txs.filter(t => t.status === 'Success').reduce((sum, t) => sum + t.amount, 0);
  res.json({ usersCount, totalPayout });
});

router.get('/admin/users', authAdmin, async (req, res) => {
  const users = await User.find().sort({ createdAt: -1 });
  res.json(users);
});

router.put('/admin/users/:id/balance', authAdmin, async (req, res) => {
  const { balance } = req.body;
  const user = await User.findByIdAndUpdate(req.params.id, { balance }, { new: true });
  res.json(user);
});

router.get('/admin/transactions', authAdmin, async (req, res) => {
  const txs = await Transaction.find().populate('userId').sort({ createdAt: -1 });
  res.json(txs);
});

router.post('/admin/transactions/:id/status', authAdmin, async (req, res) => {
  const { status } = req.body;
  const tx = await Transaction.findById(req.params.id).populate('userId');
  if (!tx) return res.status(404).json({ error: 'Transaction not found' });
  
  if (tx.status === 'Pending' && status === 'Rejected') {
    // Refund user
    const user = await User.findById(tx.userId._id);
    user.balance += tx.amount;
    await user.save();
  }

  tx.status = status;
  await tx.save();

  if (status === 'Success') {
    const config = await Config.findOne({ key: 'main' });
    const accountId = tx.accountId;
    const mask = accountId.substring(0, accountId.length - 4).replace(/./g, '*') + accountId.slice(-4);
    const msg = `✅ <b>New Payout Successful!</b>\n👤 <b>User Identifier:</b> ${mask}\n💰 <b>Amount Credited:</b> ₹${tx.amount}\n💳 <b>Channel Engine:</b> ${tx.gateway}\n🆔 <b>Tx ID:</b> ${tx.txId}`;
    await sendTelegramProof(msg, config?.proofChannel || '');
  }

  res.json(tx);
});

router.get('/admin/config', authAdmin, async (req, res) => {
  let config = await Config.findOne({ key: 'main' });
  if (!config) {
    config = new Config({ key: 'main' });
    await config.save();
  }
  res.json(config);
});

router.put('/admin/config', authAdmin, async (req, res) => {
  const config = await Config.findOneAndUpdate({ key: 'main' }, req.body, { new: true, upsert: true });
  res.json(config);
});

export default router;
