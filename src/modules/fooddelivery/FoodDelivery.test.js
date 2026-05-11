import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import FoodDelivery from "./FoodDelivery";
import foodDeliveryService from "../../services/foodDeliveryService";

jest.mock("../../services/foodDeliveryService");
jest.mock("./RestaurantDashboard", () => () => <h2>Restaurant Workspace</h2>);
jest.mock("./DeliveryPartnerDashboard", () => () => <h2>Delivery Workspace</h2>);
jest.mock("./FoodAdminDashboard", () => () => <h2>Admin Workspace</h2>);

const restaurant = {
  id: "rest-1",
  name: "Malabar Meals Hub",
  rating: 4.6,
  deliveryTime: "30 mins",
  categories: ["Biryani"],
  imageLabel: "MM",
};

const menuItem = {
  id: "item-1",
  name: "Paneer Tikka Burger",
  price: 150,
  prepTime: 15,
  variants: [],
  addons: [],
};

const emptyCart = {
  restaurantId: "rest-1",
  items: [],
  couponCode: "",
  paymentMethod: "cod",
  tipAmount: 0,
  rewardPointsToRedeem: 0,
};

const filledCart = {
  ...emptyCart,
  items: [{ ...menuItem, quantity: 1 }],
};

const checkoutSummary = {
  subtotal: 150,
  discountAmount: 0,
  deliveryCharge: 30,
  platformFee: 5,
  taxAmount: 4,
  tipAmount: 0,
  walletUsed: 0,
  totalAmount: 189,
  payableAmount: 189,
  etaSnapshot: { routeStrategy: "balanced", totalMinutes: 32 },
  loyalty: { pointsRedeemed: 0, pointsEarned: 18 },
};

const setupServiceMocks = () => {
  foodDeliveryService.getRestaurants.mockResolvedValue([restaurant]);
  foodDeliveryService.getMyOrders.mockResolvedValue([]);
  foodDeliveryService.getRewardsSummary.mockResolvedValue({
    pointsBalance: 120,
    referralCode: "NILA120",
    lifetimePointsEarned: 640,
  });
  foodDeliveryService.getRecommendations.mockResolvedValue([]);
  foodDeliveryService.getMenu.mockResolvedValue([menuItem]);
  foodDeliveryService.getCart.mockResolvedValue(emptyCart);
  foodDeliveryService.getCheckoutSummary.mockResolvedValue(checkoutSummary);
  foodDeliveryService.addToCart.mockResolvedValue(filledCart);
  foodDeliveryService.clearCart.mockResolvedValue(emptyCart);
  foodDeliveryService.checkout.mockResolvedValue({
    id: "order-1",
    status: "placed",
    total: 189,
    paymentMethod: "cod",
    canCancel: true,
    loyalty: { pointsEarned: 18, pointsRedeemed: 0 },
  });
  foodDeliveryService.getOrderTracking.mockResolvedValue({
    tracking: { status: "assigned", estimatedArrivalMinutes: 30, routeStrategy: "balanced", distanceToCustomerKm: 4 },
    etaSnapshot: { totalMinutes: 30, routeStrategy: "balanced" },
  });
  foodDeliveryService.createDispute.mockResolvedValue({ id: "dispute-1" });
  foodDeliveryService.cancelOrder.mockResolvedValue({
    id: "order-1",
    status: "cancelled",
    total: 189,
    paymentMethod: "cod",
    canCancel: false,
  });
};

describe("FoodDelivery", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setupServiceMocks();
  });

  test("loads restaurants and lets a customer add an item to cart", async () => {
    render(<FoodDelivery />);

    fireEvent.click(await screen.findByRole("button", { name: /view menu/i }));
    expect(await screen.findByText("Paneer Tikka Burger")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /^add$/i }));

    await waitFor(() => {
      expect(foodDeliveryService.addToCart).toHaveBeenCalledWith(
        "rest-1",
        "item-1",
        1,
        expect.any(Object)
      );
    });

    expect(await screen.findByText(/paneer tikka burger x 1/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /checkout/i })).toBeInTheDocument();
  });

  test("clears cart items for the selected restaurant", async () => {
    render(<FoodDelivery />);

    fireEvent.click(await screen.findByRole("button", { name: /view menu/i }));
    expect(await screen.findByText("Paneer Tikka Burger")).toBeInTheDocument();
    fireEvent.click(await screen.findByRole("button", { name: /^add$/i }));
    expect(await screen.findByText(/paneer tikka burger x 1/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /^clear$/i }));

    await waitFor(() => {
      expect(foodDeliveryService.clearCart).toHaveBeenCalledWith("rest-1");
    });
    expect(screen.queryByText(/paneer tikka burger x 1/i)).not.toBeInTheDocument();
  });

  test("checks out and appends the order to my orders", async () => {
    const alertSpy = jest.spyOn(window, "alert").mockImplementation(() => {});

    render(<FoodDelivery />);

    fireEvent.click(await screen.findByRole("button", { name: /view menu/i }));
    expect(await screen.findByText("Paneer Tikka Burger")).toBeInTheDocument();
    fireEvent.click(await screen.findByRole("button", { name: /^add$/i }));
    fireEvent.click(await screen.findByRole("button", { name: /checkout/i }));

    await waitFor(() => {
      expect(foodDeliveryService.checkout).toHaveBeenCalledWith(
        "rest-1",
        expect.objectContaining({
          paymentMethod: "cod",
        })
      );
    });

    expect(await screen.findByText(/order order-1/i)).toBeInTheDocument();
    expect(alertSpy).toHaveBeenCalledWith(expect.stringMatching(/checkout successful/i));
    alertSpy.mockRestore();
  });

  test("switches between customer, restaurant, rider, and admin workspaces", async () => {
    render(<FoodDelivery />);

    expect(await screen.findByRole("button", { name: /customer/i })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /restaurant ops/i }));
    expect(screen.getByRole("heading", { name: /restaurant workspace/i })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /delivery ops/i }));
    expect(screen.getByRole("heading", { name: /delivery workspace/i })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /admin ops/i }));
    expect(screen.getByRole("heading", { name: /admin workspace/i })).toBeInTheDocument();
  });
});
