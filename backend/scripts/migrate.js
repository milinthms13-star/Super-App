const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.join(__dirname, '..', '.env') });

const connectDB = require('../config/db');
const { migrateModuleDataToMongo } = require('../utils/moduleDataMigration');

const run = async () => {
  await connectDB();
  const result = await migrateModuleDataToMongo();
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  process.exit(0);
};

run().catch((error) => {
  process.stderr.write(`${error.stack || error.message || error}\n`);
  process.exit(1);
});
