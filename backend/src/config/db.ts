import mongoose from 'mongoose';

let isConnected = false;

export async function connectDB(): Promise<void> {
  if (isConnected) return;

  try {
    const uri = process.env.MONGODB_URI || 'mongodb+srv://boominathanalagirisamy_db_user:HLHgRVdXWDSRKZzl@ai-chatbot.ur8y9f3.mongodb.net/ai-chatbot?retryWrites=true&w=majority&appName=ai-chatbot';

    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 10000,
    });

    // Drop problematic unique indexes that cause registration errors
    // The User model only has username/password, but MongoDB may have
    // leftover indexes from previous schema versions
    if (mongoose.connection.db) {
      const users = mongoose.connection.db.collection('users');
      await users.dropIndex('email_1').catch(() => {});
      await users.dropIndex('usernameHash_1').catch(() => {});
    }

    isConnected = true;
    console.log('MongoDB connected');
  } catch (error) {
    console.error('MongoDB connection error:', error);
    throw error;
  }
}

mongoose.connection.on('error', (err) => {
  console.error('MongoDB connection error:', err);
});

mongoose.connection.on('disconnected', () => {
  isConnected = false;
  console.log('MongoDB disconnected');
});
