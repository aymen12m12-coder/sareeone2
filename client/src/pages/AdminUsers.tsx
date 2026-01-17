import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { 
  Users, 
  UserCog, 
  Truck, 
  Edit, 
  Trash2, 
  Search,
  Mail,
  Phone,
  Calendar,
  ShieldCheck,
  Eye,
  EyeOff,
  Save,
  X,
  Receipt,
  Clock
} from 'lucide-react';

interface User {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: 'customer' | 'driver' | 'admin';
  isActive: boolean;
  createdAt: string;
  address?: string;
}

interface EditUserForm {
  name: string;
  email: string;
  phone?: string;
  newPassword?: string;
  role: 'customer' | 'driver' | 'admin';
  isActive: boolean;
}

interface NavigationSettings {
  showAdminPanel: boolean;
  showDeliveryApp: boolean;
  showOrdersPage: boolean;
  showTrackOrdersPage: boolean;
}

const AdminUsers = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('all');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [editForm, setEditForm] = useState<EditUserForm>({
    name: '',
    email: '',
    phone: '',
    newPassword: '',
    role: 'customer',
    isActive: true
  });
  const [showPassword, setShowPassword] = useState(false);
  const [navSettings, setNavSettings] = useState<NavigationSettings>({
    showAdminPanel: false,
    showDeliveryApp: false,
    showOrdersPage: true,
    showTrackOrdersPage: true
  });
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Load navigation settings
  useEffect(() => {
    const settings = {
      showAdminPanel: localStorage.getItem('show_admin_panel') === 'true',
      showDeliveryApp: localStorage.getItem('show_delivery_app') === 'true',
      showOrdersPage: localStorage.getItem('show_orders_page') !== 'false',
      showTrackOrdersPage: localStorage.getItem('show_track_orders_page') !== 'false'
    };
    setNavSettings(settings);
  }, []);

  // Fetch users
  const { data: users = [], isLoading } = useQuery<User[]>({
    queryKey: ['/api/admin/users'],
  });

  // Update user mutation
  const updateUserMutation = useMutation({
    mutationFn: async (userData: { id: string } & Partial<EditUserForm>) => {
      const response = await fetch(`/api/admin/users/${userData.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userData)
      });
      if (!response.ok) throw new Error('Update failed');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users'] });
      toast({
        title: "تم التحديث بنجاح",
        description: "تم حفظ تغييرات بيانات المستخدم"
      });
      setEditDialogOpen(false);
      setSelectedUser(null);
    },
    onError: (error) => {
      toast({
        title: "خطأ في التحديث", 
        description: "حدث خطأ أثناء حفظ البيانات",
        variant: "destructive"
      });
      console.error('Error updating user:', error);
    }
  });

  // Delete user mutation
  const deleteUserMutation = useMutation({
    mutationFn: async (userId: string) => {
      const response = await fetch(`/api/admin/users/${userId}`, { method: 'DELETE' });
      if (!response.ok) throw new Error('Delete failed');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users'] });
      toast({
        title: "تم الحذف بنجاح",
        description: "تم حذف المستخدم من النظام"
      });
    },
    onError: () => {
      toast({
        title: "خطأ في الحذف",
        description: "لا يمكن حذف هذا المستخدم",
        variant: "destructive"
      });
    }
  });

  // Handle navigation settings change
  const handleNavSettingsChange = (key: keyof NavigationSettings, value: boolean) => {
    const newSettings = { ...navSettings, [key]: value };
    setNavSettings(newSettings);
    
    // Save to localStorage
    localStorage.setItem(`show_admin_panel`, newSettings.showAdminPanel.toString());
    localStorage.setItem(`show_delivery_app`, newSettings.showDeliveryApp.toString());
    localStorage.setItem(`show_orders_page`, newSettings.showOrdersPage.toString());
    localStorage.setItem(`show_track_orders_page`, newSettings.showTrackOrdersPage.toString());
    
    // Dispatch custom event to update Layout component
    const event = new CustomEvent('navigationSettingsChanged', {
      detail: { key: `show_${key.replace('show', '').replace(/([A-Z])/g, '_$1').toLowerCase().slice(1)}`, enabled: value }
    });
    window.dispatchEvent(event);
    
    toast({
      title: "تم تحديث الإعدادات",
      description: `تم ${value ? 'تفعيل' : 'إلغاء تفعيل'} الخيار في واجهة العميل`
    });
  };

  const handleEditUser = (user: User) => {
    setSelectedUser(user);
    setEditForm({
      name: user.name,
      email: user.email,
      phone: user.phone || '',
      newPassword: '',
      role: user.role,
      isActive: user.isActive
    });
    setEditDialogOpen(true);
  };

  const handleSaveUser = () => {
    if (!selectedUser) return;
    
    const updateData: any = {
      id: selectedUser.id,
      name: editForm.name,
      email: editForm.email,
      phone: editForm.phone,
      role: editForm.role,
      isActive: editForm.isActive
    };
    
    if (editForm.newPassword && editForm.newPassword.trim()) {
      updateData.password = editForm.newPassword;
    }
    
    updateUserMutation.mutate(updateData);
  };

  const handleDeleteUser = (user: User) => {
    if (confirm(`هل أنت متأكد من حذف المستخدم "${user.name}"؟`)) {
      deleteUserMutation.mutate(user.id);
    }
  };

  // Filter users based on search and tab
  const filteredUsers = users.filter((user: User) => {
    const matchesSearch = user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.email.toLowerCase().includes(searchTerm.toLowerCase());
    
    if (activeTab === 'all') return matchesSearch;
    return matchesSearch && user.role === activeTab;
  });

  const getUserBadgeColor = (role: string) => {
    switch (role) {
      case 'admin': return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300';
      case 'driver': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300';
      case 'customer': return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-300';
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'admin': return <UserCog className="h-4 w-4" />;
      case 'driver': return <Truck className="h-4 w-4" />;
      case 'customer': return <Users className="h-4 w-4" />;
      default: return <Users className="h-4 w-4" />;
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'admin': return 'مدير';
      case 'driver': return 'سائق';
      case 'customer': return 'عميل';
      default: return 'غير محدد';
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
          <p>جارٍ تحميل بيانات المستخدمين...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6" data-testid="page-admin-users">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">إدارة المستخدمين</h1>
        <p className="text-gray-600 dark:text-gray-400">إدارة بيانات جميع مستخدمي النظام والتحكم في الصلاحيات</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <div className="flex flex-col lg:flex-row gap-4 mb-6">
          <TabsList className="grid w-full lg:w-auto grid-cols-4">
            <TabsTrigger value="all" data-testid="tab-all-users">الكل ({users.length})</TabsTrigger>
            <TabsTrigger value="customer" data-testid="tab-customers">
              العملاء ({users.filter((u: User) => u.role === 'customer').length})
            </TabsTrigger>
            <TabsTrigger value="driver" data-testid="tab-drivers">
              السائقين ({users.filter((u: User) => u.role === 'driver').length})
            </TabsTrigger>
            <TabsTrigger value="admin" data-testid="tab-admins">
              المديرين ({users.filter((u: User) => u.role === 'admin').length})
            </TabsTrigger>
          </TabsList>

          {/* Search */}
          <div className="relative flex-1 lg:max-w-sm">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="البحث عن مستخدم..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
              data-testid="input-search-users"
            />
          </div>
        </div>

        <TabsContent value="all" className="mt-0">
          <UsersList 
            users={filteredUsers} 
            onEdit={handleEditUser}
            onDelete={handleDeleteUser}
            getUserBadgeColor={getUserBadgeColor}
            getRoleIcon={getRoleIcon}
            getRoleLabel={getRoleLabel}
          />
        </TabsContent>

        <TabsContent value="customer" className="mt-0">
          <UsersList 
            users={filteredUsers} 
            onEdit={handleEditUser}
            onDelete={handleDeleteUser}
            getUserBadgeColor={getUserBadgeColor}
            getRoleIcon={getRoleIcon}
            getRoleLabel={getRoleLabel}
          />
        </TabsContent>

        <TabsContent value="driver" className="mt-0">
          <UsersList 
            users={filteredUsers} 
            onEdit={handleEditUser}
            onDelete={handleDeleteUser}
            getUserBadgeColor={getUserBadgeColor}
            getRoleIcon={getRoleIcon}
            getRoleLabel={getRoleLabel}
          />
        </TabsContent>

        <TabsContent value="admin" className="mt-0">
          <UsersList 
            users={filteredUsers} 
            onEdit={handleEditUser}
            onDelete={handleDeleteUser}
            getUserBadgeColor={getUserBadgeColor}
            getRoleIcon={getRoleIcon}
            getRoleLabel={getRoleLabel}
          />
        </TabsContent>
      </Tabs>

      {/* Navigation Settings Card */}
      <Card className="mt-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5" />
            إعدادات واجهة العملاء
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label className="flex items-center gap-2">
                <UserCog className="h-4 w-4" />
                إظهار زر لوحة التحكم للعملاء
              </Label>
              <Switch
                checked={navSettings.showAdminPanel}
                onCheckedChange={(value) => handleNavSettingsChange('showAdminPanel', value)}
                data-testid="switch-admin-panel"
              />
            </div>
            
            <div className="flex items-center justify-between">
              <Label className="flex items-center gap-2">
                <Truck className="h-4 w-4" />
                إظهار زر تطبيق السائق للعملاء
              </Label>
              <Switch
                checked={navSettings.showDeliveryApp}
                onCheckedChange={(value) => handleNavSettingsChange('showDeliveryApp', value)}
                data-testid="switch-delivery-app"
              />
            </div>
            
            <div className="flex items-center justify-between">
              <Label className="flex items-center gap-2">
                <Receipt className="h-4 w-4" />
                إظهار صفحة الطلبات
              </Label>
              <Switch
                checked={navSettings.showOrdersPage}
                onCheckedChange={(value) => handleNavSettingsChange('showOrdersPage', value)}
                data-testid="switch-orders-page"
              />
            </div>
            
            <div className="flex items-center justify-between">
              <Label className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                إظهار صفحة تتبع الطلبات
              </Label>
              <Switch
                checked={navSettings.showTrackOrdersPage}
                onCheckedChange={(value) => handleNavSettingsChange('showTrackOrdersPage', value)}
                data-testid="switch-track-orders-page"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Edit User Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-md" dir="rtl">
          <DialogHeader>
            <DialogTitle>تعديل بيانات المستخدم</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="edit-name">الاسم</Label>
              <Input
                id="edit-name"
                value={editForm.name}
                onChange={(e) => setEditForm(prev => ({ ...prev, name: e.target.value }))}
                data-testid="input-edit-name"
              />
            </div>
            
            <div>
              <Label htmlFor="edit-email">البريد الإلكتروني</Label>
              <Input
                id="edit-email"
                type="email"
                value={editForm.email}
                onChange={(e) => setEditForm(prev => ({ ...prev, email: e.target.value }))}
                data-testid="input-edit-email"
              />
            </div>
            
            <div>
              <Label htmlFor="edit-phone">رقم الهاتف</Label>
              <Input
                id="edit-phone"
                value={editForm.phone}
                onChange={(e) => setEditForm(prev => ({ ...prev, phone: e.target.value }))}
                data-testid="input-edit-phone"
              />
            </div>
            
            <div>
              <Label htmlFor="edit-password">كلمة مرور جديدة (اختياري)</Label>
              <div className="relative">
                <Input
                  id="edit-password"
                  type={showPassword ? "text" : "password"}
                  value={editForm.newPassword}
                  onChange={(e) => setEditForm(prev => ({ ...prev, newPassword: e.target.value }))}
                  placeholder="اتركها فارغة للاحتفاظ بكلمة المرور الحالية"
                  data-testid="input-edit-password"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute left-0 top-0 h-full px-3"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
            </div>
            
            <div>
              <Label htmlFor="edit-role">الدور</Label>
              <Select
                value={editForm.role}
                onValueChange={(value) => setEditForm(prev => ({ ...prev, role: value as any }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="customer">عميل</SelectItem>
                  <SelectItem value="driver">سائق</SelectItem>
                  <SelectItem value="admin">مدير</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex items-center justify-between">
              <Label htmlFor="edit-active">الحساب نشط</Label>
              <Switch
                id="edit-active"
                checked={editForm.isActive}
                onCheckedChange={(value) => setEditForm(prev => ({ ...prev, isActive: value }))}
                data-testid="switch-edit-active"
              />
            </div>
          </div>

          <DialogFooter className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => setEditDialogOpen(false)}
              data-testid="button-cancel-edit"
            >
              <X className="h-4 w-4 mr-2" />
              إلغاء
            </Button>
            <Button
              onClick={handleSaveUser}
              disabled={updateUserMutation.isPending}
              data-testid="button-save-user"
            >
              {updateUserMutation.isPending ? (
                <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              حفظ التغييرات
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

// Users List Component
interface UsersListProps {
  users: User[];
  onEdit: (user: User) => void;
  onDelete: (user: User) => void;
  getUserBadgeColor: (role: string) => string;
  getRoleIcon: (role: string) => React.ReactNode;
  getRoleLabel: (role: string) => string;
}

const UsersList: React.FC<UsersListProps> = ({ 
  users, 
  onEdit, 
  onDelete, 
  getUserBadgeColor, 
  getRoleIcon, 
  getRoleLabel 
}) => {
  if (users.length === 0) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="text-center text-gray-500">
            <Users className="h-12 w-12 mx-auto mb-4 text-gray-300" />
            <p>لا توجد نتائج مطابقة للبحث</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-4">
      {users.map((user) => (
        <Card key={user.id} className="hover:shadow-md transition-shadow">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold">
                  {user.name.charAt(0)}
                </div>
                
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-gray-900 dark:text-white">{user.name}</h3>
                    <Badge className={`text-xs ${getUserBadgeColor(user.role)}`}>
                      <div className="flex items-center gap-1">
                        {getRoleIcon(user.role)}
                        {getRoleLabel(user.role)}
                      </div>
                    </Badge>
                    {!user.isActive && (
                      <Badge variant="destructive" className="text-xs">معطل</Badge>
                    )}
                  </div>
                  
                  <div className="flex flex-col gap-1 text-sm text-gray-600 dark:text-gray-400">
                    <div className="flex items-center gap-2">
                      <Mail className="h-3 w-3" />
                      {user.email}
                    </div>
                    {user.phone && (
                      <div className="flex items-center gap-2">
                        <Phone className="h-3 w-3" />
                        {user.phone}
                      </div>
                    )}
                    <div className="flex items-center gap-2">
                      <Calendar className="h-3 w-3" />
                      انضم في {new Date(user.createdAt).toLocaleDateString('ar')}
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onEdit(user)}
                  data-testid={`button-edit-user-${user.id}`}
                >
                  <Edit className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onDelete(user)}
                  className="text-red-600 hover:text-red-700"
                  data-testid={`button-delete-user-${user.id}`}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default AdminUsers;