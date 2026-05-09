import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import Ecommerce from "./Ecommerce";

const mockUseApp = jest.fn();
const mockUpdateItemReturnRequestStatus = jest.fn(() => Promise.resolve());
const mockNavigate = jest.fn();
const mockTrackRecentlyViewedProduct = jest.fn();
const mockSaveEcommerceSearch = jest.fn(() => ({ id: "saved-1", label: "Saved search" }));
const mockRemoveEcommerceSavedSearch = jest.fn();
const mockRecordEcommerceSearch = jest.fn();
const mockScheduleEcommerceRefillReminder = jest.fn(() => ({
  id: "rem-1",
  dueAt: "2026-05-20T00:00:00.000Z",
  cadenceDays: 14,
}));
const mockDismissEcommerceRefillReminder = jest.fn();
const mockTrackProductMetric = jest.fn();

jest.mock("../../contexts/AppContext", () => ({
  useApp: () => mockUseApp(),
}));

jest.mock("./ProductCard", () => ({ product, onOpenQuickView }) => (
  <button type="button" data-testid="product-card" onClick={() => onOpenQuickView?.(product)}>
    {product?.name || "Product"}
  </button>
));
jest.mock("react-router-dom", () => ({
  useNavigate: () => mockNavigate,
}), { virtual: true });
jest.mock("../../hooks/useVoice", () => () => ({
  recognitionSupported: true,
  listeningKey: "",
  startListening: jest.fn(() => true),
  stopListening: jest.fn(),
}));

beforeAll(() => {
  window.HTMLElement.prototype.scrollIntoView = jest.fn();
});

const renderWithRouter = (ui) => render(ui);

