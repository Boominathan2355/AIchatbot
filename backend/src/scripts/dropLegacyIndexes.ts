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
import { connectDatabase, disconnectDatabase } from '../config/database';

const LEGACY_INDEXES = ['email_1', 'usernameHash_1'];

async function dropLegacyIndexes(): Promise<void> {
  await connectDatabase();

  const database = mongoose.connection.db;
  if (!database) throw new Error('No database handle after connect');

  const users = database.collection('users');
  for (const indexName of LEGACY_INDEXES) {
    try {
      await users.dropIndex(indexName);
      console.log(`Dropped index ${indexName}`);
    } catch {
      console.log(`Index ${indexName} not present, skipping`);
    }
  }

  await disconnectDatabase();
}

dropLegacyIndexes().catch((error) => {
  console.error('Migration failed:', error);
  process.exit(1);
});
