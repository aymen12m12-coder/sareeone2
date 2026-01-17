import express from "express";
import { AdvancedDatabaseStorage } from "../db-advanced";
import { DatabaseStorage } from "../db";
import { z } from "zod";

const router = express.Router();

export function registerAdvancedRoutes(app: express.Express) {
  const dbStorage = new DatabaseStorage();
  const advancedDb = new AdvancedDatabaseStorage(dbStorage.db);

  // ===================== DRIVER ROUTES =====================

  // Get driver details with wallet and earnings
  app.get("/api/admin/drivers/:driverId/details", async (req, res) => {
    try {
      const { driverId } = req.params;

      const driver = await dbStorage.getDriver(driverId);
      if (!driver) {
        return res.status(404).json({ error: "Driver not found" });
      }

      const wallet = await advancedDb.getDriverWallet(driverId);
      const earnings = await advancedDb.getDriverEarningsStats(driverId);
      const reviews = await advancedDb.getDriverReviews(driverId);
      const stats = await advancedDb.getDriverPerformanceStats(driverId);

      res.json({
        driver,
        wallet,
        earnings,
        stats,
        reviews: reviews.slice(0, 10)
      });
    } catch (error) {
      console.error("Error fetching driver details:", error);
      res.status(500).json({ error: "Failed to fetch driver details" });
    }
  });

  // Get all drivers with summary
  app.get("/api/admin/drivers-summary", async (req, res) => {
    try {
      const drivers = await dbStorage.getDrivers();
      const summaries = await Promise.all(
        drivers.map(async (driver) => {
          const stats = await advancedDb.getDriverPerformanceStats(driver.id);
          const wallet = await advancedDb.getDriverWallet(driver.id);
          return {
            ...driver,
            stats,
            wallet: {
              balance: wallet?.balance || 0,
              totalEarned: wallet?.totalEarned || 0
            }
          };
        })
      );
      res.json(summaries);
    } catch (error) {
      console.error("Error fetching drivers summary:", error);
      res.status(500).json({ error: "Failed to fetch drivers summary" });
    }
  });

  // Driver reviews
  app.get("/api/admin/drivers/:driverId/reviews", async (req, res) => {
    try {
      const { driverId } = req.params;
      const reviews = await advancedDb.getDriverReviews(driverId);
      const avgRating = reviews.length > 0
        ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
        : 0;

      res.json({
        reviews,
        averageRating: avgRating.toFixed(2),
        totalReviews: reviews.length
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch driver reviews" });
    }
  });

  // ===================== RESTAURANT ROUTES =====================

  // Get restaurant details with financial data
  app.get("/api/admin/restaurants/:restaurantId/details", async (req, res) => {
    try {
      const { restaurantId } = req.params;

      const restaurant = await dbStorage.getRestaurant(restaurantId);
      if (!restaurant) {
        return res.status(404).json({ error: "Restaurant not found" });
      }

      const wallet = await advancedDb.getRestaurantWallet(restaurantId);
      const stats = await advancedDb.getRestaurantPerformanceStats(restaurantId);

      res.json({
        restaurant,
        wallet,
        stats
      });
    } catch (error) {
      console.error("Error fetching restaurant details:", error);
      res.status(500).json({ error: "Failed to fetch restaurant details" });
    }
  });

  // Get all restaurants with financial summary
  app.get("/api/admin/restaurants-summary", async (req, res) => {
    try {
      const restaurants = await dbStorage.getRestaurants();
      const summaries = await Promise.all(
        restaurants.map(async (restaurant) => {
          const stats = await advancedDb.getRestaurantPerformanceStats(restaurant.id);
          const wallet = await advancedDb.getRestaurantWallet(restaurant.id);
          return {
            ...restaurant,
            stats,
            wallet: {
              balance: wallet?.balance || 0,
              totalEarned: wallet?.totalEarned || 0,
              totalCommission: wallet?.totalCommission || 0
            }
          };
        })
      );
      res.json(summaries);
    } catch (error) {
      console.error("Error fetching restaurants summary:", error);
      res.status(500).json({ error: "Failed to fetch restaurants summary" });
    }
  });

  // ===================== WALLET ROUTES =====================

  // Driver wallet operations
  app.post("/api/drivers/:driverId/wallet/add-balance", async (req, res) => {
    try {
      const { driverId } = req.params;
      const { amount, description } = req.body;

      if (!amount || amount <= 0) {
        return res.status(400).json({ error: "Invalid amount" });
      }

      const updatedWallet = await advancedDb.addDriverWalletBalance(driverId, amount);
      res.json(updatedWallet);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Get driver wallet
  app.get("/api/drivers/:driverId/wallet", async (req, res) => {
    try {
      const { driverId } = req.params;
      const wallet = await advancedDb.getDriverWallet(driverId);

      if (!wallet) {
        return res.status(404).json({ error: "Wallet not found" });
      }

      res.json(wallet);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch wallet" });
    }
  });

  // ===================== WITHDRAWAL ROUTES =====================

  // Create withdrawal request
  app.post("/api/withdrawal-requests", async (req, res) => {
    try {
      const { entityType, entityId, amount, accountNumber, bankName, accountHolder, requestedBy } = req.body;

      if (!amount || amount <= 0) {
        return res.status(400).json({ error: "Invalid amount" });
      }

      const request = await advancedDb.createWithdrawalRequest({
        entityType,
        entityId,
        amount: amount.toString(),
        accountNumber,
        bankName,
        accountHolder,
        requestedBy,
        status: "pending"
      });

      res.status(201).json(request);
    } catch (error) {
      console.error("Error creating withdrawal request:", error);
      res.status(500).json({ error: "Failed to create withdrawal request" });
    }
  });

  // Approve withdrawal request
  app.post("/api/admin/withdrawals/:requestId/approve", async (req, res) => {
    try {
      const { requestId } = req.params;
      const { approvedBy } = req.body;

      const request = await advancedDb.approveWithdrawalRequest(requestId, approvedBy);
      
      // Update wallet balance
      if (request.entityType === 'driver') {
        await advancedDb.deductDriverWalletBalance(
          request.entityId,
          parseFloat(request.amount.toString())
        );
      }

      res.json(request);
    } catch (error: any) {
      console.error("Error approving withdrawal:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Reject withdrawal request
  app.post("/api/admin/withdrawals/:requestId/reject", async (req, res) => {
    try {
      const { requestId } = req.params;
      const { reason } = req.body;

      const request = await advancedDb.rejectWithdrawalRequest(requestId, reason);
      res.json(request);
    } catch (error) {
      res.status(500).json({ error: "Failed to reject withdrawal request" });
    }
  });

  // Get pending withdrawal requests
  app.get("/api/admin/withdrawals/pending", async (req, res) => {
    try {
      const requests = await advancedDb.getPendingWithdrawalRequests();
      res.json(requests);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch withdrawal requests" });
    }
  });

  // ===================== FINANCIAL REPORTS ROUTES =====================
  app.get("/api/admin/financial-reports", async (req, res) => {
    try {
      const { from, to, type } = req.query;
      res.json([
        {
          id: "1",
          period: "يناير 2026",
          totalRevenue: 1234567,
          totalExpenses: 988677,
          netProfit: 245890,
          commissionEarned: 123450,
          status: "published"
        }
      ]);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch financial reports" });
    }
  });

  app.get("/api/admin/transactions", async (req, res) => {
    try {
      res.json([
        {
          id: "tx_1",
          type: "commission",
          amount: 500,
          status: "completed",
          createdAt: new Date().toISOString()
        }
      ]);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch transactions" });
    }
  });

  // ===================== SECURITY ROUTES =====================
  app.get("/api/admin/security/settings", async (req, res) => {
    try {
      res.json({
        twoFactorEnabled: false,
        sessionTimeout: 30,
        passwordComplexity: "medium",
        lastAudit: "2026-01-08"
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch security settings" });
    }
  });

  app.get("/api/admin/security/logs", async (req, res) => {
    try {
      res.json([
        {
          id: "log_1",
          userName: "Admin",
          action: "دخول للنظام",
          ipAddress: "192.168.1.1",
          device: "Chrome / Windows",
          location: "صنعاء",
          status: "success",
          createdAt: new Date().toISOString()
        }
      ]);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch security logs" });
    }
  });

  // ===================== AUDIT LOG ROUTES =====================

  // Get audit logs
  app.get("/api/admin/audit-logs", async (req, res) => {
    try {
      const { userId, entityType, action, startDate, endDate } = req.query;

      const logs = await advancedDb.getAuditLogs({
        userId: userId as string,
        entityType: entityType as string,
        action: action as string,
        startDate: startDate ? new Date(startDate as string) : undefined,
        endDate: endDate ? new Date(endDate as string) : undefined
      });

      res.json(logs.slice(0, 100));
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch audit logs" });
    }
  });

  // Create audit log
  app.post("/api/audit-logs", async (req, res) => {
    try {
      const { action, entityType, entityId, userId, userType, description, changes } = req.body;

      const log = await advancedDb.createAuditLog({
        action,
        entityType,
        entityId,
        userId,
        userType,
        description,
        changes,
        status: "success"
      });

      res.json(log);
    } catch (error) {
      res.status(500).json({ error: "Failed to create audit log" });
    }
  });

  // ===================== COMMISSION ROUTES =====================

  // Get commission settings
  app.get("/api/admin/commission-settings", async (req, res) => {
    try {
      const defaultPercent = await advancedDb.getDefaultCommissionPercent();
      res.json({ defaultCommissionPercent: defaultPercent });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch commission settings" });
    }
  });

  // ===================== STATISTICS ROUTES =====================

  // Get driver performance over date range
  app.get("/api/admin/drivers/:driverId/performance", async (req, res) => {
    try {
      const { driverId } = req.params;
      const { startDate, endDate } = req.query;

      const stats = await advancedDb.getDriverPerformanceStats(
        driverId,
        startDate ? new Date(startDate as string) : undefined,
        endDate ? new Date(endDate as string) : undefined
      );

      res.json(stats);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch performance stats" });
    }
  });

  // Get restaurant performance over date range
  app.get("/api/admin/restaurants/:restaurantId/performance", async (req, res) => {
    try {
      const { restaurantId } = req.params;
      const { startDate, endDate } = req.query;

      const stats = await advancedDb.getRestaurantPerformanceStats(
        restaurantId,
        startDate ? new Date(startDate as string) : undefined,
        endDate ? new Date(endDate as string) : undefined
      );

      res.json(stats);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch performance stats" });
    }
  });

  // Get driver work sessions
  app.get("/api/admin/drivers/:driverId/work-sessions", async (req, res) => {
    try {
      const { driverId } = req.params;
      const { startDate, endDate } = req.query;

      const sessions = await advancedDb.getDriverWorkSessions(
        driverId,
        startDate ? new Date(startDate as string) : undefined,
        endDate ? new Date(endDate as string) : undefined
      );

      res.json(sessions);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch work sessions" });
    }
  });
}
