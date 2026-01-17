import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { MenuItem } from '@shared/schema';
import { useCart } from '../contexts/CartContext';
import { useToast } from '@/hooks/use-toast';

interface MenuItemCardProps {
  item: MenuItem;
  disabled?: boolean;
  disabledMessage?: string;
  restaurantId?: string;
  restaurantName?: string;
}

export default function MenuItemCard({ 
  item, 
  disabled = false, 
  disabledMessage, 
  restaurantId = 'unknown', 
  restaurantName = 'مطعم غير محدد' 
}: MenuItemCardProps) {
  const { addItem } = useCart();
  const { toast } = useToast();

  const handleAddToCart = (e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (disabled && disabledMessage) {
      toast({
        title: "لا يمكن الطلب",
        description: disabledMessage,
        variant: "destructive",
      });
      return;
    }
    
    addItem(item, restaurantId, restaurantName);
    toast({
      title: "تمت الإضافة للسلة",
      description: `تم إضافة ${item.name} للسلة من ${restaurantName}`,
    });
  };

  const isSpecialOffer = item.isSpecialOffer && item.originalPrice;
  const savings = isSpecialOffer ? parseFloat(String(item.originalPrice!)) - parseFloat(String(item.price)) : 0;

  return (
    <Card 
      className={`p-4 flex gap-4 hover:shadow-md transition-shadow ${
        isSpecialOffer ? 'bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-200' : ''
      }`}
      data-testid={`menu-item-${item.id}`}
    >
      {isSpecialOffer && (
        <Badge className="absolute top-2 left-2 bg-green-500 text-white">
          عرض خاص
        </Badge>
      )}
      
      <img
        src={item.image}
        alt={item.name}
        className="w-20 h-20 object-cover rounded-lg flex-shrink-0"
      />
      
      <div className="flex-1">
        <h4 className="font-bold text-foreground mb-1" data-testid={`menu-item-name-${item.id}`}>
          {item.name}
        </h4>
        <p className="text-sm text-muted-foreground mb-2" data-testid={`menu-item-description-${item.id}`}>
          {item.description}
        </p>
        
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className={`text-lg font-bold ${isSpecialOffer ? 'text-green-600' : 'text-primary'}`}>
              {item.price} ريال
            </span>
            {isSpecialOffer && (
              <>
                <span className="text-sm text-muted-foreground line-through">
                  {item.originalPrice} ريال
                </span>
                <Badge variant="secondary" className="text-xs bg-green-100 text-green-700">
                  توفير {savings} ريال
                </Badge>
              </>
            )}
          </div>
          
          <Button
            onClick={handleAddToCart}
            className={isSpecialOffer ? 'bg-green-500 hover:bg-green-600 text-white' : ''}
            disabled={!item.isAvailable || disabled}
            data-testid={`button-add-to-cart-${item.id}`}
          >
            {item.isAvailable ? 'إضافة' : 'غير متوفر'}
          </Button>
        </div>
      </div>
    </Card>
  );
}
