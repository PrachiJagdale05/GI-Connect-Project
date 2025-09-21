-- Remove vendor_subscriptions table and update related functions
DROP TABLE IF EXISTS public.vendor_subscriptions CASCADE;

-- Update calculate_vendor_commission function to use a default commission rate
CREATE OR REPLACE FUNCTION public.calculate_vendor_commission(vendor_id uuid, amount numeric)
RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  commission_rate NUMERIC := 10; -- Default commission rate of 10%
BEGIN
  -- Return commission based on default rate
  RETURN (amount * commission_rate / 100);
END;
$$;

-- Update record_commission_transaction function to use default commission rate
CREATE OR REPLACE FUNCTION public.record_commission_transaction()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  vendor_id UUID;
  commission_amount NUMERIC;
  commission_rate NUMERIC := 10; -- Default commission rate of 10%
BEGIN
  -- Get vendor ID from product
  SELECT vendor_id INTO vendor_id FROM products WHERE id = NEW.product_id;
  
  -- If no vendor found, skip
  IF vendor_id IS NULL THEN
    RETURN NEW;
  END IF;
  
  -- Calculate commission amount using default rate
  commission_amount := (NEW.total_price * commission_rate / 100);
  
  -- Insert commission transaction
  INSERT INTO commission_transactions (
    order_id,
    vendor_id,
    product_id,
    total_amount,
    commission_rate,
    commission_amount,
    vendor_earning,
    status
  ) VALUES (
    NEW.id,
    vendor_id,
    NEW.product_id,
    NEW.total_price,
    commission_rate,
    NEW.total_price - commission_amount,
    commission_amount,
    'pending'
  );
  
  RETURN NEW;
END;
$$;