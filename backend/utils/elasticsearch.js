const { Client } = require('@elastic/elasticsearch');
const logger = require('./logger');
const { ELASTICSEARCH_URL = 'http://localhost:9200' } = process.env;

const client = new Client({ node: ELASTICSEARCH_URL });

const PRODUCT_INDEX = 'products';

async function ensureIndex() {
  try {
    const exists = await client.indices.exists({ index: PRODUCT_INDEX });
    if (!exists) {
      await client.indices.create({
        index: PRODUCT_INDEX,
        body: {
          mappings: {
            properties: {
              name: { type: 'text', analyzer: 'standard' },
              description: { type: 'text', analyzer: 'standard' },
              category: { type: 'keyword' },
              subcategory: { type: 'keyword' },
              model: { type: 'keyword' },
              color: { type: 'keyword' },
              styleTheme: { type: 'keyword' },
              sellerName: { type: 'keyword' },
              businessName: { type: 'keyword' },
              price: { type: 'float' },
              stock: { type: 'integer' },
              createdAt: { type: 'date' },
              updatedAt: { type: 'date' }
            }
          },
          settings: {
            analysis: {
              analyzer: {
                autocomplete: {
                  tokenizer: 'autocomplete',
                  filter: ['lowercase']
                }
              },
              tokenizer: {
                autocomplete: {
                  type: 'edge_ngram',
                  min_gram: 2,
                  max_gram: 20
                }
              }
            }
          }
        }
      });
      logger.info(`Created index ${PRODUCT_INDEX}`);
    }
  } catch (error) {
    logger.error('Index creation failed:', error);
  }
}

async function indexProduct(product) {
  try {
    await client.index({
      index: PRODUCT_INDEX,
      id: product.id || product._id,
      body: {
        name: product.name,
        description: product.description || '',
        category: product.category,
        subcategory: product.subcategory || '',
        model: product.model || '',
        color: product.color || '',
        styleTheme: product.styleTheme || '',
        sellerName: product.sellerName,
        businessName: product.businessName,
        price: parseFloat(product.price || 0),
        stock: parseInt(product.stock || 0),
        createdAt: product.createdAt,
        updatedAt: product.updatedAt || new Date().toISOString()
      }
    });
  } catch (error) {
    logger.error('Product indexing failed:', error);
  }
}

async function deleteProduct(productId) {
  try {
    await client.delete({
      index: PRODUCT_INDEX,
      id: productId
    });
  } catch (error) {
    logger.error('Product delete failed:', error);
  }
}

async function searchProducts({ query = '', category = '', business = '', page = 1, limit = 20 }) {
  const body = {
    query: {
      bool: {
        must: [
          {
            multi_match: {
              query,
              fields: ['name^3', 'description', 'category', 'subcategory', 'model', 'color', 'styleTheme'],
              type: 'best_fields',
              fuzziness: 'AUTO'
            }
          }
        ],
        filter: []
      }
    },
    aggs: {
      categories: {
        terms: { field: 'category.keyword', size: 10 }
      },
      businesses: {
        terms: { field: 'businessName.keyword', size: 10 }
      }
    },
    from: (page - 1) * limit,
    size: limit
  };

  if (category) body.query.bool.filter.push({ term: { 'category.keyword': category } });
  if (business) body.query.bool.filter.push({ term: { 'businessName.keyword': business } });

  const result = await client.search({ index: PRODUCT_INDEX, body });
  return {
    products: result.hits.hits.map(hit => hit._source),
    total: result.hits.total.value,
    aggregations: {
      categories: result.aggregations.categories.buckets,
      businesses: result.aggregations.businesses.buckets
    }
  };
}

module.exports = {
  client,
  PRODUCT_INDEX,
  ensureIndex,
  indexProduct,
  deleteProduct,
  searchProducts
};

