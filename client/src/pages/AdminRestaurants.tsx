import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Edit, Trash2, Store, Save, X, Clock, Star, Search, MapPin, Phone, DollarSign, Package, TrendingUp, Users, Percent, CreditCard, ShoppingBag, BarChart, Download, ChevronUp, ChevronDown, Eye, Wallet, TrendingDown, Receipt, Coins, ArrowUpDown, Building } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import type { Restaurant, Category, RestaurantStatistics, RestaurantTransaction, Order, RestaurantBalance } from '@shared/schema';

// تعريف الأنواع الجديدة
interface RestaurantStats extends RestaurantStatistics {
  totalOrders: number;
  totalRevenue: number;
  platformFee: number;
  deliveryFee: number;
  discountAmount: number;
  netRevenue: number;
  averageOrderValue: number;
  pendingBalance: number; // الرصيد المعلق للدفع
  totalPaid: number; // إجمالي المبالغ المدفوعة
}

export default function AdminRestaurants() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [editingRestaurant, setEditingRestaurant] = useState<Restaurant | null>(null);
  const [selectedRestaurant, setSelectedRestaurant] = useState<Restaurant | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isStatsDialogOpen, setIsStatsDialogOpen] = useState(false);
  const [isAccountDialogOpen, setIsAccountDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [dateRange, setDateRange] = useState({
    start: new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0]
  });

  // Refs للتمرير
  const statsDialogRef = useRef<HTMLDivElement>(null);
  const accountDialogRef = useRef<HTMLDivElement>(null);
  const ordersTableRef = useRef<HTMLDivElement>(null);
  const transactionsTableRef = useRef<HTMLDivElement>(null);
  const mainDialogFormRef = useRef<HTMLFormElement>(null);

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    image: '',
    phone: '',
    deliveryTime: '',
    deliveryFee: '0',
    minimumOrder: '0',
    isOpen: true,
    categoryId: '',
    openingTime: '08:00',
    closingTime: '23:00',
    workingDays: '0,1,2,3,4,5,6',
    isTemporarilyClosed: false,
    temporaryCloseReason: '',
    latitude: '',
    longitude: '',
    address: '',
    isFeatured: false,
    isNew: false,
    isActive: true,
    platformFeePercentage: '10', // نسبة العمولة الأساسية للمنصة
    // معلومات صاحب المطعم للدفع
    ownerName: '',
    ownerPhone: '',
    ownerEmail: '',
  });

  const [transactionData, setTransactionData] = useState({
    amount: '',
    type: 'payout' as 'payout' | 'adjustment' | 'refund' | 'manual_add',
    description: '',
    referenceId: '',
  });

  const [payoutData, setPayoutData] = useState({
    amount: '',
    paymentMethod: 'cash' as 'cash' | 'bank_transfer' | 'wallet',
    notes: '',
  });

  const { data: restaurantsData, isLoading: restaurantsLoading } = useQuery<{restaurants: Restaurant[], pagination: any}>({
    queryKey: ['/api/admin/restaurants'],
  });

  const restaurants = restaurantsData?.restaurants || [];

  const { data: categories } = useQuery<Category[]>({
    queryKey: ['/api/admin/categories'],
  });

  const { data: restaurantStats } = useQuery<RestaurantStats>({
    queryKey: ['/api/admin/restaurants', selectedRestaurant?.id, 'statistics', dateRange.start, dateRange.end],
    enabled: !!selectedRestaurant && isStatsDialogOpen,
  });

  const { data: restaurantBalance } = useQuery<RestaurantBalance>({
    queryKey: ['/api/admin/restaurants', selectedRestaurant?.id, 'balance'],
    enabled: !!selectedRestaurant,
  });

  const { data: restaurantOrders } = useQuery<Order[]>({
    queryKey: ['/api/admin/restaurants', selectedRestaurant?.id, 'orders', dateRange.start, dateRange.end],
    enabled: !!selectedRestaurant && isStatsDialogOpen,
  });

  const { data: restaurantTransactions } = useQuery<RestaurantTransaction[]>({
    queryKey: ['/api/admin/restaurants', selectedRestaurant?.id, 'transactions'],
    enabled: !!selectedRestaurant && isAccountDialogOpen,
  });

  const createRestaurantMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const submitData = {
        ...data,
        deliveryFee: parseFloat(data.deliveryFee) || 0,
        minimumOrder: parseFloat(data.minimumOrder) || 0,
        platformFeePercentage: parseFloat(data.platformFeePercentage) || 10,
        latitude: data.latitude ? parseFloat(data.latitude) : null,
        longitude: data.longitude ? parseFloat(data.longitude) : null,
      };
      const response = await apiRequest('POST', '/api/admin/restaurants', submitData);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/restaurants'] });
      toast({
        title: "تم إضافة المطعم",
        description: "تم إضافة المطعم الجديد بنجاح",
      });
      resetForm();
      setIsDialogOpen(false);
    },
  });

  const updateRestaurantMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<typeof formData> }) => {
      const submitData = {
        ...data,
        deliveryFee: data.deliveryFee != null ? parseFloat(data.deliveryFee) : undefined,
        minimumOrder: data.minimumOrder != null ? parseFloat(data.minimumOrder) : undefined,
        platformFeePercentage: data.platformFeePercentage != null ? parseFloat(data.platformFeePercentage) : undefined,
        latitude: data.latitude === '' ? null : data.latitude != null ? parseFloat(data.latitude) : undefined,
        longitude: data.longitude === '' ? null : data.longitude != null ? parseFloat(data.longitude) : undefined,
      };
      const response = await apiRequest('PUT', `/api/admin/restaurants/${id}`, submitData);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/restaurants'] });
      if (selectedRestaurant) {
        queryClient.invalidateQueries({ queryKey: ['/api/admin/restaurants', selectedRestaurant.id, 'statistics'] });
        queryClient.invalidateQueries({ queryKey: ['/api/admin/restaurants', selectedRestaurant.id, 'balance'] });
        queryClient.invalidateQueries({ queryKey: ['/api/admin/restaurants', selectedRestaurant.id, 'transactions'] });
      }
      toast({
        title: "تم تحديث المطعم",
        description: "تم تحديث بيانات المطعم بنجاح",
      });
      resetForm();
      setEditingRestaurant(null);
      setIsDialogOpen(false);
    },
  });

  const deleteRestaurantMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await apiRequest('DELETE', `/api/admin/restaurants/${id}`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/restaurants'] });
      toast({
        title: "تم حذف المطعم",
        description: "تم حذف المطعم بنجاح",
      });
    },
  });

  const createTransactionMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', `/api/admin/restaurants/${selectedRestaurant?.id}/transactions`, {
        ...transactionData,
        amount: parseFloat(transactionData.amount),
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/restaurants', selectedRestaurant?.id, 'transactions'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/restaurants', selectedRestaurant?.id, 'statistics'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/restaurants', selectedRestaurant?.id, 'balance'] });
      toast({
        title: "تم إضافة المعاملة",
        description: `تم ${getTransactionActionLabel(transactionData.type)} ${transactionData.amount} ريال`,
      });
      setTransactionData({
        amount: '',
        type: 'payout',
        description: '',
        referenceId: '',
      });
    },
  });

  const processPayoutMutation = useMutation({
    mutationFn: async (data: typeof payoutData) => {
      const response = await apiRequest('POST', `/api/admin/restaurants/${selectedRestaurant?.id}/payout`, {
        ...data,
        amount: parseFloat(data.amount),
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/restaurants', selectedRestaurant?.id, 'transactions'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/restaurants', selectedRestaurant?.id, 'statistics'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/restaurants', selectedRestaurant?.id, 'balance'] });
      toast({
        title: "تم الدفع",
        description: "تم دفع المبلغ للمطعم بنجاح",
      });
      setPayoutData({
        amount: '',
        paymentMethod: 'cash',
        notes: '',
      });
    },
  });

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      image: '',
      phone: '',
      deliveryTime: '',
      deliveryFee: '0',
      minimumOrder: '0',
      isOpen: true,
      categoryId: '',
      openingTime: '08:00',
      closingTime: '23:00',
      workingDays: '0,1,2,3,4,5,6',
      isTemporarilyClosed: false,
      temporaryCloseReason: '',
      latitude: '',
      longitude: '',
      address: '',
      isFeatured: false,
      isNew: false,
      isActive: true,
      platformFeePercentage: '10',
      ownerName: '',
      ownerPhone: '',
      ownerEmail: '',
    });
    setEditingRestaurant(null);
  };

  const handleEdit = (restaurant: Restaurant) => {
    setEditingRestaurant(restaurant);
    setFormData({
      name: restaurant.name,
      description: restaurant.description || '',
      phone: restaurant.phone || '',
      image: restaurant.image,
      deliveryTime: restaurant.deliveryTime,
      deliveryFee: restaurant.deliveryFee || '0',
      minimumOrder: restaurant.minimumOrder || '0',
      isOpen: restaurant.isOpen,
      categoryId: restaurant.categoryId || '',
      openingTime: restaurant.openingTime || '08:00',
      closingTime: restaurant.closingTime || '23:00',
      workingDays: restaurant.workingDays || '0,1,2,3,4,5,6',
      isTemporarilyClosed: restaurant.isTemporarilyClosed || false,
      temporaryCloseReason: restaurant.temporaryCloseReason || '',
      latitude: restaurant.latitude || '',
      longitude: restaurant.longitude || '',
      address: restaurant.address || '',
      isFeatured: restaurant.isFeatured || false,
      isNew: restaurant.isNew || false,
      isActive: restaurant.isActive !== false,
      platformFeePercentage: restaurant.platformFeePercentage?.toString() || '10',
      ownerName: restaurant.ownerName || '',
      ownerPhone: restaurant.ownerPhone || '',
      ownerEmail: restaurant.ownerEmail || '',
    });
    setIsDialogOpen(true);
  };

  const handleViewStats = (restaurant: Restaurant) => {
    setSelectedRestaurant(restaurant);
    setIsStatsDialogOpen(true);
  };

  const handleManageAccount = (restaurant: Restaurant) => {
    setSelectedRestaurant(restaurant);
    setIsAccountDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      toast({
        title: "خطأ",
        description: "يرجى إدخال اسم المطعم",
        variant: "destructive",
      });
      return;
    }

    if (!formData.deliveryTime.trim()) {
      toast({
        title: "خطأ",
        description: "يرجى إدخال وقت التوصيل",
        variant: "destructive",
      });
      return;
    }

    const deliveryFee = parseFloat(formData.deliveryFee);
    const minimumOrder = parseFloat(formData.minimumOrder);
    const platformFeePercentage = parseFloat(formData.platformFeePercentage);
    
    if (isNaN(deliveryFee) || deliveryFee < 0) {
      toast({
        title: "خطأ",
        description: "يرجى إدخال رسوم توصيل صحيحة",
        variant: "destructive",
      });
      return;
    }

    if (isNaN(minimumOrder) || minimumOrder < 0) {
      toast({
        title: "خطأ",
        description: "يرجى إدخال حد أدنى للطلب صحيح",
        variant: "destructive",
      });
      return;
    }

    if (isNaN(platformFeePercentage) || platformFeePercentage < 0 || platformFeePercentage > 100) {
      toast({
        title: "خطأ",
        description: "يرجى إدخال نسبة عمولة صحيحة (0-100%)",
        variant: "destructive",
      });
      return;
    }

    if (editingRestaurant) {
      updateRestaurantMutation.mutate({ id: editingRestaurant.id, data: formData });
    } else {
      createRestaurantMutation.mutate(formData);
    }
  };

  const handleTransactionSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!transactionData.amount || parseFloat(transactionData.amount) <= 0) {
      toast({
        title: "خطأ",
        description: "يرجى إدخال مبلغ صحيح",
        variant: "destructive",
      });
      return;
    }

    if (!transactionData.description.trim()) {
      toast({
        title: "خطأ",
        description: "يرجى إدخال وصف للمعاملة",
        variant: "destructive",
      });
      return;
    }

    createTransactionMutation.mutate();
  };

  const handlePayoutSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!payoutData.amount || parseFloat(payoutData.amount) <= 0) {
      toast({
        title: "خطأ",
        description: "يرجى إدخال مبلغ صحيح",
        variant: "destructive",
      });
      return;
    }

    if (parseFloat(payoutData.amount) > (restaurantBalance?.availableBalance || 0)) {
      toast({
        title: "خطأ",
        description: "المبلغ أكبر من الرصيد المتاح",
        variant: "destructive",
      });
      return;
    }

    processPayoutMutation.mutate(payoutData);
  };

  const toggleRestaurantStatus = (restaurant: Restaurant, field: 'isOpen' | 'isActive') => {
    updateRestaurantMutation.mutate({
      id: restaurant.id,
      data: { [field]: !restaurant[field] }
    });
  };

  const getCategoryName = (categoryId: string) => {
    const category = categories?.find(c => c.id === categoryId);
    return category?.name || 'غير محدد';
  };

  // دوال التمرير
  const scrollToStatsDialogTop = () => {
    statsDialogRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const scrollToStatsDialogBottom = () => {
    if (statsDialogRef.current) {
      statsDialogRef.current.scrollTo({ top: statsDialogRef.current.scrollHeight, behavior: 'smooth' });
    }
  };

  const scrollToAccountDialogTop = () => {
    accountDialogRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const scrollToAccountDialogBottom = () => {
    if (accountDialogRef.current) {
      accountDialogRef.current.scrollTo({ top: accountDialogRef.current.scrollHeight, behavior: 'smooth' });
    }
  };

  const scrollToOrdersTop = () => {
    if (ordersTableRef.current) {
      const scrollArea = ordersTableRef.current.querySelector('[data-radix-scroll-area-viewport]') as HTMLElement;
      if (scrollArea) {
        scrollArea.scrollTo({ top: 0, behavior: 'smooth' });
      }
    }
  };

  const scrollToOrdersBottom = () => {
    if (ordersTableRef.current) {
      const scrollArea = ordersTableRef.current.querySelector('[data-radix-scroll-area-viewport]') as HTMLElement;
      if (scrollArea) {
        scrollArea.scrollTo({ top: scrollArea.scrollHeight, behavior: 'smooth' });
      }
    }
  };

  const scrollToTransactionsTop = () => {
    if (transactionsTableRef.current) {
      const scrollArea = transactionsTableRef.current.querySelector('[data-radix-scroll-area-viewport]') as HTMLElement;
      if (scrollArea) {
        scrollArea.scrollTo({ top: 0, behavior: 'smooth' });
      }
    }
  };

  const scrollToTransactionsBottom = () => {
    if (transactionsTableRef.current) {
      const scrollArea = transactionsTableRef.current.querySelector('[data-radix-scroll-area-viewport]') as HTMLElement;
      if (scrollArea) {
        scrollArea.scrollTo({ top: scrollArea.scrollHeight, behavior: 'smooth' });
      }
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ar-SA', {
      style: 'currency',
      currency: 'SAR',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('ar-SA', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getTransactionTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      payout: 'دفع',
      adjustment: 'تعديل',
      refund: 'استرداد',
      manual_add: 'إضافة يدوية',
      order_revenue: 'إيراد طلب',
      platform_fee: 'عمولة المنصة',
      delivery_fee: 'رسوم توصيل',
      discount: 'خصم',
    };
    return labels[type] || type;
  };

  const getTransactionActionLabel = (type: string) => {
    const labels: Record<string, string> = {
      payout: 'دفع',
      adjustment: 'تعديل',
      refund: 'استرداد',
      manual_add: 'إضافة',
    };
    return labels[type] || type;
  };

  const getPaymentMethodLabel = (method: string) => {
    const labels: Record<string, string> = {
      cash: 'نقدي',
      bank_transfer: 'تحويل بنكي',
      wallet: 'محفظة إلكترونية',
    };
    return labels[method] || method;
  };

  const getOrderStatusBadge = (status: string) => {
    const variants: Record<string, string> = {
      pending: 'outline',
      confirmed: 'default',
      preparing: 'secondary',
      ready: 'secondary',
      on_the_way: 'default',
      delivered: 'success',
      cancelled: 'destructive',
    };
    const labels: Record<string, string> = {
      pending: 'قيد الانتظار',
      confirmed: 'تم التأكيد',
      preparing: 'قيد التحضير',
      ready: 'جاهز',
      on_the_way: 'في الطريق',
      delivered: 'تم التوصيل',
      cancelled: 'ملغي',
    };
    return (
      <Badge variant={variants[status] as any || 'outline'}>
        {labels[status] || status}
      </Badge>
    );
  };

  // فلترة المطاعم حسب البحث
  const filteredRestaurants = restaurants.filter((restaurant) =>
    restaurant.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    getCategoryName(restaurant.categoryId).toLowerCase().includes(searchTerm.toLowerCase()) ||
    restaurant.address?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    restaurant.phone?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // دالة لتحويل القيم الرقمية من string إلى number للعرض
  const parseDecimal = (value: string | null): number => {
    if (!value) return 0;
    const num = parseFloat(value);
    return isNaN(num) ? 0 : num;
  };

  // حساب الربح للمطعم من كل طلب
  const calculateRestaurantProfit = (orderTotal: number, platformFeePercentage: number) => {
    const platformFee = (orderTotal * platformFeePercentage) / 100;
    return orderTotal - platformFee;
  };

  // دوال التمرير للنموذج الرئيسي
  const scrollToMainFormTop = () => {
    mainDialogFormRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const scrollToMainFormBottom = () => {
    if (mainDialogFormRef.current) {
      mainDialogFormRef.current.scrollTo({ top: mainDialogFormRef.current.scrollHeight, behavior: 'smooth' });
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Store className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-2xl font-bold text-foreground">إدارة المطاعم</h1>
            <p className="text-muted-foreground">إدارة المطاعم والإحصائيات وحسابات الأرباح</p>
          </div>
        </div>
        
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button 
              className="gap-2"
              onClick={() => {
                resetForm();
                setIsDialogOpen(true);
              }}
              data-testid="button-add-restaurant"
            >
              <Plus className="h-4 w-4" />
              إضافة مطعم جديد
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl h-[90vh] flex flex-col overflow-hidden">
            <DialogHeader className="flex-shrink-0 p-6 pb-4">
              <DialogTitle className="flex items-center justify-between">
                <span>{editingRestaurant ? 'تعديل بيانات المطعم' : 'إضافة مطعم جديد'}</span>
                <div className="flex items-center gap-2">
                  <Button
                    onClick={scrollToMainFormTop}
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8"
                    title="التمرير للأعلى"
                  >
                    <ChevronUp className="h-4 w-4" />
                  </Button>
                  <Button
                    onClick={scrollToMainFormBottom}
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8"
                    title="التمرير للأسفل"
                  >
                    <ChevronDown className="h-4 w-4" />
                  </Button>
                </div>
              </DialogTitle>
            </DialogHeader>
            
            <div className="flex-1 overflow-y-auto px-6" ref={mainDialogFormRef}>
              <form onSubmit={handleSubmit} className="space-y-6 pb-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="name">اسم المطعم</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="أدخل اسم المطعم"
                      required
                      data-testid="input-restaurant-name"
                    />
                  </div>

                  <div>
                    <Label htmlFor="phone">رقم هاتف المطعم</Label>
                    <Input
                      id="phone"
                      value={formData.phone}
                      onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                      placeholder="+967xxxxxxxx"
                      data-testid="input-restaurant-phone"
                    />
                  </div>

                  <div>
                    <Label htmlFor="category">القسم</Label>
                    <Select value={formData.categoryId} onValueChange={(value) => setFormData(prev => ({ ...prev, categoryId: value }))}>
                      <SelectTrigger data-testid="select-restaurant-category">
                        <SelectValue placeholder="اختر قسم المطعم" />
                      </SelectTrigger>
                      <SelectContent>
                        {categories?.map((category) => (
                          <SelectItem key={category.id} value={category.id}>
                            {category.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label htmlFor="platformFeePercentage">نسبة عمولة المنصة (%)</Label>
                    <Input
                      id="platformFeePercentage"
                      type="number"
                      min="0"
                      max="100"
                      step="0.5"
                      value={formData.platformFeePercentage}
                      onChange={(e) => setFormData(prev => ({ ...prev, platformFeePercentage: e.target.value }))}
                      placeholder="نسبة العمولة من كل طلب"
                      required
                      data-testid="input-restaurant-platform-fee"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      النسبة المئوية التي تأخذها المنصة من كل طلب
                    </p>
                  </div>
                </div>

                <div>
                  <Label htmlFor="description">الوصف</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="وصف المطعم"
                    rows={3}
                    data-testid="input-restaurant-description"
                  />
                </div>

                <div>
                  <Label htmlFor="image">رابط الصورة</Label>
                  <div className="flex gap-2">
                    <Input
                      id="image"
                      value={formData.image}
                      onChange={(e) => setFormData(prev => ({ ...prev, image: e.target.value }))}
                      placeholder="https://example.com/image.jpg"
                      required
                      data-testid="input-restaurant-image"
                      className="flex-1"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => document.getElementById('restaurant-file-upload')?.click()}
                      data-testid="button-select-image"
                    >
                      اختيار صورة
                    </Button>
                    <input
                      id="restaurant-file-upload"
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const reader = new FileReader();
                          reader.onload = (event) => {
                            const result = event.target?.result as string;
                            setFormData(prev => ({ ...prev, image: result }));
                          };
                          reader.readAsDataURL(file);
                        }
                      }}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="deliveryTime">وقت التوصيل</Label>
                    <Input
                      id="deliveryTime"
                      value={formData.deliveryTime}
                      onChange={(e) => setFormData(prev => ({ ...prev, deliveryTime: e.target.value }))}
                      placeholder="30-45 دقيقة"
                      required
                      data-testid="input-restaurant-delivery-time"
                    />
                  </div>

                  <div>
                    <Label htmlFor="deliveryFee">رسوم التوصيل (ريال)</Label>
                    <Input
                      id="deliveryFee"
                      type="number"
                      min="0"
                      step="0.01"
                      value={formData.deliveryFee}
                      onChange={(e) => setFormData(prev => ({ ...prev, deliveryFee: e.target.value }))}
                      data-testid="input-restaurant-delivery-fee"
                    />
                  </div>

                  <div>
                    <Label htmlFor="minimumOrder">الحد الأدنى للطلب (ريال)</Label>
                    <Input
                      id="minimumOrder"
                      type="number"
                      min="0"
                      step="0.01"
                      value={formData.minimumOrder}
                      onChange={(e) => setFormData(prev => ({ ...prev, minimumOrder: e.target.value }))}
                      data-testid="input-restaurant-minimum-order"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <Label htmlFor="isOpen">مفتوح للطلبات</Label>
                  <Switch
                    id="isOpen"
                    checked={formData.isOpen}
                    onCheckedChange={(checked) => setFormData(prev => ({ ...prev, isOpen: checked }))}
                    data-testid="switch-restaurant-open"
                  />
                </div>

                {/* Restaurant Hours Section */}
                <div className="space-y-4 border-t pt-4">
                  <h3 className="text-lg font-semibold text-foreground">أوقات العمل</h3>
                  
                  {/* Opening and Closing Times */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="openingTime">وقت الفتح</Label>
                      <Input
                        id="openingTime"
                        type="time"
                        value={formData.openingTime}
                        onChange={(e) => setFormData(prev => ({ ...prev, openingTime: e.target.value }))}
                        data-testid="input-restaurant-opening-time"
                      />
                    </div>
                    <div>
                      <Label htmlFor="closingTime">وقت الإغلاق</Label>
                      <Input
                        id="closingTime"
                        type="time"
                        value={formData.closingTime}
                        onChange={(e) => setFormData(prev => ({ ...prev, closingTime: e.target.value }))}
                        data-testid="input-restaurant-closing-time"
                      />
                    </div>
                  </div>

                  {/* Working Days */}
                  <div>
                    <Label className="text-base font-medium">أيام العمل</Label>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-2">
                      {[
                        { value: '0', label: 'الأحد' },
                        { value: '1', label: 'الإثنين' },
                        { value: '2', label: 'الثلاثاء' },
                        { value: '3', label: 'الأربعاء' },
                        { value: '4', label: 'الخميس' },
                        { value: '5', label: 'الجمعة' },
                        { value: '6', label: 'السبت' },
                      ].map((day) => {
                        const workingDaysArray = formData.workingDays.split(',').filter(Boolean);
                        const isChecked = workingDaysArray.includes(day.value);
                        
                        return (
                          <div key={day.value} className="flex items-center space-x-2 space-x-reverse">
                            <Checkbox
                              id={`day-${day.value}`}
                              checked={isChecked}
                              onCheckedChange={(checked) => {
                                const currentDays = formData.workingDays.split(',').filter(Boolean);
                                let newDays;
                                if (checked) {
                                  newDays = [...currentDays, day.value].sort((a, b) => parseInt(a) - parseInt(b));
                                } else {
                                  newDays = currentDays.filter(d => d !== day.value);
                                }
                                setFormData(prev => ({ ...prev, workingDays: newDays.join(',') }));
                              }}
                              data-testid={`checkbox-working-day-${day.value}`}
                            />
                            <Label
                              htmlFor={`day-${day.value}`}
                              className="text-sm font-normal cursor-pointer"
                            >
                              {day.label}
                            </Label>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Temporary Closure */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="isTemporarilyClosed">إغلاق مؤقت</Label>
                      <Switch
                        id="isTemporarilyClosed"
                        checked={formData.isTemporarilyClosed}
                        onCheckedChange={(checked) => setFormData(prev => ({ ...prev, isTemporarilyClosed: checked }))}
                        data-testid="switch-restaurant-temporarily-closed"
                      />
                    </div>
                    
                    {formData.isTemporarilyClosed && (
                      <div>
                        <Label htmlFor="temporaryCloseReason">سبب الإغلاق المؤقت</Label>
                        <Textarea
                          id="temporaryCloseReason"
                          value={formData.temporaryCloseReason}
                          onChange={(e) => setFormData(prev => ({ ...prev, temporaryCloseReason: e.target.value }))}
                          placeholder="مثال: أعمال صيانة، إجازة، ظروف خاصة..."
                          rows={2}
                          data-testid="input-restaurant-temporary-close-reason"
                        />
                      </div>
                    )}
                  </div>
                </div>

                {/* Location and Status Section */}
                <div className="space-y-4 border-t pt-4">
                  <h3 className="text-lg font-semibold text-foreground">الموقع والإعدادات</h3>
                  
                  {/* Address */}
                  <div>
                    <Label htmlFor="address">العنوان</Label>
                    <Textarea
                      id="address"
                      value={formData.address}
                      onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
                      placeholder="عنوان المطعم الكامل"
                      rows={2}
                      data-testid="input-restaurant-address"
                    />
                  </div>

                  {/* Location Coordinates */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="latitude">خط العرض (Latitude)</Label>
                      <Input
                        id="latitude"
                        type="number"
                        step="any"
                        value={formData.latitude}
                        onChange={(e) => setFormData(prev => ({ ...prev, latitude: e.target.value }))}
                        placeholder="24.7136"
                        data-testid="input-restaurant-latitude"
                      />
                    </div>
                    <div>
                      <Label htmlFor="longitude">خط الطول (Longitude)</Label>
                      <Input
                        id="longitude"
                        type="number"
                        step="any"
                        value={formData.longitude}
                        onChange={(e) => setFormData(prev => ({ ...prev, longitude: e.target.value }))}
                        placeholder="46.6753"
                        data-testid="input-restaurant-longitude"
                      />
                    </div>
                  </div>
                  
                  {/* زر تحديد الموقع عبر الخريطة */}
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        const address = formData.address || formData.name;
                        if (address) {
                          const encodedAddress = encodeURIComponent(address);
                          const url = `https://www.google.com/maps/search/?api=1&query=${encodedAddress}`;
                          window.open(url, '_blank');
                          toast({
                            title: "تم فتح الخريطة",
                            description: "يمكنك نسخ الإحداثيات من الخريطة وإدخالها في الحقول أعلاه",
                          });
                        } else {
                          toast({
                            title: "أدخل العنوان أولاً",
                            description: "يرجى إدخال عنوان المطعم للبحث في الخريطة",
                            variant: "destructive",
                          });
                        }
                      }}
                      className="flex-1"
                      data-testid="button-open-maps"
                    >
                      <MapPin className="h-4 w-4 mr-2" />
                      تحديد الموقع عبر الخريطة
                    </Button>
                  </div>

                  {/* Status Flags */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="isActive">المطعم مفعل</Label>
                      <Switch
                        id="isActive"
                        checked={formData.isActive}
                        onCheckedChange={(checked) => setFormData(prev => ({ ...prev, isActive: checked }))}
                        data-testid="switch-restaurant-active"
                      />
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <Label htmlFor="isFeatured">مطعم مميز</Label>
                      <Switch
                        id="isFeatured"
                        checked={formData.isFeatured}
                        onCheckedChange={(checked) => setFormData(prev => ({ ...prev, isFeatured: checked }))}
                        data-testid="switch-restaurant-featured"
                      />
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <Label htmlFor="isNew">مطعم جديد</Label>
                      <Switch
                        id="isNew"
                        checked={formData.isNew}
                        onCheckedChange={(checked) => setFormData(prev => ({ ...prev, isNew: checked }))}
                        data-testid="switch-restaurant-new"
                      />
                    </div>
                  </div>
                </div>

                {/* معلومات المالك للدفع */}
                <div className="space-y-4 border-t pt-4">
                  <h3 className="text-lg font-semibold text-foreground">معلومات المالك للدفع</h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="ownerName">اسم صاحب المطعم</Label>
                      <Input
                        id="ownerName"
                        value={formData.ownerName}
                        onChange={(e) => setFormData(prev => ({ ...prev, ownerName: e.target.value }))}
                        placeholder="اسم صاحب المطعم"
                        data-testid="input-restaurant-owner-name"
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="ownerPhone">هاتف المالك</Label>
                      <Input
                        id="ownerPhone"
                        value={formData.ownerPhone}
                        onChange={(e) => setFormData(prev => ({ ...prev, ownerPhone: e.target.value }))}
                        placeholder="+966xxxxxxxxx"
                        data-testid="input-restaurant-owner-phone"
                      />
                    </div>
                    
                    <div className="md:col-span-2">
                      <Label htmlFor="ownerEmail">البريد الإلكتروني (اختياري)</Label>
                      <Input
                        id="ownerEmail"
                        type="email"
                        value={formData.ownerEmail}
                        onChange={(e) => setFormData(prev => ({ ...prev, ownerEmail: e.target.value }))}
                        placeholder="email@example.com"
                        data-testid="input-restaurant-owner-email"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex gap-2 pt-4 border-t">
                  <Button 
                    type="submit" 
                    className="flex-1 gap-2"
                    disabled={createRestaurantMutation.isPending || updateRestaurantMutation.isPending}
                    data-testid="button-save-restaurant"
                  >
                    <Save className="h-4 w-4" />
                    {editingRestaurant ? 'تحديث' : 'إضافة'}
                  </Button>
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => {
                      resetForm();
                      setIsDialogOpen(false);
                    }}
                    data-testid="button-cancel-restaurant"
                  >
                    <X className="h-4 w-4" />
                    إلغاء
                  </Button>
                </div>
              </form>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* شريط البحث */}
      <Card>
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute right-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="البحث في المطاعم..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pr-10"
              data-testid="input-search-restaurants"
            />
          </div>
        </CardContent>
      </Card>

      {/* Restaurants Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {restaurantsLoading ? (
          [...Array(6)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <div className="w-full h-48 bg-muted" />
              <CardContent className="p-4">
                <div className="h-4 bg-muted rounded w-3/4 mb-2" />
                <div className="h-3 bg-muted rounded w-1/2" />
              </CardContent>
            </Card>
          ))
        ) : filteredRestaurants?.length ? (
          filteredRestaurants.map((restaurant) => (
            <Card key={restaurant.id} className="hover:shadow-md transition-shadow overflow-hidden">
              <div className="w-full h-48 bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center relative">
                {restaurant.image ? (
                  <img 
                    src={restaurant.image} 
                    alt={restaurant.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <Store className="h-16 w-16 text-primary/50" />
                )}
                <div className="absolute top-2 left-2">
                  <Badge variant={restaurant.isOpen ? "default" : "outline"}>
                    {restaurant.isOpen ? 'مفتوح' : 'مغلق'}
                  </Badge>
                </div>
                <div className="absolute top-2 right-2 flex gap-1">
                  {restaurant.isFeatured && <Badge className="bg-yellow-500">مميز</Badge>}
                  {restaurant.isNew && <Badge className="bg-green-500">جديد</Badge>}
                </div>
              </div>
              
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg mb-2">{restaurant.name}</CardTitle>
                    <p className="text-sm text-muted-foreground mb-2">
                      {getCategoryName(restaurant.categoryId || '')}
                    </p>
                    {restaurant.phone && (
                      <div className="flex items-center gap-1 text-sm text-muted-foreground mb-2">
                        <Phone className="h-3 w-3" />
                        <span>{restaurant.phone}</span>
                      </div>
                    )}
                    {restaurant.ownerName && (
                      <div className="text-xs text-muted-foreground mb-2">
                        المالك: {restaurant.ownerName}
                      </div>
                    )}
                    <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                      <Percent className="h-3 w-3" />
                      <span>عمولة المنصة: {restaurant.platformFeePercentage || 10}%</span>
                    </div>
                  </div>
                </div>
              </CardHeader>
              
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="flex items-center gap-1">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span>{restaurant.deliveryTime}</span>
                  </div>
                  {restaurant.address && (
                    <div className="flex items-center gap-1">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                      <span className="text-xs truncate">{restaurant.address}</span>
                    </div>
                  )}
                  <div className="text-xs text-muted-foreground">
                    توصيل: {parseDecimal(restaurant.deliveryFee)} ريال
                  </div>
                  <div className="text-xs text-muted-foreground">
                    أقل طلب: {parseDecimal(restaurant.minimumOrder)} ريال
                  </div>
                  {restaurant.rating && (
                    <div className="flex items-center gap-1">
                      <Star className="h-4 w-4 text-yellow-500" />
                      <span>{restaurant.rating}</span>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleViewStats(restaurant)}
                    className="gap-1"
                    data-testid={`button-stats-${restaurant.id}`}
                  >
                    <BarChart className="h-3 w-3" />
                    إحصائيات
                  </Button>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1"
                    onClick={() => handleEdit(restaurant)}
                    data-testid={`button-edit-restaurant-${restaurant.id}`}
                  >
                    <Edit className="h-3 w-3" />
                    تعديل
                  </Button>
                  
                  <Button
                    variant="default"
                    size="sm"
                    onClick={() => handleManageAccount(restaurant)}
                    className="gap-1"
                    data-testid={`button-account-${restaurant.id}`}
                  >
                    <Wallet className="h-3 w-3" />
                    حساب
                  </Button>
                  
                  <div className="text-center col-span-3">
                    <div className="flex items-center justify-center gap-4 mb-2">
                      <div className="text-center">
                        <p className="text-xs text-muted-foreground">مفتوح</p>
                        <Switch
                          checked={restaurant.isOpen}
                          onCheckedChange={() => toggleRestaurantStatus(restaurant, 'isOpen')}
                          data-testid={`switch-restaurant-open-${restaurant.id}`}
                        />
                      </div>
                      <div className="text-center">
                        <p className="text-xs text-muted-foreground">نشط</p>
                        <Switch
                          checked={restaurant.isActive !== false}
                          onCheckedChange={() => toggleRestaurantStatus(restaurant, 'isActive')}
                          data-testid={`switch-restaurant-active-${restaurant.id}`}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          <div className="col-span-full text-center py-12">
            <Store className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">
              {searchTerm ? 'لا توجد نتائج' : 'لا توجد مطاعم'}
            </h3>
            <p className="text-muted-foreground mb-4">
              {searchTerm ? 'جرب البحث بكلمات مختلفة' : 'ابدأ بإضافة المطاعم والمتاجر'}
            </p>
            <Button onClick={() => setIsDialogOpen(true)} data-testid="button-add-first-restaurant">
              إضافة المطعم الأول
            </Button>
          </div>
        )}
      </div>

      {/* إحصائيات المطعم Dialog */}
      <Dialog open={isStatsDialogOpen} onOpenChange={setIsStatsDialogOpen}>
        <DialogContent className="max-w-6xl h-[90vh] flex flex-col overflow-hidden">
          <DialogHeader className="flex-shrink-0 p-6 pb-4">
            <DialogTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BarChart className="h-5 w-5" />
                إحصائيات المطعم: {selectedRestaurant?.name}
              </div>
              <div className="flex items-center gap-2">
                <Button
                  onClick={scrollToStatsDialogTop}
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8"
                  title="التمرير للأعلى"
                >
                  <ChevronUp className="h-4 w-4" />
                </Button>
                <Button
                  onClick={scrollToStatsDialogBottom}
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8"
                  title="التمرير للأسفل"
                >
                  <ChevronDown className="h-4 w-4" />
                </Button>
              </div>
            </DialogTitle>
          </DialogHeader>
          
          <div ref={statsDialogRef} className="flex-1 overflow-y-auto px-6" style={{ maxHeight: 'calc(90vh - 180px)' }}>
            {/* Date Range Filter */}
            <Card className="mb-6">
              <CardContent className="p-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                  <div>
                    <Label htmlFor="startDate">من تاريخ</Label>
                    <Input
                      id="startDate"
                      type="date"
                      value={dateRange.start}
                      onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label htmlFor="endDate">إلى تاريخ</Label>
                    <Input
                      id="endDate"
                      type="date"
                      value={dateRange.end}
                      onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button
                      onClick={() => {
                        const now = new Date();
                        setDateRange({
                          start: new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0],
                          end: now.toISOString().split('T')[0]
                        });
                      }}
                      variant="outline"
                      className="flex-1"
                    >
                      هذا الشهر
                    </Button>
                    <Button
                      onClick={() => {
                        const now = new Date();
                        setDateRange({
                          start: now.toISOString().split('T')[0],
                          end: now.toISOString().split('T')[0]
                        });
                      }}
                      variant="outline"
                      className="flex-1"
                    >
                      اليوم
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Statistics Overview */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <ShoppingBag className="h-4 w-4" />
                    إجمالي الطلبات
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-foreground">
                    {restaurantStats?.totalOrders || 0}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">عدد الطلبات</p>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <DollarSign className="h-4 w-4" />
                    إجمالي الإيرادات
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-foreground">
                    {formatCurrency(restaurantStats?.totalRevenue || 0)}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">قبل الخصومات</p>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <TrendingDown className="h-4 w-4" />
                    قيمة الخصومات
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-red-600">
                    {formatCurrency(restaurantStats?.discountAmount || 0)}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">إجمالي الخصومات</p>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <TrendingUp className="h-4 w-4" />
                    متوسط قيمة الطلب
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-600">
                    {formatCurrency(restaurantStats?.averageOrderValue || 0)}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">معدل الطلب</p>
                </CardContent>
              </Card>
            </div>

            {/* Revenue Breakdown */}
            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5" />
                  تفصيل الأرباح
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">إجمالي مبيعات المطعم</span>
                        <span className="text-sm font-medium">{formatCurrency(restaurantStats?.totalRevenue || 0)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">عمولة المنصة ({selectedRestaurant?.platformFeePercentage || 10}%)</span>
                        <span className="text-sm font-medium text-red-600">
                          -{formatCurrency(restaurantStats?.platformFee || 0)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">الخصومات</span>
                        <span className="text-sm font-medium text-red-600">
                          -{formatCurrency(restaurantStats?.discountAmount || 0)}
                        </span>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between border-t pt-2">
                        <span className="text-sm font-semibold">صافي ربح المطعم</span>
                        <span className="text-lg font-bold text-green-600">
                          {formatCurrency(restaurantStats?.netRevenue || 0)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm font-semibold">الرصيد المتاح للدفع</span>
                        <span className="text-sm font-bold text-blue-600">
                          {formatCurrency(restaurantStats?.pendingBalance || 0)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm font-semibold">المبالغ المدفوعة</span>
                        <span className="text-sm font-bold text-purple-600">
                          {formatCurrency(restaurantStats?.totalPaid || 0)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Recent Orders */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Package className="h-5 w-5" />
                    أحدث الطلبات
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    <Button
                      onClick={scrollToOrdersTop}
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8"
                      title="التمرير للأعلى"
                    >
                      <ChevronUp className="h-4 w-4" />
                    </Button>
                    <Button
                      onClick={scrollToOrdersBottom}
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8"
                      title="التمرير للأسفل"
                    >
                      <ChevronDown className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div ref={ordersTableRef}>
                  <ScrollArea className="h-[300px]">
                    <Table>
                      <TableHeader className="sticky top-0 bg-background">
                        <TableRow>
                          <TableHead>رقم الطلب</TableHead>
                          <TableHead>التاريخ</TableHead>
                          <TableHead>الحالة</TableHead>
                          <TableHead>المبلغ الإجمالي</TableHead>
                          <TableHead>ربح المطعم</TableHead>
                          <TableHead>العميل</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {restaurantOrders?.length ? (
                          restaurantOrders.map((order) => {
                            const restaurantProfit = calculateRestaurantProfit(
                              order.totalAmount, 
                              selectedRestaurant?.platformFeePercentage || 10
                            );
                            
                            return (
                              <TableRow key={order.id}>
                                <TableCell className="font-medium">#{order.orderNumber}</TableCell>
                                <TableCell>{formatDate(order.createdAt)}</TableCell>
                                <TableCell>{getOrderStatusBadge(order.status)}</TableCell>
                                <TableCell>{formatCurrency(order.totalAmount)}</TableCell>
                                <TableCell className="text-green-600">
                                  {formatCurrency(restaurantProfit)}
                                </TableCell>
                                <TableCell>{order.customerName}</TableCell>
                              </TableRow>
                            );
                          })
                        ) : (
                          <TableRow>
                            <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                              لا توجد طلبات في هذه الفترة
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                    <ScrollBar orientation="vertical" />
                  </ScrollArea>
                </div>
              </CardContent>
            </Card>
          </div>
          
          <DialogFooter className="flex-shrink-0 p-6 pt-4 border-t">
            <div className="flex items-center justify-between w-full">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span>الفترة: {dateRange.start} إلى {dateRange.end}</span>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={scrollToStatsDialogTop}
                  size="sm"
                  className="gap-1"
                >
                  <ChevronUp className="h-4 w-4" />
                  أعلى
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setIsStatsDialogOpen(false)}
                >
                  إغلاق
                </Button>
              </div>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* إدارة الحساب Dialog */}
      <Dialog open={isAccountDialogOpen} onOpenChange={setIsAccountDialogOpen}>
        <DialogContent className="max-w-6xl h-[90vh] flex flex-col overflow-hidden">
          <DialogHeader className="flex-shrink-0 p-6 pb-4">
            <DialogTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Wallet className="h-5 w-5" />
                إدارة حساب المطعم: {selectedRestaurant?.name}
              </div>
              <div className="flex items-center gap-2">
                <Button
                  onClick={scrollToAccountDialogTop}
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8"
                  title="التمرير للأعلى"
                >
                  <ChevronUp className="h-4 w-4" />
                </Button>
                <Button
                  onClick={scrollToAccountDialogBottom}
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8"
                  title="التمرير للأسفل"
                >
                  <ChevronDown className="h-4 w-4" />
                </Button>
              </div>
            </DialogTitle>
          </DialogHeader>
          
          <div ref={accountDialogRef} className="flex-1 overflow-y-auto px-6" style={{ maxHeight: 'calc(90vh - 180px)' }}>
            <Tabs defaultValue="balance" className="w-full">
              <TabsList className="grid w-full grid-cols-3 sticky top-0 bg-background z-10 py-2">
                <TabsTrigger value="balance">الرصيد والدفع</TabsTrigger>
                <TabsTrigger value="transactions">سجل المعاملات</TabsTrigger>
                <TabsTrigger value="manual">معاملة يدوية</TabsTrigger>
              </TabsList>
              
              {/* الرصيد والدفع Tab */}
              <TabsContent value="balance" className="space-y-6 pt-4">
                {/* Balance Summary */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium text-muted-foreground">
                        إجمالي الأرباح
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-foreground">
                        {formatCurrency(restaurantBalance?.totalEarnings || 0)}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">مجموع أرباح المطعم</p>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium text-muted-foreground">
                        الرصيد المتاح
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-green-600">
                        {formatCurrency(restaurantBalance?.availableBalance || 0)}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">قابل للدفع للمطعم</p>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium text-muted-foreground">
                        المسحوب
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-blue-600">
                        {formatCurrency(restaurantBalance?.withdrawnAmount || 0)}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">إجمالي المسحوبات</p>
                    </CardContent>
                  </Card>
                </div>

                {/* Restaurant Owner Info */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Building className="h-5 w-5" />
                      معلومات صاحب المطعم
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground mb-1">اسم المالك</p>
                        <p className="text-foreground">{selectedRestaurant?.ownerName || 'غير محدد'}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-muted-foreground mb-1">هاتف المالك</p>
                        <p className="text-foreground">{selectedRestaurant?.ownerPhone || 'غير محدد'}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-muted-foreground mb-1">البريد الإلكتروني</p>
                        <p className="text-foreground">{selectedRestaurant?.ownerEmail || 'غير محدد'}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-muted-foreground mb-1">نسبة عمولة المنصة</p>
                        <p className="text-foreground">{selectedRestaurant?.platformFeePercentage || 10}%</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Payment Processing */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <ArrowUpDown className="h-5 w-5" />
                      دفع رصيد للمطعم
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <form onSubmit={handlePayoutSubmit} className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="payoutAmount">المبلغ المراد دفعه (ريال)</Label>
                        <div className="flex gap-2">
                          <Input
                            id="payoutAmount"
                            type="number"
                            min="0"
                            step="0.01"
                            value={payoutData.amount}
                            onChange={(e) => setPayoutData(prev => ({ ...prev, amount: e.target.value }))}
                            placeholder="أدخل المبلغ"
                            required
                            className="flex-1"
                          />
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => setPayoutData(prev => ({ 
                              ...prev, 
                              amount: (restaurantBalance?.availableBalance || 0).toString() 
                            }))}
                          >
                            الرصيد كاملاً
                          </Button>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          الرصيد المتاح: {formatCurrency(restaurantBalance?.availableBalance || 0)}
                        </p>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="paymentMethod">طريقة الدفع</Label>
                        <Select
                          value={payoutData.paymentMethod}
                          onValueChange={(value: any) => setPayoutData(prev => ({ ...prev, paymentMethod: value }))}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="اختر طريقة الدفع" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="cash">نقدي</SelectItem>
                            <SelectItem value="bank_transfer">تحويل بنكي</SelectItem>
                            <SelectItem value="wallet">محفظة إلكترونية</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="payoutNotes">ملاحظات (اختياري)</Label>
                        <Textarea
                          id="payoutNotes"
                          value={payoutData.notes}
                          onChange={(e) => setPayoutData(prev => ({ ...prev, notes: e.target.value }))}
                          placeholder="ملاحظات حول عملية الدفع"
                          rows={2}
                        />
                      </div>

                      <Button 
                        type="submit" 
                        className="w-full" 
                        disabled={processPayoutMutation.isPending || !restaurantBalance || restaurantBalance.availableBalance <= 0}
                      >
                        تأكيد الدفع للمطعم
                      </Button>
                    </form>
                  </CardContent>
                </Card>
              </TabsContent>
              
              {/* Transactions Tab */}
              <TabsContent value="transactions" className="pt-4">
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle>سجل المعاملات</CardTitle>
                      <div className="flex items-center gap-2">
                        <Button
                          onClick={scrollToTransactionsTop}
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8"
                          title="التمرير للأعلى"
                        >
                          <ChevronUp className="h-4 w-4" />
                        </Button>
                        <Button
                          onClick={scrollToTransactionsBottom}
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8"
                          title="التمرير للأسفل"
                        >
                          <ChevronDown className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div ref={transactionsTableRef}>
                      <ScrollArea className="h-[400px]">
                        <Table>
                          <TableHeader className="sticky top-0 bg-background">
                            <TableRow>
                              <TableHead>التاريخ</TableHead>
                              <TableHead>النوع</TableHead>
                              <TableHead>المبلغ</TableHead>
                              <TableHead>الوصف</TableHead>
                              <TableHead>الرصيد بعد</TableHead>
                              <TableHead>المرجع</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {restaurantTransactions?.length ? (
                              restaurantTransactions.map((transaction) => (
                                <TableRow key={transaction.id}>
                                  <TableCell>{formatDate(transaction.createdAt)}</TableCell>
                                  <TableCell>
                                    <Badge variant={
                                      transaction.type === 'order_revenue' || transaction.type === 'manual_add'
                                        ? 'default'
                                        : transaction.type === 'payout'
                                        ? 'secondary'
                                        : transaction.type === 'platform_fee' || transaction.type === 'discount'
                                        ? 'destructive'
                                        : 'outline'
                                    }>
                                      {getTransactionTypeLabel(transaction.type)}
                                    </Badge>
                                  </TableCell>
                                  <TableCell className={
                                    transaction.type === 'platform_fee' || transaction.type === 'discount' || transaction.type === 'payout'
                                      ? 'text-red-600'
                                      : 'text-green-600'
                                  }>
                                    {transaction.type === 'platform_fee' || transaction.type === 'discount' || transaction.type === 'payout' ? '-' : '+'}
                                    {formatCurrency(transaction.amount)}
                                  </TableCell>
                                  <TableCell>{transaction.description}</TableCell>
                                  <TableCell>{formatCurrency(transaction.balanceAfter)}</TableCell>
                                  <TableCell>{transaction.referenceId || '-'}</TableCell>
                                </TableRow>
                              ))
                            ) : (
                              <TableRow>
                                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                                  لا توجد معاملات
                                </TableCell>
                              </TableRow>
                            )}
                          </TableBody>
                        </Table>
                        <ScrollBar orientation="vertical" />
                      </ScrollArea>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
              
              {/* Manual Transaction Tab */}
              <TabsContent value="manual" className="pt-4">
                <Card>
                  <CardHeader>
                    <CardTitle>إضافة معاملة يدوية</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <form onSubmit={handleTransactionSubmit} className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="transactionType">نوع المعاملة</Label>
                        <Select
                          value={transactionData.type}
                          onValueChange={(value: any) => setTransactionData(prev => ({ ...prev, type: value }))}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="اختر نوع المعاملة" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="manual_add">إضافة رصيد</SelectItem>
                            <SelectItem value="adjustment">تعديل</SelectItem>
                            <SelectItem value="refund">استرداد</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="amount">المبلغ (ريال)</Label>
                        <Input
                          id="amount"
                          type="number"
                          min="0"
                          step="0.01"
                          value={transactionData.amount}
                          onChange={(e) => setTransactionData(prev => ({ ...prev, amount: e.target.value }))}
                          placeholder="أدخل المبلغ"
                          required
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="description">الوصف</Label>
                        <Input
                          id="description"
                          value={transactionData.description}
                          onChange={(e) => setTransactionData(prev => ({ ...prev, description: e.target.value }))}
                          placeholder="وصف المعاملة"
                          required
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="referenceId">رقم المرجع (اختياري)</Label>
                        <Input
                          id="referenceId"
                          value={transactionData.referenceId}
                          onChange={(e) => setTransactionData(prev => ({ ...prev, referenceId: e.target.value }))}
                          placeholder="رقم الطلب أو المرجع"
                        />
                      </div>

                      <Button type="submit" className="w-full" disabled={createTransactionMutation.isPending}>
                        إضافة المعاملة
                      </Button>
                    </form>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
          
          <DialogFooter className="flex-shrink-0 p-6 pt-4 border-t">
            <div className="flex items-center justify-between w-full">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span>آخر تحديث: {new Date().toLocaleTimeString('ar-SA')}</span>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={scrollToAccountDialogTop}
                  size="sm"
                  className="gap-1"
                >
                  <ChevronUp className="h-4 w-4" />
                  أعلى
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsAccountDialogOpen(false);
                    setSelectedRestaurant(null);
                  }}
                >
                  إغلاق
                </Button>
              </div>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
