import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Users, UserPlus, UserCog, Calendar, Clock, 
  Edit, Trash2, Eye, CheckCircle, XCircle, 
  History, ShieldCheck, Banknote as BanknoteIcon,
  Briefcase as BriefcaseIcon, FileText as FileTextIcon,
  Phone as PhoneIcon, Mail as MailIcon, MapPin as MapPinIcon
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Textarea } from '@/components/ui/textarea';
import { DatePicker } from '@/components/ui/date-picker';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';

interface Employee {
  id: string;
  name: string;
  email: string;
  phone: string;
  position: 'admin' | 'manager' | 'support' | 'accountant' | 'hr';
  department: string;
  salary: number;
  hireDate: string;
  status: 'active' | 'inactive' | 'on_leave' | 'terminated';
  permissions: string[];
  attendanceRate: number;
  performanceScore: number;
  lastActive: string;
  address: string;
  emergencyContact: string;
  documents: string[];
}

interface Attendance {
  id: string;
  employeeId: string;
  employeeName: string;
  checkIn: string;
  checkOut: string;
  date: string;
  status: 'present' | 'absent' | 'late' | 'early_leave' | 'on_leave';
  hoursWorked: number;
  notes: string;
}

interface LeaveRequest {
  id: string;
  employeeId: string;
  employeeName: string;
  type: 'annual' | 'sick' | 'emergency' | 'unpaid';
  startDate: string;
  endDate: string;
  duration: number;
  status: 'pending' | 'approved' | 'rejected';
  reason: string;
  submittedAt: string;
}

