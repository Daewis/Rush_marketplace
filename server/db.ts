//import 'dotenv/config';
import mongoose, { ConnectOptions } from 'mongoose';

export async function connectDB() {
  if (mongoose.connection.readyState >= 1) {
    return;
  }

  const uri = process.env.MONGODB_URI;

  if (!uri) {
    console.error('❌ MONGODB_URI is not defined in your environment variables.');
    throw new Error('MONGODB_URI is required to start the server.');
  }

  const options: ConnectOptions = {
    serverSelectionTimeoutMS: 15000,
  };

  try {
    console.log('📡 Connecting to MongoDB Atlas...');
    await mongoose.connect(uri, options);
    console.log('✅ Connected to MongoDB Atlas successfully.');
  } catch (err: any) {
    console.error('❌ Failed to connect to MongoDB Atlas:');
    console.error(err.message);
    throw err;
  }
}

export async function disconnectDB() {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB.');
  }
}