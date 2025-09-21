-- Create triggers for automatic notification generation

-- Trigger for new vendor registration (profile created with role 'vendor')
CREATE OR REPLACE FUNCTION public.notify_vendor_registration()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Only trigger for vendor role
  IF NEW.role = 'vendor' THEN
    INSERT INTO public.notifications (
      type,
      title,
      message,
      priority,
      user_id,
      entity_id
    ) VALUES (
      'vendor_update',
      'New Vendor Registration',
      'New vendor registered: ' || NEW.name,
      'medium',
      NULL, -- Admin notifications (visible to all admins)
      NEW.id::text
    );
  END IF;
  RETURN NEW;
END;
$$;

-- Create trigger for new vendor registration
CREATE OR REPLACE TRIGGER on_vendor_registration
  AFTER INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_vendor_registration();

-- Trigger for new product creation
CREATE OR REPLACE FUNCTION public.notify_product_creation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.notifications (
    type,
    title,
    message,
    priority,
    user_id,
    entity_id
  ) VALUES (
    'product_update',
    'New Product Added',
    'New product added: ' || NEW.name,
    'medium',
    NULL, -- Admin notifications (visible to all admins)
    NEW.id::text
  );
  RETURN NEW;
END;
$$;

-- Create trigger for new product creation
CREATE OR REPLACE TRIGGER on_product_creation
  AFTER INSERT ON public.products
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_product_creation();

-- Trigger for GI status changes
CREATE OR REPLACE FUNCTION public.notify_gi_status_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  status_text TEXT;
BEGIN
  -- Only trigger if gi_status has actually changed
  IF OLD.gi_status IS DISTINCT FROM NEW.gi_status THEN
    -- Determine status text
    CASE NEW.gi_status
      WHEN 'approved' THEN status_text := 'Approved';
      WHEN 'rejected' THEN status_text := 'Rejected';
      ELSE status_text := 'Updated';
    END CASE;

    INSERT INTO public.notifications (
      type,
      title,
      message,
      priority,
      user_id,
      entity_id
    ) VALUES (
      'gi_verification',
      'GI Status ' || status_text,
      'Product "' || NEW.name || '" GI status: ' || status_text,
      'high',
      NULL, -- Admin notifications (visible to all admins)
      NEW.id::text
    );
  END IF;
  RETURN NEW;
END;
$$;

-- Create trigger for GI status changes
CREATE OR REPLACE TRIGGER on_gi_status_change
  AFTER UPDATE ON public.products
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_gi_status_change();