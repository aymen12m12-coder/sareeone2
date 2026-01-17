import express from "express";
import { storage } from "../storage";
import { insertUserSchema, insertUserAddressSchema, insertRatingSchema, type UserAddress } from "../../shared/schema";
import { randomUUID } from "crypto";

const router = express.Router();

// تسجيل عميل جديد أو تسجيل الدخول
router.post("/auth", async (req, res) => {
  try {
    const { phone, name } = req.body;

    if (!phone || !name) {
      return res.status(400).json({ error: "رقم الهاتف والاسم مطلوبان" });
    }

    // البحث عن العميل بالهاتف (نحتاج طريقة للبحث بالهاتف)
    // سنحتاج إلى تحديث الطريقة للبحث بالهاتف
    // للآن سننشئ مستخدم جديد في كل مرة أو نبحث بطريقة أخرى
    const userId = randomUUID();
    const userData = {
      username: phone, // استخدام رقم الهاتف كاسم المستخدم
      password: "default_password", // كلمة مرور افتراضية
      name,
      phone,
      email: null,
      address: null
    };

    let customer;
    try {
      // محاولة البحث عن المستخدم أولاً
      customer = await storage.getUserByUsername(phone);
      if (!customer) {
        // إنشاء عميل جديد
        customer = await storage.createUser(userData);
      }
    } catch (error) {
      // إنشاء عميل جديد في حالة عدم وجوده
      customer = await storage.createUser(userData);
    }

    res.json(customer);
  } catch (error) {
    console.error("خطأ في مصادقة العميل:", error);
    res.status(500).json({ error: "خطأ في الخادم" });
  }
});

// جلب ملف العميل
router.get("/:id/profile", async (req, res) => {
  try {
    const { id } = req.params;
    
    const customer = await storage.getUser(id);

    if (!customer) {
      return res.status(404).json({ error: "العميل غير موجود" });
    }

    res.json(customer);
  } catch (error) {
    console.error("خطأ في جلب ملف العميل:", error);
    res.status(500).json({ error: "خطأ في الخادم" });
  }
});

// تحديث ملف العميل
router.put("/:id/profile", async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const updatedCustomer = await storage.updateUser(id, updateData);

    if (!updatedCustomer) {
      return res.status(404).json({ error: "العميل غير موجود" });
    }

    res.json(updatedCustomer);
  } catch (error) {
    console.error("خطأ في تحديث ملف العميل:", error);
    res.status(500).json({ error: "خطأ في الخادم" });
  }
});

