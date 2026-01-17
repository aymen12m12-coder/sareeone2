/**
 * مسارات API لحسابات المطاعم
 * Restaurant Accounts API Routes
 */

import express from "express";
import { storage } from "../storage";
import { 
  getRestaurantStats, 
  processOrderRevenue, 
  processRestaurantWithdrawal,
  updateDailyStats 
} from "../services/restaurantAccountService";
import { z } from "zod";

const router = express.Router();

// جلب حساب المطعم
router.get("/:restaurantId", async (req, res) => {
  try {
    const { restaurantId } = req.params;
    
    const account = await storage.getRestaurantAccount(restaurantId);
    
    if (!account) {
      // إنشاء حساب جديد إذا لم يكن موجوداً
      const restaurant = await storage.getRestaurant(restaurantId);
      if (!restaurant) {
        return res.status(404).json({ error: "المطعم غير موجود" });
      }

      const newAccount = await storage.createRestaurantAccount({
        restaurantId,
        ownerName: restaurant.name,
        ownerPhone: restaurant.phone || ''
      });

      return res.json(newAccount);
    }

    res.json(account);
  } catch (error) {
    console.error('خطأ في جلب حساب المطعم:', error);
    res.status(500).json({ error: "خطأ في الخادم" });
  }
});

// جلب إحصائيات المطعم
router.get("/:restaurantId/stats", async (req, res) => {
  try {
    const { restaurantId } = req.params;
    const { period } = req.query;
    
    const stats = await getRestaurantStats(
      restaurantId, 
      period as 'today' | 'week' | 'month' | 'all'
    );

    res.json(stats);
  } catch (error) {
    console.error('خطأ في جلب إحصائيات المطعم:', error);
    res.status(500).json({ error: "خطأ في الخادم" });
  }
});

// تحديث بيانات حساب المطعم
router.put("/:restaurantId", async (req, res) => {
  try {
    const { restaurantId } = req.params;
    
    const accountSchema = z.object({
      ownerName: z.string().optional(),
      ownerPhone: z.string().optional(),
      ownerEmail: z.string().email().optional(),
      bankName: z.string().optional(),
      bankAccountNumber: z.string().optional(),
      bankAccountName: z.string().optional(),
      commissionRate: z.string().optional()
    });

    const validatedData = accountSchema.parse(req.body);
    
    const updated = await storage.updateRestaurantAccount(restaurantId, validatedData);
    
    if (!updated) {
      return res.status(404).json({ error: "حساب المطعم غير موجود" });
    }

    res.json({ success: true, account: updated });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: "بيانات غير صحيحة",
        details: error.errors
      });
    }
    console.error('خطأ في تحديث حساب المطعم:', error);
    res.status(500).json({ error: "خطأ في الخادم" });
  }
});

// جلب معاملات المطعم
router.get("/:restaurantId/transactions", async (req, res) => {
  try {
    const { restaurantId } = req.params;
    const { type, limit, offset } = req.query;
    
    let transactions = await storage.getRestaurantTransactions(restaurantId);
    
    // فلترة حسب النوع
    if (type && typeof type === 'string') {
      transactions = transactions.filter(t => t.type === type);
    }
    
    // الحد والإزاحة
    const limitNum = parseInt(limit as string) || 50;
    const offsetNum = parseInt(offset as string) || 0;
    
    const paginatedTransactions = transactions.slice(offsetNum, offsetNum + limitNum);

    res.json({
      transactions: paginatedTransactions,
      total: transactions.length,
      limit: limitNum,
      offset: offsetNum
    });
  } catch (error) {
    console.error('خطأ في جلب معاملات المطعم:', error);
    res.status(500).json({ error: "خطأ في الخادم" });
  }
});

// طلب سحب رصيد
router.post("/:restaurantId/withdraw", async (req, res) => {
  try {
    const { restaurantId } = req.params;
    const { amount, notes } = req.body;

    if (!amount || parseFloat(amount) <= 0) {
      return res.status(400).json({ error: "المبلغ يجب أن يكون أكبر من صفر" });
    }

    const result = await processRestaurantWithdrawal(
      restaurantId,
      parseFloat(amount),
      notes
    );

    if (!result.success) {
      return res.status(400).json({ error: result.message });
    }

    res.json(result);
  } catch (error) {
    console.error('خطأ في طلب السحب:', error);
    res.status(500).json({ error: "خطأ في الخادم" });
  }
});

