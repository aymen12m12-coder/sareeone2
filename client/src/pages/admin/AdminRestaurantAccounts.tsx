import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle 
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from '@/hooks/use-toast';
import { 
  Store, 
  DollarSign, 
  TrendingUp, 
  ArrowDownCircle,
  ArrowUpCircle,
  Eye,
  Clock,
  CheckCircle,
  XCircle,
  Search,
  Download
} from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';

interface RestaurantAccountSummary {
  restaurant: {
    id: string;
    name: string;
    image: string;
    isActive: boolean;
  };
  account: {
    totalOrders: number;
    totalRevenue: string;
    availableBalance: string;
    pendingAmount: string;
    commissionRate?: string;
  };
}

interface RestaurantWithdrawal {
  id: string;
  restaurantId: string;
  amount: string;
  status: string;
  paymentMethod: string;
  notes?: string;
  createdAt: string;
  processedAt?: string;
}

export default function AdminRestaurantAccounts() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('accounts');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRestaurant, setSelectedRestaurant] = useState<string | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);

  // جلب جميع حسابات المطاعم
  const { data: accounts = [], isLoading: accountsLoading } = useQuery<RestaurantAccountSummary[]>({
    queryKey: ['/api/restaurant-accounts'],
  });

  // جلب طلبات السحب المعلقة
  const { data: pendingWithdrawals = [] } = useQuery<RestaurantWithdrawal[]>({
    queryKey: ['/api/admin/withdrawals', 'pending'],
    queryFn: async () => {
      // هذا سيتطلب إضافة مسار API جديد
      return [];
    }
  });

  // فلترة الحسابات
  const filteredAccounts = accounts.filter(acc => 
    acc.restaurant.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // حساب الإحصائيات الإجمالية
  const totalStats = accounts.reduce((acc, item) => {
    return {
      totalRevenue: acc.totalRevenue + parseFloat(item.account.totalRevenue || '0'),
      totalOrders: acc.totalOrders + (item.account.totalOrders || 0),
      totalPending: acc.totalPending + parseFloat(item.account.pendingAmount || '0'),
      totalAvailable: acc.totalAvailable + parseFloat(item.account.availableBalance || '0'),
    };
  }, { totalRevenue: 0, totalOrders: 0, totalPending: 0, totalAvailable: 0 });

  // معالجة طلب السحب
  const processWithdrawalMutation = useMutation({
    mutationFn: async ({ id, status, adminNotes }: { id: string; status: string; adminNotes?: string }) => {
      const response = await apiRequest('PUT', `/api/restaurant-accounts/withdrawals/${id}`, {
        status,
        adminNotes,
        processedBy: 'admin' // يمكن استبداله بمعرف المدير الفعلي
      });
      return response.json();
    },
    onSuccess: () => {
      toast({ title: 'تم معالجة طلب السحب بنجاح' });
      queryClient.invalidateQueries({ queryKey: ['/api/restaurant-accounts'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/withdrawals'] });
    },
    onError: () => {
      toast({ title: 'خطأ في معالجة طلب السحب', variant: 'destructive' });
    }
  });

  const formatCurrency = (amount: string | number) => {
    const num = typeof amount === 'string' ? parseFloat(amount) : amount;
    return `${num.toLocaleString('ar-SA')} ريال`;
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline" className="bg-yellow-50 text-yellow-700">قيد المراجعة</Badge>;
      case 'approved':
        return <Badge variant="outline" className="bg-blue-50 text-blue-700">تمت الموافقة</Badge>;
      case 'completed':
        return <Badge variant="outline" className="bg-green-50 text-green-700">مكتمل</Badge>;
      case 'rejected':
        return <Badge variant="outline" className="bg-red-50 text-red-700">مرفوض</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="p-6 space-y-6" dir="rtl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">حسابات المطاعم</h1>
          <p className="text-muted-foreground">إدارة إيرادات وسحوبات المطاعم</p>
        </div>
        <Store className="h-8 w-8 text-primary" />
      </div>

      {/* إحصائيات عامة */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-green-100 rounded-lg">
                <DollarSign className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">إجمالي الإيرادات</p>
                <p className="text-xl font-bold">{formatCurrency(totalStats.totalRevenue)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-blue-100 rounded-lg">
                <TrendingUp className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">إجمالي الطلبات</p>
                <p className="text-xl font-bold">{totalStats.totalOrders.toLocaleString('ar-SA')}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-purple-100 rounded-lg">
                <ArrowUpCircle className="h-6 w-6 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">الأرصدة المتاحة</p>
                <p className="text-xl font-bold">{formatCurrency(totalStats.totalAvailable)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-orange-100 rounded-lg">
                <Clock className="h-6 w-6 text-orange-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">سحوبات معلقة</p>
                <p className="text-xl font-bold">{formatCurrency(totalStats.totalPending)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="accounts">حسابات المطاعم</TabsTrigger>
          <TabsTrigger value="withdrawals">طلبات السحب</TabsTrigger>
        </TabsList>

        {/* قائمة حسابات المطاعم */}
        <TabsContent value="accounts" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>جميع الحسابات ({accounts.length})</CardTitle>
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="بحث..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pr-10 w-64"
                    />
                  </div>
                  <Button variant="outline">
                    <Download className="h-4 w-4 mr-2" />
                    تصدير
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {accountsLoading ? (
                <div className="text-center py-8 text-muted-foreground">جاري التحميل...</div>
              ) : filteredAccounts.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Store className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>لا توجد حسابات مطاعم</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>المطعم</TableHead>
                      <TableHead>الطلبات</TableHead>
                      <TableHead>الإيرادات</TableHead>
                      <TableHead>الرصيد المتاح</TableHead>
                      <TableHead>معلق</TableHead>
                      <TableHead>العمولة</TableHead>
                      <TableHead>إجراءات</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredAccounts.map((item) => (
                      <TableRow key={item.restaurant.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <img 
                              src={item.restaurant.image || '/placeholder.png'} 
                              alt={item.restaurant.name}
                              className="w-10 h-10 rounded-lg object-cover"
                            />
                            <div>
                              <p className="font-medium">{item.restaurant.name}</p>
                              <Badge variant={item.restaurant.isActive ? 'default' : 'secondary'} className="text-xs">
                                {item.restaurant.isActive ? 'نشط' : 'غير نشط'}
                              </Badge>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>{item.account.totalOrders || 0}</TableCell>
                        <TableCell className="font-medium text-green-600">
                          {formatCurrency(item.account.totalRevenue)}
                        </TableCell>
                        <TableCell className="font-medium text-blue-600">
                          {formatCurrency(item.account.availableBalance)}
                        </TableCell>
                        <TableCell className="text-orange-600">
                          {formatCurrency(item.account.pendingAmount)}
                        </TableCell>
                        <TableCell>
                          {item.account.commissionRate || '15'}%
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedRestaurant(item.restaurant.id);
                              setDetailsOpen(true);
                            }}
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            التفاصيل
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* طلبات السحب */}
        <TabsContent value="withdrawals" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>طلبات السحب المعلقة</CardTitle>
              <CardDescription>مراجعة وموافقة على طلبات سحب الأرصدة</CardDescription>
            </CardHeader>
            <CardContent>
              {pendingWithdrawals.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <ArrowDownCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>لا توجد طلبات سحب معلقة</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>المطعم</TableHead>
                      <TableHead>المبلغ</TableHead>
                      <TableHead>طريقة الدفع</TableHead>
                      <TableHead>تاريخ الطلب</TableHead>
                      <TableHead>الحالة</TableHead>
                      <TableHead>إجراءات</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pendingWithdrawals.map((withdrawal) => (
                      <TableRow key={withdrawal.id}>
                        <TableCell>{withdrawal.restaurantId}</TableCell>
                        <TableCell className="font-bold">
                          {formatCurrency(withdrawal.amount)}
                        </TableCell>
                        <TableCell>{withdrawal.paymentMethod}</TableCell>
                        <TableCell>
                          {new Date(withdrawal.createdAt).toLocaleDateString('ar-SA')}
                        </TableCell>
                        <TableCell>{getStatusBadge(withdrawal.status)}</TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-green-600"
                              onClick={() => processWithdrawalMutation.mutate({
                                id: withdrawal.id,
                                status: 'approved'
                              })}
                            >
                              <CheckCircle className="h-4 w-4 mr-1" />
                              موافقة
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-red-600"
                              onClick={() => processWithdrawalMutation.mutate({
                                id: withdrawal.id,
                                status: 'rejected'
                              })}
                            >
                              <XCircle className="h-4 w-4 mr-1" />
                              رفض
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* نافذة التفاصيل */}
      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>تفاصيل حساب المطعم</DialogTitle>
          </DialogHeader>
          {selectedRestaurant && (
            <RestaurantAccountDetails 
              restaurantId={selectedRestaurant} 
              onClose={() => setDetailsOpen(false)}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// مكون تفاصيل حساب المطعم
function RestaurantAccountDetails({ restaurantId, onClose }: { restaurantId: string; onClose: () => void }) {
  const { data: stats, isLoading } = useQuery({
    queryKey: ['/api/restaurant-accounts', restaurantId, 'stats'],
    queryFn: async () => {
      const response = await fetch(`/api/restaurant-accounts/${restaurantId}/stats?period=all`);
      return response.json();
    }
  });

  const { data: transactions = [] } = useQuery({
    queryKey: ['/api/restaurant-accounts', restaurantId, 'transactions'],
    queryFn: async () => {
      const response = await fetch(`/api/restaurant-accounts/${restaurantId}/transactions?limit=10`);
      const data = await response.json();
      return data.transactions || [];
    }
  });

  if (isLoading) {
    return <div className="text-center py-8">جاري التحميل...</div>;
  }

  return (
    <div className="space-y-6">
      {/* إحصائيات */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-sm text-muted-foreground">الطلبات المكتملة</p>
            <p className="text-2xl font-bold">{stats?.completedOrders || 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-sm text-muted-foreground">صافي الإيرادات</p>
            <p className="text-2xl font-bold text-green-600">{stats?.netRevenue || 0} ريال</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-sm text-muted-foreground">الرصيد المتاح</p>
            <p className="text-2xl font-bold text-blue-600">{stats?.availableBalance || 0} ريال</p>
          </CardContent>
        </Card>
      </div>

      {/* آخر المعاملات */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">آخر المعاملات</CardTitle>
        </CardHeader>
        <CardContent>
          {transactions.length === 0 ? (
            <p className="text-center text-muted-foreground py-4">لا توجد معاملات</p>
          ) : (
            <div className="space-y-2">
              {transactions.slice(0, 5).map((tx: any) => (
                <div key={tx.id} className="flex items-center justify-between py-2 border-b">
                  <div>
                    <p className="font-medium">{tx.description || tx.type}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(tx.createdAt).toLocaleString('ar-SA')}
                    </p>
                  </div>
                  <span className={`font-bold ${parseFloat(tx.amount) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {parseFloat(tx.amount) >= 0 ? '+' : ''}{tx.amount} ريال
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
