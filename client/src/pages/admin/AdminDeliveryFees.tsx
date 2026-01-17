import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from '@/hooks/use-toast';
import { 
  Truck, 
  MapPin, 
  Settings, 
  Plus, 
  Edit, 
  Trash2, 
  Save,
  Calculator
} from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';

interface DeliveryZone {
  id: string;
  name: string;
  description?: string;
  minDistance: string;
  maxDistance: string;
  deliveryFee: string;
  estimatedTime?: string;
  isActive: boolean;
}

interface DeliveryFeeSettings {
  id?: string;
  type: 'fixed' | 'per_km' | 'zone_based' | 'restaurant_custom';
  baseFee: string;
  perKmFee: string;
  minFee: string;
  maxFee: string;
  freeDeliveryThreshold: string;
}

export default function AdminDeliveryFees() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('settings');
  const [isAddZoneOpen, setIsAddZoneOpen] = useState(false);
  const [editingZone, setEditingZone] = useState<DeliveryZone | null>(null);

  // جلب إعدادات رسوم التوصيل
  const { data: settings, isLoading: settingsLoading } = useQuery<DeliveryFeeSettings>({
    queryKey: ['/api/delivery-fees/settings'],
  });

  // جلب مناطق التوصيل
  const { data: zones = [], isLoading: zonesLoading } = useQuery<DeliveryZone[]>({
    queryKey: ['/api/delivery-fees/zones'],
  });

  // حالة الإعدادات
  const [formSettings, setFormSettings] = useState<DeliveryFeeSettings>({
    type: 'per_km',
    baseFee: '5',
    perKmFee: '2',
    minFee: '3',
    maxFee: '50',
    freeDeliveryThreshold: '0'
  });

  // حالة منطقة جديدة
  const [newZone, setNewZone] = useState({
    name: '',
    description: '',
    minDistance: '0',
    maxDistance: '',
    deliveryFee: '',
    estimatedTime: ''
  });

  // تحديث الإعدادات عند تحميلها
  useState(() => {
    if (settings) {
      setFormSettings(settings);
    }
  });

  // حفظ الإعدادات
  const saveSettingsMutation = useMutation({
    mutationFn: async (data: DeliveryFeeSettings) => {
      const response = await apiRequest('POST', '/api/delivery-fees/settings', data);
      return response.json();
    },
    onSuccess: () => {
      toast({ title: 'تم حفظ الإعدادات بنجاح' });
      queryClient.invalidateQueries({ queryKey: ['/api/delivery-fees/settings'] });
    },
    onError: () => {
      toast({ title: 'خطأ في حفظ الإعدادات', variant: 'destructive' });
    }
  });

  // إضافة منطقة
  const addZoneMutation = useMutation({
    mutationFn: async (data: typeof newZone) => {
      const response = await apiRequest('POST', '/api/delivery-fees/zones', data);
      return response.json();
    },
    onSuccess: () => {
      toast({ title: 'تمت إضافة المنطقة بنجاح' });
      queryClient.invalidateQueries({ queryKey: ['/api/delivery-fees/zones'] });
      setIsAddZoneOpen(false);
      setNewZone({
        name: '',
        description: '',
        minDistance: '0',
        maxDistance: '',
        deliveryFee: '',
        estimatedTime: ''
      });
    },
    onError: () => {
      toast({ title: 'خطأ في إضافة المنطقة', variant: 'destructive' });
    }
  });

  // حذف منطقة
  const deleteZoneMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await apiRequest('DELETE', `/api/delivery-fees/zones/${id}`, {});
      return response.json();
    },
    onSuccess: () => {
      toast({ title: 'تم حذف المنطقة بنجاح' });
      queryClient.invalidateQueries({ queryKey: ['/api/delivery-fees/zones'] });
    },
    onError: () => {
      toast({ title: 'خطأ في حذف المنطقة', variant: 'destructive' });
    }
  });

  return (
    <div className="p-6 space-y-6" dir="rtl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">إدارة رسوم التوصيل</h1>
          <p className="text-muted-foreground">تحكم في طريقة حساب رسوم التوصيل</p>
        </div>
        <Truck className="h-8 w-8 text-primary" />
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="settings" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            الإعدادات العامة
          </TabsTrigger>
          <TabsTrigger value="zones" className="flex items-center gap-2">
            <MapPin className="h-4 w-4" />
            مناطق التوصيل
          </TabsTrigger>
        </TabsList>

        {/* إعدادات رسوم التوصيل */}
        <TabsContent value="settings" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>طريقة حساب رسوم التوصيل</CardTitle>
              <CardDescription>
                اختر كيفية حساب رسوم التوصيل للطلبات
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* نوع الحساب */}
              <div className="space-y-2">
                <Label>نوع الحساب</Label>
                <Select 
                  value={formSettings.type} 
                  onValueChange={(value: DeliveryFeeSettings['type']) => 
                    setFormSettings(prev => ({ ...prev, type: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="اختر طريقة الحساب" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="fixed">رسوم ثابتة</SelectItem>
                    <SelectItem value="per_km">حسب المسافة (لكل كيلومتر)</SelectItem>
                    <SelectItem value="zone_based">حسب المناطق</SelectItem>
                    <SelectItem value="restaurant_custom">حسب إعدادات المطعم</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* الرسوم الأساسية */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>الرسوم الأساسية (ريال)</Label>
                  <Input
                    type="number"
                    value={formSettings.baseFee}
                    onChange={(e) => setFormSettings(prev => ({ ...prev, baseFee: e.target.value }))}
                    placeholder="5"
                  />
                </div>

                {formSettings.type === 'per_km' && (
                  <div className="space-y-2">
                    <Label>رسوم لكل كيلومتر (ريال)</Label>
                    <Input
                      type="number"
                      value={formSettings.perKmFee}
                      onChange={(e) => setFormSettings(prev => ({ ...prev, perKmFee: e.target.value }))}
                      placeholder="2"
                    />
                  </div>
                )}
              </div>

              {/* الحد الأدنى والأقصى */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>الحد الأدنى للرسوم (ريال)</Label>
                  <Input
                    type="number"
                    value={formSettings.minFee}
                    onChange={(e) => setFormSettings(prev => ({ ...prev, minFee: e.target.value }))}
                    placeholder="3"
                  />
                </div>
                <div className="space-y-2">
                  <Label>الحد الأقصى للرسوم (ريال)</Label>
                  <Input
                    type="number"
                    value={formSettings.maxFee}
                    onChange={(e) => setFormSettings(prev => ({ ...prev, maxFee: e.target.value }))}
                    placeholder="50"
                  />
                </div>
              </div>

              {/* حد التوصيل المجاني */}
              <div className="space-y-2">
                <Label>حد التوصيل المجاني (ريال)</Label>
                <Input
                  type="number"
                  value={formSettings.freeDeliveryThreshold}
                  onChange={(e) => setFormSettings(prev => ({ ...prev, freeDeliveryThreshold: e.target.value }))}
                  placeholder="0 = معطل"
                />
                <p className="text-xs text-muted-foreground">
                  إذا كان المجموع الفرعي للطلب أكبر من هذا المبلغ، يكون التوصيل مجاني. اتركه 0 لتعطيل هذه الميزة.
                </p>
              </div>

              {/* معادلة الحساب */}
              <Card className="bg-muted/50">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Calculator className="h-4 w-4" />
                    <span className="font-medium">معادلة الحساب</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {formSettings.type === 'fixed' && (
                      <>رسوم التوصيل = {formSettings.baseFee} ريال (ثابت)</>
                    )}
                    {formSettings.type === 'per_km' && (
                      <>رسوم التوصيل = {formSettings.baseFee} + (المسافة × {formSettings.perKmFee}) ريال</>
                    )}
                    {formSettings.type === 'zone_based' && (
                      <>رسوم التوصيل = حسب منطقة التوصيل المحددة</>
                    )}
                    {formSettings.type === 'restaurant_custom' && (
                      <>رسوم التوصيل = حسب إعدادات كل مطعم</>
                    )}
                  </p>
                </CardContent>
              </Card>

              <Button 
                onClick={() => saveSettingsMutation.mutate(formSettings)}
                disabled={saveSettingsMutation.isPending}
                className="w-full"
              >
                <Save className="h-4 w-4 mr-2" />
                {saveSettingsMutation.isPending ? 'جاري الحفظ...' : 'حفظ الإعدادات'}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* مناطق التوصيل */}
        <TabsContent value="zones" className="space-y-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>مناطق التوصيل</CardTitle>
                <CardDescription>
                  تحديد رسوم مختلفة حسب المسافة
                </CardDescription>
              </div>
              <Dialog open={isAddZoneOpen} onOpenChange={setIsAddZoneOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    إضافة منطقة
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>إضافة منطقة توصيل جديدة</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>اسم المنطقة</Label>
                      <Input
                        value={newZone.name}
                        onChange={(e) => setNewZone(prev => ({ ...prev, name: e.target.value }))}
                        placeholder="مثال: المنطقة القريبة"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>من (كم)</Label>
                        <Input
                          type="number"
                          value={newZone.minDistance}
                          onChange={(e) => setNewZone(prev => ({ ...prev, minDistance: e.target.value }))}
                          placeholder="0"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>إلى (كم)</Label>
                        <Input
                          type="number"
                          value={newZone.maxDistance}
                          onChange={(e) => setNewZone(prev => ({ ...prev, maxDistance: e.target.value }))}
                          placeholder="5"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>رسوم التوصيل (ريال)</Label>
                        <Input
                          type="number"
                          value={newZone.deliveryFee}
                          onChange={(e) => setNewZone(prev => ({ ...prev, deliveryFee: e.target.value }))}
                          placeholder="5"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>وقت التوصيل المتوقع</Label>
                        <Input
                          value={newZone.estimatedTime}
                          onChange={(e) => setNewZone(prev => ({ ...prev, estimatedTime: e.target.value }))}
                          placeholder="15-25 دقيقة"
                        />
                      </div>
                    </div>
                    <Button 
                      onClick={() => addZoneMutation.mutate(newZone)}
                      disabled={addZoneMutation.isPending || !newZone.name || !newZone.maxDistance || !newZone.deliveryFee}
                      className="w-full"
                    >
                      {addZoneMutation.isPending ? 'جاري الإضافة...' : 'إضافة المنطقة'}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              {zonesLoading ? (
                <div className="text-center py-8 text-muted-foreground">
                  جاري التحميل...
                </div>
              ) : zones.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <MapPin className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>لا توجد مناطق توصيل محددة</p>
                  <p className="text-sm">أضف مناطق لتحديد رسوم مختلفة حسب المسافة</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {zones.map((zone) => (
                    <Card key={zone.id} className="border">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <h4 className="font-medium">{zone.name}</h4>
                            <p className="text-sm text-muted-foreground">
                              المسافة: {zone.minDistance} - {zone.maxDistance} كم
                            </p>
                            {zone.estimatedTime && (
                              <p className="text-sm text-muted-foreground">
                                الوقت: {zone.estimatedTime}
                              </p>
                            )}
                          </div>
                          <div className="flex items-center gap-4">
                            <div className="text-left">
                              <p className="text-lg font-bold text-primary">
                                {zone.deliveryFee} ريال
                              </p>
                            </div>
                            <div className="flex gap-2">
                              <Button
                                variant="outline"
                                size="icon"
                                onClick={() => deleteZoneMutation.mutate(zone.id)}
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
