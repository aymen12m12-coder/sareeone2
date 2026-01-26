import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Save, X, Calendar, Percent, Tag } from 'lucide-react';

interface SpecialOffer {
  id: string;
  title: string;
  description?: string;
  discountPercentage: number;
  minOrderAmount?: string;
  maxDiscountAmount?: string;
  startDate: string;
  endDate: string;
  isActive: boolean;
  usageCount: number;
  maxUsage?: number;
  applicableRestaurants?: string;
  createdAt: string;
}

interface Restaurant {
  id: string;
  name: string;
}

export default function SpecialOffers() {
  const [offers, setOffers] = useState<SpecialOffer[]>([]);
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    discountPercentage: 0,
    minOrderAmount: '',
    maxDiscountAmount: '',
    startDate: '',
    endDate: '',
    maxUsage: '',
    applicableRestaurants: 'all'
  });

  useEffect(() => {
    fetchOffers();
    fetchRestaurants();
  }, []);

  const fetchOffers = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/special-offers');
      const data = await response.json();
      setOffers(data);
    } catch (error) {
      console.error('خطأ في جلب العروض:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchRestaurants = async () => {
    try {
      const response = await fetch('/api/restaurants');
      const data = await response.json();
      setRestaurants(data);
    } catch (error) {
      console.error('خطأ في جلب المطاعم:', error);
    }
  };

  const handleAdd = async () => {
    try {
      const offerData = {
        ...formData,
        discountPercentage: parseFloat(formData.discountPercentage.toString()),
        minOrderAmount: formData.minOrderAmount ? parseFloat(formData.minOrderAmount) : null,
        maxDiscountAmount: formData.maxDiscountAmount ? parseFloat(formData.maxDiscountAmount) : null,
        maxUsage: formData.maxUsage ? parseInt(formData.maxUsage) : null,
        applicableRestaurants: formData.applicableRestaurants === 'all' ? null : formData.applicableRestaurants
      };

      const response = await fetch('/api/special-offers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(offerData)
      });
      
      if (response.ok) {
        setFormData({
          title: '',
          description: '',
          discountPercentage: 0,
          minOrderAmount: '',
          maxDiscountAmount: '',
          startDate: '',
          endDate: '',
          maxUsage: '',
          applicableRestaurants: 'all'
        });
        setShowAddForm(false);
        fetchOffers();
      }
    } catch (error) {
      console.error('خطأ في إضافة العرض:', error);
    }
  };

  const handleUpdate = async (id: string, data: Partial<SpecialOffer>) => {
    try {
      const response = await fetch(`/api/special-offers/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      
      if (response.ok) {
        setEditingId(null);
        fetchOffers();
      }
    } catch (error) {
      console.error('خطأ في تحديث العرض:', error);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('هل أنت متأكد من حذف هذا العرض؟')) return;
    
    try {
      const response = await fetch(`/api/special-offers/${id}`, {
        method: 'DELETE'
      });
      
      if (response.ok) {
        fetchOffers();
      }
    } catch (error) {
      console.error('خطأ في حذف العرض:', error);
    }
  };

  const getOfferStatus = (offer: SpecialOffer) => {
    const now = new Date();
    const startDate = new Date(offer.startDate);
    const endDate = new Date(offer.endDate);
    
    if (!offer.isActive) return { text: 'غير نشط', color: 'bg-gray-100 text-gray-800' };
    if (now < startDate) return { text: 'لم يبدأ', color: 'bg-yellow-100 text-yellow-800' };
    if (now > endDate) return { text: 'منتهي', color: 'bg-red-100 text-red-800' };
    return { text: 'نشط', color: 'bg-green-100 text-green-800' };
  };

  const getRestaurantName = (restaurantId: string) => {
    const restaurant = restaurants.find(r => r.id === restaurantId);
    return restaurant ? restaurant.name : 'غير معروف';
  };

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-800">إدارة العروض الخاصة</h1>
        <button
          onClick={() => setShowAddForm(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-700"
        >
          <Plus size={20} />
          إضافة عرض
        </button>
      </div>

      {/* Add Form */}
      {showAddForm && (
        <div className="bg-white p-6 rounded-lg shadow-md mb-6">
          <h3 className="text-lg font-semibold mb-4">إضافة عرض خاص جديد</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">عنوان العرض *</label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="w-full p-3 border border-gray-300 rounded-lg"
                placeholder="مثال: خصم الجمعة الذهبية"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">نسبة الخصم (%) *</label>
              <input
                type="number"
                min="0"
                max="100"
                value={formData.discountPercentage}
                onChange={(e) => setFormData({ ...formData, discountPercentage: parseFloat(e.target.value) })}
                className="w-full p-3 border border-gray-300 rounded-lg"
                placeholder="20"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">الحد الأدنى للطلب (شيكل)</label>
              <input
                type="number"
                min="0"
                value={formData.minOrderAmount}
                onChange={(e) => setFormData({ ...formData, minOrderAmount: e.target.value })}
                className="w-full p-3 border border-gray-300 rounded-lg"
                placeholder="50"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">الحد الأقصى للخصم (شيكل)</label>
              <input
                type="number"
                min="0"
                value={formData.maxDiscountAmount}
                onChange={(e) => setFormData({ ...formData, maxDiscountAmount: e.target.value })}
                className="w-full p-3 border border-gray-300 rounded-lg"
                placeholder="25"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">تاريخ البداية *</label>
              <input
                type="datetime-local"
                value={formData.startDate}
                onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                className="w-full p-3 border border-gray-300 rounded-lg"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">تاريخ النهاية *</label>
              <input
                type="datetime-local"
                value={formData.endDate}
                onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                className="w-full p-3 border border-gray-300 rounded-lg"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">الحد الأقصى للاستخدام</label>
              <input
                type="number"
                min="1"
                value={formData.maxUsage}
                onChange={(e) => setFormData({ ...formData, maxUsage: e.target.value })}
                className="w-full p-3 border border-gray-300 rounded-lg"
                placeholder="100"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">المطاعم المشمولة</label>
              <select
                value={formData.applicableRestaurants}
                onChange={(e) => setFormData({ ...formData, applicableRestaurants: e.target.value })}
                className="w-full p-3 border border-gray-300 rounded-lg"
              >
                <option value="all">جميع المطاعم</option>
                {restaurants.map(restaurant => (
                  <option key={restaurant.id} value={restaurant.id}>
                    {restaurant.name}
                  </option>
                ))}
              </select>
            </div>
            
            <div className="md:col-span-2 lg:col-span-3">
              <label className="block text-sm font-medium text-gray-700 mb-1">وصف العرض</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full p-3 border border-gray-300 rounded-lg"
                rows={3}
                placeholder="وصف تفصيلي للعرض وشروطه..."
              />
            </div>
          </div>
          
          <div className="flex gap-2 mt-6">
            <button
              onClick={handleAdd}
              className="bg-green-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-green-700"
            >
              <Save size={20} />
              حفظ العرض
            </button>
            <button
              onClick={() => setShowAddForm(false)}
              className="bg-gray-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-gray-700"
            >
              <X size={20} />
              إلغاء
            </button>
          </div>
        </div>
      )}

      {/* Offers List */}
      <div className="bg-white rounded-lg shadow">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">العرض</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">الخصم</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">الشروط</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">التوقيت</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">الاستخدام</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">الحالة</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">الإجراءات</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-4 text-center">جاري التحميل...</td>
                </tr>
              ) : offers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-4 text-center text-gray-500">
                    لا توجد عروض خاصة
                  </td>
                </tr>
              ) : (
                offers.map((offer) => {
                  const status = getOfferStatus(offer);
                  return (
                    <tr key={offer.id}>
                      <td className="px-6 py-4">
                        <div>
                          <div className="text-sm font-medium text-gray-900">{offer.title}</div>
                          {offer.description && (
                            <div className="text-sm text-gray-500 truncate max-w-xs" title={offer.description}>
                              {offer.description}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-1">
                          <Percent size={16} className="text-green-600" />
                          <span className="text-lg font-bold text-green-600">{offer.discountPercentage}%</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm">
                          {offer.minOrderAmount && (
                            <div>حد أدنى: {offer.minOrderAmount} شيكل</div>
                          )}
                          {offer.maxDiscountAmount && (
                            <div>حد أقصى: {offer.maxDiscountAmount} شيكل</div>
                          )}
                          {offer.applicableRestaurants && (
                            <div>{getRestaurantName(offer.applicableRestaurants)}</div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <div>
                          <div>من: {new Date(offer.startDate).toLocaleDateString('ar')}</div>
                          <div>إلى: {new Date(offer.endDate).toLocaleDateString('ar')}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <div>
                          <div className="font-semibold">{offer.usageCount}</div>
                          {offer.maxUsage && (
                            <div className="text-gray-500">من {offer.maxUsage}</div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 text-xs font-semibold rounded-full ${status.color}`}>
                          {status.text}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex space-x-2">
                          <button
                            onClick={() => handleUpdate(offer.id, { isActive: !offer.isActive })}
                            className={`px-2 py-1 text-xs rounded ${
                              offer.isActive ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'
                            }`}
                          >
                            {offer.isActive ? 'إيقاف' : 'تفعيل'}
                          </button>
                          <button
                            onClick={() => setEditingId(editingId === offer.id ? null : offer.id)}
                            className="text-indigo-600 hover:text-indigo-900"
                          >
                            <Edit2 size={16} />
                          </button>
                          <button
                            onClick={() => handleDelete(offer.id)}
                            className="text-red-600 hover:text-red-900"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mt-6">
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center gap-3">
            <Tag className="text-blue-600" size={24} />
            <div>
              <h3 className="text-lg font-semibold text-gray-800">إجمالي العروض</h3>
              <p className="text-2xl font-bold text-blue-600">{offers.length}</p>
            </div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center gap-3">
            <Calendar className="text-green-600" size={24} />
            <div>
              <h3 className="text-lg font-semibold text-gray-800">عروض نشطة</h3>
              <p className="text-2xl font-bold text-green-600">
                {offers.filter(o => getOfferStatus(o).text === 'نشط').length}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center gap-3">
            <Percent className="text-orange-600" size={24} />
            <div>
              <h3 className="text-lg font-semibold text-gray-800">إجمالي الاستخدام</h3>
              <p className="text-2xl font-bold text-orange-600">
                {offers.reduce((sum, offer) => sum + offer.usageCount, 0)}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center gap-3">
            <X className="text-red-600" size={24} />
            <div>
              <h3 className="text-lg font-semibold text-gray-800">عروض منتهية</h3>
              <p className="text-2xl font-bold text-red-600">
                {offers.filter(o => getOfferStatus(o).text === 'منتهي').length}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}