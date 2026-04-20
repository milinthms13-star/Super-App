import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import axios from "axios";
import CartPage from "./CartPage";

const mockUseApp = jest.fn();

jest.mock("axios");

jest.mock("../../contexts/AppContext", () => ({
  useApp: () => mockUseApp(),
}));

jest.mock("./productImage", () => ({
  resolveProductImageSrc: (image) => image ? `http://api.local${image}` : "",
}));

beforeEach(() => {
  axios.get.mockResolvedValue({
    data: {
      success: true,
      constants: {
        DELIVERY_BASE_FEE: 40,
        DELIVERY_PER_ITEM_FEE: 15,
      },
    },
  });

  mockUseApp.mockReturnValue({
    currentUser: { registrationType: "customer", name: "Test User", email: "test@example.com" },
    cart: [],
    paymentGateways: {
      razorpay: { enabled: true },
      stripe: { enabled: false },
      cod: { enabled: true },
    },
    checkoutStatus: { message: "", gateway: "", type: "" },
    clearCheckoutStatus: jest.fn(),
    removeFromCart: jest.fn(),
    updateCartQuantity: jest.fn(),
    placeOrder: jest.fn(() => Promise.resolve()),
    initializePayment: jest.fn(),
    savedAddresses: [],
    updateSavedAddresses: jest.fn(),
    verifyRazorpayPayment: jest.fn(),
  });
});

