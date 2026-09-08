/**
 * One-off migration: removes unique indexes left over from earlier schema
 * versions (email, usernameHash) that block registration.
 *
 * This used to run on every database connection. Run it manually instead:
 *   cd backend && npx tsx src/scripts/dropLegacyIndexes.ts
 */
import dotenv from 'dotenv';
dotenv.config();

import mongoose from 'mongoose';
import { connectDB } from '../config/db';

const LEGACY_INDEXES = ['email_1', 'usernameHash_1'];

async function main() {
  await connectDB();

  const db = mongoose.connection.db;
  if (!db) throw new Error('No database handle after connect');

  const users = db.collection('users');
  for (const index of LEGACY_INDEXES) {
    try {
      await users.dropIndex(index);
      console.log(`Dropped index ${index}`);
    } catch {
      console.log(`Index ${index} not present, skipping`);
    }
  }

  await mongoose.disconnect();
}

main().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
