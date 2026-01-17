import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
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
  MapPinned,
  Wallet,
  CreditCard,
  BarChart,
  RefreshCw,
  Download,
  AlertCircle,
  MessageCircle,
  Store,
  Home,
  Building,
  Navigation as NavIcon
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
  driverCommissionAmount?: string;
  driverCommissionRate?: number;
  restaurantId: string;
  restaurantName?: string;
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
  availableBalance: number;
  withdrawnAmount: number;
  totalBalance: number;
  commissionRate: number;
  successRate: number;
}

interface BalanceData {
  balance: {
    availableBalance: number;
    withdrawnAmount: number;
    totalBalance: number;
    pendingAmount: number;
  };
  totalEarnings: number;
  monthlyEarnings: number;
  transactionCount: number;
  commissionCount: number;
  transactions: any[];
  commissions: any[];
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
  const [withdrawalAmount, setWithdrawalAmount] = useState('');
  const [withdrawalNotes, setWithdrawalNotes] = useState('');
  const [showWithdrawalDialog, setShowWithdrawalDialog] = useState(false);
  const [showBalanceDialog, setShowBalanceDialog] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // جلب بيانات لوحة التحكم
  const { data: dashboardData, isLoading: dashboardLoading, refetch: refetchDashboard } = useQuery({
    queryKey: [`/api/driver/dashboard?driverId=${driverId}`],
    queryFn: async () => {
      const response = await fetch(`/api/driver/dashboard?driverId=${driverId}`);
      if (!response.ok) throw new Error('فشل في جلب بيانات لوحة التحكم');
      const data = await response.json();
      
      // تحديث حالة السائق بناءً على البيانات
      if (data.driver) {
        setDriverStatus(data.driver.isAvailable ? 'available' : 'busy');
      }
      
      return data;
    },
    refetchInterval: 15000,
  });

  // جلب بيانات الرصيد
  const { data: balanceData, isLoading: balanceLoading, refetch: refetchBalance } = useQuery<BalanceData>({
    queryKey: [`/api/driver/balance?driverId=${driverId}`],
    queryFn: async () => {
      const response = await fetch(`/api/driver/balance?driverId=${driverId}`);
      if (!response.ok) throw new Error('فشل في جلب بيانات الرصيد');
      return response.json();
    },
    enabled: activeTab === 'wallet' || showBalanceDialog,
  });

  // جلب الطلبات المتاحة
  const { data: availableOrders = [], refetch: refetchAvailableOrders } = useQuery<Order[]>({
    queryKey: [`/api/driver/orders?driverId=${driverId}&type=available`],
    queryFn: async () => {
      const response = await fetch(`/api/driver/orders?driverId=${driverId}&type=available`);
      if (!response.ok) return [];
      return response.json();
    },
    refetchInterval: 10000,
  });

  // جلب الطلبات النشطة
  const { data: activeOrders = [], refetch: refetchActiveOrders } = useQuery<Order[]>({
    queryKey: [`/api/driver/orders?driverId=${driverId}&type=active`],
    queryFn: async () => {
      const response = await fetch(`/api/driver/orders?driverId=${driverId}&type=active`);
      if (!response.ok) return [];
      return response.json();
    },
    refetchInterval: 10000,
  });

  // جلب الطلبات المكتملة
  const { data: completedOrders = [], refetch: refetchCompletedOrders } = useQuery<Order[]>({
    queryKey: [`/api/driver/orders?driverId=${driverId}&type=completed`],
    queryFn: async () => {
      const response = await fetch(`/api/driver/orders?driverId=${driverId}&type=completed`);
      if (!response.ok) return [];
      return response.json();
    },
  });

  // جلب السحوبات
  const { data: withdrawals = [], refetch: refetchWithdrawals } = useQuery({
    queryKey: [`/api/driver/withdrawals?driverId=${driverId}`],
    queryFn: async () => {
      const response = await fetch(`/api/driver/withdrawals?driverId=${driverId}`);
      if (!response.ok) return { withdrawals: [] };
      return response.json();
    },
    enabled: activeTab === 'wallet',
  });

