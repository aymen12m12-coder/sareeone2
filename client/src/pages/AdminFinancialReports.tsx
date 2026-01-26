import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { 
  DollarSign, TrendingUp, TrendingDown, 
  Download, Calendar, Filter, FileText,
  CreditCard, Wallet, Receipt, Banknote, Shield,
  Users, Store, Truck, Target, Award, Clock,
  RefreshCw, CheckCircle,
  XCircle, FileSpreadsheet, Printer,
  Eye, 
  PieChart as PieChartIcon
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DatePicker } from '@/components/ui/date-picker';
import { Switch } from '@/components/ui/switch';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { apiRequest, queryClient } from '@/lib/queryClient';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Pie,
  Cell,
  AreaChart,
  Area
} from 'recharts';

interface FinancialReport {
  id: string;
  period: string;
  totalRevenue: number;
  totalExpenses: number;
  netProfit: number;
  commissionEarned: number;
  deliveryFees: number;
  platformFees: number;
  restaurantPayments: number;
  driverPayments: number;
  withdrawalRequests: number;
  pendingWithdrawals: number;
  completedWithdrawals: number;
  taxAmount: number;
  transactionCount: number;
  averageOrderValue: number;
  growthRate: number;
  status: 'draft' | 'published' | 'archived';
  createdAt: string;
  updatedAt: string;
}

interface Transaction {
  id: string;
  type: 'commission' | 'delivery_fee' | 'withdrawal' | 'refund' | 'bonus' | 'penalty';
  amount: number;
  description: string;
  fromUser: string;
  toUser: string;
  status: 'pending' | 'completed' | 'failed' | 'cancelled';
  reference: string;
  createdAt: string;
}

interface WithdrawalRequest {
  id: string;
  userId: string;
  userType: 'driver' | 'restaurant';
  userName: string;
  amount: number;
  method: 'bank_transfer' | 'wallet' | 'cash';
  accountDetails: any;
  status: 'pending' | 'approved' | 'rejected' | 'processed';
  requestedAt: string;
  processedAt: string | null;
  adminNotes: string;
}