export default function AdminHRManagement() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [showEmployeeDialog, setShowEmployeeDialog] = useState(false);
  const [activeTab, setActiveTab] = useState('employees');
  
  const [employeeForm, setEmployeeForm] = useState({
    name: '',
    email: '',
    phone: '',
    position: 'admin' as Employee['position'],
    department: 'management',
    salary: '',
    hireDate: new Date(),
    address: '',
    emergencyContact: '',
    permissions: ['view_dashboard', 'manage_orders']
  });

  // جلب الموظفين
  const { data: employees } = useQuery<Employee[]>({
    queryKey: ['/api/admin/employees'],
  });

  // جلب الحضور
  const { data: attendanceRecords } = useQuery<Attendance[]>({
    queryKey: ['/api/admin/attendance'],
  });

  // جلب طلبات الإجازة
  const { data: leaveRequests } = useQuery<LeaveRequest[]>({
    queryKey: ['/api/admin/leave-requests'],
  });

  // إضافة موظف جديد
  const addEmployeeMutation = useMutation({
    mutationFn: async (data: typeof employeeForm) => {
      const response = await apiRequest('POST', '/api/admin/employees', data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/employees'] });
      toast({ title: 'تم إضافة الموظف بنجاح' });
      setShowEmployeeDialog(false);
      resetEmployeeForm();
    },
  });

  const resetEmployeeForm = () => {
    setEmployeeForm({
      name: '',
      email: '',
      phone: '',
      position: 'admin',
      department: 'management',
      salary: '',
      hireDate: new Date(),
      address: '',
      emergencyContact: '',
      permissions: ['view_dashboard', 'manage_orders']
    });
  };

  return (
    <div className="p-6 space-y-6 bg-gray-50/50 min-h-screen rtl">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">إدارة الموارد البشرية</h1>
          <p className="text-gray-500 mt-1">إدارة شؤون الموظفين، الحضور، والإجازات</p>
        </div>
        <Button onClick={() => setShowEmployeeDialog(true)} className="gap-2">
          <UserPlus className="w-4 h-4" />
          إضافة موظف جديد
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-4 lg:w-[600px]">
          <TabsTrigger value="employees" className="gap-2">
            <Users className="w-4 h-4" />
            الموظفين
          </TabsTrigger>
          <TabsTrigger value="attendance" className="gap-2">
            <Clock className="w-4 h-4" />
            الحضور والإنصراف
          </TabsTrigger>
          <TabsTrigger value="leave" className="gap-2">
            <Calendar className="w-4 h-4" />
            طلبات الإجازة
          </TabsTrigger>
          <TabsTrigger value="payroll" className="gap-2">
            <BanknoteIcon className="w-4 h-4" />
            الرواتب
          </TabsTrigger>
        </TabsList>

        <TabsContent value="employees">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>قائمة الموظفين</CardTitle>
                  <CardDescription>إدارة بيانات وصلاحيات الموظفين</CardDescription>
                </div>
                <div className="flex gap-2">
                  <Input 
                    placeholder="بحث عن موظف..." 
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-64"
                  />
                  <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
                    <SelectTrigger className="w-40">
                      <SelectValue placeholder="القسم" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">جميع الأقسام</SelectItem>
                      <SelectItem value="management">الإدارة</SelectItem>
                      <SelectItem value="support">الدعم الفني</SelectItem>
                      <SelectItem value="accounting">المحاسبة</SelectItem>
                      <SelectItem value="hr">الموارد البشرية</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>الموظف</TableHead>
                    <TableHead>القسم / المنصب</TableHead>
                    <TableHead>الحالة</TableHead>
                    <TableHead>تاريخ التعيين</TableHead>
                    <TableHead>الراتب</TableHead>
                    <TableHead className="text-left">إجراءات</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {employees?.map((employee) => (
                    <TableRow key={employee.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary">
                            {employee.name[0]}
                          </div>
                          <div>
                            <div className="font-medium">{employee.name}</div>
                            <div className="text-xs text-gray-500">{employee.email}</div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>{employee.department}</div>
                        <div className="text-xs text-gray-500">{employee.position}</div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={employee.status === 'active' ? 'default' : 'secondary'}>
                          {employee.status === 'active' ? 'نشط' : 'غير نشط'}
                        </Badge>
                      </TableCell>
                      <TableCell>{employee.hireDate}</TableCell>
                      <TableCell>{employee.salary} ر.ي</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button variant="ghost" size="icon"><Eye className="w-4 h-4" /></Button>
                          <Button variant="ghost" size="icon"><Edit className="w-4 h-4" /></Button>
                          <Button variant="ghost" size="icon" className="text-destructive"><Trash2 className="w-4 h-4" /></Button>
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

      <Dialog open={showEmployeeDialog} onOpenChange={setShowEmployeeDialog}>
        <DialogContent className="max-w-2xl rtl">
          <DialogHeader>
            <DialogTitle>إضافة موظف جديد</DialogTitle>
            <CardDescription>أدخل بيانات الموظف الجديد لتعيينه في النظام</CardDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-4">
            <div className="space-y-2">
              <Label>الاسم الكامل</Label>
              <Input 
                value={employeeForm.name}
                onChange={(e) => setEmployeeForm({...employeeForm, name: e.target.value})}
              />
            </div>
            <div className="space-y-2">
              <Label>البريد الإلكتروني</Label>
              <Input 
                type="email"
                value={employeeForm.email}
                onChange={(e) => setEmployeeForm({...employeeForm, email: e.target.value})}
              />
            </div>
            <div className="space-y-2">
              <Label>رقم الهاتف</Label>
              <Input 
                value={employeeForm.phone}
                onChange={(e) => setEmployeeForm({...employeeForm, phone: e.target.value})}
              />
            </div>
            <div className="space-y-2">
              <Label>المنصب</Label>
              <Select 
                value={employeeForm.position}
                onValueChange={(v: Employee['position']) => setEmployeeForm({...employeeForm, position: v})}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">مدير نظام</SelectItem>
                  <SelectItem value="manager">مدير قسم</SelectItem>
                  <SelectItem value="support">موظف دعم</SelectItem>
                  <SelectItem value="accountant">محاسب</SelectItem>
                  <SelectItem value="hr">موظف موارد بشرية</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>الراتب الأساسي</Label>
              <Input 
                type="number"
                value={employeeForm.salary}
                onChange={(e) => setEmployeeForm({...employeeForm, salary: e.target.value})}
              />
            </div>
            <div className="space-y-2">
              <Label>تاريخ التعيين</Label>
              <DatePicker 
                date={employeeForm.hireDate}
                setDate={(date) => setEmployeeForm({...employeeForm, hireDate: date || new Date()})}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEmployeeDialog(false)}>إلغاء</Button>
            <Button onClick={() => addEmployeeMutation.mutate(employeeForm)}>إضافة الموظف</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
