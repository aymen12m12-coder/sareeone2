import { drizzle } from "drizzle-orm/postgres-js";
import { 
  driverReviews, driverEarnings, driverWallets, restaurantWallets,
  commissionSettings, withdrawalRequests, driverWorkSessions,
  drivers, orders, users,
  type DriverReview, type InsertDriverReview,
  type DriverEarnings, type InsertDriverEarnings,
  type DriverWallet, type InsertDriverWallet,
  type RestaurantWallet, type InsertRestaurantWallet,
  type CommissionSettings, type InsertCommissionSettings,
  type WithdrawalRequest, type InsertWithdrawalRequest,
  type DriverWorkSession, type InsertDriverWorkSession
} from "@shared/schema";
import { eq, and, desc, sql, gte, lte } from "drizzle-orm";

export class AdvancedDatabaseStorage {
  private db: any;

  constructor(dbInstance: any) {
    this.db = dbInstance;
  }

  // Driver Reviews
  async createDriverReview(review: InsertDriverReview): Promise<DriverReview> {
    const result = await this.db.insert(driverReviews).values(review).returning();
    return result[0];
  }

  async getDriverReviews(driverId: string): Promise<DriverReview[]> {
    return await this.db.select().from(driverReviews)
      .where(eq(driverReviews.driverId, driverId))
      .orderBy(desc(driverReviews.createdAt));
  }

  async getDriverAverageRating(driverId: string): Promise<number> {
    const reviews = await this.getDriverReviews(driverId);
    if (reviews.length === 0) return 0;
    const sum = reviews.reduce((acc, r) => acc + r.rating, 0);
    return sum / reviews.length;
  }

  // Driver Earnings
  async updateDriverEarnings(driverId: string, earnings: Partial<InsertDriverEarnings>): Promise<DriverEarnings> {
    const result = await this.db.update(driverEarnings)
      .set(earnings)
      .where(eq(driverEarnings.driverId, driverId))
      .returning();
    return result[0];
  }

  async getDriverEarnings(driverId: string): Promise<DriverEarnings | null> {
    const result = await this.db.select().from(driverEarnings)
      .where(eq(driverEarnings.driverId, driverId));
    return result[0] || null;
  }

  async getDriverEarningsStats(driverId: string) {
    const earnings = await this.getDriverEarnings(driverId);
    const reviews = await this.getDriverReviews(driverId);
    const avgRating = reviews.length > 0 
      ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length 
      : 0;

    return {
      ...earnings,
      averageRating: avgRating,
      totalReviews: reviews.length
    };
  }

  // Driver Wallets
  async createDriverWallet(wallet: InsertDriverWallet): Promise<DriverWallet> {
    const result = await this.db.insert(driverWallets).values(wallet).returning();
    return result[0];
  }

  async getDriverWallet(driverId: string): Promise<DriverWallet | null> {
    const result = await this.db.select().from(driverWallets)
      .where(eq(driverWallets.driverId, driverId));
    return result[0] || null;
  }

