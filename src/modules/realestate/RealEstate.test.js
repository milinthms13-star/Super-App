import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import RealEstate from "./RealEstate";

const mockUseApp = jest.fn();

jest.mock("../../contexts/AppContext", () => ({
  useApp: () => mockUseApp(),
}));

describe("RealEstate", () => {
  const getBaseContext = () => ({
    currentUser: {
      id: "user-1",
      name: "Dhanya",
      registrationType: "user",
      role: "user",
    },
    favorites: [],
    addToFavorites: jest.fn(),
    removeFavorite: jest.fn(),
    mockData: {
      realestateProperties: [
        {
          id: "re-1",
          title: "Skyline Residency 3 BHK",
          price: "95 Lakhs",
          priceLabel: "95 Lakhs",
          priceValue: 95,
          area: "1650 sq ft",
          areaSqft: 1650,
          location: "Kochi",
          locality: "Kakkanad",
          type: "Flat",
          intent: "sale",
          bedrooms: 3,
          bathrooms: 3,
          furnishing: "Semi Furnished",
          sellerName: "Amina Niyas",
          sellerRole: "Owner",
          listedBy: "Owner",
          verified: true,
          verificationStatus: "Verified",
          featured: true,
          leads: [{ name: "Riyas", channel: "Chat", priority: "Hot" }],
          reviews: [{ author: "Shahid", score: 5, comment: "Verified documents and fast site visit support." }],
        },
        {
          id: "re-2",
          title: "Smart Rental Studio",
          price: "28,000 / month",
          priceLabel: "28,000 / month",
          priceValue: 28,
          area: "640 sq ft",
          areaSqft: 640,
          location: "Trivandrum",
          locality: "Technopark Phase 1",
          type: "Studio",
          intent: "rent",
          bedrooms: 1,
          bathrooms: 1,
          furnishing: "Furnished",
          sellerName: "Rohit Menon",
          sellerRole: "Owner",
          listedBy: "Owner",
          verified: true,
          verificationStatus: "Verified",
          leads: [{ name: "Devika", channel: "Call", priority: "Warm" }],
          reviews: [{ author: "Arun", score: 4, comment: "Well-maintained and easy move-in process." }],
        },
      ],
    },
  });

  beforeEach(() => {
    mockUseApp.mockReturnValue(getBaseContext());
  });

  test("renders marketplace content and filters listings", () => {
    render(<RealEstate />);

    expect(
      screen.getByRole("heading", { name: /homesphere turns property discovery into a verified marketplace/i })
    ).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(/listing intent/i), {
      target: { value: "rent" },
    });

    expect(
      screen.getByRole("heading", { name: /smart rental studio/i, level: 2 })
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("heading", { name: /skyline residency 3 bhk/i, level: 3 })
    ).not.toBeInTheDocument();
  });

  test("allows seller-side listing submission", () => {
    mockUseApp.mockReturnValue({
      ...getBaseContext(),
      currentUser: {
        id: "biz-1",
        name: "Dhanya",
        businessName: "Dhanya Realty",
        registrationType: "entrepreneur",
        role: "business",
      },
    });

    render(<RealEstate />);

    fireEvent.click(screen.getByRole("button", { name: /property owner/i }));
    fireEvent.change(screen.getByLabelText(/^title$/i), {
      target: { value: "New Marina Apartment" },
    });
    fireEvent.change(screen.getByLabelText(/^price$/i), {
      target: { value: "88 Lakhs" },
    });
    fireEvent.change(screen.getAllByLabelText(/^location$/i)[1], {
      target: { value: "Kozhikode" },
    });

    fireEvent.click(screen.getByRole("button", { name: /submit listing/i }));

    expect(screen.getByText(/listing drafted successfully/i)).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: /new marina apartment/i, level: 2 })
    ).toBeInTheDocument();
  });

  test("prevents a buyer account from opening the seller flow", () => {
    render(<RealEstate />);

    fireEvent.click(screen.getByRole("button", { name: /property owner/i }));

    expect(screen.getByText(/cannot access the property owner workspace/i)).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: /publish a property/i })).not.toBeInTheDocument();
  });

  test("allows admins to approve seeded listings", async () => {
    mockUseApp.mockReturnValue({
      ...getBaseContext(),
      currentUser: {
        id: "admin-1",
        name: "Admin",
        registrationType: "admin",
        role: "admin",
      },
      mockData: {
        realestateProperties: [
          {
            ...getBaseContext().mockData.realestateProperties[0],
            verified: false,
            verificationStatus: "Pending",
          },
          getBaseContext().mockData.realestateProperties[1],
        ],
      },
    });

    render(<RealEstate />);

    expect(screen.getAllByText(/^Pending$/i)[0]).toBeInTheDocument();
    fireEvent.click(screen.getByText(/^Approve listing$/i));

    await waitFor(() => {
      expect(screen.getAllByText(/^Verified$/i).length).toBeGreaterThanOrEqual(2);
    });
  });

  test("matches editable listings by stable owner id instead of display name order", () => {
    mockUseApp.mockReturnValue({
      ...getBaseContext(),
      currentUser: {
        id: "biz-9",
        name: "Dhanya",
        businessName: "Dhanya Realty",
        registrationType: "entrepreneur",
        role: "business",
      },
      mockData: {
        realestateProperties: [
          {
            ...getBaseContext().mockData.realestateProperties[0],
            ownerId: "biz-9",
            sellerName: "Dhanya Realty",
          },
          getBaseContext().mockData.realestateProperties[1],
        ],
      },
    });

    render(<RealEstate />);

    fireEvent.click(screen.getByRole("button", { name: /agent \/ broker/i }));

    expect(screen.getAllByText(/^Edit$/i).length).toBeGreaterThan(0);
  });
});
