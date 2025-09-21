
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowUpRight, ShieldCheck, ShoppingBag, Package, BarChart3, Truck, Clock } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/contexts/AuthContext';
import { formatPrice } from '@/lib/utils';
import DashboardLayout from '@/components/DashboardLayout';
import DashboardCard, { DashboardCardProps } from '@/components/DashboardCard';
import { Product } from '@/types/products';

const VendorDashboard = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated, loading } = useAuth();
  const [dashboardStats, setDashboardStats] = useState({
    totalOrders: 178,
    totalRevenue: 462500,
    totalProducts: 19,
    newCustomers: 34
  });
  
  // Sample products data for demo with proper image URLs
  const [products, setProducts] = useState<Product[]>([
    {
      id: 'prod1',
      name: 'Pashmina Shawl',
      description: 'Handcrafted Pashmina Shawl from Kashmir',
      price: 2500,
      images: ['https://images.unsplash.com/photo-1594633312681-425c7b97ccd1?w=400&h=400&fit=crop'],
      region: 'Kashmir',
      is_gi_approved: true,
      vendor_id: 'vendor1',
      stock: 3,
      videos: [],
      category: 'Textiles',
      location: 'Srinagar',
      created_at: '2023-01-01T00:00:00Z',
      updated_at: '2023-01-01T00:00:00Z',
    },
    {
      id: 'prod2',
      name: 'Banarasi Silk Saree',
      description: 'Authentic Banarasi Silk Saree with Gold Zari Work',
      price: 3200,
      images: ['https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=400&h=400&fit=crop'],
      region: 'Uttar Pradesh',
      is_gi_approved: true,
      vendor_id: 'vendor1',
      stock: 2,
      videos: [],
      category: 'Textiles',
      location: 'Varanasi',
      created_at: '2023-01-01T00:00:00Z',
      updated_at: '2023-01-01T00:00:00Z',
    },
    {
      id: 'prod3',
      name: 'Kanchipuram Silk',
      description: 'Traditional Kanchipuram Silk Saree',
      price: 8500,
      images: ['https://images.unsplash.com/photo-1583391733956-6c78276477e2?w=400&h=400&fit=crop'],
      region: 'Tamil Nadu',
      is_gi_approved: true,
      vendor_id: 'vendor1',
      stock: 8,
      videos: [],
      category: 'Textiles',
      location: 'Kanchipuram',
      created_at: '2023-01-01T00:00:00Z',
      updated_at: '2023-01-01T00:00:00Z',
    }
  ]);

  // Redirect if not authenticated
  useEffect(() => {
    if (!loading && !isAuthenticated) {
      navigate('/login');
    }
  }, [isAuthenticated, loading, navigate]);

  // Product stock status data
  const stockStatusData = [
    { label: 'Out of Stock', count: products.filter(p => p.stock === 0).length, color: 'bg-red-100 text-red-800' },
    { label: 'Low Stock', count: products.filter(p => p.stock > 0 && p.stock <= 5).length, color: 'bg-yellow-100 text-yellow-800' },
    { label: 'Healthy Stock', count: products.filter(p => p.stock > 5).length, color: 'bg-green-100 text-green-800' }
  ];

  // Sample recent orders
  const recentOrders = [
    { id: 'order1', product: 'Banarasi Silk Saree', customer: 'Aarav Sharma', date: '2023-11-10', status: 'delivered', value: 3200 },
    { id: 'order2', product: 'Kanchipuram Silk', customer: 'Diya Patel', date: '2023-11-08', status: 'shipped', value: 8500 },
    { id: 'order3', product: 'Pashmina Shawl', customer: 'Arjun Singh', date: '2023-11-05', status: 'processing', value: 2500 }
  ];
  
  // Demo GI certification stats
  const giStats = {
    approved: 6,
    pending: 1,
    total: 7,
    approvalRate: 85.7
  };

  if (loading) {
    return <div className="flex justify-center items-center h-screen">Loading...</div>;
  }

  return (
    <DashboardLayout title="Vendor Dashboard">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <DashboardCard 
          title="Total Orders" 
          value={dashboardStats.totalOrders} 
          icon={<ShoppingBag className="h-5 w-5 text-blue-600" />}
          link="/vendor/order-management"
          color="bg-blue-50"
        />
        
        <DashboardCard 
          title="Revenue" 
          value={formatPrice(dashboardStats.totalRevenue)} 
          icon={<BarChart3 className="h-5 w-5 text-green-600" />}
          link="/vendor/analytics"
          color="bg-green-50"
        />
        
        <DashboardCard 
          title="Products" 
          value={dashboardStats.totalProducts} 
          icon={<Package className="h-5 w-5 text-purple-600" />}
          link="/vendor/product-management"
          color="bg-purple-50"
        />
        
        <DashboardCard 
          title="New Customers" 
          value={dashboardStats.newCustomers} 
          icon={<ArrowUpRight className="h-5 w-5 text-amber-600" />}
          link="/vendor-dashboard"
          color="bg-amber-50"
          details="+14% from last month"
          trend="up"
        />
      </div>

      <div className="grid gap-4 mt-8 grid-cols-1 lg:grid-cols-2">
        {/* Recent Orders */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle>Recent Orders</CardTitle>
              <Button variant="ghost" size="sm" onClick={() => navigate('/vendor/order-management')}>
                View all
              </Button>
            </div>
            <CardDescription>Your latest customer orders</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y">
              {recentOrders.map((order) => (
                <div key={order.id} className="flex items-center justify-between p-4">
                  <div className="space-y-1">
                    <p className="text-sm font-medium">{order.product}</p>
                    <p className="text-xs text-muted-foreground">{order.customer} • {order.date}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge variant="outline" className="capitalize">
                      {order.status}
                    </Badge>
                    <div className="font-medium">{formatPrice(order.value)}</div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Stock Status */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Inventory Status</CardTitle>
              <Button variant="ghost" size="sm" onClick={() => navigate('/vendor/stock-order-manager')}>
                Manage
              </Button>
            </div>
            <CardDescription>Overview of your product inventory</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {stockStatusData.map((status) => (
                <div key={status.label} className="flex justify-between">
                  <span className="text-muted-foreground">{status.label}</span>
                  <span className="font-medium">{status.count}</span>
                </div>
              ))}

              <Separator />
              
              <div className="rounded-lg border p-3">
                <div className="text-sm font-medium">Product Stock Distribution</div>
                <div className="mt-3 flex gap-1">
                  <div className="h-2 flex-1 rounded-full bg-red-200" style={{ width: `${(stockStatusData[0].count / products.length) * 100}%` }}></div>
                  <div className="h-2 flex-1 rounded-full bg-yellow-200" style={{ width: `${(stockStatusData[1].count / products.length) * 100}%` }}></div>
                  <div className="h-2 flex-1 rounded-full bg-green-200" style={{ width: `${(stockStatusData[2].count / products.length) * 100}%` }}></div>
                </div>
                <div className="mt-2 flex justify-between text-xs text-muted-foreground">
                  <div>Out of Stock: {stockStatusData[0].count}</div>
                  <div>Low Stock: {stockStatusData[1].count}</div>
                  <div>Healthy: {stockStatusData[2].count}</div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 mt-8 grid-cols-1 lg:grid-cols-3">
        {/* GI Certification Status */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-green-600" />
              GI Certification
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-muted-foreground">GI Approved Products</span>
                <span className="font-medium">{giStats.approved} of {giStats.total}</span>
              </div>
              <Progress value={giStats.approvalRate} className="h-2" />
              <p className="text-xs text-muted-foreground text-right">{giStats.approvalRate}% approved</p>
            </div>

            <Separator />
            
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Pending Approvals</span>
                <span className="font-medium">{giStats.pending}</span>
              </div>
              {giStats.pending > 0 ? (
                <div className="flex items-center gap-2 rounded-md border border-yellow-200 bg-yellow-50 px-3 py-2">
                  <Clock className="h-4 w-4 text-yellow-600" />
                  <p className="text-sm text-yellow-600">You have {giStats.pending} product(s) awaiting GI approval.</p>
                </div>
              ) : (
                <div className="flex items-center gap-2 rounded-md border border-green-200 bg-green-50 px-3 py-2">
                  <ShieldCheck className="h-4 w-4 text-green-600" />
                  <p className="text-sm text-green-600">All your products have GI certification status.</p>
                </div>
              )}
            </div>

            <Button 
              className="w-full" 
              variant="outline" 
              onClick={() => navigate('/vendor/gi-certification-management')}
            >
              Manage Certifications
            </Button>
          </CardContent>
        </Card>

        {/* Low Stock Alert */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Low Stock Alert</CardTitle>
            <CardDescription>Products that need to be restocked soon</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {products.filter(p => p.stock <= 5 && p.stock > 0).length > 0 ? (
                products.filter(p => p.stock <= 5 && p.stock > 0).map(product => (
                  <div key={product.id} className="flex justify-between items-center">
                    <div className="flex items-center gap-3">
                      <div className="h-12 w-12 overflow-hidden rounded-md bg-gray-100 flex-shrink-0">
                        <img 
                          src={product.images?.[0] || 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=400&h=400&fit=crop'} 
                          alt={product.name} 
                          className="h-full w-full object-cover"
                          onError={(e) => {
                            const target = e.currentTarget;
                            target.src = 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=400&h=400&fit=crop';
                          }}
                        />
                      </div>
                      <div>
                        <p className="text-sm font-medium">{product.name}</p>
                        <p className="text-xs text-muted-foreground">Stock: {product.stock} units</p>
                      </div>
                    </div>
                    <Badge variant={product.stock <= 2 ? "destructive" : "outline"} className="capitalize">
                      {product.stock <= 2 ? 'Critical' : 'Low'}
                    </Badge>
                  </div>
                ))
              ) : (
                <div className="flex flex-col items-center justify-center py-6 text-center">
                  <div className="rounded-full border-8 border-dashed border-gray-200 p-4">
                    <ShoppingBag className="h-10 w-10 text-gray-400" />
                  </div>
                  <h3 className="mt-4 text-lg font-semibold">All Good!</h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    You have no products with low stock at the moment.
                  </p>
                </div>
              )}
              
              <Button className="w-full" variant="outline" onClick={() => navigate('/vendor/stock-order-manager')}>
                <Truck className="mr-2 h-4 w-4" /> 
                Order Inventory
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default VendorDashboard;
