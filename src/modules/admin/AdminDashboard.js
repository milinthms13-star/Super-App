import React, { useMemo, useRef, useState } from "react";
import { useApp } from "../../contexts/AppContext";
import useI18n from "../../hooks/useI18n";
import "./AdminDashboard.css";

const DEFAULT_MODERATION_REMARKS = {
  approved: "Approved for GlobeMart shoppers.",
  pending: "Please review the listing details and update if needed.",
  rejected: "Please update the product details and resubmit this listing.",
};

const isReturnedForReview = (product) =>
  product?.approvalStatus === "pending" && Boolean(product?.moderationNote?.trim());

const formatDisplayDate = (value) => {
  if (!value) {
    return "Recent";
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return "Recent";
  }

  return parsed.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const getReturnStatusLabel = (returnRequest) => {
  const refundStatus = String(returnRequest?.refundStatus || "").toLowerCase();
  const status = String(returnRequest?.status || "").toLowerCase();

  if (refundStatus === "completed") {
    return "Refund Completed";
  }

  if (refundStatus === "approved" || status === "approved") {
    return "Return Approved";
  }

  if (refundStatus === "rejected" || status === "rejected") {
    return "Return Rejected";
  }

  return "Pending Review";
};

const getReturnFilterValue = (returnRequest) => {
  const refundStatus = String(returnRequest?.refundStatus || "").toLowerCase();
  const status = String(returnRequest?.status || "").toLowerCase();

  if (refundStatus === "completed") {
    return "completed";
  }

  if (refundStatus === "approved" || status === "approved") {
    return "approved";
  }

  if (refundStatus === "rejected" || status === "rejected") {
    return "rejected";
  }

  return "pending";
};

const normalizeCategoryRecord = (category) => {
  if (typeof category === "string") {
    return {
      id: category,
      name: category,
      theme: "",
      accentColor: "",
      subcategories: [],
    };
  }

  return {
    id: String(category?.id || category?.name || "").trim(),
    name: String(category?.name || category?.label || category?.id || "").trim(),
    theme: String(category?.theme || "").trim(),
    accentColor: String(category?.accentColor || "").trim(),
    subcategories: Array.isArray(category?.subcategories)
      ? category.subcategories.map((item) => String(item || "").trim()).filter(Boolean)
      : [],
  };
};

const AdminDashboard = ({
  businessCategories,
  globeMartCategories,
  registrationApplications,
  onReviewRegistration,
  onUpdateCategoryFee,
  onCreateGlobeMartCategory,
  onAddGlobeMartSubcategory,
  enabledModules,
  onToggleModule,
}) => {
  const { t } = useI18n();
  const {
    managedProducts,
    moderateProduct,
    productsLoading,
    sellerOrders,
    updateItemReturnRequestStatus,
    managedProductsPagination,
    loadMoreManagedProducts,
  } = useApp();
  const [moderationMessage, setModerationMessage] = useState("");
  const [moderationRemarks, setModerationRemarks] = useState({});
  const [moderationSearch, setModerationSearch] = useState("");
  const [showPendingOnly, setShowPendingOnly] = useState(false);
  const [returnFilter, setReturnFilter] = useState("all");
  const [returnActionPending, setReturnActionPending] = useState({});
  const [newCategoryName, setNewCategoryName] = useState("");
  const [newCategoryTheme, setNewCategoryTheme] = useState("");
  const [newCategoryAccentColor, setNewCategoryAccentColor] = useState("#0f4c81");
  const [selectedCategoryForSubcategory, setSelectedCategoryForSubcategory] = useState("");
  const [newSubcategoryName, setNewSubcategoryName] = useState("");
  const [categoryMessage, setCategoryMessage] = useState("");
  const [returnActionMessage, setReturnActionMessage] = useState("");
  const [registrationActionPending, setRegistrationActionPending] = useState({});
  const [registrationActionMessage, setRegistrationActionMessage] = useState("");
  const [registrationRemarks, setRegistrationRemarks] = useState({});
  const moderationSectionRef = useRef(null);

  const totalRevenuePotential = useMemo(
    () => registrationApplications.reduce((total, application) => total + Number(application.registrationFee || 0), 0),
    [registrationApplications]
  );

  const actionableManagedProducts = useMemo(
    () => managedProducts.filter((product) => !isReturnedForReview(product)),
    [managedProducts]
  );

  const pendingProducts = useMemo(
    () => actionableManagedProducts.filter((product) => product.approvalStatus === "pending"),
    [actionableManagedProducts]
  );

  const productStats = useMemo(
    () => ({
      total: actionableManagedProducts.length,
      pending: pendingProducts.length,
      approved: actionableManagedProducts.filter((product) => product.approvalStatus === "approved").length,
    }),
    [actionableManagedProducts, pendingProducts]
  );

  const displayedProducts = useMemo(() => {
    const source = showPendingOnly ? pendingProducts : actionableManagedProducts;
    const normalizedSearch = moderationSearch.trim().toLowerCase();

    if (!normalizedSearch) {
      return source;
    }

    return source.filter((product) =>
      [
        product.name,
        product.businessName,
        product.category,
        product.sellerName,
        product.sellerEmail,
        product.description,
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(normalizedSearch))
    );
  }, [actionableManagedProducts, pendingProducts, showPendingOnly, moderationSearch]);
  const returnRequests = useMemo(
    () =>
      sellerOrders.flatMap((order) =>
        (order.items || [])
          .filter((item) => item.returnRequest)
          .map((item) => ({
            ...item,
            orderId: order.id,
            orderAmount: order.amount,
            orderCreatedAt: order.createdAt,
            customerName: order.customerName || "Shopper",
            sellerName:
              (order.sellerFulfillments || []).find(
                (fulfillment) => fulfillment.sellerKey && fulfillment.sellerKey === item.sellerKey
              )?.businessName || item.businessName || "Seller",
          }))
      ),
    [sellerOrders]
  );
  const filteredReturnRequests = useMemo(
    () =>
      returnFilter === "all"
        ? returnRequests
        : returnRequests.filter((item) => getReturnFilterValue(item.returnRequest) === returnFilter),
    [returnFilter, returnRequests]
  );

  const handleModeration = async (productId, approvalStatus) => {
    const typedRemark = moderationRemarks[productId]?.trim();
    const moderationNote = typedRemark || DEFAULT_MODERATION_REMARKS[approvalStatus] || "";

    try {
      await moderateProduct(productId, approvalStatus, moderationNote);
      setModerationMessage(`Product marked as ${approvalStatus}.`);
      setModerationRemarks((currentRemarks) => ({
        ...currentRemarks,
        [productId]: moderationNote,
      }));
    } catch (error) {
      setModerationMessage(
        error.response?.data?.message || "The moderation update could not be saved."
      );
    }
  };

  const handleJumpToPendingReviews = () => {
    setShowPendingOnly(true);
    requestAnimationFrame(() => {
      moderationSectionRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    });
  };

  const handleCreateCategory = async (event) => {
    event.preventDefault();
    const trimmedName = newCategoryName.trim();

    if (!trimmedName) {
      setCategoryMessage("Enter a GlobeMart product category name first.");
      return;
    }

    try {
      const result = await onCreateGlobeMartCategory({
        name: trimmedName,
        theme: newCategoryTheme.trim(),
        accentColor: newCategoryAccentColor.trim(),
        subcategories: [],
      });
      setCategoryMessage(
        result?.persisted === false
          ? `GlobeMart category "${trimmedName}" was added locally. The backend endpoint is not available yet.`
          : `GlobeMart category "${trimmedName}" is ready for product forms.`
      );
      setNewCategoryName("");
      setNewCategoryTheme("");
      setNewCategoryAccentColor("#0f4c81");
    } catch (error) {
      setCategoryMessage(
        error.response?.data?.message || "The GlobeMart category could not be saved."
      );
    }
  };

  const handleAddSubcategory = async (event) => {
    event.preventDefault();

    if (!selectedCategoryForSubcategory) {
      setCategoryMessage("Choose a GlobeMart category before adding a subcategory.");
      return;
    }

    if (!newSubcategoryName.trim()) {
      setCategoryMessage("Enter a subcategory name first.");
      return;
    }

    const categoryRecord = globeMartCategories
      .map(normalizeCategoryRecord)
      .find((category) => category.id === selectedCategoryForSubcategory);

    try {
      const result = await onAddGlobeMartSubcategory(selectedCategoryForSubcategory, newSubcategoryName.trim());
      setCategoryMessage(
        result?.persisted === false
          ? `Subcategory "${newSubcategoryName.trim()}" was added locally under "${categoryRecord?.name || "this category"}".`
          : `Subcategory "${newSubcategoryName.trim()}" was added under "${categoryRecord?.name || "this category"}".`
      );
      setNewSubcategoryName("");
    } catch (error) {
      setCategoryMessage(
        error.response?.data?.message || "The GlobeMart subcategory could not be saved."
      );
    }
  };

  const handleReturnAction = async (orderId, itemId, action) => {
    const pendingKey = `${orderId}-${itemId}-${action}`;
    setReturnActionPending((current) => ({ ...current, [pendingKey]: true }));
    setReturnActionMessage("");

    try {
      await updateItemReturnRequestStatus(orderId, itemId, { action });
      setReturnActionMessage(
        action === "approve"
          ? "Return request approved."
          : action === "reject"
            ? "Return request rejected."
            : "Refund marked as completed."
      );
    } catch (error) {
      setReturnActionMessage(
        error.response?.data?.message || "The return request could not be updated."
      );
    } finally {
      setReturnActionPending((current) => ({ ...current, [pendingKey]: false }));
    }
  };

  const handleRegistrationAction = async (applicationId, action) => {
    const pendingKey = `${applicationId}-${action}`;
    const reason = String(registrationRemarks[applicationId] ?? "").trim();
    setRegistrationActionPending((current) => ({ ...current, [pendingKey]: true }));
    setRegistrationActionMessage("");

    try {
      const response = await onReviewRegistration(applicationId, action, reason);
      setRegistrationActionMessage(
        response?.message ||
          (action === "approve"
            ? "Registration approved and entrepreneur notified."
            : "Registration rejected and entrepreneur notified.")
      );
    } catch (error) {
      setRegistrationActionMessage(
        error.response?.data?.message || "The registration review could not be updated."
      );
    } finally {
      setRegistrationActionPending((current) => ({ ...current, [pendingKey]: false }));
    }
  };

  return (
    <div className="admin-dashboard">
      <section className="admin-hero">
        <h1>{t("admin.title", "Admin Dashboard")}</h1>
        <p>
          {t(
            "admin.subtitle",
            "Manage predefined business categories, platform functionality visibility, and incoming registration requests."
          )}
        </p>
      </section>

      <section className="admin-stats">
        <article className="admin-stat-card">
          <h2>{businessCategories.length}</h2>
          <p>{t("admin.businessCategories", "Business Categories")}</p>
        </article>
        <article className="admin-stat-card">
          <h2>{registrationApplications.length}</h2>
          <p>{t("admin.registrationsReceived", "Registrations Received")}</p>
        </article>
        <article className="admin-stat-card">
          <h2>INR {totalRevenuePotential}</h2>
          <p>{t("admin.totalFeePipeline", "Total Fee Pipeline")}</p>
        </article>
        <article
          className={`admin-stat-card admin-stat-card-action ${productStats.pending > 0 ? "clickable" : ""}`}
          onClick={productStats.pending > 0 ? handleJumpToPendingReviews : undefined}
          onKeyDown={
            productStats.pending > 0
              ? (event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    handleJumpToPendingReviews();
                  }
                }
              : undefined
          }
          role={productStats.pending > 0 ? "button" : undefined}
          tabIndex={productStats.pending > 0 ? 0 : undefined}
        >
          <h2>{productStats.pending}</h2>
          <p>Pending GlobeMart Reviews</p>
        </article>
      </section>

      <section className="admin-grid">
        <div className="admin-panel">
          <div className="admin-panel-header">
            <h2>{t("admin.categoryFeesTitle", "Business Category Fees")}</h2>
            <p>
              {t(
                "admin.categoryFeesSubtitle",
                "These business categories are used on the admin page and entrepreneur registration form."
              )}
            </p>
          </div>

          <div className="admin-list">
            {businessCategories.map((category) => (
              <div className="admin-list-item" key={category.id}>
                <div>
                  <strong>{category.name}</strong>
                  <span>{category.requiresFoodLicense ? t("admin.foodLicenceRequired", "Food licence required") : t("admin.standardCompliance", "Standard compliance")}</span>
                </div>
                <label className="fee-field" htmlFor={`fee-${category.id}`}>
                  <span>{t("common.fee", "Fee")}</span>
                  <input
                    id={`fee-${category.id}`}
                    type="number"
                    min="0"
                    value={category.fee}
                    onChange={(event) => onUpdateCategoryFee(category.id, Number(event.target.value))}
                  />
                </label>
              </div>
            ))}
          </div>
        </div>

        <div className="admin-panel">
          <div className="admin-panel-header">
            <h2>{t("admin.functionalityTitle", "Enable/Disable Functionalities")}</h2>
            <p>
              {t(
                "admin.functionalitySubtitle",
                "Control which platform functionalities appear across the customer-facing experience without changing the business categories."
              )}
            </p>
          </div>

          <div className="admin-list">
            {businessCategories.map((category) => (
              <div className="admin-list-item" key={category.id}>
                <div>
                  <strong>{category.name}</strong>
                  <span>{enabledModules.includes(category.id) ? t("admin.visibleOnPlatform", "Visible on the platform") : t("admin.hiddenOnPlatform", "Hidden on the platform")}</span>
                </div>
                <label className="toggle-switch" htmlFor={`toggle-${category.id}`}>
                  <input
                    id={`toggle-${category.id}`}
                    type="checkbox"
                    checked={enabledModules.includes(category.id)}
                    onChange={() => onToggleModule(category.id)}
                  />
                  <span className="toggle-slider"></span>
                </label>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="admin-panel">
        <div className="admin-panel-header">
          <h2>GlobeMart Product Categories</h2>
          <p>Create the product categories entrepreneurs can choose while adding GlobeMart listings.</p>
        </div>

        <form className="admin-form admin-inline-form" onSubmit={handleCreateCategory}>
          <label htmlFor="globemart-category-name">
            Category Name
            <input
              id="globemart-category-name"
              type="text"
              value={newCategoryName}
              onChange={(event) => setNewCategoryName(event.target.value)}
              placeholder="Ex: Snacks"
            />
          </label>
          <label htmlFor="globemart-category-theme">
            Theme
            <input
              id="globemart-category-theme"
              type="text"
              value={newCategoryTheme}
              onChange={(event) => setNewCategoryTheme(event.target.value)}
              placeholder="Ex: Festival Picks"
            />
          </label>
          <label htmlFor="globemart-category-accent">
            Accent Color
            <input
              id="globemart-category-accent"
              type="color"
              value={newCategoryAccentColor}
              onChange={(event) => setNewCategoryAccentColor(event.target.value)}
            />
          </label>
          <button type="submit" className="admin-button">
            Create Category
          </button>
        </form>

        <form className="admin-form admin-inline-form" onSubmit={handleAddSubcategory}>
          <label htmlFor="globemart-parent-category">
            Parent Category
            <select
              id="globemart-parent-category"
              value={selectedCategoryForSubcategory}
              onChange={(event) => setSelectedCategoryForSubcategory(event.target.value)}
            >
              <option value="">Select a category</option>
              {globeMartCategories.map((category) => {
                const categoryRecord = normalizeCategoryRecord(category);
                return (
                  <option key={categoryRecord.id} value={categoryRecord.id}>
                    {categoryRecord.name}
                  </option>
                );
              })}
            </select>
          </label>
          <label htmlFor="globemart-subcategory-name">
            Subcategory
            <input
              id="globemart-subcategory-name"
              type="text"
              value={newSubcategoryName}
              onChange={(event) => setNewSubcategoryName(event.target.value)}
              placeholder="Ex: Mobile Accessories"
            />
          </label>
          <button type="submit" className="admin-button">
            Add Subcategory
          </button>
        </form>

        {categoryMessage && <p className="admin-feedback-message">{categoryMessage}</p>}

        <div className="admin-category-grid">
          {globeMartCategories.length === 0 ? (
            <p className="empty-state">No GlobeMart product categories yet. Create one to unlock it in seller product forms.</p>
          ) : (
            globeMartCategories.map((category) => {
              const categoryRecord = normalizeCategoryRecord(category);
              const accentStyle = categoryRecord.accentColor
                ? {
                    boxShadow: `0 0 0 1px ${categoryRecord.accentColor}22, inset 0 0 0 1px ${categoryRecord.accentColor}22`,
                  }
                : undefined;

              return (
                <article
                  key={categoryRecord.id || categoryRecord.name}
                  className="admin-category-card"
                  style={accentStyle}
                >
                  <div className="admin-category-card-header">
                    <strong>{categoryRecord.name}</strong>
                    <span
                      className="category-accent-pill"
                      style={{ backgroundColor: categoryRecord.accentColor || "#cbd5e1" }}
                    />
                  </div>

                  {categoryRecord.theme && (
                    <p className="admin-category-theme">{categoryRecord.theme}</p>
                  )}

                  <div className="admin-category-meta">
                    <span>{categoryRecord.subcategories.length} subcategories</span>
                    <span>{categoryRecord.accentColor ? `Accent ${categoryRecord.accentColor}` : "No accent color"}</span>
                  </div>

                  {categoryRecord.subcategories.length > 0 ? (
                    <div className="admin-category-chips">
                      {categoryRecord.subcategories.map((subcategory) => (
                        <span key={subcategory} className="admin-category-chip">
                          {subcategory}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="empty-state">No subcategories yet.</p>
                  )}
                </article>
              );
            })
          )}
        </div>
      </section>

      <section className="admin-panel" ref={moderationSectionRef}>
        <div className="admin-panel-header">
          <h2>GlobeMart Product Moderation</h2>
          <p>Approve, reject, or return entrepreneur listings for changes before they go live to shoppers.</p>
        </div>

        <div className="moderation-toolbar">
          <div className="moderation-toolbar-actions">
            <button
              type="button"
              className={`btn ${showPendingOnly ? "btn-primary" : "btn-outline"}`}
              onClick={() => setShowPendingOnly(true)}
            >
              Pending Only ({productStats.pending})
            </button>
            <button
              type="button"
              className={`btn ${!showPendingOnly ? "btn-primary" : "btn-outline"}`}
              onClick={() => setShowPendingOnly(false)}
            >
              Show All ({productStats.total})
            </button>
          </div>
          <label className="moderation-search" htmlFor="moderation-search-input">
            <span>Search</span>
            <input
              id="moderation-search-input"
              type="search"
              value={moderationSearch}
              onChange={(event) => setModerationSearch(event.target.value)}
              placeholder="Search products, seller, category or description"
            />
          </label>
        </div>

        {moderationMessage && <p className="admin-feedback-message">{moderationMessage}</p>}

        <div className="registration-table">
          {displayedProducts.length === 0 ? (
            <p className="empty-state">
              {productsLoading
                ? "Loading products..."
                : showPendingOnly
                  ? "No pending GlobeMart reviews right now."
                  : "No GlobeMart product submissions yet."}
            </p>
          ) : (
            displayedProducts.map((product) => (
              <article className="registration-card moderation-card" key={product.id}>
                <div className="registration-topline">
                  <div>
                    <h3>{product.name}</h3>
                    <p>{product.businessName}</p>
                  </div>
                  <span className={`registration-status moderation-status-${product.approvalStatus}`}>
                    {product.approvalStatus}
                  </span>
                </div>
                <p>{product.sellerName} · {product.sellerEmail}</p>
                <p>
                  {product.category}
                  {Number(product.stock || 0) > 0
                    ? ` · INR ${product.price} · ${product.stock} in stock`
                    : " · Inventory not added yet"}
                </p>
                <p>{product.location || "Kerala"}</p>
                {product.description && <p>{product.description}</p>}
                <label className="moderation-remarks-field" htmlFor={`moderation-remarks-${product.id}`}>
                  <span>Remarks</span>
                  <textarea
                    id={`moderation-remarks-${product.id}`}
                    value={moderationRemarks[product.id] ?? product.moderationNote ?? ""}
                    onChange={(event) =>
                      setModerationRemarks((currentRemarks) => ({
                        ...currentRemarks,
                        [product.id]: event.target.value,
                      }))
                    }
                    rows={3}
                    placeholder="Add a remark for approve, return, or reject"
                  />
                </label>
                {product.moderationNote && (
                  <p className="moderation-note">Latest note: {product.moderationNote}</p>
                )}
                <div className="moderation-actions">
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={() => handleModeration(product.id, "approved")}
                  >
                    Approve
                  </button>
                  <button
                    type="button"
                    className="btn btn-outline"
                    onClick={() => handleModeration(product.id, "pending")}
                  >
                    Return to Review
                  </button>
                  <button
                    type="button"
                    className="btn btn-outline moderation-reject-btn"
                    onClick={() => handleModeration(product.id, "rejected")}
                  >
                    Reject
                  </button>
                </div>
              </article>
            ))
          )}
        </div>
        {managedProductsPagination.hasNextPage && (
          <button type="button" className="btn btn-outline" onClick={loadMoreManagedProducts}>
            Load more product reviews
          </button>
        )}
      </section>

      <section className="admin-panel">
        <div className="admin-panel-header">
          <h2>Returns & Refund Review</h2>
          <p>Track return and refund requests across seller orders, including the ordered batch and current status.</p>
        </div>

        <div className="moderation-toolbar">
          <button
            type="button"
            className={`btn ${returnFilter === "all" ? "btn-primary" : "btn-outline"}`}
            onClick={() => setReturnFilter("all")}
          >
            All ({returnRequests.length})
          </button>
          <button
            type="button"
            className={`btn ${returnFilter === "pending" ? "btn-primary" : "btn-outline"}`}
            onClick={() => setReturnFilter("pending")}
          >
            Pending
          </button>
          <button
            type="button"
            className={`btn ${returnFilter === "approved" ? "btn-primary" : "btn-outline"}`}
            onClick={() => setReturnFilter("approved")}
          >
            Approved
          </button>
          <button
            type="button"
            className={`btn ${returnFilter === "rejected" ? "btn-primary" : "btn-outline"}`}
            onClick={() => setReturnFilter("rejected")}
          >
            Rejected
          </button>
          <button
            type="button"
            className={`btn ${returnFilter === "completed" ? "btn-primary" : "btn-outline"}`}
            onClick={() => setReturnFilter("completed")}
          >
            Refund Completed
          </button>
        </div>

        {returnActionMessage && <p className="admin-feedback-message">{returnActionMessage}</p>}

        <div className="registration-table">
          {filteredReturnRequests.length === 0 ? (
            <p className="empty-state">No return or refund requests have been raised yet.</p>
          ) : (
            filteredReturnRequests.map((item) => (
              <article className="registration-card admin-return-card" key={`${item.orderId}-${item.id}`}>
                <div className="registration-topline">
                  <div>
                    <h3>{item.name}</h3>
                    <p>Order {String(item.orderId).slice(0, 8)} · {formatDisplayDate(item.orderCreatedAt)}</p>
                  </div>
                  <span className="registration-status admin-return-status">
                    {getReturnStatusLabel(item.returnRequest)}
                  </span>
                </div>
                <p>{item.customerName} · {item.sellerName}</p>
                <div className="registration-tags">
                  <span>{item.batchLabel ? `Batch ${item.batchLabel}` : "Batch info unavailable"}</span>
                  <span>{item.batchLocation || item.location ? `Dispatch ${item.batchLocation || item.location}` : "Dispatch info unavailable"}</span>
                  <span>Reason: {String(item.returnRequest?.reason || "").replace(/_/g, " ") || "Not shared"}</span>
                  <span>Refund: {item.returnRequest?.refundStatus || "pending"}</span>
                </div>
                {item.returnRequest?.details && (
                  <p className="moderation-note">Customer note: {item.returnRequest.details}</p>
                )}
                <div className="moderation-actions">
                  <button
                    type="button"
                    className="btn btn-outline"
                    onClick={() => handleReturnAction(item.orderId, item.id, "approve")}
                    disabled={Boolean(returnActionPending[`${item.orderId}-${item.id}-approve`])}
                  >
                    {returnActionPending[`${item.orderId}-${item.id}-approve`]
                      ? "Updating..."
                      : "Approve"}
                  </button>
                  <button
                    type="button"
                    className="btn btn-outline moderation-reject-btn"
                    onClick={() => handleReturnAction(item.orderId, item.id, "reject")}
                    disabled={Boolean(returnActionPending[`${item.orderId}-${item.id}-reject`])}
                  >
                    {returnActionPending[`${item.orderId}-${item.id}-reject`]
                      ? "Updating..."
                      : "Reject"}
                  </button>
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={() => handleReturnAction(item.orderId, item.id, "refund_completed")}
                    disabled={Boolean(returnActionPending[`${item.orderId}-${item.id}-refund_completed`])}
                  >
                    {returnActionPending[`${item.orderId}-${item.id}-refund_completed`]
                      ? "Updating..."
                      : "Refund Completed"}
                  </button>
                </div>
              </article>
            ))
          )}
        </div>
      </section>

      <section className="admin-panel">
        <div className="admin-panel-header">
          <h2>{t("admin.registrationsTitle", "Business Registrations")}</h2>
          <p>{t("admin.registrationsSubtitle", "Review the categories chosen by each business and the total fee tied to that registration.")}</p>
        </div>

        {registrationActionMessage && <p className="admin-feedback-message">{registrationActionMessage}</p>}

        <div className="registration-table">
          {registrationApplications.length === 0 ? (
            <p className="empty-state">{t("admin.noRegistrations", "No business registrations have been submitted yet.")}</p>
          ) : (
            registrationApplications.map((application) => (
              <article className="registration-card" key={application.id}>
                <div className="registration-topline">
                  <div>
                    <h3>{application.businessName}</h3>
                    <p>{application.applicantName}</p>
                  </div>
                  <span className="registration-status">{application.status}</span>
                </div>
                <p>{application.email}</p>
                <p>{application.phone}</p>
                <div className="registration-tags">
                  {application.selectedBusinessCategories.map((category) => (
                    <span key={`${application.id}-${category.id}`}>{category.name} · INR {category.fee}</span>
                  ))}
                </div>
                <label
                  className="moderation-remarks-field"
                  htmlFor={`registration-remarks-${application.id}`}
                >
                  <span>Reason to include in email</span>
                  <textarea
                    id={`registration-remarks-${application.id}`}
                    value={registrationRemarks[application.id] ?? application.reviewReason ?? ""}
                    onChange={(event) =>
                      setRegistrationRemarks((currentRemarks) => ({
                        ...currentRemarks,
                        [application.id]: event.target.value,
                      }))
                    }
                    rows={3}
                    placeholder="Explain why this registration was approved or rejected"
                  />
                </label>
                {application.reviewReason && (
                  <p className="moderation-note">Latest review reason: {application.reviewReason}</p>
                )}
                <strong className="registration-fee">{t("admin.totalFee", "Total Fee:")} INR {application.registrationFee}</strong>
                <div className="moderation-actions">
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={() => handleRegistrationAction(application.id, "approve")}
                    disabled={
                      application.status === "Approved" ||
                      Boolean(registrationActionPending[`${application.id}-approve`])
                    }
                  >
                    {registrationActionPending[`${application.id}-approve`] ? "Updating..." : "Approve"}
                  </button>
                  <button
                    type="button"
                    className="btn btn-outline moderation-reject-btn"
                    onClick={() => handleRegistrationAction(application.id, "reject")}
                    disabled={
                      application.status === "Rejected" ||
                      Boolean(registrationActionPending[`${application.id}-reject`])
                    }
                  >
                    {registrationActionPending[`${application.id}-reject`] ? "Updating..." : "Reject"}
                  </button>
                </div>
              </article>
            ))
          )}
        </div>
      </section>
    </div>
  );
};

export default AdminDashboard;
