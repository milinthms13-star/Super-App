import React, { useEffect, useMemo, useRef, useState } from "react";
import PropTypes from "prop-types";
import { useApp } from "../../contexts/AppContext";
import ProductCard from "./ProductCard";
import { resolveProductImageSrc } from "./productImage";
import {
  formatDisplayDate,
  formatISODate,
  titleCase,
  parseNumericInput,
  normalizeOrderStatus,
  getNextStatus,
  formatCurrency,
} from "../../utils/ecommerceHelpers";
import { sanitizeText } from "../../utils/xssProtection";
import "../../styles/Ecommerce.css";

const DEFAULT_PRODUCT_FORM = {
  name: "",
  category: "",
  subcategory: "",
  model: "",
  color: "",
  styleTheme: "",
  description: "",
  expiryApplicable: "no",
  image: "",
};

const DEFAULT_BATCH_FORM = {
  batchLabel: "",
  stock: "",
  price: "",
  mrp: "",
  location: "",
  discountAmount: "",
  discountPercentage: "",
  discountStartDate: "",
  discountEndDate: "",
  manufacturingDate: "",
  expiryDate: "",
  returnAllowed: "no",
  returnWindowDays: "",
};

const statusCopy = {
  pending: "Pending Review",
  approved: "Approved",
  rejected: "Needs Changes",
};

const isReturnedForReview = (product) =>
  product?.approvalStatus === "pending" && Boolean(product?.moderationNote?.trim());

const availabilityCopy = {
  true: "Active",
  false: "Disabled",
};

const ORDER_STEPS = ["Confirmed", "Packed", "Shipped", "Delivered"];

const formatNumericInput = (value) => {
  if (!Number.isFinite(value)) {
    return "";
  }

  return String(Math.round(value * 100) / 100).replace(/\.0+$/, "").replace(/(\.\d*[1-9])0+$/, "$1");
};

const syncDiscountFields = (form, field, value) => {
  const nextForm = {
    ...form,
    [field]: value,
  };
  const mrp = parseNumericInput(field === "mrp" ? value : nextForm.mrp);
  const price = parseNumericInput(field === "price" ? value : nextForm.price);
  const discountAmount = parseNumericInput(field === "discountAmount" ? value : nextForm.discountAmount);
  const discountPercentage = parseNumericInput(
    field === "discountPercentage" ? value : nextForm.discountPercentage
  );

  if (field === "mrp" || field === "price") {
    if (mrp === null || price === null || mrp <= 0) {
      return {
        ...nextForm,
        discountAmount: "",
        discountPercentage: "",
      };
    }

    const safePrice = Math.min(price, mrp);
    const nextDiscountAmount = Math.max(0, mrp - safePrice);
    const nextDiscountPercentage = (nextDiscountAmount / mrp) * 100;

    return {
      ...nextForm,
      price: field === "price" ? value : formatNumericInput(safePrice),
      discountAmount: formatNumericInput(nextDiscountAmount),
      discountPercentage: formatNumericInput(nextDiscountPercentage),
    };
  }

  if (field === "discountAmount") {
    if (mrp === null || mrp <= 0) {
      return nextForm;
    }

    if (value === "") {
      return {
        ...nextForm,
        price: formatNumericInput(mrp),
        discountPercentage: "",
      };
    }

    const safeDiscountAmount = Math.min(Math.max(discountAmount || 0, 0), mrp);
    const nextPrice = mrp - safeDiscountAmount;
    const nextDiscountPercentage = (safeDiscountAmount / mrp) * 100;

    return {
      ...nextForm,
      discountAmount: formatNumericInput(safeDiscountAmount),
      price: formatNumericInput(nextPrice),
      discountPercentage: formatNumericInput(nextDiscountPercentage),
    };
  }

  if (field === "discountPercentage") {
    if (mrp === null || mrp <= 0) {
      return nextForm;
    }

    if (value === "") {
      return {
        ...nextForm,
        price: formatNumericInput(mrp),
        discountAmount: "",
      };
    }

    const safeDiscountPercentage = Math.min(Math.max(discountPercentage || 0, 0), 100);
    const nextDiscountAmount = (mrp * safeDiscountPercentage) / 100;
    const nextPrice = mrp - nextDiscountAmount;

    return {
      ...nextForm,
      discountPercentage: formatNumericInput(safeDiscountPercentage),
      discountAmount: formatNumericInput(nextDiscountAmount),
      price: formatNumericInput(nextPrice),
    };
  }

  return nextForm;
};

const getCategoryLabel = (category) => {
  if (typeof category === "string") {
    return category.trim();
  }

  if (category && typeof category === "object") {
    return String(category.name || category.label || category.id || "").trim();
  }

  return "";
};

const normalizeCategoryRecord = (category) => {
  if (typeof category === "string") {
    return {
      id: category.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-"),
      name: category.trim(),
      theme: "",
      accentColor: "",
      subcategories: [],
    };
  }

  return {
    id: String(category?.id || category?.name || "").trim(),
    name: getCategoryLabel(category),
    theme: String(category?.theme || "").trim(),
    accentColor: String(category?.accentColor || "").trim(),
    subcategories: Array.isArray(category?.subcategories)
      ? category.subcategories.map((item) => String(item || "").trim()).filter(Boolean)
      : [],
  };
};

const buildProductFormState = (product) => ({
  name: product?.name || "",
  category: product?.category || "",
  subcategory: product?.subcategory || "",
  model: product?.model || "",
  color: product?.color || "",
  styleTheme: product?.styleTheme || "",
  description: product?.description || "",
  expiryApplicable: product?.expiryApplicable ? "yes" : "no",
  image: product?.image || "",
});

