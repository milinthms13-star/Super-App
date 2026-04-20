import { fireEvent, render, screen } from "@testing-library/react";
import OrdersPage from "./OrdersPage";

const mockUseApp = jest.fn();

jest.mock("../../contexts/AppContext", () => ({
  useApp: () => mockUseApp(),
}));

beforeEach(() => {
  mockUseApp.mockReturnValue({
    orders: [],
    ordersPagination: { totalItems: 0 },
    loadMoreOrders: jest.fn(),
    checkoutStatus: { message: "" },
    clearCheckoutStatus: jest.fn(),
  });
});

describe("OrdersPage", () => {
  const mockOnContinueShopping = jest.fn();
  const mockOnOpenReturns = jest.fn();

  it("renders orders page with heading", () => {
    render(<OrdersPage onContinueShopping={mockOnContinueShopping} onOpenReturns={mockOnOpenReturns} />);
    expect(screen.getByText("Order History")).toBeInTheDocument();
  });

  it("shows empty state when no orders", () => {
    render(<OrdersPage onContinueShopping={mockOnContinueShopping} onOpenReturns={mockOnOpenReturns} />);
    expect(screen.getByText("No orders yet")).toBeInTheDocument();
  });

  it("displays orders when present", () => {
    mockUseApp.mockReturnValue({
      orders: [
        {
          id: "order-001",
          amount: 1000,
          subtotal: 900,
          deliveryFee: 100,
          status: "Delivered",
          createdAt: "2026-04-15T10:00:00.000Z",
          deliveryAddress: "123 Main St, City",
          items: [
            {
              id: "item-1",
              name: "Product 1",
              quantity: 1,
              price: 100,
              status: "Delivered",
            },
          ],
          sellerFulfillments: [],
        },
      ],
      ordersPagination: { totalItems: 1 },
      loadMoreOrders: jest.fn(),
      checkoutStatus: { message: "" },
      clearCheckoutStatus: jest.fn(),
    });

    render(<OrdersPage onContinueShopping={mockOnContinueShopping} onOpenReturns={mockOnOpenReturns} />);
    
    expect(screen.getByText(/Order order-001/)).toBeInTheDocument();
    expect(screen.getByText("Delivered")).toBeInTheDocument();
  });

  it("allows searching orders by ID", () => {
    mockUseApp.mockReturnValue({
      orders: [
        {
          id: "order-001",
          amount: 1000,
          subtotal: 900,
          deliveryFee: 100,
          status: "Confirmed",
          createdAt: "2026-04-15T10:00:00.000Z",
          deliveryAddress: "123 Main St, City",
          items: [],
          sellerFulfillments: [],
        },
        {
          id: "order-002",
          amount: 2000,
          subtotal: 1900,
          deliveryFee: 100,
          status: "Shipped",
          createdAt: "2026-04-14T10:00:00.000Z",
          deliveryAddress: "456 Oak Ave, Town",
          items: [],
          sellerFulfillments: [],
        },
      ],
      ordersPagination: { totalItems: 2 },
      loadMoreOrders: jest.fn(),
      checkoutStatus: { message: "" },
      clearCheckoutStatus: jest.fn(),
    });

    render(<OrdersPage onContinueShopping={mockOnContinueShopping} onOpenReturns={mockOnOpenReturns} />);
    
    const searchInput = screen.getByPlaceholderText(/Search by order ID/i);
    fireEvent.change(searchInput, { target: { value: "order-001" } });
    
    expect(screen.getByText(/Order order-001/)).toBeInTheDocument();
    expect(screen.queryByText(/Order order-002/)).not.toBeInTheDocument();
  });

  it("filters orders by status", () => {
    mockUseApp.mockReturnValue({
      orders: [
        {
          id: "order-001",
          amount: 1000,
          subtotal: 900,
          deliveryFee: 100,
          status: "Delivered",
          createdAt: "2026-04-15T10:00:00.000Z",
          deliveryAddress: "123 Main St, City",
          items: [],
          sellerFulfillments: [],
        },
        {
          id: "order-002",
          amount: 2000,
          subtotal: 1900,
          deliveryFee: 100,
          status: "Confirmed",
          createdAt: "2026-04-14T10:00:00.000Z",
          deliveryAddress: "456 Oak Ave, Town",
          items: [],
          sellerFulfillments: [],
        },
      ],
      ordersPagination: { totalItems: 2 },
      loadMoreOrders: jest.fn(),
      checkoutStatus: { message: "" },
      clearCheckoutStatus: jest.fn(),
    });

    render(<OrdersPage onContinueShopping={mockOnContinueShopping} onOpenReturns={mockOnOpenReturns} />);
    
    const filterSelect = screen.getByLabelText(/Filter by status/i);
    fireEvent.change(filterSelect, { target: { value: "delivered" } });
    
    expect(screen.getByText(/Order order-001/)).toBeInTheDocument();
    expect(screen.queryByText(/Order order-002/)).not.toBeInTheDocument();
  });

  it("expands order details on view details click", () => {
    mockUseApp.mockReturnValue({
      orders: [
        {
          id: "order-001",
          amount: 1000,
          subtotal: 900,
          deliveryFee: 100,
          status: "Delivered",
          createdAt: "2026-04-15T10:00:00.000Z",
          deliveryAddress: "123 Main St, City",
          paymentMethod: "Stripe",
          paymentStatus: "Completed",
          estimatedDeliveryAt: "2026-04-18T10:00:00.000Z",
          items: [],
          sellerFulfillments: [],
        },
      ],
      ordersPagination: { totalItems: 1 },
      loadMoreOrders: jest.fn(),
      checkoutStatus: { message: "" },
      clearCheckoutStatus: jest.fn(),
    });

    render(<OrdersPage onContinueShopping={mockOnContinueShopping} onOpenReturns={mockOnOpenReturns} />);
    
    const detailsButton = screen.getByRole("button", { name: /View details/i });
    fireEvent.click(detailsButton);
    
    expect(screen.getByText(/Payment method/)).toBeInTheDocument();
    expect(screen.getByText("Stripe")).toBeInTheDocument();
  });

  it("shows order progress steps", () => {
    mockUseApp.mockReturnValue({
      orders: [
        {
          id: "order-001",
          amount: 1000,
          subtotal: 900,
          deliveryFee: 100,
          status: "Shipped",
          createdAt: "2026-04-15T10:00:00.000Z",
          deliveryAddress: "123 Main St, City",
          items: [],
          sellerFulfillments: [],
        },
      ],
      ordersPagination: { totalItems: 1 },
      loadMoreOrders: jest.fn(),
      checkoutStatus: { message: "" },
      clearCheckoutStatus: jest.fn(),
    });

    render(<OrdersPage onContinueShopping={mockOnContinueShopping} onOpenReturns={mockOnOpenReturns} />);
    
    expect(screen.getByText("Confirmed")).toBeInTheDocument();
    expect(screen.getByText("Packed")).toBeInTheDocument();
    expect(screen.getByText("Shipped")).toBeInTheDocument();
    expect(screen.getByText("Delivered")).toBeInTheDocument();
  });

  it("displays return eligibility information", () => {
    mockUseApp.mockReturnValue({
      orders: [
        {
          id: "order-001",
          amount: 1000,
          subtotal: 900,
          deliveryFee: 100,
          status: "Delivered",
          createdAt: "2026-04-15T10:00:00.000Z",
          deliveryAddress: "123 Main St, City",
          items: [
            {
              id: "item-1",
              name: "Product 1",
              quantity: 1,
              price: 100,
              status: "Delivered",
              returnAllowed: true,
              returnWindowDays: 7,
            },
          ],
          sellerFulfillments: [],
        },
      ],
      ordersPagination: { totalItems: 1 },
      loadMoreOrders: jest.fn(),
      checkoutStatus: { message: "" },
      clearCheckoutStatus: jest.fn(),
    });

    render(<OrdersPage onContinueShopping={mockOnContinueShopping} onOpenReturns={mockOnOpenReturns} />);
    
    expect(screen.getByText(/Return by/)).toBeInTheDocument();
  });

  it("shows order no matching message when filters apply", () => {
    mockUseApp.mockReturnValue({
      orders: [
        {
          id: "order-001",
          amount: 1000,
          subtotal: 900,
          deliveryFee: 100,
          status: "Delivered",
          createdAt: "2026-04-15T10:00:00.000Z",
          deliveryAddress: "123 Main St, City",
          items: [],
          sellerFulfillments: [],
        },
      ],
      ordersPagination: { totalItems: 1 },
      loadMoreOrders: jest.fn(),
      checkoutStatus: { message: "" },
      clearCheckoutStatus: jest.fn(),
    });

    render(<OrdersPage onContinueShopping={mockOnContinueShopping} onOpenReturns={mockOnOpenReturns} />);
    
    const filterSelect = screen.getByLabelText(/Filter by status/i);
    fireEvent.change(filterSelect, { target: { value: "confirmed" } });
    
    expect(screen.getByText("No matching orders")).toBeInTheDocument();
  });

  it("displays product details including batch information", () => {
    mockUseApp.mockReturnValue({
      orders: [
        {
          id: "order-001",
          amount: 1000,
          subtotal: 900,
          deliveryFee: 100,
          status: "Delivered",
          createdAt: "2026-04-15T10:00:00.000Z",
          deliveryAddress: "123 Main St, City",
          items: [
            {
              id: "item-1",
              name: "Banana Chips",
              quantity: 2,
              price: 120,
              batchLabel: "Batch-001",
              batchLocation: "Kochi",
              status: "Delivered",
              businessName: "Vendor Inc",
            },
          ],
          sellerFulfillments: [],
        },
      ],
      ordersPagination: { totalItems: 1 },
      loadMoreOrders: jest.fn(),
      checkoutStatus: { message: "" },
      clearCheckoutStatus: jest.fn(),
    });

    render(<OrdersPage onContinueShopping={mockOnContinueShopping} onOpenReturns={mockOnOpenReturns} />);
    
    const detailsButton = screen.getByRole("button", { name: /View details/i });
    fireEvent.click(detailsButton);
    
    expect(screen.getByText("Banana Chips")).toBeInTheDocument();
    expect(screen.getByText("Vendor Inc")).toBeInTheDocument();
    expect(screen.getByText(/Batch-001/)).toBeInTheDocument();
    expect(screen.getByText(/Kochi/)).toBeInTheDocument();
  });

  it("sanitizes product names to prevent XSS attacks", () => {
    mockUseApp.mockReturnValue({
      orders: [
        {
          id: "order-xss",
          amount: 1000,
          subtotal: 900,
          deliveryFee: 100,
          status: "Delivered",
          createdAt: "2026-04-15T10:00:00.000Z",
          deliveryAddress: "123 Main St, City",
          items: [
            {
              id: "item-xss",
              name: "<script>alert('xss')</script>Malicious Product",
              quantity: 1,
              price: 100,
              batchLabel: "Batch-001",
              batchLocation: "Kochi",
              status: "Delivered",
              businessName: "<img src=x onerror='alert(1)'>Vendor</img>",
            },
          ],
          sellerFulfillments: [],
        },
      ],
      ordersPagination: { totalItems: 1 },
      loadMoreOrders: jest.fn(),
      checkoutStatus: { message: "" },
      clearCheckoutStatus: jest.fn(),
    });

    render(<OrdersPage onContinueShopping={mockOnContinueShopping} onOpenReturns={mockOnOpenReturns} />);
    
    // XSS payloads should be escaped
    expect(screen.getByText("&lt;script&gt;alert('xss')&lt;/script&gt;Malicious Product")).toBeInTheDocument();
    expect(screen.getByText("&lt;img src=x onerror='alert(1)'&gt;Vendor&lt;/img&gt;")).toBeInTheDocument();
  });

  it("sanitizes delivery address to prevent XSS", () => {
    mockUseApp.mockReturnValue({
      orders: [
        {
          id: "order-address-xss",
          amount: 1000,
          subtotal: 900,
          deliveryFee: 100,
          status: "Delivered",
          createdAt: "2026-04-15T10:00:00.000Z",
          deliveryAddress: "<svg onload='alert(1)'>Malicious Address</svg>",
          items: [],
          sellerFulfillments: [],
        },
      ],
      ordersPagination: { totalItems: 1 },
      loadMoreOrders: jest.fn(),
      checkoutStatus: { message: "" },
      clearCheckoutStatus: jest.fn(),
    });

    render(<OrdersPage onContinueShopping={mockOnContinueShopping} onOpenReturns={mockOnOpenReturns} />);
    
    const detailsButton = screen.getByRole("button", { name: /View details/i });
    fireEvent.click(detailsButton);
    
    // XSS payload in address should be escaped
    expect(screen.getByText("&lt;svg onload='alert(1)'&gt;Malicious Address&lt;/svg&gt;")).toBeInTheDocument();
  });

  it("displays seller fulfillment information when available", () => {
    mockUseApp.mockReturnValue({
      orders: [
        {
          id: "order-fulfillment",
          amount: 1000,
          subtotal: 900,
          deliveryFee: 100,
          status: "Shipped",
          createdAt: "2026-04-15T10:00:00.000Z",
          deliveryAddress: "123 Main St, City",
          items: [],
          sellerFulfillments: [
            {
              sellerKey: "seller-1",
              businessName: "Fast Seller",
              status: "Shipped",
              provider: "shiprocket",
              trackingNumber: "SR123456789",
              shipmentId: "SHIP-123",
              externalStatus: "In Transit",
            },
          ],
        },
      ],
      ordersPagination: { totalItems: 1 },
      loadMoreOrders: jest.fn(),
      checkoutStatus: { message: "" },
      clearCheckoutStatus: jest.fn(),
    });

    render(<OrdersPage onContinueShopping={mockOnContinueShopping} onOpenReturns={mockOnOpenReturns} />);
    
    expect(screen.getByText("Fast Seller")).toBeInTheDocument();
    expect(screen.getByText(/SR123456789/)).toBeInTheDocument();
    expect(screen.getByText(/In Transit/)).toBeInTheDocument();
  });

  it("displays checkout status message when present", () => {
    mockUseApp.mockReturnValue({
      orders: [],
      ordersPagination: { totalItems: 0 },
      loadMoreOrders: jest.fn(),
      checkoutStatus: { message: "Order placed successfully!" },
      clearCheckoutStatus: jest.fn(),
    });

    render(<OrdersPage onContinueShopping={mockOnContinueShopping} onOpenReturns={mockOnOpenReturns} />);
    
    expect(screen.getByText("Order placed successfully!")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Dismiss/i })).toBeInTheDocument();
  });

  it("clears checkout status when dismiss button clicked", () => {
    const mockClearCheckoutStatus = jest.fn();
    mockUseApp.mockReturnValue({
      orders: [],
      ordersPagination: { totalItems: 0 },
      loadMoreOrders: jest.fn(),
      checkoutStatus: { message: "Test message" },
      clearCheckoutStatus: mockClearCheckoutStatus,
    });

    render(<OrdersPage onContinueShopping={mockOnContinueShopping} onOpenReturns={mockOnOpenReturns} />);
    
    fireEvent.click(screen.getByRole("button", { name: /Dismiss/i }));
    expect(mockClearCheckoutStatus).toHaveBeenCalled();
  });

  it("calls onContinueShopping when continue shopping button clicked", () => {
    mockUseApp.mockReturnValue({
      orders: [
        {
          id: "order-001",
          amount: 1000,
          subtotal: 900,
          deliveryFee: 100,
          status: "Delivered",
          createdAt: "2026-04-15T10:00:00.000Z",
          deliveryAddress: "123 Main St, City",
          items: [],
          sellerFulfillments: [],
        },
      ],
      ordersPagination: { totalItems: 1 },
      loadMoreOrders: jest.fn(),
      checkoutStatus: { message: "" },
      clearCheckoutStatus: jest.fn(),
    });

    render(<OrdersPage onContinueShopping={mockOnContinueShopping} onOpenReturns={mockOnOpenReturns} />);
    
    const continueButton = screen.getByRole("button", { name: /Continue Shopping/i });
    fireEvent.click(continueButton);
    
    expect(mockOnContinueShopping).toHaveBeenCalled();
  });

  it("calls onOpenReturns when manage returns button clicked", () => {
    mockUseApp.mockReturnValue({
      orders: [
        {
          id: "order-001",
          amount: 1000,
          subtotal: 900,
          deliveryFee: 100,
          status: "Delivered",
          createdAt: "2026-04-15T10:00:00.000Z",
          deliveryAddress: "123 Main St, City",
          items: [],
          sellerFulfillments: [],
        },
      ],
      ordersPagination: { totalItems: 1 },
      loadMoreOrders: jest.fn(),
      checkoutStatus: { message: "" },
      clearCheckoutStatus: jest.fn(),
    });

    render(<OrdersPage onContinueShopping={mockOnContinueShopping} onOpenReturns={mockOnOpenReturns} />);
    
    const manageReturnsButton = screen.getByRole("button", { name: /Manage Returns/i });
    fireEvent.click(manageReturnsButton);
    
    expect(mockOnOpenReturns).toHaveBeenCalled();
  });
});
