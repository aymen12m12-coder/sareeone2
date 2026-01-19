import express from "express";
import { storage } from "../storage";
import { z } from "zod";

const router = express.Router();

// لوحة معلومات السائق مع تفاصيل الرصيد
router.get("/dashboard", async (req, res) => {
  try {
    const { driverId } = req.query;
    
    if (!driverId || typeof driverId !== 'string') {
      return res.status(400).json({ error: "معرف السائق مطلوب" });
    }

    // التحقق من وجود السائق
    const driver = await storage.getDriver(driverId);
    if (!driver) {
      return res.status(404).json({ error: "السائق غير موجود" });
    }

    // جلب جميع الطلبات وفلترتها
    const allOrders = await storage.getOrders();
    const driverOrders = allOrders.filter(order => order.driverId === driverId);
    
    // جلب معلومات الرصيد
    const driverBalance = await storage.getDriverBalance(driverId);
    const driverTransactions = await storage.getDriverTransactions(driverId);
    const driverCommissions = await storage.getDriverCommissions(driverId);
    
    // حساب الإحصائيات
    const today = new Date().toDateString();
    const todayOrders = driverOrders.filter(order => 
      order.createdAt.toDateString() === today
    );
    const completedToday = todayOrders.filter(order => order.status === "delivered");
    
    // حساب الأرباح من العمولات
    const commissionsToday = driverCommissions.filter(commission => 
      new Date(commission.createdAt).toDateString() === today
    );
    const todayEarnings = commissionsToday.reduce((sum, commission) => 
      sum + commission.commissionAmount, 0
    );
    
    const totalEarnings = driverCommissions.reduce((sum, commission) => 
      sum + commission.commissionAmount, 0
    );

    // الطلبات المتاحة (غير مُعيَّنة لسائق)
    const availableOrders = allOrders
      .filter(order => order.status === "confirmed" && !order.driverId)
      .slice(0, 10);

    // الطلبات الحالية للسائق
    const currentOrders = driverOrders.filter(order => 
      order.status === "picked_up" || order.status === "ready"
    );

    // الطلبات المعلقة التي تحتوي على عمولات
    const pendingOrders = allOrders.filter(order => 
      order.status === "delivered" && 
      order.driverId === driverId &&
      !order.commissionProcessed
    );

    res.json({
      stats: {
        todayOrders: todayOrders.length,
        todayEarnings,
        completedToday: completedToday.length,
        totalOrders: driverOrders.length,
        totalEarnings,
        availableBalance: driverBalance?.availableBalance || 0,
        withdrawnAmount: driverBalance?.withdrawnAmount || 0,
        totalCommissions: driverCommissions.length,
        averageRating: driver.averageRating || 4.5
      },
      availableOrders,
      currentOrders,
      pendingOrders,
      recentTransactions: driverTransactions.slice(0, 5),
      recentCommissions: driverCommissions.slice(0, 5)
    });
  } catch (error) {
    console.error("خطأ في لوحة معلومات السائق:", error);
    res.status(500).json({ error: "خطأ في الخادم" });
  }
});

// قبول طلب مع احتساب العمولة تلقائيًا
router.post("/orders/:id/accept", async (req, res) => {
  try {
    const { id } = req.params;
    const { driverId } = req.body;
    
    if (!driverId) {
      return res.status(400).json({ error: "معرف السائق مطلوب" });
    }

    // التحقق من وجود السائق
    const driver = await storage.getDriver(driverId);
    if (!driver) {
      return res.status(404).json({ error: "السائق غير موجود" });
    }

    // جلب الطلب
    const order = await storage.getOrder(id);
    if (!order) {
      return res.status(404).json({ error: "الطلب غير موجود" });
    }

    // التحقق من إمكانية قبول الطلب
    if (order.status !== "confirmed" || order.driverId) {
      return res.status(400).json({ error: "لا يمكن قبول هذا الطلب" });
    }

    // حساب العمولة
    const commissionRate = driver.commissionRate || 70; // نسبة العمولة الافتراضية
    const orderAmount = parseFloat(order.totalAmount) || 0;
    const commissionAmount = (orderAmount * commissionRate) / 100;

    // تحديث الطلب
    const updatedOrder = await storage.updateOrder(id, {
      driverId,
      status: "ready",
      driverCommissionRate: commissionRate,
      driverCommissionAmount: commissionAmount.toString(),
      commissionProcessed: false
    });

    res.json({ 
      success: true, 
      order: updatedOrder,
      commissionAmount,
      commissionRate 
    });
  } catch (error) {
    console.error("خطأ في قبول الطلب:", error);
    res.status(500).json({ error: "خطأ في الخادم" });
  }
});

