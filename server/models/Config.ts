import mongoose from 'mongoose';

const configSchema = new mongoose.Schema({
  key: { type: String, required: true, unique: true },
  ultraPayEndpoint: { type: String, default: '' },
  ultraPayToken: { type: String, default: '' },
  vsvEndpoint: { type: String, default: '' },
  vsvToken: { type: String, default: '' },
  minWithdrawal: { type: Number, default: 100 },
  maxWithdrawal: { type: Number, default: 10000 },
  proofChannel: { type: String, default: '' }
});

export const Config = mongoose.models.Config || mongoose.model('Config', configSchema);