export default function AdminFinancialReports() {
  const { toast } = useToast();
  const [dateRange, setDateRange] = useState<{ from: Date; to: Date }>({
    from: new Date(new Date().setDate(new Date().getDate() - 30)),
    to: new Date()
  });
  const [reportType, setReportType] = useState<'daily' | 'weekly' | 'monthly' | 'custom'>('monthly');
  const [showTransactionDetails, setShowTransactionDetails] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [showWithdrawalDialog, setShowWithdrawalDialog] = useState(false);
  const [selectedWithdrawal, setSelectedWithdrawal] = useState<WithdrawalRequest | null>(null);
  const [exportFormat, setExportFormat] = useState<'pdf' | 'excel' | 'csv'>('excel');

  // جلب التقارير المالية
  const { data: financialReports, isLoading } = useQuery<FinancialReport[]>({
    queryKey: ['/api/admin/financial-reports', dateRange, reportType],
    queryFn: async () => {
      const params = new URLSearchParams({
        from: dateRange.from.toISOString(),
        to: dateRange.to.toISOString(),
        type: reportType
      });
      const response = await apiRequest('GET', `/api/admin/financial-reports?${params.toString()}`);
      return response.json();
    },
  });

  // جلب المعاملات
  const { data: transactions } = useQuery<Transaction[]>({
    queryKey: ['/api/admin/transactions', dateRange],
    queryFn: async () => {
      const params = new URLSearchParams({
        from: dateRange.from.toISOString(),
        to: dateRange.to.toISOString()
      });
      const response = await apiRequest('GET', `/api/admin/transactions?${params.toString()}`);
      return response.json();
    }
  });

  // جلب طلبات السحب المعلقة
  const { data: withdrawalRequestsData } = useQuery<WithdrawalRequest[]>({
    queryKey: ['/api/admin/withdrawals/pending'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/admin/withdrawals/pending');
      return response.json();
    }
  });

  const handleApproveWithdrawal = async (id: string) => {
    try {
      await apiRequest('POST', `/api/admin/withdrawals/${id}/approve`, {});
      toast({ title: 'تمت الموافقة على طلب السحب بنجاح' });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/withdrawals/pending'] });
    } catch (error) {
      toast({ title: 'فشل في الموافقة على طلب السحب', variant: 'destructive' });
    }
  };

  const handleRejectWithdrawal = async (id: string) => {
    try {
      await apiRequest('POST', `/api/admin/withdrawals/${id}/reject`, { reason: 'تم الرفض من قبل المسؤول' });
      toast({ title: 'تم رفض طلب السحب' });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/withdrawals/pending'] });
    } catch (error) {
      toast({ title: 'فشل في رفض طلب السحب', variant: 'destructive' });
    }
  };

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

  const revenueData = financialReports?.map(report => ({
    name: report.period,
    revenue: report.totalRevenue,
    profit: report.netProfit
  })) || [];

  const categoryData = [
    { name: 'مطاعم', value: 400 },
    { name: 'متاجر', value: 300 },
    { name: 'بقالات', value: 300 },
    { name: 'صيدليات', value: 200 },
  ];

  return (
    <div className="p-6 space-y-6 bg-gray-50/50 min-h-screen rtl">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">التقارير المالية</h1>
          <p className="text-gray-500 mt-1">مراقبة الأرباح، الإيرادات، والعمليات المالية</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="gap-2">
            <Download className="w-4 h-4" />
            تصدير التقارير
          </Button>
          <Button className="gap-2">
            <Printer className="w-4 h-4" />
            طباعة
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">إجمالي الإيرادات</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">1,234,567 ر.ي</div>
            <p className="text-xs text-green-500 flex items-center gap-1 mt-1">
              <TrendingUp className="w-3 h-3" />
              +12.5% من الشهر الماضي
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">صافي الأرباح</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">245,890 ر.ي</div>
            <p className="text-xs text-green-500 flex items-center gap-1 mt-1">
              <TrendingUp className="w-3 h-3" />
              +8.2% من الشهر الماضي
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">إجمالي العمولات</CardTitle>
            <Receipt className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">123,450 ر.ي</div>
            <p className="text-xs text-green-500 flex items-center gap-1 mt-1">
              <TrendingUp className="w-3 h-3" />
              +5.4% من الشهر الماضي
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">طلبات السحب المعلقة</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{withdrawalRequestsData?.length || 0}</div>
            <p className="text-xs text-orange-500 mt-1">تحتاج إلى مراجعة</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>الإيرادات والأرباح</CardTitle>
            <CardDescription>مقارنة بين إجمالي الإيرادات وصافي الأرباح خلال الفترة</CardDescription>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={revenueData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Area type="monotone" dataKey="revenue" stackId="1" stroke="#8884d8" fill="#8884d8" name="الإيرادات" />
                <Area type="monotone" dataKey="profit" stackId="1" stroke="#82ca9d" fill="#82ca9d" name="الأرباح" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>توزيع المبيعات حسب التصنيف</CardTitle>
            <CardDescription>أداء التصنيفات المختلفة في النظام</CardDescription>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChartIcon width={400} height={300}>
                <Pie
                  data={categoryData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  fill="#8884d8"
                  paddingAngle={5}
                  dataKey="value"
                >
                  {categoryData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChartIcon>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="transactions" className="space-y-4">
        <TabsList>
          <TabsTrigger value="transactions">المعاملات الحديثة</TabsTrigger>
          <TabsTrigger value="withdrawals">طلبات السحب</TabsTrigger>
          <TabsTrigger value="taxes">الضرائب والرسوم</TabsTrigger>
        </TabsList>

        <TabsContent value="transactions">
          <Card>
            <CardHeader>
              <CardTitle>سجل المعاملات</CardTitle>
              <CardDescription>جميع العمليات المالية المسجلة في النظام</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>المعرف</TableHead>
                    <TableHead>النوع</TableHead>
                    <TableHead>المبلغ</TableHead>
                    <TableHead>التاريخ</TableHead>
                    <TableHead>الحالة</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transactions?.map((tx) => (
                    <TableRow key={tx.id}>
                      <TableCell className="font-medium">#{tx.id.slice(0, 8)}</TableCell>
                      <TableCell>{tx.type}</TableCell>
                      <TableCell>{tx.amount} ر.ي</TableCell>
                      <TableCell>{new Date(tx.createdAt).toLocaleDateString('ar-YE')}</TableCell>
                      <TableCell>
                        <Badge variant={tx.status === 'completed' ? 'default' : 'secondary'}>
                          {tx.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="withdrawals">
          <Card>
            <CardHeader>
              <CardTitle>إدارة طلبات السحب</CardTitle>
              <CardDescription>مراجعة ومعالجة طلبات سحب الأرباح من السائقين والمطاعم</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>المستخدم</TableHead>
                    <TableHead>المبلغ</TableHead>
                    <TableHead>طريقة السحب</TableHead>
                    <TableHead>التاريخ</TableHead>
                    <TableHead className="text-left">إجراءات</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {withdrawalRequestsData?.map((request) => (
                    <TableRow key={request.id}>
                      <TableCell>
                        <div className="font-medium">{request.userName}</div>
                        <div className="text-xs text-gray-500">{request.userType}</div>
                      </TableCell>
                      <TableCell>{request.amount} ر.ي</TableCell>
                      <TableCell>{request.method}</TableCell>
                      <TableCell>{new Date(request.requestedAt).toLocaleDateString('ar-YE')}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button size="sm" onClick={() => handleApproveWithdrawal(request.id)}>موافقة</Button>
                          <Button size="sm" variant="outline" className="text-destructive" onClick={() => handleRejectWithdrawal(request.id)}>رفض</Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