// تحديث حالة الطلب مع معالجة العمولة عند التسليم
router.put("/orders/:id/status", async (req, res) => {
  try {
    const { id } = req.params;
    const { driverId, status, location } = req.body;
    
    if (!driverId || !status) {
      return res.status(400).json({ error: "معرف السائق والحالة مطلوبان" });
    }

    // جلب الطلب والتحقق من صلاحية السائق
    const order = await storage.getOrder(id);
    if (!order) {
      return res.status(404).json({ error: "الطلب غير موجود" });
    }

    if (order.driverId !== driverId) {
      return res.status(403).json({ error: "غير مصرح بتحديث هذا الطلب" });
    }

    // التحقق من الحالات المسموحة
    const allowedStatuses = ["ready", "picked_up", "delivered"];
    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({ error: "حالة غير صحيحة" });
    }

    // إعداد بيانات التحديث
    const updateData: any = { status };
    if (location) {
      updateData.currentLocation = location;
    }
    
    if (status === "delivered") {
      updateData.actualDeliveryTime = new Date();
      
      // إذا كان هناك عمولة ولم تتم معالجتها
      if (order.driverCommissionAmount && !order.commissionProcessed) {
        // إنشاء سجل العمولة
        const commission = await storage.createDriverCommission({
          driverId,
          orderId: id,
          orderAmount: parseFloat(order.totalAmount) || 0,
          commissionRate: order.driverCommissionRate || 70,
          commissionAmount: parseFloat(order.driverCommissionAmount) || 0,
          status: 'approved'
        });
        
        // تحديث الرصيد
        await storage.updateDriverBalance(driverId, {
          amount: parseFloat(order.driverCommissionAmount) || 0,
          type: 'commission'
        });
        
        // تحديث الطلب لتمييز أن العمولة تمت معالجتها
        updateData.commissionProcessed = true;
      }
    }

    const updatedOrder = await storage.updateOrder(id, updateData);
    res.json({ success: true, order: updatedOrder });
  } catch (error) {
    console.error("خطأ في تحديث حالة الطلب:", error);
    res.status(500).json({ error: "خطأ في الخادم" });
  }
});

// جلب تفاصيل طلب محدد مع معلومات العمولة
router.get("/orders/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { driverId } = req.query;
    
    if (!driverId || typeof driverId !== 'string') {
      return res.status(400).json({ error: "معرف السائق مطلوب" });
    }

    const order = await storage.getOrder(id);
    if (!order) {
      return res.status(404).json({ error: "الطلب غير موجود" });
    }

    // التحقق من صلاحية السائق
    if (order.driverId !== driverId) {
      return res.status(403).json({ error: "غير مصرح بعرض هذا الطلب" });
    }

    // جلب معلومات العمولة إن وجدت
    let commissionInfo = null;
    if (order.driverCommissionAmount) {
      commissionInfo = {
        rate: order.driverCommissionRate || 70,
        amount: order.driverCommissionAmount,
        processed: order.commissionProcessed || false
      };
    }

    res.json({
      ...order,
      commissionInfo
    });
  } catch (error) {
    console.error("خطأ في جلب تفاصيل الطلب:", error);
    res.status(500).json({ error: "خطأ في الخادم" });
  }
});

