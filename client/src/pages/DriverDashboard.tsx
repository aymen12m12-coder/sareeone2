import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { 
  Truck, MapPin, Clock, DollarSign, LogOut, Navigation, Phone, 
  CheckCircle, Package, Bell, User, Calendar, Target, AlertCircle, 
  RefreshCw, Eye, MessageCircle, Store, Map, TrendingUp, Activity 
} from 'lucide-react';
import type { Order, Driver } from '@shared/schema';

interface DriverDashboardProps {
  onLogout: () => void;
}

export const DriverDashboard: React.FC<DriverDashboardProps> = ({ onLogout }) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('available');
  const [driverStatus, setDriverStatus] = useState<'available' | 'busy' | 'offline'>('offline');
  const [currentDriver, setCurrentDriver] = useState<Driver | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [showOrderDetailsDialog, setShowOrderDetailsDialog] = useState(false);

  // الحصول على معرف السائق
  const getDriverId = () => {
    const driverUser = localStorage.getItem('driver_user');
    if (driverUser) {
      try {
        const user = JSON.parse(driverUser);
        return user.id;
      } catch (error) {
        console.error('خطأ في تحليل بيانات السائق:', error);
        return null;
      }
    }
    return null;
  };

  const driverId = getDriverId();

  // التحقق من تسجيل الدخول
  useEffect(() => {
    if (!driverId) {
      toast({
        title: "غير مصرح",
        description: "يجب تسجيل الدخول أولاً",
        variant: "destructive"
      });
      window.location.href = '/driver-login';
      return;
    }

    // تحميل بيانات السائق
    const savedDriver = localStorage.getItem('driver_user');
    if (savedDriver) {
      try {
        const driverData = JSON.parse(savedDriver);
        setCurrentDriver(driverData);
        setDriverStatus(driverData.isAvailable ? 'available' : 'offline');
      } catch (error) {
        console.error('خطأ في تحميل بيانات السائق:', error);
      }
    }
  }, [driverId, toast]);

  // 🔄 جلب الطلبات المتاحة - الإصاح المعدل
  const { 
    data: availableOrders = [], 
    isLoading: availableLoading, 
    error: availableError,
    refetch: refetchAvailable 
  } = useQuery<Order[]>({
    queryKey: ['/api/orders/available'],
    queryFn: async () => {
      console.log('جلب الطلبات المتاحة...');
      const response = await fetch('/api/orders?status=confirmed');
      
      if (!response.ok) {
        throw new Error(`فشل في جلب الطلبات: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('الطلبات المستلمة:', data);
      
      // فلترة الطلبات غير المعينة لسائق
      const filteredOrders = Array.isArray(data) 
        ? data.filter((order: Order) => !order.driverId)
        : [];
      
      console.log('الطلبات المتاحة بعد الفلترة:', filteredOrders);
      return filteredOrders;
    },
    enabled: !!driverId && driverStatus === 'available',
    refetchInterval: 10000, // تحديث كل 10 ثوان
    retry: 3,
  });

  // 🔄 جلب طلبات السائق الحالية
  const { 
    data: myOrders = [], 
    isLoading: myOrdersLoading, 
    error: myOrdersError,
    refetch: refetchMyOrders 
  } = useQuery<Order[]>({
    queryKey: ['/api/orders/my-orders', driverId],
    queryFn: async () => {
      if (!driverId) return [];
      
      console.log('جلب طلبات السائق...');
      const response = await fetch(`/api/orders?driverId=${driverId}`);
      
      if (!response.ok) {
        throw new Error(`فشل في جلب طلباتي: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('طلبات السائق المستلمة:', data);
      return Array.isArray(data) ? data : [];
    },
    enabled: !!driverId,
    refetchInterval: 8000, // تحديث كل 8 ثوان
  });

  // جلب إحصائيات السائق
  const { data: todayStats } = useQuery({
    queryKey: ['/api/drivers/stats/today', driverId],
    queryFn: async () => {
      if (!driverId) return null;
      const response = await fetch(`/api/drivers/${driverId}/stats?period=today`);
      if (!response.ok) return { totalOrders: 0, totalEarnings: 0, completedOrders: 0, avgOrderValue: 0 };
      return response.json();
    },
    enabled: !!driverId,
  });

  // قبول طلب - الإصاح المعدل
  const acceptOrderMutation = useMutation({
    mutationFn: async (orderId: string) => {
      if (!driverId) throw new Error('معرف السائق غير موجود');
      
      const response = await fetch(`/api/orders/${orderId}/assign-driver`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('driver_token')}`
        },
        body: JSON.stringify({ driverId }),
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `فشل في قبول الطلب: ${response.status}`);
      }
      
      return response.json();
    },
    onSuccess: (data, orderId) => {
      queryClient.invalidateQueries({ queryKey: ['/api/orders/available'] });
      queryClient.invalidateQueries({ queryKey: ['/api/orders/my-orders'] });
      setDriverStatus('busy');
      
      toast({
        title: "تم قبول الطلب بنجاح ✅",
        description: `تم تعيين الطلب لك بنجاح`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "خطأ في قبول الطلب",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  // تحديث حالة الطلب
  const updateOrderStatusMutation = useMutation({
    mutationFn: async ({ orderId, status }: { orderId: string; status: string }) => {
      const response = await fetch(`/api/orders/${orderId}`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('driver_token')}`
        },
        body: JSON.stringify({ 
          status,
          updatedBy: driverId,
          updatedByType: 'driver'
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'فشل في تحديث حالة الطلب');
      }
      
      return response.json();
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['/api/orders/my-orders'] });
      queryClient.invalidateQueries({ queryKey: ['/api/drivers/stats/today'] });
      
      if (variables.status === 'delivered') {
        setDriverStatus('available');
      }
      
      const statusText = getStatusText(variables.status);
      toast({
        title: "تم تحديث حالة الطلب ✅",
        description: `تم تحديث الطلب إلى: ${statusText}`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "خطأ في تحديث الطلب",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  // تحديث حالة السائق
  const updateDriverStatusMutation = useMutation({
    mutationFn: async (isAvailable: boolean) => {
      if (!driverId) throw new Error('معرف السائق غير موجود');
      
      const response = await fetch(`/api/drivers/${driverId}`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('driver_token')}`
        },
        body: JSON.stringify({ isAvailable }),
      });
      
      if (!response.ok) throw new Error('فشل في تحديث حالة السائق');
      return response.json();
    },
    onSuccess: (data, isAvailable) => {
      setDriverStatus(isAvailable ? 'available' : 'offline');
      
      if (currentDriver) {
        const updatedDriver = { ...currentDriver, isAvailable };
        setCurrentDriver(updatedDriver);
        localStorage.setItem('driver_user', JSON.stringify(updatedDriver));
      }
      
      toast({
        title: isAvailable ? "أنت متاح الآن 🟢" : "أنت غير متاح 🔴",
        description: isAvailable ? "ستتلقى طلبات جديدة" : "لن تتلقى طلبات جديدة",
      });

      // إعادة جلب الطلبات عند التغيير للحالة المتاحة
      if (isAvailable) {
        refetchAvailable();
      }
    },
    onError: (error: Error) => {
      toast({
        title: "خطأ في تحديث الحالة",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  const handleLogout = () => {
    localStorage.removeItem('driver_token');
    localStorage.removeItem('driver_user');
    onLogout();
  };

  const getStatusText = (status: string) => {
    const statusMap: Record<string, string> = {
      pending: 'في الانتظار',
      confirmed: 'مؤكد',
      preparing: 'قيد التحضير',
      ready: 'جاهز للاستلام',
      picked_up: 'تم الاستلام',
      on_way: 'في الطريق',
      delivered: 'تم التسليم',
      cancelled: 'ملغي'
    };
    return statusMap[status] || status;
  };

  const getStatusColor = (status: string) => {
    const colorMap: Record<string, string> = {
      pending: 'bg-yellow-100 text-yellow-800',
      confirmed: 'bg-blue-100 text-blue-800',
      preparing: 'bg-orange-100 text-orange-800',
      ready: 'bg-purple-100 text-purple-800',
      picked_up: 'bg-indigo-100 text-indigo-800',
      on_way: 'bg-green-100 text-green-800',
      delivered: 'bg-emerald-100 text-emerald-800',
      cancelled: 'bg-red-100 text-red-800'
    };
    return colorMap[status] || 'bg-gray-100 text-gray-800';
  };

  const getNextStatus = (currentStatus: string) => {
    const statusFlow: Record<string, string> = {
      confirmed: 'preparing',
      preparing: 'ready',
      ready: 'picked_up',
      picked_up: 'on_way',
      on_way: 'delivered'
    };
    return statusFlow[currentStatus];
  };

  const getNextStatusLabel = (currentStatus: string) => {
    const labels: Record<string, string> = {
      confirmed: 'بدء التحضير',
      preparing: 'جاهز للاستلام',
      ready: 'تم الاستلام',
      picked_up: 'في الطريق',
      on_way: 'تم التسليم'
    };
    return labels[currentStatus] || 'تحديث الحالة';
  };

  const getOrderItems = (itemsString: string) => {
    try {
      return JSON.parse(itemsString);
    } catch {
      return [];
    }
  };

  const formatCurrency = (amount: string | number) => {
    const num = typeof amount === 'string' ? parseFloat(amount) : amount;
    return `${num.toFixed(2)} ريال`;
  };

  // 🔄 تصنيف الطلبات - الإصاح المعدل
  const categorizeOrders = () => {
    const available = availableOrders || [];
    const my = myOrders || [];

    return {
      available: available.filter(order => 
        order.status === 'confirmed' && !order.driverId
      ),
      accepted: my.filter(order => 
        ['preparing', 'ready'].includes(order.status || '')
      ),
      inProgress: my.filter(order => 
        ['picked_up', 'on_way'].includes(order.status || '')
      ),
      completed: my.filter(order => 
        order.status === 'delivered'
      )
    };
  };

  const categorizedOrders = categorizeOrders();

  // مكون عرض الطلب
  const OrderCard = ({ order, type }: { order: Order; type: 'available' | 'accepted' | 'inProgress' | 'completed' }) => {
    const items = getOrderItems(order.items);
    const totalAmount = parseFloat(order.totalAmount || '0');
    const commission = parseFloat(order.driverEarnings || Math.round(totalAmount * 0.15).toString());

    return (
      <Card key={order.id} className="hover:shadow-md transition-shadow mb-4">
        <CardHeader className="pb-3">
          <div className="flex justify-between items-start">
            <div>
              <h4 className="font-bold text-lg">طلب #{order.orderNumber || order.id.slice(-8)}</h4>
              <p className="text-sm text-muted-foreground">{order.customerName}</p>
              <p className="text-xs text-muted-foreground">
                {new Date(order.createdAt).toLocaleString('ar-YE')}
              </p>
            </div>
            <div className="text-left">
              <Badge className={getStatusColor(order.status || 'pending')}>
                {getStatusText(order.status || 'pending')}
              </Badge>
              <div className="mt-2">
                <p className="font-bold text-lg text-green-600">{formatCurrency(totalAmount)}</p>
                <p className="text-sm text-muted-foreground">عمولة: {formatCurrency(commission)}</p>
              </div>
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {/* معلومات العميل */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Store className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">مطعم {order.restaurantName || 'تجريبي'}</span>
            </div>
            <div className="flex items-center gap-2">
              <Phone className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">{order.customerPhone}</span>
            </div>
            <div className="flex items-start gap-2">
              <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
              <span className="text-sm">{order.deliveryAddress}</span>
            </div>
            {order.notes && (
              <div className="flex items-start gap-2">
                <MessageCircle className="h-4 w-4 text-muted-foreground mt-0.5" />
                <span className="text-sm text-blue-600">ملاحظات: {order.notes}</span>
              </div>
            )}
          </div>

          {/* أزرار الإجراءات */}
          <div className="flex gap-2 flex-wrap">
            {type === 'available' && (
              <>
                <Button
                  variant="outline"
                  onClick={() => {
                    setSelectedOrder(order);
                    setShowOrderDetailsDialog(true);
                  }}
                  className="gap-2"
                >
                  <Eye className="h-4 w-4" />
                  التفاصيل
                </Button>
                <Button
                  onClick={() => acceptOrderMutation.mutate(order.id)}
                  disabled={acceptOrderMutation.isPending || categorizedOrders.accepted.length > 0 || categorizedOrders.inProgress.length > 0}
                  className="flex-1 bg-green-600 hover:bg-green-700"
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  {acceptOrderMutation.isPending ? 'جاري القبول...' : 'قبول الطلب'}
                </Button>
              </>
            )}

            {(type === 'accepted' || type === 'inProgress') && (
              <>
                <Button
                  variant="outline"
                  onClick={() => window.open(`tel:${order.customerPhone}`)}
                  className="gap-2"
                >
                  <Phone className="h-4 w-4" />
                  اتصال
                </Button>
                
                <Button
                  variant="outline"
                  onClick={() => {
                    // فتح الخريطة للعنوان
                    const encodedAddress = encodeURIComponent(order.deliveryAddress);
                    window.open(`https://www.google.com/maps/search/?api=1&query=${encodedAddress}`, '_blank');
                  }}
                  className="gap-2"
                >
                  <Navigation className="h-4 w-4" />
                  التنقل
                </Button>

                {getNextStatus(order.status || '') && (
                  <Button
                    onClick={() => updateOrderStatusMutation.mutate({ 
                      orderId: order.id, 
                      status: getNextStatus(order.status || '') 
                    })}
                    disabled={updateOrderStatusMutation.isPending}
                    className="flex-1 bg-blue-600 hover:bg-blue-700"
                  >
                    {updateOrderStatusMutation.isPending ? 'جاري التحديث...' : getNextStatusLabel(order.status || '')}
                  </Button>
                )}
              </>
            )}

            {type === 'completed' && (
              <div className="flex-1 text-center">
                <Badge className="bg-green-100 text-green-800">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  مكتمل
                </Badge>
              </div>
            )}
          </div>

          {/* رسالة تنبيه إذا كان هناك طلب نشط */}
          {(categorizedOrders.accepted.length > 0 || categorizedOrders.inProgress.length > 0) && type === 'available' && (
            <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-xs text-yellow-800">
              ⚠️ لديك طلب نشط. أكمل التوصيل الحالي قبل قبول طلب جديد
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  // عرض أخطاء الجلب إذا وجدت
  if (availableError) {
    console.error('خطأ في جلب الطلبات المتاحة:', availableError);
  }

  if (myOrdersError) {
    console.error('خطأ في جلب طلباتي:', myOrdersError);
  }

  if (!driverId) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="w-96">
          <CardContent className="p-8 text-center">
            <Truck className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">غير مصرح</h3>
            <p className="text-muted-foreground mb-4">يجب تسجيل الدخول كسائق</p>
            <Button onClick={() => window.location.href = '/driver-login'}>
              تسجيل الدخول
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50" dir="rtl">
      {/* Header */}
      <header className="bg-white shadow-sm border-b sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-green-600 rounded-lg flex items-center justify-center">
                <Truck className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">تطبيق السائق</h1>
                <p className="text-sm text-gray-500">مرحباً {currentDriver?.name}</p>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              {/* مؤشر الطلبات الجديدة */}
              {categorizedOrders.available.length > 0 && driverStatus === 'available' && (
                <div className="flex items-center gap-2 bg-red-50 px-3 py-1 rounded-full">
                  <Bell className="h-4 w-4 text-red-500 animate-pulse" />
                  <span className="text-sm font-medium text-red-700">
                    {categorizedOrders.available.length} طلب جديد
                  </span>
                </div>
              )}

              {/* حالة السائق */}
              <div className="flex items-center gap-2">
                <Label htmlFor="driver-status" className="text-sm">متاح للعمل</Label>
                <Switch
                  id="driver-status"
                  checked={driverStatus === 'available'}
                  onCheckedChange={(checked) => updateDriverStatusMutation.mutate(checked)}
                  disabled={updateDriverStatusMutation.isPending}
                />
              </div>

              <Button 
                variant="outline" 
                onClick={handleLogout}
                className="flex items-center gap-2"
              >
                <LogOut className="h-4 w-4" />
                خروج
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* المحتوى الرئيسي */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* إحصائيات */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="p-4 text-center">
              <Package className="h-6 w-6 text-blue-500 mx-auto mb-2" />
              <p className="text-lg font-bold">{todayStats?.totalOrders || 0}</p>
              <p className="text-xs text-muted-foreground">طلبات اليوم</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4 text-center">
              <DollarSign className="h-6 w-6 text-green-500 mx-auto mb-2" />
              <p className="text-lg font-bold">{formatCurrency(todayStats?.totalEarnings || 0)}</p>
              <p className="text-xs text-muted-foreground">أرباح اليوم</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4 text-center">
              <Target className="h-6 w-6 text-purple-500 mx-auto mb-2" />
              <p className="text-lg font-bold">{categorizedOrders.completed.length}</p>
              <p className="text-xs text-muted-foreground">مكتملة اليوم</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4 text-center">
              <Activity className="h-6 w-6 text-orange-500 mx-auto mb-2" />
              <p className="text-lg font-bold">
                {driverStatus === 'available' ? '🟢 متاح' : 
                 driverStatus === 'busy' ? '🟡 مشغول' : '🔴 غير متاح'}
              </p>
              <p className="text-xs text-muted-foreground">الحالة</p>
            </CardContent>
          </Card>
        </div>

        {/* التبويبات */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="available" className="relative">
              الطلبات المتاحة
              {categorizedOrders.available.length > 0 && (
                <Badge className="absolute -top-2 -right-2 bg-red-500 text-white text-xs h-5 w-5 rounded-full p-0 flex items-center justify-center">
                  {categorizedOrders.available.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="accepted" className="relative">
              طلباتي المقبولة
              {categorizedOrders.accepted.length > 0 && (
                <Badge className="absolute -top-2 -right-2 bg-blue-500 text-white text-xs h-5 w-5 rounded-full p-0 flex items-center justify-center">
                  {categorizedOrders.accepted.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="inProgress" className="relative">
              قيد التوصيل
              {categorizedOrders.inProgress.length > 0 && (
                <Badge className="absolute -top-2 -right-2 bg-orange-500 text-white text-xs h-5 w-5 rounded-full p-0 flex items-center justify-center">
                  {categorizedOrders.inProgress.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="completed">
              مكتملة
            </TabsTrigger>
          </TabsList>

          {/* محتوى التبويبات */}
          <TabsContent value="available" className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-bold">الطلبات المتاحة ({categorizedOrders.available.length})</h2>
              <Button
                variant="outline"
                size="sm"
                onClick={() => refetchAvailable()}
                disabled={availableLoading}
              >
                <RefreshCw className={`h-4 w-4 ${availableLoading ? 'animate-spin' : ''}`} />
                تحديث
              </Button>
            </div>

            {driverStatus !== 'available' && (
              <Card className="border-yellow-200 bg-yellow-50">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="h-5 w-5 text-yellow-600" />
                    <p className="text-yellow-800">
                      يجب تفعيل حالة "متاح للعمل" لرؤية الطلبات الجديدة
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}

            {availableError && (
              <Card className="border-red-200 bg-red-50">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="h-5 w-5 text-red-600" />
                    <div>
                      <p className="text-red-800 font-medium">خطأ في جلب الطلبات</p>
                      <p className="text-red-700 text-sm">{availableError.message}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {availableLoading ? (
              <div className="space-y-4">
                {[...Array(3)].map((_, i) => (
                  <Card key={i} className="animate-pulse">
                    <CardContent className="p-6">
                      <div className="h-4 bg-gray-200 rounded w-3/4 mb-2" />
                      <div className="h-3 bg-gray-200 rounded w-1/2 mb-3" />
                      <div className="h-3 bg-gray-200 rounded w-2/3" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : categorizedOrders.available.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">لا توجد طلبات متاحة</h3>
                  <p className="text-muted-foreground">
                    {driverStatus === 'available' 
                      ? 'سيتم إشعارك عند توفر طلبات جديدة' 
                      : 'قم بتفعيل حالة "متاح للعمل" لرؤية الطلبات'
                    }
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {categorizedOrders.available.map(order => (
                  <OrderCard key={order.id} order={order} type="available" />
                ))}
              </div>
            )}
          </TabsContent>

          {/* تبويبات أخرى بنفس النمط */}
          <TabsContent value="accepted" className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-bold">طلباتي المقبولة ({categorizedOrders.accepted.length})</h2>
              <Button
                variant="outline"
                size="sm"
                onClick={() => refetchMyOrders()}
                disabled={myOrdersLoading}
              >
                <RefreshCw className={`h-4 w-4 ${myOrdersLoading ? 'animate-spin' : ''}`} />
                تحديث
              </Button>
            </div>

            {myOrdersError && (
              <Card className="border-red-200 bg-red-50">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="h-5 w-5 text-red-600" />
                    <div>
                      <p className="text-red-800 font-medium">خطأ في جلب الطلبات</p>
                      <p className="text-red-700 text-sm">{myOrdersError.message}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {categorizedOrders.accepted.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <Clock className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">لا توجد طلبات مقبولة</h3>
                  <p className="text-muted-foreground">الطلبات التي تقبلها ستظهر هنا</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {categorizedOrders.accepted.map(order => (
                  <OrderCard key={order.id} order={order} type="accepted" />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="inProgress" className="space-y-4">
            {/* محتوى مشابه لتبويب accepted */}
          </TabsContent>

          <TabsContent value="completed" className="space-y-4">
            {/* محتوى مشابه لتبويب accepted */}
          </TabsContent>
        </Tabs>
      </div>

      {/* نافذة تفاصيل الطلب */}
      <Dialog open={showOrderDetailsDialog} onOpenChange={setShowOrderDetailsDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>تفاصيل الطلب</DialogTitle>
          </DialogHeader>
          
          {selectedOrder && (
            <div className="space-y-4">
              <OrderCard order={selectedOrder} type="available" />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default DriverDashboard;
