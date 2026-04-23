const devAppDataStore = require('../utils/devAppDataStore');
const { ensureIndex, indexProduct } = require('../utils/elasticsearch');
const logger = require('../utils/logger');

async function seedElasticsearch() {
  try {
    await ensureIndex();
    
    const appData = await devAppDataStore.readAppData();
    const products = appData.moduleData?.ecommerceProducts || [];
    
    logger.info(`Seeding ${products.length} starter products to Elasticsearch`);
    
    for (const product of products) {
      await indexProduct(product);
    }
    
    logger.info('Elasticsearch seeding complete');
  } catch (error) {
    logger.error('Seeding failed:', error);
  }
}

seedElasticsearch();