// جلب طلبات السائق مع تفاصيل العمولة
router.get("/orders", async (req, res) => {
  try {
    const { driverId, status } = req.query;
    
    if (!driverId || typeof driverId !== 'string') {
      return res.status(400).json({ error: "معرف السائق مطلوب" });
    }

    // جلب جميع الطلبات وفلترتها
    const allOrders = await storage.getOrders();
    let driverOrders = allOrders.filter(order => order.driverId === driverId);
    
    // فلترة حسب الحالة إذا تم توفيرها
    if (status && typeof status === 'string') {
      driverOrders = driverOrders.filter(order => order.status === status);
    }
    
    // ترتيب حسب تاريخ الإنشاء
    driverOrders.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    // إضافة معلومات العمولة لكل طلب
    const ordersWithCommissions = driverOrders.map(order => ({
      ...order,
      commission: order.driverCommissionAmount ? {
        rate: order.driverCommissionRate,
        amount: order.driverCommissionAmount,
        processed: order.commissionProcessed
      } : null
    }));

    res.json(ordersWithCommissions);
  } catch (error) {
    console.error("خطأ في جلب طلبات السائق:", error);
    res.status(500).json({ error: "خطأ في الخادم" });
  }
});

// جلب إحصائيات السائق مع تفاصيل الرصيد
router.get("/stats", async (req, res) => {
  try {
    const { driverId } = req.query;
    
    if (!driverId || typeof driverId !== 'string') {
      return res.status(400).json({ error: "معرف السائق مطلوب" });
    }

    // التحقق من وجود السائق
    const driver = await storage.getDriver(driverId);
    if (!driver) {
      return res.status(404).json({ error: "السائق غير موجود" });
    }

    // جلب معلومات الرصيد والعمولات
    const driverBalance = await storage.getDriverBalance(driverId);
    const driverCommissions = await storage.getDriverCommissions(driverId);
    const driverTransactions = await storage.getDriverTransactions(driverId);
    
    // جلب طلبات السائق
    const allOrders = await storage.getOrders();
    const driverOrders = allOrders.filter(order => order.driverId === driverId);
    const deliveredOrders = driverOrders.filter(order => order.status === "delivered");
    
    // حساب الإحصائيات
    const thisMonth = new Date();
    thisMonth.setDate(1);
    
    const monthlyCommissions = driverCommissions.filter(commission => 
      new Date(commission.createdAt) >= thisMonth
    );
    
    const totalEarnings = driverCommissions.reduce((sum, commission) => 
      sum + commission.commissionAmount, 0
    );
    
    const monthlyEarnings = monthlyCommissions.reduce((sum, commission) => 
      sum + commission.commissionAmount, 0
    );

    // المعاملات الحديثة
    const recentTransactions = driverTransactions.slice(0, 10);

    res.json({
      totalOrders: driverOrders.length,
      completedOrders: deliveredOrders.length,
      totalEarnings,
      monthlyOrders: monthlyCommissions.length,
      monthlyEarnings,
      availableBalance: driverBalance?.availableBalance || 0,
      withdrawnAmount: driverBalance?.withdrawnAmount || 0,
      totalBalance: driverBalance?.totalBalance || 0,
      pendingWithdrawal: driverBalance?.pendingAmount || 0,
      averageRating: driver.averageRating || 4.5,
      successRate: driverOrders.length > 0 ? 
        Math.round((deliveredOrders.length / driverOrders.length) * 100) : 0,
      commissionRate: driver.commissionRate || 70,
      recentTransactions
    });
  } catch (error) {
    console.error("خطأ في جلب إحصائيات السائق:", error);
    res.status(500).json({ error: "خطأ في الخادم" });
  }
});

// تحديث الملف الشخصي للسائق
router.put("/profile", async (req, res) => {
  try {
    const { driverId, ...updateData } = req.body;
    
    if (!driverId) {
      return res.status(400).json({ error: "معرف السائق مطلوب" });
    }

    // إزالة أي حقول غير مسموحة
    const allowedFields = ['name', 'phone', 'email', 'currentLocation', 'isAvailable'];
    const sanitizedData: any = {};
    for (const field of allowedFields) {
      if (updateData[field] !== undefined) {
        sanitizedData[field] = updateData[field];
      }
    }

    const updatedDriver = await storage.updateDriver(driverId, sanitizedData);
    
    if (!updatedDriver) {
      return res.status(404).json({ error: "السائق غير موجود" });
    }

    res.json({ success: true, driver: updatedDriver });
  } catch (error) {
    console.error("خطأ في تحديث الملف الشخصي:", error);
    res.status(500).json({ error: "خطأ في الخادم" });
  }
});

