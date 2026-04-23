const mongoose = require('mongoose');
const connectDB = require('../config/db');
const logger = require('../utils/logger');

async function fixRemindersIndexes() {
  try {
    await connectDB();
    
    // Drop all indexes on reminders collection (except _id)
    const collection = mongoose.connection.db.collection('reminders');
    const indexes = await collection.indexes();
    
    logger.info('Current indexes:', indexes.map(idx => idx.name));
    
    for (const index of indexes) {
      if (index.name !== '_id_') {
        logger.info(`Dropping index: ${index.name}`);
        await collection.dropIndex(index.name);
      }
    }
    
    logger.info('All legacy indexes dropped');
    
    // Recreate correct indexes for String userId
    await collection.createIndex({ userId: 1, dueDate: 1 });
    await collection.createIndex({ userId: 1, completed: 1 });
    await collection.createIndex({ userId: 1, category: 1 });
    
    logger.info('✅ New String indexes created successfully');
    logger.info('ReminderAlert userId bug FIXED! Restart server and test.');
    
    process.exit(0);
  } catch (error) {
    logger.error('Fix failed:', error);
    process.exit(1);
  }
}

fixRemindersIndexes();