describe("CartPage", () => {
  const mockOnContinueShopping = jest.fn();

  const fillRequiredAddressFields = () => {
    fireEvent.change(screen.getByPlaceholderText(/Enter receiver phone number/i), {
      target: { value: "9876543210" },
    });
    fireEvent.change(screen.getByPlaceholderText(/Enter 6-digit pincode/i), {
      target: { value: "682001" },
    });

    const autoFilledInputs = screen.getAllByPlaceholderText(/Auto-filled from pincode/i);
    fireEvent.change(autoFilledInputs[0], { target: { value: "India" } });
    fireEvent.change(autoFilledInputs[1], { target: { value: "Kerala" } });
    fireEvent.change(autoFilledInputs[2], { target: { value: "Ernakulam" } });

    fireEvent.change(screen.getByPlaceholderText(/Enter house or building name/i), {
      target: { value: "Green Villa" },
    });
    fireEvent.change(screen.getByPlaceholderText(/Enter street, area, landmark/i), {
      target: { value: "MG Road, Near Metro" },
    });
  };

  it("renders cart page with heading", () => {
    render(<CartPage onContinueShopping={mockOnContinueShopping} />);
    expect(screen.getByText("Cart")).toBeInTheDocument();
  });

  it("shows empty cart message when no items", () => {
    render(<CartPage onContinueShopping={mockOnContinueShopping} />);
    expect(screen.getByText("Your cart is empty")).toBeInTheDocument();
  });

  it("shows items in cart when present", () => {
    mockUseApp.mockReturnValue({
      ...mockUseApp(),
      cart: [
        {
          id: "item-1",
          name: "Product 1",
          price: 100,
          quantity: 1,
          category: "Electronics",
          image: "/products/1.jpg",
          returnAllowed: true,
          returnWindowDays: 7,
        },
      ],
    });

    render(<CartPage onContinueShopping={mockOnContinueShopping} />);
    expect(screen.getByText("Product 1")).toBeInTheDocument();
  });

  it("displays correct subtotal and delivery fee", async () => {
    mockUseApp.mockReturnValue({
      ...mockUseApp(),
      cart: [
        {
          id: "item-1",
          name: "Product 1",
          price: 100,
          quantity: 2,
          category: "Electronics",
          image: "/products/1.jpg",
          returnAllowed: true,
          returnWindowDays: 7,
        },
      ],
    });

    render(<CartPage onContinueShopping={mockOnContinueShopping} />);
    
    expect(screen.getAllByText(/Subtotal/).length).toBeGreaterThan(0);
    expect(screen.getByText(/^Delivery Fee$/)).toBeInTheDocument();
  });

  it("allows removing items from cart", () => {
    const mockRemoveFromCart = jest.fn();
    mockUseApp.mockReturnValue({
      ...mockUseApp(),
      removeFromCart: mockRemoveFromCart,
      cart: [
        {
          id: "item-1",
          name: "Product 1",
          price: 100,
          quantity: 1,
          category: "Electronics",
          image: "/products/1.jpg",
          returnAllowed: true,
          returnWindowDays: 7,
        },
      ],
    });

    render(<CartPage onContinueShopping={mockOnContinueShopping} />);
    
    const removeButton = screen.getByRole("button", { name: /Remove/i });
    fireEvent.click(removeButton);
    
    expect(mockRemoveFromCart).toHaveBeenCalledWith("item-1");
  });

  it("shows payment method options", () => {
    mockUseApp.mockReturnValue({
      ...mockUseApp(),
      cart: [
        {
          id: "item-1",
          name: "Product 1",
          price: 100,
          quantity: 1,
          category: "Electronics",
          image: "/products/1.jpg",
          returnAllowed: true,
          returnWindowDays: 7,
        },
      ],
    });

    render(<CartPage onContinueShopping={mockOnContinueShopping} />);
    
    expect(screen.getByText("Cash on Delivery")).toBeInTheDocument();
    expect(screen.getByText("Razorpay")).toBeInTheDocument();
  });

  it("validates delivery form before checkout", async () => {
    mockUseApp.mockReturnValue({
      ...mockUseApp(),
      cart: [
        {
          id: "item-1",
          name: "Product 1",
          price: 100,
          quantity: 1,
          category: "Electronics",
          image: "/products/1.jpg",
          returnAllowed: true,
          returnWindowDays: 7,
        },
      ],
    });

    render(<CartPage onContinueShopping={mockOnContinueShopping} />);
    
    const checkoutButton = screen.getByRole("button", { name: /Place COD Order/i });
    fireEvent.click(checkoutButton);
    
    // Should show validation error
    await waitFor(() => {
      expect(screen.getByText(/Enter the receiver phone number/)).toBeInTheDocument();
    });
  });

  it("calls placeOrder on successful checkout", async () => {
    const mockPlaceOrder = jest.fn(() => Promise.resolve());
    const mockClearCheckoutStatus = jest.fn();
    mockUseApp.mockReturnValue({
      ...mockUseApp(),
      placeOrder: mockPlaceOrder,
      clearCheckoutStatus: mockClearCheckoutStatus,
      cart: [
        {
          id: "item-1",
          name: "Product 1",
          price: 100,
          quantity: 1,
          category: "Electronics",
          image: "/products/1.jpg",
          returnAllowed: true,
          returnWindowDays: 7,
          stock: 10,
        },
      ],
    });

    render(<CartPage onContinueShopping={mockOnContinueShopping} />);

    fillRequiredAddressFields();
    fireEvent.click(screen.getByRole("button", { name: /place cod order/i }));
    fireEvent.click(screen.getByRole("button", { name: /confirm and pay/i }));

    await waitFor(() => {
      expect(mockPlaceOrder).toHaveBeenCalled();
    });
    expect(mockClearCheckoutStatus).toHaveBeenCalled();
  });

  it("shows seller account message and disables checkout", () => {
    mockUseApp.mockReturnValue({
      ...mockUseApp(),
      currentUser: { registrationType: "entrepreneur" },
    });

    render(<CartPage onContinueShopping={mockOnContinueShopping} />);
    
    expect(screen.getByText(/Seller login is for business management only/)).toBeInTheDocument();
    expect(screen.getByText(/Shopping Disabled/)).toBeInTheDocument();
  });

  it("allows saving delivery address", async () => {
    const mockUpdateSavedAddresses = jest.fn();
    mockUseApp.mockReturnValue({
      ...mockUseApp(),
      updateSavedAddresses: mockUpdateSavedAddresses,
      cart: [
        {
          id: "item-1",
          name: "Product 1",
          price: 100,
          quantity: 1,
          category: "Electronics",
          image: "/products/1.jpg",
          returnAllowed: true,
          returnWindowDays: 7,
        },
      ],
    });

    render(<CartPage onContinueShopping={mockOnContinueShopping} />);

    fillRequiredAddressFields();
    const labelInput = screen.getByPlaceholderText(/Label this address/i);
    fireEvent.change(labelInput, { target: { value: "Home" } });

    const saveButton = screen.getByRole("button", { name: /Save Address/i });
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(mockUpdateSavedAddresses).toHaveBeenCalled();
    });
  });

  it("blocks saving incomplete delivery addresses", async () => {
    const mockUpdateSavedAddresses = jest.fn();
    mockUseApp.mockReturnValue({
      ...mockUseApp(),
      updateSavedAddresses: mockUpdateSavedAddresses,
      cart: [
        {
          id: "item-1",
          name: "Product 1",
          price: 100,
          quantity: 1,
          category: "Electronics",
          image: "/products/1.jpg",
          returnAllowed: true,
          returnWindowDays: 7,
        },
      ],
    });

    render(<CartPage onContinueShopping={mockOnContinueShopping} />);

    fireEvent.click(screen.getByRole("button", { name: /save address/i }));

    await waitFor(() => {
      expect(screen.getByText(/receiver phone number before saving/i)).toBeInTheDocument();
    });
    expect(mockUpdateSavedAddresses).not.toHaveBeenCalled();
  });
});
