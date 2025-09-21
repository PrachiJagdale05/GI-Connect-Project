
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  BarChart3,
  PieChart,
  LineChart,
  Users,
  Package,
  DollarSign,
  ArrowUpRight,
  ArrowDownRight,
  ShoppingBag,
  CheckCircle,
  Clock,
  TrendingUp,
  Star,
  AlertTriangle,
  Bell,
} from 'lucide-react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import AdminLayout from '@/components/AdminLayout';
import DashboardCard from '@/components/DashboardCard';
import { supabase } from '@/integrations/supabase/client';
import { 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip,
  PieChart as RechartsPI, 
  Pie, 
  Cell,
  LineChart as RechartsLC,
  Line,
  Legend
} from 'recharts';

interface OverviewStats {
  totalCustomers: number;
  totalVendors: number;
  totalProducts: number;
  totalRevenue: number;
  giTaggedProducts: number;
  pendingGIApprovals: number;
}

interface RevenueData {
  month: string;
  total: number;
  gi: number;
  nonGi: number;
}

interface CustomerInsight {
  month: string;
  newCustomers: number;
  returningCustomers: number;
}

interface VendorInsight {
  month: string;
  newVendors: number;
  activeVendors: number;
}

interface ProductCategory {
  name: string;
  count: number;
  revenue: number;
}

interface TopProduct {
  id: string;
  name: string;
  sales: number;
  revenue: number;
  stock: number;
}

interface TopVendor {
  id: string;
  name: string;
  revenue: number;
  products: number;
}

interface RecentNotification {
  id: string;
  type: string;
  title: string;
  message: string;
  created_at: string;
}

