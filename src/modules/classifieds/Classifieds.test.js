import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import Classifieds from "./Classifieds";

const mockUseApp = jest.fn();
const mockAddToFavorites = jest.fn();
const mockRemoveFavorite = jest.fn();
const mockCreateClassifiedListing = jest.fn();
const mockSendClassifiedMessage = jest.fn();
const mockReportClassifiedListing = jest.fn();
const mockModerateClassifiedListing = jest.fn();
const mockDeleteClassifiedListing = jest.fn();

jest.mock("../../contexts/AppContext", () => ({
  useApp: () => mockUseApp(),
}));

describe("Classifieds", () => {
  beforeEach(() => {
    mockAddToFavorites.mockReset();
    mockRemoveFavorite.mockReset();
    mockCreateClassifiedListing.mockReset();
    mockSendClassifiedMessage.mockReset();
    mockReportClassifiedListing.mockReset();
    mockModerateClassifiedListing.mockReset();
    mockDeleteClassifiedListing.mockReset();
    mockCreateClassifiedListing.mockResolvedValue({
      id: "cl-new",
      title: "Used DSLR Camera Kit",
    });
    mockUseApp.mockReturnValue({
      currentUser: {
        name: "Dhanya",
        registrationType: "user",
        role: "user",
      },
      favorites: [],
      addToFavorites: mockAddToFavorites,
      removeFavorite: mockRemoveFavorite,
      createClassifiedListing: mockCreateClassifiedListing,
      sendClassifiedMessage: mockSendClassifiedMessage,
      reportClassifiedListing: mockReportClassifiedListing,
      moderateClassifiedListing: mockModerateClassifiedListing,
      deleteClassifiedListing: mockDeleteClassifiedListing,
      mockData: {
        classifiedsListings: [
          {
            id: "cl-1",
            title: "Gaming Laptop RTX 4060",
            description: "High refresh display and active warranty.",
            price: 89000,
            category: "Electronics",
            location: "Trivandrum",
            locality: "Kazhakkoottam",
            condition: "Like New",
            seller: "Anand V",
            sellerRole: "Verified Seller",
            posted: "2026-04-15",
            featured: true,
            verified: true,
            chats: 15,
            favorites: 28,
            views: 430,
            languageSupport: ["English", "Malayalam"],
            tags: ["Laptop", "Warranty"],
            contactOptions: ["Chat", "Call"],
            mediaGallery: ["Open lid", "Specs"],
          },
          {
            id: "cl-2",
            title: "Part-time Bakery Assistant",
            description: "Morning shift role with immediate joining.",
            price: 18000,
            category: "Jobs",
            location: "Thrissur",
            locality: "Round South",
            condition: "New",
            seller: "Bake Basket",
            sellerRole: "Employer",
            posted: "2026-04-17",
            featured: false,
            verified: false,
            chats: 7,
            favorites: 10,
            views: 204,
            languageSupport: ["English", "Malayalam"],
            tags: ["Part time", "Bakery"],
            contactOptions: ["Chat"],
            mediaGallery: ["Storefront"],
          },
        ],
        classifiedsMessages: [],
        classifiedsReports: [],
      },
    });
  });

  test("filters marketplace listings and saves a listing", () => {
    render(<Classifieds />);

    expect(
      screen.getByRole("heading", {
        name: /local buying, selling, discovery, and direct buyer-seller conversations in one flow/i,
      })
    ).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(/category/i), {
      target: { value: "Jobs" },
    });

    expect(screen.getByRole("heading", { name: /part-time bakery assistant/i, level: 3 })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: /gaming laptop rtx 4060/i, level: 3 })).not.toBeInTheDocument();

    fireEvent.click(screen.getAllByRole("button", { name: /^save$/i })[0]);

    expect(mockAddToFavorites).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "classifieds-cl-2",
        domain: "classifieds",
        title: "Part-time Bakery Assistant",
      })
    );
  });

  test("allows seller-side ad posting", async () => {
    mockUseApp.mockReturnValue({
      currentUser: {
        name: "Dhanya",
        businessName: "Dhanya Deals",
        registrationType: "entrepreneur",
        role: "business",
      },
      favorites: [],
      addToFavorites: mockAddToFavorites,
      removeFavorite: mockRemoveFavorite,
      createClassifiedListing: mockCreateClassifiedListing,
      sendClassifiedMessage: mockSendClassifiedMessage,
      reportClassifiedListing: mockReportClassifiedListing,
      moderateClassifiedListing: mockModerateClassifiedListing,
      deleteClassifiedListing: mockDeleteClassifiedListing,
      mockData: {
        classifiedsListings: [],
        classifiedsMessages: [],
        classifiedsReports: [],
      },
    });

    render(<Classifieds />);

    fireEvent.change(screen.getByLabelText(/^title$/i), {
      target: { value: "Used DSLR Camera Kit" },
    });
    fireEvent.change(screen.getByLabelText(/^price$/i), {
      target: { value: "42000" },
    });
    fireEvent.change(screen.getAllByLabelText(/^location$/i)[1], {
      target: { value: "Kochi" },
    });
    fireEvent.change(screen.getByLabelText(/description/i), {
      target: { value: "Camera body, two lenses, tripod, and charger included." },
    });

    fireEvent.click(screen.getByRole("button", { name: /submit ad/i }));

    await waitFor(() => {
      expect(mockCreateClassifiedListing).toHaveBeenCalledWith(
        expect.objectContaining({
          title: "Used DSLR Camera Kit",
          price: 42000,
          location: "Kochi",
        })
      );
    });

    await waitFor(() => {
      expect(screen.getByText(/ad submitted successfully and stored in the database/i)).toBeInTheDocument();
    });
  });
});
