import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import AdminDashboard from "./AdminDashboard";

const mockModerateProduct = jest.fn(() => Promise.resolve());
const mockUpdateItemReturnRequestStatus = jest.fn(() => Promise.resolve());
const mockUseApp = jest.fn();

jest.mock("../../contexts/AppContext", () => ({
  useApp: () => mockUseApp(),
}));

jest.mock("../../hooks/useI18n", () => ({
  __esModule: true,
  default: () => ({
    t: (_key, fallback) => fallback,
  }),
}));

describe("AdminDashboard moderation remarks", () => {
  beforeEach(() => {
    mockModerateProduct.mockClear();
    mockUpdateItemReturnRequestStatus.mockClear();
    mockUseApp.mockReturnValue({
      managedProducts: [
        {
          id: "prod-remarks-1",
          name: "Watch",
          businessName: "Malu",
          sellerName: "Malavika",
          sellerEmail: "malavikaaditi3@gmail.com",
          category: "Electronics",
          price: 0,
          stock: 0,
          location: "Kerala",
          description: "Inventory not added yet",
          approvalStatus: "pending",
          moderationNote: "",
        },
      ],
      sellerOrders: [],
      moderateProduct: mockModerateProduct,
      updateItemReturnRequestStatus: mockUpdateItemReturnRequestStatus,
      productsLoading: false,
      managedProductsPagination: { hasNextPage: false },
      loadMoreManagedProducts: jest.fn(),
    });
  });

  test("sends the typed remark when approving a product", async () => {
    render(
      <AdminDashboard
        businessCategories={[]}
        globeMartCategories={[]}
        registrationApplications={[]}
        onUpdateCategoryFee={jest.fn()}
        onCreateGlobeMartCategory={jest.fn()}
        onAddGlobeMartSubcategory={jest.fn()}
        enabledModules={[]}
        onToggleModule={jest.fn()}
      />
    );

    fireEvent.change(screen.getByLabelText(/remarks/i), {
      target: { value: "Approved after checking the product details." },
    });

    fireEvent.click(screen.getByRole("button", { name: /^approve$/i }));

    await waitFor(() => {
      expect(mockModerateProduct).toHaveBeenCalledWith(
        "prod-remarks-1",
        "approved",
        "Approved after checking the product details."
      );
    });
  });

  test("hides products that were already returned for seller review", () => {
    mockUseApp.mockReturnValue({
      managedProducts: [
        {
          id: "prod-fresh-1",
          name: "Fresh Watch",
          businessName: "Malu",
          sellerName: "Malavika",
          sellerEmail: "malavikaaditi3@gmail.com",
          category: "Electronics",
          price: 0,
          stock: 0,
          location: "Kerala",
          description: "Inventory not added yet",
          approvalStatus: "pending",
          moderationNote: "",
        },
        {
          id: "prod-returned-1",
          name: "Returned Watch",
          businessName: "Malu",
          sellerName: "Malavika",
          sellerEmail: "malavikaaditi3@gmail.com",
          category: "Electronics",
          price: 0,
          stock: 0,
          location: "Kerala",
          description: "Inventory not added yet",
          approvalStatus: "pending",
          moderationNote: "Please update the product details and resubmit this listing.",
        },
      ],
      sellerOrders: [],
      moderateProduct: mockModerateProduct,
      updateItemReturnRequestStatus: mockUpdateItemReturnRequestStatus,
      productsLoading: false,
      managedProductsPagination: { hasNextPage: false },
      loadMoreManagedProducts: jest.fn(),
    });

    render(
      <AdminDashboard
        businessCategories={[]}
        globeMartCategories={[]}
        registrationApplications={[]}
        onUpdateCategoryFee={jest.fn()}
        onCreateGlobeMartCategory={jest.fn()}
        onAddGlobeMartSubcategory={jest.fn()}
        enabledModules={[]}
        onToggleModule={jest.fn()}
      />
    );

    expect(screen.getByText("Fresh Watch")).toBeInTheDocument();
    expect(screen.queryByText("Returned Watch")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /pending only \(1\)/i })).toBeInTheDocument();
  });

  test("shows return and refund requests across seller orders", () => {
    mockUseApp.mockReturnValue({
      managedProducts: [],
      sellerOrders: [
        {
          id: "order-1",
          createdAt: "2099-04-18T10:00:00.000Z",
          customerName: "Customer",
          sellerFulfillments: [
            {
              sellerKey: "seller-1",
              businessName: "Seller Store",
            },
          ],
          items: [
            {
              id: "prod-1::batch::batch-1",
              sellerKey: "seller-1",
              name: "Banana Chips",
              batchLabel: "Lot A",
              batchLocation: "Kochi",
              returnRequest: {
                reason: "damaged",
                status: "approved",
                refundStatus: "pending",
                details: "Packet arrived torn.",
              },
            },
            {
              id: "prod-2::batch::batch-2",
              sellerKey: "seller-1",
              name: "Mango Pickle",
              batchLabel: "Lot B",
              batchLocation: "Thrissur",
              returnRequest: {
                reason: "not_satisfied",
                status: "approved",
                refundStatus: "completed",
                details: "Refund already processed.",
              },
            },
          ],
        },
      ],
      moderateProduct: mockModerateProduct,
      updateItemReturnRequestStatus: mockUpdateItemReturnRequestStatus,
      productsLoading: false,
      managedProductsPagination: { hasNextPage: false },
      loadMoreManagedProducts: jest.fn(),
    });

    render(
      <AdminDashboard
        businessCategories={[]}
        globeMartCategories={[]}
        registrationApplications={[]}
        onUpdateCategoryFee={jest.fn()}
        onCreateGlobeMartCategory={jest.fn()}
        onAddGlobeMartSubcategory={jest.fn()}
        enabledModules={[]}
        onToggleModule={jest.fn()}
      />
    );

    expect(screen.getByRole("heading", { name: /returns & refund review/i })).toBeInTheDocument();
    expect(screen.getByText("Banana Chips")).toBeInTheDocument();
    expect(screen.getByText(/packet arrived torn/i)).toBeInTheDocument();
    expect(screen.getByText(/reason: damaged/i)).toBeInTheDocument();

    fireEvent.click(screen.getAllByRole("button", { name: /refund completed/i })[1]);

    expect(screen.getByText("Mango Pickle")).toBeInTheDocument();
    expect(mockUpdateItemReturnRequestStatus).toHaveBeenCalledWith(
      "order-1",
      "prod-1::batch::batch-1",
      { action: "refund_completed" }
    );
  });

  test("adds a subcategory under the selected GlobeMart category", async () => {
    const onAddGlobeMartSubcategory = jest.fn(() => Promise.resolve({ persisted: true }));

    render(
      <AdminDashboard
        businessCategories={[]}
        globeMartCategories={[
          {
            id: "electronics",
            name: "Electronics",
            subcategories: ["Audio"],
          },
        ]}
        registrationApplications={[]}
        onUpdateCategoryFee={jest.fn()}
        onCreateGlobeMartCategory={jest.fn()}
        onAddGlobeMartSubcategory={onAddGlobeMartSubcategory}
        enabledModules={[]}
        onToggleModule={jest.fn()}
      />
    );

    fireEvent.change(screen.getByLabelText(/parent category/i), {
      target: { value: "electronics" },
    });
    fireEvent.change(screen.getByLabelText(/^subcategory$/i), {
      target: { value: "Mobile Accessories" },
    });
    fireEvent.click(screen.getByRole("button", { name: /add subcategory/i }));

    await waitFor(() => {
      expect(onAddGlobeMartSubcategory).toHaveBeenCalledWith("electronics", "Mobile Accessories");
    });
  });
});
