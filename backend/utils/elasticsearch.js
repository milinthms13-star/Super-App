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
              id: { type: 'keyword' },
              name: { type: 'text', analyzer: 'standard' },
              description: { type: 'text', analyzer: 'standard' },
              category: { type: 'keyword' },
              subcategory: { type: 'keyword' },
              model: { type: 'keyword' },
              color: { type: 'keyword' },
              styleTheme: { type: 'keyword' },
              sellerName: { type: 'keyword' },
              sellerEmail: { type: 'keyword' },
              businessName: { type: 'keyword' },
              price: { type: 'float' },
              mrp: { type: 'float' },
              sellingPrice: { type: 'float' },
              discountAmount: { type: 'float' },
              discountPercentage: { type: 'float' },
              discountStartDate: { type: 'date' },
              discountEndDate: { type: 'date' },
              isDiscountActive: { type: 'boolean' },
              discountStatus: { type: 'keyword' },
              stock: { type: 'integer' },
              location: { type: 'keyword' },
              batchLocation: { type: 'keyword' },
              batchLabel: { type: 'keyword' },
              image: { type: 'keyword' },
              returnAllowed: { type: 'boolean' },
              returnWindowDays: { type: 'integer' },
              rating: { type: 'float' },
              reviews: { type: 'integer' },
              views: { type: 'integer' },
              clicks: { type: 'integer' },
              unitsSold: { type: 'integer' },
              flashSaleActive: { type: 'boolean' },
              flashSaleEndsAt: { type: 'date' },
              approvalStatus: { type: 'keyword' },
              isActive: { type: 'boolean' },
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
        id: product.id || product._id,
        name: product.name,
        description: product.description || '',
        category: product.category,
        subcategory: product.subcategory || '',
        model: product.model || '',
        color: product.color || '',
        styleTheme: product.styleTheme || '',
        sellerName: product.sellerName,
        sellerEmail: product.sellerEmail || '',
        businessName: product.businessName,
        price: parseFloat(product.price || 0),
        mrp: parseFloat(product.mrp || product.price || 0),
        sellingPrice: parseFloat(product.sellingPrice || product.price || 0),
        discountAmount: parseFloat(product.discountAmount || 0),
        discountPercentage: parseFloat(product.discountPercentage || 0),
        discountStartDate: product.discountStartDate || null,
        discountEndDate: product.discountEndDate || null,
        isDiscountActive: product.isDiscountActive === true,
        discountStatus: product.discountStatus || 'none',
        stock: parseInt(product.stock || 0),
        location: product.location || '',
        batchLocation: product.batchLocation || product.location || '',
        batchLabel: product.batchLabel || product.latestBatchLabel || '',
        image: product.image || '',
        returnAllowed: Boolean(product.returnAllowed),
        returnWindowDays: parseInt(product.returnWindowDays || 0, 10),
        rating: parseFloat(product.rating || 0),
        reviews: parseInt(product.reviews || product.reviewCount || 0, 10),
        views: parseInt(product.views || 0, 10),
        clicks: parseInt(product.clicks || 0, 10),
        unitsSold: parseInt(product.unitsSold || 0, 10),
        flashSaleActive: product.flashSaleActive === true || Boolean(product.flashSale?.saleId),
        flashSaleEndsAt: product.flashSaleEndsAt || product.flashSale?.endsAt || null,
        approvalStatus: product.approvalStatus || 'pending',
        isActive: product.isActive !== false,
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

async function searchProducts({
  query = '',
  category = '',
  business = '',
  seller = '',
  minPrice = '',
  maxPrice = '',
  minRating = '',
  inStock = '',
  sort = 'relevance',
  page = 1,
  limit = 20,
}) {
  const trimmedQuery = String(query || '').trim();
  const normalizedPage = Math.max(1, Number.parseInt(page, 10) || 1);
  const normalizedLimit = Math.max(1, Number.parseInt(limit, 10) || 20);
  const normalizedMinPrice = Number.parseFloat(minPrice);
  const normalizedMaxPrice = Number.parseFloat(maxPrice);
  const normalizedMinRating = Number.parseFloat(minRating);
  const body = {
    query: {
      bool: {
        must: trimmedQuery
          ? [
              {
                multi_match: {
                  query: trimmedQuery,
                  fields: ['name^3', 'description', 'category', 'subcategory', 'model', 'color', 'styleTheme'],
                  type: 'best_fields',
                  fuzziness: 'AUTO'
                }
              }
            ]
          : [{ match_all: {} }],
        filter: [
          { term: { approvalStatus: 'approved' } },
          { term: { isActive: true } },
        ]
      }
    },
    aggs: {
      categories: {
        terms: { field: 'category', size: 10 }
      },
      businesses: {
        terms: { field: 'businessName', size: 10 }
      },
      ratings: {
        range: {
          field: 'rating',
          ranges: [
            { key: '4_up', from: 4 },
            { key: '3_up', from: 3, to: 4 },
            { key: '2_up', from: 2, to: 3 },
            { key: 'below_2', to: 2 },
          ],
        },
      },
      priceRanges: {
        range: {
          field: 'price',
          ranges: [
            { key: 'under_500', to: 500 },
            { key: '500_to_1000', from: 500, to: 1000 },
            { key: '1000_to_2500', from: 1000, to: 2500 },
            { key: '2500_plus', from: 2500 },
          ],
        },
      }
    },
    from: (normalizedPage - 1) * normalizedLimit,
    size: normalizedLimit
  };

  if (category) body.query.bool.filter.push({ term: { category } });
  if (business) body.query.bool.filter.push({ term: { businessName: business } });
  if (seller) body.query.bool.filter.push({ term: { sellerEmail: seller } });
  if (inStock === 'true') body.query.bool.filter.push({ range: { stock: { gt: 0 } } });
  if (Number.isFinite(normalizedMinRating)) {
    body.query.bool.filter.push({ range: { rating: { gte: normalizedMinRating } } });
  }
  if (Number.isFinite(normalizedMinPrice) || Number.isFinite(normalizedMaxPrice)) {
    body.query.bool.filter.push({
      range: {
        price: {
          ...(Number.isFinite(normalizedMinPrice) ? { gte: normalizedMinPrice } : {}),
          ...(Number.isFinite(normalizedMaxPrice) ? { lte: normalizedMaxPrice } : {}),
        },
      },
    });
  }

  if (sort === 'price-asc') {
    body.sort = [{ price: 'asc' }, { _score: 'desc' }];
  } else if (sort === 'price-desc') {
    body.sort = [{ price: 'desc' }, { _score: 'desc' }];
  } else if (sort === 'rating') {
    body.sort = [{ rating: 'desc' }, { reviews: 'desc' }, { _score: 'desc' }];
  } else if (sort === 'discount') {
    body.sort = [{ discountPercentage: 'desc' }, { _score: 'desc' }];
  } else if (sort === 'newest') {
    body.sort = [{ createdAt: 'desc' }, { _score: 'desc' }];
  }

  const result = await client.search({ index: PRODUCT_INDEX, body });
  const hits = result.hits?.hits || [];
  const total = typeof result.hits?.total === 'number'
    ? result.hits.total
    : result.hits?.total?.value || hits.length;
  return {
    products: hits.map((hit) => ({
      ...hit._source,
      id: hit._source?.id || hit._id,
    })),
    total,
    aggregations: {
      categories: result.aggregations?.categories?.buckets || [],
      businesses: result.aggregations?.businesses?.buckets || [],
      ratings: result.aggregations?.ratings?.buckets || [],
      priceRanges: result.aggregations?.priceRanges?.buckets || [],
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

