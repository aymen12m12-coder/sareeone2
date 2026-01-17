/**
 * خدمة حساب رسوم التوصيل
 * Delivery Fee Calculation Service
 * 
 * تدعم طرق متعددة لحساب رسوم التوصيل:
 * 1. رسوم ثابتة (fixed)
 * 2. حسب المسافة (per_km)
 * 3. حسب المناطق (zone_based)
 * 4. إعدادات المطعم الخاصة (restaurant_custom)
 */

import { storage } from "../storage";

// ثوابت افتراضية
const DEFAULT_BASE_FEE = 5; // رسوم أساسية
const DEFAULT_PER_KM_FEE = 2; // رسوم لكل كيلومتر
const DEFAULT_MIN_FEE = 3; // الحد الأدنى
const DEFAULT_MAX_FEE = 50; // الحد الأقصى
const EARTH_RADIUS_KM = 6371; // نصف قطر الأرض بالكيلومتر

export interface DeliveryLocation {
  lat: number;
  lng: number;
}

export interface DeliveryFeeResult {
  fee: number;
  distance: number;
  estimatedTime: string;
  feeBreakdown: {
    baseFee: number;
    distanceFee: number;
    totalBeforeLimit: number;
  };
  isFreeDelivery: boolean;
  freeDeliveryReason?: string;
}

export interface DeliveryFeeSettings {
  type: 'fixed' | 'per_km' | 'zone_based' | 'restaurant_custom';
  baseFee: number;
  perKmFee: number;
  minFee: number;
  maxFee: number;
  freeDeliveryThreshold: number;
}

/**
 * حساب المسافة بين نقطتين باستخدام صيغة Haversine
 * Calculate distance between two points using Haversine formula
 */
export function calculateDistance(
  point1: DeliveryLocation,
  point2: DeliveryLocation
): number {
  const lat1Rad = toRadians(point1.lat);
  const lat2Rad = toRadians(point2.lat);
  const deltaLat = toRadians(point2.lat - point1.lat);
  const deltaLng = toRadians(point2.lng - point1.lng);

  const a = 
    Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
    Math.cos(lat1Rad) * Math.cos(lat2Rad) *
    Math.sin(deltaLng / 2) * Math.sin(deltaLng / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  
  const distance = EARTH_RADIUS_KM * c;
  
  // تقريب إلى رقمين عشريين
  return Math.round(distance * 100) / 100;
}

function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180);
}

/**
 * تقدير وقت التوصيل بناءً على المسافة
 * Estimate delivery time based on distance
 */
export function estimateDeliveryTime(distanceKm: number): string {
  // متوسط سرعة التوصيل: 30 كم/ساعة في المدينة
  const avgSpeedKmH = 30;
  // وقت التحضير المتوسط: 15 دقيقة
  const prepTimeMinutes = 15;
  
  const travelTimeMinutes = (distanceKm / avgSpeedKmH) * 60;
  const totalTimeMinutes = Math.ceil(prepTimeMinutes + travelTimeMinutes);
  
  // إضافة هامش زمني
  const minTime = totalTimeMinutes;
  const maxTime = Math.ceil(totalTimeMinutes * 1.3); // +30% هامش
  
  if (maxTime <= 30) {
    return `${minTime}-${maxTime} دقيقة`;
  } else if (maxTime <= 60) {
    return `${minTime}-${maxTime} دقيقة`;
  } else {
    const minHours = Math.floor(minTime / 60);
    const maxHours = Math.ceil(maxTime / 60);
    if (minHours === maxHours) {
      return `حوالي ${minHours} ساعة`;
    }
    return `${minHours}-${maxHours} ساعة`;
  }
}

/**
 * حساب رسوم التوصيل الكاملة
 * Calculate complete delivery fee
 */
