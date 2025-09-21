import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Check, Shield, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

interface PlanFeature {
  name: string;
  included: boolean;
}

interface Plan {
  id: string;
  name: string;
  price: string;
  priceValue: number;
  commission: string;
  features: PlanFeature[];
  popular?: boolean;
  description: string;
}

const plans: Plan[] = [
  {
    id: 'community',
    name: 'Community',
    price: '₹0',
    priceValue: 0,
    commission: '10%',
    description: 'Perfect for getting started',
    features: [
      { name: 'Unlimited product listings', included: true },
      { name: 'GI certification support', included: true },
      { name: 'Order management tools', included: true },
      { name: 'Analytics dashboard', included: true },
      { name: 'Customer support', included: true },
      { name: 'Marketing tools', included: true },
    ]
  }
];

const SubscriptionSelection = () => {
  const navigate = useNavigate();
  const { user, setUser } = useAuth();
  const { toast } = useToast();
  const [selectedPlan, setSelectedPlan] = useState<string>('community');
  const [loading, setLoading] = useState(false);
  
  useEffect(() => {
    const checkUser = async () => {
      if (!user?.id) {
        navigate('/login');
        return;
      }
      
      // Update user profile to completed onboarding status since we're giving everyone Community plan
      try {
        const { error: profileError } = await supabase
          .from('profiles')
          .update({ onboarding_status: 'completed' })
          .eq('id', user.id);
          
        if (profileError) {
          console.warn('Warning: Could not update profile status:', profileError);
        } else {
          // Update local storage user data to reflect completed onboarding
          const storedUserData = localStorage.getItem('gi_connect_user');
          if (storedUserData) {
            try {
              const userData = JSON.parse(storedUserData);
              userData.onboarding_status = 'completed';
              localStorage.setItem('gi_connect_user', JSON.stringify(userData));
              
              if (user) {
                setUser({...user});
              }
            } catch (err) {
              console.error('Error updating local storage:', err);
            }
          }
        }
      } catch (err) {
        console.error('Error updating user profile:', err);
      }
    };
    
    checkUser();
  }, [user?.id, navigate, setUser]);

  const handlePlanSelection = async () => {
    if (!user?.id) return;
    
    setLoading(true);
    
    try {
      // Show success message for Community plan
      toast({
        title: "Welcome to the Community Plan!",
        description: "You're all set with unlimited features at 10% commission.",
      });
      
      // Redirect to vendor dashboard
      navigate('/vendor-dashboard');
      
    } catch (err) {
      console.error('Error setting up plan:', err);
      toast({
        title: "Setup Error",
        description: "There was an issue setting up your plan. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Welcome to Our Platform
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Join thousands of vendors selling authentic Geographical Indication products. 
            Start with our Community plan and grow your business.
          </p>
        </div>

        <div className="grid md:grid-cols-1 gap-8 max-w-md mx-auto">
          {plans.map((plan) => (
            <Card 
              key={plan.id}
              className={`relative cursor-pointer transition-all duration-200 hover:shadow-lg ${
                selectedPlan === plan.id 
                  ? 'ring-2 ring-primary shadow-lg' 
                  : 'hover:ring-1 hover:ring-primary/50'
              }`}
              onClick={() => setSelectedPlan(plan.id)}
            >
              {plan.popular && (
                <Badge className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-primary">
                  <Star className="w-3 h-3 mr-1" />
                  Most Popular
                </Badge>
              )}
              
              <CardHeader className="text-center pb-4">
                <div className="flex justify-center mb-4">
                  <div className={`p-3 rounded-full ${
                    selectedPlan === plan.id ? 'bg-primary/10' : 'bg-gray-100'
                  }`}>
                    <Shield className={`w-8 h-8 ${
                      selectedPlan === plan.id ? 'text-primary' : 'text-gray-500'
                    }`} />
                  </div>
                </div>
                <CardTitle className="text-2xl">{plan.name}</CardTitle>
                <CardDescription className="text-sm">{plan.description}</CardDescription>
                <div className="mt-4">
                  <span className="text-4xl font-bold text-primary">{plan.price}</span>
                  <span className="text-gray-500 ml-2">/month</span>
                </div>
                <p className="text-sm text-gray-600 mt-2">
                  Commission: <span className="font-semibold text-primary">{plan.commission}</span> per order
                </p>
              </CardHeader>
              
              <CardContent className="pt-4">
                <ul className="space-y-3">
                  {plan.features.map((feature, index) => (
                    <li key={index} className="flex items-center">
                      <Check className={`w-5 h-5 mr-3 ${
                        feature.included ? 'text-green-500' : 'text-gray-300'
                      }`} />
                      <span className={feature.included ? 'text-gray-700' : 'text-gray-400'}>
                        {feature.name}
                      </span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="mt-12 text-center">
          <Button 
            size="lg" 
            onClick={handlePlanSelection}
            disabled={loading}
            className="px-8 py-4 text-lg"
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                Setting up your plan...
              </>
            ) : (
              <>
                Get Started with Community Plan
                <ArrowRight className="ml-2 w-5 h-5" />
              </>
            )}
          </Button>
          
          <p className="text-sm text-gray-500 mt-4">
            No credit card required • Start selling immediately
          </p>
        </div>

        <Alert className="mt-8 max-w-2xl mx-auto">
          <Shield className="h-4 w-4" />
          <AlertDescription>
            <strong>Why choose our Community plan?</strong> Get unlimited product listings, 
            comprehensive analytics, and dedicated support - all for free with just a 10% commission on sales.
          </AlertDescription>
        </Alert>
      </div>
    </div>
  );
};

export default SubscriptionSelection;
