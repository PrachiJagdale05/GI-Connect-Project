
import React from 'react';
import { Check, X } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export type SubscriptionPlan = 'starter' | 'pro' | 'elite';

export interface SubscriptionPlansProps {
  activePlan?: SubscriptionPlan;
  onSelectPlan?: (plan: SubscriptionPlan) => void;
}

const planFeatures = {
  starter: {
    name: 'Starter',
    price: '₹0',
    commission: '10%',
    productLimit: '10 products',
    features: [
      { name: 'Basic analytics', included: true },
      { name: 'Standard support', included: true },
      { name: 'Manual approvals', included: false },
      { name: 'Priority listing', included: false },
      { name: 'Marketing tools', included: false },
    ]
  },
  pro: {
    name: 'Pro',
    price: '₹499',
    commission: '7.5%',
    productLimit: 'Unlimited products',
    features: [
      { name: 'Advanced analytics', included: true },
      { name: 'Priority support', included: true },
      { name: 'Faster approvals', included: true },
      { name: 'Priority listing', included: true },
      { name: 'Marketing tools', included: false },
    ]
  },
  elite: {
    name: 'Elite',
    price: '₹999',
    commission: '5%',
    productLimit: 'Unlimited products',
    features: [
      { name: 'Full analytics suite', included: true },
      { name: 'Dedicated support', included: true },
      { name: 'Express approvals', included: true },
      { name: 'Featured listings', included: true },
      { name: 'Advanced marketing tools', included: true },
    ]
  }
};

export const SubscriptionPlans: React.FC<SubscriptionPlansProps> = ({
  activePlan,
  onSelectPlan,
}) => {
  return (
    <div className="w-full">
      <div className="mx-auto grid gap-6 md:grid-cols-3 lg:gap-8 px-4 md:px-0">
        {(Object.keys(planFeatures) as Array<SubscriptionPlan>).map((planKey) => {
          const plan = planFeatures[planKey];
          const isActive = activePlan === planKey;
          
          return (
            <Card 
              key={planKey}
              className={cn(
                "flex flex-col h-full transition-all",
                isActive 
                  ? "border-primary shadow-lg ring-2 ring-primary" 
                  : "hover:border-primary/50 hover:shadow-md"
              )}
            >
              <CardHeader>
                <CardTitle className="text-xl">{plan.name}</CardTitle>
                <CardDescription>
                  <div className="flex items-baseline mt-2">
                    <span className="text-3xl font-bold">{plan.price}</span>
                    <span className="ml-1 text-muted-foreground">/month</span>
                  </div>
                </CardDescription>
              </CardHeader>
              <CardContent className="flex-1">
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-5 rounded-full bg-blue-100 flex items-center justify-center">
                      <span className="text-sm text-primary-foreground font-medium">{plan.commission}</span>
                    </div>
                    <p className="text-sm text-muted-foreground">Commission rate</p>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-5 rounded-full bg-green-100 flex items-center justify-center text-green-700">
                      <Check className="h-3 w-3" />
                    </div>
                    <p className="text-sm text-muted-foreground">{plan.productLimit}</p>
                  </div>
                  
                  <div className="pt-4 space-y-3">
                    {plan.features.map((feature, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        {feature.included ? (
                          <Check className="h-4 w-4 text-green-600" />
                        ) : (
                          <X className="h-4 w-4 text-gray-400" />
                        )}
                        <span className={cn(
                          "text-sm",
                          feature.included ? "text-foreground" : "text-muted-foreground"
                        )}>
                          {feature.name}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
              <CardFooter>
                <Button 
                  className="w-full"
                  variant={isActive ? "default" : "outline"}
                  onClick={() => onSelectPlan?.(planKey)}
                >
                  {isActive ? "Current Plan" : "Choose Plan"}
                </Button>
              </CardFooter>
            </Card>
          );
        })}
      </div>
    </div>
  );
};

export default SubscriptionPlans;
