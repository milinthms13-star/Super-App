const fs = require("fs/promises");
const path = require("path");
const jwt = require("jsonwebtoken");
const request = require("supertest");

process.env.AUTH_STORAGE = "memory";
process.env.LOCALMARKET_DATA_FILE = path.join(__dirname, "..", "data", "localmarket.test.json");

const app = require("../server");
const { getJwtSecret } = require("../middleware/auth");
const devAuthStore = require("../utils/devAuthStore");
const devLocalMarketStore = require("../utils/devLocalMarketStore");

describe("LocalMarket Routes", () => {
  let shopId;
  let productId;
  let orderId;
  let ownerAuthToken;
  let customerAuthToken;

  const createAuthHeader = (user) =>
    `Bearer ${jwt.sign(
      {
        sub: String(user._id),
        email: user.email,
      },
      getJwtSecret(),
      {
        expiresIn: "1h",
        issuer: "malabarbazaar-api",
        audience: "malabarbazaar-web",
      }
    )}`;

  beforeAll(async () => {
    await devLocalMarketStore.resetStore();

    const owner = await devAuthStore.upsertUserByEmail("shopowner@test.com");
    const nextOwner = await devAuthStore.updateUserById(owner._id, {
      name: "Test Shop Owner",
      registrationType: "entrepreneur",
      role: "business",
      businessName: "Test Shop",
    });

    const customer = await devAuthStore.upsertUserByEmail("buyer@test.com");
    const nextCustomer = await devAuthStore.updateUserById(customer._id, {
      name: "Test Buyer",
      registrationType: "user",
      role: "user",
    });

    ownerAuthToken = createAuthHeader(nextOwner);
    customerAuthToken = createAuthHeader(nextCustomer);
  });

  afterAll(async () => {
    await devLocalMarketStore.resetStore();
    await fs.unlink(process.env.LOCALMARKET_DATA_FILE).catch(() => {});
  });

  it("returns all shops", async () => {
    const res = await request(app).get("/api/localmarket/shops");

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data).toHaveLength(0);
  });

  it("creates a new shop for the owner", async () => {
    const res = await request(app)
      .post("/api/localmarket/shops")
      .set("Authorization", ownerAuthToken)
      .send({
        name: "Test Shop",
        type: "Supermarket",
        deliveryCharge: 40,
        minOrder: 200,
        freeDeliveryAbove: 500,
        location: {
          city: "Kochi",
          state: "Kerala",
        },
      });

    expect(res.statusCode).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.name).toBe("Test Shop");
    expect(res.body.data.ownerId).toBeTruthy();
    shopId = res.body.data._id;
  });

  it("filters shops by type after a shop is created", async () => {
    const res = await request(app).get("/api/localmarket/shops?type=Supermarket");

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0]._id).toBe(shopId);
  });

  it("adds a product to the shop", async () => {
    const res = await request(app)
      .post(`/api/localmarket/shops/${shopId}/products`)
      .set("Authorization", ownerAuthToken)
      .send({
        name: "Fresh Tomatoes",
        category: "Vegetables & Fruits",
        price: 60,
        mrp: 75,
        quantity: "1 KG",
        inStock: true,
      });

    expect(res.statusCode).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.name).toBe("Fresh Tomatoes");
    productId = res.body.data._id;
  });

  it("returns the created shop with populated products", async () => {
    const res = await request(app).get(`/api/localmarket/shops/${shopId}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.products).toHaveLength(1);
    expect(res.body.data.products[0]._id).toBe(productId);
  });

  it("creates an order for the customer", async () => {
    const res = await request(app)
      .post("/api/localmarket/orders")
      .set("Authorization", customerAuthToken)
      .send({
        shopId: String(shopId),
        items: [
          {
            productId: String(productId),
            productName: "Fresh Tomatoes",
            price: 60,
            quantity: 2,
            category: "Vegetables & Fruits",
          },
        ],
        subtotal: 120,
        discount: 0,
        deliveryCharge: 40,
        deliveryType: "Home Delivery",
        deliveryAddress: { street: "123 Main St", city: "Kochi" },
        paymentMethod: "UPI",
      });

    expect(res.statusCode).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.total).toBe(160);
    orderId = res.body.data._id;
  });

  it("returns customer orders with the populated shop", async () => {
    const res = await request(app)
      .get("/api/localmarket/orders")
      .set("Authorization", customerAuthToken);

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].shopId.name).toBe("Test Shop");
  });

  it("returns shop orders for the owner", async () => {
    const res = await request(app)
      .get(`/api/localmarket/shops/${shopId}/orders`)
      .set("Authorization", ownerAuthToken);

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0]._id).toBe(orderId);
  });

  it("updates order status as the shop owner", async () => {
    const res = await request(app)
      .put(`/api/localmarket/orders/${orderId}/status`)
      .set("Authorization", ownerAuthToken)
      .send({
        status: "Out for Delivery",
      });

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe("Out for Delivery");
  });

  it("adds a review to the order as the customer", async () => {
    const res = await request(app)
      .post(`/api/localmarket/orders/${orderId}/review`)
      .set("Authorization", customerAuthToken)
      .send({
        rating: 5,
        comment: "Great service and fresh products!",
      });

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.review.rating).toBe(5);
  });

  it("adds a direct review to the shop", async () => {
    const res = await request(app)
      .post(`/api/localmarket/shops/${shopId}/review`)
      .set("Authorization", customerAuthToken)
      .send({
        rating: 4,
        comment: "Good quality products.",
      });

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.totalReviews).toBe(2);
    expect(res.body.data.rating).toBe(4.5);
  });
});