export async function calculateDeliveryFee(
  customerLocation: DeliveryLocation,
  restaurantId: string,
  orderSubtotal: number
): Promise<DeliveryFeeResult> {
  // جلب بيانات المطعم
  const restaurant = await storage.getRestaurant(restaurantId);
  
  if (!restaurant) {
    throw new Error('المطعم غير موجود');
  }

  // جلب إعدادات رسوم التوصيل
  const feeSettings = await getDeliveryFeeSettings(restaurantId);
  
  // موقع المطعم
  const restaurantLocation: DeliveryLocation = {
    lat: parseFloat(restaurant.latitude || '0'),
    lng: parseFloat(restaurant.longitude || '0')
  };

  // التحقق من وجود إحداثيات المطعم
  if (restaurantLocation.lat === 0 && restaurantLocation.lng === 0) {
    // استخدام رسوم ثابتة إذا لم تكن هناك إحداثيات
    return {
      fee: parseFloat(restaurant.deliveryFee || String(DEFAULT_BASE_FEE)),
      distance: 0,
      estimatedTime: restaurant.deliveryTime || '30-45 دقيقة',
      feeBreakdown: {
        baseFee: parseFloat(restaurant.deliveryFee || String(DEFAULT_BASE_FEE)),
        distanceFee: 0,
        totalBeforeLimit: parseFloat(restaurant.deliveryFee || String(DEFAULT_BASE_FEE))
      },
      isFreeDelivery: false
    };
  }

  // حساب المسافة
  const distance = calculateDistance(customerLocation, restaurantLocation);
  
  // تقدير وقت التوصيل
  const estimatedTime = estimateDeliveryTime(distance);

  // حساب الرسوم حسب النوع
  let fee = 0;
  let baseFee = feeSettings.baseFee;
  let distanceFee = 0;

  switch (feeSettings.type) {
    case 'fixed':
      fee = baseFee;
      break;

    case 'per_km':
      distanceFee = distance * feeSettings.perKmFee;
      fee = baseFee + distanceFee;
      break;

    case 'zone_based':
      const zoneFee = await getZoneBasedFee(distance);
      fee = zoneFee;
      baseFee = zoneFee;
      break;

    case 'restaurant_custom':
      // استخدام رسوم المطعم المخصصة
      fee = parseFloat(restaurant.deliveryFee || String(DEFAULT_BASE_FEE));
      baseFee = fee;
      break;

    default:
      // افتراضي: حسب المسافة
      distanceFee = distance * DEFAULT_PER_KM_FEE;
      fee = DEFAULT_BASE_FEE + distanceFee;
  }

  const totalBeforeLimit = fee;

  // تطبيق الحد الأدنى والأقصى
  fee = Math.max(feeSettings.minFee, Math.min(feeSettings.maxFee, fee));
  
  // تقريب الرسوم
  fee = Math.round(fee * 100) / 100;

  // التحقق من التوصيل المجاني
  let isFreeDelivery = false;
  let freeDeliveryReason: string | undefined;

  if (feeSettings.freeDeliveryThreshold > 0 && orderSubtotal >= feeSettings.freeDeliveryThreshold) {
    isFreeDelivery = true;
    freeDeliveryReason = `توصيل مجاني للطلبات فوق ${feeSettings.freeDeliveryThreshold} ريال`;
    fee = 0;
  }

  return {
    fee,
    distance,
    estimatedTime,
    feeBreakdown: {
      baseFee,
      distanceFee,
      totalBeforeLimit
    },
    isFreeDelivery,
    freeDeliveryReason
  };
}

/**
 * جلب إعدادات رسوم التوصيل
 */
async function getDeliveryFeeSettings(restaurantId?: string): Promise<DeliveryFeeSettings> {
  try {
    // محاولة جلب إعدادات المطعم الخاصة أولاً
    if (restaurantId) {
      const restaurantSettings = await storage.getDeliveryFeeSettings(restaurantId);
      if (restaurantSettings) {
        return {
          type: restaurantSettings.type as DeliveryFeeSettings['type'],
          baseFee: parseFloat(restaurantSettings.baseFee || '0'),
          perKmFee: parseFloat(restaurantSettings.perKmFee || '0'),
          minFee: parseFloat(restaurantSettings.minFee || '0'),
          maxFee: parseFloat(restaurantSettings.maxFee || '100'),
          freeDeliveryThreshold: parseFloat(restaurantSettings.freeDeliveryThreshold || '0')
        };
      }
    }

    // جلب الإعدادات العامة
    const globalSettings = await storage.getDeliveryFeeSettings();
    if (globalSettings) {
      return {
        type: globalSettings.type as DeliveryFeeSettings['type'],
        baseFee: parseFloat(globalSettings.baseFee || '0'),
        perKmFee: parseFloat(globalSettings.perKmFee || '0'),
        minFee: parseFloat(globalSettings.minFee || '0'),
        maxFee: parseFloat(globalSettings.maxFee || '100'),
        freeDeliveryThreshold: parseFloat(globalSettings.freeDeliveryThreshold || '0')
      };
    }
  } catch (error) {
    console.error('Error fetching delivery fee settings:', error);
  }

  // إعدادات افتراضية
  return {
    type: 'per_km',
    baseFee: DEFAULT_BASE_FEE,
    perKmFee: DEFAULT_PER_KM_FEE,
    minFee: DEFAULT_MIN_FEE,
    maxFee: DEFAULT_MAX_FEE,
    freeDeliveryThreshold: 0
  };
}

/**
 * حساب رسوم التوصيل حسب المناطق
 */
async function getZoneBasedFee(distance: number): Promise<number> {
  try {
    const zones = await storage.getDeliveryZones();
    
    if (zones && zones.length > 0) {
      // البحث عن المنطقة المناسبة
      const matchingZone = zones.find(zone => 
        distance >= parseFloat(zone.minDistance || '0') &&
        distance <= parseFloat(zone.maxDistance || '999')
      );

      if (matchingZone) {
        return parseFloat(matchingZone.deliveryFee || String(DEFAULT_BASE_FEE));
      }
    }
  } catch (error) {
    console.error('Error fetching delivery zones:', error);
  }

  // رسوم افتراضية إذا لم توجد منطقة مطابقة
  return DEFAULT_BASE_FEE + (distance * DEFAULT_PER_KM_FEE);
}

/**
 * حساب رسوم التوصيل السريع
 * Quick delivery fee calculation (simplified)
 */
export function calculateQuickDeliveryFee(
  distanceKm: number,
  baseFee: number = DEFAULT_BASE_FEE,
  perKmFee: number = DEFAULT_PER_KM_FEE
): number {
  const fee = baseFee + (distanceKm * perKmFee);
  return Math.round(Math.max(DEFAULT_MIN_FEE, Math.min(DEFAULT_MAX_FEE, fee)) * 100) / 100;
}

export default {
  calculateDistance,
  calculateDeliveryFee,
  calculateQuickDeliveryFee,
  estimateDeliveryTime
};
