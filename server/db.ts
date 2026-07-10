import mongoose from 'mongoose';

export async function connectDB() {
  const uri = process.env.MONGO_URI;
  if (!uri) {
    console.warn('MONGO_URI is not defined in environment variables. Running in disconnected mode.');
    return;
  }

  try {
    await mongoose.connect(uri);
    console.log('MongoDB Connected');
  } catch (error) {
    console.error('MongoDB connection error:', error);
  }
}
