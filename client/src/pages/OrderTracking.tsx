import { useState, useEffect } from 'react';
import { useParams, useLocation } from 'wouter';
import { ArrowRight, MapPin, Clock, Phone, Truck, User, Loader } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useQuery } from '@tanstack/react-query';

interface OrderStatus {
  id: string;
  status: string;
  timestamp: Date;
  message: string;
}

interface OrderDetails {
  id: string;
  orderNumber: string;
  customerName: string;
  customerPhone: string;
  deliveryAddress: string;
  items: string | any[];
  total: number;
  totalAmount: string;
  status: string;
  estimatedTime: string;
  driverName?: string;
  driverPhone?: string;
  restaurantName?: string;
  restaurantAddress?: string;
  createdAt: Date;
}

export default function OrderTracking() {
  const { orderId } = useParams<{ orderId: string }>();
  const [, setLocation] = useLocation();
  const [driverLocation, setDriverLocation] = useState<{ lat: number, lng: number } | null>(null);

  // Fetch real order data
  const { data: order, isLoading: isOrderLoading, error: orderError, refetch: refetchOrder } = useQuery<OrderDetails>({
    queryKey: [`/api/orders/${orderId}`],
    enabled: !!orderId,
  });

  // Fetch tracking data
  const { data: trackingSteps = [], isLoading: isTrackingLoading, refetch: refetchTracking } = useQuery<any[]>({
    queryKey: [`/api/orders/${orderId}/track`],
    enabled: !!orderId,
  });

  // WebSocket Connection
  useEffect(() => {
    if (!orderId) return;

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    const ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      console.log('Connected to WebSocket for tracking');
      ws.send(JSON.stringify({
        type: 'track_order',
        payload: { orderId }
      }));
    };

    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        if (message.type === 'driver_location' && order?.driverId === message.payload.driverId) {
          setDriverLocation({
            lat: message.payload.latitude,
            lng: message.payload.longitude
          });
        } else if (message.type === 'order_update' && message.payload.orderId === orderId) {
          refetchOrder();
          refetchTracking();
        }
      } catch (err) {
        console.error('Failed to parse WS message:', err);
      }
    };

    return () => {
      ws.close();
    };
  }, [orderId, order?.driverId, refetchOrder, refetchTracking]);

  const parsedItems = order ? (typeof order.items === 'string' ? JSON.parse(order.items) : order.items) : [];

  const getStatusProgress = (status: string) => {
    const statusMap: Record<string, number> = {
      pending: 20,
      confirmed: 40,
      preparing: 60,
      picked_up: 75,
      on_way: 90,
      delivered: 100,
      cancelled: 0,
    };
    return statusMap[status] || 0;
  };

  const getStatusColor = (status: string) => {
    const colorMap = {
      pending: 'bg-yellow-500',
      confirmed: 'bg-blue-500',
      preparing: 'bg-orange-500',
      on_way: 'bg-purple-500',
      delivered: 'bg-green-500',
      cancelled: 'bg-red-500',
    };
    return colorMap[status as keyof typeof colorMap] || 'bg-gray-500';
  };

  const getStatusText = (status: string) => {
    const textMap: Record<string, string> = {
      pending: 'في الانتظار',
      confirmed: 'مؤكد',
      preparing: 'قيد التحضير',
      picked_up: 'تم الاستلام',
      on_way: 'في الطريق',
      delivered: 'تم التوصيل',
      cancelled: 'ملغي',
    };
    return textMap[status] || status;
  };

  if (isOrderLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-gray-600">جاري تحميل بيانات الطلب...</p>
        </div>
      </div>
    );
  }

  if (orderError || !order) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="max-w-md w-full text-center p-6">
          <h3 className="text-lg font-bold text-red-600 mb-2">خطأ في التحميل</h3>
          <p className="text-gray-600 mb-4">تعذر العثور على بيانات الطلب. قد يكون المعرف غير صحيح.</p>
          <Button onClick={() => setLocation('/')} className="w-full">
            العودة للرئيسية
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <header className="bg-card border-b border-border p-4">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setLocation('/orders')}
            data-testid="button-tracking-back"
          >
            <ArrowRight className="h-5 w-5" />
          </Button>
          <h2 className="text-xl font-bold text-foreground">تتبع الطلب</h2>
        </div>
      </header>

      <section className="p-4 space-y-6">
        {/* Order Status Card */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">طلب #{order.orderNumber}</CardTitle>
              <Badge 
                className={`${getStatusColor(order.status)} text-white`}
                data-testid="order-status-badge"
              >
                {getStatusText(order.status)}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3">
              <Clock className="h-5 w-5 text-muted-foreground" />
              <span className="text-foreground">الوقت المتوقع: </span>
              <span className="font-bold text-primary" data-testid="estimated-time">
                {order.estimatedTime || '30-45 دقيقة'}
              </span>
            </div>
            
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">حالة الطلب</span>
                <span className="text-foreground">{getStatusProgress(order.status)}%</span>
              </div>
              <Progress 
                value={getStatusProgress(order.status)} 
                className="h-2"
                data-testid="order-progress"
              />
            </div>
          </CardContent>
        </Card>

        {/* Restaurant Info */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <Package className="h-5 w-5 text-primary mt-1" />
              <div>
                <h4 className="font-medium text-foreground mb-1">المطعم</h4>
                <p className="text-sm font-bold text-foreground">
                  {order.restaurantName || 'مطعم غير معروف'}
                </p>
                {order.restaurantAddress && (
                  <p className="text-xs text-muted-foreground">
                    {order.restaurantAddress}
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Driver Info */}
        {(['picked_up', 'on_way'].includes(order.status)) && order.driverId && (
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-12 h-12 bg-primary rounded-full flex items-center justify-center">
                  <User className="h-6 w-6 text-primary-foreground" />
                </div>
                <div className="flex-1">
                  <h4 className="font-medium text-foreground" data-testid="driver-name">
                    {order.driverName || 'سائق التوصيل'}
                  </h4>
                  <p className="text-sm text-muted-foreground">جاري التوصيل</p>
                </div>
                {order.driverPhone && (
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => window.open(`tel:${order.driverPhone}`)}
                    data-testid="button-call-driver"
                  >
                    <Phone className="h-4 w-4 ml-2" />
                    اتصال
                  </Button>
                )}
              </div>
              <div className="bg-muted p-3 rounded-lg">
                <div className="flex items-center gap-2">
                  <Truck className="h-4 w-4 text-primary" />
                  <span className="text-sm text-foreground">السائق في الطريق إليك</span>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Delivery Address */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <MapPin className="h-5 w-5 text-primary mt-1" />
              <div>
                <h4 className="font-medium text-foreground mb-1">عنوان التوصيل</h4>
                <p className="text-sm text-foreground" data-testid="delivery-address">
                  {order.deliveryAddress}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Order Items */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">تفاصيل الطلب</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {parsedItems.map((item: any, index: number) => (
              <div key={index} className="flex justify-between items-center py-2 border-b border-border last:border-0">
                <div className="flex-1">
                  <span className="text-foreground font-medium" data-testid={`item-name-${index}`}>
                    {item.name}
                  </span>
                  <span className="text-muted-foreground text-sm mr-2">
                    × {item.quantity}
                  </span>
                </div>
                <span className="font-bold text-primary" data-testid={`item-price-${index}`}>
                  {(item.price * item.quantity).toFixed(2)} ريال
                </span>
              </div>
            ))}
            <div className="border-t border-border pt-3 mt-3">
              <div className="flex justify-between items-center font-bold">
                <span className="text-foreground">الإجمالي</span>
                <span className="text-primary" data-testid="order-total">
                  {order.totalAmount || order.total} ريال
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Order Timeline */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">تاريخ الطلب</CardTitle>
          </CardHeader>
          <CardContent>
            {trackingSteps.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-4">لا توجد تحديثات متاحة حالياً</p>
            ) : (
              <div className="space-y-4">
                {trackingSteps.map((step, index) => (
                  <div key={step.id || index} className="flex items-start gap-3">
                    <div className={`w-4 h-4 rounded-full ${getStatusColor(step.status)} mt-1 flex-shrink-0`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-foreground font-medium" data-testid={`timeline-description-${index}`}>
                        {step.message}
                      </p>
                      <p className="text-sm text-muted-foreground" data-testid={`timeline-time-${index}`}>
                        {new Date(step.createdAt || step.timestamp).toLocaleTimeString('ar-YE', { 
                          hour: '2-digit', 
                          minute: '2-digit' 
                        })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="space-y-3 pb-8">
          <Button 
            variant="outline" 
            className="w-full"
            onClick={() => window.open('https://wa.me/967770000000', '_blank')}
            data-testid="button-contact-support"
          >
            تواصل مع الدعم
          </Button>
          
          {['pending', 'confirmed'].includes(order.status) && (
            <Button 
              variant="destructive" 
              className="w-full"
              data-testid="button-cancel-order"
            >
              إلغاء الطلب
            </Button>
          )}
        </div>
      </section>
    </div>
  );
}
