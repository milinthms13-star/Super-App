import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import Ecommerce from "./Ecommerce";

const mockUseApp = jest.fn();
const mockUpdateItemReturnRequestStatus = jest.fn(() => Promise.resolve());

jest.mock("../../contexts/AppContext", () => ({
  useApp: () => mockUseApp(),
}));

jest.mock("./ProductCard", () => () => <div data-testid="product-card" />);

beforeAll(() => {
  window.HTMLElement.prototype.scrollIntoView = jest.fn();
});

describe("Ecommerce seller review workflow", () => {
  beforeEach(() => {
    mockUpdateItemReturnRequestStatus.mockClear();
    mockUseApp.mockReturnValue({
      currentUser: {
        email: "seller@example.com",
        name: "Seller",
        businessName: "Seller Store",
        registrationType: "entrepreneur",
        selectedBusinessCategories: [{ id: "ecommerce", name: "GlobeMart" }],
      },
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
      loadMoreMarketplaceProducts: jest.fn(),
      loadMoreManagedProducts: jest.fn(),
      loadMoreSellerOrders: jest.fn(),
    });
  });

  test("shows returned products in a dedicated seller review section", () => {
    render(<Ecommerce globeMartCategories={["Snacks", "Pickles"]} />);

    expect(screen.getByRole("heading", { name: /returned for review/i })).toBeInTheDocument();
    expect(screen.getAllByText("Returned Chips").length).toBeGreaterThan(0);
    expect(screen.getByText(/please update the price and description/i)).toBeInTheDocument();
    expect(screen.getByText("Approved Pickle")).toBeInTheDocument();
    expect(screen.getAllByText(/returned for review/i).length).toBeGreaterThan(0);
  });

  test("shows seller-side return requests inside seller orders", () => {
    render(<Ecommerce globeMartCategories={["Snacks", "Pickles"]} />);

    expect(screen.getAllByText(/return requests/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/packet arrived torn/i)).toBeInTheDocument();
    expect(screen.getByText(/reason: damaged/i)).toBeInTheDocument();
    expect(screen.getByText(/pending/i)).toBeInTheDocument();
  });

  test("lets the seller approve a return request", async () => {
    render(<Ecommerce globeMartCategories={["Snacks", "Pickles"]} />);

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
    render(
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
    render(<Ecommerce globeMartCategories={["Snacks", "Pickles"]} />);

    fireEvent.click(screen.getByRole("button", { name: /returned for review/i }));

    expect(window.HTMLElement.prototype.scrollIntoView).toHaveBeenCalled();
  });
});
