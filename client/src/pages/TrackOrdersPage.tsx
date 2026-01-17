import { useState } from 'react';
import { useLocation } from 'wouter';
import { ArrowRight, Search, Package, MapPin, Clock, Phone, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';

interface QuickOrder {
  id: string;
  orderNumber: string;
  restaurantName: string;
  status: 'pending' | 'confirmed' | 'preparing' | 'on_way' | 'delivered';
  estimatedTime?: string;
}

export default function TrackOrdersPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [searchOrderNumber, setSearchOrderNumber] = useState('');
  const [searchedOrder, setSearchedOrder] = useState<any>(null);
  const [isSearching, setIsSearching] = useState(false);

  // Mock active orders - would come from API in real app
  const [activeOrders] = useState<QuickOrder[]>([
    {
      id: '1',
      orderNumber: 'ORD001',
      restaurantName: 'مطعم الزعتر الأصيل',
      status: 'on_way',
      estimatedTime: '25 دقيقة'
    },
    {
      id: '2',
      orderNumber: 'ORD004',
      restaurantName: 'مطعم الحمرا الشعبي',
      status: 'preparing',
      estimatedTime: '45 دقيقة'
    }
  ]);

  const handleSearchOrder = async () => {
    if (!searchOrderNumber.trim()) {
      toast({
        title: "أدخل رقم الطلب",
        description: "يرجى إدخال رقم الطلب للبحث",
        variant: "destructive",
      });
      return;
    }

    setIsSearching(true);
    
    // Simulate API call
    setTimeout(() => {
      // Mock search result
      if (searchOrderNumber === 'ORD001' || searchOrderNumber === 'ORD002') {
        setSearchedOrder({
          id: searchOrderNumber,
          orderNumber: searchOrderNumber,
          restaurantName: 'مطعم الزعتر الأصيل',
          customerName: 'محمد أحمد',
          deliveryAddress: 'صنعاء، شارع الزبيري',
          status: searchOrderNumber === 'ORD001' ? 'on_way' : 'delivered',
          estimatedTime: searchOrderNumber === 'ORD001' ? '25 دقيقة' : undefined,
          driverName: searchOrderNumber === 'ORD001' ? 'أحمد محمد' : undefined,
          driverPhone: searchOrderNumber === 'ORD001' ? '+967771234567' : undefined,
          items: [
            { name: 'عربكة بالقشطة والعسل', quantity: 2, price: 55 },
            { name: 'شاي كرك', quantity: 1, price: 8 }
          ],
          total: 118
        });
      } else {
        setSearchedOrder(null);
        toast({
          title: "طلب غير موجود",
          description: "لم يتم العثور على طلب بهذا الرقم",
          variant: "destructive",
        });
      }
      setIsSearching(false);
    }, 1000);
  };

  const getStatusLabel = (status: string) => {
    const statusMap = {
      pending: 'قيد المراجعة',
      confirmed: 'مؤكد',
      preparing: 'قيد التحضير',
      on_way: 'في الطريق',
      delivered: 'تم التوصيل'
    };
    return statusMap[status as keyof typeof statusMap] || status;
  };

  const getStatusColor = (status: string) => {
    const colorMap = {
      pending: 'bg-yellow-500',
      confirmed: 'bg-blue-500',
      preparing: 'bg-orange-500',
      on_way: 'bg-purple-500',
      delivered: 'bg-green-500'
    };
    return colorMap[status as keyof typeof colorMap] || 'bg-gray-500';
  };

  const handleViewFullTracking = (orderId: string) => {
    setLocation(`/orders/${orderId}`);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-md mx-auto px-4 py-4">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setLocation('/')}
              data-testid="button-back"
            >
              <ArrowRight className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-xl font-bold text-gray-900">تتبع الطلبات</h1>
              <p className="text-sm text-gray-500">تابع حالة طلباتك النشطة</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-md mx-auto p-4 space-y-6">
        {/* Search Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Search className="h-5 w-5" />
              البحث عن طلب
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Input
                placeholder="أدخل رقم الطلب (مثال: ORD001)"
                value={searchOrderNumber}
                onChange={(e) => setSearchOrderNumber(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSearchOrder()}
                data-testid="input-search-order"
              />
              <Button 
                onClick={handleSearchOrder}
                disabled={isSearching}
                data-testid="button-search-order"
              >
                {isSearching ? 'جاري البحث...' : 'بحث'}
              </Button>
            </div>
            
            {searchedOrder && (
              <Alert>
                <Package className="h-4 w-4" />
                <AlertDescription>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="font-medium">طلب {searchedOrder.orderNumber}</span>
                      <Badge className={`${getStatusColor(searchedOrder.status)} text-white`}>
                        {getStatusLabel(searchedOrder.status)}
                      </Badge>
                    </div>
                    <p className="text-sm">{searchedOrder.restaurantName}</p>
                    {searchedOrder.estimatedTime && (
                      <p className="text-xs text-muted-foreground">
                        الوقت المتوقع: {searchedOrder.estimatedTime}
                      </p>
                    )}
                    <Button
                      size="sm"
                      className="w-full mt-2"
                      onClick={() => handleViewFullTracking(searchedOrder.id)}
                      data-testid="button-view-searched-order"
                    >
                      عرض التفاصيل الكاملة
                    </Button>
                  </div>
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>

        {/* Active Orders */}
        {activeOrders.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                الطلبات النشطة
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {activeOrders.map((order) => (
                <div 
                  key={order.id}
                  className="p-4 border rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
                  onClick={() => handleViewFullTracking(order.id)}
                  data-testid={`order-card-${order.id}`}
                >
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h3 className="font-semibold">{order.restaurantName}</h3>
                      <p className="text-sm text-gray-500">طلب رقم: {order.orderNumber}</p>
                    </div>
                    <Badge className={`${getStatusColor(order.status)} text-white`}>
                      {getStatusLabel(order.status)}
                    </Badge>
                  </div>
                  
                  {order.estimatedTime && (
                    <div className="flex items-center gap-1 text-sm text-blue-600">
                      <Clock className="h-4 w-4" />
                      <span>الوقت المتوقع: {order.estimatedTime}</span>
                    </div>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              إجراءات سريعة
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-4">
            <Button
              variant="outline"
              className="h-20 flex flex-col gap-2"
              onClick={() => setLocation('/orders')}
              data-testid="button-all-orders"
            >
              <Package className="h-6 w-6" />
              <span className="text-sm">جميع الطلبات</span>
            </Button>
            
            <Button
              variant="outline"
              className="h-20 flex flex-col gap-2"
              onClick={() => setLocation('/addresses')}
              data-testid="button-delivery-addresses"
            >
              <MapPin className="h-6 w-6" />
              <span className="text-sm">عناوين التوصيل</span>
            </Button>
          </CardContent>
        </Card>

        {/* Contact Support */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Phone className="h-5 w-5" />
              هل تحتاج مساعدة؟
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600 mb-4">
              إذا كان لديك أي استفسار حول طلبك، يمكنك التواصل معنا مباشرة
            </p>
            <div className="grid grid-cols-2 gap-3">
              <Button
                variant="outline"
                size="sm"
                className="flex items-center gap-2"
                onClick={() => window.open('tel:+967771234567')}
                data-testid="button-call-support"
              >
                <Phone className="h-4 w-4" />
                اتصل بنا
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                className="flex items-center gap-2"
                onClick={() => window.open('https://wa.me/967771234567')}
                data-testid="button-whatsapp-support"
              >
                <User className="h-4 w-4" />
                واتساب
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Tips */}
        <Alert>
          <Package className="h-4 w-4" />
          <AlertDescription>
            <strong>نصائح للمتابعة:</strong>
            <ul className="mt-2 text-sm space-y-1">
              <li>• احتفظ برقم الطلب للمتابعة السريعة</li>
              <li>• ستصلك إشعارات عند تغير حالة الطلب</li>
              <li>• يمكنك الاتصال بالسائق عند وصوله</li>
            </ul>
          </AlertDescription>
        </Alert>
      </div>
    </div>
  );
}