jest.mock('../models/ClassifiedAd', () => ({
  countDocuments: jest.fn(),
  insertMany: jest.fn(),
}));

jest.mock('../models/RealEstateProperty', () => ({
  countDocuments: jest.fn(),
  insertMany: jest.fn(),
}));

jest.mock('../models/Restaurant', () => ({
  countDocuments: jest.fn(),
  insertMany: jest.fn(),
}));

jest.mock('./devAppDataStore', () => ({
  readAppData: jest.fn(),
}));

const mongoose = require('mongoose');
const ClassifiedAd = require('../models/ClassifiedAd');
const RealEstateProperty = require('../models/RealEstateProperty');
const Restaurant = require('../models/Restaurant');
const devAppDataStore = require('./devAppDataStore');
const { migrateModuleDataToMongo } = require('./moduleDataMigration');

describe('moduleDataMigration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    Object.defineProperty(mongoose.connection, 'readyState', {
      value: 1,
      configurable: true,
    });
    devAppDataStore.readAppData.mockResolvedValue({
      moduleData: {
        classifiedsListings: [{ title: 'Phone listing' }],
        realestateProperties: [{ title: 'Villa listing' }],
        restaurants: [{ name: 'Cafe listing' }],
      },
    });
  });

  test('seeds empty Mongo collections from app-data module records', async () => {
    ClassifiedAd.countDocuments.mockResolvedValue(0);
    RealEstateProperty.countDocuments.mockResolvedValue(0);
    Restaurant.countDocuments.mockResolvedValue(0);
    ClassifiedAd.insertMany.mockResolvedValue([]);
    RealEstateProperty.insertMany.mockResolvedValue([]);
    Restaurant.insertMany.mockResolvedValue([]);

    const result = await migrateModuleDataToMongo();

    expect(ClassifiedAd.insertMany).toHaveBeenCalledWith([{ title: 'Phone listing' }], { ordered: false });
    expect(RealEstateProperty.insertMany).toHaveBeenCalledWith([{ title: 'Villa listing' }], { ordered: false });
    expect(Restaurant.insertMany).toHaveBeenCalledWith([{ name: 'Cafe listing' }], { ordered: false });
    expect(result.migrated).toBe(true);
  });
});
