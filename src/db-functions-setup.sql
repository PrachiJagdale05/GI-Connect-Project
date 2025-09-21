-- This is just a reference file for database functions that need to be created
-- to support the TypeScript fixes. Run these in Supabase SQL Editor.

-- Address functions
CREATE OR REPLACE FUNCTION get_user_addresses(user_id_param UUID)
RETURNS SETOF addresses
LANGUAGE sql
SECURITY definer
AS $$
  SELECT * FROM addresses 
  WHERE user_id = user_id_param
  ORDER BY is_default DESC, created_at DESC;
$$;

CREATE OR REPLACE FUNCTION reset_default_address(user_id_param UUID)
RETURNS void
LANGUAGE sql
SECURITY definer
AS $$
  UPDATE addresses
  SET is_default = false
  WHERE user_id = user_id_param AND is_default = true;
$$;

CREATE OR REPLACE FUNCTION insert_address(
  user_id_param UUID,
  name_param TEXT,
  address_line1_param TEXT,
  address_line2_param TEXT,
  city_param TEXT,
  state_param TEXT,
  postal_code_param TEXT,
  country_param TEXT,
  is_default_param BOOLEAN
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY definer
AS $$
DECLARE
  new_id UUID;
BEGIN
  INSERT INTO addresses (
    user_id, name, address_line1, address_line2, city, state, 
    postal_code, country, is_default
  )
  VALUES (
    user_id_param, name_param, address_line1_param, address_line2_param, 
    city_param, state_param, postal_code_param, country_param, is_default_param
  )
  RETURNING id INTO new_id;
  
  RETURN new_id;
END;
$$;

CREATE OR REPLACE FUNCTION update_address(
  address_id_param UUID,
  user_id_param UUID,
  name_param TEXT DEFAULT NULL,
  address_line1_param TEXT DEFAULT NULL,
  address_line2_param TEXT DEFAULT NULL,
  city_param TEXT DEFAULT NULL,
  state_param TEXT DEFAULT NULL,
  postal_code_param TEXT DEFAULT NULL,
  country_param TEXT DEFAULT NULL,
  is_default_param BOOLEAN DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY definer
AS $$
BEGIN
  UPDATE addresses
  SET 
    name = COALESCE(name_param, name),
    address_line1 = COALESCE(address_line1_param, address_line1),
    address_line2 = COALESCE(address_line2_param, address_line2),
    city = COALESCE(city_param, city),
    state = COALESCE(state_param, state),
    postal_code = COALESCE(postal_code_param, postal_code),
    country = COALESCE(country_param, country),
    is_default = COALESCE(is_default_param, is_default),
    updated_at = now()
  WHERE id = address_id_param AND user_id = user_id_param;
END;
$$;

CREATE OR REPLACE FUNCTION delete_address(
  address_id_param UUID,
  user_id_param UUID
)
RETURNS void
LANGUAGE sql
SECURITY definer
AS $$
  DELETE FROM addresses
  WHERE id = address_id_param AND user_id = user_id_param;
$$;

-- Favorites functions
CREATE OR REPLACE FUNCTION get_user_favorites(user_id_param UUID)
RETURNS TABLE (
  id UUID,
  user_id UUID,
  product_id UUID,
  created_at TIMESTAMPTZ,
  product JSON
)
LANGUAGE plpgsql
SECURITY definer
AS $$
BEGIN
  RETURN QUERY 
  SELECT 
    f.id, 
    f.user_id, 
    f.product_id, 
    f.created_at,
    row_to_json(p) AS product
  FROM favorites f
  JOIN products p ON f.product_id = p.id
  WHERE f.user_id = user_id_param
  ORDER BY f.created_at DESC;
END;
$$;

CREATE OR REPLACE FUNCTION add_favorite(
  user_id_param UUID,
  product_id_param UUID
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY definer
AS $$
DECLARE
  new_id UUID;
BEGIN
  -- Check if favorite already exists
  SELECT id INTO new_id FROM favorites 
  WHERE user_id = user_id_param AND product_id = product_id_param;
  
  -- If not exists, create it
  IF new_id IS NULL THEN
    INSERT INTO favorites (user_id, product_id)
    VALUES (user_id_param, product_id_param)
    RETURNING id INTO new_id;
  END IF;
  
  RETURN new_id;
END;
$$;

CREATE OR REPLACE FUNCTION remove_favorite(
  user_id_param UUID,
  product_id_param UUID
)
RETURNS void
LANGUAGE sql
SECURITY definer
AS $$
  DELETE FROM favorites
  WHERE user_id = user_id_param AND product_id = product_id_param;
$$;

CREATE OR REPLACE FUNCTION is_favorite(
  user_id_param UUID,
  product_id_param UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY definer
AS $$
DECLARE
  result BOOLEAN;
BEGIN
  SELECT EXISTS(
    SELECT 1 FROM favorites 
    WHERE user_id = user_id_param AND product_id = product_id_param
  ) INTO result;
  
  RETURN result;
END;
$$;

-- Payment Methods functions
CREATE OR REPLACE FUNCTION get_user_payment_methods(user_id_param UUID)
RETURNS SETOF payment_methods
LANGUAGE sql
SECURITY definer
AS $$
  SELECT * FROM payment_methods 
  WHERE user_id = user_id_param
  ORDER BY is_default DESC, created_at DESC;
$$;

CREATE OR REPLACE FUNCTION reset_default_payment_method(user_id_param UUID)
RETURNS void
LANGUAGE sql
SECURITY definer
AS $$
  UPDATE payment_methods
  SET is_default = false
  WHERE user_id = user_id_param AND is_default = true;
$$;

CREATE OR REPLACE FUNCTION add_payment_method(
  user_id_param UUID,
  method_type_param TEXT,
  is_default_param BOOLEAN,
  details_param JSONB
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY definer
AS $$
DECLARE
  new_id UUID;
BEGIN
  INSERT INTO payment_methods (
    user_id, method_type, is_default, details
  )
  VALUES (
    user_id_param, method_type_param, is_default_param, details_param
  )
  RETURNING id INTO new_id;
  
  RETURN new_id;
END;
$$;

CREATE OR REPLACE FUNCTION update_payment_method(
  payment_method_id_param UUID,
  user_id_param UUID,
  method_type_param TEXT DEFAULT NULL,
  is_default_param BOOLEAN DEFAULT NULL,
  details_param JSONB DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY definer
AS $$
BEGIN
  UPDATE payment_methods
  SET 
    method_type = COALESCE(method_type_param, method_type),
    is_default = COALESCE(is_default_param, is_default),
    details = COALESCE(details_param, details),
    updated_at = now()
  WHERE id = payment_method_id_param AND user_id = user_id_param;
END;
$$;

CREATE OR REPLACE FUNCTION delete_payment_method(
  payment_method_id_param UUID,
  user_id_param UUID
)
RETURNS void
LANGUAGE sql
SECURITY definer
AS $$
  DELETE FROM payment_methods
  WHERE id = payment_method_id_param AND user_id = user_id_param;
$$;

-- Update the commission calculation function to use a default commission rate
CREATE OR REPLACE FUNCTION calculate_vendor_commission(vendor_id uuid, amount numeric)
RETURNS numeric
LANGUAGE plpgsql
SECURITY definer
AS $$
DECLARE
  commission_rate NUMERIC := 10; -- Default commission rate of 10%
BEGIN
  -- Return commission based on default rate
  RETURN (amount * commission_rate / 100);
END;
$$;

-- Update the record_commission_transaction function to use default commission rate
CREATE OR REPLACE FUNCTION record_commission_transaction()
RETURNS trigger
LANGUAGE plpgsql
SECURITY definer
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
