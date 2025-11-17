**Smart Order Management System Issue Description:**

**Problem Statement:**
Develop a Smart Order Management System focused on streamlining order management, accounts receivable, customer and product data handling, and basic statistics. Ensure minimal manual input while providing essential AI capabilities for future expansion.

**Acceptance Criteria:**
1. **Customer Management Page:**
   - Display customer ID, name, contact, address, and transaction history, emphasizing outstanding fees.

2. **Product Management Page (SKU):**
   - Display product ID, name, barcode, specifications, images, and details.
   - Enable "order-driven management" for easy new product entry directly from the sales order interface, improving the efficiency of recording orders.
   - Show cost price, reference sale price, current stock, and warning levels.

3. **Sales Order Management Page:**
   - CRUD for sales orders categorized by status (unsent, sent, void, settled, unsettled).
   - Include customer, salesperson, settlement information, and financial record generation.
   - Facilitate on-the-spot printing and monthly reconciliation with customizable exports.

4. **Returns Management Page:**
   - CRUD for returns tied to sales orders that are settled or unsettled.
   - Highlight return amount, mode, and reasons.

5. **Logistics and Data Import:**
   - Logistics integration (future phase), displaying shipment details.
   - Support Excel template imports for sales and accounts receivable data.

6. **Sales Order Printing Template:**
   - Simplify with drag-and-drop design capabilities.

7. **AI Features:**
   - Incorporate AI support for future recommendation and analysis functions.

**Core Technical Requirements:**
- Implement order-driven product management to lower operational barriers.
- Display real-time customer debt and sales statistics with smart reporting capabilities.
- Simplify monthly reconciliation by automating uncollected sales aggregation.
- Introduce AI potential in backend data structures for future enhancements.
- Plan for logistics functionalities with reserved data fields for seamless future integration.
- Ensure system security, with clear channels for notifications, logging, and feedback.

**Contextual Background:**
The system emphasizes a minimally coupled architecture to permit future upgrades, including AI recommendation and logistics expansion. All existing main business interfaces and database structures are designed to support flexible AI analysis and logistics integration with minimal disruption. 

This approach aims to streamline operations with easy data entry, intelligent reporting, and scalable automated features, supporting a blend of immediate functionality and future-proof extensibility.