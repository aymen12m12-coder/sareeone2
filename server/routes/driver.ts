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
    const today = new Date();
    const todayStart = new Date(today.setHours(0, 0, 0, 0));
    
    const todayOrders = driverOrders.filter(order => 
      new Date(order.createdAt) >= todayStart
    );
    const completedToday = todayOrders.filter(order => order.status === "delivered");
    
    // حساب الأرباح من العمولات
    const commissionsToday = driverCommissions.filter(commission => 
      new Date(commission.createdAt) >= todayStart
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
      .slice(0, 10)
      .map(order => ({
        ...order,
        driverEarnings: (parseFloat(order.totalAmount) * (driver.commissionRate || 70) / 100).toString()
      }));

    // الطلبات الحالية للسائق
    const currentOrders = driverOrders.filter(order => 
      ["ready", "picked_up", "on_way"].includes(order.status)
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
        averageRating: driver.averageRating || 4.5,
        commissionRate: driver.commissionRate || 70
      },
      availableOrders,
      currentOrders: currentOrders.map(order => ({
        ...order,
        driverEarnings: order.driverCommissionAmount || 
          (parseFloat(order.totalAmount) * (order.driverCommissionRate || 70) / 100).toString()
      })),
      recentTransactions: driverTransactions.slice(0, 5),
      recentCommissions: driverCommissions.slice(0, 5),
      driver: {
        id: driver.id,
        name: driver.name,
        phone: driver.phone,
        isAvailable: driver.isAvailable,
        currentLocation: driver.currentLocation
      }
    });
  } catch (error) {
    console.error("خطأ في لوحة معلومات السائق:", error);
    res.status(500).json({ error: "خطأ في الخادم" });
  }
});

// قبول طلب (تعيين سائق) - مسار موحد
router.put("/orders/:id/assign-driver", async (req, res) => {
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

    // التحقق من حالة السائق
    if (!driver.isAvailable) {
      return res.status(400).json({ error: "السائق غير متاح حالياً" });
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
    const commissionRate = driver.commissionRate || 70;
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

    // تحديث حالة السائق لمشغول
    await storage.updateDriver(driverId, {
      isAvailable: false
    });

    res.json({ 
      success: true, 
      order: {
        ...updatedOrder,
        driverEarnings: commissionAmount.toString()
      },
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
    const allowedStatuses = ["ready", "picked_up", "on_way", "delivered"];
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
        const commissionAmount = parseFloat(order.driverCommissionAmount) || 0;
        
        // إنشاء سجل العمولة
        await storage.createDriverCommission({
          driverId,
          orderId: id,
          orderAmount: parseFloat(order.totalAmount) || 0,
          commissionRate: order.driverCommissionRate || 70,
          commissionAmount,
          status: 'approved'
        });
        
        // تحديث الرصيد
        await storage.updateDriverBalance(driverId, {
          amount: commissionAmount,
          type: 'commission'
        });
        
        // تحديث الطلب لتمييز أن العمولة تمت معالجتها
        updateData.commissionProcessed = true;
      }
      
      // تحديث حالة السائق لمتاح
      await storage.updateDriver(driverId, {
        isAvailable: true
      });
    }

    const updatedOrder = await storage.updateOrder(id, updateData);
    
    // إضافة driverEarnings للتوافق مع الواجهة
    const responseOrder = {
      ...updatedOrder,
      driverEarnings: updatedOrder.driverCommissionAmount || "0"
    };
    
    res.json({ success: true, order: responseOrder });
  } catch (error) {
    console.error("خطأ في تحديث حالة الطلب:", error);
    res.status(500).json({ error: "خطأ في الخادم" });
  }
});

// جلب تفاصيل طلب محدد
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

    res.json({
      ...order,
      driverEarnings: order.driverCommissionAmount || "0",
      commissionRate: order.driverCommissionRate || 70
    });
  } catch (error) {
    console.error("خطأ في جلب تفاصيل الطلب:", error);
    res.status(500).json({ error: "خطأ في الخادم" });
  }
});