const Ecommerce = ({ globeMartCategories = [], onOpenOrders, onOpenReturns }) => {
  const {
    currentUser,
    favorites,
    mockData,
    managedProducts,
    sellerOrders,
    marketplacePagination,
    managedProductsPagination,
    sellerOrdersPagination,
    productsLoading,
    productsError,
    createProduct,
    updateProduct,
    addProductInventory,
    updateProductInventory,
    setInventoryBatchAvailability,
    setProductAvailability,
    updateSellerOrderStatus,
    syncSellerOrderStatus,
    updateItemReturnRequestStatus,
    addToCart,
    loadMoreMarketplaceProducts,
    loadMoreManagedProducts,
    loadMoreSellerOrders,
  } = useApp();
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [selectedSubcategory, setSelectedSubcategory] = useState("All");
  const [selectedSeller, setSelectedSeller] = useState("All Businesses");
  const [marketplaceSearch, setMarketplaceSearch] = useState("");
  const [marketplaceSort, setMarketplaceSort] = useState("relevance");
  const [marketplaceView, setMarketplaceView] = useState("products");
  const [quickViewProduct, setQuickViewProduct] = useState(null);
  const [sellerListingQuery, setSellerListingQuery] = useState("");
  const [sellerListingStatusFilter, setSellerListingStatusFilter] = useState("all");
  const [sellerListingCategoryFilter, setSellerListingCategoryFilter] = useState("All");
  const [productForm, setProductForm] = useState(DEFAULT_PRODUCT_FORM);
  const [editingProductId, setEditingProductId] = useState("");
  const [submitMessage, setSubmitMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [productImageFile, setProductImageFile] = useState(null);
  const [productImagePreview, setProductImagePreview] = useState("");
  const [inventoryForms, setInventoryForms] = useState({});
  const [inventoryMessages, setInventoryMessages] = useState({});
  const [inventoryPending, setInventoryPending] = useState({});
  const [editingInventoryBatchIds, setEditingInventoryBatchIds] = useState({});
  const [sellerOrderConfigs, setSellerOrderConfigs] = useState({});
  const [sellerOrderMessages, setSellerOrderMessages] = useState({});
  const [sellerOrderPending, setSellerOrderPending] = useState({});
  const [sellerReturnPending, setSellerReturnPending] = useState({});
  const formPanelRef = useRef(null);
  const productNameInputRef = useRef(null);
  const productImageInputRef = useRef(null);
  const sellerOrdersSectionRef = useRef(null);
  const returnedProductsSectionRef = useRef(null);
  const sellerListingsSectionRef = useRef(null);
  const quickViewPanelRef = useRef(null);

  // Handle keyboard navigation for quick view modal
  useEffect(() => {
    if (!quickViewProduct) return;

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        setQuickViewProduct(null);
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    quickViewPanelRef.current?.focus();
    const bodyOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = bodyOverflow;
    };
  }, [quickViewProduct]);

  const isEntrepreneur =
    currentUser?.registrationType === "entrepreneur" || currentUser?.role === "business";
  const currentBusinessName = currentUser?.businessName?.trim() || currentUser?.name || "Your Business";
  const visibleProducts = mockData.ecommerceProducts;
  const visibleFavorites = favorites || [];
  const marketplaceProducts = marketplaceView === "favorites" ? visibleFavorites : visibleProducts;

  const categoryRecords = useMemo(
    () =>
      globeMartCategories
        .map(normalizeCategoryRecord)
        .filter((category) => category.name),
    [globeMartCategories]
  );

  const productCategories = useMemo(() => {
    const catalogCategories = visibleProducts.map((product) => product.category).filter(Boolean);
    const configuredCategories = categoryRecords.map((category) => category.name);

    return ["All", ...new Set([...configuredCategories, ...catalogCategories])];
  }, [categoryRecords, visibleProducts]);

  const sellerOptions = useMemo(
    () => [
      "All Businesses",
      ...new Set(visibleProducts.map((product) => product.businessName).filter(Boolean)),
    ],
    [visibleProducts]
  );

  const [esSearchResults, setEsSearchResults] = useState({ products: [], facets: {}, total: 0, loading: false });
  const [esSearchFallback, setEsSearchFallback] = useState(false);

  // Debounced ES search
  useEffect(() => {
    let timeoutId;
    if (marketplaceSearch.trim() || selectedCategory !== 'All' || selectedSeller !== 'All Businesses') {
      setEsSearchResults(prev => ({ ...prev, loading: true }));
      timeoutId = setTimeout(async () => {
        try {
          const params = new URLSearchParams({
            q: marketplaceSearch.trim(),
            category: selectedCategory === 'All' ? '' : selectedCategory,
            business: selectedSeller === 'All Businesses' ? '' : selectedSeller,
            page: '1',
            limit: '50'
          });
          const response = await fetch(`/api/products/search?${params}`);
          const data = await response.json();

          if (response.ok && data.products) {
            setEsSearchResults({
              products: data.products || [],
              facets: data.facets || {},
              total: data.pagination?.total || 0,
              loading: false
            });
            setEsSearchFallback(false);
          } else {
            setEsSearchFallback(true);
          }
        } catch (error) {
          setEsSearchFallback(true);
        } finally {
          setEsSearchResults(prev => ({ ...prev, loading: false }));
        }
      }, 300);
    } else {
      setEsSearchResults({ products: [], facets: {}, total: 0, loading: false });
    }
    return () => clearTimeout(timeoutId);
  }, [marketplaceSearch, selectedCategory, selectedSeller]);

  const filteredProducts = esSearchFallback || marketplaceView === 'favorites' 
    ? marketplaceProducts.filter((product) => {
        const normalizedSearch = marketplaceSearch.trim().toLowerCase();
        const matchesCategory = selectedCategory === "All" || product.category === selectedCategory;
        const matchesSubcategory = selectedSubcategory === "All" || product.subcategory === selectedSubcategory;
        const matchesSeller = selectedSeller === "All Businesses" || product.businessName === selectedSeller;
        const matchesSearch = !normalizedSearch || [
          product.name, product.category, product.subcategory, product.model,
          product.styleTheme, product.color, product.description, product.businessName, product.location
        ].filter(Boolean).some(value => String(value).toLowerCase().includes(normalizedSearch));
        return matchesCategory && matchesSubcategory && matchesSeller && matchesSearch;
      })
    : esSearchResults.products;
  const sortedProducts = useMemo(() => {
    const products = [...filteredProducts];
    const parsePrice = (value) => Number(String(value || "").replace(/[^0-9.]/g, "")) || 0;

    switch (marketplaceSort) {
      case "price-asc":
        return products.sort((a, b) => parsePrice(a.price) - parsePrice(b.price));
      case "price-desc":
        return products.sort((a, b) => parsePrice(b.price) - parsePrice(a.price));
      case "discount":
        return products.sort((a, b) => Number(b.discountPercentage || 0) - Number(a.discountPercentage || 0));
      case "rating":
        return products.sort((a, b) => Number(b.rating || 0) - Number(a.rating || 0));
      default:
        return products;
    }
  }, [filteredProducts, marketplaceSort]);

  const businessProducts = managedProducts.filter(
    (product) => product.sellerEmail === currentUser?.email
  );
  const returnedProducts = businessProducts.filter((product) => isReturnedForReview(product));
  const sellerListings = businessProducts.filter((product) => !isReturnedForReview(product));
  const sellerListingCategories = useMemo(
    () => ["All", ...new Set(sellerListings.map((product) => product.category).filter(Boolean))],
    [sellerListings]
  );
  const filteredSellerListings = useMemo(() => {
    const normalizedQuery = sellerListingQuery.trim().toLowerCase();

    return sellerListings.filter((product) => {
      const matchesQuery =
        !normalizedQuery ||
        [
          product.name,
          product.category,
          product.subcategory,
          product.model,
          product.styleTheme,
          product.color,
          product.description,
          product.location,
          product.businessName,
        ]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(normalizedQuery));
      const matchesStatus =
        sellerListingStatusFilter === "all" ||
        (sellerListingStatusFilter === "with-stock" && Number(product.stock || 0) > 0) ||
        (sellerListingStatusFilter === "no-stock" && Number(product.stock || 0) <= 0) ||
        (sellerListingStatusFilter === "active" && product.isActive) ||
        (sellerListingStatusFilter === "disabled" && !product.isActive) ||
        (sellerListingStatusFilter === product.approvalStatus);
      const matchesCategory =
        sellerListingCategoryFilter === "All" || product.category === sellerListingCategoryFilter;

      return matchesQuery && matchesStatus && matchesCategory;
    });
  }, [
    sellerListingCategoryFilter,
    sellerListingQuery,
    sellerListingStatusFilter,
    sellerListings,
  ]);

  const visibleSellerOrders = sellerOrders
    .map((order) => {
      const ownedFulfillment = (order.sellerFulfillments || []).find(
        (fulfillment) =>
          fulfillment.sellerEmail === currentUser?.email ||
          fulfillment.businessName === currentBusinessName
      );

      if (!ownedFulfillment) {
        return null;
      }

      return {
        ...order,
        ownedFulfillment,
        ownedItems: (order.items || []).filter(
          (item) => item.sellerKey === ownedFulfillment.sellerKey
        ),
        returnedItems: (order.items || []).filter(
          (item) => item.sellerKey === ownedFulfillment.sellerKey && item.returnRequest
        ),
      };
    })
    .filter(Boolean);

  const sellerReturnRequestCount = visibleSellerOrders.reduce(
    (total, order) => total + (order.returnedItems?.length || 0),
    0
  );
  const approvedProductCount = businessProducts.filter(
    (product) => product.approvalStatus === "approved"
  ).length;
  const pendingProductCount = businessProducts.filter(
    (product) => product.approvalStatus === "pending"
  ).length;
  const activeMarketplaceCount =
    marketplaceView === "favorites"
      ? sortedProducts.length
      : marketplacePagination.totalItems || sortedProducts.length;

  const businessCategories = useMemo(() => {
    const adminCategories = categoryRecords.map((category) => category.name).filter(Boolean);
    const subscribedCategories = (currentUser?.selectedBusinessCategories || [])
      .map((category) => getCategoryLabel(category))
      .filter(Boolean);
    const marketplaceCategories = productCategories.filter((category) => category !== "All");
    const activeCategory = getCategoryLabel(productForm.category);

    return [...new Set([...adminCategories, ...subscribedCategories, ...marketplaceCategories, activeCategory])].filter(
      Boolean
    );
  }, [categoryRecords, currentUser?.selectedBusinessCategories, productCategories, productForm.category]);

  const selectedCategoryRecord = useMemo(
    () => categoryRecords.find((category) => category.name === productForm.category) || null,
    [categoryRecords, productForm.category]
  );

  const productFormSubcategories = useMemo(() => {
    const configuredSubcategories = selectedCategoryRecord?.subcategories || [];
    const activeSubcategory = productForm.subcategory ? [productForm.subcategory] : [];

    return [...new Set([...configuredSubcategories, ...activeSubcategory])];
  }, [productForm.subcategory, selectedCategoryRecord]);

  const marketplaceSubcategories = useMemo(() => {
    if (selectedCategory === "All") {
      return ["All"];
    }

    const configuredSubcategories =
      categoryRecords.find((category) => category.name === selectedCategory)?.subcategories || [];
    const catalogSubcategories = marketplaceProducts
      .filter((product) => product.category === selectedCategory)
      .map((product) => product.subcategory)
      .filter(Boolean);

    return ["All", ...new Set([...configuredSubcategories, ...catalogSubcategories])];
  }, [categoryRecords, marketplaceProducts, selectedCategory]);

  useEffect(() => {
    if (!productForm.category && businessCategories.length > 0) {
      setProductForm((currentForm) => ({
        ...currentForm,
        category: businessCategories[0],
      }));
    }
  }, [businessCategories, productForm.category]);

  useEffect(() => {
    setSelectedSubcategory("All");
  }, [selectedCategory]);

  useEffect(() => {
    if (
      productForm.subcategory &&
      productFormSubcategories.length > 0 &&
      !productFormSubcategories.includes(productForm.subcategory)
    ) {
      setProductForm((currentForm) => ({
        ...currentForm,
        subcategory: "",
      }));
    }
  }, [productForm.subcategory, productFormSubcategories]);

  useEffect(() => {
    if (!productImageFile) {
      setProductImagePreview(resolveProductImageSrc(productForm.image));
      return undefined;
    }

    const nextPreview = URL.createObjectURL(productImageFile);
    setProductImagePreview(nextPreview);

    return () => {
      URL.revokeObjectURL(nextPreview);
    };
  }, [productForm.image, productImageFile]);

  const getInventoryForm = (productId) => inventoryForms[productId] || DEFAULT_BATCH_FORM;

  const setInventoryField = (productId, field, value) => {
    setInventoryForms((currentForms) => ({
      ...currentForms,
      [productId]: syncDiscountFields(getInventoryForm(productId), field, value),
    }));
  };

  const resetInventoryForm = (productId) => {
    setInventoryForms((currentForms) => ({
      ...currentForms,
      [productId]: DEFAULT_BATCH_FORM,
    }));
    setEditingInventoryBatchIds((currentBatchIds) => {
      const nextBatchIds = { ...currentBatchIds };
      delete nextBatchIds[productId];
      return nextBatchIds;
    });
  };

  const getSellerOrderConfig = (orderId) =>
    sellerOrderConfigs[orderId] || {
      provider: "manual",
      trackingNumber: "",
      shipmentId: "",
    };

  const scrollToSection = (sectionRef) => {
    sectionRef?.current?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  };

  const resetForm = () => {
    setProductForm(DEFAULT_PRODUCT_FORM);
    setEditingProductId("");
    setProductImageFile(null);
    if (productImageInputRef.current) {
      productImageInputRef.current.value = "";
    }
  };

  const handleProductFieldChange = (field, value) => {
    setProductForm((currentForm) => ({
      ...currentForm,
      [field]: value,
    }));
  };

  const handleProductImageChange = (event) => {
    const nextFile = event.target.files?.[0] || null;
    setProductImageFile(nextFile);
    if (nextFile) {
      setProductForm((currentForm) => ({
        ...currentForm,
        image: "",
      }));
    }
  };

  const handleCreateOrUpdateProduct = async (event) => {
    event.preventDefault();

    if (!productForm.name.trim()) {
      setSubmitMessage("Enter the product name before saving.");
      return;
    }

    if (!productForm.category.trim()) {
      setSubmitMessage("Choose a category before saving.");
      return;
    }

    const payload = new FormData();
    payload.append("name", productForm.name.trim());
    payload.append("category", productForm.category.trim());
    payload.append("subcategory", productForm.subcategory.trim());
    payload.append("model", productForm.model.trim());
    payload.append("color", productForm.color.trim());
    payload.append("styleTheme", productForm.styleTheme.trim());
    payload.append("description", productForm.description.trim());
    payload.append("expiryApplicable", String(productForm.expiryApplicable === "yes"));
    payload.append("image", productForm.image.trim());
    payload.append("sellerName", currentUser?.name || currentBusinessName);
    payload.append("businessName", currentBusinessName);
    if (productImageFile) {
      payload.append("imageFile", productImageFile);
    }

    setSubmitting(true);
    setSubmitMessage("");

    try {
      if (editingProductId) {
        await updateProduct(editingProductId, payload);
        setSubmitMessage("Product details updated and sent back for review.");
      } else {
        await createProduct(payload);
        setSubmitMessage(
          `Catalog item created under ${currentBusinessName}. It is now waiting for admin approval. Add stock batches after approval.`
        );
      }
      resetForm();
    } catch (error) {
      setSubmitMessage(
        error.response?.data?.message || "Could not save this product. Please try again."
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (product) => {
    setEditingProductId(product.id);
    setProductForm(buildProductFormState(product));
    setProductImageFile(null);
    if (productImageInputRef.current) {
      productImageInputRef.current.value = "";
    }
    setSubmitMessage("");

    requestAnimationFrame(() => {
      formPanelRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
      productNameInputRef.current?.focus();
    });
  };

  const handleAddInventory = async (product) => {
    const inventoryForm = getInventoryForm(product.id);
    const editingBatchId = editingInventoryBatchIds[product.id];
    if (!inventoryForm.stock || !inventoryForm.price || !inventoryForm.mrp || !inventoryForm.location.trim()) {
      setInventoryMessages((currentMessages) => ({
        ...currentMessages,
        [product.id]: "Enter stock quantity, dispatch location, selling price, and MRP before saving the batch.",
      }));
      return;
    }

    if (Number(inventoryForm.mrp) < Number(inventoryForm.price)) {
      setInventoryMessages((currentMessages) => ({
        ...currentMessages,
        [product.id]: "MRP must be greater than or equal to the selling price.",
      }));
      return;
    }

    if (inventoryForm.discountEndDate && !inventoryForm.discountStartDate) {
      setInventoryMessages((currentMessages) => ({
        ...currentMessages,
        [product.id]: "Choose a discount start date when a discount end date is selected.",
      }));
      return;
    }

    if (
      inventoryForm.discountStartDate &&
      inventoryForm.discountEndDate &&
      new Date(inventoryForm.discountEndDate) < new Date(inventoryForm.discountStartDate)
    ) {
      setInventoryMessages((currentMessages) => ({
        ...currentMessages,
        [product.id]: "Discount end date cannot be earlier than the discount start date.",
      }));
      return;
    }

    if (
      inventoryForm.manufacturingDate &&
      product.expiryApplicable &&
      inventoryForm.expiryDate &&
      new Date(inventoryForm.expiryDate) < new Date(inventoryForm.manufacturingDate)
    ) {
      setInventoryMessages((currentMessages) => ({
        ...currentMessages,
        [product.id]: "Expiry date cannot be earlier than the manufacturing date.",
      }));
      return;
    }

    if (product.expiryApplicable && !inventoryForm.expiryDate) {
      setInventoryMessages((currentMessages) => ({
        ...currentMessages,
        [product.id]: "Expiry date is required for this product.",
      }));
      return;
    }

    if (inventoryForm.returnAllowed === "yes" && Number(inventoryForm.returnWindowDays || 0) <= 0) {
      setInventoryMessages((currentMessages) => ({
        ...currentMessages,
        [product.id]: "Enter the number of return days when returns are allowed for this batch.",
      }));
      return;
    }

    setInventoryPending((currentPending) => ({ ...currentPending, [product.id]: true }));
    setInventoryMessages((currentMessages) => ({ ...currentMessages, [product.id]: "" }));

    try {
      const payload = {
        batchLabel: inventoryForm.batchLabel.trim(),
        stock: Number(inventoryForm.stock),
        price: Number(inventoryForm.price),
        mrp: Number(inventoryForm.mrp),
        location: inventoryForm.location.trim(),
        discountAmount: Number(inventoryForm.discountAmount || 0),
        discountPercentage: Number(inventoryForm.discountPercentage || 0),
        discountStartDate: inventoryForm.discountStartDate || null,
        discountEndDate: inventoryForm.discountEndDate || null,
        manufacturingDate: inventoryForm.manufacturingDate || null,
        expiryDate: product.expiryApplicable ? inventoryForm.expiryDate || null : null,
        returnAllowed: inventoryForm.returnAllowed === "yes",
        returnWindowDays:
          inventoryForm.returnAllowed === "yes"
            ? Number(inventoryForm.returnWindowDays || 0)
            : 0,
      };

      if (editingBatchId) {
        await updateProductInventory(product.id, editingBatchId, payload);
      } else {
        await addProductInventory(product.id, payload);
      }

      resetInventoryForm(product.id);
      setInventoryMessages((currentMessages) => ({
        ...currentMessages,
        [product.id]: editingBatchId
          ? "Stock batch updated successfully."
          : "Stock batch saved successfully.",
      }));
    } catch (error) {
      setInventoryMessages((currentMessages) => ({
        ...currentMessages,
        [product.id]:
          error.response?.data?.message || "Could not save this stock batch right now.",
      }));
    } finally {
      setInventoryPending((currentPending) => ({ ...currentPending, [product.id]: false }));
    }
  };

  const handleEditInventoryBatch = (product, batch) => {
    setEditingInventoryBatchIds((currentBatchIds) => ({
      ...currentBatchIds,
      [product.id]: batch.id,
    }));
    setInventoryForms((currentForms) => ({
      ...currentForms,
      [product.id]: {
        batchLabel: batch.batchLabel || "",
        stock: String(batch.stock ?? ""),
        price: String(batch.price ?? ""),
        mrp: String(batch.mrp ?? ""),
        location: batch.location || "",
        discountAmount: String(batch.discountAmount ?? ""),
        discountPercentage: String(batch.discountPercentage ?? ""),
        discountStartDate: formatISODate(batch.discountStartDate),
        discountEndDate: formatISODate(batch.discountEndDate),
        manufacturingDate: formatISODate(batch.manufacturingDate),
        expiryDate: formatISODate(batch.expiryDate),
        returnAllowed: batch.returnAllowed ? "yes" : "no",
        returnWindowDays:
          batch.returnAllowed && Number(batch.returnWindowDays || 0) > 0
            ? String(batch.returnWindowDays)
            : "",
      },
    }));
    setInventoryMessages((currentMessages) => ({
      ...currentMessages,
      [product.id]: `Editing batch ${batch.batchLabel || batch.id}.`,
    }));
  };

  const handleInventoryBatchAvailability = async (product, batch) => {
    setInventoryPending((currentPending) => ({ ...currentPending, [product.id]: true }));
    setInventoryMessages((currentMessages) => ({ ...currentMessages, [product.id]: "" }));

    try {
      await setInventoryBatchAvailability(product.id, batch.id, !batch.isActive);
      if (batch.isActive && editingInventoryBatchIds[product.id] === batch.id) {
        resetInventoryForm(product.id);
      }
      setInventoryMessages((currentMessages) => ({
        ...currentMessages,
        [product.id]: batch.isActive
          ? "Stock batch disabled successfully."
          : "Stock batch enabled successfully.",
      }));
    } catch (error) {
      setInventoryMessages((currentMessages) => ({
        ...currentMessages,
        [product.id]:
          error.response?.data?.message || "Could not update this stock batch right now.",
      }));
    } finally {
      setInventoryPending((currentPending) => ({ ...currentPending, [product.id]: false }));
    }
  };

  const handleToggleAvailability = async (product) => {
    try {
      await setProductAvailability(product.id, !product.isActive);
      setSubmitMessage(
        product.isActive
          ? "Product disabled. Saved data is preserved and hidden from shoppers."
          : "Product enabled successfully."
      );
    } catch (error) {
      setSubmitMessage(
        error.response?.data?.message || "Could not update this product. Please try again."
      );
    }
  };

  const handleSellerOrderFieldChange = (orderId, field, value) => {
    setSellerOrderConfigs((currentConfigs) => ({
      ...currentConfigs,
      [orderId]: {
        ...getSellerOrderConfig(orderId),
        [field]: value,
      },
    }));
  };

  const handleAdvanceSellerOrder = async (order) => {
    const currentStatus = normalizeOrderStatus(order.ownedFulfillment?.status, ORDER_STEPS);
    const nextStatus = getNextStatus(currentStatus, ORDER_STEPS);

    if (currentStatus === "Delivered") {
      setSellerOrderMessages((currentMessages) => ({
        ...currentMessages,
        [order.id]: "This seller segment is already delivered.",
      }));
      return;
    }

    const config = getSellerOrderConfig(order.id);
    setSellerOrderPending((currentPending) => ({ ...currentPending, [order.id]: true }));
    setSellerOrderMessages((currentMessages) => ({ ...currentMessages, [order.id]: "" }));

    try {
      await updateSellerOrderStatus(order.id, {
        sellerKey: order.ownedFulfillment.sellerKey,
        status: nextStatus,
        provider: config.provider || "manual",
        trackingNumber: config.trackingNumber || "",
        shipmentId: config.shipmentId || "",
      });

      setSellerOrderMessages((currentMessages) => ({
        ...currentMessages,
        [order.id]: `Moved this seller segment to ${nextStatus}.`,
      }));
    } catch (error) {
      setSellerOrderMessages((currentMessages) => ({
        ...currentMessages,
        [order.id]:
          error.response?.data?.message || "Could not update this seller order right now.",
      }));
    } finally {
      setSellerOrderPending((currentPending) => ({ ...currentPending, [order.id]: false }));
    }
  };

  const handleSyncSellerOrder = async (order) => {
    const config = getSellerOrderConfig(order.id);
    if (!config.trackingNumber && !config.shipmentId) {
      setSellerOrderMessages((currentMessages) => ({
        ...currentMessages,
        [order.id]: "Enter a tracking number or shipment ID before syncing.",
      }));
      return;
    }

    if (config.provider === "manual") {
      setSellerOrderMessages((currentMessages) => ({
        ...currentMessages,
        [order.id]: "Choose Shiprocket or DHL to sync provider status.",
      }));
      return;
    }

    setSellerOrderPending((currentPending) => ({ ...currentPending, [order.id]: true }));
    setSellerOrderMessages((currentMessages) => ({ ...currentMessages, [order.id]: "" }));

    try {
      const result = await syncSellerOrderStatus(order.id, {
        sellerKey: order.ownedFulfillment.sellerKey,
        provider: config.provider,
        trackingNumber: config.trackingNumber || "",
        shipmentId: config.shipmentId || "",
      });

      setSellerOrderMessages((currentMessages) => ({
        ...currentMessages,
        [order.id]: `Synced from ${config.provider}. Provider status: ${result?.providerStatus || "updated"}.`,
      }));
    } catch (error) {
      setSellerOrderMessages((currentMessages) => ({
        ...currentMessages,
        [order.id]:
          error.response?.data?.message || "Could not sync this seller order right now.",
      }));
    } finally {
      setSellerOrderPending((currentPending) => ({ ...currentPending, [order.id]: false }));
    }
  };

  const handleSellerReturnAction = async (orderId, itemId, action) => {
    const pendingKey = `${orderId}-${itemId}-${action}`;
    setSellerReturnPending((current) => ({ ...current, [pendingKey]: true }));

    try {
      await updateItemReturnRequestStatus(orderId, itemId, { action });
      setSellerOrderMessages((currentMessages) => ({
        ...currentMessages,
        [orderId]:
          action === "approve"
            ? "Return request approved."
            : action === "reject"
              ? "Return request rejected."
              : "Refund marked as completed.",
      }));
    } catch (error) {
      setSellerOrderMessages((currentMessages) => ({
        ...currentMessages,
        [orderId]:
          error.response?.data?.message || "Could not update the return request right now.",
      }));
    } finally {
      setSellerReturnPending((current) => ({ ...current, [pendingKey]: false }));
    }
  };

  return (
    <div className="ecommerce-container">
      <div className="ecommerce-header">
        <h1>GlobeMart</h1>
        <p>
          {isEntrepreneur
            ? `Manage your catalog for ${currentBusinessName}, get product approval first, and add stock batch details only when inventory arrives.`
            : "Browse approved products from GlobeMart businesses and add them to your cart."}
        </p>
      </div>

      {(onOpenOrders || onOpenReturns) && (
        <div className="globemart-subnav">
          <button type="button" className="subnav-btn" onClick={() => onOpenOrders && onOpenOrders()}>
            Order History
          </button>
          <button type="button" className="subnav-btn" onClick={() => onOpenReturns && onOpenReturns()}>
            Refunds & Returns
          </button>
        </div>
      )}

      {productsError && <div className="products-notice">{productsError}</div>}
      {isEntrepreneur && (
        <div className="products-notice">
          Product approval is separate from inventory. Create the catalog item first, then add stock batches with dispatch location, pricing, and optional expiry details.
        </div>
      )}

      {isEntrepreneur && (
        <section className="seller-layout">
          <article className="seller-panel seller-summary-card">
            <span className="seller-summary-label">Entrepreneur Workspace</span>
            <div className="seller-summary-hero">
              <div>
                <h2>{currentBusinessName}</h2>
                <p>
                  Submit product basics for approval first. Stock, MRP, selling price, dispatch
                  location, manufacturing date, and expiry date are managed separately as inventory batches.
                </p>
              </div>
              <div className="seller-summary-pulse">
                <span>Catalog Health</span>
                <strong>{approvedProductCount}/{managedProductsPagination.totalItems || businessProducts.length}</strong>
                <small>approved listings</small>
              </div>
            </div>
            <div className="seller-summary-highlights">
              <button type="button" className="seller-summary-link" onClick={() => scrollToSection(formPanelRef)}>
                {pendingProductCount} awaiting review
              </button>
              <button
                type="button"
                className="seller-summary-link"
                onClick={() => scrollToSection(sellerOrdersSectionRef)}
              >
                {sellerReturnRequestCount} return actions waiting
              </button>
              <button
                type="button"
                className="seller-summary-link"
                onClick={() => scrollToSection(sellerOrdersSectionRef)}
              >
                {sellerOrdersPagination.totalItems || visibleSellerOrders.length} live seller orders
              </button>
            </div>
            <div className="seller-stats">
              <button
                type="button"
                className="seller-stat"
                onClick={() => scrollToSection(sellerListingsSectionRef)}
              >
                <strong>{managedProductsPagination.totalItems || businessProducts.length}</strong>
                <span>Total listings</span>
              </button>
              <button
                type="button"
                className="seller-stat"
                onClick={() => scrollToSection(sellerListingsSectionRef)}
              >
                <strong>
                  {businessProducts.filter((product) => product.approvalStatus === "approved").length}
                </strong>
                <span>Approved products</span>
              </button>
              <button
                type="button"
                className="seller-stat seller-stat-alert"
                onClick={() => scrollToSection(returnedProductsSectionRef)}
              >
                <strong>{returnedProducts.length}</strong>
                <span>Returned for review</span>
              </button>
              <button
                type="button"
                className="seller-stat"
                onClick={() => scrollToSection(sellerOrdersSectionRef)}
              >
                <strong>{sellerOrdersPagination.totalItems || visibleSellerOrders.length}</strong>
                <span>Seller orders</span>
              </button>
              <button
                type="button"
                className="seller-stat seller-stat-alert"
                onClick={() => scrollToSection(sellerOrdersSectionRef)}
              >
                <strong>{sellerReturnRequestCount}</strong>
                <span>Return requests</span>
              </button>
            </div>
          </article>

          <article className="seller-panel seller-form-panel" ref={formPanelRef}>
            <div className="section-heading">
              <h2>{editingProductId ? "Edit Product Details" : "Create Product For Approval"}</h2>
              <p>
                {editingProductId
                  ? "Update the catalog details. Entrepreneur edits go back into review."
                  : "Add only the catalog details here. Inventory batches are added after the product is created."}
              </p>
            </div>
            <div className="seller-form-intro">
              <span>Step 1: catalog basics</span>
              <span>Step 2: wait for approval</span>
              <span>Step 3: add stock batches</span>
            </div>

            <form className="seller-product-form" onSubmit={handleCreateOrUpdateProduct}>
              <label className="seller-field">
                <span>Product Name</span>
                <input
                  ref={productNameInputRef}
                  type="text"
                  value={productForm.name}
                  onChange={(event) => handleProductFieldChange("name", event.target.value)}
                  placeholder="Ex: Kerala Banana Chips"
                />
              </label>

              <label className="seller-field">
                <span>Category</span>
                <select
                  value={productForm.category}
                  onChange={(event) => handleProductFieldChange("category", event.target.value)}
                >
                  <option value="" disabled>
                    Select a category
                  </option>
                  {businessCategories.map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
              </label>

              <label className="seller-field">
                <span>Subcategory</span>
                <select
                  value={productForm.subcategory}
                  onChange={(event) => handleProductFieldChange("subcategory", event.target.value)}
                >
                  <option value="">Select a subcategory</option>
                  {productFormSubcategories.map((subcategory) => (
                    <option key={subcategory} value={subcategory}>
                      {subcategory}
                    </option>
                  ))}
                </select>
              </label>

              <label className="seller-field">
                <span>Color Style</span>
                <input
                  type="text"
                  value={productForm.color}
                  onChange={(event) => handleProductFieldChange("color", event.target.value)}
                  placeholder="Ex: Midnight Blue"
                />
              </label>

              <label className="seller-field">
                <span>Model</span>
                <input
                  type="text"
                  value={productForm.model}
                  onChange={(event) => handleProductFieldChange("model", event.target.value)}
                  placeholder="Ex: iPhone 15, WH-1000XM5, Galaxy Tab S9"
                />
              </label>

              <label className="seller-field">
                <span>Theme / Style</span>
                <input
                  type="text"
                  value={productForm.styleTheme}
                  onChange={(event) => handleProductFieldChange("styleTheme", event.target.value)}
                  placeholder="Ex: Minimal, Festive, Gaming"
                />
              </label>

              <label className="seller-field">
                <span>Expiry Date Applicable?</span>
                <select
                  value={productForm.expiryApplicable}
                  onChange={(event) => handleProductFieldChange("expiryApplicable", event.target.value)}
                >
                  <option value="no">No</option>
                  <option value="yes">Yes</option>
                </select>
              </label>

              <label className="seller-field">
                <span>Product Image</span>
                <input
                  ref={productImageInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleProductImageChange}
                />
                <p className="seller-discount-note">
                  Attach a product screenshot or image. If GridFS is unavailable in local development, it safely falls back to inline preview storage.
                </p>
              </label>

              <div className="seller-field">
                <span>Image Preview</span>
                <div className="seller-image-preview">
                  {productImagePreview ? (
                    <img src={productImagePreview} alt={productForm.name || "Product preview"} />
                  ) : (
                    <span>{productForm.name?.slice(0, 1)?.toUpperCase() || "P"}</span>
                  )}
                </div>
              </div>

              <label className="seller-field seller-field-full">
                <span>Description</span>
                <textarea
                  value={productForm.description}
                  onChange={(event) => handleProductFieldChange("description", event.target.value)}
                  placeholder="Write a short description for customers."
                  rows="4"
                />
              </label>

              <div className="seller-field seller-field-full">
                <span>Approval Flow</span>
                <p className="seller-discount-note">
                  This form captures the catalog basics, including category styling details. Stock, dispatch location, and MRP are still added separately in stock batches.
                </p>
              </div>

              {submitMessage && (
                <div className="seller-form-feedback seller-field-full">
                  <strong>{editingProductId ? "Update status" : "Submission status"}</strong>
                  <p>{submitMessage}</p>
                </div>
              )}

              <div className="seller-form-actions seller-field-full">
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  {submitting
                    ? "Saving..."
                    : editingProductId
                      ? "Save Product Details"
                      : "Submit For Approval"}
                </button>
                {editingProductId && (
                  <button type="button" className="btn btn-outline" onClick={resetForm}>
                    Cancel Edit
                  </button>
                )}
              </div>
            </form>
          </article>
        </section>
      )}

      <div className="filter-section">
        <div className="section-heading marketplace-heading">
          <div>
            <h3>Marketplace Catalog</h3>
            <p>Only approved products with available non-expired stock appear here for shoppers.</p>
          </div>
          <div className="marketplace-summary">
            <strong>{activeMarketplaceCount}</strong>
            <span>{marketplaceView === "favorites" ? "saved favorites" : "live listings"}</span>
          </div>
        </div>

        <div className="marketplace-toolbar">
          <div className="marketplace-view-toggle">
            <button
              type="button"
              className={`filter-btn ${marketplaceView === "products" ? "active" : ""}`}
              onClick={() => setMarketplaceView("products")}
            >
              Products
            </button>
            <button
              type="button"
              className={`filter-btn ${marketplaceView === "favorites" ? "active" : ""}`}
              onClick={() => setMarketplaceView("favorites")}
            >
              Favorites
            </button>
          </div>

          <div className="marketplace-controls">
    <label className="seller-filter marketplace-filter-card">
      <span className="marketplace-filter-label">Search products</span>
      <div className="es-search-container">
        <input
          type="search"
          value={marketplaceSearch}
          onChange={(event) => setMarketplaceSearch(event.target.value)}
          placeholder="Search by product, category, description, or business"
          className={esSearchResults.loading ? 'loading' : ''}
        />
        {esSearchResults.loading && <span className="search-spinner">🔍</span>}
        {esSearchFallback && <span className="search-fallback">Fallback</span>}
      </div>
    </label>

            <label className="seller-filter marketplace-filter-card">
              <span className="marketplace-filter-label">Sort by</span>
              <select value={marketplaceSort} onChange={(event) => setMarketplaceSort(event.target.value)}>
                <option value="relevance">Relevance</option>
                <option value="price-asc">Price: Low to High</option>
                <option value="price-desc">Price: High to Low</option>
                <option value="discount">Best Discount</option>
                <option value="rating">Top Rated</option>
              </select>
            </label>
          </div>
        </div>

        <div className="marketplace-filters">
          <div className="marketplace-filter-card">
            <span className="marketplace-filter-label">Browse by category</span>
            <div className="category-filters">
              {productCategories.map((category) => (
                <button
                  key={category}
                  type="button"
                  className={`filter-btn ${selectedCategory === category ? "active" : ""}`}
                  onClick={() => setSelectedCategory(category)}
                >
                  {category}
                </button>
              ))}
            </div>
          </div>

          <div className="marketplace-filter-card">
            <span className="marketplace-filter-label">Filter by seller</span>
            <div className="category-filters">
              {sellerOptions.map((seller) => (
                <button
                  key={seller}
                  type="button"
                  className={`filter-btn ${selectedSeller === seller ? "active" : ""}`}
                  onClick={() => setSelectedSeller(seller)}
                >
                  {seller}
                </button>
              ))}
            </div>
          </div>

          {selectedCategory !== "All" && marketplaceSubcategories.length > 1 && (
            <div className="marketplace-filter-card">
              <span className="marketplace-filter-label">Featured subcategories</span>
              <div className="category-filters">
                {marketplaceSubcategories.map((subcategory) => (
                  <button
                    key={subcategory}
                    type="button"
                    className={`filter-btn ${selectedSubcategory === subcategory ? "active" : ""}`}
                    onClick={() => setSelectedSubcategory(subcategory)}
                  >
                    {subcategory}
                  </button>
                ))}
              </div>
            </div>
          )}

          <label className="seller-filter marketplace-filter-card">
            <span className="marketplace-filter-label">Filter by business</span>
            <select value={selectedSeller} onChange={(event) => setSelectedSeller(event.target.value)}>
              {sellerOptions.map((seller) => (
                <option key={seller} value={seller}>
                  {seller}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      {isEntrepreneur && (
        <section className="seller-listings" ref={sellerOrdersSectionRef}>
          <div className="section-heading">
            <h3>Seller Orders</h3>
            <p>
              Only your item group can be fulfilled here. Admin can view the order, but cannot move your status.
            </p>
          </div>

          {visibleSellerOrders.length === 0 ? (
            <div className="seller-empty-state">
              <h4>No seller orders yet</h4>
              <p>Your seller-managed order segments will appear here after customers place orders for your products.</p>
            </div>
          ) : (
            <div className="seller-orders-grid">
              {visibleSellerOrders.map((order) => {
                const currentStatus = normalizeOrderStatus(order.ownedFulfillment?.status, ORDER_STEPS);
                const nextStatus = getNextStatus(currentStatus, ORDER_STEPS);
                const orderConfig = getSellerOrderConfig(order.id);
                const isDelivered = currentStatus === "Delivered";
                const isPending = Boolean(sellerOrderPending[order.id]);

                return (
                  <article className="seller-order-card" key={order.id}>
                    <div className="seller-order-top">
                      <div>
                        <h4>Order #{String(order.id).slice(0, 8)}</h4>
                        <p>{formatDisplayDate(order.createdAt)}</p>
                      </div>
                      <span className={`listing-status seller-order-status seller-order-status-${currentStatus.toLowerCase()}`}>
                        {currentStatus}
                      </span>
                    </div>

                    <div className="seller-order-meta">
                      <span>Total order: INR {formatCurrency(order.amount)}</span>
                      <span>Customer: {order.customerName || "Shopper"}</span>
                      <span>Business: {order.ownedFulfillment?.businessName || currentBusinessName}</span>
                    </div>

                    <div className="seller-order-items">
                      {order.ownedItems.map((item) => (
                        <div className="seller-order-item" key={`${order.id}-${item.id}`}>
                          <strong>{item.name}</strong>
                          <span>Qty {item.quantity}</span>
                          <span>INR {item.price}</span>
                          <span>
                            {item.batchLabel ? `Batch ${item.batchLabel}` : "Batch info unavailable"}
                          </span>
                          <span>
                            {item.batchLocation || item.location
                              ? `Dispatch ${item.batchLocation || item.location}`
                              : "Dispatch info unavailable"}
                          </span>
                        </div>
                      ))}
                    </div>

                    {order.returnedItems?.length > 0 && (
                      <div className="seller-return-requests">
                        <div className="seller-inventory-header">
                          <h5>Return Requests</h5>
                          <p>These customer return/refund requests are linked to your ordered stock batches.</p>
                        </div>
                        <div className="seller-return-request-list">
                          {order.returnedItems.map((item) => (
                            <article className="seller-return-request-card" key={`${order.id}-${item.id}-return`}>
                              <div className="seller-return-request-top">
                                <div>
                                  <strong>{item.name}</strong>
                                  <p>
                                    {item.batchLabel ? `Batch ${item.batchLabel}` : "Batch info unavailable"}
                                    {item.batchLocation || item.location
                                      ? ` · Dispatch from ${item.batchLocation || item.location}`
                                      : ""}
                                  </p>
                                </div>
                                <span className="listing-status listing-status-returned">
                                  {item.returnRequest?.refundStatus || item.returnRequest?.status || "requested"}
                                </span>
                              </div>
                              <div className="seller-return-request-meta">
                                <span>Qty {item.quantity}</span>
                                <span>Reason: {titleCase(item.returnRequest?.reason) || "Not shared"}</span>
                                <span>Requested {formatDisplayDate(item.returnRequest?.requestedAt)}</span>
                              </div>
                              {item.returnRequest?.details && (
                                <p className="moderation-note seller-review-note">{item.returnRequest.details}</p>
                              )}
                              <div className="seller-card-actions">
                                <button
                                  type="button"
                                  className="btn btn-outline"
                                  onClick={() => handleSellerReturnAction(order.id, item.id, "approve")}
                                  disabled={Boolean(sellerReturnPending[`${order.id}-${item.id}-approve`])}
                                  aria-label={`Approve return request for ${item.name}`}
                                >
                                  {sellerReturnPending[`${order.id}-${item.id}-approve`] ? "Updating..." : "Approve Return"}
                                </button>
                                <button
                                  type="button"
                                  className="btn btn-outline moderation-reject-btn"
                                  onClick={() => handleSellerReturnAction(order.id, item.id, "reject")}
                                  disabled={Boolean(sellerReturnPending[`${order.id}-${item.id}-reject`])}
                                  aria-label={`Reject return request for ${item.name}`}
                                >
                                  {sellerReturnPending[`${order.id}-${item.id}-reject`] ? "Updating..." : "Reject Return"}
                                </button>
                                <button
                                  type="button"
                                  className="btn btn-primary"
                                  onClick={() => handleSellerReturnAction(order.id, item.id, "refund_completed")}
                                  disabled={Boolean(sellerReturnPending[`${order.id}-${item.id}-refund_completed`])}
                                  aria-label={`Mark refund completed for ${item.name}`}
                                >
                                  {sellerReturnPending[`${order.id}-${item.id}-refund_completed`] ? "Updating..." : "Mark Refund Completed"}
                                </button>
                              </div>
                            </article>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="seller-order-controls">
                      <label className="seller-field">
                        <span>Update Source</span>
                        <select
                          value={orderConfig.provider}
                          onChange={(event) => handleSellerOrderFieldChange(order.id, "provider", event.target.value)}
                        >
                          <option value="manual">Manual</option>
                          <option value="shiprocket">Shiprocket API</option>
                          <option value="dhl">DHL API</option>
                        </select>
                      </label>

                      <label className="seller-field">
                        <span>Tracking Number</span>
                        <input
                          type="text"
                          value={orderConfig.trackingNumber}
                          onChange={(event) => handleSellerOrderFieldChange(order.id, "trackingNumber", event.target.value)}
                          placeholder="Enter tracking number"
                        />
                      </label>

                      <label className="seller-field">
                        <span>Shipment ID</span>
                        <input
                          type="text"
                          value={orderConfig.shipmentId}
                          onChange={(event) => handleSellerOrderFieldChange(order.id, "shipmentId", event.target.value)}
                          placeholder="Optional shipment ID"
                        />
                      </label>
                    </div>

                    <div className="seller-card-actions">
                      <button
                        type="button"
                        className="btn btn-primary"
                        onClick={() => handleAdvanceSellerOrder(order)}
                        disabled={isPending || isDelivered}
                      >
                        {isPending
                          ? "Updating..."
                          : isDelivered
                            ? "Delivered"
                            : `Move to ${nextStatus}`}
                      </button>
                      <button
                        type="button"
                        className="btn btn-outline"
                        onClick={() => handleSyncSellerOrder(order)}
                        disabled={isPending || orderConfig.provider === "manual"}
                      >
                        Sync Status
                      </button>
                    </div>

                    {sellerOrderMessages[order.id] && (
                      <p className="seller-form-message">{sellerOrderMessages[order.id]}</p>
                    )}
                  </article>
                );
              })}
            </div>
          )}
          {sellerOrdersPagination.hasNextPage && (
            <button type="button" className="btn btn-outline" onClick={loadMoreSellerOrders}>
              Load more seller orders
            </button>
          )}

          <div className="section-heading seller-listings-heading" ref={returnedProductsSectionRef}>
            <h3>Returned For Review</h3>
            <p>These products were sent back by admin. Update the details and save them again to resubmit for approval.</p>
          </div>

          {returnedProducts.length === 0 ? (
            <div className="seller-empty-state seller-review-empty-state">
              <h4>No returned products</h4>
              <p>Products that need your corrections will be highlighted here.</p>
            </div>
          ) : (
            <div className="seller-review-grid">
              {returnedProducts.map((product) => (
                <article className="seller-product-card seller-review-card" key={product.id}>
                  <div className="seller-review-banner">Action needed</div>
                  <div className="seller-product-top">
                    <div>
                      <h4>{product.name}</h4>
                      <p>{product.category}</p>
                    </div>
                    <span className="listing-status listing-status-returned">Returned For Review</span>
                  </div>
                  <p className="seller-product-summary">{product.description || "No description added yet."}</p>
                  <p className="moderation-note seller-review-note">Admin note: {product.moderationNote}</p>
                  <div className="seller-product-meta">
                    <span>{product.location || "Dispatch location comes from stock batch"}</span>
                    <span>{Number(product.stock || 0) > 0 ? `${product.stock} in stock` : "No stock batches added yet"}</span>
                    <span>{product.isActive ? "Listing is active" : "Listing is disabled"}</span>
                  </div>
                  <div className="seller-card-actions seller-product-actions">
                    <button type="button" className="btn btn-primary" onClick={() => handleEdit(product)}>
                      Review And Edit
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}

          <div className="section-heading seller-listings-heading" ref={sellerListingsSectionRef}>
            <h3>My Listings And Stock Batches</h3>
            <p>Catalog approval happens first. Dispatch location, expiry, and pricing live in stock batches, not the product card.</p>
          </div>

          <div className="seller-listing-toolbar">
            <label className="seller-field seller-listing-search">
              <span>Search listings</span>
              <input
                type="search"
                value={sellerListingQuery}
                onChange={(event) => setSellerListingQuery(event.target.value)}
                placeholder="Search by product, category, description, or business"
              />
            </label>

            <label className="seller-field seller-listing-filter">
              <span>Status</span>
              <select
                value={sellerListingStatusFilter}
                onChange={(event) => setSellerListingStatusFilter(event.target.value)}
              >
                <option value="all">All listings</option>
                <option value="approved">Approved</option>
                <option value="pending">Awaiting admin review</option>
                <option value="rejected">Needs changes</option>
                <option value="with-stock">With stock</option>
                <option value="no-stock">No stock</option>
                <option value="active">Active only</option>
                <option value="disabled">Disabled only</option>
              </select>
            </label>

            <label className="seller-field seller-listing-filter">
              <span>Category</span>
              <select
                value={sellerListingCategoryFilter}
                onChange={(event) => setSellerListingCategoryFilter(event.target.value)}
              >
                {sellerListingCategories.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </label>

            <div className="seller-listing-results">
              <strong>{filteredSellerListings.length}</strong>
              <span>matching listings</span>
            </div>
          </div>

          {sellerListings.length === 0 ? (
            <div className="seller-empty-state">
              <h4>No products yet</h4>
              <p>Your active and standard product listings will appear here after you create the first one.</p>
            </div>
          ) : filteredSellerListings.length === 0 ? (
            <div className="seller-empty-state">
              <h4>No listings match these filters</h4>
              <p>Try a different search term or switch the status/category filters.</p>
            </div>
          ) : (
            <div className="seller-listings-grid">
              {filteredSellerListings.map((product) => {
                const inventoryForm = getInventoryForm(product.id);
                const editingBatchId = editingInventoryBatchIds[product.id];
                const hasInventory = Number(product.stock || 0) > 0;
                const latestBatch =
                  product.inventoryBatches?.find((batch) => batch.isActive && !batch.isExpired) ||
                  product.inventoryBatches?.[0];

                return (
                  <article className="seller-product-card" key={product.id}>
                    <div className="seller-product-top">
                      <div>
                        <h4>{product.name}</h4>
                        <p>{product.category}</p>
                      </div>
                      <span className={`listing-status listing-status-${product.approvalStatus}`}>
                        {statusCopy[product.approvalStatus] || product.approvalStatus}
                      </span>
                    </div>
                    <p className={`availability-note availability-note-${product.isActive ? "active" : "disabled"}`}>
                      {availabilityCopy[String(product.isActive)]}
                    </p>
                    {(product.subcategory || product.model || product.styleTheme || product.color) && (
                      <div className="product-attribute-row">
                        {product.subcategory && <span className="product-attribute-chip">{product.subcategory}</span>}
                        {product.model && <span className="product-attribute-chip">{product.model}</span>}
                        {product.styleTheme && <span className="product-attribute-chip">{product.styleTheme}</span>}
                        {product.color && <span className="product-attribute-chip">{product.color}</span>}
                      </div>
                    )}
                    <p className="seller-product-summary">{product.description || "No description added yet."}</p>
                    <div className="seller-product-meta">
                      <span>{product.location || "Dispatch location comes from stock batch"}</span>
                      <span>{hasInventory ? `${product.stock} in stock` : "No stock batches added yet"}</span>
                      <span>{hasInventory ? `Selling price INR ${product.price}` : "Waiting for stock details"}</span>
                      <span>{hasInventory ? `MRP INR ${product.mrp}` : "Batch MRP not added yet"}</span>
                    </div>
                    {latestBatch && (
                      <p className="moderation-note">
                        Latest batch
                        {latestBatch.batchLabel ? `: ${latestBatch.batchLabel}.` : "."}
                        {latestBatch.location ? ` Dispatch from ${latestBatch.location}.` : ""}
                        {Number(latestBatch.discountAmount || 0) > 0
                          ? ` Discount: save INR ${latestBatch.discountAmount} (${latestBatch.discountPercentage}% off).`
                          : ""}
                        {latestBatch.discountStartDate
                          ? ` Discount starts ${formatISODate(latestBatch.discountStartDate)}.`
                          : ""}
                        {latestBatch.discountEndDate
                          ? ` Discount ends ${formatISODate(latestBatch.discountEndDate)}.`
                          : ""}
                        {latestBatch.manufacturingDate
                          ? ` Manufactured on ${formatISODate(latestBatch.manufacturingDate)}.`
                          : ""}
                        {product.expiryApplicable && latestBatch.expiryDate
                          ? ` Expires on ${formatISODate(latestBatch.expiryDate)}.`
                          : ""}
                        {latestBatch.isExpired ? " This batch is expired." : ""}
                      </p>
                    )}
                    {product.moderationNote && (
                      <p className="moderation-note">Admin note: {product.moderationNote}</p>
                    )}

                    <div className="seller-card-actions seller-product-actions">
                      <button type="button" className="btn btn-outline" onClick={() => handleEdit(product)}>
                        Edit Product
                      </button>
                      <button
                        type="button"
                        className={`btn btn-outline ${product.isActive ? "seller-disable-btn" : "seller-enable-btn"}`}
                        onClick={() => handleToggleAvailability(product)}
                      >
                        {product.isActive ? "Disable" : "Enable"}
                      </button>
                    </div>

                    <div className="seller-inventory-panel">
                      <div className="seller-inventory-header">
                        <h5>My Stock Batches</h5>
                        <p>Sellers can review, edit, disable, and re-enable every batch created for this product.</p>
                      </div>

                      {product.inventoryBatches?.length ? (
                        <div className="seller-batch-list">
                          {product.inventoryBatches.map((batch) => (
                            <article className="seller-batch-card" key={batch.id}>
                              <div className="seller-batch-top">
                                <div>
                                  <strong>{batch.batchLabel || "Unnamed Batch"}</strong>
                                  <p>{batch.location || "No dispatch location"}</p>
                                </div>
                                <span
                                  className={`listing-status ${
                                    batch.isActive ? "listing-status-approved" : "listing-status-rejected"
                                  }`}
                                >
                                  {batch.isActive ? "Active Batch" : "Disabled Batch"}
                                </span>
                              </div>
                              <div className="seller-batch-meta">
                                <span>Stock {batch.stock}</span>
                                <span>Selling INR {batch.price}</span>
                                <span>MRP INR {batch.mrp}</span>
                                <span>
                                  {Number(batch.discountAmount || 0) > 0
                                    ? `Save INR ${batch.discountAmount} (${batch.discountPercentage}%)`
                                    : "No discount"}
                                </span>
                                <span>
                                  {batch.isExpired
                                    ? "Expired"
                                    : batch.expiryDate
                                      ? `Expires ${formatISODate(batch.expiryDate)}`
                                      : "No expiry"}
                                </span>
                                <span>
                                  {batch.returnAllowed
                                    ? `Returns in ${batch.returnWindowDays || 0} day(s)`
                                    : "Returns not allowed"}
                                </span>
                              </div>
                              <div className="seller-card-actions">
                                <button
                                  type="button"
                                  className="btn btn-outline"
                                  onClick={() => handleEditInventoryBatch(product, batch)}
                                  disabled={Boolean(inventoryPending[product.id])}
                                >
                                  Edit Batch
                                </button>
                                <button
                                  type="button"
                                  className={`btn btn-outline ${
                                    batch.isActive ? "seller-disable-btn" : "seller-enable-btn"
                                  }`}
                                  onClick={() => handleInventoryBatchAvailability(product, batch)}
                                  disabled={Boolean(inventoryPending[product.id])}
                                >
                                  {batch.isActive ? "Disable Batch" : "Enable Batch"}
                                </button>
                              </div>
                            </article>
                          ))}
                        </div>
                      ) : (
                        <p className="moderation-note">No stock batches added yet for this product.</p>
                      )}

                      <div className="seller-inventory-header">
                        <h5>{editingBatchId ? "Edit Stock Batch" : "Add Stock Batch"}</h5>
                        <p>Keep dispatch, pricing, discount, and date details at batch level.</p>
                      </div>

                      <div className="seller-inventory-form">
                        <label className="seller-field">
                          <span>Batch Name</span>
                          <input
                            type="text"
                            value={inventoryForm.batchLabel}
                            onChange={(event) => setInventoryField(product.id, "batchLabel", event.target.value)}
                            placeholder="Ex: Batch A / April Lot"
                          />
                        </label>

                        <label className="seller-field">
                          <span>Stock Qty</span>
                          <input
                            type="number"
                            min="1"
                            value={inventoryForm.stock}
                            onChange={(event) => setInventoryField(product.id, "stock", event.target.value)}
                            placeholder="25"
                          />
                        </label>

                        <label className="seller-field">
                          <span>Dispatch Location</span>
                          <input
                            type="text"
                            value={inventoryForm.location}
                            onChange={(event) => setInventoryField(product.id, "location", event.target.value)}
                            placeholder={currentUser?.location || "Kochi"}
                          />
                        </label>

                        <label className="seller-field">
                          <span>MRP</span>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={inventoryForm.mrp}
                            onChange={(event) => setInventoryField(product.id, "mrp", event.target.value)}
                            placeholder="999"
                          />
                        </label>

                        <label className="seller-field">
                          <span>Selling Price</span>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={inventoryForm.price}
                            onChange={(event) => setInventoryField(product.id, "price", event.target.value)}
                            placeholder="799"
                          />
                        </label>

                        <label className="seller-field">
                          <span>Discount Amount</span>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={inventoryForm.discountAmount}
                            onChange={(event) => setInventoryField(product.id, "discountAmount", event.target.value)}
                            placeholder="100"
                          />
                        </label>

                        <label className="seller-field">
                          <span>Discount Percentage</span>
                          <input
                            type="number"
                            min="0"
                            max="100"
                            step="0.01"
                            value={inventoryForm.discountPercentage}
                            onChange={(event) => setInventoryField(product.id, "discountPercentage", event.target.value)}
                            placeholder="10"
                          />
                        </label>

                        <label className="seller-field">
                          <span>Discount Start Date</span>
                          <input
                            type="date"
                            value={inventoryForm.discountStartDate}
                            onChange={(event) => setInventoryField(product.id, "discountStartDate", event.target.value)}
                          />
                        </label>

                        <label className="seller-field">
                          <span>Discount End Date</span>
                          <input
                            type="date"
                            value={inventoryForm.discountEndDate}
                            min={inventoryForm.discountStartDate || undefined}
                            onChange={(event) => setInventoryField(product.id, "discountEndDate", event.target.value)}
                          />
                        </label>

                        <label className="seller-field">
                          <span>Manufacturing Date</span>
                          <input
                            type="date"
                            value={inventoryForm.manufacturingDate}
                            onChange={(event) => setInventoryField(product.id, "manufacturingDate", event.target.value)}
                          />
                        </label>

                        {product.expiryApplicable && (
                          <label className="seller-field">
                            <span>Expiry Date</span>
                            <input
                              type="date"
                              value={inventoryForm.expiryDate}
                              min={inventoryForm.manufacturingDate || undefined}
                              onChange={(event) => setInventoryField(product.id, "expiryDate", event.target.value)}
                            />
                          </label>
                        )}

                        <label className="seller-field">
                          <span>Return Allowed?</span>
                          <select
                            value={inventoryForm.returnAllowed}
                            onChange={(event) => setInventoryField(product.id, "returnAllowed", event.target.value)}
                          >
                            <option value="no">No</option>
                            <option value="yes">Yes</option>
                          </select>
                        </label>

                        <label className="seller-field">
                          <span>Return Period (Days)</span>
                          <input
                            type="number"
                            min="0"
                            value={inventoryForm.returnWindowDays}
                            onChange={(event) => setInventoryField(product.id, "returnWindowDays", event.target.value)}
                            placeholder="7"
                            disabled={inventoryForm.returnAllowed !== "yes"}
                          />
                        </label>
                      </div>
                    </div>

                    <div className="seller-card-actions seller-product-actions">
                      <button
                        type="button"
                        className="btn btn-primary"
                        onClick={() => handleAddInventory(product)}
                        disabled={Boolean(inventoryPending[product.id])}
                      >
                        {inventoryPending[product.id]
                          ? "Saving Batch..."
                          : editingBatchId
                            ? "Update Stock Batch"
                            : "Add Stock Batch"}
                      </button>
                      {editingBatchId && (
                        <button
                          type="button"
                          className="btn btn-outline"
                          onClick={() => resetInventoryForm(product.id)}
                          disabled={Boolean(inventoryPending[product.id])}
                        >
                          Cancel Batch Edit
                        </button>
                      )}
                    </div>

                    {inventoryMessages[product.id] && (
                      <p className="seller-form-message">{inventoryMessages[product.id]}</p>
                    )}
                  </article>
                );
              })}
            </div>
          )}
          {managedProductsPagination.hasNextPage && (
            <button type="button" className="btn btn-outline" onClick={loadMoreManagedProducts}>
              Load more listings
            </button>
          )}
        </section>
      )}

      {!isEntrepreneur && (
        <section>
          <div className="section-heading shopper-heading">
            <h3>{marketplaceView === "favorites" ? "Favorite Products" : "Approved Products"}</h3>
            <p>
              {productsLoading
                ? "Refreshing GlobeMart..."
                : marketplaceView === "favorites"
                  ? `${sortedProducts.length} saved product${sortedProducts.length === 1 ? "" : "s"}`
                  : `${marketplacePagination.totalItems || sortedProducts.length} products available right now.`}
            </p>
          </div>

          {sortedProducts.length === 0 || productsLoading ? (
            <div className={sortedProducts.length === 0 && !productsLoading ? "seller-empty-state" : "products-loading"}>
              {productsLoading ? (
                <>
                  <p className="loading-spinner">Loading products...</p>
                  <p className="loading-hint">This may take a moment. Please wait.</p>
                </>
              ) : (
                <>
                  <h4>{marketplaceView === "favorites" ? "No favorites yet" : "No products found"}</h4>
                  <p>
                    {marketplaceView === "favorites"
                      ? "Heart products to save them here for quick access later."
                      : "Try a different search, category, or seller filter to find products."}
                  </p>
                </>
              )}
            </div>
          ) : (
            <>
              <div className="products-grid">
                {sortedProducts.map((product) => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    onOpenQuickView={() => setQuickViewProduct(product)}
                  />
                ))}
              </div>
              {marketplaceView !== "favorites" && marketplacePagination.hasNextPage && (
                <button type="button" className="btn btn-outline" onClick={loadMoreMarketplaceProducts}>
                  Load more products
                </button>
              )}
            </>
          )}
        </section>
      )}

      {quickViewProduct && (
        <div className="quick-view-overlay" role="dialog" aria-modal="true">
          <div
            ref={quickViewPanelRef}
            className="quick-view-panel"
            tabIndex="-1"
            aria-labelledby="quick-view-title"
          >
            <button
              type="button"
              className="quick-view-close"
              onClick={() => setQuickViewProduct(null)}
              aria-label="Close quick view"
            >
              �
            </button>
            <div className="quick-view-content">
              <div className="quick-view-image">
                {resolveProductImageSrc(quickViewProduct.image) ? (
                  <img
                    src={resolveProductImageSrc(quickViewProduct.image)}
                    alt={quickViewProduct.name}
                    loading="lazy"
                  />
                ) : (
                  <span className="product-emoji">
                    {quickViewProduct.name?.slice(0, 1)?.toUpperCase() || "P"}
                  </span>
                )}
              </div>
              <div className="quick-view-details">
                <div className="quick-view-header">
                  <div>
                      <h2 id="quick-view-title">{quickViewProduct.name}</h2>
                    {quickViewProduct.businessName && (
                      <p className="quick-view-business">{quickViewProduct.businessName}</p>
                    )}
                  </div>
                  <span className="listing-status listing-status-approved">
                    {quickViewProduct.category || "GlobeMart item"}
                  </span>
                </div>
                <p className="quick-view-description">{quickViewProduct.description}</p>
                <div className="quick-view-meta">
                  {quickViewProduct.subcategory && <span>{quickViewProduct.subcategory}</span>}
                  {quickViewProduct.batchLabel && <span>Batch {quickViewProduct.batchLabel}</span>}
                  {quickViewProduct.batchLocation && <span>{quickViewProduct.batchLocation}</span>}
                </div>
                <div className="quick-view-pricing">
                  <div>
                    <span className="product-price-label">Price</span>
                    <strong>INR {quickViewProduct.price}</strong>
                  </div>
                  {quickViewProduct.isDiscountActive && (
                    <div>
                      <span className="product-original-price">INR {quickViewProduct.mrp}</span>
                      <span className="product-discount-copy">
                        Save INR {quickViewProduct.discountAmount} ({quickViewProduct.discountPercentage}% off)
                      </span>
                    </div>
                  )}
                </div>
                <div className="quick-view-actions">
                  <button
                    type="button"
                    className="btn btn-outline"
                    onClick={() => setQuickViewProduct(null)}
                  >
                    Close
                  </button>
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={() => {
                      setQuickViewProduct(null);
                      addToCart(quickViewProduct);
                    }}
                  >
                    Add to Cart
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

Ecommerce.propTypes = {
  globeMartCategories: PropTypes.arrayOf(
    PropTypes.oneOfType([
      PropTypes.string,
      PropTypes.shape({
        id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
        name: PropTypes.string,
        label: PropTypes.string,
        theme: PropTypes.string,
        accentColor: PropTypes.string,
        subcategories: PropTypes.arrayOf(PropTypes.string),
      }),
    ])
  ),
  onOpenOrders: PropTypes.func,
  onOpenReturns: PropTypes.func,
};

Ecommerce.defaultProps = {
  globeMartCategories: [],
  onOpenOrders: null,
  onOpenReturns: null,
};

export default Ecommerce;
