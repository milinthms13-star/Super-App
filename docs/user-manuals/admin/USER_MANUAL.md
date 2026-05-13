# Admin Dashboard User Manual (Front-End)

> Module: `src/modules/admin/AdminDashboard.js`  
> Role: Admin / moderation + returns + business registrations review.

## 1) What this module does
The Admin Dashboard helps you:
- Maintain **business category fees** (platform fee settings)
- **Enable/disable platform functionalities** per business category
- Create **GlobeMart product categories** and **subcategories**
- Moderate **GlobeMart product listings** (approve / return to review / reject)
- Review **returns & refunds** requests and update status
- Review **business registrations** (approve / reject) with admin remarks
- Jump quickly to the **pending moderation** section when actions are available

---

## 2) Entry point in the app
1. Navigate to **Admin Dashboard** from the main navigation/menu.

---

## 3) Admin overview (Hero + Stats)
At the top you’ll see:
- Total **business categories**
- **Registrations received** count
- Total fee pipeline shown as `INR {totalRevenuePotential}`
- A clickable stat card for **Pending GlobeMart Reviews**
  - If pending count > 0, clicking it scrolls you to the moderation section.

---

## 4) Section: Business Category Fees
### 4.1 How to update a category fee
1. Find the list under **Business Category Fees**.
2. For each business category, locate the **Fee** input.
3. Enter the new fee value.
4. The input is wired to `onUpdateCategoryFee(category.id, Number(value))`.

Expected result:
- The category fee updates via the connected handler.

### 4.2 Food license label
Each category row also indicates whether **Food licence required** or **Standard compliance** is needed (based on `category.requiresFoodLicense`).

---

## 5) Section: Enable / Disable Functionalities
### 5.1 Toggle visibility on the platform
1. Open **Enable/Disable Functionalities** section.
2. For each business category:
   - Use the switch to set whether that category is **Visible on the platform** or **Hidden on the platform**.

Expected result:
- Toggling calls `onToggleModule(category.id)` and updates `enabledModules`.

---

## 6) Section: GlobeMart Product Categories
### 6.1 Create a new GlobeMart product category
1. In **GlobeMart Product Categories**, fill the **Create Category** form:
   - Category Name
   - Theme
   - Accent Color
2. Click **Create Category**.

Expected result:
- A new category is created and shown in the category grid.
- If backend persistence isn’t available, the UI may show a message that the category was added locally.

### 6.2 Add a subcategory
1. In the **Add Subcategory** form:
   - Select **Parent Category**
   - Enter **Subcategory**
2. Click **Add Subcategory**.

Expected result:
- The subcategory appears under the selected parent category in the grid.

---

## 7) Section: GlobeMart Product Moderation
This section is used to approve or reject entrepreneur listings before they go live to shoppers.

### 7.1 Filter: Pending Only vs Show All
Use the toolbar buttons:
- **Pending Only (X)** → shows only items where approval status is `pending`
- **Show All (Y)** → shows all actionable items

### 7.2 Search
1. Use the **Search** input to match:
   - product name, business name, category, seller fields, or description

### 7.3 Approve / Return / Reject a product
For each product card:
1. Enter **Remarks** (optional).
   - If you leave remarks blank, the UI uses default remarks per action.
2. Click one action:
   - **Approve**
   - **Return to Review**
   - **Reject**

Expected result:
- The module calls `moderateProduct(productId, approvalStatus, moderationNote)`.
- A feedback message appears: `Product marked as {approvalStatus}.`

---

## 8) Section: Returns & Refund Review
Review return requests across seller orders and update status.

### 8.1 Use the return filters
Toolbar options:
- All
- Pending
- Approved
- Rejected
- Refund Completed

### 8.2 Update return request status
For each return item, choose one:
- **Approve**
- **Reject**
- **Refund Completed**

Expected result:
- Each action calls `updateItemReturnRequestStatus(orderId, itemId, { action })`
- Buttons show “Updating...” while pending for that specific action.

---

## 9) Section: Business Registrations Review
Review business registration applications and approve/reject with remarks.

### 9.1 Review details
Each registration card includes:
- business name
- applicant name
- email / phone
- selected categories and their fees
- current registration status
- total fee

### 9.2 Provide remarks and take action
1. Enter **Reason to include in email** (admin remarks).
2. Click:
   - **Approve** (disabled if already Approved)
   - **Reject** (disabled if already Rejected)

Expected result:
- The module calls `onReviewRegistration(applicationId, action, reason)`.
- A message appears based on action and response.

---

## 10) Troubleshooting
- Moderation updates fail:
  - Ensure remark text is optional but required for some workflows when backend expects it.
  - If the backend is down, the moderation action may not save.
- Pending moderation not visible:
  - Switch to **Show All** and confirm the **Pending Only** filter is enabled appropriately.
- Returns actions not updating:
  - Confirm you clicked the correct action button; each action has its own pending state key.

---

## 11) UI sections reference (quick)
- Admin hero + stats + “Pending GlobeMart Reviews” jump
- Business Category Fees
- Enable/Disable Functionalities toggles
- GlobeMart Product Categories grid + create category + add subcategory
- GlobeMart Product Moderation (pending/search/approve-return-reject)
- Returns & Refund Review (filters + approve/reject/refund completed)
- Business Registrations review (remarks + approve/reject)
