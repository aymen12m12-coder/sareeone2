import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import DriverMapView from '@/components/maps/DriverMapView';
import {
  Truck,
  MapPin,
  Clock,
  DollarSign,
  LogOut,
  Navigation,
  Phone,
  CheckCircle,
  Package,
  TrendingUp,
  Activity,
  Menu,
  User,
  Calendar,
  Bell,
  Settings,
  History,
  MapPinned
} from 'lucide-react';

interface Order {
  id: string;
  orderNumber: string;
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  deliveryAddress: string;
  customerLocationLat?: string;
  customerLocationLng?: string;
  notes?: string;
  paymentMethod: string;
  status: string;
  items: string;
  subtotal: string;
  deliveryFee: string;
  total: string;
  totalAmount: string;
  estimatedTime?: string;
  driverEarnings: string;
  restaurantId: string;
  driverId?: string;
  createdAt: Date;
  updatedAt: Date;
}

interface DashboardStats {
  todayOrders: number;
  todayEarnings: number;
  completedToday: number;
  totalOrders: number;
  totalEarnings: number;
  averageRating: number;
}

interface EnhancedDriverDashboardProps {
  driverId: string;
  onLogout: () => void;
}

export default function EnhancedDriverDashboard({ driverId, onLogout }: EnhancedDriverDashboardProps) {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [driverStatus, setDriverStatus] = useState<'available' | 'busy' | 'offline'>('available');
  const [currentLocation, setCurrentLocation] = useState<[number, number] | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch dashboard data
  const { data: dashboardData, isLoading } = useQuery({
    queryKey: [`/api/driver/dashboard?driverId=${driverId}`],
    queryFn: async () => {
      const response = await fetch(`/api/driver/dashboard?driverId=${driverId}`);
      if (!response.ok) throw new Error('Failed to fetch dashboard data');
      return response.json();
    },
    refetchInterval: 15000, // Refresh every 15 seconds
  });

  // Fetch available orders
  const { data: availableOrders = [], refetch: refetchAvailableOrders } = useQuery<Order[]>({
    queryKey: [`/api/orders?available=true`],
    refetchInterval: 10000,
  });

  // Fetch driver's current orders
  const { data: myOrders = [] } = useQuery<Order[]>({
    queryKey: [`/api/orders?driverId=${driverId}`],
    refetchInterval: 10000,
  });

  // Accept order mutation
  const acceptOrderMutation = useMutation({
    mutationFn: async (orderId: string) => {
      const response = await fetch(`/api/orders/${orderId}/assign-driver`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ driverId }),
      });
      if (!response.ok) throw new Error('Failed to accept order');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/orders`] });
      queryClient.invalidateQueries({ queryKey: [`/api/driver/dashboard`] });
      toast({ title: 'تم قبول الطلب بنجاح', description: 'يمكنك الآن البدء في التوصيل' });
    },
    onError: (error: any) => {
      toast({
        title: 'فشل في قبول الطلب',
        description: error.message,
        variant: 'destructive'
      });
    },
  });

  // Update order status mutation
  const updateOrderStatusMutation = useMutation({
    mutationFn: async ({ orderId, status }: { orderId: string; status: string }) => {
      const response = await fetch(`/api/orders/${orderId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status,
          updatedBy: driverId,
          updatedByType: 'driver'
        }),
      });
      if (!response.ok) throw new Error('Failed to update order status');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/orders`] });
      queryClient.invalidateQueries({ queryKey: [`/api/driver/dashboard`] });
      toast({ title: 'تم تحديث حالة الطلب بنجاح' });
    },
    onError: () => {
      toast({ title: 'فشل في تحديث حالة الطلب', variant: 'destructive' });
    },
  });

  // Get current location
  useEffect(() => {
    if (navigator.geolocation) {
      const watchId = navigator.geolocation.watchPosition(
        (position) => {
          setCurrentLocation([position.coords.latitude, position.coords.longitude]);
        },
        (error) => {
          console.error('خطأ في الحصول على الموقع:', error);
        },
        {
          enableHighAccuracy: true,
          timeout: 5000,
          maximumAge: 0,
        }
      );

      return () => navigator.geolocation.clearWatch(watchId);
    }
  }, []);

  const formatCurrency = (amount: number | string) => {
    const num = typeof amount === 'string' ? parseFloat(amount) : amount;
    return `${num.toFixed(2)} ريال`;
  };

  const formatDate = (dateString: string | Date) => {
    return new Date(dateString).toLocaleDateString('ar-SA', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'available': return 'bg-green-500 text-white';
      case 'busy': return 'bg-orange-500 text-white';
      case 'offline': return 'bg-gray-500 text-white';
      default: return 'bg-gray-500 text-white';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'available': return 'متاح';
      case 'busy': return 'مشغول';
      case 'offline': return 'غير متاح';
      default: return 'غير معروف';
    }
  };

  const getOrderStatusBadge = (status: string) => {
    const config: { [key: string]: { label: string; color: string } } = {
      pending: { label: 'معلق', color: 'bg-yellow-500' },
      confirmed: { label: 'مؤكد', color: 'bg-blue-500' },
      preparing: { label: 'قيد التحضير', color: 'bg-orange-500' },
      ready: { label: 'جاهز', color: 'bg-green-500' },
      picked_up: { label: 'تم الاستلام', color: 'bg-blue-600' },
      on_way: { label: 'في الطريق', color: 'bg-purple-500' },
      delivered: { label: 'تم التوصيل', color: 'bg-green-600' },
      cancelled: { label: 'ملغي', color: 'bg-red-500' },
    };
    const { label, color } = config[status] || config.pending;
    return <Badge className={`${color} text-white`}>{label}</Badge>;
  };

  const stats: DashboardStats = dashboardData?.stats || {
    todayOrders: 0,
    todayEarnings: 0,
    completedToday: 0,
    totalOrders: 0,
    totalEarnings: 0,
    averageRating: 0,
  };

  // Categorize orders
  const activeOrders = myOrders.filter(order =>
    ['preparing', 'ready', 'picked_up', 'on_way'].includes(order.status)
  );

  const completedOrders = myOrders.filter(order => order.status === 'delivered');
  const inProgressOrders = myOrders.filter(order => ['picked_up', 'on_way'].includes(order.status));

  // Orders for map
  const ordersForMap = activeOrders
    .filter(order => order.customerLocationLat && order.customerLocationLng)
    .map(order => ({
      ...order,
      restaurantLat: '15.3694',
      restaurantLng: '44.1910',
    }));

  const Sidebar = () => (
    <div className="flex flex-col h-full bg-white border-l">
      <div className="p-6 border-b">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-green-600 rounded-full flex items-center justify-center">
            <Truck className="h-6 w-6 text-white" />
          </div>
          <div>
            <h2 className="text-lg font-bold">تطبيق السائق</h2>
            <p className="text-sm text-gray-500">ID: {driverId}</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 p-4">
        <div className="space-y-2">
          <Button
            variant={activeTab === 'dashboard' ? 'default' : 'ghost'}
            className="w-full justify-start gap-3"
            onClick={() => { setActiveTab('dashboard'); setSidebarOpen(false); }}
          >
            <Activity className="h-5 w-5" />
            الرئيسية
          </Button>

          <Button
            variant={activeTab === 'available' ? 'default' : 'ghost'}
            className="w-full justify-start gap-3"
            onClick={() => { setActiveTab('available'); setSidebarOpen(false); }}
          >
            <Bell className="h-5 w-5" />
            الطلبات المتاحة
            {availableOrders.length > 0 && (
              <Badge className="mr-auto bg-red-500">{availableOrders.length}</Badge>
            )}
          </Button>

          <Button
            variant={activeTab === 'active' ? 'default' : 'ghost'}
            className="w-full justify-start gap-3"
            onClick={() => { setActiveTab('active'); setSidebarOpen(false); }}
          >
            <Package className="h-5 w-5" />
            الطلبات النشطة
            {activeOrders.length > 0 && (
              <Badge className="mr-auto">{activeOrders.length}</Badge>
            )}
          </Button>

          <Button
            variant={activeTab === 'map' ? 'default' : 'ghost'}
            className="w-full justify-start gap-3"
            onClick={() => { setActiveTab('map'); setSidebarOpen(false); }}
          >
            <MapPinned className="h-5 w-5" />
            الخريطة
          </Button>

          <Button
            variant={activeTab === 'history' ? 'default' : 'ghost'}
            className="w-full justify-start gap-3"
            onClick={() => { setActiveTab('history'); setSidebarOpen(false); }}
          >
            <History className="h-5 w-5" />
            السجل
          </Button>

          <Button
            variant={activeTab === 'stats' ? 'default' : 'ghost'}
            className="w-full justify-start gap-3"
            onClick={() => { setActiveTab('stats'); setSidebarOpen(false); }}
          >
            <TrendingUp className="h-5 w-5" />
            الإحصائيات
          </Button>

          <Button
            variant={activeTab === 'profile' ? 'default' : 'ghost'}
            className="w-full justify-start gap-3"
            onClick={() => { setActiveTab('profile'); setSidebarOpen(false); }}
          >
            <User className="h-5 w-5" />
            الملف الشخصي
          </Button>
        </div>
      </nav>

      <div className="p-4 border-t">
        <Button
          variant="outline"
          onClick={onLogout}
          className="w-full flex items-center gap-2 text-red-600 hover:bg-red-50"
        >
          <LogOut className="h-4 w-4" />
          تسجيل الخروج
        </Button>
      </div>
    </div>
  );

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-gray-600">جاري تحميل البيانات...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50" dir="rtl">
      {/* Mobile Header */}
      <header className="bg-white shadow-sm border-b sticky top-0 z-10 lg:hidden">
        <div className="flex justify-between items-center h-16 px-4">
          <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon">
                <Menu className="h-6 w-6" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="p-0 w-80">
              <Sidebar />
            </SheetContent>
          </Sheet>

          <div className="flex items-center gap-3">
            <Truck className="h-6 w-6 text-green-600" />
            <h1 className="text-lg font-bold">تطبيق السائق</h1>
          </div>

          <Badge className={getStatusColor(driverStatus)}>
            {getStatusText(driverStatus)}
          </Badge>
        </div>
      </header>

      {/* Desktop Layout */}
      <div className="flex h-screen">
        {/* Desktop Sidebar */}
        <aside className="hidden lg:block w-64 bg-white border-l">
          <Sidebar />
        </aside>

        {/* Main Content */}
        <main className="flex-1 overflow-auto">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            {/* Desktop Header */}
            <div className="hidden lg:flex justify-between items-center mb-6">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">لوحة التحكم</h1>
                <p className="text-sm text-gray-500">مرحباً بك في تطبيق السائق</p>
              </div>
              <Badge className={getStatusColor(driverStatus)}>
                {getStatusText(driverStatus)}
              </Badge>
            </div>

            {/* Dashboard Content */}
            <TabsContent value="dashboard" className={activeTab === 'dashboard' ? 'block' : 'hidden'}>
              {/* Quick Stats */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                        <Package className="h-5 w-5 text-blue-600" />
                      </div>
                      <div>
                        <p className="text-xs text-gray-600">طلبات اليوم</p>
                        <p className="text-xl font-bold">{stats.todayOrders}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                        <DollarSign className="h-5 w-5 text-green-600" />
                      </div>
                      <div>
                        <p className="text-xs text-gray-600">أرباح اليوم</p>
                        <p className="text-xl font-bold">{formatCurrency(stats.todayEarnings)}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                        <TrendingUp className="h-5 w-5 text-orange-600" />
                      </div>
                      <div>
                        <p className="text-xs text-gray-600">طلبات نشطة</p>
                        <p className="text-xl font-bold">{activeOrders.length}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                        <Activity className="h-5 w-5 text-purple-600" />
                      </div>
                      <div>
                        <p className="text-xs text-gray-600">مكتملة اليوم</p>
                        <p className="text-xl font-bold">{stats.completedToday}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Active Orders */}
              {activeOrders.length > 0 && (
                <Card className="mb-6 border-green-200 bg-green-50">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-green-800">
                      <Package className="h-5 w-5" />
                      الطلبات النشطة ({activeOrders.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {activeOrders.map((order) => (
                        <div key={order.id} className="bg-white rounded-lg p-4 border">
                          <div className="flex justify-between items-start mb-3">
                            <div>
                              <p className="font-bold">طلب #{order.orderNumber}</p>
                              <p className="text-sm text-gray-600">{order.customerName}</p>
                            </div>
                            {getOrderStatusBadge(order.status)}
                          </div>

                          <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
                            <MapPin className="h-4 w-4" />
                            {order.deliveryAddress}
                          </div>

                          <div className="flex gap-2 mt-3">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => window.open(`tel:${order.customerPhone}`)}
                              className="gap-2"
                            >
                              <Phone className="h-4 w-4" />
                              اتصال
                            </Button>

                            {order.customerLocationLat && order.customerLocationLng && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  const url = `https://www.google.com/maps/dir/?api=1&destination=${order.customerLocationLat},${order.customerLocationLng}`;
                                  window.open(url, '_blank');
                                }}
                                className="gap-2"
                              >
                                <Navigation className="h-4 w-4" />
                                توجيه
                              </Button>
                            )}

                            {order.status === 'preparing' && (
                              <Button
                                size="sm"
                                onClick={() => updateOrderStatusMutation.mutate({
                                  orderId: order.id,
                                  status: 'picked_up'
                                })}
                                className="gap-2 bg-blue-600 hover:bg-blue-700 mr-auto"
                              >
                                تم الاستلام
                              </Button>
                            )}

                            {order.status === 'picked_up' && (
                              <Button
                                size="sm"
                                onClick={() => updateOrderStatusMutation.mutate({
                                  orderId: order.id,
                                  status: 'on_way'
                                })}
                                className="gap-2 bg-purple-600 hover:bg-purple-700 mr-auto"
                              >
                                في الطريق
                              </Button>
                            )}

                            {order.status === 'on_way' && (
                              <Button
                                size="sm"
                                onClick={() => updateOrderStatusMutation.mutate({
                                  orderId: order.id,
                                  status: 'delivered'
                                })}
                                className="gap-2 bg-green-600 hover:bg-green-700 mr-auto"
                              >
                                <CheckCircle className="h-4 w-4" />
                                تم التسليم
                              </Button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Available Orders Preview */}
              {availableOrders.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Bell className="h-5 w-5" />
                      طلبات متاحة ({availableOrders.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {availableOrders.slice(0, 3).map((order) => (
                        <div key={order.id} className="flex justify-between items-center p-3 border rounded-lg hover:bg-gray-50">
                          <div className="flex-1">
                            <p className="font-medium">طلب #{order.orderNumber}</p>
                            <p className="text-sm text-gray-600">{order.deliveryAddress}</p>
                            <p className="text-sm text-green-600">عمولة: {formatCurrency(order.driverEarnings)}</p>
                          </div>
                          <Button
                            onClick={() => acceptOrderMutation.mutate(order.id)}
                            disabled={acceptOrderMutation.isPending}
                            className="gap-2 bg-green-600 hover:bg-green-700"
                          >
                            <CheckCircle className="h-4 w-4" />
                            قبول
                          </Button>
                        </div>
                      ))}
                    </div>

                    {availableOrders.length > 3 && (
                      <Button
                        variant="outline"
                        onClick={() => setActiveTab('available')}
                        className="w-full mt-3"
                      >
                        عرض جميع الطلبات المتاحة ({availableOrders.length})
                      </Button>
                    )}
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            {/* Available Orders Tab */}
            <TabsContent value="available" className={activeTab === 'available' ? 'block' : 'hidden'}>
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Bell className="h-5 w-5" />
                    الطلبات المتاحة ({availableOrders.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {availableOrders.length === 0 ? (
                    <div className="text-center py-12">
                      <Bell className="h-16 w-16 mx-auto mb-4 text-gray-300" />
                      <p className="text-gray-500">لا توجد طلبات متاحة حالياً</p>
                      <p className="text-sm text-gray-400">سيتم إشعارك عند توفر طلبات جديدة</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {availableOrders.map((order) => (
                        <div key={order.id} className="border rounded-lg p-4 hover:bg-gray-50">
                          <div className="flex justify-between items-start mb-3">
                            <div>
                              <p className="font-bold text-lg">طلب #{order.orderNumber}</p>
                              <p className="text-sm text-gray-600">{formatDate(order.createdAt)}</p>
                            </div>
                            <div className="text-left">
                              <p className="font-bold text-green-600">{formatCurrency(order.totalAmount)}</p>
                              <p className="text-sm text-gray-600">عمولة: {formatCurrency(order.driverEarnings)}</p>
                            </div>
                          </div>

                          <div className="space-y-2 mb-3">
                            <div className="flex items-start gap-2">
                              <User className="h-4 w-4 text-gray-500 mt-0.5" />
                              <div>
                                <p className="text-sm font-medium">{order.customerName}</p>
                                <p className="text-sm text-gray-600">{order.customerPhone}</p>
                              </div>
                            </div>

                            <div className="flex items-start gap-2">
                              <MapPin className="h-4 w-4 text-gray-500 mt-0.5" />
                              <p className="text-sm text-gray-600">{order.deliveryAddress}</p>
                            </div>

                            {order.notes && (
                              <div className="flex items-start gap-2">
                                <Package className="h-4 w-4 text-gray-500 mt-0.5" />
                                <p className="text-sm text-gray-600">{order.notes}</p>
                              </div>
                            )}
                          </div>

                          <Button
                            onClick={() => acceptOrderMutation.mutate(order.id)}
                            disabled={acceptOrderMutation.isPending}
                            className="w-full gap-2 bg-green-600 hover:bg-green-700"
                          >
                            <CheckCircle className="h-4 w-4" />
                            قبول الطلب
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Active Orders Tab */}
            <TabsContent value="active" className={activeTab === 'active' ? 'block' : 'hidden'}>
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Package className="h-5 w-5" />
                    الطلبات النشطة ({activeOrders.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {activeOrders.length === 0 ? (
                    <div className="text-center py-12">
                      <Package className="h-16 w-16 mx-auto mb-4 text-gray-300" />
                      <p className="text-gray-500">لا توجد طلبات نشطة</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {activeOrders.map((order) => (
                        <div key={order.id} className="border rounded-lg p-4">
                          <div className="flex justify-between items-start mb-3">
                            <div>
                              <p className="font-bold text-lg">طلب #{order.orderNumber}</p>
                              <p className="text-sm text-gray-600">{order.customerName}</p>
                            </div>
                            {getOrderStatusBadge(order.status)}
                          </div>

                          <div className="space-y-2 mb-3">
                            <div className="flex items-center gap-2">
                              <Phone className="h-4 w-4 text-gray-500" />
                              <p className="text-sm">{order.customerPhone}</p>
                            </div>

                            <div className="flex items-start gap-2">
                              <MapPin className="h-4 w-4 text-gray-500 mt-0.5" />
                              <p className="text-sm text-gray-600">{order.deliveryAddress}</p>
                            </div>

                            <div className="flex items-center gap-2">
                              <DollarSign className="h-4 w-4 text-gray-500" />
                              <p className="text-sm">المبلغ: {formatCurrency(order.totalAmount)} | عمولتك: {formatCurrency(order.driverEarnings)}</p>
                            </div>
                          </div>

                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => window.open(`tel:${order.customerPhone}`)}
                              className="gap-2"
                            >
                              <Phone className="h-4 w-4" />
                              اتصال
                            </Button>

                            {order.customerLocationLat && order.customerLocationLng && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  const url = `https://www.google.com/maps/dir/?api=1&destination=${order.customerLocationLat},${order.customerLocationLng}`;
                                  window.open(url, '_blank');
                                }}
                                className="gap-2"
                              >
                                <Navigation className="h-4 w-4" />
                                توجيه
                              </Button>
                            )}

                            {order.status === 'preparing' && (
                              <Button
                                size="sm"
                                onClick={() => updateOrderStatusMutation.mutate({
                                  orderId: order.id,
                                  status: 'picked_up'
                                })}
                                className="gap-2 bg-blue-600 hover:bg-blue-700 mr-auto"
                              >
                                تم الاستلام
                              </Button>
                            )}

                            {order.status === 'picked_up' && (
                              <Button
                                size="sm"
                                onClick={() => updateOrderStatusMutation.mutate({
                                  orderId: order.id,
                                  status: 'on_way'
                                })}
                                className="gap-2 bg-purple-600 hover:bg-purple-700 mr-auto"
                              >
                                في الطريق
                              </Button>
                            )}

                            {order.status === 'on_way' && (
                              <Button
                                size="sm"
                                onClick={() => updateOrderStatusMutation.mutate({
                                  orderId: order.id,
                                  status: 'delivered'
                                })}
                                className="gap-2 bg-green-600 hover:bg-green-700 mr-auto"
                              >
                                <CheckCircle className="h-4 w-4" />
                                تم التسليم
                              </Button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Map Tab */}
            <TabsContent value="map" className={activeTab === 'map' ? 'block' : 'hidden'}>
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MapPinned className="h-5 w-5" />
                    خريطة التوصيل
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <DriverMapView
                    orders={ordersForMap}
                    driverLocation={currentLocation}
                    height="600px"
                    onNavigate={(order) => {
                      if (order.customerLocationLat && order.customerLocationLng) {
                        const url = `https://www.google.com/maps/dir/?api=1&destination=${order.customerLocationLat},${order.customerLocationLng}`;
                        window.open(url, '_blank');
                      }
                    }}
                    onCall={(phone) => window.open(`tel:${phone}`, '_self')}
                  />
                </CardContent>
              </Card>
            </TabsContent>

            {/* History Tab */}
            <TabsContent value="history" className={activeTab === 'history' ? 'block' : 'hidden'}>
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <History className="h-5 w-5" />
                    سجل الطلبات المكتملة
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {completedOrders.length === 0 ? (
                    <div className="text-center py-12">
                      <History className="h-16 w-16 mx-auto mb-4 text-gray-300" />
                      <p className="text-gray-500">لا توجد طلبات مكتملة</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {completedOrders.map((order) => (
                        <div key={order.id} className="flex justify-between items-center p-3 border rounded-lg">
                          <div>
                            <p className="font-medium">طلب #{order.orderNumber}</p>
                            <p className="text-sm text-gray-600">{order.customerName}</p>
                            <p className="text-xs text-gray-500">{formatDate(order.createdAt)}</p>
                          </div>
                          <div className="text-left">
                            <Badge className="bg-green-600 text-white mb-1">مكتمل</Badge>
                            <p className="text-sm font-medium">{formatCurrency(order.driverEarnings)}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Stats Tab */}
            <TabsContent value="stats" className={activeTab === 'stats' ? 'block' : 'hidden'}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Calendar className="h-5 w-5" />
                      إحصائيات اليوم
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg">
                      <span>إجمالي الطلبات:</span>
                      <span className="font-bold text-lg">{stats.todayOrders}</span>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
                      <span>إجمالي الأرباح:</span>
                      <span className="font-bold text-lg text-green-600">{formatCurrency(stats.todayEarnings)}</span>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-purple-50 rounded-lg">
                      <span>طلبات مكتملة:</span>
                      <span className="font-bold text-lg">{stats.completedToday}</span>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <TrendingUp className="h-5 w-5" />
                      الإحصائيات الإجمالية
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg">
                      <span>إجمالي الطلبات:</span>
                      <span className="font-bold text-lg">{stats.totalOrders}</span>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
                      <span>إجمالي الأرباح:</span>
                      <span className="font-bold text-lg text-green-600">{formatCurrency(stats.totalEarnings)}</span>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-orange-50 rounded-lg">
                      <span>متوسط التقييم:</span>
                      <span className="font-bold text-lg">{stats.averageRating.toFixed(1)} ⭐</span>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* Profile Tab */}
            <TabsContent value="profile" className={activeTab === 'profile' ? 'block' : 'hidden'}>
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <User className="h-5 w-5" />
                    الملف الشخصي
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between items-center p-3 border rounded-lg">
                    <span className="text-gray-600">معرف السائق:</span>
                    <span className="font-medium">{driverId}</span>
                  </div>
                  <div className="flex justify-between items-center p-3 border rounded-lg">
                    <span className="text-gray-600">الحالة:</span>
                    <Badge className={getStatusColor(driverStatus)}>
                      {getStatusText(driverStatus)}
                    </Badge>
                  </div>
                  <div className="flex justify-between items-center p-3 border rounded-lg">
                    <span className="text-gray-600">إجمالي الطلبات:</span>
                    <span className="font-medium">{stats.totalOrders}</span>
                  </div>
                  <div className="flex justify-between items-center p-3 border rounded-lg">
                    <span className="text-gray-600">إجمالي الأرباح:</span>
                    <span className="font-medium text-green-600">{formatCurrency(stats.totalEarnings)}</span>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </div>
        </main>
      </div>
    </div>
  );
}