// جلب طلبات السحب
router.get("/:restaurantId/withdrawals", async (req, res) => {
  try {
    const { restaurantId } = req.params;
    const { status } = req.query;
    
    let withdrawals = await storage.getRestaurantWithdrawals(restaurantId);
    
    if (status && typeof status === 'string') {
      withdrawals = withdrawals.filter(w => w.status === status);
    }

    res.json({
      withdrawals,
      total: withdrawals.length
    });
  } catch (error) {
    console.error('خطأ في جلب طلبات السحب:', error);
    res.status(500).json({ error: "خطأ في الخادم" });
  }
});

// جلب الإحصائيات اليومية
router.get("/:restaurantId/daily-stats", async (req, res) => {
  try {
    const { restaurantId } = req.params;
    const { startDate, endDate } = req.query;
    
    let start: Date | undefined;
    let end: Date | undefined;
    
    if (startDate) {
      start = new Date(startDate as string);
    }
    if (endDate) {
      end = new Date(endDate as string);
    }
    
    const stats = await storage.getRestaurantDailyStats(restaurantId, start, end);

    res.json(stats);
  } catch (error) {
    console.error('خطأ في جلب الإحصائيات اليومية:', error);
    res.status(500).json({ error: "خطأ في الخادم" });
  }
});

// تحديث الإحصائيات اليومية (يمكن استدعاؤها من cron job)
router.post("/:restaurantId/update-daily-stats", async (req, res) => {
  try {
    const { restaurantId } = req.params;
    
    await updateDailyStats(restaurantId);

    res.json({ success: true, message: "تم تحديث الإحصائيات اليومية" });
  } catch (error) {
    console.error('خطأ في تحديث الإحصائيات اليومية:', error);
    res.status(500).json({ error: "خطأ في الخادم" });
  }
});

// ==================== مسارات الإدارة ====================

// جلب جميع حسابات المطاعم (للمدير)
router.get("/", async (req, res) => {
  try {
    const restaurants = await storage.getRestaurants();
    const accountsPromises = restaurants.map(async (restaurant) => {
      const account = await storage.getRestaurantAccount(restaurant.id);
      return {
        restaurant: {
          id: restaurant.id,
          name: restaurant.name,
          image: restaurant.image,
          isActive: restaurant.isActive
        },
        account: account || {
          totalOrders: 0,
          totalRevenue: '0',
          availableBalance: '0',
          pendingAmount: '0'
        }
      };
    });

    const accounts = await Promise.all(accountsPromises);

    res.json(accounts);
  } catch (error) {
    console.error('خطأ في جلب حسابات المطاعم:', error);
    res.status(500).json({ error: "خطأ في الخادم" });
  }
});

// معالجة طلب سحب (موافقة/رفض) - للمدير
router.put("/withdrawals/:withdrawalId", async (req, res) => {
  try {
    const { withdrawalId } = req.params;
    const { status, adminNotes, processedBy } = req.body;

    if (!['approved', 'rejected', 'completed'].includes(status)) {
      return res.status(400).json({ error: "حالة غير صحيحة" });
    }

    const updated = await storage.updateRestaurantWithdrawal(withdrawalId, {
      status,
      notes: adminNotes,
      processedBy,
      processedAt: new Date()
    });

    if (!updated) {
      return res.status(404).json({ error: "طلب السحب غير موجود" });
    }

    // إذا تم الموافقة أو الإكمال، تحديث رصيد المطعم
    if (status === 'completed' && updated.restaurantId) {
      const account = await storage.getRestaurantAccount(updated.restaurantId);
      if (account) {
        const pendingAmount = parseFloat(account.pendingAmount || '0');
        const paidAmount = parseFloat(account.paidAmount || '0');
        const withdrawAmount = parseFloat(updated.amount || '0');

        await storage.updateRestaurantAccount(updated.restaurantId, {
          pendingAmount: String(Math.max(0, pendingAmount - withdrawAmount)),
          paidAmount: String(paidAmount + withdrawAmount)
        });

        // إنشاء سجل معاملة
        await storage.createRestaurantTransaction({
          restaurantId: updated.restaurantId,
          type: 'withdrawal_completed',
          amount: String(-withdrawAmount),
          balanceBefore: account.availableBalance || '0',
          balanceAfter: account.availableBalance || '0',
          description: `تم إتمام طلب السحب رقم ${withdrawalId}`
        });
      }
    }

    res.json({ success: true, withdrawal: updated });
  } catch (error) {
    console.error('خطأ في معالجة طلب السحب:', error);
    res.status(500).json({ error: "خطأ في الخادم" });
  }
});

export default router;