  // طلب سحب
  const withdrawalMutation = useMutation({
    mutationFn: async ({ amount, notes }: { amount: number; notes: string }) => {
      const response = await fetch(`/api/driver/withdraw`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ driverId, amount, notes }),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'فشل في طلب السحب');
      }
      return response.json();
    },
    onSuccess: () => {
      toast({ title: 'تم تقديم طلب السحب', description: 'سيتم مراجعة الطلب من قبل الإدارة' });
      setWithdrawalAmount('');
      setWithdrawalNotes('');
      setShowWithdrawalDialog(false);
      refetchBalance();
      refetchWithdrawals();
    },
    onError: (error: any) => {
      toast({
        title: 'فشل في طلب السحب',
        description: error.message,
        variant: 'destructive'
      });
    },
  });

  // قبول طلب
  const acceptOrderMutation = useMutation({
    mutationFn: async (orderId: string) => {
      const response = await fetch(`/api/driver/orders/${orderId}/assign-driver`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ driverId }),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'فشل في قبول الطلب');
      }
      return response.json();
    },
    onSuccess: () => {
      toast({ title: 'تم قبول الطلب بنجاح', description: 'تم تعيين الطلب لك بنجاح' });
      refetchAvailableOrders();
      refetchActiveOrders();
      refetchDashboard();
      setDriverStatus('busy');
    },
    onError: (error: any) => {
      toast({
        title: 'فشل في قبول الطلب',
        description: error.message,
        variant: 'destructive'
      });
    },
  });

  // تحديث حالة الطلب
  const updateOrderStatusMutation = useMutation({
    mutationFn: async ({ orderId, status }: { orderId: string; status: string }) => {
      const response = await fetch(`/api/driver/orders/${orderId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ driverId, status }),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'فشل في تحديث حالة الطلب');
      }
      return response.json();
    },
    onSuccess: (data, variables) => {
      toast({ title: 'تم تحديث حالة الطلب بنجاح' });
      refetchActiveOrders();
      refetchCompletedOrders();
      refetchDashboard();
      
      if (variables.status === 'delivered') {
        setDriverStatus('available');
      }
    },
    onError: (error: any) => {
      toast({ title: 'فشل في تحديث حالة الطلب', description: error.message, variant: 'destructive' });
    },
  });

  // تحديث حالة السائق
  const updateDriverStatusMutation = useMutation({
    mutationFn: async (isAvailable: boolean) => {
      const response = await fetch(`/api/driver/profile`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ driverId, isAvailable }),
      });
      if (!response.ok) throw new Error('فشل في تحديث حالة السائق');
      return response.json();
    },
    onSuccess: (data, isAvailable) => {
      setDriverStatus(isAvailable ? 'available' : 'busy');
      toast({
        title: isAvailable ? 'أنت متاح الآن' : 'أنت مشغول',
        description: isAvailable ? 'ستتلقى طلبات جديدة' : 'لن تتلقى طلبات جديدة',
      });
      
      if (isAvailable) {
        refetchAvailableOrders();
      }
    },
    onError: () => {
      toast({ title: 'فشل في تحديث الحالة', variant: 'destructive' });
    },
  });

  // تحديث الموقع
  const updateLocationMutation = useMutation({
    mutationFn: async (location: string) => {
      const response = await fetch(`/api/driver/location`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ driverId, location }),
      });
      if (!response.ok) throw new Error('فشل في تحديث الموقع');
      return response.json();
    },
    onSuccess: () => {
      toast({ title: 'تم تحديث الموقع بنجاح' });
    },
  });

  // الحصول على الموقع الحالي
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          setCurrentLocation([latitude, longitude]);
          
          // تحديث الموقع في السيرفر
          updateLocationMutation.mutate(`${latitude},${longitude}`);
        },
        (error) => {
          console.error('خطأ في الحصول على الموقع:', error);
        }
      );
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
    const config: Record<string, { label: string; color: string }> = {
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
    availableBalance: 0,
    withdrawnAmount: 0,
    totalBalance: 0,
    commissionRate: 70,
    successRate: 0
  };

  const driverData = dashboardData?.driver || {
    id: driverId,
    name: 'سائق',
    phone: '',
    isAvailable: true
  };

  const handleWithdrawalSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseFloat(withdrawalAmount);
    
    if (!amount || amount <= 0) {
      toast({ title: 'خطأ', description: 'يرجى إدخال مبلغ صحيح', variant: 'destructive' });
      return;
    }
    
    if (amount > stats.availableBalance) {
      toast({ title: 'خطأ', description: 'المبلغ المطلوب أكبر من الرصيد المتاح', variant: 'destructive' });
      return;
    }
    
    withdrawalMutation.mutate({ amount, notes: withdrawalNotes });
  };

  const Sidebar = () => (
    <div className="flex flex-col h-full bg-white border-l">
      <div className="p-6 border-b">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-green-600 rounded-full flex items-center justify-center">
            <User className="h-6 w-6 text-white" />
          </div>
          <div>
            <h2 className="text-lg font-bold">{driverData.name}</h2>
            <p className="text-sm text-gray-500">سائق توصيل</p>
            <Badge className={`mt-2 ${getStatusColor(driverStatus)}`}>
              {getStatusText(driverStatus)}
            </Badge>
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
            variant={activeTab === 'wallet' ? 'default' : 'ghost'}
            className="w-full justify-start gap-3"
            onClick={() => { setActiveTab('wallet'); setSidebarOpen(false); }}
          >
            <Wallet className="h-5 w-5" />
            المحفظة
            {stats.availableBalance > 0 && (
              <Badge className="mr-auto bg-green-500">
                {formatCurrency(stats.availableBalance)}
              </Badge>
            )}
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
            <BarChart className="h-5 w-5" />
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

      <div className="p-4 border-t space-y-2">
        <Button
          variant="outline"
          onClick={() => {
            updateDriverStatusMutation.mutate(!driverData.isAvailable);
          }}
          className="w-full flex items-center gap-2"
        >
          {driverData.isAvailable ? '🔴 تعطيل الاستقبال' : '🟢 تفعيل الاستقبال'}
        </Button>
        
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

  const DashboardTab = () => (
    <div className="space-y-6">
      {/* Quick Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
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
                <p className="text-xl font-bold text-green-600">{formatCurrency(stats.todayEarnings)}</p>
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
                <p className="text-xs text-gray-600">الرصيد المتاح</p>
                <p className="text-xl font-bold text-orange-600">{formatCurrency(stats.availableBalance)}</p>
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
        <Card className="border-green-200 bg-green-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-green-800">
              <Package className="h-5 w-5" />
              الطلبات النشطة ({activeOrders.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {activeOrders.slice(0, 3).map((order) => (
                <OrderCard key={order.id} order={order} type="active" />
              ))}
              {activeOrders.length > 3 && (
                <Button
                  variant="outline"
                  onClick={() => setActiveTab('active')}
                  className="w-full"
                >
                  عرض جميع الطلبات النشطة ({activeOrders.length})
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Available Orders */}
      {availableOrders.length > 0 && driverStatus === 'available' && (
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
                <AvailableOrderCard key={order.id} order={order} />
              ))}
              {availableOrders.length > 3 && (
                <Button
                  variant="outline"
                  onClick={() => setActiveTab('available')}
                  className="w-full"
                >
                  عرض جميع الطلبات المتاحة ({availableOrders.length})
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quick Actions */}
      <div className="grid grid-cols-2 gap-4">
        <Button
          onClick={() => setActiveTab('wallet')}
          className="h-20 flex flex-col items-center justify-center gap-2"
          variant="outline"
        >
          <Wallet className="h-6 w-6" />
          <span>المحفظة</span>
          <Badge className="bg-green-500">{formatCurrency(stats.availableBalance)}</Badge>
        </Button>
        
        <Button
          onClick={() => setActiveTab('map')}
          className="h-20 flex flex-col items-center justify-center gap-2"
          variant="outline"
        >
          <MapPinned className="h-6 w-6" />
          <span>الخريطة</span>
        </Button>
      </div>
    </div>
  );

  const AvailableOrderCard = ({ order }: { order: Order }) => (
    <div className="border rounded-lg p-4 hover:bg-gray-50">
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
  );

  const OrderCard = ({ order, type }: { order: Order; type: 'active' | 'completed' }) => {
    const getNextAction = () => {
      switch (order.status) {
        case 'ready': return { label: 'تم الاستلام', status: 'picked_up' };
        case 'picked_up': return { label: 'في الطريق', status: 'on_way' };
        case 'on_way': return { label: 'تم التسليم', status: 'delivered' };
        default: return null;
      }
    };

    const nextAction = getNextAction();

    return (
      <div className="bg-white rounded-lg p-4 border">
        <div className="flex justify-between items-start mb-3">
          <div>
            <p className="font-bold">طلب #{order.orderNumber}</p>
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
              <NavIcon className="h-4 w-4" />
              توجيه
            </Button>
          )}

          {type === 'active' && nextAction && (
            <Button
              size="sm"
              onClick={() => updateOrderStatusMutation.mutate({
                orderId: order.id,
                status: nextAction.status
              })}
              className={`gap-2 mr-auto ${
                nextAction.status === 'delivered' ? 'bg-green-600 hover:bg-green-700' :
                nextAction.status === 'on_way' ? 'bg-purple-600 hover:bg-purple-700' :
                'bg-blue-600 hover:bg-blue-700'
              }`}
            >
              {nextAction.status === 'delivered' && <CheckCircle className="h-4 w-4" />}
              {nextAction.label}
            </Button>
          )}
        </div>
      </div>
    );
  };

  const WalletTab = () => (
    <div className="space-y-6">
      {/* Balance Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wallet className="h-5 w-5" />
            ملخص الرصيد
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
            <div className="flex items-center gap-2">
              <Wallet className="h-5 w-5 text-green-600" />
              <span>الرصيد المتاح</span>
            </div>
            <span className="font-bold text-2xl text-green-600">{formatCurrency(stats.availableBalance)}</span>
          </div>
          
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-blue-50 p-3 rounded-lg">
              <p className="text-sm text-gray-600">إجمالي الأرباح</p>
              <p className="font-bold text-lg">{formatCurrency(stats.totalEarnings)}</p>
            </div>
            
            <div className="bg-purple-50 p-3 rounded-lg">
              <p className="text-sm text-gray-600">المسحوب</p>
              <p className="font-bold text-lg">{formatCurrency(stats.withdrawnAmount)}</p>
            </div>
            
            <div className="bg-orange-50 p-3 rounded-lg">
              <p className="text-sm text-gray-600">أرباح هذا الشهر</p>
              <p className="font-bold text-lg">{formatCurrency(balanceData?.monthlyEarnings || 0)}</p>
            </div>
            
            <div className="bg-yellow-50 p-3 rounded-lg">
              <p className="text-sm text-gray-600">عدد العمولات</p>
              <p className="font-bold text-lg">{balanceData?.commissionCount || 0}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Withdrawal Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            سحب الأرباح
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-start gap-2">
              <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5" />
              <div>
                <p className="text-yellow-800 font-medium">ملاحظة هامة</p>
                <p className="text-yellow-700 text-sm">يتم معالجة طلبات السحب خلال 24-48 ساعة عمل</p>
                <p className="text-yellow-700 text-sm">الحد الأدنى للسحب: 100 ريال</p>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <div>
              <Label htmlFor="withdrawal-amount">المبلغ المطلوب (ريال)</Label>
              <Input
                id="withdrawal-amount"
                type="number"
                value={withdrawalAmount}
                onChange={(e) => setWithdrawalAmount(e.target.value)}
                placeholder="أدخل المبلغ"
                min="100"
                step="1"
              />
            </div>
            
            <div>
              <Label htmlFor="withdrawal-notes">ملاحظات (اختياري)</Label>
              <Input
                id="withdrawal-notes"
                value={withdrawalNotes}
                onChange={(e) => setWithdrawalNotes(e.target.value)}
                placeholder="أي ملاحظات للتحويل"
              />
            </div>
            
            <Button
              onClick={() => {
                const amount = parseFloat(withdrawalAmount);
                if (!amount || amount < 100) {
                  toast({
                    title: 'خطأ',
                    description: 'الحد الأدنى للسحب هو 100 ريال',
                    variant: 'destructive'
                  });
                  return;
                }
                
                if (amount > stats.availableBalance) {
                  toast({
                    title: 'خطأ',
                    description: 'المبلغ المطلوب أكبر من الرصيد المتاح',
                    variant: 'destructive'
                  });
                  return;
                }
                
                setShowWithdrawalDialog(true);
              }}
              disabled={!withdrawalAmount || parseFloat(withdrawalAmount) < 100}
              className="w-full"
            >
              طلب سحب الأرباح
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Recent Transactions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            آخر المعاملات
          </CardTitle>
        </CardHeader>
        <CardContent>
          {balanceData?.transactions && balanceData.transactions.length > 0 ? (
            <div className="space-y-2">
              {balanceData.transactions.slice(0, 5).map((transaction: any, index: number) => (
                <div key={index} className="flex justify-between items-center p-3 border rounded-lg">
                  <div>
                    <p className="font-medium">{transaction.type === 'commission' ? 'عمولة توصيل' : 'سحب رصيد'}</p>
                    <p className="text-sm text-gray-600">{formatDate(transaction.createdAt)}</p>
                  </div>
                  <div className="text-left">
                    <p className={`font-bold ${transaction.type === 'commission' ? 'text-green-600' : 'text-red-600'}`}>
                      {transaction.type === 'commission' ? '+' : '-'}{formatCurrency(transaction.amount)}
                    </p>
                    <Badge className={transaction.status === 'completed' ? 'bg-green-500' : 'bg-yellow-500'}>
                      {transaction.status === 'completed' ? 'مكتمل' : 'قيد المراجعة'}
                    </Badge>
                  </div>
                </div>
              ))}
              
              <Button
                variant="outline"
                className="w-full"
                onClick={() => setShowBalanceDialog(true)}
              >
                عرض جميع المعاملات
              </Button>
            </div>
          ) : (
            <div className="text-center py-8">
              <History className="h-16 w-16 mx-auto mb-4 text-gray-300" />
              <p className="text-gray-500">لا توجد معاملات سابقة</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Withdrawal History */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            سجل السحوبات
          </CardTitle>
        </CardHeader>
        <CardContent>
          {withdrawals?.withdrawals && withdrawals.withdrawals.length > 0 ? (
            <div className="space-y-2">
              {withdrawals.withdrawals.slice(0, 5).map((withdrawal: any) => (
                <div key={withdrawal.id} className="flex justify-between items-center p-3 border rounded-lg">
                  <div>
                    <p className="font-medium">طلب سحب #{withdrawal.id.slice(-6)}</p>
                    <p className="text-sm text-gray-600">{formatDate(withdrawal.createdAt)}</p>
                    {withdrawal.notes && (
                      <p className="text-xs text-gray-500">{withdrawal.notes}</p>
                    )}
                  </div>
                  <div className="text-left">
                    <p className="font-bold text-red-600">-{formatCurrency(withdrawal.amount)}</p>
                    <Badge className={
                      withdrawal.status === 'completed' ? 'bg-green-500' :
                      withdrawal.status === 'rejected' ? 'bg-red-500' :
                      'bg-yellow-500'
                    }>
                      {withdrawal.status === 'completed' ? 'مكتمل' :
                       withdrawal.status === 'rejected' ? 'مرفوض' :
                       'قيد المراجعة'}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-center py-4">لا توجد سحوبات سابقة</p>
          )}
        </CardContent>
      </Card>
    </div>
  );

  if (dashboardLoading) {
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
                <h1 className="text-2xl font-bold text-gray-900">
                  {activeTab === 'dashboard' ? 'لوحة التحكم' :
                   activeTab === 'available' ? 'الطلبات المتاحة' :
                   activeTab === 'active' ? 'الطلبات النشطة' :
                   activeTab === 'wallet' ? 'المحفظة' :
                   activeTab === 'map' ? 'خريطة التوصيل' :
                   activeTab === 'history' ? 'السجل' :
                   activeTab === 'stats' ? 'الإحصائيات' :
                   activeTab === 'profile' ? 'الملف الشخصي' : 'لوحة التحكم'}
                </h1>
                <p className="text-sm text-gray-500">مرحباً بك {driverData.name}</p>
              </div>
              
              <div className="flex items-center gap-4">
                <Button
                  variant="outline"
                  onClick={() => {
                    updateDriverStatusMutation.mutate(!driverData.isAvailable);
                  }}
                  className="flex items-center gap-2"
                >
                  {driverData.isAvailable ? '🔴 تعطيل الاستقبال' : '🟢 تفعيل الاستقبال'}
                </Button>
                
                <Badge className={getStatusColor(driverStatus)}>
                  {getStatusText(driverStatus)}
                </Badge>
              </div>
            </div>

            {/* Dashboard Tab */}
            {activeTab === 'dashboard' && <DashboardTab />}

            {/* Available Orders Tab */}
            {activeTab === 'available' && (
              <div className="space-y-4">
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
                          <AvailableOrderCard key={order.id} order={order} />
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Active Orders Tab */}
            {activeTab === 'active' && (
              <div className="space-y-4">
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
                          <OrderCard key={order.id} order={order} type="active" />
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Wallet Tab */}
            {activeTab === 'wallet' && <WalletTab />}

            {/* History Tab */}
            {activeTab === 'history' && (
              <div className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <History className="h-5 w-5" />
                      سجل الطلبات المكتملة ({completedOrders.length})
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
                              <p className="text-sm font-medium text-green-600">{formatCurrency(order.driverEarnings)}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Stats Tab */}
            {activeTab === 'stats' && (
              <div className="space-y-6">
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
                      <div className="flex justify-between items-center p-3 bg-orange-50 rounded-lg">
                        <span>نسبة النجاح:</span>
                        <span className="font-bold text-lg">{stats.successRate}%</span>
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
                      <div className="flex justify-between items-center p-3 bg-purple-50 rounded-lg">
                        <span>نسبة العمولة:</span>
                        <span className="font-bold text-lg">{stats.commissionRate}%</span>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            )}

            {/* Profile Tab */}
            {activeTab === 'profile' && (
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <User className="h-5 w-5" />
                      الملف الشخصي
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex justify-between items-center p-3 border rounded-lg">
                      <span className="text-gray-600">الاسم:</span>
                      <span className="font-medium">{driverData.name}</span>
                    </div>
                    <div className="flex justify-between items-center p-3 border rounded-lg">
                      <span className="text-gray-600">رقم الهاتف:</span>
                      <span className="font-medium">{driverData.phone}</span>
                    </div>
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
              </div>
            )}
          </div>
        </main>
      </div>

      {/* Withdrawal Dialog */}
      <Dialog open={showWithdrawalDialog} onOpenChange={setShowWithdrawalDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>تأكيد طلب السحب</DialogTitle>
            <DialogDescription>
              هل أنت متأكد من طلب سحب {formatCurrency(parseFloat(withdrawalAmount))}؟
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
              <div className="flex items-start gap-2">
                <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5" />
                <p className="text-yellow-800 text-sm">
                  سيتم تحويل المبلغ إلى حسابك البنكي خلال 24-48 ساعة عمل بعد الموافقة
                </p>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <Button
                variant="outline"
                onClick={() => setShowWithdrawalDialog(false)}
              >
                إلغاء
              </Button>
              <Button
                onClick={() => {
                  const amount = parseFloat(withdrawalAmount);
                  if (amount && amount >= 100) {
                    withdrawalMutation.mutate({ amount, notes: withdrawalNotes });
                  }
                }}
                disabled={withdrawalMutation.isPending}
              >
                {withdrawalMutation.isPending ? 'جاري المعالجة...' : 'تأكيد السحب'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Balance Details Dialog */}
      <Dialog open={showBalanceDialog} onOpenChange={setShowBalanceDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>تفاصيل المعاملات</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            {balanceData?.transactions && balanceData.transactions.length > 0 ? (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {balanceData.transactions.map((transaction: any, index: number) => (
                  <div key={index} className="flex justify-between items-center p-3 border rounded-lg">
                    <div>
                      <p className="font-medium">
                        {transaction.type === 'commission' ? 'عمولة توصيل' : 
                         transaction.type === 'withdrawal' ? 'سحب رصيد' : 'معاملة'}
                      </p>
                      <p className="text-sm text-gray-600">{formatDate(transaction.createdAt)}</p>
                      {transaction.description && (
                        <p className="text-xs text-gray-500">{transaction.description}</p>
                      )}
                    </div>
                    <div className="text-left">
                      <p className={`font-bold ${
                        transaction.type === 'commission' ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {transaction.type === 'commission' ? '+' : '-'}{formatCurrency(transaction.amount)}
                      </p>
                      <Badge className={
                        transaction.status === 'completed' ? 'bg-green-500' :
                        transaction.status === 'rejected' ? 'bg-red-500' :
                        'bg-yellow-500'
                      }>
                        {transaction.status === 'completed' ? 'مكتمل' :
                         transaction.status === 'rejected' ? 'مرفوض' :
                         'قيد المراجعة'}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <History className="h-16 w-16 mx-auto mb-4 text-gray-300" />
                <p className="text-gray-500">لا توجد معاملات سابقة</p>
              </div>
            )}
            
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-600">إجمالي المعاملات: {balanceData?.transactionCount || 0}</p>
              <Button
                variant="outline"
                onClick={() => setShowBalanceDialog(false)}
              >
                إغلاق
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