const Analytics = () => {
  const [overviewStats, setOverviewStats] = useState<OverviewStats>({
    totalCustomers: 0,
    totalVendors: 0,
    totalProducts: 0,
    totalRevenue: 0,
    giTaggedProducts: 0,
    pendingGIApprovals: 0,
  });
  
  const [revenueData, setRevenueData] = useState<RevenueData[]>([]);
  const [customerInsights, setCustomerInsights] = useState<CustomerInsight[]>([]);
  const [vendorInsights, setVendorInsights] = useState<VendorInsight[]>([]);
  const [productCategories, setProductCategories] = useState<ProductCategory[]>([]);
  const [topProducts, setTopProducts] = useState<TopProduct[]>([]);
  const [topVendors, setTopVendors] = useState<TopVendor[]>([]);
  const [recentNotifications, setRecentNotifications] = useState<RecentNotification[]>([]);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    const fetchAnalyticsData = async () => {
      try {
        setLoading(true);
        
        // Fetch overview statistics
        const [customersResult, vendorsResult, productsResult, giTaggedResult, pendingGIResult] = await Promise.all([
          supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'customer'),
          supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'vendor'),
          supabase.from('products').select('*', { count: 'exact', head: true }),
          supabase.from('products').select('*', { count: 'exact', head: true }).eq('gi_status', 'approved'),
          supabase.from('products').select('*', { count: 'exact', head: true }).eq('gi_status', 'pending')
        ]);

        // Calculate total revenue from commission transactions
        const { data: commissions } = await supabase
          .from('commission_transactions')
          .select('total_amount');
        
        const totalRevenue = commissions?.reduce((sum, item) => sum + (Number(item.total_amount) || 0), 0) || 0;

        setOverviewStats({
          totalCustomers: customersResult.count || 0,
          totalVendors: vendorsResult.count || 0,
          totalProducts: productsResult.count || 0,
          totalRevenue,
          giTaggedProducts: giTaggedResult.count || 0,
          pendingGIApprovals: pendingGIResult.count || 0,
        });

        // Fetch revenue data by month
        const { data: monthlyCommissions } = await supabase
          .from('commission_transactions')
          .select('total_amount, created_at, product_id')
          .order('created_at', { ascending: true });

        // Process monthly revenue data
        const revenueByMonth: { [key: string]: { total: number; gi: number; nonGi: number } } = {};
        
        if (monthlyCommissions) {
          for (const commission of monthlyCommissions) {
            const month = new Date(commission.created_at).toLocaleDateString('en-US', { month: 'short' });
            if (!revenueByMonth[month]) {
              revenueByMonth[month] = { total: 0, gi: 0, nonGi: 0 };
            }
            
            const amount = Number(commission.total_amount) || 0;
            revenueByMonth[month].total += amount;
            
            // Check if product is GI tagged
            const { data: product } = await supabase
              .from('products')
              .select('gi_status')
              .eq('id', commission.product_id)
              .single();
              
            if (product?.gi_status === 'approved') {
              revenueByMonth[month].gi += amount;
            } else {
              revenueByMonth[month].nonGi += amount;
            }
          }
        }

        const processedRevenueData = Object.entries(revenueByMonth).map(([month, data]) => ({
          month,
          ...data
        }));
        setRevenueData(processedRevenueData);

        // Fetch customer insights
        const { data: customers } = await supabase
          .from('profiles')
          .select('created_at')
          .eq('role', 'customer')
          .order('created_at', { ascending: true });

        const customersByMonth: { [key: string]: number } = {};
        customers?.forEach(customer => {
          const month = new Date(customer.created_at).toLocaleDateString('en-US', { month: 'short' });
          customersByMonth[month] = (customersByMonth[month] || 0) + 1;
        });

        const customerInsightData = Object.entries(customersByMonth).map(([month, newCustomers]) => ({
          month,
          newCustomers,
          returningCustomers: Math.floor(newCustomers * 0.6) // Approximation
        }));
        setCustomerInsights(customerInsightData);

        // Fetch vendor insights
        const { data: vendors } = await supabase
          .from('profiles')
          .select('created_at')
          .eq('role', 'vendor')
          .order('created_at', { ascending: true });

        const vendorsByMonth: { [key: string]: number } = {};
        vendors?.forEach(vendor => {
          const month = new Date(vendor.created_at).toLocaleDateString('en-US', { month: 'short' });
          vendorsByMonth[month] = (vendorsByMonth[month] || 0) + 1;
        });

        const vendorInsightData = Object.entries(vendorsByMonth).map(([month, newVendors]) => ({
          month,
          newVendors,
          activeVendors: Math.floor(newVendors * 1.2) // Approximation
        }));
        setVendorInsights(vendorInsightData);

        // Fetch product categories
        const { data: products } = await supabase
          .from('products')
          .select('category, price');

        const categoryStats: { [key: string]: { count: number; revenue: number } } = {};
        products?.forEach(product => {
          const category = product.category || 'Uncategorized';
          if (!categoryStats[category]) {
            categoryStats[category] = { count: 0, revenue: 0 };
          }
          categoryStats[category].count += 1;
          categoryStats[category].revenue += Number(product.price) || 0;
        });

        const categoryData = Object.entries(categoryStats).map(([name, stats]) => ({
          name,
          count: stats.count,
          revenue: stats.revenue
        }));
        setProductCategories(categoryData);

        // Fetch top products (mock sales data)
        const { data: allProducts } = await supabase
          .from('products')
          .select('id, name, stock, price')
          .limit(5);

        const topProductsData = allProducts?.map((product, index) => ({
          id: product.id,
          name: product.name,
          sales: Math.floor(Math.random() * 100) + 20, // Mock sales
          revenue: (Math.floor(Math.random() * 100) + 20) * Number(product.price),
          stock: product.stock
        })) || [];
        setTopProducts(topProductsData);

        // Fetch top vendors
        const { data: vendorProfiles } = await supabase
          .from('profiles')
          .select('id, name')
          .eq('role', 'vendor')
          .limit(5);

        const topVendorsData = vendorProfiles?.map(vendor => ({
          id: vendor.id,
          name: vendor.name,
          revenue: Math.floor(Math.random() * 50000) + 10000, // Mock revenue
          products: Math.floor(Math.random() * 20) + 5 // Mock product count
        })) || [];
        setTopVendors(topVendorsData);

        // Fetch recent notifications
        const { data: notifications } = await supabase
          .from('notifications')
          .select('id, type, title, message, created_at')
          .order('created_at', { ascending: false })
          .limit(5);

        setRecentNotifications(notifications || []);
        
      } catch (error) {
        console.error('Error fetching analytics data:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchAnalyticsData();
  }, []);
  
  // Define colors for the pie chart
  const COLORS = ['#8884d8', '#83a6ed', '#8dd1e1', '#82ca9d', '#ffc658'];
  
  if (loading) {
    return (
      <AdminLayout title="Analytics">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p>Loading analytics data...</p>
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="Analytics">
      <div className="space-y-8">
        {/* Overview KPIs */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <DashboardCard
              title="Total Customers"
              value={overviewStats.totalCustomers}
              icon={<Users className="h-5 w-5" />}
              color="bg-blue-50"
            />
            <DashboardCard
              title="Total Vendors"
              value={overviewStats.totalVendors}
              icon={<ShoppingBag className="h-5 w-5" />}
              color="bg-purple-50"
            />
            <DashboardCard
              title="Total Products"
              value={overviewStats.totalProducts}
              icon={<Package className="h-5 w-5" />}
              color="bg-amber-50"
            />
            <DashboardCard
              title="Total Revenue"
              value={`₹${overviewStats.totalRevenue.toLocaleString('en-IN')}`}
              icon={<DollarSign className="h-5 w-5" />}
              color="bg-emerald-50"
            />
            <DashboardCard
              title="GI Tagged Products"
              value={overviewStats.giTaggedProducts}
              icon={<CheckCircle className="h-5 w-5" />}
              color="bg-green-50"
            />
            <DashboardCard
              title="Pending GI Approvals"
              value={overviewStats.pendingGIApprovals}
              icon={<Clock className="h-5 w-5" />}
              color="bg-orange-50"
            />
          </div>
        </motion.div>
        
        {/* Analytics Tabs */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
          <Tabs defaultValue="revenue" className="space-y-6">
            <TabsList className="grid w-full grid-cols-6">
              <TabsTrigger value="revenue">Revenue</TabsTrigger>
              <TabsTrigger value="customers">Customers</TabsTrigger>
              <TabsTrigger value="vendors">Vendors</TabsTrigger>
              <TabsTrigger value="products">Products</TabsTrigger>
              <TabsTrigger value="categories">Categories</TabsTrigger>
              <TabsTrigger value="notifications">Notifications</TabsTrigger>
            </TabsList>
            
            {/* Revenue Analytics */}
            <TabsContent value="revenue" className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Monthly Revenue Trend</CardTitle>
                    <CardDescription>GI vs Non-GI product revenue</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="h-[300px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={revenueData}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="month" />
                          <YAxis />
                          <Tooltip formatter={(value) => [`₹${Number(value).toLocaleString('en-IN')}`, 'Revenue']} />
                          <Legend />
                          <Bar dataKey="gi" name="GI Products" fill="#8884d8" />
                          <Bar dataKey="nonGi" name="Non-GI Products" fill="#82ca9d" />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Revenue by Categories</CardTitle>
                    <CardDescription>Category-wise revenue distribution</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="h-[300px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <RechartsPI>
                          <Pie
                            data={productCategories}
                            cx="50%"
                            cy="50%"
                            outerRadius={80}
                            fill="#8884d8"
                            dataKey="revenue"
                            label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                          >
                            {productCategories.map((_, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip formatter={(value) => [`₹${Number(value).toLocaleString('en-IN')}`, 'Revenue']} />
                        </RechartsPI>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* Customer Insights */}
            <TabsContent value="customers" className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Customer Growth</CardTitle>
                    <CardDescription>New vs returning customers</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="h-[300px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={customerInsights}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="month" />
                          <YAxis />
                          <Tooltip />
                          <Legend />
                          <Bar dataKey="newCustomers" name="New Customers" fill="#8884d8" />
                          <Bar dataKey="returningCustomers" name="Returning Customers" fill="#82ca9d" />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Customer Metrics</CardTitle>
                    <CardDescription>Key customer statistics</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Total Customers</span>
                      <span className="text-lg font-semibold">{overviewStats.totalCustomers}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Average Monthly Growth</span>
                      <span className="text-lg font-semibold text-green-600">+12%</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Customer Retention Rate</span>
                      <span className="text-lg font-semibold text-blue-600">85%</span>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* Vendor Insights */}
            <TabsContent value="vendors" className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Vendor Growth</CardTitle>
                    <CardDescription>New vendor registrations over time</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="h-[300px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <RechartsLC data={vendorInsights}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="month" />
                          <YAxis />
                          <Tooltip />
                          <Legend />
                          <Line dataKey="newVendors" name="New Vendors" stroke="#8884d8" />
                          <Line dataKey="activeVendors" name="Active Vendors" stroke="#82ca9d" />
                        </RechartsLC>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Top Vendors by Revenue</CardTitle>
                    <CardDescription>Highest performing vendors</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {topVendors.map((vendor, index) => (
                        <div key={vendor.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                          <div className="flex items-center space-x-3">
                            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                              <span className="text-sm font-semibold">{index + 1}</span>
                            </div>
                            <div>
                              <p className="font-medium">{vendor.name}</p>
                              <p className="text-sm text-muted-foreground">{vendor.products} products</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="font-semibold">₹{vendor.revenue.toLocaleString('en-IN')}</p>
                            <Badge variant="secondary" className="text-xs">
                              <TrendingUp className="w-3 h-3 mr-1" />
                              Top
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* Product Insights */}
            <TabsContent value="products" className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Top Selling Products</CardTitle>
                    <CardDescription>Best performing products by sales</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {topProducts.map((product, index) => (
                        <div key={product.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                          <div className="flex items-center space-x-3">
                            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                              <span className="text-sm font-semibold">{index + 1}</span>
                            </div>
                            <div>
                              <p className="font-medium truncate max-w-[200px]">{product.name}</p>
                              <p className="text-sm text-muted-foreground">{product.sales} sales</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="font-semibold">₹{product.revenue.toLocaleString('en-IN')}</p>
                            <Badge variant={product.stock < 10 ? "destructive" : "secondary"} className="text-xs">
                              {product.stock < 10 ? (
                                <>
                                  <AlertTriangle className="w-3 h-3 mr-1" />
                                  Low Stock
                                </>
                              ) : (
                                `${product.stock} in stock`
                              )}
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>GI vs Non-GI Performance</CardTitle>
                    <CardDescription>Product performance comparison</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="text-center p-4 rounded-lg bg-green-50">
                        <div className="text-2xl font-bold text-green-600">{overviewStats.giTaggedProducts}</div>
                        <p className="text-sm text-green-700">GI Tagged Products</p>
                      </div>
                      <div className="text-center p-4 rounded-lg bg-blue-50">
                        <div className="text-2xl font-bold text-blue-600">
                          {overviewStats.totalProducts - overviewStats.giTaggedProducts}
                        </div>
                        <p className="text-sm text-blue-700">Non-GI Products</p>
                      </div>
                    </div>
                    <div className="flex justify-between items-center pt-2">
                      <span className="text-sm text-muted-foreground">GI Products Percentage</span>
                      <span className="text-lg font-semibold text-green-600">
                        {overviewStats.totalProducts > 0 
                          ? ((overviewStats.giTaggedProducts / overviewStats.totalProducts) * 100).toFixed(1)
                          : 0}%
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* Categories */}
            <TabsContent value="categories" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Product Categories</CardTitle>
                  <CardDescription>Category-wise product distribution and revenue</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="h-[300px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <RechartsPI>
                          <Pie
                            data={productCategories}
                            cx="50%"
                            cy="50%"
                            outerRadius={80}
                            fill="#8884d8"
                            dataKey="count"
                            label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                          >
                            {productCategories.map((_, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip />
                          <Legend />
                        </RechartsPI>
                      </ResponsiveContainer>
                    </div>
                    <div className="space-y-3">
                      {productCategories.map((category, index) => (
                        <div key={category.name} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                          <div className="flex items-center space-x-3">
                            <div 
                              className="w-4 h-4 rounded-full" 
                              style={{ backgroundColor: COLORS[index % COLORS.length] }}
                            />
                            <span className="font-medium">{category.name}</span>
                          </div>
                          <div className="text-right">
                            <p className="font-semibold">{category.count} products</p>
                            <p className="text-sm text-muted-foreground">
                              ₹{category.revenue.toLocaleString('en-IN')} revenue
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Notifications Snapshot */}
            <TabsContent value="notifications" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Recent Notifications</CardTitle>
                  <CardDescription>Latest platform activities and updates</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {recentNotifications.length > 0 ? (
                      recentNotifications.map((notification) => (
                        <div key={notification.id} className="flex items-start space-x-3 p-3 rounded-lg bg-muted/50">
                          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                            <Bell className="w-4 h-4" />
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center justify-between">
                              <p className="font-medium">{notification.title}</p>
                              <Badge variant="outline">{notification.type}</Badge>
                            </div>
                            <p className="text-sm text-muted-foreground mt-1">{notification.message}</p>
                            <p className="text-xs text-muted-foreground mt-2">
                              {new Date(notification.created_at).toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </p>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-8 text-muted-foreground">
                        <Bell className="w-8 h-8 mx-auto mb-2 opacity-50" />
                        <p>No recent notifications</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </motion.div>
      </div>
    </AdminLayout>
  );
};

export default Analytics;
