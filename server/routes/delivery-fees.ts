/**
 * مسارات API لرسوم التوصيل
 * Delivery Fee API Routes
 */

import express from "express";
import { storage } from "../storage";
import { calculateDeliveryFee, calculateDistance, estimateDeliveryTime } from "../services/deliveryFeeService";
import { z } from "zod";

const router = express.Router();

// حساب رسوم التوصيل
router.post("/calculate", async (req, res) => {
  try {
    const { customerLat, customerLng, restaurantId, orderSubtotal } = req.body;

    if (!customerLat || !customerLng || !restaurantId) {
      return res.status(400).json({
        error: "بيانات ناقصة",
        details: "يجب توفير إحداثيات العميل ومعرف المطعم"
      });
    }

    const result = await calculateDeliveryFee(
      { lat: parseFloat(customerLat), lng: parseFloat(customerLng) },
      restaurantId,
      parseFloat(orderSubtotal || '0')
    );

    res.json({
      success: true,
      ...result
    });
  } catch (error: any) {
    console.error('خطأ في حساب رسوم التوصيل:', error);
    res.status(500).json({ error: error.message || "خطأ في الخادم" });
  }
});

// حساب المسافة بين نقطتين
router.post("/distance", async (req, res) => {
  try {
    const { fromLat, fromLng, toLat, toLng } = req.body;

    if (!fromLat || !fromLng || !toLat || !toLng) {
      return res.status(400).json({
        error: "بيانات ناقصة",
        details: "يجب توفير إحداثيات النقطتين"
      });
    }

    const distance = calculateDistance(
      { lat: parseFloat(fromLat), lng: parseFloat(fromLng) },
      { lat: parseFloat(toLat), lng: parseFloat(toLng) }
    );

    const estimatedTime = estimateDeliveryTime(distance);

    res.json({
      success: true,
      distance,
      unit: 'km',
      estimatedTime
    });
  } catch (error: any) {
    console.error('خطأ في حساب المسافة:', error);
    res.status(500).json({ error: error.message || "خطأ في الخادم" });
  }
});

// جلب إعدادات رسوم التوصيل
router.get("/settings", async (req, res) => {
  try {
    const { restaurantId } = req.query;
    const settings = await storage.getDeliveryFeeSettings(restaurantId as string);
    
    if (!settings) {
      // إرجاع الإعدادات الافتراضية
      return res.json({
        type: 'per_km',
        baseFee: '5',
        perKmFee: '2',
        minFee: '3',
        maxFee: '50',
        freeDeliveryThreshold: '0',
        isDefault: true
      });
    }

    res.json(settings);
  } catch (error) {
    console.error('خطأ في جلب إعدادات رسوم التوصيل:', error);
    res.status(500).json({ error: "خطأ في الخادم" });
  }
});

// إنشاء أو تحديث إعدادات رسوم التوصيل (للمدير)
router.post("/settings", async (req, res) => {
  try {
    const settingsSchema = z.object({
      type: z.enum(['fixed', 'per_km', 'zone_based', 'restaurant_custom']),
      baseFee: z.string().optional(),
      perKmFee: z.string().optional(),
      minFee: z.string().optional(),
      maxFee: z.string().optional(),
      freeDeliveryThreshold: z.string().optional(),
      restaurantId: z.string().optional()
    });

    const validatedData = settingsSchema.parse(req.body);
    
    // التحقق من وجود إعدادات سابقة
    const existing = await storage.getDeliveryFeeSettings(validatedData.restaurantId);
    
    if (existing) {
      const updated = await storage.updateDeliveryFeeSettings(existing.id, validatedData);
      return res.json({ success: true, settings: updated });
    }

    const newSettings = await storage.createDeliveryFeeSettings(validatedData);
    res.status(201).json({ success: true, settings: newSettings });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: "بيانات غير صحيحة",
        details: error.errors
      });
    }
    console.error('خطأ في حفظ إعدادات رسوم التوصيل:', error);
    res.status(500).json({ error: "خطأ في الخادم" });
  }
});

// جلب مناطق التوصيل
router.get("/zones", async (req, res) => {
  try {
    const zones = await storage.getDeliveryZones();
    res.json(zones);
  } catch (error) {
    console.error('خطأ في جلب مناطق التوصيل:', error);
    res.status(500).json({ error: "خطأ في الخادم" });
  }
});

// إضافة منطقة توصيل جديدة
router.post("/zones", async (req, res) => {
  try {
    const zoneSchema = z.object({
      name: z.string().min(1, "اسم المنطقة مطلوب"),
      description: z.string().optional(),
      minDistance: z.string().optional(),
      maxDistance: z.string(),
      deliveryFee: z.string(),
      estimatedTime: z.string().optional()
    });

    const validatedData = zoneSchema.parse(req.body);
    const newZone = await storage.createDeliveryZone(validatedData);
    
    res.status(201).json({ success: true, zone: newZone });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: "بيانات غير صحيحة",
        details: error.errors
      });
    }
    console.error('خطأ في إضافة منطقة التوصيل:', error);
    res.status(500).json({ error: "خطأ في الخادم" });
  }
});

// تحديث منطقة توصيل
router.put("/zones/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const updated = await storage.updateDeliveryZone(id, req.body);
    
    if (!updated) {
      return res.status(404).json({ error: "المنطقة غير موجودة" });
    }

    res.json({ success: true, zone: updated });
  } catch (error) {
    console.error('خطأ في تحديث منطقة التوصيل:', error);
    res.status(500).json({ error: "خطأ في الخادم" });
  }
});

// حذف منطقة توصيل
router.delete("/zones/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await storage.deleteDeliveryZone(id);
    
    if (!deleted) {
      return res.status(404).json({ error: "المنطقة غير موجودة" });
    }

    res.json({ success: true, message: "تم حذف المنطقة بنجاح" });
  } catch (error) {
    console.error('خطأ في حذف منطقة التوصيل:', error);
    res.status(500).json({ error: "خطأ في الخادم" });
  }
});

export default router;