describe("Ecommerce seller review workflow", () => {
  beforeEach(() => {
    mockNavigate.mockClear();
    mockUpdateItemReturnRequestStatus.mockClear();
    mockTrackRecentlyViewedProduct.mockClear();
    mockSaveEcommerceSearch.mockClear();
    mockRemoveEcommerceSavedSearch.mockClear();
    mockRecordEcommerceSearch.mockClear();
    mockScheduleEcommerceRefillReminder.mockClear();
    mockDismissEcommerceRefillReminder.mockClear();
    mockTrackProductMetric.mockClear();
    mockUseApp.mockReturnValue({
      currentUser: {
        email: "seller@example.com",
        name: "Seller",
        businessName: "Seller Store",
        registrationType: "entrepreneur",
        selectedBusinessCategories: [{ id: "ecommerce", name: "GlobeMart" }],
      },
      language: "en",
      cart: [],
      orders: [],
      favorites: [],
      ecommerceRecentlyViewed: [],
      ecommerceSavedSearches: [],
      ecommerceSearchHistory: [],
      ecommerceRefillReminders: [],
      mockData: {
        ecommerceProducts: [],
      },
      managedProducts: [
        {
          id: "prod-returned-1",
          name: "Returned Chips",
          sellerEmail: "seller@example.com",
          category: "Snacks",
          description: "Spicy banana chips",
          approvalStatus: "pending",
          moderationNote: "Please update the price and description.",
          stock: 0,
          isActive: true,
        },
        {
          id: "prod-approved-1",
          name: "Approved Pickle",
          sellerEmail: "seller@example.com",
          category: "Pickles",
          description: "Homemade pickle",
          approvalStatus: "approved",
          moderationNote: "",
          stock: 10,
          price: 120,
          mrp: 150,
          isActive: true,
          inventoryBatches: [],
        },
      ],
      sellerOrders: [
        {
          id: "order-1",
          amount: "INR 240",
          createdAt: "2026-04-15T10:00:00.000Z",
          customerName: "Customer",
          sellerFulfillments: [
            {
              sellerKey: "seller-1",
              sellerEmail: "seller@example.com",
              businessName: "Seller Store",
              status: "Confirmed",
            },
          ],
          items: [
            {
              id: "prod-returned-1",
              sellerKey: "seller-1",
              name: "Returned Chips",
              quantity: 1,
              price: 120,
              batchLabel: "Lot A",
              batchLocation: "Kochi",
              returnRequest: {
                reason: "damaged",
                status: "requested",
                refundStatus: "pending",
                requestedAt: "2099-04-18T10:00:00.000Z",
                details: "Packet arrived torn.",
              },
            },
          ],
        },
      ],
      marketplacePagination: { hasNextPage: false },
      managedProductsPagination: { totalItems: 2, hasNextPage: false },
      sellerOrdersPagination: { totalItems: 1, hasNextPage: false },
      productsLoading: false,
      productsError: "",
      createProduct: jest.fn(),
      updateProduct: jest.fn(),
      addProductInventory: jest.fn(),
      updateProductInventory: jest.fn(),
      setInventoryBatchAvailability: jest.fn(),
      setProductAvailability: jest.fn(),
      updateSellerOrderStatus: jest.fn(),
      syncSellerOrderStatus: jest.fn(),
      updateItemReturnRequestStatus: mockUpdateItemReturnRequestStatus,
      trackRecentlyViewedProduct: mockTrackRecentlyViewedProduct,
      saveEcommerceSearch: mockSaveEcommerceSearch,
      removeEcommerceSavedSearch: mockRemoveEcommerceSavedSearch,
      recordEcommerceSearch: mockRecordEcommerceSearch,
      scheduleEcommerceRefillReminder: mockScheduleEcommerceRefillReminder,
      dismissEcommerceRefillReminder: mockDismissEcommerceRefillReminder,
      loadMoreMarketplaceProducts: jest.fn(),
      loadMoreManagedProducts: jest.fn(),
      loadMoreSellerOrders: jest.fn(),
      trackProductMetric: mockTrackProductMetric,
    });
  });

  test("shows returned products in a dedicated seller review section", () => {
    renderWithRouter(<Ecommerce globeMartCategories={["Snacks", "Pickles"]} />);

    expect(screen.getByRole("heading", { name: /returned for review/i })).toBeInTheDocument();
    expect(screen.getAllByText("Returned Chips").length).toBeGreaterThan(0);
    expect(screen.getByText(/please update the price and description/i)).toBeInTheDocument();
    expect(screen.getByText("Approved Pickle")).toBeInTheDocument();
    expect(screen.getAllByText(/returned for review/i).length).toBeGreaterThan(0);
  });

  test("shows seller-side return requests inside seller orders", () => {
    renderWithRouter(<Ecommerce globeMartCategories={["Snacks", "Pickles"]} />);

    expect(screen.getAllByText(/return requests/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/packet arrived torn/i)).toBeInTheDocument();
    expect(screen.getByText(/reason: damaged/i)).toBeInTheDocument();
    expect(screen.getByText(/pending/i)).toBeInTheDocument();
  });

  test("lets the seller approve a return request", async () => {
    renderWithRouter(<Ecommerce globeMartCategories={["Snacks", "Pickles"]} />);

    fireEvent.click(screen.getByRole("button", { name: /approve return/i }));

    await waitFor(() => {
      expect(mockUpdateItemReturnRequestStatus).toHaveBeenCalledWith(
        "order-1",
        "prod-returned-1",
        { action: "approve" }
      );
    });
  });

  test("shows subcategory and style fields in the seller product form", () => {
    renderWithRouter(
      <Ecommerce
        globeMartCategories={[
          {
            id: "electronics",
            name: "Electronics",
            theme: "Tech Essentials",
            accentColor: "#0f4c81",
            subcategories: ["Mobile Accessories", "Chargers"],
          },
        ]}
      />
    );

    expect(screen.getByLabelText(/subcategory/i)).toBeInTheDocument();
    expect(screen.getByRole("option", { name: /mobile accessories/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/color style/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^model$/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/theme \/ style/i)).toBeInTheDocument();
  });

  test("scrolls to the returned review section when the left summary card is clicked", () => {
    renderWithRouter(<Ecommerce globeMartCategories={["Snacks", "Pickles"]} />);

    fireEvent.click(screen.getByRole("button", { name: /returned for review/i }));

    expect(window.HTMLElement.prototype.scrollIntoView).toHaveBeenCalled();
  });
});

describe("Ecommerce shopper intelligence", () => {
  beforeEach(() => {
    mockTrackRecentlyViewedProduct.mockClear();
    mockSaveEcommerceSearch.mockClear();
    mockRemoveEcommerceSavedSearch.mockClear();
    mockRecordEcommerceSearch.mockClear();
    mockScheduleEcommerceRefillReminder.mockClear();
    mockDismissEcommerceRefillReminder.mockClear();
    mockTrackProductMetric.mockClear();
    mockUseApp.mockReturnValue({
      currentUser: {
        email: "buyer@example.com",
        name: "Buyer",
        registrationType: "user",
      },
      language: "en",
      cart: [{ id: "cart-1", category: "Snacks", businessName: "Kerala Foods" }],
      orders: [],
      favorites: [{ id: "fav-1", category: "Snacks", businessName: "Kerala Foods" }],
      ecommerceRecentlyViewed: [
        { id: "prod-2", name: "Jackfruit Chips", category: "Snacks", price: 180 },
      ],
      ecommerceSavedSearches: [
        {
          id: "saved-1",
          label: "Snack deals",
          query: "banana chips",
          filters: { category: "Snacks", minRating: "4" },
        },
      ],
      ecommerceSearchHistory: ["banana chips"],
      ecommerceRefillReminders: [
        {
          id: "rem-1",
          productName: "Banana Chips",
          dueAt: "2026-05-20T00:00:00.000Z",
          cadenceDays: 14,
        },
      ],
      mockData: {
        ecommerceProducts: [
          {
            id: "prod-1",
            name: "Banana Chips",
            category: "Snacks",
            businessName: "Kerala Foods",
            description: "Crunchy and spicy",
            price: 149,
            stock: 6,
            rating: 4.7,
          },
        ],
      },
      managedProducts: [],
      sellerOrders: [],
      marketplacePagination: { hasNextPage: false, totalItems: 1 },
      managedProductsPagination: { totalItems: 0, hasNextPage: false },
      sellerOrdersPagination: { totalItems: 0, hasNextPage: false },
      productsLoading: false,
      productsError: "",
      createProduct: jest.fn(),
      updateProduct: jest.fn(),
      addProductInventory: jest.fn(),
      updateProductInventory: jest.fn(),
      setInventoryBatchAvailability: jest.fn(),
      setProductAvailability: jest.fn(),
      updateSellerOrderStatus: jest.fn(),
      syncSellerOrderStatus: jest.fn(),
      updateItemReturnRequestStatus: jest.fn(),
      addToCart: jest.fn(),
      trackRecentlyViewedProduct: mockTrackRecentlyViewedProduct,
      recordEcommerceSearch: mockRecordEcommerceSearch,
      saveEcommerceSearch: mockSaveEcommerceSearch,
      removeEcommerceSavedSearch: mockRemoveEcommerceSavedSearch,
      scheduleEcommerceRefillReminder: mockScheduleEcommerceRefillReminder,
      dismissEcommerceRefillReminder: mockDismissEcommerceRefillReminder,
      fetchActiveFlashSales: jest.fn(() => Promise.resolve([])),
      trackProductMetric: mockTrackProductMetric,
      loadMoreMarketplaceProducts: jest.fn(),
      loadMoreManagedProducts: jest.fn(),
      loadMoreSellerOrders: jest.fn(),
    });
  });

  test("renders saved searches, recently viewed products, and refill reminders", () => {
    renderWithRouter(<Ecommerce globeMartCategories={["Snacks", "Electronics"]} />);

    expect(screen.getByRole("heading", { name: /saved searches/i })).toBeInTheDocument();
    expect(screen.getByText("Snack deals")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /recently viewed/i })).toBeInTheDocument();
    expect(screen.getByText("Jackfruit Chips")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /refill reminders/i })).toBeInTheDocument();
    expect(screen.getAllByText(/Banana Chips/i).length).toBeGreaterThan(0);
  });

  test("saves the current search through the shopper assistant", async () => {
    renderWithRouter(<Ecommerce globeMartCategories={["Snacks", "Electronics"]} />);

    fireEvent.change(screen.getByRole("searchbox"), {
      target: { value: "snacks under 300" },
    });
    fireEvent.click(screen.getByRole("button", { name: /save search/i }));

    await waitFor(() => {
      expect(mockSaveEcommerceSearch).toHaveBeenCalledWith(
        expect.objectContaining({
          query: "snacks under 300",
        })
      );
    });
  });

  test("tracks recently viewed when a shopper opens quick view", async () => {
    renderWithRouter(<Ecommerce globeMartCategories={["Snacks", "Electronics"]} />);

    fireEvent.click(screen.getByRole("button", { name: "Banana Chips" }));

    await waitFor(() => {
      expect(mockTrackRecentlyViewedProduct).toHaveBeenCalledWith(
        expect.objectContaining({ id: "prod-1", name: "Banana Chips" })
      );
      expect(mockTrackProductMetric).toHaveBeenCalledWith("prod-1", "click");
    });
  });
});
