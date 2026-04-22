import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import RealEstate from "./RealEstate";

const mockUseApp = jest.fn();

jest.mock("../../contexts/AppContext", () => ({
  useApp: () => mockUseApp(),
}));

const createProperty = (overrides = {}) => ({
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
  ownerId: "owner-1",
  verified: true,
  verificationStatus: "Verified",
  featured: true,
  leads: [{ name: "Riyas", channel: "Chat", priority: "Hot" }],
  reviews: [{ author: "Shahid", score: 5, comment: "Verified documents and fast site visit support." }],
  ...overrides,
});

const createContextState = (overrides = {}) => ({
  currentUser: {
    id: "user-1",
    name: "Dhanya",
    email: "dhanya@example.com",
    registrationType: "user",
    role: "user",
  },
  favorites: [],
  addToFavorites: jest.fn(),
  removeFavorite: jest.fn(),
  createRealEstateListing: jest.fn(async () => null),
  updateRealEstateListing: jest.fn(async () => null),
  sendRealEstateEnquiry: jest.fn(async () => null),
  sendRealEstateMessage: jest.fn(async () => null),
  addRealEstateReview: jest.fn(async () => null),
  reportRealEstateListing: jest.fn(async () => null),
  moderateRealEstateListing: jest.fn(async () => null),
  deleteRealEstateListing: jest.fn(async () => null),
  mockData: {
    realestateProperties: [
      createProperty(),
      createProperty({
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
        ownerId: "owner-2",
        leads: [{ name: "Devika", channel: "Call", priority: "Warm" }],
        reviews: [{ author: "Arun", score: 4, comment: "Well-maintained and easy move-in process." }],
      }),
    ],
  },
  ...overrides,
});

describe("RealEstate", () => {
  let contextState;

  beforeEach(() => {
    contextState = createContextState();
    mockUseApp.mockImplementation(() => contextState);
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

  test("allows seller-side listing submission through the shared app context", async () => {
    contextState.currentUser = {
      id: "biz-1",
      name: "Dhanya",
      email: "biz@example.com",
      businessName: "Dhanya Realty",
      registrationType: "entrepreneur",
      role: "business",
    };
    contextState.createRealEstateListing.mockImplementation(async (payload) => {
      const createdListing = createProperty({
        id: "re-new",
        title: payload.title,
        price: payload.priceLabel,
        priceLabel: payload.priceLabel,
        priceValue: 88,
        location: payload.location,
        locality: payload.location,
        type: payload.type,
        intent: payload.intent,
        area: `${payload.areaSqft} sq ft`,
        areaSqft: payload.areaSqft,
        bedrooms: payload.bedrooms,
        bathrooms: payload.bathrooms,
        furnishing: payload.furnishing,
        sellerName: "Dhanya Realty",
        sellerRole: "Owner",
        listedBy: "Owner",
        ownerId: "biz-1",
        verified: false,
        verificationStatus: "Pending approval",
        featured: false,
        leads: [],
        reviews: [],
      });

      contextState = {
        ...contextState,
        mockData: {
          ...contextState.mockData,
          realestateProperties: [createdListing, ...contextState.mockData.realestateProperties],
        },
      };

      return createdListing;
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

    await waitFor(() => {
      expect(contextState.createRealEstateListing).toHaveBeenCalledWith(
        expect.objectContaining({
          title: "New Marina Apartment",
          priceLabel: "88 Lakhs",
          location: "Kozhikode",
          roleMode: "owner",
        })
      );
      expect(screen.getByText(/listing drafted successfully/i)).toBeInTheDocument();
      expect(
        screen.getByRole("heading", { name: /new marina apartment/i, level: 2 })
      ).toBeInTheDocument();
    });
  });

  test("prevents a buyer account from opening the seller flow", () => {
    render(<RealEstate />);

    fireEvent.click(screen.getByRole("button", { name: /property owner/i }));

    expect(screen.getByText(/cannot access the property owner workspace/i)).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: /publish a property/i })).not.toBeInTheDocument();
  });

  test("allows admins to approve persisted listings", async () => {
    contextState.currentUser = {
      id: "admin-1",
      name: "Admin",
      email: "admin@malabarbazaar.com",
      registrationType: "admin",
      role: "admin",
    };
    contextState.mockData.realestateProperties = [
      createProperty({
        id: "re-pending",
        verified: false,
        verificationStatus: "Pending",
      }),
      createProperty({
        id: "re-2",
        title: "Smart Rental Studio",
      }),
    ];
    contextState.moderateRealEstateListing.mockImplementation(async (listingId, action) => {
      contextState = {
        ...contextState,
        mockData: {
          ...contextState.mockData,
          realestateProperties: contextState.mockData.realestateProperties.map((property) =>
            property.id === listingId
              ? {
                  ...property,
                  verified: action === "approve",
                  verificationStatus: action === "approve" ? "Verified" : "Rejected",
                }
              : property
          ),
        },
      };

      return contextState.mockData.realestateProperties.find((property) => property.id === listingId);
    });

    render(<RealEstate />);

    expect(screen.getAllByText(/^Pending$/i)[0]).toBeInTheDocument();
    fireEvent.click(screen.getByText(/^Approve listing$/i));

    await waitFor(() => {
      expect(contextState.moderateRealEstateListing).toHaveBeenCalledWith("re-pending", "approve");
      expect(screen.getAllByText(/^Verified$/i).length).toBeGreaterThanOrEqual(2);
    });
  });

  test("matches editable listings by stable owner id instead of display name order", () => {
    contextState.currentUser = {
      id: "biz-9",
      name: "Dhanya",
      email: "biz-9@example.com",
      businessName: "Dhanya Realty",
      registrationType: "entrepreneur",
      role: "business",
    };
    contextState.mockData.realestateProperties = [
      createProperty({
        ownerId: "biz-9",
        sellerEmail: "biz-9@example.com",
        sellerName: "Dhanya Realty",
      }),
      createProperty({
        id: "re-2",
        ownerId: "other-owner",
        sellerEmail: "other@example.com",
      }),
    ];

    render(<RealEstate />);

    fireEvent.click(screen.getByRole("button", { name: /agent \/ broker/i }));

    expect(screen.getAllByText(/^Edit$/i).length).toBeGreaterThan(0);
  });

  test("scopes lead management to the seller's own listings", () => {
    contextState.currentUser = {
      id: "biz-9",
      name: "Dhanya",
      email: "biz-9@example.com",
      businessName: "Dhanya Realty",
      registrationType: "entrepreneur",
      role: "business",
    };
    contextState.mockData.realestateProperties = [
      createProperty({
        id: "re-owned",
        ownerId: "biz-9",
        sellerEmail: "biz-9@example.com",
        leads: [{ name: "Haritha", channel: "Chat", priority: "Hot" }],
      }),
      createProperty({
        id: "re-other",
        ownerId: "other-owner",
        sellerEmail: "other@example.com",
        leads: [{ name: "External Lead", channel: "Call", priority: "Warm" }],
      }),
    ];

    render(<RealEstate />);

    fireEvent.click(screen.getByRole("button", { name: /agent \/ broker/i }));

    expect(screen.getByText("Haritha")).toBeInTheDocument();
    expect(screen.queryByText("External Lead")).not.toBeInTheDocument();
  });
});
