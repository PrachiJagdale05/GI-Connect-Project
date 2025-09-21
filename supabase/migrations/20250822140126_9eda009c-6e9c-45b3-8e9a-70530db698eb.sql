-- Add gi_status column to products table for approval workflow
ALTER TABLE public.products 
ADD COLUMN gi_status TEXT DEFAULT 'approved' CHECK (gi_status IN ('pending', 'approved', 'rejected'));

-- Update existing products: 
-- - Products with is_gi_approved = true should have 'approved' status
-- - Products with is_gi_approved = false should have 'approved' status (they're not GI products)
UPDATE public.products 
SET gi_status = 'approved' 
WHERE gi_status IS NULL;

-- Make gi_status NOT NULL now that we've set defaults
ALTER TABLE public.products 
ALTER COLUMN gi_status SET NOT NULL;