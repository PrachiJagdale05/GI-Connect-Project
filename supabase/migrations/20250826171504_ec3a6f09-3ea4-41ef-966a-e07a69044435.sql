-- Create admin_subscriptions table to replace vendor_subscriptions for admin subscription management
CREATE TABLE public.admin_subscriptions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  plan_name TEXT NOT NULL,
  monthly_fee NUMERIC NOT NULL DEFAULT 0,
  yearly_fee NUMERIC NOT NULL DEFAULT 0,
  commission_rate NUMERIC NOT NULL DEFAULT 0,
  product_limit INTEGER NULL,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.admin_subscriptions ENABLE ROW LEVEL SECURITY;

-- Create policies for admin access
CREATE POLICY "Admins can manage admin subscriptions" 
ON public.admin_subscriptions 
FOR ALL 
USING (get_user_role(auth.uid()) = 'admin');

-- Insert predefined subscription plans
INSERT INTO public.admin_subscriptions (plan_name, monthly_fee, yearly_fee, commission_rate, product_limit) VALUES
('Community', 0, 0, 15, NULL),
('Starter', 199, 1999, 12, NULL),
('Growth', 699, 6999, 8, NULL),
('Premium', 1499, 14999, 5, NULL);