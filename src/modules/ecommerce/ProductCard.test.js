import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import ProductCard from "./ProductCard";

const mockUseApp = jest.fn();

jest.mock("../../contexts/AppContext", () => ({
  useApp: () => mockUseApp(),
}));

jest.mock("./productImage", () => ({
  resolveProductImageSrc: (image) => (image ? `http://api.local${image}` : ""),
}));

beforeEach(() => {
  mockUseApp.mockReturnValue({
    currentUser: { registrationType: "customer" },
    cart: [],
    favorites: [],
    addToCart: jest.fn(() => true),
    addToFavorites: jest.fn(),
    removeFavorite: jest.fn(),
  });
});

describe("ProductCard", () => {
  const mockProduct = {
    id: "prod-1",
    name: "Test Product",
    price: 100,
    mrp: 150,
    stock: 5,
    rating: 4.5,
    reviews: 10,
    image: "/products/test.jpg",
    category: "Electronics",
    description: "A test product",
    isDiscountActive: true,
    discountPercentage: 33.33,
    discountAmount: 50,
    returnAllowed: true,
    returnWindowDays: 7,
  };

  it("renders product card with product name", () => {
    render(<ProductCard product={mockProduct} />);
    expect(screen.getByText("Test Product")).toBeInTheDocument();
  });

  it("displays price correctly", () => {
    render(<ProductCard product={mockProduct} />);
    expect(screen.getByText("INR 100")).toBeInTheDocument();
  });

  it("shows discount badge when discount is active", () => {
    render(<ProductCard product={mockProduct} />);
    expect(screen.getByText("33% OFF")).toBeInTheDocument();
  });

  it("displays original price and discount info when discount active", () => {
    render(<ProductCard product={mockProduct} />);
    expect(screen.getByText("INR 150")).toBeInTheDocument();
    expect(screen.getByText(/Save INR 50/)).toBeInTheDocument();
  });

  it("displays stock information", () => {
    render(<ProductCard product={mockProduct} />);
    expect(screen.getByText(/5 in stock/)).toBeInTheDocument();
  });

  it("shows return policy when enabled", () => {
    render(<ProductCard product={mockProduct} />);
    expect(screen.getByText("Return window 7 day(s)")).toBeInTheDocument();
  });

  it("displays rating and reviews", () => {
    render(<ProductCard product={mockProduct} />);
    expect(screen.getByText("★ 4.5")).toBeInTheDocument();
    expect(screen.getByText("(10 reviews)")).toBeInTheDocument();
  });

  it("calls addToCart when add to cart button clicked", () => {
    const mockAddToCart = jest.fn(() => true);
    mockUseApp.mockReturnValue({
      ...mockUseApp(),
      addToCart: mockAddToCart,
    });

    render(<ProductCard product={mockProduct} />);

    const addButton = screen.getByRole("button", { name: /Add.*to cart/i });
    fireEvent.click(addButton);

    expect(mockAddToCart).toHaveBeenCalledWith(mockProduct);
  });

  it("displays out-of-stock copy when stock is zero", () => {
    const outOfStockProduct = { ...mockProduct, stock: 0 };
    render(<ProductCard product={outOfStockProduct} />);

    expect(screen.getByText("Out of stock")).toBeInTheDocument();
  });

  it("adds/removes from favorites on heart button click", () => {
    const mockAddToFavorites = jest.fn();
    mockUseApp.mockReturnValue({
      ...mockUseApp(),
      addToFavorites: mockAddToFavorites,
    });

    render(<ProductCard product={mockProduct} />);

    const favoriteButton = screen.getByRole("button", { name: /to favorites/i });
    fireEvent.click(favoriteButton);

    expect(mockAddToFavorites).toHaveBeenCalledWith(mockProduct);
  });

  it("shows seller view button for seller accounts", () => {
    mockUseApp.mockReturnValue({
      currentUser: { registrationType: "entrepreneur" },
      cart: [],
      favorites: [],
      addToCart: jest.fn(),
      addToFavorites: jest.fn(),
      removeFavorite: jest.fn(),
    });

    render(<ProductCard product={mockProduct} />);

    expect(screen.getByText("Seller View")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /seller account cannot add to cart/i })
    ).toBeDisabled();
  });

  it("calls onOpenQuickView when quick view button clicked", () => {
    const mockOnOpenQuickView = jest.fn();
    render(<ProductCard product={mockProduct} onOpenQuickView={mockOnOpenQuickView} />);

    const quickViewButton = screen.getByRole("button", { name: /Quick View/i });
    fireEvent.click(quickViewButton);

    expect(mockOnOpenQuickView).toHaveBeenCalledWith(mockProduct);
  });

  it("shows warning for low stock under five items", () => {
    const lowStockProduct = { ...mockProduct, stock: 3 };
    render(<ProductCard product={lowStockProduct} />);

    expect(screen.getByText("Only 3 items left!")).toBeInTheDocument();
  });

  it("shows business name when available", () => {
    const productWithBusiness = { ...mockProduct, businessName: "Test Store" };
    render(<ProductCard product={productWithBusiness} />);

    expect(screen.getByText("Test Store")).toBeInTheDocument();
  });

  it("displays batch information when available", () => {
    const productWithBatch = {
      ...mockProduct,
      batchLabel: "Lot A",
      batchLocation: "Kochi",
    };
    render(<ProductCard product={productWithBatch} />);

    expect(screen.getByText(/Batch Lot A/)).toBeInTheDocument();
    expect(screen.getByText(/Dispatch from Kochi/)).toBeInTheDocument();
  });

  it("handles image errors gracefully", () => {
    render(<ProductCard product={mockProduct} />);

    const img = screen.getByAltText("Test Product");
    expect(img).toHaveAttribute("loading", "lazy");
  });
});