// جلب عناوين العميل
router.get("/:id/addresses", async (req, res) => {
  try {
    const { id } = req.params;
    
    const addresses = await storage.getUserAddresses(id);
    
    // ترتيب العناوين (الافتراضي أولاً، ثم حسب تاريخ الإنشاء)
    addresses.sort((a: UserAddress, b: UserAddress) => {
      if (a.isDefault && !b.isDefault) return -1;
      if (!a.isDefault && b.isDefault) return 1;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

    res.json(addresses);
  } catch (error) {
    console.error("خطأ في جلب عناوين العميل:", error);
    res.status(500).json({ error: "خطأ في الخادم" });
  }
});

// إضافة عنوان جديد
router.post("/:id/addresses", async (req, res) => {
  try {
    const { id } = req.params;
    const addressData = req.body;

    // التحقق من وجود العميل
    const customer = await storage.getUser(id);
    if (!customer) {
      return res.status(404).json({ error: "العميل غير موجود" });
    }

    // التحقق من صحة البيانات
    const validatedData = insertUserAddressSchema.omit({ id: true, userId: true, createdAt: true }).parse(addressData);

    const newAddress = await storage.createUserAddress(id, validatedData as any);

    res.json(newAddress);
  } catch (error) {
    console.error("خطأ في إضافة عنوان جديد:", error);
    if (error instanceof Error && error.name === 'ZodError') {
      res.status(400).json({ error: "بيانات العنوان غير صحيحة" });
    } else {
      res.status(500).json({ error: "خطأ في الخادم" });
    }
  }
});

// تحديث عنوان
router.put("/:customerId/addresses/:addressId", async (req, res) => {
  try {
    const { customerId, addressId } = req.params;
    const updateData = req.body;

    // التحقق من صحة البيانات
    const validatedData = insertUserAddressSchema.omit({ id: true, userId: true, createdAt: true }).partial().parse(updateData);

    const updatedAddress = await storage.updateUserAddress(addressId, customerId, validatedData);

    if (!updatedAddress) {
      return res.status(404).json({ error: "العنوان غير موجود أو لا يخص هذا العميل" });
    }

    res.json(updatedAddress);
  } catch (error) {
    console.error("خطأ في تحديث العنوان:", error);
    if (error instanceof Error && error.name === 'ZodError') {
      res.status(400).json({ error: "بيانات العنوان غير صحيحة" });
    } else {
      res.status(500).json({ error: "خطأ في الخادم" });
    }
  }
});

// حذف عنوان
router.delete("/:customerId/addresses/:addressId", async (req, res) => {
  try {
    const { customerId, addressId } = req.params;

    const success = await storage.deleteUserAddress(addressId, customerId);

    if (!success) {
      return res.status(404).json({ error: "العنوان غير موجود أو لا يخص هذا العميل" });
    }

    res.json({ success: true });
  } catch (error) {
    console.error("خطأ في حذف العنوان:", error);
    res.status(500).json({ error: "خطأ في الخادم" });
  }
});

// جلب طلبات العميل
router.get("/:id/orders", async (req, res) => {
  try {
    const { id } = req.params;
    const { page = 1, limit = 10 } = req.query;
    
    // جلب جميع الطلبات
    const allOrders = await storage.getOrders();
    
    // فلترة طلبات العميل
    const customerOrders = allOrders.filter(order => order.customerId === id);
    
    // ترتيب حسب التاريخ (الأحدث أولاً)
    customerOrders.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    
    // تطبيق الترقيم
    const startIndex = (Number(page) - 1) * Number(limit);
    const endIndex = startIndex + Number(limit);
    const paginatedOrders = customerOrders.slice(startIndex, endIndex);

    res.json(paginatedOrders);
  } catch (error) {
    console.error("خطأ في جلب طلبات العميل:", error);
    res.status(500).json({ error: "خطأ في الخادم" });
  }
});

// تقييم طلب
router.post("/orders/:orderId/review", async (req, res) => {
  try {
    const { orderId } = req.params;
    const { customerId, rating, comment } = req.body;

    // التحقق من وجود الطلب
    const order = await storage.getOrder(orderId);
    if (!order) {
      return res.status(404).json({ error: "الطلب غير موجود" });
    }

    // التحقق من أن العميل يملك هذا الطلب
    if (order.customerId !== customerId) {
      return res.status(403).json({ error: "غير مصرح لك بتقييم هذا الطلب" });
    }

    // التحقق من صحة بيانات التقييم
    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({ error: "التقييم يجب أن يكون بين 1 و 5" });
    }

    // الحصول على بيانات العميل
    const customer = await storage.getUser(customerId);
    if (!customer) {
      return res.status(404).json({ error: "العميل غير موجود" });
    }

    // إنشاء تقييم جديد
    const reviewData = {
      orderId,
      restaurantId: order.restaurantId,
      customerName: customer.name,
      customerPhone: customer.phone || "",
      rating: Number(rating),
      comment: comment || null,
      isApproved: false
    };

    const newReview = await storage.createRating(reviewData);

    res.json(newReview);
  } catch (error) {
    console.error("خطأ في إضافة التقييم:", error);
    res.status(500).json({ error: "خطأ في الخادم" });
  }
});

export { router as customerRoutes };