  async updateDriverWallet(driverId: string, updates: Partial<InsertDriverWallet>): Promise<DriverWallet> {
    const result = await this.db.update(driverWallets)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(driverWallets.driverId, driverId))
      .returning();
    return result[0];
  }

  async addDriverWalletBalance(driverId: string, amount: number): Promise<DriverWallet> {
    const wallet = await this.getDriverWallet(driverId);
    if (!wallet) throw new Error("Wallet not found");
    
    const currentBalance = parseFloat(wallet.balance?.toString() || "0");
    const newBalance = currentBalance + amount;
    
    return await this.updateDriverWallet(driverId, { balance: newBalance.toString() });
  }

  async deductDriverWalletBalance(driverId: string, amount: number): Promise<DriverWallet> {
    const wallet = await this.getDriverWallet(driverId);
    if (!wallet) throw new Error("Wallet not found");
    
    const currentBalance = parseFloat(wallet.balance?.toString() || "0");
    if (currentBalance < amount) throw new Error("Insufficient balance");
    
    const newBalance = currentBalance - amount;
    return await this.updateDriverWallet(driverId, { balance: newBalance.toString() });
  }

  // Restaurant Wallets
  async createRestaurantWallet(wallet: InsertRestaurantWallet): Promise<RestaurantWallet> {
    const result = await this.db.insert(restaurantWallets).values(wallet).returning();
    return result[0];
  }

  async getRestaurantWallet(restaurantId: string): Promise<RestaurantWallet | null> {
    const result = await this.db.select().from(restaurantWallets)
      .where(eq(restaurantWallets.restaurantId, restaurantId));
    return result[0] || null;
  }

  async updateRestaurantWallet(restaurantId: string, updates: Partial<InsertRestaurantWallet>): Promise<RestaurantWallet> {
    const result = await this.db.update(restaurantWallets)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(restaurantWallets.restaurantId, restaurantId))
      .returning();
    return result[0];
  }

  async addRestaurantWalletBalance(restaurantId: string, amount: number): Promise<RestaurantWallet> {
    const wallet = await this.getRestaurantWallet(restaurantId);
    if (!wallet) throw new Error("Wallet not found");
    
    const currentBalance = parseFloat(wallet.balance?.toString() || "0");
    const newBalance = currentBalance + amount;
    
    return await this.updateRestaurantWallet(restaurantId, { balance: newBalance.toString() });
  }

  async deductRestaurantWalletBalance(restaurantId: string, amount: number): Promise<RestaurantWallet> {
    const wallet = await this.getRestaurantWallet(restaurantId);
    if (!wallet) throw new Error("Wallet not found");
    
    const currentBalance = parseFloat(wallet.balance?.toString() || "0");
    if (currentBalance < amount) throw new Error("Insufficient balance");
    
    const newBalance = currentBalance - amount;
    return await this.updateRestaurantWallet(restaurantId, { balance: newBalance.toString() });
  }

  // Commission Settings
  async createCommissionSetting(setting: InsertCommissionSettings): Promise<CommissionSettings> {
    const result = await this.db.insert(commissionSettings).values(setting).returning();
    return result[0];
  }

  async getCommissionSettings(type: string, entityId?: string): Promise<CommissionSettings | null> {
    const conditions = [eq(commissionSettings.type, type)];
    if (entityId) {
      conditions.push(eq(commissionSettings.entityId, entityId));
    }
    
    const result = await this.db.select().from(commissionSettings)
      .where(and(...conditions));
    return result[0] || null;
  }

  async getDefaultCommissionPercent(): Promise<number> {
    const setting = await this.getCommissionSettings('default');
    return setting ? parseFloat(setting.commissionPercent?.toString() || "10") : 10;
  }

  // Withdrawal Requests
  async createWithdrawalRequest(request: InsertWithdrawalRequest): Promise<WithdrawalRequest> {
    const result = await this.db.insert(withdrawalRequests).values(request).returning();
    return result[0];
  }

  async getWithdrawalRequests(entityId: string, entityType: string): Promise<WithdrawalRequest[]> {
    return await this.db.select().from(withdrawalRequests)
      .where(and(
        eq(withdrawalRequests.entityId, entityId),
        eq(withdrawalRequests.entityType, entityType)
      ))
      .orderBy(desc(withdrawalRequests.createdAt));
  }

  async getPendingWithdrawalRequests(): Promise<WithdrawalRequest[]> {
    return await this.db.select().from(withdrawalRequests)
      .where(eq(withdrawalRequests.status, 'pending'))
      .orderBy(desc(withdrawalRequests.createdAt));
  }

  async updateWithdrawalRequest(id: string, updates: Partial<InsertWithdrawalRequest>): Promise<WithdrawalRequest> {
    const result = await this.db.update(withdrawalRequests)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(withdrawalRequests.id, id))
      .returning();
    return result[0];
  }

  async approveWithdrawalRequest(id: string, approvedBy: string): Promise<WithdrawalRequest> {
    return await this.updateWithdrawalRequest(id, {
      status: 'approved',
      approvedBy: approvedBy as any,
      updatedAt: new Date()
    });
  }

  async rejectWithdrawalRequest(id: string, reason: string): Promise<WithdrawalRequest> {
    return await this.updateWithdrawalRequest(id, {
      status: 'rejected',
      rejectionReason: reason,
      updatedAt: new Date()
    });
  }

  // Driver Work Sessions
  async createWorkSession(session: InsertDriverWorkSession): Promise<DriverWorkSession> {
    const result = await this.db.insert(driverWorkSessions).values(session).returning();
    return result[0];
  }

  async getActiveWorkSession(driverId: string): Promise<DriverWorkSession | null> {
    const result = await this.db.select().from(driverWorkSessions)
      .where(and(
        eq(driverWorkSessions.driverId, driverId),
        eq(driverWorkSessions.isActive, true)
      ))
      .orderBy(desc(driverWorkSessions.createdAt));
    return result[0] || null;
  }

  async endWorkSession(sessionId: string, totalDeliveries: number, totalEarnings: number): Promise<DriverWorkSession> {
    const result = await this.db.update(driverWorkSessions)
      .set({
        isActive: false,
        endTime: new Date(),
        totalDeliveries,
        totalEarnings: totalEarnings.toString()
      })
      .where(eq(driverWorkSessions.id, sessionId))
      .returning();
    return result[0];
  }

  async getDriverWorkSessions(driverId: string, startDate?: Date, endDate?: Date): Promise<DriverWorkSession[]> {
    const conditions = [eq(driverWorkSessions.driverId, driverId)];
    
    if (startDate) {
      conditions.push(gte(driverWorkSessions.createdAt, startDate));
    }
    if (endDate) {
      conditions.push(lte(driverWorkSessions.createdAt, endDate));
    }

    return await this.db.select().from(driverWorkSessions)
      .where(and(...conditions))
      .orderBy(desc(driverWorkSessions.createdAt));
  }

  // Analytics
  async getDriverPerformanceStats(driverId: string, startDate?: Date, endDate?: Date) {
    const conditions = [eq(orders.driverId, driverId)];
    
    if (startDate) {
      conditions.push(gte(orders.createdAt, startDate));
    }
    if (endDate) {
      conditions.push(lte(orders.createdAt, endDate));
    }

    const driverOrders = await this.db.select().from(orders)
      .where(and(...conditions));

    const completedOrders = driverOrders.filter(o => o.status === 'delivered');
    const totalEarnings = completedOrders.reduce((sum, o) => sum + parseFloat(o.driverEarnings?.toString() || "0"), 0);

    const reviews = await this.getDriverReviews(driverId);
    const avgRating = reviews.length > 0 
      ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length 
      : 0;

    return {
      totalOrders: driverOrders.length,
      completedOrders: completedOrders.length,
      totalEarnings,
      averageRating: avgRating,
      totalReviews: reviews.length,
      successRate: driverOrders.length > 0 ? (completedOrders.length / driverOrders.length) * 100 : 0
    };
  }

  async getRestaurantPerformanceStats(restaurantId: string, startDate?: Date, endDate?: Date) {
    const conditions = [eq(orders.restaurantId, restaurantId)];
    
    if (startDate) {
      conditions.push(gte(orders.createdAt, startDate));
    }
    if (endDate) {
      conditions.push(lte(orders.createdAt, endDate));
    }

    const restaurantOrders = await this.db.select().from(orders)
      .where(and(...conditions));

    const completedOrders = restaurantOrders.filter(o => o.status === 'delivered');
    const totalRevenue = restaurantOrders.reduce((sum, o) => sum + parseFloat(o.totalAmount?.toString() || "0"), 0);
    const totalCommission = completedOrders.reduce((sum, o) => sum + parseFloat(o.companyEarnings?.toString() || "0"), 0);
    const netRevenue = completedOrders.reduce((sum, o) => sum + parseFloat(o.restaurantEarnings?.toString() || "0"), 0);

    return {
      totalOrders: restaurantOrders.length,
      completedOrders: completedOrders.length,
      totalRevenue,
      totalCommission,
      netRevenue,
      averageOrderValue: restaurantOrders.length > 0 ? totalRevenue / restaurantOrders.length : 0
    };
  }
}
