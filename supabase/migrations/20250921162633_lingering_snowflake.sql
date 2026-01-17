/*
  # إنشاء إعدادات الواجهة الافتراضية

  1. إعدادات التنقل
    - إعدادات عرض العناصر في الواجهة
  2. إعدادات التطبيق
    - إعدادات عامة للتطبيق
  3. إعدادات المتجر
    - أوقات العمل وحالة المتجر
*/

-- إدراج إعدادات الواجهة الافتراضية
INSERT INTO system_settings (key, value, category, description, is_active) VALUES
-- إعدادات التنقل
('show_categories', 'true', 'navigation', 'عرض تصنيفات المطاعم في الصفحة الرئيسية', true),
('show_search_bar', 'true', 'navigation', 'عرض شريط البحث في الصفحة الرئيسية', true),
('show_special_offers', 'true', 'navigation', 'عرض العروض الخاصة والتخفيضات', true),
('show_orders_page', 'true', 'navigation', 'عرض صفحة الطلبات في التنقل', true),
('show_track_orders_page', 'true', 'navigation', 'عرض صفحة تتبع الطلبات في التنقل', true),
('show_admin_panel', 'false', 'navigation', 'عرض لوحة التحكم الإدارية', true),
('show_delivery_app', 'false', 'navigation', 'عرض تطبيق التوصيل', true),
('show_cart_button', 'true', 'navigation', 'عرض زر السلة', true),

-- إعدادات عرض المطاعم
('show_ratings', 'true', 'display', 'عرض تقييمات المطاعم', true),
('show_delivery_time', 'true', 'display', 'عرض وقت التوصيل', true),
('show_minimum_order', 'true', 'display', 'عرض الحد الأدنى للطلب', true),
('show_restaurant_description', 'true', 'display', 'عرض وصف المطعم', true),

-- إعدادات التطبيق العامة
('app_name', 'السريع ون للتوصيل', 'general', 'اسم التطبيق الذي يظهر للمستخدمين', true),
('app_theme', '#f6863b', 'general', 'اللون الأساسي للتطبيق (hex color)', true),
('delivery_fee_default', '5', 'general', 'رسوم التوصيل الافتراضية (ريال)', true),
('minimum_order_default', '25', 'general', 'الحد الأدنى لقيمة الطلب (ريال)', true),

-- إعدادات المتجر
('opening_time', '08:00', 'store', 'وقت فتح المتجر (HH:MM)', true),
('closing_time', '23:00', 'store', 'وقت إغلاق المتجر (HH:MM)', true),
('store_status', 'مفتوح', 'store', 'حالة المتجر الحالية', true),

-- إعدادات الخدمات
('enable_location_services', 'true', 'services', 'تفعيل خدمات الموقع', true),

-- إعدادات السائق
('driver_show_earnings', 'true', 'driver', 'عرض الأرباح للسائق', true),
('driver_show_customer_info', 'true', 'driver', 'عرض معلومات العميل', true),
('driver_show_order_details', 'true', 'driver', 'عرض تفاصيل الطلب', true),
('driver_show_available_orders', 'true', 'driver', 'عرض الطلبات المتاحة', true),
('driver_auto_refresh', 'true', 'driver', 'التحديث التلقائي للطلبات', true),
('driver_show_status_toggle', 'true', 'driver', 'عرض مفتاح تغيير الحالة', true),
('driver_show_location_button', 'true', 'driver', 'عرض زر تحديث الموقع', true),
('driver_show_navigation_help', 'true', 'driver', 'عرض مساعدة التنقل', true),
('driver_notification_sound', 'true', 'driver', 'تفعيل صوت الإشعارات', true)

ON CONFLICT (key) DO UPDATE SET
  value = EXCLUDED.value,
  updated_at = NOW();