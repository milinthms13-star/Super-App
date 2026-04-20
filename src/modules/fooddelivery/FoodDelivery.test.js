import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import FoodDelivery from "./FoodDelivery";

const mockUseApp = jest.fn();

jest.mock("../../contexts/AppContext", () => ({
  useApp: () => mockUseApp(),
}));

const buildUser = (overrides = {}) => ({
  name: "Dhanya",
  email: "dhanya@example.com",
  role: "user",
  registrationType: "user",
  ...overrides,
});

describe("FoodDelivery", () => {
  beforeEach(() => {
    mockUseApp.mockReturnValue({
      currentUser: buildUser(),
      language: "en",
      mockData: {
        restaurants: [],
      },
    });
  });

  test("lets a customer add an item and place an order", () => {
    render(<FoodDelivery />);

    fireEvent.click(screen.getByRole("button", { name: /add to cart/i }));
    expect(screen.getByText(/added to cart/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /place order/i }));
    expect(screen.getByText(/placed successfully/i)).toBeInTheDocument();
  });

  test("prevents mixing items from different restaurants in one cart", () => {
    render(<FoodDelivery />);

    fireEvent.click(screen.getByRole("button", { name: /add to cart/i }));
    fireEvent.click(screen.getByRole("button", { name: /coastal wraps/i }));
    fireEvent.click(screen.getByRole("button", { name: /add to cart/i }));

    expect(screen.getByText(/clear the cart before adding items from coastal wraps/i)).toBeInTheDocument();
  });

  test("lets customers edit and clear the cart", () => {
    render(<FoodDelivery />);

    fireEvent.click(screen.getByRole("button", { name: /add to cart/i }));
    fireEvent.click(screen.getByRole("button", { name: /increase quantity/i }));
    expect(screen.getByText(/cart quantity updated/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /clear cart/i }));
    expect(screen.getByText(/cart cleared/i)).toBeInTheDocument();
  });

  test("switches to restaurant mode and saves a menu item", () => {
    render(<FoodDelivery />);

    fireEvent.click(screen.getByRole("button", { name: /restaurant partner/i }));
    fireEvent.change(screen.getByLabelText(/item name/i), {
      target: { value: "Fish Curry Meals" },
    });
    fireEvent.change(screen.getByLabelText(/price/i), {
      target: { value: "260" },
    });
    fireEvent.click(screen.getByRole("button", { name: /save menu item/i }));

    expect(screen.getByText(/added to malabar meals hub/i)).toBeInTheDocument();
  });

  test("shows delivery workflow and allows status updates", () => {
    render(<FoodDelivery />);

    fireEvent.click(screen.getByRole("button", { name: /delivery partner/i }));
    fireEvent.click(screen.getAllByRole("button", { name: /update status/i })[0]);

    expect(screen.getByText(/delivery status moved to/i)).toBeInTheDocument();
  });

  test("filters menu items by dietary preference", () => {
    render(<FoodDelivery />);

    fireEvent.click(screen.getByRole("button", { name: /coastal wraps/i }));
    fireEvent.change(screen.getByLabelText(/preference/i), {
      target: { value: "Veg only" },
    });

    expect(screen.getByRole("button", { name: /paneer tikka burger/i })).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /peri peri chicken wrap/i })
    ).not.toBeInTheDocument();
  });

  test("supports quick reorder after a customer places an order", () => {
    render(<FoodDelivery />);

    fireEvent.click(screen.getByRole("button", { name: /add to cart/i }));
    fireEvent.click(screen.getByRole("button", { name: /place order/i }));
    fireEvent.click(screen.getAllByRole("button", { name: /reorder/i })[0]);

    expect(screen.getByText(/added malabar meals hub order back to cart for quick reorder/i)).toBeInTheDocument();
    expect(screen.getByText(/qty 1/i)).toBeInTheDocument();
  });

  test("applies a promo code and updates checkout total", () => {
    render(<FoodDelivery />);

    fireEvent.click(screen.getByRole("button", { name: /add to cart/i }));
    fireEvent.change(screen.getByLabelText(/promo code/i), {
      target: { value: "FREEDEL" },
    });
    fireEvent.click(screen.getByRole("button", { name: /apply promo/i }));

    expect(screen.getByText(/promo freedel applied/i)).toBeInTheDocument();
    expect(screen.getByText(/applied offer/i)).toBeInTheDocument();
    expect(screen.getByText("-INR 39")).toBeInTheDocument();
    expect(screen.getByText("FREEDEL")).toBeInTheDocument();
  });

  test("prevents overbooking a delivery slot at capacity", () => {
    render(<FoodDelivery />);

    fireEvent.click(screen.getByRole("button", { name: /add to cart/i }));
    fireEvent.change(screen.getByLabelText(/schedule delivery/i), {
      target: { value: "7:30 PM" },
    });
    fireEvent.click(screen.getByRole("button", { name: /place order/i }));
    expect(screen.getByText(/placed successfully/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /add to cart/i }));
    fireEvent.change(screen.getByLabelText(/schedule delivery/i), {
      target: { value: "7:30 PM" },
    });
    fireEvent.click(screen.getByRole("button", { name: /place order/i }));

    expect(screen.getByText(/7:30 pm is full right now/i)).toBeInTheDocument();
  });

  test("captures restaurant onboarding details while saving a menu item", () => {
    render(<FoodDelivery />);

    fireEvent.click(screen.getByRole("button", { name: /restaurant partner/i }));
    fireEvent.change(screen.getByLabelText(/item name/i), {
      target: { value: "Fish Curry Meals" },
    });
    fireEvent.change(screen.getByLabelText(/price/i), {
      target: { value: "260" },
    });
    fireEvent.change(screen.getByLabelText(/prep time sla/i), {
      target: { value: "14 mins" },
    });
    fireEvent.change(screen.getByLabelText(/service zone/i), {
      target: { value: "Fort Kochi" },
    });
    fireEvent.change(screen.getByLabelText(/license status/i), {
      target: { value: "Verified FSSAI Plus" },
    });
    fireEvent.click(screen.getByRole("button", { name: /save menu item/i }));

    expect(screen.getByText(/serving fort kochi/i)).toBeInTheDocument();
    expect(screen.getByText(/verified fssai plus/i)).toBeInTheDocument();
  });

  test("keeps rejected orders in the system instead of deleting them", () => {
    render(<FoodDelivery />);

    fireEvent.click(screen.getByRole("button", { name: /add to cart/i }));
    fireEvent.click(screen.getByRole("button", { name: /place order/i }));

    fireEvent.click(screen.getByRole("button", { name: /restaurant partner/i }));
    const rejectButton = screen
      .getAllByRole("button", { name: /^reject$/i })
      .find((button) => !button.disabled);
    fireEvent.click(rejectButton);

    fireEvent.click(screen.getByRole("button", { name: /admin/i }));
    expect(screen.getAllByText(/rejected/i).length).toBeGreaterThan(0);
  });

  test("does not show another user's tracking data when the current user has no orders", () => {
    render(<FoodDelivery />);

    expect(screen.getByText(/no customer orders available yet/i)).toBeInTheDocument();
  });

  test("shows admin analytics and governance sections", () => {
    render(<FoodDelivery />);

    fireEvent.click(screen.getByRole("button", { name: /admin/i }));

    expect(screen.getByRole("heading", { name: /admin analytics/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /restaurant governance/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /disputes and feedback/i })).toBeInTheDocument();
  });
});
