import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { MapPin, Package, Phone, Check, X, Navigation, DollarSign, Clock, User, Star, LogOut, Truck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/context/AuthContext';
import { useLocation } from 'wouter';

export default function Delivery() {
  const { toast } = useToast();
  const { logout, user } = useAuth();
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  
  const [driverStatus, setDriverStatus] = useState(false);

  // جلب بيانات السائق
  const { data: driverData } = useQuery({
    queryKey: [`/api/driver/dashboard?driverId=${user?.id}`],
    queryFn: async () => {
      if (!user?.id) return null;
      const response = await fetch(`/api/driver/dashboard?driverId=${user.id}`);
      if (!response.ok) return null;
      return response.json();
    },
    enabled: !!user?.id,
  });

  // جلب الطلبات المتاحة
  const { data: availableOrders = [], isLoading: ordersLoading } = useQuery({
    queryKey: [`/api/driver/orders?driverId=${user?.id}&type=available`],
    queryFn: async () => {
      if (!user?.id) return [];
      const response = await fetch(`/api/driver/orders?driverId=${user.id}&type=available`);
      if (!response.ok) return [];
      return response.json();
    },
    enabled: !!user?.id && driverStatus,
    refetchInterval: 5000,
  });

  // جلب الطلبات النشطة
  const { data: activeOrders = [] } = useQuery({
    queryKey: [`/api/driver/orders?driverId=${user?.id}&type=active`],
    queryFn: async () => {
      if (!user?.id) return [];
      const response = await fetch(`/api/driver/orders?driverId=${user.id}&type=active`);
      if (!response.ok) return [];
      return response.json();
    },
    enabled: !!user?.id,
    refetchInterval: 5000,
  });

  // قبول طلب
  const acceptOrderMutation = useMutation({
    mutationFn: async (orderId: string) => {
      const response = await fetch(`/api/driver/orders/${orderId}/assign-driver`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ driverId: user?.id }),
      });
      if (!response.ok) throw new Error('فشل في قبول الطلب');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/driver/orders`] });
      toast({ title: 'تم قبول الطلب بنجاح', description: 'يمكنك الآن بدء التوصيل' });
      setDriverStatus(false); // يصبح مشغول
    },
    onError: () => {
      toast({ title: 'خطأ', description: 'فشل في قبول الطلب', variant: 'destructive' });
    },
  });

  // تحديث حالة الطلب
  const updateOrderStatusMutation = useMutation({
    mutationFn: async ({ orderId, status }: { orderId: string; status: string }) => {
      const response = await fetch(`/api/driver/orders/${orderId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ driverId: user?.id, status }),
      });
      if (!response.ok) throw new Error('فشل في تحديث حالة الطلب');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/driver/orders`] });
      queryClient.invalidateQueries({ queryKey: [`/api/driver/dashboard`] });
      toast({ title: 'تم تحديث حالة الطلب' });
    },
    onError: () => {
      toast({ title: 'خطأ', description: 'فشل في تحديث حالة الطلب', variant: 'destructive' });
    },
  });

  // تحديث حالة السائق
  const updateDriverStatusMutation = useMutation({
    mutationFn: async (isAvailable: boolean) => {
      const response = await fetch(`/api/driver/profile`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ driverId: user?.id, isAvailable }),
      });
      if (!response.ok) throw new Error('فشل في تحديث الحالة');
      return response.json();
    },
    onSuccess: (_, isAvailable) => {
      setDriverStatus(isAvailable);
      toast({
        title: isAvailable ? 'أنت متاح الآن' : 'أنت غير متاح',
        description: isAvailable ? 'ستتلقى طلبات جديدة' : 'لن تتلقى طلبات جديدة',
      });
    },
    onError: () => {
      toast({ title: 'خطأ', description: 'فشل في تحديث الحالة', variant: 'destructive' });
    },
  });

  const handleLogout = () => {
    logout();
    localStorage.removeItem('driver_token');
    localStorage.removeItem('driver_user');
    setLocation('/driver-login');
  };

  useEffect(() => {
    if (!user || user.userType !== 'driver') {
      setLocation('/driver-login');
      return;
    }

    if (driverData?.driver) {
      setDriverStatus(driverData.driver.isAvailable);
    }
  }, [user, setLocation, driverData]);

  if (!user || !driverData) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <p>جاري تحميل البيانات...</p>
        </div>
      </div>
    );
  }

  const stats = driverData.stats || {
    todayOrders: 0,
    todayEarnings: 0,
    completedToday: 0,
    totalEarnings: 0,
    availableBalance: 0,
    averageRating: 4.5,
  };

  const driver = driverData.driver || {
    name: 'سائق',
    phone: '',
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card border-b border-border p-4 sticky top-0 z-40">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-primary rounded-full flex items-center justify-center">
              <User className="h-6 w-6 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-foreground">{driver.name}</h1>
              <p className="text-sm text-muted-foreground">سائق توصيل</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Label htmlFor="driver-status" className="text-sm text-foreground">متاح</Label>
              <Switch
                id="driver-status"
                checked={driverStatus}
                onCheckedChange={(checked) => updateDriverStatusMutation.mutate(checked)}
                disabled={updateDriverStatusMutation.isPending || activeOrders.length > 0}
              />
            </div>
            <Button variant="outline" size="sm" onClick={handleLogout}>
              <LogOut className="h-4 w-4 ml-2" />
              تسجيل الخروج
            </Button>
          </div>
        </div>
      </header>

      <div className="p-4 space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-2 gap-4">
          <Card>
            <CardContent className="p-4 text-center">
              <DollarSign className="h-8 w-8 text-green-500 mx-auto mb-2" />
              <h3 className="text-lg font-bold text-foreground">
                {stats.todayEarnings} ريال
              </h3>
              <p className="text-sm text-muted-foreground">أرباح اليوم</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4 text-center">
              <Package className="h-8 w-8 text-primary mx-auto mb-2" />
              <h3 className="text-lg font-bold text-foreground">
                {stats.todayOrders}
              </h3>
              <p className="text-sm text-muted-foreground">طلبات اليوم</p>
            </CardContent>
          </Card>
        </div>

        {/* Active Orders */}
        {activeOrders.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5 text-primary" />
                الطلبات الحالية
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {activeOrders.map((order: any) => (
                <div key={order.id} className="border border-border rounded-lg p-4">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h4 className="font-bold text-foreground">طلب #{order.orderNumber}</h4>
                      <p className="text-sm text-muted-foreground">{order.customerName}</p>
                    </div>
                    <Badge className="bg-orange-500 hover:bg-orange-500">جاري التوصيل</Badge>
                  </div>
                  
                  <div className="space-y-2 mb-4">
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm text-foreground">{order.deliveryAddress}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm text-foreground">{order.customerPhone}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <DollarSign className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm text-green-600">عمولة: {order.driverEarnings} ريال</span>
                    </div>
                  </div>
                  
                  <div className="flex gap-2">
                    <Button 
                      className="flex-1 gap-2"
                      onClick={() => window.open(`tel:${order.customerPhone}`)}
                    >
                      <Phone className="h-4 w-4" />
                      اتصال بالعميل
                    </Button>
                    
                    <Button 
                      className="flex-1 gap-2 bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100"
                      onClick={() => {
                        if (order.customerLocationLat && order.customerLocationLng) {
                          window.open(`https://maps.google.com/?q=${order.customerLocationLat},${order.customerLocationLng}`);
                        } else {
                          window.open(`https://maps.google.com/?q=${encodeURIComponent(order.deliveryAddress)}`);
                        }
                      }}
                    >
                      <Navigation className="h-4 w-4" />
                      تتبع الموقع
                    </Button>
                    
                    {order.status === 'ready' && (
                      <Button 
                        variant="outline"
                        className="flex-1 gap-2"
                        onClick={() => updateOrderStatusMutation.mutate({ 
                          orderId: order.id, 
                          status: 'picked_up' 
                        })}
                      >
                        تم الاستلام
                      </Button>
                    )}
                    
                    {order.status === 'picked_up' && (
                      <Button 
                        variant="outline"
                        className="flex-1 gap-2"
                        onClick={() => updateOrderStatusMutation.mutate({ 
                          orderId: order.id, 
                          status: 'on_way' 
                        })}
                      >
                        في الطريق
                      </Button>
                    )}
                    
                    {order.status === 'on_way' && (
                      <Button 
                        className="flex-1 gap-2 bg-green-600 hover:bg-green-700"
                        onClick={() => updateOrderStatusMutation.mutate({ 
                          orderId: order.id, 
                          status: 'delivered' 
                        })}
                      >
                        <Check className="h-4 w-4" />
                        تم التسليم
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Available Orders */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-primary" />
              الطلبات المتاحة
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!driverStatus ? (
              <div className="text-center py-8">
                <Clock className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">قم بتفعيل حالة التوفر لاستقبال الطلبات</p>
              </div>
            ) : ordersLoading ? (
              <div className="space-y-4">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="border border-border rounded-lg p-4 animate-pulse">
                    <div className="h-4 bg-muted rounded w-3/4 mb-2" />
                    <div className="h-3 bg-muted rounded w-1/2 mb-3" />
                    <div className="h-3 bg-muted rounded w-2/3" />
                  </div>
                ))}
              </div>
            ) : availableOrders.length > 0 ? (
              <div className="space-y-4">
                {availableOrders.map((order: any) => (
                  <div key={order.id} className="border border-border rounded-lg p-4">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h4 className="font-bold text-foreground">طلب #{order.orderNumber}</h4>
                        <p className="text-sm text-muted-foreground">{order.customerName}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-primary">{order.totalAmount} ريال</p>
                        <p className="text-sm text-muted-foreground">العمولة: {order.driverEarnings} ريال</p>
                      </div>
                    </div>
                    
                    <div className="space-y-2 mb-4">
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm text-foreground">{order.deliveryAddress}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Phone className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm text-foreground">{order.customerPhone}</span>
                      </div>
                    </div>
                    
                    <div className="flex gap-2">
                      <Button 
                        className="flex-1"
                        onClick={() => acceptOrderMutation.mutate(order.id)}
                        disabled={acceptOrderMutation.isPending || activeOrders.length > 0}
                      >
                        قبول الطلب
                      </Button>
                      <Button 
                        variant="outline"
                        onClick={() => window.open(`https://maps.google.com/?q=${encodeURIComponent(order.deliveryAddress)}`)}
                      >
                        عرض الموقع
                      </Button>
                    </div>
                    
                    {activeOrders.length > 0 && (
                      <div className="mt-2 text-sm text-yellow-600">
                        ⚠️ لديك طلب نشط. أكمل التوصيل الحالي قبل قبول طلب جديد
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">لا توجد طلبات متاحة في الوقت الحالي</p>
                <p className="text-sm text-muted-foreground mt-2">سيتم إشعارك عند توفر طلبات جديدة</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Earnings Summary */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Star className="h-5 w-5 text-primary" />
              ملخص الأرباح
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4 text-center">
              <div>
                <p className="text-sm text-muted-foreground">الرصيد المتاح</p>
                <p className="text-lg font-bold text-foreground">{stats.availableBalance} ريال</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">إجمالي الأرباح</p>
                <p className="text-lg font-bold text-foreground">{stats.totalEarnings} ريال</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">مكتملة اليوم</p>
                <p className="text-lg font-bold text-foreground">{stats.completedToday}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">التقييم</p>
                <p className="text-lg font-bold text-foreground">{stats.averageRating.toFixed(1)} ⭐</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