// جلب تفاصيل الرصيد والمعاملات
router.get("/balance", async (req, res) => {
  try {
    const { driverId } = req.query;
    
    if (!driverId || typeof driverId !== 'string') {
      return res.status(400).json({ error: "معرف السائق مطلوب" });
    }

    // التحقق من وجود السائق
    const driver = await storage.getDriver(driverId);
    if (!driver) {
      return res.status(404).json({ error: "السائق غير موجود" });
    }

    // جلب معلومات الرصيد والمعاملات
    const driverBalance = await storage.getDriverBalance(driverId);
    const driverTransactions = await storage.getDriverTransactions(driverId);
    const driverCommissions = await storage.getDriverCommissions(driverId);

    // حساب الإحصائيات
    const totalCommissionEarnings = driverCommissions.reduce((sum, commission) => 
      sum + commission.commissionAmount, 0
    );

    const thisMonth = new Date();
    thisMonth.setDate(1);
    const monthlyCommissions = driverCommissions.filter(commission => 
      new Date(commission.createdAt) >= thisMonth
    );
    const monthlyEarnings = monthlyCommissions.reduce((sum, commission) => 
      sum + commission.commissionAmount, 0
    );

    res.json({
      balance: driverBalance,
      totalEarnings: totalCommissionEarnings,
      monthlyEarnings,
      transactionCount: driverTransactions.length,
      commissionCount: driverCommissions.length,
      transactions: driverTransactions.slice(0, 20),
      commissions: driverCommissions.slice(0, 10)
    });
  } catch (error) {
    console.error("خطأ في جلب تفاصيل الرصيد:", error);
    res.status(500).json({ error: "خطأ في الخادم" });
  }
});

// جلب سجل العمولات
router.get("/commissions", async (req, res) => {
  try {
    const { driverId, startDate, endDate } = req.query;
    
    if (!driverId || typeof driverId !== 'string') {
      return res.status(400).json({ error: "معرف السائق مطلوب" });
    }

    // التحقق من وجود السائق
    const driver = await storage.getDriver(driverId);
    if (!driver) {
      return res.status(404).json({ error: "السائق غير موجود" });
    }

    // جلب العمولات
    let commissions = await storage.getDriverCommissions(driverId);
    
    // فلترة حسب التاريخ إذا تم توفيره
    if (startDate && typeof startDate === 'string') {
      const start = new Date(startDate);
      commissions = commissions.filter(commission => 
        new Date(commission.createdAt) >= start
      );
    }
    
    if (endDate && typeof endDate === 'string') {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      commissions = commissions.filter(commission => 
        new Date(commission.createdAt) <= end
      );
    }

    // ترتيب حسب التاريخ
    commissions.sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    // حساب المجموع
    const totalAmount = commissions.reduce((sum, commission) => 
      sum + commission.commissionAmount, 0
    );

    res.json({
      commissions,
      totalCount: commissions.length,
      totalAmount,
      averageAmount: commissions.length > 0 ? totalAmount / commissions.length : 0
    });
  } catch (error) {
    console.error("خطأ في جلب سجل العمولات:", error);
    res.status(500).json({ error: "خطأ في الخادم" });
  }
});

