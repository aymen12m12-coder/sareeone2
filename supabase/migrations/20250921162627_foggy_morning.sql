/*
  # إصلاح جدول السائقين

  1. تعديلات الجدول
    - إزالة الحقول غير المطلوبة (username, email, userType)
    - الاحتفاظ بالحقول الأساسية فقط
  2. الأمان
    - الاحتفاظ بحقل كلمة المرور للمصادقة
*/

-- إزالة الحقول غير المطلوبة من جدول السائقين
DO $$
BEGIN
  -- إزالة حقل username إذا كان موجوداً
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'drivers' AND column_name = 'username'
  ) THEN
    ALTER TABLE drivers DROP COLUMN username;
  END IF;
  
  -- إزالة حقل email إذا كان موجوداً
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'drivers' AND column_name = 'email'
  ) THEN
    ALTER TABLE drivers DROP COLUMN email;
  END IF;
  
  -- إزالة حقل user_type إذا كان موجوداً
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'drivers' AND column_name = 'user_type'
  ) THEN
    ALTER TABLE drivers DROP COLUMN user_type;
  END IF;
END $$;

-- التأكد من وجود حقل كلمة المرور
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'drivers' AND column_name = 'password'
  ) THEN
    ALTER TABLE drivers ADD COLUMN password TEXT NOT NULL DEFAULT 'default_password';
  END IF;
END $$;