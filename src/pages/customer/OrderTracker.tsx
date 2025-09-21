
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ShoppingBag, 
  Package, 
  Truck, 
  Check,
  Clock,
  ExternalLink
} from 'lucide-react';
import { 
  Card, 
  CardContent
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { useCustomerOrders } from '@/hooks/useSupabase';
import DashboardLayout from '@/components/DashboardLayout';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { formatDistanceToNow } from 'date-fns';
import { formatPrice } from '@/lib/utils';

const OrderStatusBadge = ({ status }: { status: string }) => {
  let color;
  let icon;
  
  switch (status.toLowerCase()) {
    case 'completed':
    case 'delivered':
      color = 'bg-green-100 text-green-800';
      icon = <Check className="h-3 w-3 mr-1" />;
      break;
    case 'processing':
    case 'in transit':
    case 'shipped':
      color = 'bg-blue-100 text-blue-800';
      icon = <Truck className="h-3 w-3 mr-1" />;
      break;
    case 'pending':
    case 'waiting':
    case 'placed':
      color = 'bg-yellow-100 text-yellow-800';
      icon = <Clock className="h-3 w-3 mr-1" />;
      break;
    case 'cancelled':
    case 'failed':
      color = 'bg-red-100 text-red-800';
      icon = <ShoppingBag className="h-3 w-3 mr-1" />;
      break;
    default:
      color = 'bg-gray-100 text-gray-800';
      icon = <Package className="h-3 w-3 mr-1" />;
  }
  
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${color}`}>
      {icon}
      {status}
    </span>
  );
};

const OrderTracker = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated, loading } = useAuth();
  const { orders, loading: loadingOrders, error, refetch } = useCustomerOrders(user?.id);
  
  useEffect(() => {
    // Only redirect if loading is complete and user is not authenticated
    if (!loading && !isAuthenticated) {
      navigate('/login');
    }
  }, [isAuthenticated, loading, navigate]);
  
  const formatOrderDate = (dateString: string) => {
    const date = new Date(dateString);
    return `${date.toLocaleDateString()} (${formatDistanceToNow(date, { addSuffix: true })})`;
  };
  
  if (loading || loadingOrders) {
    return <div className="flex justify-center items-center h-screen">Loading...</div>;
  }
  
  return (
    <DashboardLayout title="My Orders" role="customer">
      <div className="mb-6">
        <h2 className="text-2xl font-semibold mb-2">Order Tracker</h2>
        <p className="text-gray-600">Track and manage your orders</p>
      </div>
      
      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      
      {orders.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center p-6 text-center">
            <ShoppingBag className="w-16 h-16 text-gray-300 mb-4" />
            <h3 className="text-xl font-medium mb-2">No Orders Yet</h3>
            <p className="text-gray-500 mb-4">
              You haven't placed any orders yet.
            </p>
            <Button onClick={() => navigate('/marketplace')}>
              <ShoppingBag className="mr-2 h-4 w-4" />
              Browse Products
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {orders.map((order) => (
            <Card key={order.id} className="overflow-hidden">
              <div className="bg-gray-50 p-4 flex flex-col md:flex-row gap-2 md:justify-between md:items-center">
                <div>
                  <p className="text-sm font-medium text-gray-500">Order ID</p>
                  <p className="font-medium">{order.id.substring(0, 8)}...</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Date</p>
                  <p className="font-medium">{formatOrderDate(order.created_at)}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Total</p>
                  <p className="font-medium">{formatPrice(order.total_price)}</p>
                </div>
                <div className="flex flex-col gap-1">
                  <OrderStatusBadge status={order.status} />
                </div>
              </div>
              
              <CardContent className="p-4">
                <div className="flex flex-col md:flex-row md:items-center gap-4">
                  {order.product && (
                    <>
                      <div className="w-24 h-24 flex-shrink-0 overflow-hidden rounded-md border border-gray-200">
                        <img 
                          src={order.product.images?.[0] || '/placeholder.svg'} 
                          alt={order.product.name}
                          className="h-full w-full object-cover object-center"
                          onError={(e) => {
                            e.currentTarget.src = 'https://via.placeholder.com/400?text=Product';
                          }}
                        />
                      </div>
                      
                      <div className="flex-grow">
                        <h3 className="font-medium">{order.product.name}</h3>
                        <div className="mt-1 flex flex-wrap gap-2 text-sm text-gray-500">
                          <p>Quantity: {order.quantity}</p>
                          <p>Price per unit: {formatPrice(order.product.price)}</p>
                        </div>
                        {order.product.is_gi_approved && (
                          <Badge variant="outline" className="mt-2 bg-green-50 text-green-600 border-green-200">
                            GI Approved
                          </Badge>
                        )}
                        
                        <Button 
                          variant="link" 
                          size="sm" 
                          className="p-0 mt-2 h-auto"
                          onClick={() => navigate(`/product/${order.product.id}`)}
                        >
                          View Product
                          <ExternalLink className="ml-1 h-3 w-3" />
                        </Button>
                      </div>
                    </>
                  )}
                </div>
                
                {order.shipping_address && (
                  <>
                    <Separator className="my-4" />
                    <div>
                      <h4 className="text-sm font-medium text-gray-500 mb-2">Shipping Address</h4>
                      <p className="text-sm">{order.shipping_address}</p>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </DashboardLayout>
  );
};

export default OrderTracker;
