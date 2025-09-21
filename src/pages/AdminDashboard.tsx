
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Users,
  ShoppingBag,
  Package,
  DollarSign,
  TrendingUp,
  ShieldCheck,
  Award,
  ChevronRight,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import AdminLayout from '@/components/AdminLayout';
import DashboardCard from '@/components/DashboardCard';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

const AdminDashboard = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    totalCustomers: 0,
    totalVendors: 0,
    totalProducts: 0,
    totalGIProducts: 0,
    totalPendingVerifications: 0,
    totalRevenue: 0,
    recentOrders: [] as any[],
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);

        // Fetch customers count
        const { count: customersCount, error: customersError } = await supabase
          .from('profiles')
          .select('*', { count: 'exact', head: true })
          .eq('role', 'customer');

        if (customersError) throw customersError;

        // Fetch vendors count
        const { count: vendorsCount, error: vendorsError } = await supabase
          .from('profiles')
          .select('*', { count: 'exact', head: true })
          .eq('role', 'vendor');

        if (vendorsError) throw vendorsError;

        // Fetch products count
        const { count: productsCount, error: productsError } = await supabase
          .from('products')
          .select('*', { count: 'exact', head: true });

        if (productsError) throw productsError;

        // Fetch GI products count
        const { count: giProductsCount, error: giProductsError } = await supabase
          .from('products')
          .select('*', { count: 'exact', head: true })
          .eq('is_gi_approved', true);

        if (giProductsError) throw giProductsError;

        // Fetch pending verifications count
        const { count: pendingVerificationsCount, error: pendingVerificationsError } = await supabase
          .from('gi_certifications')
          .select('*', { count: 'exact', head: true })
          .eq('is_verified', false);

        if (pendingVerificationsError) throw pendingVerificationsError;

        // Since orders table was removed, we'll use demo data
        const recentOrders = [
          {
            id: '1',
            customer: { name: 'Rahul Sharma' },
            product: { name: 'Kashmir Pashmina Shawl' },
            status: 'delivered',
            total_price: 6500,
            created_at: '2023-10-15T08:30:00Z',
          },
          {
            id: '2',
            customer: { name: 'Priya Patel' },
            product: { name: 'Madhubani Painting' },
            status: 'processing',
            total_price: 3800,
            created_at: '2023-10-14T11:45:00Z',
          },
          {
            id: '3',
            customer: { name: 'Amit Singh' },
            product: { name: 'Banarasi Silk Saree' },
            status: 'shipped',
            total_price: 12500,
            created_at: '2023-10-13T14:20:00Z',
          },
          {
            id: '4',
            customer: { name: 'Sneha Gupta' },
            product: { name: 'Darjeeling Tea' },
            status: 'pending',
            total_price: 1200,
            created_at: '2023-10-13T09:10:00Z',
          },
        ];

        // Calculate total revenue from demo data
        const totalRevenue = recentOrders.reduce((sum, order) => sum + order.total_price, 0);

        setStats({
          totalCustomers: customersCount || 0,
          totalVendors: vendorsCount || 0,
          totalProducts: productsCount || 0,
          totalGIProducts: giProductsCount || 0,
          totalPendingVerifications: pendingVerificationsCount || 0,
          totalRevenue,
          recentOrders,
        });
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  // Card variants for animation
  const cardVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: (i: number) => ({
      opacity: 1,
      y: 0,
      transition: {
        delay: i * 0.1,
        duration: 0.5,
        ease: 'easeOut',
      },
    }),
  };

  // Card data for the dashboard
  const cards = [
    {
      title: 'Total Customers',
      value: stats.totalCustomers,
      icon: <Users className="h-8 w-8 text-blue-500" />,
      link: '/admin-dashboard/customers',
      color: 'bg-blue-50',
    },
    {
      title: 'Total Vendors',
      value: stats.totalVendors,
      icon: <Users className="h-8 w-8 text-green-500" />,
      link: '/admin-dashboard/vendors',
      color: 'bg-green-50',
    },
    {
      title: 'Total Products',
      value: stats.totalProducts,
      icon: <Package className="h-8 w-8 text-amber-500" />,
      link: '/admin-dashboard/products',
      color: 'bg-amber-50',
    },
    {
      title: 'GI Approved Products',
      value: stats.totalGIProducts,
      icon: <ShieldCheck className="h-8 w-8 text-purple-500" />,
      link: '/admin-dashboard/gi-tags',
      color: 'bg-purple-50',
    },
    {
      title: 'Pending Verifications',
      value: stats.totalPendingVerifications,
      icon: <Award className="h-8 w-8 text-rose-500" />,
      link: '/admin-dashboard/gi-tags',
      color: 'bg-rose-50',
    },
    {
      title: 'Total Revenue',
      value: `₹${stats.totalRevenue.toLocaleString('en-IN')}`,
      icon: <DollarSign className="h-8 w-8 text-emerald-500" />,
      link: '/admin-dashboard/analytics',
      color: 'bg-emerald-50',
    },
  ];

  // Function to determine status color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'delivered':
        return 'bg-green-100 text-green-800';
      case 'processing':
        return 'bg-blue-100 text-blue-800';
      case 'shipped':
        return 'bg-amber-100 text-amber-800';
      case 'pending':
        return 'bg-purple-100 text-purple-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <AdminLayout title="Admin Dashboard">
      <div className="space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {cards.map((card, i) => (
            <motion.div
              key={card.title}
              custom={i}
              initial="hidden"
              animate="visible"
              variants={cardVariants}
            >
              <DashboardCard
                title={card.title}
                value={card.value}
                icon={card.icon}
                link={card.link}
                color={card.color}
              />
            </motion.div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Orders */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6, duration: 0.5 }}
          >
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <div>
                  <CardTitle>Recent Orders</CardTitle>
                  <CardDescription>
                    Latest orders from customers
                  </CardDescription>
                </div>
                <Link to="/admin-dashboard/orders">
                  <Button variant="outline" size="sm" className="text-xs h-8 px-3">
                    View All
                    <ChevronRight className="ml-1 h-4 w-4" />
                  </Button>
                </Link>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {stats.recentOrders.map((order) => (
                    <div
                      key={order.id}
                      className="flex items-center justify-between border-b pb-3"
                    >
                      <div className="flex flex-col">
                        <span className="text-sm font-medium">{order.product.name}</span>
                        <span className="text-xs text-muted-foreground">{order.customer.name}</span>
                        <span className="text-xs text-muted-foreground mt-1">
                          {new Date(order.created_at).toLocaleDateString()}
                        </span>
                      </div>
                      <div className="flex items-center space-x-3">
                        <span className="text-sm font-semibold">
                          ₹{order.total_price.toLocaleString('en-IN')}
                        </span>
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(
                            order.status
                          )}`}
                        >
                          {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Weekly Revenue Chart */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7, duration: 0.5 }}
          >
            <Card className="overflow-hidden">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <div>
                  <CardTitle>Weekly Revenue</CardTitle>
                  <CardDescription>
                    Revenue for the last 7 days
                  </CardDescription>
                </div>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="h-60 flex items-center justify-center">
                  <p className="text-muted-foreground">
                    Analytics data will appear here
                  </p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminDashboard;
