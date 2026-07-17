/**
 * Seed Ecommerce Categories
 * Run this script to initialize product categories in the database
 * 
 * Usage: node backend/scripts/seedEcommerceCategories.js
 */

const mongoose = require('mongoose');
const EcommerceCategory = require('../models/EcommerceCategory');

const categories = [
  {
    name: 'Electronics',
    description: 'Electronic devices, gadgets, and accessories',
    icon: '📱',
    color: '#3498db',
    isFeatured: true,
    displayOrder: 1,
    metaTitle: 'Electronics - Phones, Laptops, Cameras & More',
    metaDescription: 'Shop the latest electronics including smartphones, laptops, cameras, and accessories',
    metaKeywords: ['electronics', 'phones', 'laptops', 'gadgets'],
    attributes: [
      {
        name: 'brand',
        label: 'Brand',
        type: 'select',
        required: true,
        options: ['Apple', 'Samsung', 'OnePlus', 'Xiaomi', 'Sony', 'Dell', 'HP', 'Lenovo', 'Other'],
        displayOrder: 1,
      },
      {
        name: 'warranty',
        label: 'Warranty Period',
        type: 'select',
        required: false,
        options: ['No Warranty', '6 Months', '1 Year', '2 Years', '3 Years'],
        displayOrder: 2,
      },
      {
        name: 'condition',
        label: 'Condition',
        type: 'select',
        required: true,
        options: ['New', 'Refurbished', 'Used'],
        displayOrder: 3,
      },
    ],
    subcategories: [
      {
        name: 'Mobile Phones',
        description: 'Smartphones and feature phones',
        icon: '📱',
        attributes: [
          { name: 'ram', label: 'RAM', type: 'select', options: ['2GB', '4GB', '6GB', '8GB', '12GB', '16GB'] },
          { name: 'storage', label: 'Storage', type: 'select', options: ['32GB', '64GB', '128GB', '256GB', '512GB', '1TB'] },
          { name: 'screenSize', label: 'Screen Size', type: 'text', unit: 'inches' },
        ],
      },
      {
        name: 'Laptops & Computers',
        description: 'Laptops, desktops, and accessories',
        icon: '💻',
        attributes: [
          { name: 'processor', label: 'Processor', type: 'text' },
          { name: 'ram', label: 'RAM', type: 'select', options: ['4GB', '8GB', '16GB', '32GB', '64GB'] },
          { name: 'storage', label: 'Storage', type: 'text' },
          { name: 'screenSize', label: 'Screen Size', type: 'text', unit: 'inches' },
        ],
      },
      {
        name: 'Cameras & Photography',
        description: 'Digital cameras, lenses, and accessories',
        icon: '📷',
      },
      {
        name: 'Audio & Headphones',
        description: 'Headphones, speakers, and audio equipment',
        icon: '🎧',
      },
      {
        name: 'Smart Home',
        description: 'Smart home devices and IoT products',
        icon: '🏠',
      },
    ],
  },
  {
    name: 'Fashion',
    description: 'Clothing, footwear, and accessories for men, women, and kids',
    icon: '👗',
    color: '#e74c3c',
    isFeatured: true,
    displayOrder: 2,
    metaTitle: 'Fashion - Clothing, Shoes & Accessories',
    metaDescription: 'Discover the latest fashion trends in clothing, footwear, and accessories',
    metaKeywords: ['fashion', 'clothing', 'shoes', 'accessories'],
    attributes: [
      {
        name: 'size',
        label: 'Size',
        type: 'select',
        required: true,
        options: ['XS', 'S', 'M', 'L', 'XL', 'XXL', '3XL'],
        displayOrder: 1,
      },
      {
        name: 'color',
        label: 'Color',
        type: 'color',
        required: true,
        displayOrder: 2,
      },
      {
        name: 'material',
        label: 'Material',
        type: 'text',
        required: false,
        displayOrder: 3,
      },
    ],
    subcategories: [
      { name: "Men's Clothing", description: "Shirts, pants, jackets for men", icon: '👔' },
      { name: "Women's Clothing", description: 'Dresses, tops, bottoms for women', icon: '👚' },
      { name: "Kids' Clothing", description: 'Clothing for children', icon: '👶' },
      { name: 'Footwear', description: 'Shoes, sandals, and slippers', icon: '👟' },
      { name: 'Accessories', description: 'Bags, belts, watches, and jewelry', icon: '👜' },
    ],
  },
  {
    name: 'Home & Kitchen',
    description: 'Furniture, home decor, and kitchen appliances',
    icon: '🏡',
    color: '#27ae60',
    isFeatured: true,
    displayOrder: 3,
    metaTitle: 'Home & Kitchen - Furniture, Decor & Appliances',
    metaDescription: 'Shop for furniture, home decor, and kitchen appliances',
    metaKeywords: ['home', 'furniture', 'kitchen', 'decor'],
    subcategories: [
      { name: 'Furniture', description: 'Sofas, beds, tables, and chairs', icon: '🛋️' },
      { name: 'Home Decor', description: 'Wall art, lighting, and decorative items', icon: '🖼️' },
      { name: 'Kitchen Appliances', description: 'Microwaves, mixers, and cookware', icon: '🍳' },
      { name: 'Bedding & Bath', description: 'Bed sheets, towels, and bathroom accessories', icon: '🛏️' },
    ],
  },
  {
    name: 'Beauty & Personal Care',
    description: 'Skincare, makeup, haircare, and grooming products',
    icon: '💄',
    color: '#f39c12',
    isFeatured: true,
    displayOrder: 4,
    metaTitle: 'Beauty & Personal Care - Skincare, Makeup & More',
    metaDescription: 'Explore beauty and personal care products',
    metaKeywords: ['beauty', 'skincare', 'makeup', 'personal care'],
    subcategories: [
      { name: 'Skincare', description: 'Cleansers, moisturizers, and serums', icon: '🧴' },
      { name: 'Makeup', description: 'Lipstick, foundation, and eye makeup', icon: '💋' },
      { name: 'Haircare', description: 'Shampoo, conditioner, and styling products', icon: '💇' },
      { name: 'Fragrances', description: 'Perfumes and deodorants', icon: '🌸' },
    ],
  },
  {
    name: 'Books & Media',
    description: 'Books, movies, music, and educational content',
    icon: '📚',
    color: '#9b59b6',
    isFeatured: false,
    displayOrder: 5,
    subcategories: [
      { name: 'Books', description: 'Fiction, non-fiction, and educational books', icon: '📖' },
      { name: 'Movies & TV', description: 'DVDs, Blu-rays, and digital media', icon: '🎬' },
      { name: 'Music', description: 'CDs, vinyl records, and digital music', icon: '🎵' },
    ],
  },
  {
    name: 'Sports & Fitness',
    description: 'Sports equipment, fitness gear, and outdoor activities',
    icon: '⚽',
    color: '#e67e22',
    isFeatured: true,
    displayOrder: 6,
    subcategories: [
      { name: 'Fitness Equipment', description: 'Dumbbells, yoga mats, and exercise machines', icon: '🏋️' },
      { name: 'Sports Gear', description: 'Cricket, football, and badminton equipment', icon: '🏏' },
      { name: 'Outdoor Recreation', description: 'Camping, hiking, and cycling gear', icon: '⛺' },
    ],
  },
  {
    name: 'Toys & Games',
    description: 'Toys, games, and educational products for kids',
    icon: '🎮',
    color: '#1abc9c',
    isFeatured: false,
    displayOrder: 7,
    subcategories: [
      { name: 'Action Figures & Dolls', description: 'Toys for imaginative play', icon: '🪆' },
      { name: 'Board Games & Puzzles', description: 'Games for family fun', icon: '🎲' },
      { name: 'Educational Toys', description: 'Learning and development toys', icon: '🧩' },
    ],
  },
  {
    name: 'Automotive',
    description: 'Car accessories, parts, and maintenance products',
    icon: '🚗',
    color: '#34495e',
    isFeatured: false,
    displayOrder: 8,
    subcategories: [
      { name: 'Car Accessories', description: 'Seat covers, mats, and organizers', icon: '🛞' },
      { name: 'Car Electronics', description: 'GPS, dash cams, and car audio', icon: '📡' },
      { name: 'Maintenance & Care', description: 'Cleaning products and tools', icon: '🧽' },
    ],
  },
  {
    name: 'Grocery & Food',
    description: 'Fresh produce, packaged foods, and beverages',
    icon: '🛒',
    color: '#16a085',
    isFeatured: true,
    displayOrder: 9,
    attributes: [
      {
        name: 'expiryDate',
        label: 'Expiry Date',
        type: 'text',
        required: true,
      },
      {
        name: 'organic',
        label: 'Organic',
        type: 'boolean',
        required: false,
      },
    ],
    subcategories: [
      { name: 'Fresh Produce', description: 'Fruits, vegetables, and herbs', icon: '🥬' },
      { name: 'Packaged Foods', description: 'Snacks, cereals, and canned goods', icon: '🥫' },
      { name: 'Beverages', description: 'Soft drinks, juices, and water', icon: '🥤' },
      { name: 'Dairy & Eggs', description: 'Milk, cheese, and dairy products', icon: '🥛' },
    ],
  },
  {
    name: 'Pet Supplies',
    description: 'Food, toys, and accessories for pets',
    icon: '🐾',
    color: '#d35400',
    isFeatured: false,
    displayOrder: 10,
    subcategories: [
      { name: 'Pet Food', description: 'Dog food, cat food, and treats', icon: '🍖' },
      { name: 'Pet Toys', description: 'Interactive toys for pets', icon: '🎾' },
      { name: 'Pet Accessories', description: 'Collars, leashes, and bowls', icon: '🦴' },
    ],
  },
];

