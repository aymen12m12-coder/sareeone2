import { pgTable, text, uuid, timestamp, boolean, integer, decimal, varchar } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";
import { sql } from "drizzle-orm";

// Users table (customers) - بدون مصادقة
export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  username: varchar("username", { length: 50 }).notNull().unique(),
  name: text("name").notNull(),
  phone: varchar("phone", { length: 20 }),
  email: varchar("email", { length: 100 }),
  address: text("address"),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Customers table (alias for users)
export const customers = users;

// User addresses table
export const userAddresses = pgTable("user_addresses", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").references(() => users.id).notNull(),
  type: varchar("type", { length: 50 }).notNull(), // تمت الإضافة: home, work, other
  title: varchar("title", { length: 100 }).notNull(),
  address: text("address").notNull(),
  details: text("details"), // تمت الإضافة
  latitude: decimal("latitude", { precision: 10, scale: 8 }),
  longitude: decimal("longitude", { precision: 11, scale: 8 }),
  isDefault: boolean("is_default").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Categories table
export const categories = pgTable("categories", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 100 }).notNull(),
  icon: varchar("icon", { length: 100 }).notNull(),
  sortOrder: integer("sort_order").default(0),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Restaurants table
export const restaurants = pgTable("restaurants", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 200 }).notNull(),
  description: text("description"),
  image: text("image").notNull(), // تم تغيير إلى notNull
  phone: varchar("phone", { length: 20 }), // إضافة رقم هاتف المطعم
  rating: varchar("rating", { length: 10 }).default("0.0"),
  reviewCount: integer("review_count").default(0),
  deliveryTime: varchar("delivery_time", { length: 50 }).notNull(), // تم تغيير إلى notNull
  isOpen: boolean("is_open").default(true).notNull(),
  minimumOrder: decimal("minimum_order", { precision: 10, scale: 2 }).default("0"),
  deliveryFee: decimal("delivery_fee", { precision: 10, scale: 2 }).default("0"),
  categoryId: uuid("category_id").references(() => categories.id),
  openingTime: varchar("opening_time", { length: 50 }).default("08:00"), // تمت الإضافة
  closingTime: varchar("closing_time", { length: 50 }).default("23:00"), // تمت الإضافة
  workingDays: varchar("working_days", { length: 50 }).default("0,1,2,3,4,5,6"), // تمت الإضافة
  isTemporarilyClosed: boolean("is_temporarily_closed").default(false), // تمت الإضافة
  temporaryCloseReason: text("temporary_close_reason"), // تمت الإضافة
  latitude: decimal("latitude", { precision: 10, scale: 8 }),
  longitude: decimal("longitude", { precision: 11, scale: 8 }),
  address: text("address"), // عنوان المطعم
  isFeatured: boolean("is_featured").default(false), // للمطاعم المفضلة
  isNew: boolean("is_new").default(false), // للمطاعم الجديدة
  isActive: boolean("is_active").default(true).notNull(), // حالة النشاط
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Menu items table
export const menuItems = pgTable("menu_items", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 200 }).notNull(),
  description: text("description"),
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  originalPrice: decimal("original_price", { precision: 10, scale: 2 }),
  image: text("image").notNull(), // تم تغيير إلى notNull
  category: varchar("category", { length: 100 }).notNull(), // تم تغيير إلى notNull
  isAvailable: boolean("is_available").default(true).notNull(),
  isSpecialOffer: boolean("is_special_offer").default(false).notNull(),
  restaurantId: uuid("restaurant_id").references(() => restaurants.id),
});

