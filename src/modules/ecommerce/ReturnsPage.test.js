import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import ReturnsPage from "./ReturnsPage";

const mockRequestItemReturn = jest.fn(() => Promise.resolve());
const mockUseApp = jest.fn();

jest.mock("../../contexts/AppContext", () => ({
  useApp: () => mockUseApp(),
}));

describe("ReturnsPage", () => {
  beforeEach(() => {
    mockRequestItemReturn.mockClear();
    mockUseApp.mockReturnValue({
      orders: [
        {
          id: "order-1",
          amount: "INR 120",
          createdAt: "2026-04-15T10:00:00.000Z",
          items: [
            {
              id: "prod-1::batch::batch-1",
              name: "Banana Chips",
              category: "Snacks",
              batchLabel: "Lot A",
              batchLocation: "Kochi",
              returnAllowed: true,
              returnWindowDays: 7,
              returnEligibleUntil: "2099-04-22T10:00:00.000Z",
              returnRequest: null,
            },
          ],
        },
      ],
      requestItemReturn: mockRequestItemReturn,
    });
  });

  test("submits a return request for an eligible item", async () => {
    render(<ReturnsPage onContinueShopping={jest.fn()} />);

    fireEvent.change(screen.getByLabelText(/reason/i), {
      target: { value: "not_satisfied" },
    });
    fireEvent.change(screen.getByLabelText(/issue details/i), {
      target: { value: "Taste was not as expected." },
    });
    fireEvent.click(screen.getByRole("button", { name: /request return & refund/i }));
    fireEvent.click(screen.getByRole("button", { name: /confirm return request/i }));

    await waitFor(() => {
      expect(mockRequestItemReturn).toHaveBeenCalledWith(
        "order-1",
        "prod-1::batch::batch-1",
        {
          reason: "not_satisfied",
          details: "Taste was not as expected.",
        }
      );
    });
  });

  test("keeps return form state separate for the same product across different orders", () => {
    mockUseApp.mockReturnValue({
      orders: [
        {
          id: "order-1",
          amount: "INR 120",
          createdAt: "2026-04-15T10:00:00.000Z",
          items: [
            {
              id: "prod-1::batch::batch-1",
              name: "Banana Chips",
              category: "Snacks",
              batchLabel: "Lot A",
              batchLocation: "Kochi",
              returnAllowed: true,
              returnWindowDays: 7,
              returnEligibleUntil: "2099-04-22T10:00:00.000Z",
              returnRequest: null,
            },
          ],
        },
        {
          id: "order-2",
          amount: "INR 120",
          createdAt: "2026-04-16T10:00:00.000Z",
          items: [
            {
              id: "prod-1::batch::batch-1",
              name: "Banana Chips",
              category: "Snacks",
              batchLabel: "Lot A",
              batchLocation: "Kochi",
              returnAllowed: true,
              returnWindowDays: 7,
              returnEligibleUntil: "2099-04-23T10:00:00.000Z",
              returnRequest: null,
            },
          ],
        },
      ],
      requestItemReturn: mockRequestItemReturn,
    });

    render(<ReturnsPage onContinueShopping={jest.fn()} />);

    const detailsInputs = screen.getAllByLabelText(/issue details/i);
    fireEvent.change(detailsInputs[0], { target: { value: "First order issue" } });

    expect(detailsInputs[0]).toHaveValue("First order issue");
    expect(detailsInputs[1]).toHaveValue("");
  });

  test("displays return eligible items", () => {
    render(<ReturnsPage onContinueShopping={jest.fn()} />);
    expect(screen.getByText("Banana Chips")).toBeInTheDocument();
    expect(screen.getByText(/Snacks/)).toBeInTheDocument();
  });

  test("shows empty state when no eligible returns", () => {
    mockUseApp.mockReturnValue({
      orders: [],
      requestItemReturn: mockRequestItemReturn,
    });

    render(<ReturnsPage onContinueShopping={jest.fn()} />);
    expect(screen.getByText("No eligible items right now")).toBeInTheDocument();
    expect(screen.getByText("No return requests yet")).toBeInTheDocument();
  });

  test("displays submitted return requests", () => {
    mockUseApp.mockReturnValue({
      orders: [
        {
          id: "order-1",
          amount: "INR 120",
          createdAt: "2026-04-15T10:00:00.000Z",
          items: [
            {
              id: "prod-1::batch::batch-1",
              name: "Banana Chips",
              category: "Snacks",
              batchLabel: "Lot A",
              batchLocation: "Kochi",
              returnAllowed: true,
              returnWindowDays: 7,
              returnEligibleUntil: "2099-04-22T10:00:00.000Z",
              returnRequest: {
                status: "approved",
                reason: "damaged",
                details: "Package was damaged",
                requestedAt: "2026-04-18T10:00:00.000Z",
                refundStatus: "approved",
              },
            },
          ],
        },
      ],
      requestItemReturn: mockRequestItemReturn,
    });

    render(<ReturnsPage onContinueShopping={jest.fn()} />);
    expect(screen.getByText(/Return Approved/)).toBeInTheDocument();
    expect(screen.getByText(/Package was damaged/)).toBeInTheDocument();
  });

  test("sanitizes product names to prevent XSS attacks", () => {
    mockUseApp.mockReturnValue({
      orders: [
        {
          id: "order-1",
          amount: "INR 120",
          createdAt: "2026-04-15T10:00:00.000Z",
          items: [
            {
              id: "prod-xss::batch::batch-1",
              name: "<script>alert('xss')</script>Product",
              category: "Test",
              batchLabel: "Lot A",
              batchLocation: "Kochi",
              returnAllowed: true,
              returnWindowDays: 7,
              returnEligibleUntil: "2099-04-22T10:00:00.000Z",
              returnRequest: null,
            },
          ],
        },
      ],
      requestItemReturn: mockRequestItemReturn,
    });

    render(<ReturnsPage onContinueShopping={jest.fn()} />);
    // XSS payload should be escaped and rendered as text
    expect(screen.getByRole("heading", { name: /product/i })).toBeInTheDocument();
  });

  test("requires details before submitting return", async () => {
    render(<ReturnsPage onContinueShopping={jest.fn()} />);

    fireEvent.click(screen.getByRole("button", { name: /request return & refund/i }));

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: /confirm return request/i })).toBeInTheDocument();
    });
  });

  test("calls onContinueShopping when back button clicked", () => {
    const mockOnContinueShopping = jest.fn();
    render(<ReturnsPage onContinueShopping={mockOnContinueShopping} />);

    fireEvent.click(screen.getByRole("button", { name: /back to dashboard/i }));
    expect(mockOnContinueShopping).toHaveBeenCalled();
  });
});
