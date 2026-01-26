import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useLocation } from 'wouter';
import { 
  Star, 
  ShoppingBag,
  Menu,
  UtensilsCrossed
} from 'lucide-react';
import TimingBanner from '@/components/TimingBanner';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { Category, Restaurant } from '@shared/schema';

export default function HomePage() {
  const [, setLocation] = useLocation();
  const [selectedCategory, setSelectedCategory] = useState('all'); // للفئات
  const [selectedTab, setSelectedTab] = useState('all'); // للتبويبات

  // جلب البيانات
  const { data: restaurants } = useQuery<Restaurant[]>({
    queryKey: ['/api/restaurants'],
  });

  const { data: categories } = useQuery<Category[]>({
    queryKey: ['/api/categories'],
  });

  const handleRestaurantClick = (restaurantId: string) => {
    setLocation(`/restaurant/${restaurantId}`);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Timing Banner - Dynamic from settings */}
      <TimingBanner />

      {/* Main Content */}
      <main className="max-w-md mx-auto px-4 py-6">
        {/* Category Grid - Dynamic from API */}
        <section className="mb-6">
          <div className="grid grid-cols-4 gap-3">
            {categories?.slice(0, 3).map((category) => (
              <div key={category.id} className="text-center cursor-pointer" onClick={() => { setSelectedCategory(category.id); setSelectedTab('all'); }}>
                <div className="w-16 h-16 mx-auto mb-2 bg-white rounded-2xl shadow-sm flex items-center justify-center border border-gray-100">
                  {category.icon ? (
                    <i className={`${category.icon} text-2xl text-primary`} />
                  ) : (
                    <UtensilsCrossed className="h-8 w-8 text-orange-500" />
                  )}
                </div>
                <h4 className="text-xs font-medium text-gray-700">{category.name}</h4>
              </div>
            ))}
            
            {/* All Categories */}
            <div className="text-center cursor-pointer" onClick={() => { setSelectedCategory('all'); setSelectedTab('all'); }}>
              <div className="w-16 h-16 mx-auto mb-2 bg-white rounded-2xl shadow-sm flex items-center justify-center border border-gray-100">
                <Menu className="h-8 w-8 text-blue-500" />
              </div>
              <h4 className="text-xs font-medium text-gray-700">كل التصنيفات</h4>
            </div>
          </div>
        </section>

        {/* Promotional Banners - Exactly like reference image */}
        <section className="mb-6">
          <div className="grid grid-cols-2 gap-3">
            {/* Special Offer Banner */}
            <div className="relative h-32 overflow-hidden rounded-2xl cursor-pointer hover:shadow-lg transition-shadow">
              <div className="absolute inset-0 orange-gradient p-4 text-white">
                <div className="absolute top-3 left-3 bg-white/20 px-2 py-1 rounded-full text-xs">
                  عرض خاص
                </div>
                <div className="absolute bottom-3 right-3">
                  <h3 className="text-sm font-bold mb-1">عرض مجاني يصل عبر التطبيق</h3>
                  <p className="text-xs opacity-90">عند طلب أي اكل من التطبيق</p>
                  <p className="text-xs mt-1 bg-white/20 inline-block px-2 py-1 rounded">
                    صالح حتى 15.000 د
                  </p>
                </div>
              </div>
            </div>

            {/* Million Offer Banner */}
            <div className="relative h-32 overflow-hidden rounded-2xl cursor-pointer hover:shadow-lg transition-shadow">
              <div className="absolute inset-0 red-gradient p-4 text-white">
                <div className="absolute top-3 left-3 bg-white/20 px-2 py-1 rounded-full text-xs">
                  1,000,000
                </div>
                <div className="absolute bottom-3 right-3">
                  <h3 className="text-sm font-bold mb-1">كل العروض</h3>
                  <p className="text-xs opacity-90">الاطباق الأمريكية</p>
                  <p className="text-xs mt-1 bg-white/20 inline-block px-2 py-1 rounded">
                    متاح حتى 15.000 د
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Restaurant Section with Tab Navigation */}
        <section>
          {/* Tab Navigation - Similar to reference */}
          <div className="mb-4">
            <div className="flex border-b border-gray-200">
              <button 
                className={`px-4 py-3 font-medium text-sm border-b-2 transition-colors ${
                  selectedTab === 'popular' 
                    ? 'border-red-500 text-red-600' 
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
                onClick={() => setSelectedTab('popular')}
              >
                المفضلة
              </button>
              <button 
                className={`px-4 py-3 font-medium text-sm border-b-2 transition-colors ${
                  selectedTab === 'newest' 
                    ? 'border-red-500 text-red-600' 
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
                onClick={() => setSelectedTab('newest')}
              >
                الجديدة
              </button>
              <button 
                className={`px-4 py-3 font-medium text-sm border-b-2 transition-colors ${
                  selectedTab === 'nearest' 
                    ? 'border-red-500 text-red-600' 
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
                onClick={() => setSelectedTab('nearest')}
              >
                الأقرب
              </button>
              <button 
                className={`px-4 py-3 font-medium text-sm border-b-2 transition-colors ${
                  selectedTab === 'all' 
                    ? 'border-red-500 text-red-600' 
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
                onClick={() => setSelectedTab('all')}
              >
                الكل
              </button>
            </div>
          </div>

          {/* Restaurant Cards - Dynamic from API */}
          <div className="space-y-4">
            {restaurants?.filter(restaurant => {
              // فلترة حسب الفئة
              if (selectedCategory !== 'all' && restaurant.categoryId !== selectedCategory) {
                return false;
              }
              
              // فلترة حسب التبويب
              if (selectedTab === 'popular' && !restaurant.isFeatured) {
                return false;
              }
              if (selectedTab === 'newest' && !restaurant.isNew) {
                return false;
              }
              if (selectedTab === 'nearest') {
                // يمكن إضافة منطق الأقرب هنا لاحقاً
                return true;
              }
              
              return true;
            }).map((restaurant) => (
              <Card 
                key={restaurant.id}
                className="overflow-hidden hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => handleRestaurantClick(restaurant.id)}
              >
                <CardContent className="p-0">
                  <div className="flex">
                    <div className="w-20 h-20 bg-gray-200 flex-shrink-0 flex items-center justify-center">
                      {restaurant.image ? (
                        <img src={restaurant.image} alt={restaurant.name} className="w-full h-full object-cover" />
                      ) : (
                        <UtensilsCrossed className="h-8 w-8 text-gray-400" />
                      )}
                    </div>
                    <div className="flex-1 p-4">
                      <div className="flex items-start justify-between mb-1">
                        <div>
                          <h4 className="font-semibold text-gray-900 mb-1">{restaurant.name}</h4>
                          <p className="text-sm text-gray-600 mb-2">{restaurant.description}</p>
                          <div className="flex items-center gap-2 text-xs text-gray-500">
                            <span>{restaurant.deliveryTime}</span>
                            <span>•</span>
                            <span>رسوم التوصيل: {restaurant.deliveryFee} ريال</span>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="flex items-center gap-1 mb-2">
                            <span className="text-sm font-medium">{restaurant.rating}</span>
                            <Star className="h-3 w-3 text-yellow-400 fill-current" />
                          </div>
                          <Badge className={restaurant.isOpen ? 'bg-green-600 text-white' : 'bg-red-600 text-white'}>
                            {restaurant.isOpen ? 'مفتوح' : 'مغلق'}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
            
            {/* Empty state */}
            {(!restaurants || restaurants.length === 0) && (
              <div className="text-center py-8 text-gray-500">
                <UtensilsCrossed className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p>لا توجد مطاعم متاحة في الوقت الحالي</p>
              </div>
            )}
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12 mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 bg-orange-500 rounded-lg flex items-center justify-center">
                  <ShoppingBag className="h-5 w-5 text-white" />
                </div>
                <h3 className="text-xl font-bold">السريع ون</h3>
              </div>
              <p className="text-gray-400">
                أفضل تطبيق توصيل طعام في اليمن. نوصل لك طعامك المفضل بسرعة وأمان.
              </p>
            </div>
            
            <div>
              <h4 className="font-semibold mb-4">روابط سريعة</h4>
              <ul className="space-y-2 text-gray-400">
                <li><a href="#" className="hover:text-white transition-colors">من نحن</a></li>
                <li><a href="#" className="hover:text-white transition-colors">اتصل بنا</a></li>
                <li><a href="#" className="hover:text-white transition-colors">الشروط والأحكام</a></li>
                <li><a href="#" className="hover:text-white transition-colors">سياسة الخصوصية</a></li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold mb-4">تواصل معنا</h4>
              <div className="space-y-2 text-gray-400">
                <p>📞 +967 1 234 567</p>
                <p>📧 info@sareeone.com</p>
                <p>📍 صنعاء، اليمن</p>
              </div>
            </div>
          </div>
          
          <div className="border-t border-gray-800 mt-8 pt-8 text-center text-gray-400">
            <p>&copy; 2024 السريع ون. جميع الحقوق محفوظة.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}