async function seedCategories() {
  try {
    // Connect to MongoDB
    const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/superapp';
    await mongoose.connect(mongoUri);

    console.log('Connected to MongoDB');

    // Clear existing categories
    await EcommerceCategory.deleteMany({});
    console.log('Cleared existing categories');

    let createdCount = 0;

    // Create categories with subcategories
    for (const categoryData of categories) {
      const { subcategories, ...parentData } = categoryData;

      // Create parent category
      const parent = new EcommerceCategory(parentData);
      await parent.save();
      createdCount++;

      console.log(`  ✓ ${parent.name}`);

      // Create subcategories
      if (subcategories && subcategories.length > 0) {
        for (let i = 0; i < subcategories.length; i++) {
          const subcat = new EcommerceCategory({
            ...subcategories[i],
            parentCategory: parent._id,
            displayOrder: i + 1,
            color: parent.color,
          });
          await subcat.save();
          createdCount++;

          console.log(`    → ${subcat.name}`);
        }
      }
    }

    console.log(`\n✓ Successfully seeded ${createdCount} categories`);

    await mongoose.connection.close();
    console.log('Database connection closed');
    process.exit(0);
  } catch (error) {
    console.error('Error seeding categories:', error);
    process.exit(1);
  }
}

// Run the seed function
seedCategories();
