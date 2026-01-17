import { useQuery } from '@tanstack/react-query';
import { Clock } from 'lucide-react';
import { useMemo, useState, useEffect } from 'react';

// دالة لحساب حالة المتجر الحالية
const calculateStoreStatus = (openingTime: string, closingTime: string): { isOpen: boolean; message: string; color: string } => {
  const now = new Date();
  const currentTime = now.toTimeString().slice(0, 5); // HH:MM format
  
  // تحويل الأوقات إلى دقائق لسهولة المقارنة
  const currentMinutes = timeToMinutes(currentTime);
  const openMinutes = timeToMinutes(openingTime);
  const closeMinutes = timeToMinutes(closingTime);
  
  let isOpen = false;
  
  if (closeMinutes > openMinutes) {
    // نفس اليوم (مثال: من 11:00 إلى 23:00)
    isOpen = currentMinutes >= openMinutes && currentMinutes < closeMinutes;
  } else {
    // عبر منتصف الليل (مثال: من 22:00 إلى 02:00)
    isOpen = currentMinutes >= openMinutes || currentMinutes < closeMinutes;
  }
  
  if (isOpen) {
    let minutesUntilClose;
    if (closeMinutes > openMinutes) {
      // Same day (e.g., 11:00 to 23:00)
      minutesUntilClose = closeMinutes - currentMinutes;
    } else {
      // Overnight (e.g., 22:00 to 02:00)
      if (currentMinutes >= openMinutes) {
        // Current time is after opening (e.g., 23:00 when open 22:00-02:00)
        minutesUntilClose = (24 * 60) + closeMinutes - currentMinutes;
      } else {
        // Current time is before closing (e.g., 01:00 when open 22:00-02:00)
        minutesUntilClose = closeMinutes - currentMinutes;
      }
    }
    
    if (minutesUntilClose <= 30) {
      return { 
        isOpen: true, 
        message: `مفتوح - يغلق الساعة ${closingTime}`, 
        color: 'bg-yellow-500/20' 
      };
    }
    return { 
      isOpen: true, 
      message: `مفتوح حتى ${closingTime}`, 
      color: 'bg-green-500/20' 
    };
  }
  
  return { 
    isOpen: false, 
    message: `مغلق - يفتح الساعة ${openingTime}`, 
    color: 'bg-red-500/20' 
  };
};

const timeToMinutes = (time: string): number => {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
};

export default function TimingBanner() {
  const [currentTime, setCurrentTime] = useState(new Date());

  const { data: uiSettings } = useQuery({
    queryKey: ['/api/admin/ui-settings'],
  });

  // البحث عن إعدادات أوقات العمل
  const openingTime = (uiSettings as any[])?.find((setting: any) => setting.key === 'opening_time')?.value || '11:00';
  const closingTime = (uiSettings as any[])?.find((setting: any) => setting.key === 'closing_time')?.value || '23:00';
  
  // تحديث الوقت كل دقيقة لحساب الحالة في الوقت الحقيقي
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000); // تحديث كل دقيقة

    return () => clearInterval(timer);
  }, []);
  
  // حساب الحالة الحالية للمتجر بناءً على الوقت الحقيقي
  const storeStatus = useMemo(() => {
    return calculateStoreStatus(openingTime, closingTime);
  }, [openingTime, closingTime, currentTime]);

  return (
    <div className="bg-gray-100 py-3">
      <div className="max-w-md mx-auto px-4 text-center">
        <div className="orange-gradient text-white px-4 py-2 rounded-full inline-flex items-center gap-2 text-sm">
          <Clock className="h-4 w-4" />
          <span>أوقات الدوام من الساعة {openingTime} حتى {closingTime}</span>
          <span className={`px-2 py-1 rounded text-xs ${storeStatus.color}`}>
            {storeStatus.isOpen ? '🟢 مفتوح' : '🔴 مغلق'}
          </span>
        </div>
        {/* رسالة تفصيلية عن الحالة */}
        <div className="mt-1 text-xs text-gray-600">
          {storeStatus.message}
        </div>
      </div>
    </div>
  );
}