// جلب سجل المعاملات
router.get("/transactions", async (req, res) => {
  try {
    const { driverId, type, limit } = req.query;
    
    if (!driverId || typeof driverId !== 'string') {
      return res.status(400).json({ error: "معرف السائق مطلوب" });
    }

    // التحقق من وجود السائق
    const driver = await storage.getDriver(driverId);
    if (!driver) {
      return res.status(404).json({ error: "السائق غير موجود" });
    }

    // جلب المعاملات
    let transactions = await storage.getDriverTransactions(driverId);
    
    // فلترة حسب النوع إذا تم توفيره
    if (type && typeof type === 'string') {
      transactions = transactions.filter(transaction => transaction.type === type);
    }
    
    // تحديد الحد إذا تم توفيره
    const transactionLimit = limit ? parseInt(limit as string) : 50;
    
    // ترتيب حسب التاريخ
    transactions.sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    res.json({
      transactions: transactions.slice(0, transactionLimit),
      totalCount: transactions.length
    });
  } catch (error) {
    console.error("خطأ في جلب سجل المعاملات:", error);
    res.status(500).json({ error: "خطأ في الخادم" });
  }
});

// طلب سحب الرصيد
router.post("/withdraw", async (req, res) => {
  try {
    const { driverId, amount, notes } = req.body;
    
    if (!driverId || !amount) {
      return res.status(400).json({ error: "معرف السائق والمبلغ مطلوبان" });
    }

    // التحقق من وجود السائق
    const driver = await storage.getDriver(driverId);
    if (!driver) {
      return res.status(404).json({ error: "السائق غير موجود" });
    }

    // جلب الرصيد الحالي
    const driverBalance = await storage.getDriverBalance(driverId);
    if (!driverBalance || driverBalance.availableBalance < amount) {
      return res.status(400).json({ error: "الرصيد غير كافٍ" });
    }

    // إنشاء طلب السحب
    const withdrawal = await storage.createDriverWithdrawal({
      driverId,
      amount,
      status: 'pending',
      paymentMethod: 'wallet',
      notes
    });

    // تحديث الرصيد
    await storage.updateDriverBalance(driverId, {
      amount,
      type: 'withdrawal'
    });

    res.json({ 
      success: true, 
      withdrawal,
      newBalance: driverBalance.availableBalance - amount
    });
  } catch (error) {
    console.error("خطأ في طلب سحب الرصيد:", error);
    res.status(500).json({ error: "خطأ في الخادم" });
  }
});

// جلب طلبات السحب
router.get("/withdrawals", async (req, res) => {
  try {
    const { driverId, status } = req.query;
    
    if (!driverId || typeof driverId !== 'string') {
      return res.status(400).json({ error: "معرف السائق مطلوب" });
    }

    // التحقق من وجود السائق
    const driver = await storage.getDriver(driverId);
    if (!driver) {
      return res.status(404).json({ error: "السائق غير موجود" });
    }

    // جلب طلبات السحب
    const withdrawals = await storage.getDriverWithdrawals(driverId);
    
    // فلترة حسب الحالة إذا تم توفيرها
    let filteredWithdrawals = withdrawals;
    if (status && typeof status === 'string') {
      filteredWithdrawals = withdrawals.filter(w => w.status === status);
    }

    res.json({
      withdrawals: filteredWithdrawals,
      totalCount: filteredWithdrawals.length,
      totalAmount: filteredWithdrawals.reduce((sum, w) => sum + w.amount, 0)
    });
  } catch (error) {
    console.error("خطأ في جلب طلبات السحب:", error);
    res.status(500).json({ error: "خطأ في الخادم" });
  }
});

// تحديث موقع السائق الحالي
router.post("/location", async (req, res) => {
  try {
    const { driverId, location } = req.body;
    
    if (!driverId || !location) {
      return res.status(400).json({ error: "معرف السائق والموقع مطلوبان" });
    }

    // تحديث موقع السائق
    const updatedDriver = await storage.updateDriver(driverId, {
      currentLocation: location
    });

    if (!updatedDriver) {
      return res.status(404).json({ error: "السائق غير موجود" });
    }

    // يمكن هنا إرسال تحديث الموقع للعملاء إذا لزم الأمر

    res.json({ 
      success: true, 
      location: updatedDriver.currentLocation,
      updatedAt: updatedDriver.updatedAt 
    });
  } catch (error) {
    console.error("خطأ في تحديث الموقع:", error);
    res.status(500).json({ error: "خطأ في الخادم" });
  }
});

export default router;
