import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { 
  Shield, UserCheck, Eye, EyeOff, 
  RefreshCw, Users, Globe, Smartphone,
  Mail, Phone, MapPin, Calendar, Clock,
  Lock, Unlock, Bell, MessageSquare, AlertCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

interface SecuritySettings {
  twoFactorEnabled: boolean;
  sessionTimeout: number;
  passwordComplexity: 'low' | 'medium' | 'high';
  ipWhitelist: string[];
  lastAudit: string;
}

interface SecurityLog {
  id: string;
  userId: string;
  userName: string;
  action: string;
  ipAddress: string;
  device: string;
  location: string;
  createdAt: string;
  status: 'success' | 'failure' | 'warning';
}

export default function AdminSecurity() {
  const { toast } = useToast();
  const [showIps, setShowIps] = useState(false);

  const { data: securitySettings } = useQuery<SecuritySettings>({
    queryKey: ['/api/admin/security/settings'],
  });

  const { data: securityLogs } = useQuery<SecurityLog[]>({
    queryKey: ['/api/admin/security/logs'],
  });

  return (
    <div className="p-6 space-y-6 bg-gray-50/50 min-h-screen rtl">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">الأمن والخصوصية</h1>
          <p className="text-gray-500 mt-1">إدارة إعدادات الأمان ومراقبة سجلات الوصول</p>
        </div>
        <Button variant="outline" className="gap-2">
          <Shield className="w-4 h-4" />
          تحديث إعدادات الأمان
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>سجلات الوصول الحديثة</CardTitle>
            <CardDescription>متابعة آخر عمليات تسجيل الدخول والأنشطة الحساسة</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>المستخدم</TableHead>
                  <TableHead>الإجراء</TableHead>
                  <TableHead>IP / الجهاز</TableHead>
                  <TableHead>التاريخ</TableHead>
                  <TableHead>الحالة</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {securityLogs?.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell>
                      <div className="font-medium">{log.userName}</div>
                      <div className="text-xs text-gray-500">{log.location}</div>
                    </TableCell>
                    <TableCell>{log.action}</TableCell>
                    <TableCell>
                      <div className="text-xs">{log.ipAddress}</div>
                      <div className="text-[10px] text-gray-500">{log.device}</div>
                    </TableCell>
                    <TableCell>{new Date(log.createdAt).toLocaleString('ar-YE')}</TableCell>
                    <TableCell>
                      <Badge variant={log.status === 'success' ? 'default' : log.status === 'failure' ? 'destructive' : 'secondary'}>
                        {log.status === 'success' ? 'ناجح' : log.status === 'failure' ? 'فشل' : 'تحذير'}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>إعدادات الحماية</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>المصادقة الثنائية (2FA)</Label>
                  <p className="text-xs text-gray-500">تطلب رمزاً إضافياً عند الدخول</p>
                </div>
                <Switch checked={securitySettings?.twoFactorEnabled} />
              </div>
              <div className="space-y-2">
                <Label>تعقيد كلمة المرور</Label>
                <Select value={securitySettings?.passwordComplexity}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">منخفض</SelectItem>
                    <SelectItem value="medium">متوسط</SelectItem>
                    <SelectItem value="high">مرتفع</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>مدة الجلسة (دقائق)</Label>
                <Input type="number" value={securitySettings?.sessionTimeout} />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-sm font-medium">حالة النظام</CardTitle>
              <Shield className="w-4 h-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2 text-2xl font-bold text-green-600">
                <Shield className="w-6 h-6" />
                محمي
              </div>
              <p className="text-xs text-gray-500 mt-2">آخر فحص أمني: {securitySettings?.lastAudit}</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