// جلب طلبات السائق
router.get("/orders", async (req, res) => {
  try {
    const { driverId, status, type } = req.query;
    
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
    
    // فلترة حسب النوع
    if (type && typeof type === 'string') {
      switch(type) {
        case 'available':
          driverOrders = allOrders.filter(order => 
            order.status === "confirmed" && !order.driverId
          );
          break;
        case 'active':
          driverOrders = driverOrders.filter(order => 
            ["ready", "picked_up", "on_way"].includes(order.status)
          );
          break;
        case 'completed':
          driverOrders = driverOrders.filter(order => order.status === "delivered");
          break;
      }
    }
    
    // ترتيب حسب تاريخ الإنشاء
    driverOrders.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    // إضافة driverEarnings لكل طلب للتوافق مع الواجهة
    const ordersWithEarnings = driverOrders.map(order => ({
      ...order,
      driverEarnings: order.driverCommissionAmount || 
        (parseFloat(order.totalAmount) * (order.driverCommissionRate || 70) / 100).toString(),
      orderNumber: order.orderNumber || order.id.slice(-8)
    }));

    res.json(ordersWithEarnings);
  } catch (error) {
    console.error("خطأ في جلب طلبات السائق:", error);
    res.status(500).json({ error: "خطأ في الخادم" });
  }
});

// جلب إحصائيات السائق
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
    
    // جلب طلبات السائق
    const allOrders = await storage.getOrders();
    const driverOrders = allOrders.filter(order => order.driverId === driverId);
    const deliveredOrders = driverOrders.filter(order => order.status === "delivered");
    
    // حساب الإحصائيات
    const today = new Date();
    const todayStart = new Date(today.setHours(0, 0, 0, 0));
    
    const todayOrders = driverOrders.filter(order => 
      new Date(order.createdAt) >= todayStart
    );
    
    const commissionsToday = driverCommissions.filter(commission => 
      new Date(commission.createdAt) >= todayStart
    );
    
    const totalEarnings = driverCommissions.reduce((sum, commission) => 
      sum + commission.commissionAmount, 0
    );
    
    const todayEarnings = commissionsToday.reduce((sum, commission) => 
      sum + commission.commissionAmount, 0
    );

    res.json({
      todayOrders: todayOrders.length,
      todayEarnings,
      totalOrders: driverOrders.length,
      totalEarnings,
      completedOrders: deliveredOrders.length,
      availableBalance: driverBalance?.availableBalance || 0,
      withdrawnAmount: driverBalance?.withdrawnAmount || 0,
      totalBalance: driverBalance?.totalBalance || 0,
      successRate: driverOrders.length > 0 ? 
        Math.round((deliveredOrders.length / driverOrders.length) * 100) : 0,
      commissionRate: driver.commissionRate || 70,
      averageRating: driver.averageRating || 4.5
    });
  } catch (error) {
    console.error("خطأ في جلب إحصائيات السائق:", error);
    res.status(500).json({ error: "خطأ في الخادم" });
  }
});

// جلب تفاصيل الرصيد
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

    const today = new Date();
    const todayStart = new Date(today.setHours(0, 0, 0, 0));
    
    const monthlyCommissions = driverCommissions.filter(commission => {
      const commissionDate = new Date(commission.createdAt);
      return commissionDate.getMonth() === today.getMonth() && 
             commissionDate.getFullYear() === today.getFullYear();
    });
    
    const monthlyEarnings = monthlyCommissions.reduce((sum, commission) => 
      sum + commission.commissionAmount, 0
    );

    res.json({
      balance: driverBalance || {
        availableBalance: 0,
        withdrawnAmount: 0,
        totalBalance: 0,
        pendingAmount: 0
      },
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

// تحديث موقع السائق
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

    res.json({ 
      success: true, 
      location: updatedDriver.currentLocation,
      updatedAt: new Date()
    });
  } catch (error) {
    console.error("خطأ في تحديث الموقع:", error);
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
      paymentMethod: 'bank_transfer',
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

export default router;
