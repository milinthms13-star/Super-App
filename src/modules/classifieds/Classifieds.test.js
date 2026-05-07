import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import Classifieds from "./Classifieds";

const mockUseApp = jest.fn();
const mockAddToFavorites = jest.fn();
const mockRemoveFavorite = jest.fn();
const mockCreateClassifiedListing = jest.fn();
const mockSendClassifiedMessage = jest.fn();
const mockReportClassifiedListing = jest.fn();
const mockModerateClassifiedListing = jest.fn();
const mockDeleteClassifiedListing = jest.fn();
const mockGetClassifiedSavedSearches = jest.fn();
const mockSaveClassifiedSearch = jest.fn();
const mockAcknowledgeClassifiedSavedSearch = jest.fn();
const mockDeleteClassifiedSavedSearch = jest.fn();
const mockGetRecentlyViewedClassifieds = jest.fn();
const mockTrackClassifiedListingView = jest.fn();

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
    mockGetClassifiedSavedSearches.mockReset();
    mockSaveClassifiedSearch.mockReset();
    mockAcknowledgeClassifiedSavedSearch.mockReset();
    mockDeleteClassifiedSavedSearch.mockReset();
    mockGetRecentlyViewedClassifieds.mockReset();
    mockTrackClassifiedListingView.mockReset();
    mockCreateClassifiedListing.mockResolvedValue({
      id: "cl-new",
      title: "Used DSLR Camera Kit",
    });
    mockGetClassifiedSavedSearches.mockResolvedValue([]);
    mockSaveClassifiedSearch.mockResolvedValue({ savedSearches: [] });
    mockAcknowledgeClassifiedSavedSearch.mockResolvedValue({ savedSearches: [] });
    mockDeleteClassifiedSavedSearch.mockResolvedValue([]);
    mockGetRecentlyViewedClassifieds.mockResolvedValue([]);
    mockTrackClassifiedListingView.mockResolvedValue({ recentlyViewed: [] });
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
      getClassifiedSavedSearches: mockGetClassifiedSavedSearches,
      saveClassifiedSearch: mockSaveClassifiedSearch,
      acknowledgeClassifiedSavedSearch: mockAcknowledgeClassifiedSavedSearch,
      deleteClassifiedSavedSearch: mockDeleteClassifiedSavedSearch,
      getRecentlyViewedClassifieds: mockGetRecentlyViewedClassifieds,
      trackClassifiedListingView: mockTrackClassifiedListingView,
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
            moderationStatus: "approved",
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

  const waitForDiscoveryBoot = async () => {
    await waitFor(() => {
      expect(mockGetClassifiedSavedSearches).toHaveBeenCalled();
      expect(mockGetRecentlyViewedClassifieds).toHaveBeenCalled();
    });
  };

  test("filters marketplace listings and saves a listing", async () => {
    render(<Classifieds />);
    await waitForDiscoveryBoot();

    expect(
      screen.getByRole("heading", {
        name: /local buying, selling, discovery, and direct buyer-seller conversations in one flow/i,
      })
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /select categories/i }));
    fireEvent.click(screen.getByLabelText("Jobs"));

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

  test("hides pending and flagged listings from buyers", async () => {
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
      getClassifiedSavedSearches: mockGetClassifiedSavedSearches,
      saveClassifiedSearch: mockSaveClassifiedSearch,
      acknowledgeClassifiedSavedSearch: mockAcknowledgeClassifiedSavedSearch,
      deleteClassifiedSavedSearch: mockDeleteClassifiedSavedSearch,
      getRecentlyViewedClassifieds: mockGetRecentlyViewedClassifieds,
      trackClassifiedListingView: mockTrackClassifiedListingView,
      mockData: {
        classifiedsListings: [
          {
            id: "cl-approved",
            title: "Approved Laptop",
            description: "Visible to buyers.",
            price: 45000,
            category: "Electronics",
            location: "Kochi",
            condition: "Used",
            seller: "Visible Seller",
            moderationStatus: "approved",
            tags: ["Laptop"],
          },
          {
            id: "cl-pending",
            title: "Pending Camera",
            description: "Should stay hidden until review completes.",
            price: 22000,
            category: "Electronics",
            location: "Kochi",
            condition: "Used",
            seller: "Pending Seller",
            moderationStatus: "pending",
            tags: ["Camera"],
          },
          {
            id: "cl-flagged",
            title: "Flagged Phone",
            description: "Should not be buyer visible.",
            price: 18000,
            category: "Electronics",
            location: "Kochi",
            condition: "Used",
            seller: "Flagged Seller",
            moderationStatus: "flagged",
            tags: ["Phone"],
          },
        ],
        classifiedsMessages: [],
        classifiedsReports: [],
      },
    });

    render(<Classifieds />);
    await waitForDiscoveryBoot();

    expect(screen.getByRole("heading", { name: /approved laptop/i, level: 3 })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: /pending camera/i, level: 3 })).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: /flagged phone/i, level: 3 })).not.toBeInTheDocument();
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
      getClassifiedSavedSearches: mockGetClassifiedSavedSearches,
      saveClassifiedSearch: mockSaveClassifiedSearch,
      acknowledgeClassifiedSavedSearch: mockAcknowledgeClassifiedSavedSearch,
      deleteClassifiedSavedSearch: mockDeleteClassifiedSavedSearch,
      getRecentlyViewedClassifieds: mockGetRecentlyViewedClassifieds,
      trackClassifiedListingView: mockTrackClassifiedListingView,
      mockData: {
        classifiedsListings: [],
        classifiedsMessages: [],
        classifiedsReports: [],
      },
    });

    render(<Classifieds />);
    await waitForDiscoveryBoot();

    fireEvent.change(document.querySelector('input[name="title"]'), {
      target: { value: "Used DSLR Camera Kit" },
    });
    fireEvent.change(document.querySelector('input[name="price"]'), {
      target: { value: "42000" },
    });
    fireEvent.change(document.querySelector('input[name="location"]'), {
      target: { value: "Kochi" },
    });
    fireEvent.change(document.querySelector('textarea[name="description"]'), {
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

  test("opens the seller store with listings from the selected seller only", async () => {
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
      getClassifiedSavedSearches: mockGetClassifiedSavedSearches,
      saveClassifiedSearch: mockSaveClassifiedSearch,
      acknowledgeClassifiedSavedSearch: mockAcknowledgeClassifiedSavedSearch,
      deleteClassifiedSavedSearch: mockDeleteClassifiedSavedSearch,
      getRecentlyViewedClassifieds: mockGetRecentlyViewedClassifieds,
      trackClassifiedListingView: mockTrackClassifiedListingView,
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
            sellerEmail: "anand@example.com",
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
            title: "Office Chair Ergonomic",
            description: "Mesh back, adjustable height, and lumbar support.",
            price: 9500,
            category: "Furniture",
            location: "Trivandrum",
            locality: "Pattom",
            condition: "Used",
            seller: "Anand V",
            sellerEmail: "anand@example.com",
            sellerRole: "Verified Seller",
            posted: "2026-04-16",
            featured: false,
            verified: true,
            chats: 6,
            favorites: 9,
            views: 112,
            languageSupport: ["English", "Malayalam"],
            tags: ["Chair", "Office"],
            contactOptions: ["Chat"],
            mediaGallery: ["Front view"],
          },
          {
            id: "cl-3",
            title: "Part-time Bakery Assistant",
            description: "Morning shift role with immediate joining.",
            price: 18000,
            category: "Jobs",
            location: "Thrissur",
            locality: "Round South",
            condition: "New",
            seller: "Bake Basket",
            sellerEmail: "bakebasket@example.com",
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

    render(<Classifieds />);
    await waitForDiscoveryBoot();

    fireEvent.click(screen.getByRole("button", { name: /view seller store/i }));

    const sellerStoreDialog = screen.getByRole("dialog", { name: /seller store/i });

    expect(within(sellerStoreDialog).getByText(/gaming laptop rtx 4060/i)).toBeInTheDocument();
    expect(within(sellerStoreDialog).getByText(/office chair ergonomic/i)).toBeInTheDocument();
    expect(within(sellerStoreDialog).queryByText(/part-time bakery assistant/i)).not.toBeInTheDocument();
  });

  test("loads saved-search alerts and tracks listing views for recently viewed ads", async () => {
    mockGetClassifiedSavedSearches.mockResolvedValue([
      {
        id: "search-1",
        name: "Laptop deals",
        filters: {
          searchText: "Laptop",
          categoryFilter: ["Electronics"],
          locationFilter: [],
          conditionFilter: [],
          priceFilter: [],
          sortBy: "featured",
        },
        newMatchCount: 1,
        previewListings: [{ id: "cl-1", title: "Gaming Laptop RTX 4060" }],
      },
    ]);
    mockGetRecentlyViewedClassifieds.mockResolvedValue([
      {
        id: "cl-2",
        title: "Part-time Bakery Assistant",
        location: "Thrissur",
      },
    ]);

    render(<Classifieds />);

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: /saved search alerts/i })).toBeInTheDocument();
    });

    expect(screen.getAllByText(/laptop deals/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/gaming laptop rtx 4060/i).length).toBeGreaterThan(0);
    expect(screen.getByRole("heading", { name: /recently viewed/i })).toBeInTheDocument();
    expect(screen.getAllByText(/part-time bakery assistant/i).length).toBeGreaterThan(0);

    await waitFor(() => {
      expect(mockTrackClassifiedListingView).toHaveBeenCalledWith("cl-1");
    });
  });
});
