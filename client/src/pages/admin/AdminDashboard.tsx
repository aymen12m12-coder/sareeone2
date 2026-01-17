import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { NotificationSystem } from '@/components/NotificationSystem';
import { 
  BarChart3, 
  Users, 
  ShoppingBag, 
  DollarSign, 
  LogOut,
  Package,
  Truck,
  Store,
  TrendingUp,
  Clock,
  Star,
  AlertCircle
} from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';

export default function AdminDashboard() {
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');

  const { data: dashboardData, isLoading } = useQuery({
    queryKey: ['/api/admin/dashboard'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/admin/dashboard', null, user?.token);
      return response.json();
    },
    refetchInterval: 30000, // تحديث كل 30 ثانية
  });

  const handleLogout = () => {
    logout();
  };

  const stats = dashboardData?.stats || {};
  const recentOrders = dashboardData?.recentOrders || [];

  const statCards = [
    { 
      title: 'إجمالي الطلبات', 
      value: stats.totalOrders || 0, 
      icon: ShoppingBag, 
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      change: stats.todayOrders ? `اليوم: ${stats.todayOrders}` : 'جديد',
      changeType: 'neutral'
    },
    { 
      title: 'العملاء النشطين', 
      value: stats.totalCustomers || 0, 
      icon: Users, 
      color: 'text-green-600',
      bgColor: 'bg-green-50',
      change: 'عملاء مفعلون',
      changeType: 'neutral'
    },
    { 
      title: 'إجمالي المبيعات', 
      value: `${stats.totalRevenue || 0} ريال`, 
      icon: DollarSign, 
      color: 'text-orange-600',
      bgColor: 'bg-orange-50',
      change: stats.todayRevenue ? `اليوم: ${stats.todayRevenue} ريال` : 'إجمالي',
      changeType: 'neutral'
    },
    { 
      title: 'السائقين المتاحين', 
      value: stats.activeDrivers || 0, 
      icon: Truck, 
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
      change: 'متاحين الآن',
      changeType: 'neutral'
    },
  ];

  const todayStats = [
    { title: 'طلبات اليوم', value: stats.todayOrders || 0, icon: Package },
    { title: 'مبيعات اليوم', value: `${stats.todayRevenue || 0} ريال`, icon: TrendingUp },
    { title: 'طلبات معلقة', value: stats.pendingOrders || 0, icon: Clock },
    { title: 'المطاعم النشطة', value: stats.totalRestaurants || 0, icon: Store },
  ];

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
      {/* Header */}
      <header className="bg-white shadow-sm border-b sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center">
                <BarChart3 className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">لوحة التحكم</h1>
                <p className="text-sm text-gray-500">مرحباً {user?.name}</p>
              </div>
            </div>
            <Button 
              variant="outline" 
              onClick={handleLogout}
              className="flex items-center gap-2 hover:bg-red-50 hover:text-red-600 hover:border-red-200"
            >
              <LogOut className="h-4 w-4" />
              تسجيل الخروج
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Notification System */}
        <div className="mb-8">
          <NotificationSystem userType="admin" />
        </div>

        {/* Main Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {statCards.map((stat, index) => {
            const Icon = stat.icon;
            return (
              <Card key={index} className="hover:shadow-lg transition-shadow duration-200">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600 mb-1">{stat.title}</p>
                      <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                      <div className="flex items-center mt-2">
                        <span className={`text-xs font-medium ${
                          stat.changeType === 'positive' ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {stat.change}
                        </span>
                        <span className="text-xs text-gray-500 mr-1">من الشهر الماضي</span>
                      </div>
                    </div>
                    <div className={`w-12 h-12 ${stat.bgColor} rounded-lg flex items-center justify-center`}>
                      <Icon className={`h-6 w-6 ${stat.color}`} />
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Today's Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {todayStats.map((stat, index) => {
            const Icon = stat.icon;
            return (
              <Card key={index} className="bg-gradient-to-br from-white to-gray-50">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <Icon className="h-5 w-5 text-gray-600" />
                    <div>
                      <p className="text-xs text-gray-600">{stat.title}</p>
                      <p className="text-lg font-bold text-gray-900">{stat.value}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Content Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-2 lg:grid-cols-4 h-auto p-1">
            <TabsTrigger value="overview" className="py-3">نظرة عامة</TabsTrigger>
            <TabsTrigger value="orders" className="py-3">الطلبات الحديثة</TabsTrigger>
            <TabsTrigger value="restaurants" className="py-3">المطاعم</TabsTrigger>
            <TabsTrigger value="drivers" className="py-3">السائقين</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Recent Orders */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Clock className="h-5 w-5" />
                    الطلبات الحديثة
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {recentOrders.slice(0, 5).map((order: any, index: number) => (
                      <div key={order.id || index} className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50">
                        <div>
                          <p className="font-medium">طلب #{order.orderNumber || `${1000 + index}`}</p>
                          <p className="text-sm text-gray-600">{order.customerName || 'عميل'}</p>
                          <p className="text-xs text-gray-500">
                            {order.createdAt ? new Date(order.createdAt).toLocaleString('ar-YE') : 'الآن'}
                          </p>
                        </div>
                        <div className="text-left">
                          <Badge variant={
                            order.status === 'delivered' ? 'default' :
                            order.status === 'pending' ? 'secondary' :
                            order.status === 'cancelled' ? 'destructive' : 'outline'
                          }>
                            {order.status === 'pending' ? 'معلق' :
                             order.status === 'confirmed' ? 'مؤكد' :
                             order.status === 'preparing' ? 'قيد التحضير' :
                             order.status === 'ready' ? 'جاهز' :
                             order.status === 'picked_up' ? 'تم الاستلام' :
                             order.status === 'delivered' ? 'تم التوصيل' :
                             order.status === 'cancelled' ? 'ملغي' : order.status}
                          </Badge>
                          <p className="text-sm font-medium mt-1">{order.total || 0} ريال</p>
                        </div>
                      </div>
                    ))}
                    {recentOrders.length === 0 && (
                      <div className="text-center py-8 text-gray-500">
                        <Package className="h-12 w-12 mx-auto mb-2 opacity-50" />
                        <p>لا توجد طلبات حديثة</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* System Status */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <AlertCircle className="h-5 w-5" />
                    حالة النظام
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                        <span>الخادم</span>
                      </div>
                      <Badge variant="default" className="bg-green-100 text-green-800">
                        يعمل بشكل طبيعي
                      </Badge>
                    </div>
                    
                    <div className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                        <span>قاعدة البيانات</span>
                      </div>
                      <Badge variant="default" className="bg-green-100 text-green-800">
                        متصلة
                      </Badge>
                    </div>
                    
                    <div className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                        <span>الإشعارات</span>
                      </div>
                      <Badge variant="secondary">
                        {stats.pendingOrders || 0} معلق
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="orders">
            <Card>
              <CardHeader>
                <CardTitle>جميع الطلبات</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {recentOrders.map((order: any, index: number) => (
                    <div key={order.id || index} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50">
                      <div className="flex-1">
                        <div className="flex items-center gap-4">
                          <div>
                            <p className="font-medium">طلب #{order.orderNumber || `${1000 + index}`}</p>
                            <p className="text-sm text-gray-600">{order.customerName || 'عميل'}</p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-600">الهاتف: {order.customerPhone || 'غير محدد'}</p>
                            <p className="text-xs text-gray-500">
                              {order.createdAt ? new Date(order.createdAt).toLocaleString('ar-YE') : 'الآن'}
                            </p>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-left">
                          <p className="font-medium">{order.total || 0} ريال</p>
                          <p className="text-xs text-gray-500">
                            {order.items ? JSON.parse(order.items).length : 0} عنصر
                          </p>
                        </div>
                        <Badge variant={
                          order.status === 'delivered' ? 'default' :
                          order.status === 'pending' ? 'secondary' :
                          order.status === 'cancelled' ? 'destructive' : 'outline'
                        }>
                          {order.status === 'pending' ? 'معلق' :
                           order.status === 'confirmed' ? 'مؤكد' :
                           order.status === 'preparing' ? 'قيد التحضير' :
                           order.status === 'ready' ? 'جاهز' :
                           order.status === 'picked_up' ? 'تم الاستلام' :
                           order.status === 'delivered' ? 'تم التوصيل' :
                           order.status === 'cancelled' ? 'ملغي' : order.status}
                        </Badge>
                      </div>
                    </div>
                  ))}
                  {recentOrders.length === 0 && (
                    <div className="text-center py-12 text-gray-500">
                      <ShoppingBag className="h-16 w-16 mx-auto mb-4 opacity-50" />
                      <p className="text-lg font-medium mb-2">لا توجد طلبات</p>
                      <p className="text-sm">ستظهر الطلبات هنا عند إنشائها</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="restaurants">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Store className="h-5 w-5" />
                  المطاعم المسجلة
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-12 text-gray-500">
                  <Store className="h-16 w-16 mx-auto mb-4 opacity-50" />
                  <p className="text-lg font-medium mb-2">إدارة المطاعم</p>
                  <p className="text-sm mb-4">يمكنك إدارة المطاعم من القائمة الجانبية</p>
                  <Button variant="outline">
                    انتقل إلى إدارة المطاعم
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="drivers">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Truck className="h-5 w-5" />
                  السائقين المسجلين
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-12 text-gray-500">
                  <Truck className="h-16 w-16 mx-auto mb-4 opacity-50" />
                  <p className="text-lg font-medium mb-2">إدارة السائقين</p>
                  <p className="text-sm mb-4">يمكنك إدارة السائقين من القائمة الجانبية</p>
                  <Button variant="outline">
                    انتقل إلى إدارة السائقين
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}