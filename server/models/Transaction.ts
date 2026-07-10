import mongoose from 'mongoose';

const transactionSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  amount: { type: Number, required: true },
  gateway: { type: String, enum: ['UPI', 'ULTRA_PAY', 'VSV'], required: true },
  accountId: { type: String, required: true },
  status: { type: String, enum: ['Pending', 'Success', 'Rejected'], default: 'Pending' },
  txId: { type: String, required: true, unique: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

transactionSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

export const Transaction = mongoose.models.Transaction || mongoose.model('Transaction', transactionSchema);
