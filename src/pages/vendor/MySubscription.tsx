import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  CalendarClock, 
  CreditCard, 
  CircleDollarSign,
  Package,
  Loader2,
  AlertTriangle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import DashboardLayout from '@/components/DashboardLayout';
import { supabase } from '@/integrations/supabase/client';
import { addMonths } from 'date-fns';

interface SubscriptionDetails {
  id: string;
  planName: string;
  startDate: string;
  endDate: string;
  status: string;
  autoRenew: boolean;
  commissionRate: number;
  productLimit: number | null;
  remainingDays: number;
  monthlyFee: number;
}

const MySubscription = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [subscription, setSubscription] = useState<SubscriptionDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [productCount, setProductCount] = useState(0);
  
  useEffect(() => {
    const fetchSubscription = async () => {
      if (!user?.id) return;
      
      setLoading(true);
      
      try {
        // Since vendor_subscriptions is removed, provide default Community plan for all vendors
        const defaultEndDate = addMonths(new Date(), 12); // 1 year from now
        const today = new Date();
        const diffTime = defaultEndDate.getTime() - today.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        setSubscription({
          id: 'default',
          planName: 'Community',
          startDate: new Date().toISOString(),
          endDate: defaultEndDate.toISOString(),
          status: 'active',
          autoRenew: true,
          commissionRate: 10,
          productLimit: null,
          remainingDays: diffDays,
          monthlyFee: 0
        });
        
        // Get product count
        const { count: productCountResult, error: productError } = await supabase
          .from('products')
          .select('id', { count: 'exact', head: true })
          .eq('vendor_id', user.id);
          
        if (!productError && productCountResult !== null) {
          setProductCount(productCountResult);
        }
        
      } catch (err) {
        console.error('Unexpected error:', err);
      } finally {
        setLoading(false);
      }
    };
    
    fetchSubscription();
  }, [user?.id]);
  
  if (loading) {
    return (
      <DashboardLayout title="My Subscription">
        <div className="flex items-center justify-center h-[50vh]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <span className="ml-2">Loading subscription details...</span>
        </div>
      </DashboardLayout>
    );
  }
  
  if (!subscription) {
    return (
      <DashboardLayout title="My Subscription">
        <div className="text-center py-12">
          <h2 className="text-2xl font-semibold mb-4">No Active Subscription</h2>
          <p className="mb-8 text-muted-foreground">
            Please contact support for subscription details.
          </p>
          <Button onClick={() => navigate('/vendor/dashboard')}>
            Back to Dashboard
          </Button>
        </div>
      </DashboardLayout>
    );
  }
  
  return (
    <DashboardLayout title="My Subscription">
      <div className="space-y-8">
        <Card className="overflow-hidden border-2 border-primary/10">
          <CardHeader className="bg-primary/5">
            <div className="flex justify-between items-center">
              <div>
                <CardTitle className="text-2xl">
                  {subscription.planName} Plan
                </CardTitle>
                <CardDescription>
                  Your current subscription details
                </CardDescription>
              </div>
              <Badge variant="outline">
                Active
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <CircleDollarSign className="h-5 w-5 text-primary" />
                  <h3 className="font-medium">Commission Rate</h3>
                </div>
                <p className="text-2xl font-bold">{subscription.commissionRate}%</p>
                <p className="text-sm text-muted-foreground">On all transactions</p>
              </div>
              
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Package className="h-5 w-5 text-primary" />
                  <h3 className="font-medium">Product Limit</h3>
                </div>
                <p className="text-2xl font-bold">
                  {subscription.productLimit ? `${productCount}/${subscription.productLimit}` : "Unlimited"}
                </p>
                <p className="text-sm text-muted-foreground">
                  {subscription.productLimit 
                    ? `${Math.max(0, subscription.productLimit - productCount)} slots remaining` 
                    : "No product limit"}
                </p>
              </div>
              
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <CalendarClock className="h-5 w-5 text-primary" />
                  <h3 className="font-medium">Plan Type</h3>
                </div>
                <p className="text-2xl font-bold">
                  Community
                </p>
                <p className="text-sm text-muted-foreground">
                  Free forever
                </p>
              </div>
              
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <CreditCard className="h-5 w-5 text-primary" />
                  <h3 className="font-medium">Billing</h3>
                </div>
                <p className="text-2xl font-bold">
                  Free
                </p>
                <p className="text-sm text-muted-foreground">
                  No billing required
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Community Plan Features */}
        <Card>
          <CardHeader>
            <CardTitle>Plan Features</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span>Unlimited product listings</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span>GI certification support</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span>Order management tools</span>
                </div>
              </div>
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span>Analytics dashboard</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span>Customer support</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span>Marketing tools</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Info Notice */}
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            All vendors currently receive the Community plan with a 10% commission rate. 
            Additional subscription tiers will be available in future updates.
          </AlertDescription>
        </Alert>
      </div>
    </DashboardLayout>
  );
};

export default MySubscription;