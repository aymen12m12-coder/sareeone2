import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowRight, Plus, Edit, Trash2, Save, X, Percent } from 'lucide-react';
import ImageUpload from '@/components/ImageUpload';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import type { SpecialOffer } from '@shared/schema';

export function AdminSpecialOffers() {
  const [, setLocation] = useLocation();
  const [editingOffer, setEditingOffer] = useState<any | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    image: '',
    discountPercent: '',
    discountAmount: '',
    minimumOrder: '',
    validUntil: '',
    isActive: true
  });

  // Fetch special offers
  const { data: offers, isLoading } = useQuery<any[]>({
    queryKey: ['/api/special-offers'],
  });


  // Create offer mutation
  const createOfferMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await fetch('/api/special-offers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error('Failed to create offer');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/special-offers'] });
      setShowAddForm(false);
      resetForm();
      toast({ title: 'تم إنشاء العرض بنجاح' });
    },
    onError: () => {
      toast({ title: 'فشل في إنشاء العرض', variant: 'destructive' });
    },
  });

  // Update offer mutation
  const updateOfferMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await fetch(`/api/special-offers/${data.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error('Failed to update offer');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/special-offers'] });
      setEditingOffer(null);
      resetForm();
      toast({ title: 'تم تحديث العرض بنجاح' });
    },
    onError: () => {
      toast({ title: 'فشل في تحديث العرض', variant: 'destructive' });
    },
  });

  // Delete offer mutation
  const deleteOfferMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/special-offers/${id}`, {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error('Failed to delete offer');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/special-offers'] });
      toast({ title: 'تم حذف العرض بنجاح' });
    },
    onError: () => {
      toast({ title: 'فشل في حذف العرض', variant: 'destructive' });
    },
  });

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      image: '',
      discountPercent: '',
      discountAmount: '',
      minimumOrder: '',
      validUntil: '',
      isActive: true
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // تحويل البيانات لتتطابق مع database schema
    const dataToSubmit = {
      title: formData.title,
      description: formData.description,
      image: formData.image || "https://images.pexels.com/photos/1640777/pexels-photo-1640777.jpeg",
      discountPercent: formData.discountPercent ? parseInt(formData.discountPercent) : null,
      discountAmount: formData.discountAmount ? parseFloat(formData.discountAmount) : null,
      minimumOrder: formData.minimumOrder ? parseFloat(formData.minimumOrder) : 0,
      validUntil: formData.validUntil ? new Date(formData.validUntil) : null,
      isActive: formData.isActive
    };
    
    if (editingOffer) {
      updateOfferMutation.mutate({ ...dataToSubmit, id: editingOffer.id });
    } else {
      createOfferMutation.mutate(dataToSubmit);
    }
  };

  const startEdit = (offer: SpecialOffer) => {
    setEditingOffer(offer);
    setFormData({
      title: offer.title,
      description: offer.description || '',
      image: offer.image || '',
      discountPercent: offer.discountPercent?.toString() || '',
      discountAmount: offer.discountAmount?.toString() || '',
      minimumOrder: offer.minimumOrder?.toString() || '',
      validUntil: offer.validUntil ? new Date(offer.validUntil).toISOString().slice(0, 16) : '',
      isActive: offer.isActive
    });
    setShowAddForm(false);
  };

  const cancelEdit = () => {
    setEditingOffer(null);
    setShowAddForm(false);
    resetForm();
  };

  const formatDate = (date: string | Date) => {
    return new Date(date).toLocaleDateString('ar-SA', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getDiscountText = (offer: SpecialOffer) => {
    if (offer.discountPercent) {
      return `${offer.discountPercent}%`;
    } else if (offer.discountAmount) {
      return `${offer.discountAmount} ريال`;
    }
    return 'خصم';
  };


  const getOfferStatus = (offer: SpecialOffer) => {
    if (!offer.isActive) return { text: 'غير نشط', color: 'bg-gray-100 text-gray-700' };
    
    const now = new Date();
    const validUntil = offer.validUntil ? new Date(offer.validUntil) : null;
    
    if (validUntil && now > validUntil) return { text: 'منتهي الصلاحية', color: 'bg-red-100 text-red-700' };
    return { text: 'نشط', color: 'bg-green-100 text-green-700' };
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setLocation('/admin')}
          >
            <ArrowRight className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">إدارة العروض الخاصة</h1>
            <p className="text-muted-foreground">إنشاء وإدارة عروض الخصم والكوبونات</p>
          </div>
        </div>
        
        <Button
          onClick={() => {
            setShowAddForm(true);
            setEditingOffer(null);
            resetForm();
          }}
          className="gap-2"
        >
          <Plus className="h-4 w-4" />
          إضافة عرض جديد
        </Button>
      </div>

      {/* Add/Edit Form */}
      {(showAddForm || editingOffer) && (
        <Card>
          <CardHeader>
            <CardTitle>
              {editingOffer ? 'تعديل العرض' : 'إضافة عرض جديد'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="title">عنوان العرض</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="مثال: خصم 20% على جميع الطلبات"
                    required
                  />
                </div>
                
                <div>
                  <ImageUpload
                    label="صورة العرض (اختياري)"
                    value={formData.image}
                    onChange={(url) => setFormData({ ...formData, image: url })}
                    bucket="offers"
                    required={false}
                    data-testid="input-special-offer-image"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="description">وصف العرض</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="وصف تفصيلي للعرض"
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="discountPercent">نسبة الخصم (%)</Label>
                  <Input
                    id="discountPercent"
                    type="number"
                    step="1"
                    min="0"
                    max="100"
                    value={formData.discountPercent}
                    onChange={(e) => setFormData({ ...formData, discountPercent: e.target.value, discountAmount: '' })}
                    placeholder="20"
                  />
                </div>
                
                <div>
                  <Label htmlFor="discountAmount">مبلغ الخصم (ريال)</Label>
                  <Input
                    id="discountAmount"
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.discountAmount}
                    onChange={(e) => setFormData({ ...formData, discountAmount: e.target.value, discountPercent: '' })}
                    placeholder="50"
                  />
                </div>

                <div>
                  <Label htmlFor="minimumOrder">الحد الأدنى للطلب (ريال)</Label>
                  <Input
                    id="minimumOrder"
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.minimumOrder}
                    onChange={(e) => setFormData({ ...formData, minimumOrder: e.target.value })}
                    placeholder="100"
                  />
                </div>
              </div>


              <div>
                <Label htmlFor="validUntil">تاريخ الانتهاء (اختياري)</Label>
                <Input
                  id="validUntil"
                  type="datetime-local"
                  value={formData.validUntil}
                  onChange={(e) => setFormData({ ...formData, validUntil: e.target.value })}
                />
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="isActive"
                  checked={formData.isActive}
                  onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
                />
                <Label htmlFor="isActive">نشط</Label>
              </div>

              <div className="flex gap-2">
                <Button 
                  type="submit" 
                  disabled={createOfferMutation.isPending || updateOfferMutation.isPending}
                  className="gap-2"
                >
                  <Save className="h-4 w-4" />
                  {editingOffer ? 'تحديث' : 'حفظ'}
                </Button>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={cancelEdit}
                  className="gap-2"
                >
                  <X className="h-4 w-4" />
                  إلغاء
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Offers List */}
      <div className="space-y-4">
        {isLoading ? (
          <div className="flex items-center justify-center p-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : offers?.length === 0 ? (
          <Card>
            <CardContent className="p-6 text-center">
              <p className="text-muted-foreground">لا توجد عروض خاصة</p>
            </CardContent>
          </Card>
        ) : (
          offers?.map((offer) => {
            const status = getOfferStatus(offer);
            
            return (
              <Card key={offer.id}>
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-semibold text-lg">{offer.title}</h3>
                        <Badge className={status.color}>
                          {status.text}
                        </Badge>
                        <Badge variant="outline" className="gap-1">
                          <Percent className="h-3 w-3" />
                          {getDiscountText(offer)}
                        </Badge>
                      </div>
                      
                      {offer.description && (
                        <p className="text-muted-foreground mb-3">{offer.description}</p>
                      )}
                      
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                        <div>
                          <p className="font-medium text-muted-foreground">تاريخ الانتهاء</p>
                          <p>{offer.validUntil ? formatDate(offer.validUntil) : 'غير محدد'}</p>
                        </div>
                        
                        <div>
                          <p className="font-medium text-muted-foreground">الحد الأدنى للطلب</p>
                          <p>{offer.minimumOrder ? `${offer.minimumOrder} ريال` : 'بدون حد أدنى'}</p>
                        </div>
                        
                        <div>
                          <p className="font-medium text-muted-foreground">تاريخ الإنشاء</p>
                          <p>{formatDate(offer.createdAt)}</p>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => startEdit(offer)}
                        className="gap-2"
                      >
                        <Edit className="h-4 w-4" />
                        تعديل
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          if (window.confirm('هل أنت متأكد من حذف هذا العرض؟')) {
                            deleteOfferMutation.mutate(offer.id);
                          }
                        }}
                        className="gap-2 text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4" />
                        حذف
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}

export default AdminSpecialOffers;