// Drivers table - بدون مصادقة
export const drivers = pgTable("drivers", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 100 }).notNull(),
  phone: varchar("phone", { length: 20 }).notNull().unique(),
  password: text("password").notNull(), // إضافة حقل كلمة المرور
  isAvailable: boolean("is_available").default(true).notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  currentLocation: varchar("current_location", { length: 200 }),
  earnings: decimal("earnings", { precision: 10, scale: 2 }).default("0"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Orders table
export const orders = pgTable("orders", {
  id: uuid("id").primaryKey().defaultRandom(),
  orderNumber: varchar("order_number", { length: 50 }).notNull().unique(),
  customerName: varchar("customer_name", { length: 100 }).notNull(),
  customerPhone: varchar("customer_phone", { length: 20 }).notNull(),
  customerEmail: varchar("customer_email", { length: 100 }),
  customerId: uuid("customer_id").references(() => users.id),
  deliveryAddress: text("delivery_address").notNull(),
  customerLocationLat: decimal("customer_location_lat", { precision: 10, scale: 8 }), // إحداثيات العميل
  customerLocationLng: decimal("customer_location_lng", { precision: 11, scale: 8 }), // إحداثيات العميل
  notes: text("notes"),
  paymentMethod: varchar("payment_method", { length: 50 }).notNull(),
  status: varchar("status", { length: 50 }).default("pending").notNull(),
  items: text("items").notNull(), // JSON string
  subtotal: decimal("subtotal", { precision: 10, scale: 2 }).notNull(),
  deliveryFee: decimal("delivery_fee", { precision: 10, scale: 2 }).notNull(),
  total: decimal("total", { precision: 10, scale: 2 }).notNull(),
  totalAmount: decimal("total_amount", { precision: 10, scale: 2 }).notNull(),
  estimatedTime: varchar("estimated_time", { length: 50 }).default("30-45 دقيقة"),
  driverEarnings: decimal("driver_earnings", { precision: 10, scale: 2 }).default("0"),
  restaurantId: uuid("restaurant_id").references(() => restaurants.id),
  driverId: uuid("driver_id").references(() => drivers.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Special offers table
export const specialOffers = pgTable("special_offers", {
  id: uuid("id").primaryKey().defaultRandom(),
  title: varchar("title", { length: 200 }).notNull(),
  description: text("description").notNull(), // تم تغيير إلى notNull
  image: text("image").notNull(), // تمت الإضافة
  discountPercent: integer("discount_percent"),
  discountAmount: decimal("discount_amount", { precision: 10, scale: 2 }),
  minimumOrder: decimal("minimum_order", { precision: 10, scale: 2 }).default("0"),
  validUntil: timestamp("valid_until"),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Admin users table - بدون مصادقة
export const adminUsers = pgTable("admin_users", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 100 }).notNull(),
  username: varchar("username", { length: 50 }).unique(),
  email: varchar("email", { length: 100 }).notNull().unique(),
  phone: varchar("phone", { length: 20 }),
  userType: varchar("user_type", { length: 50 }).default("admin").notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// System settings table
export const systemSettings = pgTable("system_settings", {
  id: uuid("id").primaryKey().defaultRandom(),
  key: varchar("key", { length: 100 }).notNull().unique(),
  value: text("value").notNull(),
  category: varchar("category", { length: 100 }).default("general"),
  description: text("description"),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// UI settings table (alias for system_settings)
export const uiSettings = systemSettings;

// Restaurant sections table
export const restaurantSections = pgTable("restaurant_sections", {
  id: uuid("id").primaryKey().defaultRandom(),
  restaurantId: uuid("restaurant_id").references(() => restaurants.id),
  name: varchar("name", { length: 100 }).notNull(),
  description: text("description"),
  sortOrder: integer("sort_order").default(0),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Ratings table
export const ratings = pgTable("ratings", {
  id: uuid("id").primaryKey().defaultRandom(),
  orderId: uuid("order_id").references(() => orders.id),
  restaurantId: uuid("restaurant_id").references(() => restaurants.id),
  customerName: varchar("customer_name", { length: 100 }).notNull(),
  customerPhone: varchar("customer_phone", { length: 20 }),
  rating: integer("rating").notNull(),
  comment: text("comment"),
  isApproved: boolean("is_approved").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Notifications table
export const notifications = pgTable("notifications", {
  id: uuid("id").primaryKey().defaultRandom(),
  type: varchar("type", { length: 50 }).notNull(),
  title: varchar("title", { length: 200 }).notNull(),
  message: text("message").notNull(),
  recipientType: varchar("recipient_type", { length: 50 }).notNull(),
  recipientId: uuid("recipient_id"),
  orderId: uuid("order_id").references(() => orders.id),
  isRead: boolean("is_read").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Order tracking table
export const orderTracking = pgTable("order_tracking", {
  id: uuid("id").primaryKey().defaultRandom(),
  orderId: uuid("order_id").references(() => orders.id).notNull(),
  status: varchar("status", { length: 50 }).notNull(),
  message: text("message").notNull(),
  createdBy: uuid("created_by").notNull(),
  createdByType: varchar("created_by_type", { length: 50 }).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Wallets table
export const wallets = pgTable("wallets", {
  id: uuid("id").primaryKey().defaultRandom(),
  customerPhone: varchar("customer_phone", { length: 20 }).unique().notNull(),
  balance: decimal("balance", { precision: 10, scale: 2 }).default("0.00"),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Wallet transactions table
export const walletTransactions = pgTable("wallet_transactions", {
  id: uuid("id").primaryKey().defaultRandom(),
  walletId: uuid("wallet_id").references(() => wallets.id),
  type: varchar("type", { length: 50 }).notNull(),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  description: text("description"),
  orderId: uuid("order_id").references(() => orders.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// System settings table (removed duplicate)
export const systemSettingsTable = pgTable("system_settings_table", {
  id: uuid("id").primaryKey().defaultRandom(),
  key: varchar("key", { length: 100 }).unique().notNull(),
  value: text("value").notNull(),
  category: varchar("category", { length: 50 }),
  description: text("description"),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Restaurant earnings table
export const restaurantEarnings = pgTable("restaurant_earnings", {
  id: uuid("id").primaryKey().defaultRandom(),
  restaurantId: uuid("restaurant_id").references(() => restaurants.id),
  ownerName: varchar("owner_name", { length: 100 }).notNull(),
  ownerPhone: varchar("owner_phone", { length: 20 }).notNull(),
  totalEarnings: decimal("total_earnings", { precision: 10, scale: 2 }).default("0.00"),
  pendingAmount: decimal("pending_amount", { precision: 10, scale: 2 }).default("0.00"),
  paidAmount: decimal("paid_amount", { precision: 10, scale: 2 }).default("0.00"),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Cart table - جدول السلة
export const cart = pgTable("cart", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").references(() => users.id).notNull(),
  menuItemId: uuid("menu_item_id").references(() => menuItems.id).notNull(),
  restaurantId: uuid("restaurant_id").references(() => restaurants.id).notNull(),
  quantity: integer("quantity").default(1).notNull(),
  specialInstructions: text("special_instructions"),
  addedAt: timestamp("added_at").defaultNow().notNull(),
});

// Favorites table - جدول المفضلة
export const favorites = pgTable("favorites", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").references(() => users.id).notNull(),
  restaurantId: uuid("restaurant_id").references(() => restaurants.id).notNull(),
  addedAt: timestamp("added_at").defaultNow().notNull(),
});

// New tables for Advanced Features
export const driverReviews = pgTable("driver_reviews", {
  id: uuid("id").primaryKey().defaultRandom(),
  driverId: uuid("driver_id").references(() => drivers.id).notNull(),
  orderId: uuid("order_id").references(() => orders.id).notNull(),
  rating: integer("rating").notNull(),
  comment: text("comment"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const driverEarningsTable = pgTable("driver_earnings_table", {
  id: uuid("id").primaryKey().defaultRandom(),
  driverId: uuid("driver_id").references(() => drivers.id).notNull(),
  totalEarned: decimal("total_earned", { precision: 10, scale: 2 }).default("0"),
  withdrawn: decimal("withdrawn", { precision: 10, scale: 2 }).default("0"),
  pending: decimal("pending", { precision: 10, scale: 2 }).default("0"),
  lastPaidAt: timestamp("last_paid_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const driverWallets = pgTable("driver_wallets", {
  id: uuid("id").primaryKey().defaultRandom(),
  driverId: uuid("driver_id").references(() => drivers.id).notNull().unique(),
  balance: decimal("balance", { precision: 10, scale: 2 }).default("0"),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const restaurantWallets = pgTable("restaurant_wallets", {
  id: uuid("id").primaryKey().defaultRandom(),
  restaurantId: uuid("restaurant_id").references(() => restaurants.id).notNull().unique(),
  balance: decimal("balance", { precision: 10, scale: 2 }).default("0"),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const commissionSettings = pgTable("commission_settings", {
  id: uuid("id").primaryKey().defaultRandom(),
  type: varchar("type", { length: 50 }).notNull(), // default, restaurant, driver
  entityId: uuid("entity_id"), // null if default
  commissionPercent: decimal("commission_percent", { precision: 5, scale: 2 }).notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const withdrawalRequests = pgTable("withdrawal_requests", {
  id: uuid("id").primaryKey().defaultRandom(),
  entityType: varchar("entity_type", { length: 50 }).notNull(), // driver, restaurant
  entityId: uuid("entity_id").notNull(),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  status: varchar("status", { length: 50 }).default("pending").notNull(), // pending, approved, rejected, completed
  bankDetails: text("bank_details"),
  adminNotes: text("admin_notes"),
  rejectionReason: text("rejection_reason"),
  approvedBy: uuid("approved_by"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const driverWorkSessions = pgTable("driver_work_sessions", {
  id: uuid("id").primaryKey().defaultRandom(),
  driverId: uuid("driver_id").references(() => drivers.id).notNull(),
  startTime: timestamp("start_time").defaultNow().notNull(),
  endTime: timestamp("end_time"),
  isActive: boolean("is_active").default(true).notNull(),
  totalDeliveries: integer("total_deliveries").default(0),
  totalEarnings: decimal("total_earnings", { precision: 10, scale: 2 }).default("0"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ==================== جداول جديدة للتكامل الشامل ====================

// جدول أرصدة السائقين - Driver Balances
export const driverBalances = pgTable("driver_balances", {
  id: uuid("id").primaryKey().defaultRandom(),
  driverId: uuid("driver_id").references(() => drivers.id).notNull().unique(),
  totalBalance: decimal("total_balance", { precision: 10, scale: 2 }).default("0").notNull(),
  availableBalance: decimal("available_balance", { precision: 10, scale: 2 }).default("0").notNull(),
  pendingAmount: decimal("pending_amount", { precision: 10, scale: 2 }).default("0").notNull(),
  withdrawnAmount: decimal("withdrawn_amount", { precision: 10, scale: 2 }).default("0").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// جدول معاملات السائقين - Driver Transactions
export const driverTransactions = pgTable("driver_transactions", {
  id: uuid("id").primaryKey().defaultRandom(),
  driverId: uuid("driver_id").references(() => drivers.id).notNull(),
  type: varchar("type", { length: 50 }).notNull(), // commission, withdrawal, bonus, deduction
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  balanceBefore: decimal("balance_before", { precision: 10, scale: 2 }).notNull(),
  balanceAfter: decimal("balance_after", { precision: 10, scale: 2 }).notNull(),
  description: text("description"),
  orderId: uuid("order_id").references(() => orders.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// جدول عمولات السائقين - Driver Commissions
export const driverCommissions = pgTable("driver_commissions", {
  id: uuid("id").primaryKey().defaultRandom(),
  driverId: uuid("driver_id").references(() => drivers.id).notNull(),
  orderId: uuid("order_id").references(() => orders.id).notNull(),
  orderAmount: decimal("order_amount", { precision: 10, scale: 2 }).notNull(),
  commissionRate: decimal("commission_rate", { precision: 5, scale: 2 }).notNull(),
  commissionAmount: decimal("commission_amount", { precision: 10, scale: 2 }).notNull(),
  status: varchar("status", { length: 50 }).default("pending").notNull(), // pending, approved, paid
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// جدول طلبات سحب السائقين - Driver Withdrawals
export const driverWithdrawals = pgTable("driver_withdrawals", {
  id: uuid("id").primaryKey().defaultRandom(),
  driverId: uuid("driver_id").references(() => drivers.id).notNull(),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  status: varchar("status", { length: 50 }).default("pending").notNull(), // pending, approved, rejected, completed
  paymentMethod: varchar("payment_method", { length: 50 }).default("bank_transfer"),
  bankDetails: text("bank_details"),
  notes: text("notes"),
  processedBy: uuid("processed_by"),
  processedAt: timestamp("processed_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// جدول إعدادات رسوم التوصيل - Delivery Fee Settings
export const deliveryFeeSettings = pgTable("delivery_fee_settings", {
  id: uuid("id").primaryKey().defaultRandom(),
  type: varchar("type", { length: 50 }).notNull(), // fixed, per_km, zone_based, restaurant_custom
  baseFee: decimal("base_fee", { precision: 10, scale: 2 }).default("0").notNull(), // رسوم أساسية
  perKmFee: decimal("per_km_fee", { precision: 10, scale: 2 }).default("0").notNull(), // رسوم لكل كيلومتر
  minFee: decimal("min_fee", { precision: 10, scale: 2 }).default("0").notNull(), // الحد الأدنى
  maxFee: decimal("max_fee", { precision: 10, scale: 2 }).default("100").notNull(), // الحد الأقصى
  freeDeliveryThreshold: decimal("free_delivery_threshold", { precision: 10, scale: 2 }).default("0"), // حد التوصيل المجاني
  restaurantId: uuid("restaurant_id").references(() => restaurants.id), // null للإعداد العام
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// جدول مناطق التوصيل - Delivery Zones
export const deliveryZones = pgTable("delivery_zones", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 100 }).notNull(),
  description: text("description"),
  minDistance: decimal("min_distance", { precision: 10, scale: 2 }).default("0").notNull(), // بالكيلومتر
  maxDistance: decimal("max_distance", { precision: 10, scale: 2 }).notNull(), // بالكيلومتر
  deliveryFee: decimal("delivery_fee", { precision: 10, scale: 2 }).notNull(),
  estimatedTime: varchar("estimated_time", { length: 50 }), // مثل "20-30 دقيقة"
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// جدول حسابات المطاعم المفصّل - Restaurant Accounts
export const restaurantAccounts = pgTable("restaurant_accounts", {
  id: uuid("id").primaryKey().defaultRandom(),
  restaurantId: uuid("restaurant_id").references(() => restaurants.id).notNull().unique(),
  ownerName: varchar("owner_name", { length: 100 }).notNull(),
  ownerPhone: varchar("owner_phone", { length: 20 }).notNull(),
  ownerEmail: varchar("owner_email", { length: 100 }),
  bankName: varchar("bank_name", { length: 100 }),
  bankAccountNumber: varchar("bank_account_number", { length: 50 }),
  bankAccountName: varchar("bank_account_name", { length: 100 }),
  commissionRate: decimal("commission_rate", { precision: 5, scale: 2 }).default("15").notNull(), // نسبة عمولة المنصة
  totalOrders: integer("total_orders").default(0).notNull(),
  totalRevenue: decimal("total_revenue", { precision: 12, scale: 2 }).default("0").notNull(),
  totalCommission: decimal("total_commission", { precision: 12, scale: 2 }).default("0").notNull(),
  pendingAmount: decimal("pending_amount", { precision: 12, scale: 2 }).default("0").notNull(),
  paidAmount: decimal("paid_amount", { precision: 12, scale: 2 }).default("0").notNull(),
  availableBalance: decimal("available_balance", { precision: 12, scale: 2 }).default("0").notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// جدول معاملات المطاعم - Restaurant Transactions
export const restaurantTransactions = pgTable("restaurant_transactions", {
  id: uuid("id").primaryKey().defaultRandom(),
  restaurantId: uuid("restaurant_id").references(() => restaurants.id).notNull(),
  orderId: uuid("order_id").references(() => orders.id),
  type: varchar("type", { length: 50 }).notNull(), // order_revenue, commission_deduction, withdrawal, adjustment
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  balanceBefore: decimal("balance_before", { precision: 10, scale: 2 }).notNull(),
  balanceAfter: decimal("balance_after", { precision: 10, scale: 2 }).notNull(),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// جدول طلبات سحب المطاعم - Restaurant Withdrawals
export const restaurantWithdrawals = pgTable("restaurant_withdrawals", {
  id: uuid("id").primaryKey().defaultRandom(),
  restaurantId: uuid("restaurant_id").references(() => restaurants.id).notNull(),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  status: varchar("status", { length: 50 }).default("pending").notNull(),
  paymentMethod: varchar("payment_method", { length: 50 }).default("bank_transfer"),
  notes: text("notes"),
  processedBy: uuid("processed_by"),
  processedAt: timestamp("processed_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// جدول إحصائيات المطاعم اليومية - Restaurant Daily Stats
export const restaurantDailyStats = pgTable("restaurant_daily_stats", {
  id: uuid("id").primaryKey().defaultRandom(),
  restaurantId: uuid("restaurant_id").references(() => restaurants.id).notNull(),
  date: timestamp("date").notNull(),
  totalOrders: integer("total_orders").default(0).notNull(),
  completedOrders: integer("completed_orders").default(0).notNull(),
  cancelledOrders: integer("cancelled_orders").default(0).notNull(),
  totalRevenue: decimal("total_revenue", { precision: 10, scale: 2 }).default("0").notNull(),
  totalDeliveryFees: decimal("total_delivery_fees", { precision: 10, scale: 2 }).default("0").notNull(),
  averageOrderValue: decimal("average_order_value", { precision: 10, scale: 2 }).default("0"),
  averageRating: decimal("average_rating", { precision: 3, scale: 2 }).default("0"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Zod schemas for validation
export const insertUserSchema = createInsertSchema(users);
export const selectUserSchema = createSelectSchema(users);
export type User = z.infer<typeof selectUserSchema>;
export type InsertUser = z.infer<typeof insertUserSchema>;

export const insertUserAddressSchema = createInsertSchema(userAddresses);
export const selectUserAddressSchema = createSelectSchema(userAddresses);
export type UserAddress = z.infer<typeof selectUserAddressSchema>;
export type InsertUserAddress = z.infer<typeof insertUserAddressSchema>;

export const insertCategorySchema = createInsertSchema(categories);
export const selectCategorySchema = createSelectSchema(categories);
export type Category = z.infer<typeof selectCategorySchema>;
export type InsertCategory = z.infer<typeof insertCategorySchema>;

export const insertRestaurantSchema = createInsertSchema(restaurants);
export const selectRestaurantSchema = createSelectSchema(restaurants);
export type Restaurant = z.infer<typeof selectRestaurantSchema>;
export type InsertRestaurant = z.infer<typeof insertRestaurantSchema>;

export const insertMenuItemSchema = createInsertSchema(menuItems);
export const selectMenuItemSchema = createSelectSchema(menuItems);
export type MenuItem = z.infer<typeof selectMenuItemSchema>;
export type InsertMenuItem = z.infer<typeof insertMenuItemSchema>;

export const insertOrderSchema = createInsertSchema(orders);
export const selectOrderSchema = createSelectSchema(orders);
export type Order = z.infer<typeof selectOrderSchema>;
export type InsertOrder = z.infer<typeof insertOrderSchema>;

export const insertDriverSchema = createInsertSchema(drivers);
export const selectDriverSchema = createSelectSchema(drivers);
export type Driver = z.infer<typeof selectDriverSchema>;
export type InsertDriver = z.infer<typeof insertDriverSchema>;

export const insertSpecialOfferSchema = createInsertSchema(specialOffers);
export const selectSpecialOfferSchema = createSelectSchema(specialOffers);
export type SpecialOffer = z.infer<typeof selectSpecialOfferSchema>;
export type InsertSpecialOffer = z.infer<typeof insertSpecialOfferSchema>;

export const insertAdminUserSchema = createInsertSchema(adminUsers);
export const selectAdminUserSchema = createSelectSchema(adminUsers);
export type AdminUser = z.infer<typeof selectAdminUserSchema>;
export type InsertAdminUser = z.infer<typeof insertAdminUserSchema>;

export const insertUiSettingsSchema = createInsertSchema(uiSettings);
export const selectUiSettingsSchema = createSelectSchema(uiSettings);
export type UiSettings = z.infer<typeof selectUiSettingsSchema>;
export type InsertUiSettings = z.infer<typeof insertUiSettingsSchema>;

export const insertRestaurantSectionSchema = createInsertSchema(restaurantSections);
export const selectRestaurantSectionSchema = createSelectSchema(restaurantSections);
export type RestaurantSection = z.infer<typeof selectRestaurantSectionSchema>;
export type InsertRestaurantSection = z.infer<typeof insertRestaurantSectionSchema>;

export const insertRatingSchema = createInsertSchema(ratings);
export const selectRatingSchema = createSelectSchema(ratings);
export type Rating = z.infer<typeof selectRatingSchema>;
export type InsertRating = z.infer<typeof insertRatingSchema>;

export const insertNotificationSchema = createInsertSchema(notifications);
export const selectNotificationSchema = createSelectSchema(notifications);
export type Notification = z.infer<typeof selectNotificationSchema>;
export type InsertNotification = z.infer<typeof insertNotificationSchema>;

export const insertWalletSchema = createInsertSchema(wallets);
export const selectWalletSchema = createSelectSchema(wallets);
export type Wallet = z.infer<typeof selectWalletSchema>;
export type InsertWallet = z.infer<typeof insertWalletSchema>;

export const insertWalletTransactionSchema = createInsertSchema(walletTransactions);
export const selectWalletTransactionSchema = createSelectSchema(walletTransactions);
export type WalletTransaction = z.infer<typeof selectWalletTransactionSchema>;
export type InsertWalletTransaction = z.infer<typeof insertWalletTransactionSchema>;

export const insertSystemSettingsSchema = createInsertSchema(systemSettingsTable);
export const selectSystemSettingsSchema = createSelectSchema(systemSettingsTable);
export type SystemSettings = z.infer<typeof selectSystemSettingsSchema>;
export type InsertSystemSettings = z.infer<typeof insertSystemSettingsSchema>;

export const insertRestaurantEarningsSchema = createInsertSchema(restaurantEarnings);
export const selectRestaurantEarningsSchema = createSelectSchema(restaurantEarnings);
export type RestaurantEarnings = z.infer<typeof selectRestaurantEarningsSchema>;
export type InsertRestaurantEarnings = z.infer<typeof insertRestaurantEarningsSchema>;

export const insertCartSchema = createInsertSchema(cart);
export const selectCartSchema = createSelectSchema(cart);
export type Cart = z.infer<typeof selectCartSchema>;
export type InsertCart = z.infer<typeof insertCartSchema>;

export const insertFavoritesSchema = createInsertSchema(favorites);
export const selectFavoritesSchema = createSelectSchema(favorites);
export type Favorites = z.infer<typeof selectFavoritesSchema>;
export type InsertFavorites = z.infer<typeof insertFavoritesSchema>;

// New schemas for Advanced Features
export const insertDriverReviewSchema = createInsertSchema(driverReviews);
export const selectDriverReviewSchema = createSelectSchema(driverReviews);
export type DriverReview = z.infer<typeof selectDriverReviewSchema>;
export type InsertDriverReview = z.infer<typeof insertDriverReviewSchema>;

export const insertDriverEarningsSchema = createInsertSchema(driverEarningsTable);
export const selectDriverEarningsSchema = createSelectSchema(driverEarningsTable);
export type DriverEarnings = z.infer<typeof selectDriverEarningsSchema>;
export type InsertDriverEarnings = z.infer<typeof insertDriverEarningsSchema>;

export const insertDriverWalletSchema = createInsertSchema(driverWallets);
export const selectDriverWalletSchema = createSelectSchema(driverWallets);
export type DriverWallet = z.infer<typeof selectDriverWalletSchema>;
export type InsertDriverWallet = z.infer<typeof insertDriverWalletSchema>;

export const insertRestaurantWalletSchema = createInsertSchema(restaurantWallets);
export const selectRestaurantWalletSchema = createSelectSchema(restaurantWallets);
export type RestaurantWallet = z.infer<typeof selectRestaurantWalletSchema>;
export type InsertRestaurantWallet = z.infer<typeof insertRestaurantWalletSchema>;

export const insertCommissionSettingsSchema = createInsertSchema(commissionSettings);
export const selectCommissionSettingsSchema = createSelectSchema(commissionSettings);
export type CommissionSettings = z.infer<typeof selectCommissionSettingsSchema>;
export type InsertCommissionSettings = z.infer<typeof insertCommissionSettingsSchema>;

export const insertWithdrawalRequestSchema = createInsertSchema(withdrawalRequests);
export const selectWithdrawalRequestSchema = createSelectSchema(withdrawalRequests);
export type WithdrawalRequest = z.infer<typeof selectWithdrawalRequestSchema>;
export type InsertWithdrawalRequest = z.infer<typeof insertWithdrawalRequestSchema>;

export const insertDriverWorkSessionSchema = createInsertSchema(driverWorkSessions);
export const selectDriverWorkSessionSchema = createSelectSchema(driverWorkSessions);
export type DriverWorkSession = z.infer<typeof selectDriverWorkSessionSchema>;
export type InsertDriverWorkSession = z.infer<typeof insertDriverWorkSessionSchema>;

// Re-export driverEarnings as driverEarnings (already done above with driverEarningsTable)
export const driverEarnings = driverEarningsTable;

// ==================== Schemas للجداول الجديدة ====================

// Driver Balances
export const insertDriverBalanceSchema = createInsertSchema(driverBalances);
export const selectDriverBalanceSchema = createSelectSchema(driverBalances);
export type DriverBalance = z.infer<typeof selectDriverBalanceSchema>;
export type InsertDriverBalance = z.infer<typeof insertDriverBalanceSchema>;

// Driver Transactions
export const insertDriverTransactionSchema = createInsertSchema(driverTransactions);
export const selectDriverTransactionSchema = createSelectSchema(driverTransactions);
export type DriverTransaction = z.infer<typeof selectDriverTransactionSchema>;
export type InsertDriverTransaction = z.infer<typeof insertDriverTransactionSchema>;

// Driver Commissions
export const insertDriverCommissionSchema = createInsertSchema(driverCommissions);
export const selectDriverCommissionSchema = createSelectSchema(driverCommissions);
export type DriverCommission = z.infer<typeof selectDriverCommissionSchema>;
export type InsertDriverCommission = z.infer<typeof insertDriverCommissionSchema>;

// Driver Withdrawals
export const insertDriverWithdrawalSchema = createInsertSchema(driverWithdrawals);
export const selectDriverWithdrawalSchema = createSelectSchema(driverWithdrawals);
export type DriverWithdrawal = z.infer<typeof selectDriverWithdrawalSchema>;
export type InsertDriverWithdrawal = z.infer<typeof insertDriverWithdrawalSchema>;

// Delivery Fee Settings
export const insertDeliveryFeeSettingsSchema = createInsertSchema(deliveryFeeSettings);
export const selectDeliveryFeeSettingsSchema = createSelectSchema(deliveryFeeSettings);
export type DeliveryFeeSettings = z.infer<typeof selectDeliveryFeeSettingsSchema>;
export type InsertDeliveryFeeSettings = z.infer<typeof insertDeliveryFeeSettingsSchema>;

// Delivery Zones
export const insertDeliveryZoneSchema = createInsertSchema(deliveryZones);
export const selectDeliveryZoneSchema = createSelectSchema(deliveryZones);
export type DeliveryZone = z.infer<typeof selectDeliveryZoneSchema>;
export type InsertDeliveryZone = z.infer<typeof insertDeliveryZoneSchema>;

// Restaurant Accounts
export const insertRestaurantAccountSchema = createInsertSchema(restaurantAccounts);
export const selectRestaurantAccountSchema = createSelectSchema(restaurantAccounts);
export type RestaurantAccount = z.infer<typeof selectRestaurantAccountSchema>;
export type InsertRestaurantAccount = z.infer<typeof insertRestaurantAccountSchema>;

// Restaurant Transactions
export const insertRestaurantTransactionSchema = createInsertSchema(restaurantTransactions);
export const selectRestaurantTransactionSchema = createSelectSchema(restaurantTransactions);
export type RestaurantTransaction = z.infer<typeof selectRestaurantTransactionSchema>;
export type InsertRestaurantTransaction = z.infer<typeof insertRestaurantTransactionSchema>;

// Restaurant Withdrawals
export const insertRestaurantWithdrawalSchema = createInsertSchema(restaurantWithdrawals);
export const selectRestaurantWithdrawalSchema = createSelectSchema(restaurantWithdrawals);
export type RestaurantWithdrawal = z.infer<typeof selectRestaurantWithdrawalSchema>;
export type InsertRestaurantWithdrawal = z.infer<typeof insertRestaurantWithdrawalSchema>;

// Restaurant Daily Stats
export const insertRestaurantDailyStatsSchema = createInsertSchema(restaurantDailyStats);
export const selectRestaurantDailyStatsSchema = createSelectSchema(restaurantDailyStats);
export type RestaurantDailyStats = z.infer<typeof selectRestaurantDailyStatsSchema>;
export type InsertRestaurantDailyStats = z.infer<typeof insertRestaurantDailyStatsSchema>;
