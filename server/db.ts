import mongoose from 'mongoose';

export async function connectDB() {
  const uri = process.env.MONGO_URI;
  if (!uri || uri.includes('...')) {
    console.warn('Real MONGO_URI is not defined. Please configure it in your Secrets.');
    return;
  }

  try {
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 5000,
    });
    console.log('MongoDB Connected');
  } catch (error) {
    console.warn('MongoDB connection warning: Could not connect to the database. Please ensure your IP is whitelisted in MongoDB Atlas or check your MONGO_URI.');
  }
}
