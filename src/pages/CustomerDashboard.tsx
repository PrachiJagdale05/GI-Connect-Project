
import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { useCustomerOrders } from '@/hooks/useSupabase';
import DashboardLayout from '@/components/DashboardLayout';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { formatDistanceToNow } from 'date-fns';
import { formatPrice } from '@/lib/utils';
import { Package, ShoppingBag, Heart, CreditCard, MapPin, User, ArrowRight } from 'lucide-react';
import DashboardCard from '@/components/DashboardCard';

const CustomerDashboard = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated, loading } = useAuth();
  const { orders, loading: loadingOrders, error } = useCustomerOrders(user?.id);
  
  useEffect(() => {
    if (!loading && !isAuthenticated) {
      navigate('/login');
    }
  }, [isAuthenticated, loading, navigate]);

  if (loading || loadingOrders) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Calculate dashboard statistics
  const totalOrders = orders.length;
  const totalSpent = orders.reduce((sum, order) => sum + order.total_price, 0);
  const recentOrdersCount = orders.filter(order => {
    const orderDate = new Date(order.created_at);
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    return orderDate > thirtyDaysAgo;
  }).length;

  return (
    <DashboardLayout title="Customer Dashboard">
      <div className="space-y-6">
        {/* Welcome Section */}
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-6 border border-blue-100">
          <h2 className="text-2xl font-semibold text-gray-900 mb-2">
            Welcome back, {user?.name || 'Valued Customer'}!
          </h2>
          <p className="text-gray-600">
            Manage your orders, track deliveries, and discover amazing heritage products.
          </p>
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Dashboard Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <DashboardCard
            title="Total Orders"
            value={totalOrders}
            icon={<Package className="h-5 w-5 text-blue-600" />}
            color="bg-blue-50"
            link="/customer-dashboard/orders"
          />
          <DashboardCard
            title="Recent Orders"
            value={recentOrdersCount}
            icon={<ShoppingBag className="h-5 w-5 text-green-600" />}
            color="bg-green-50"
            details="Last 30 days"
          />
          <DashboardCard
            title="Total Spent"
            value={formatPrice(totalSpent)}
            icon={<CreditCard className="h-5 w-5 text-purple-600" />}
            color="bg-purple-50"
          />
          <DashboardCard
            title="Quick Actions"
            value="Browse"
            icon={<Heart className="h-5 w-5 text-red-600" />}
            color="bg-red-50"
            link="/marketplace"
          />
        </div>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Quick Actions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <Button 
                variant="outline" 
                className="flex items-center justify-between p-4 h-auto"
                onClick={() => navigate('/customer-dashboard/orders')}
              >
                <div className="flex items-center gap-3">
                  <Package className="h-5 w-5 text-blue-600" />
                  <span>View Orders</span>
                </div>
                <ArrowRight className="h-4 w-4" />
              </Button>
              
              <Button 
                variant="outline" 
                className="flex items-center justify-between p-4 h-auto"
                onClick={() => navigate('/customer-dashboard/favourites')}
              >
                <div className="flex items-center gap-3">
                  <Heart className="h-5 w-5 text-red-600" />
                  <span>My Favourites</span>
                </div>
                <ArrowRight className="h-4 w-4" />
              </Button>
              
              <Button 
                variant="outline" 
                className="flex items-center justify-between p-4 h-auto"
                onClick={() => navigate('/customer-dashboard/saved-addresses')}
              >
                <div className="flex items-center gap-3">
                  <MapPin className="h-5 w-5 text-green-600" />
                  <span>Addresses</span>
                </div>
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Recent Orders Section */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Recent Orders</CardTitle>
            {orders.length > 0 && (
              <Button variant="outline" size="sm" onClick={() => navigate('/customer-dashboard/orders')}>
                View All Orders
              </Button>
            )}
          </CardHeader>
          <CardContent>
            {orders.length === 0 ? (
              <div className="text-center py-12">
                <Package className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No Orders Yet</h3>
                <p className="text-gray-500 mb-6">
                  Start exploring our amazing collection of heritage products.
                </p>
                <Button onClick={() => navigate('/marketplace')}>
                  Browse Products
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {orders.slice(0, 3).map((order) => (
                  <div key={order.id} className="border rounded-lg overflow-hidden">
                    {/* Order Header */}
                    <div className="bg-gray-50 px-4 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                        <div>
                          <p className="text-sm font-medium text-gray-500">Order ID</p>
                          <p className="font-medium">{order.id.substring(0, 8)}...</p>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-500">Date</p>
                          <p className="font-medium">
                            {new Date(order.created_at).toLocaleDateString()}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-500">Total</p>
                          <p className="font-medium">{formatPrice(order.total_price)}</p>
                        </div>
                      </div>
                      <Badge variant="outline" className="self-start sm:self-center">
                        Demo Order
                      </Badge>
                    </div>
                    
                    {/* Order Content */}
                    <div className="p-4">
                      {order.product ? (
                        <div className="flex flex-col sm:flex-row gap-4">
                          {/* Product Image */}
                          <div className="flex-shrink-0">
                            <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-md overflow-hidden border border-gray-200 bg-gray-50">
                              <img 
                                src={order.product.images?.[0] || 'https://images.unsplash.com/photo-1618160702438-9b02ab6515c9?w=400'} 
                                alt={order.product.name}
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  const target = e.target as HTMLImageElement;
                                  target.src = 'https://images.unsplash.com/photo-1618160702438-9b02ab6515c9?w=400';
                                }}
                              />
                            </div>
                          </div>
                          
                          {/* Product Details */}
                          <div className="flex-grow min-w-0">
                            <h3 className="font-medium text-gray-900 truncate">
                              {order.product.name}
                            </h3>
                            <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-500">
                              <span>Qty: {order.quantity}</span>
                              <span>₹{order.product.price.toLocaleString('en-IN')} each</span>
                            </div>
                            
                            {order.product.is_gi_approved && (
                              <Badge variant="outline" className="mt-2 bg-green-50 text-green-700 border-green-200">
                                GI Certified
                              </Badge>
                            )}
                            
                            <Button 
                              variant="link" 
                              size="sm" 
                              className="p-0 h-auto mt-2 text-primary"
                              onClick={() => navigate(`/product/${order.product.id}`)}
                            >
                              View Product Details →
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center gap-4">
                          <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-md bg-gray-100 flex items-center justify-center">
                            <Package className="h-8 w-8 text-gray-400" />
                          </div>
                          <div>
                            <p className="text-gray-500">Product information unavailable</p>
                            <p className="text-sm text-gray-400">Quantity: {order.quantity}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default CustomerDashboard;
