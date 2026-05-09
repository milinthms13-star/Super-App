import {
  buildDiscoverySuggestions,
  buildPersonalizedRecommendations,
  buildProductShareMessage,
  deriveSmartSearchPlan,
  getDefaultRefillCadenceDays,
  normalizeSearchQuery,
} from "./ecommerceDiscovery";

describe("ecommerceDiscovery", () => {
  test("normalizes Malayalam search terms into searchable English hints", () => {
    expect(normalizeSearchQuery("ചിപ്സ് under 250")).toContain("chips");
  });

  test("derives smart search filters from a natural language query", () => {
    const plan = deriveSmartSearchPlan("top rated snacks under 300", [
      "Snacks",
      "Electronics",
    ]);

    expect(plan.category).toBe("Snacks");
    expect(plan.maxPrice).toBe("300");
    expect(plan.minRating).toBe("4");
    expect(plan.sort).toBe("rating");
  });

  test("builds personalized recommendations from favorite categories", () => {
    const products = [
      { id: "1", name: "Banana Chips", category: "Snacks", businessName: "Kerala Foods", rating: 4.6, stock: 4 },
      { id: "2", name: "USB Charger", category: "Electronics", businessName: "Tech Hub", rating: 4.8, stock: 8 },
    ];

    const recommendations = buildPersonalizedRecommendations({
      products,
      favorites: [{ id: "fav-1", category: "Snacks", businessName: "Kerala Foods" }],
      recentlyViewed: [],
    });

    expect(recommendations[0].name).toBe("Banana Chips");
    expect(recommendations[0].recommendationReason).toMatch(/matches your snacks/i);
  });

  test("builds helpful discovery suggestions from history and marketplace data", () => {
    const suggestions = buildDiscoverySuggestions({
      products: [{ id: "1", category: "Snacks" }, { id: "2", category: "Snacks" }],
      searchHistory: ["banana chips"],
      favorites: [],
      recentlyViewed: [],
    });

    expect(suggestions.some((suggestion) => /banana chips/i.test(suggestion.label))).toBe(true);
    expect(suggestions.some((suggestion) => /snacks picks/i.test(suggestion.label))).toBe(true);
  });

  test("returns category-aware refill cadence and share copy", () => {
    const groceryDays = getDefaultRefillCadenceDays({
      category: "Groceries",
      name: "Rice Bag",
    });
    const electronicsDays = getDefaultRefillCadenceDays({
      category: "Electronics",
      name: "USB Charger",
    });
    const shareMessage = buildProductShareMessage({
      name: "Banana Chips",
      businessName: "Kerala Foods",
      price: 149,
      batchLocation: "Kochi",
    });

    expect(groceryDays).toBe(7);
    expect(electronicsDays).toBe(45);
    expect(shareMessage).toMatch(/Banana Chips/);
    expect(shareMessage).toMatch(/Kochi/);
  });
});
