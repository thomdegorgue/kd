/**
 * Factory centralizado de query keys para TanStack Query.
 * staleTime y gcTime por entidad según system/realtime.md.
 */

export const queryKeys = {
  // Dashboard
  dashboardStats: (storeId: string) => ['dashboard-stats', storeId] as const,

  // Products
  products: (storeId: string, filters?: Record<string, unknown>) =>
    filters ? ['products', storeId, filters] as const : ['products', storeId] as const,
  product: (storeId: string, productId: string) => ['products', storeId, productId] as const,

  // Categories
  categories: (storeId: string) => ['categories', storeId] as const,

  // Orders
  orders: (storeId: string, filters?: Record<string, unknown>) =>
    filters ? ['orders', storeId, filters] as const : ['orders', storeId] as const,
  order: (storeId: string, orderId: string) => ['orders', storeId, orderId] as const,

  // Customers
  customers: (storeId: string, filters?: Record<string, unknown>) =>
    filters ? ['customers', storeId, filters] as const : ['customers', storeId] as const,
  customer: (storeId: string, customerId: string) => ['customers', storeId, customerId] as const,

  // Payments
  payments: (storeId: string, filters?: Record<string, unknown>) =>
    filters ? ['payments', storeId, filters] as const : ['payments', storeId] as const,

  // Stock
  stock: (storeId: string) => ['stock', storeId] as const,

  // Store config
  storeConfig: (storeId: string) => ['store-config', storeId] as const,
  storeModules: (storeId: string) => ['store-modules', storeId] as const,

  // Finance
  financeEntries: (storeId: string, filters?: Record<string, unknown>) =>
    filters ? ['finance-entries', storeId, filters] as const : ['finance-entries', storeId] as const,
  financeSummary: (storeId: string, dateFrom?: string, dateTo?: string) =>
    ['finance-summary', storeId, dateFrom, dateTo] as const,
  expenses: (storeId: string, filters?: Record<string, unknown>) =>
    filters ? ['expenses', storeId, filters] as const : ['expenses', storeId] as const,
  expensesSummary: (storeId: string, dateFrom?: string, dateTo?: string) =>
    ['expenses-summary', storeId, dateFrom, dateTo] as const,
  expenseCategories: (storeId: string) => ['expense-categories', storeId] as const,

  // Tasks
  tasks: (storeId: string, filters?: Record<string, unknown>) =>
    filters ? ['tasks', storeId, filters] as const : ['tasks', storeId] as const,

  // Banners
  banners: (storeId: string) => ['banners', storeId] as const,

  // Shipping
  shippingMethods: (storeId: string) => ['shipping-methods', storeId] as const,
  shipments: (storeId: string, filters?: Record<string, unknown>) =>
    filters ? ['shipments', storeId, filters] as const : ['shipments', storeId] as const,

  // Wholesale
  wholesale: (storeId: string) => ['wholesale', storeId] as const,

  // Multiuser
  storeUsers: (storeId: string) => ['store-users', storeId] as const,
  invitations: (storeId: string) => ['invitations', storeId] as const,

  // Savings
  savings: (storeId: string) => ['savings', storeId] as const,

  // Payment methods (checkout configurator)
  paymentMethods: (storeId: string) => ['payment-methods', storeId] as const,

  // Variants
  variantAttributes: (storeId: string, productId: string) =>
    ['variant-attributes', storeId, productId] as const,
  variants: (storeId: string, productId: string) => ['variants', storeId, productId] as const,

  // Custom domain
  customDomain: (storeId: string) => ['custom-domain', storeId] as const,

  // Sales (POS) — F16
  salesSummary: (storeId: string, date?: string) =>
    date ? ['sales-summary', storeId, date] as const : ['sales-summary', storeId] as const,
  salesHistory: (storeId: string, filters?: Record<string, unknown>) =>
    filters ? ['sales-history', storeId, filters] as const : ['sales-history', storeId] as const,

  // Assistant
  assistantSession: (storeId: string) => ['assistant', storeId] as const,

  // Plans (global)
  plans: () => ['plans'] as const,

  // Billing (por tienda)
  billing: (storeId: string) => ['billing', storeId] as const,
}

/** staleTime por entidad (ms) — system/realtime.md */
export const staleTimes = {
  dashboardStats: 30 * 1000,
  orders: 10 * 1000,
  orderDetail: 15 * 1000,
  products: 2 * 60 * 1000,
  categories: 2 * 60 * 1000,
  customers: 2 * 60 * 1000,
  stock: 20 * 1000,
  payments: 30 * 1000,
  financeEntries: 60 * 1000,
  expenses: 2 * 60 * 1000,
  tasks: 60 * 1000,
  storeConfig: 5 * 60 * 1000,
  storeModules: 10 * 60 * 1000,
  banners: 5 * 60 * 1000,
  shippingMethods: 5 * 60 * 1000,
  shipments: 30 * 1000,
  wholesale: 2 * 60 * 1000,
  savings: 2 * 60 * 1000,
  variants: 2 * 60 * 1000,
  variantAttributes: 5 * 60 * 1000,
  customDomain: 60 * 1000,
  financeSummary: 60 * 1000,
  expensesSummary: 2 * 60 * 1000,
  plans: 30 * 60 * 1000,
  billing: 60 * 1000,
  storeUsers: 2 * 60 * 1000,
  invitations: 60 * 1000,
  salesSummary: 30 * 1000,
  salesHistory: 30 * 1000,
}

/** gcTime por entidad (ms) — system/realtime.md */
export const gcTimes = {
  dashboardStats: 2 * 60 * 1000,
  orders: 5 * 60 * 1000,
  orderDetail: 5 * 60 * 1000,
  products: 10 * 60 * 1000,
  categories: 10 * 60 * 1000,
  customers: 10 * 60 * 1000,
  stock: 3 * 60 * 1000,
  payments: 5 * 60 * 1000,
  financeEntries: 5 * 60 * 1000,
  expenses: 5 * 60 * 1000,
  tasks: 5 * 60 * 1000,
  storeConfig: 30 * 60 * 1000,
  storeModules: 60 * 60 * 1000,
  banners: 15 * 60 * 1000,
  shippingMethods: 15 * 60 * 1000,
  shipments: 5 * 60 * 1000,
  wholesale: 10 * 60 * 1000,
  savings: 10 * 60 * 1000,
  variants: 10 * 60 * 1000,
  variantAttributes: 15 * 60 * 1000,
  customDomain: 5 * 60 * 1000,
  financeSummary: 5 * 60 * 1000,
  expensesSummary: 5 * 60 * 1000,
  plans: 60 * 60 * 1000,
  billing: 5 * 60 * 1000,
  storeUsers: 10 * 60 * 1000,
  invitations: 5 * 60 * 1000,
  salesSummary: 5 * 60 * 1000,
  salesHistory: 5 * 60 * 1000,
}
