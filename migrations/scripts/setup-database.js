import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import * as dotenv from "dotenv";
import { 
  categories, restaurants, menuItems, drivers, specialOffers, uiSettings, adminUsers,
  adminSessions, orders, users, userAddresses
 } from "../../shared/schema";
import bcrypt from "bcrypt";
import { eq } from "drizzle-orm";

dotenv.config();

if (!process.env.DATABASE_URL) {
  console.error("❌ DATABASE_URL is not defined in environment variables");
  process.exit(1);
}

const sql = neon(process.env.DATABASE_URL);
const db = drizzle(sql);

async function setupInitialData() {
  try {
    console.log("🚀 Setting up initial data...");

    // التحقق من وجود بيانات مسبقاً وتخطي الإضافة إذا كانت موجودة
    const existingCategories = await db.select().from(categories);
    if (existingCategories.length > 0) {
      console.log("📂 Categories already exist, skipping...");
      return;
    }

    // Create categories
    console.log("📂 Creating categories...");
    const categoryData = [
      { name: "مطاعم", icon: "fas fa-utensils", isActive: true },
      { name: "مقاهي", icon: "fas fa-coffee", isActive: true },
      { name: "حلويات", icon: "fas fa-candy-cane", isActive: true },
      { name: "سوبرماركت", icon: "fas fa-shopping-cart", isActive: true },
      { name: "صيدليات", icon: "fas fa-pills", isActive: true },
    ];

    const createdCategories = await db.insert(categories).values(categoryData).returning();
    console.log(`✅ Created ${createdCategories.length} categories`);

    // Create restaurants
    console.log("🏪 Creating restaurants...");
    const restaurantData = [
      {
        name: "مطعم الوزيكو للعربكة",
        description: "مطعم يمني تقليدي متخصص في الأطباق الشعبية",
        image: "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=400",
        rating: "4.8",
        reviewCount: 4891,
        deliveryTime: "40-60 دقيقة",
        isOpen: true,
        minimumOrder: 25,
        deliveryFee: 5,
        categoryId: createdCategories[0].id,
        openingTime: "08:00",
        closingTime: "23:00",
        workingDays: "0,1,2,3,4,5,6",
        isTemporarilyClosed: false,
        temporaryCloseReason: null,
      },
      {
        name: "حلويات الشام",
        description: "أفضل الحلويات الشامية والعربية",
        image: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=400",
        rating: "4.6",
        reviewCount: 2341,
        deliveryTime: "30-45 دقيقة",
        isOpen: true,
        minimumOrder: 15,
        deliveryFee: 3,
        categoryId: createdCategories[2].id,
        openingTime: "08:00",
        closingTime: "23:00",
        workingDays: "0,1,2,3,4,5,6",
        isTemporarilyClosed: false,
        temporaryCloseReason: null,
      },
      {
        name: "مقهى العروبة",
        description: "مقهى شعبي بالطابع العربي الأصيل",
        image: "https://images.unsplash.com/photo-1442512595331-e89e73853f31?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=400",
        rating: "4.5",
        reviewCount: 1876,
        deliveryTime: "يفتح في 8:00 ص",
        isOpen: false,
        minimumOrder: 20,
        deliveryFee: 4,
        categoryId: createdCategories[1].id,
        openingTime: "08:00",
        closingTime: "23:00",
        workingDays: "0,1,2,3,4,5,6",
        isTemporarilyClosed: false,
        temporaryCloseReason: null,
      }
    ];

    const createdRestaurants = await db.insert(restaurants).values(restaurantData).returning();
    console.log(`✅ Created ${createdRestaurants.length} restaurants`);

    // Create menu items
    console.log("🍽️ Creating menu items...");
    const menuItemData = [
      {
        name: "عربكة بالقشطة والعسل",
        description: "حلوى يمنية تقليدية بالقشطة الطازجة والعسل الطبيعي",
        price: 55,
        image: "https://images.unsplash.com/photo-1551024506-0bccd828d307?ixlib=rb-4.0.3&auto=format&fit=crop&w=200&h=200",
        category: "وجبات رمضان",
        isAvailable: true,
        isSpecialOffer: false,
        originalPrice: null,
        restaurantId: createdRestaurants[0].id,
      },
      {
        name: "معصوب بالقشطة والعسل",
        description: "طبق يمني شعبي بالموز والقشطة والعسل",
        price: 55,
        image: "https://images.unsplash.com/photo-1565299507177-b0ac66763828?ixlib=rb-4.0.3&auto=format&fit=crop&w=200&h=200",
        category: "وجبات رمضان",
        isAvailable: true,
        isSpecialOffer: false,
        originalPrice: null,
        restaurantId: createdRestaurants[0].id,
      },
      {
        name: "مياه معدنية 750 مل",
        description: "مياه طبيعية معدنية عالية الجودة",
        price: 3,
        image: "https://images.unsplash.com/photo-1559839734-2b71ea197ec2?ixlib=rb-4.0.3&auto=format&fit=crop&w=200&h=200",
        category: "المشروبات",
        isAvailable: true,
        isSpecialOffer: false,
        originalPrice: null,
        restaurantId: createdRestaurants[0].id,
      },
      {
        name: "كومبو عربكة خاص",
        description: "عربكة + مطبق عادي + مشروب غازي",
        price: 55,
        originalPrice: 60,
        image: "https://images.unsplash.com/photo-1565299507177-b0ac66763828?ixlib=rb-4.0.3&auto=format&fit=crop&w=200&h=200",
        category: "العروض",
        isAvailable: true,
        isSpecialOffer: true,
        restaurantId: createdRestaurants[0].id,
      }
    ];

    const createdMenuItems = await db.insert(menuItems).values(menuItemData).returning();
    console.log(`✅ Created ${createdMenuItems.length} menu items`);

    // Create drivers
    console.log("🚗 Creating drivers...");
    const hashedPassword = await bcrypt.hash("password123", 10);
    const driverData = [
      {
        name: "أحمد محمد",
        phone: "+967771234567",
        password: hashedPassword,
        isAvailable: true,
        isActive: true,
        currentLocation: "صنعاء",
        earnings: 2500,
      },
      {
        name: "علي حسن",
        phone: "+967779876543",
        password: hashedPassword,
        isAvailable: true,
        isActive: true,
        currentLocation: "تعز",
        earnings: 3200,
      }
    ];

    const createdDrivers = await db.insert(drivers).values(driverData).returning();
    console.log(`✅ Created ${createdDrivers.length} drivers`);

    // Create special offers
    console.log("🎁 Creating special offers...");
    const offerData = [
      {
        title: "خصم 20% على الطلبات فوق 100 ريال",
        description: "احصل على خصم 20% عند طلب بقيمة 100 ريال أو أكثر",
        image: "https://images.unsplash.com/photo-1571091718767-18b5b1457add?w=400",
        discountPercent: 20,
        discountAmount: null,
        minimumOrder: 100,
        isActive: true,
        validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
      },
      {
        title: "توصيل مجاني",
        description: "توصيل مجاني للطلبات فوق 50 ريال",
        image: "https://images.unsplash.com/photo-1571091718767-18b5b1457add?w=400",
        discountPercent: null,
        discountAmount: 5,
        minimumOrder: 50,
        isActive: true,
        validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
      }
    ];

    const createdOffers = await db.insert(specialOffers).values(offerData).returning();
    console.log(`✅ Created ${createdOffers.length} special offers`);

    // Create UI settings
    console.log("⚙️ Creating UI settings...");
    const uiSettingsData = [
      { key: "app_name", value: "السريع ون للتوصيل", description: "اسم التطبيق" },
      { key: "app_logo", value: "/logo.png", description: "شعار التطبيق" },
      { key: "primary_color", value: "#f6863bff", description: "اللون الأساسي" },
      { key: "secondary_color", value: "#10B981", description: "اللون الثانوي" },
      { key: "delivery_fee", value: "5", description: "رسوم التوصيل الافتراضية" },
      { key: "minimum_order", value: "25", description: "الحد الأدنى للطلب" },
      { key: "contact_phone", value: "+967771234567", description: "رقم التواصل" },
      { key: "contact_email", value: "info@alsarie-one.com", description: "بريد التواصل" },
    ];

    const createdSettings = await db.insert(uiSettings).values(uiSettingsData).returning();
    console.log(`✅ Created ${createdSettings.length} UI settings`);

    // Create default admin
    console.log("👤 Creating default admin...");
    const adminPassword = process.env.DEFAULT_ADMIN_PASSWORD;
    
    if (!adminPassword) {
      console.error("❌ DEFAULT_ADMIN_PASSWORD environment variable is required for security");
      console.log("💡 Set a strong admin password using: DEFAULT_ADMIN_PASSWORD=your_secure_password");
      process.exit(1);
    }
    
    if (adminPassword.length < 8) {
      console.error("❌ Admin password must be at least 8 characters long");
      process.exit(1);
    }
    
    const hashedAdminPassword = await bcrypt.hash(adminPassword, 10);
    
    const adminData = {
      name: 'مدير النظام',
      email: 'admin@alsarie-one.com',
      password: hashedAdminPassword,
      userType: 'admin',
      isActive: true
    };

    const [createdAdmin] = await db.insert(adminUsers).values(adminData).returning();
    console.log(`✅ Created admin user: ${createdAdmin.email}`);

    console.log("🎉 Initial data setup completed successfully!");
    console.log("\n📋 Summary:");
    console.log(`   Categories: ${createdCategories.length}`);
    console.log(`   Restaurants: ${createdRestaurants.length}`);
    console.log(`   Menu Items: ${createdMenuItems.length}`);
    console.log(`   Drivers: ${createdDrivers.length}`);
    console.log(`   Special Offers: ${createdOffers.length}`);
    console.log(`   UI Settings: ${createdSettings.length}`);
    console.log(`   Admin Users: 1`);

  } catch (error) {
    console.error("❌ Error setting up initial data:", error);
    process.exit(1);
  }
}

setupInitialData();