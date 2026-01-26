import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { ArrowRight, User, Phone, Mail, MapPin, Settings, Shield, Star, Clock, Receipt, Truck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useAuth } from '@/context/AuthContext';
import type { User as UserType } from '@shared/schema';

export default function Profile() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user: currentUser, isAuthenticated, loading: authLoading } = useAuth();
  
  // Use the actual logged-in user's ID
  const userId = currentUser?.id;
  
  const [profile, setProfile] = useState({
    username: '',
    name: '',
    phone: '',
    email: '',
    address: '',
  });

  const [isEditing, setIsEditing] = useState(false);

  // Fetch user data only if authenticated and have userId
  const { data: user, isLoading } = useQuery({
    queryKey: ['/api/users', userId],
    enabled: !!userId && isAuthenticated,
    retry: false,
  });

  // Update profile mutation
  const updateProfileMutation = useMutation({
    mutationFn: async (profileData: Partial<UserType>) => {
      if (!userId) throw new Error('يجب تسجيل الدخول أولاً');
      const response = await apiRequest('PUT', `/api/users/${userId}`, profileData);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/users', userId] });
      setIsEditing(false);
      toast({
        title: "تم حفظ البيانات",
        description: "تم تحديث معلومات الملف الشخصي بنجاح",
      });
    },
    onError: () => {
      toast({
        title: "خطأ في الحفظ",
        description: "حدث خطأ أثناء تحديث البيانات. يرجى المحاولة مرة أخرى.",
        variant: "destructive",
      });
    },
  });

  // Update profile state when user data is loaded
  useEffect(() => {
    if (user) {
      setProfile({
        username: (user as UserType).username || '',
        name: (user as UserType).name || '',
        phone: (user as UserType).phone || '',
        email: (user as UserType).email || '',
        address: (user as UserType).address || '',
      });
    }
  }, [user]);

  const handleSave = () => {
    if (isGuestMode) {
      handleGuestSave();
    } else {
      updateProfileMutation.mutate({
        username: profile.username,
        name: profile.name,
        phone: profile.phone,
        email: profile.email,
        address: profile.address,
      });
    }
  };

  // Show loading if auth is loading or data is loading
  if (authLoading || isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">جاري تحميل البيانات...</p>
        </div>
      </div>
    );
  }

  // Use local storage for guest users
  const isGuestMode = !isAuthenticated || !userId;

  // Load profile from localStorage for guest users
  useEffect(() => {
    if (isGuestMode) {
      const guestProfile = localStorage.getItem('guest_profile');
      if (guestProfile) {
        try {
          const parsedProfile = JSON.parse(guestProfile);
          setProfile(prev => ({ ...prev, ...parsedProfile }));
        } catch (error) {
          console.error('Error loading guest profile:', error);
        }
      }
    }
  }, [isGuestMode]);

  // Save to localStorage for guest users
  const handleGuestSave = () => {
    try {
      localStorage.setItem('guest_profile', JSON.stringify({
        username: profile.username,
        name: profile.name,
        phone: profile.phone,
        email: profile.email,
        address: profile.address,
      }));
      setIsEditing(false);
      toast({
        title: "تم حفظ البيانات محلياً",
        description: "تم حفظ معلوماتك محلياً. للحفظ الدائم، يمكنك تسجيل حساب جديد.",
      });
    } catch (error) {
      toast({
        title: "خطأ في الحفظ",
        description: "حدث خطأ أثناء حفظ البيانات محلياً",
        variant: "destructive",
      });
    }
  };

  const profileStats = [
    { icon: Receipt, label: 'إجمالي الطلبات', value: '42', color: 'text-primary' },
    { icon: Star, label: 'التقييم', value: '4.8', color: 'text-yellow-500' },
    { icon: Clock, label: 'عضو منذ', value: '6 أشهر', color: 'text-green-500' },
  ];

  const menuItems = [
    { icon: Receipt, label: 'طلباتي', path: '/orders', description: 'عرض تاريخ الطلبات', testId: 'profile-orders' },
    { icon: Truck, label: 'تطبيق الدلفري', path: '/driver', description: 'انتقال إلى تطبيق السائقين', testId: 'profile-delivery-app', onClick: () => { window.location.href = '/driver'; } },
    { icon: MapPin, label: 'العناوين المحفوظة', path: '/addresses', description: 'إدارة عناوين التوصيل', testId: 'profile-addresses' },
    { icon: Settings, label: 'الإعدادات', path: '/settings', description: 'إعدادات التطبيق والحساب', testId: 'profile-settings' },
    { icon: Shield, label: 'سياسة الخصوصية', path: '/privacy', description: 'سياسة الخصوصية وشروط الاستخدام', testId: 'profile-privacy' },
  ];

  return (
    <div>
      {/* Header */}
      <header className="bg-card border-b border-border p-4">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setLocation('/')}
            data-testid="button-profile-back"
          >
            <ArrowRight className="h-5 w-5" />
          </Button>
          <h2 className="text-xl font-bold text-foreground">الملف الشخصي</h2>
        </div>
      </header>

      <section className="p-4 space-y-6">
        {/* Profile Info Card */}
        <Card>
          <CardHeader className="text-center">
            <div className="w-20 h-20 bg-primary rounded-full flex items-center justify-center mx-auto mb-4">
              <User className="h-10 w-10 text-primary-foreground" />
            </div>
            <CardTitle className="text-xl text-foreground">
              {profile.name || (isGuestMode ? 'مستخدم ضيف' : 'المستخدم')}
            </CardTitle>
            <Badge variant={isGuestMode ? "outline" : "secondary"} className="mx-auto">
              {isGuestMode ? 'مستخدم ضيف' : 'عضو مميز'}
            </Badge>
          </CardHeader>
          <CardContent className="space-y-4">
            {isEditing ? (
              <div className="space-y-4">
                <div>
                  <Label htmlFor="name" className="text-foreground">الاسم</Label>
                  <Input
                    id="name"
                    value={profile.name}
                    onChange={(e) => setProfile(prev => ({ ...prev, name: e.target.value }))}
                    data-testid="input-profile-name"
                  />
                </div>
                <div>
                  <Label htmlFor="username" className="text-foreground">اسم المستخدم</Label>
                  <Input
                    id="username"
                    value={profile.username}
                    onChange={(e) => setProfile(prev => ({ ...prev, username: e.target.value }))}
                    data-testid="input-profile-username"
                  />
                </div>
                <div>
                  <Label htmlFor="phone" className="text-foreground">رقم الهاتف</Label>
                  <Input
                    id="phone"
                    value={profile.phone}
                    onChange={(e) => setProfile(prev => ({ ...prev, phone: e.target.value }))}
                    data-testid="input-profile-phone"
                  />
                </div>
                <div>
                  <Label htmlFor="email" className="text-foreground">البريد الإلكتروني</Label>
                  <Input
                    id="email"
                    type="email"
                    value={profile.email}
                    onChange={(e) => setProfile(prev => ({ ...prev, email: e.target.value }))}
                    data-testid="input-profile-email"
                  />
                </div>
                <div>
                  <Label htmlFor="address" className="text-foreground">العنوان</Label>
                  <Input
                    id="address"
                    value={profile.address}
                    onChange={(e) => setProfile(prev => ({ ...prev, address: e.target.value }))}
                    data-testid="input-profile-address"
                  />
                </div>
                <div className="flex gap-2">
                  <Button 
                    onClick={handleSave} 
                    className="flex-1" 
                    disabled={!isGuestMode && updateProfileMutation.isPending}
                    data-testid="button-save-profile"
                  >
                    {!isGuestMode && updateProfileMutation.isPending 
                      ? 'جاري الحفظ...' 
                      : isGuestMode 
                        ? 'حفظ محلياً'
                        : 'حفظ التغييرات'
                    }
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={() => setIsEditing(false)}
                    data-testid="button-cancel-edit"
                  >
                    إلغاء
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                  <User className="h-5 w-5 text-muted-foreground" />
                  <span className="text-foreground" data-testid="profile-username">{profile.username}</span>
                </div>
                <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                  <Phone className="h-5 w-5 text-muted-foreground" />
                  <span className="text-foreground" data-testid="profile-phone">{profile.phone}</span>
                </div>
                <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                  <Mail className="h-5 w-5 text-muted-foreground" />
                  <span className="text-foreground" data-testid="profile-email">{profile.email}</span>
                </div>
                <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                  <MapPin className="h-5 w-5 text-muted-foreground" />
                  <span className="text-foreground" data-testid="profile-address">{profile.address}</span>
                </div>
                <Button 
                  onClick={() => setIsEditing(true)} 
                  className="w-full"
                  data-testid="button-edit-profile"
                >
                  تعديل المعلومات
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          {profileStats.map((stat, index) => {
            const Icon = stat.icon;
            return (
              <Card key={index} className="text-center">
                <CardContent className="p-4">
                  <Icon className={`h-6 w-6 ${stat.color} mx-auto mb-2`} />
                  <div className="text-lg font-bold text-foreground" data-testid={`stat-${index}`}>
                    {stat.value}
                  </div>
                  <div className="text-xs text-muted-foreground">{stat.label}</div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Menu Items */}
        <div className="space-y-3">
          {menuItems.map((item) => {
            const Icon = item.icon;
            return (
              <Button
                key={item.path}
                variant="ghost"
                className="w-full h-auto p-4 justify-between hover:bg-accent"
                onClick={() => item.onClick ? item.onClick() : setLocation(item.path)}
                data-testid={item.testId}
              >
                <div className="flex items-center gap-3">
                  <Icon className="h-6 w-6 text-primary" />
                  <div className="text-right">
                    <div className="font-medium text-foreground">{item.label}</div>
                    <div className="text-sm text-muted-foreground">{item.description}</div>
                  </div>
                </div>
                <ArrowRight className="h-5 w-5 text-muted-foreground rotate-180" />
              </Button>
            );
          })}
        </div>
      </section>
    </div>
  );
}