-- Fix GI certification workflow in products table
-- Set gi_status default to 'pending' and ensure is_gi_approved defaults to false
ALTER TABLE public.products 
ALTER COLUMN gi_status SET DEFAULT 'pending';

ALTER TABLE public.products 
ALTER COLUMN is_gi_approved SET DEFAULT false;

-- Update existing products without GI certifications to have pending status
-- Only set to pending if they don't have a GI certification document
UPDATE public.products 
SET gi_status = 'pending', is_gi_approved = false 
WHERE id NOT IN (
  SELECT DISTINCT product_id 
  FROM public.gi_certifications 
  WHERE is_verified = true
);

-- Update products that have been verified by admin to approved status
UPDATE public.products 
SET gi_status = 'approved', is_gi_approved = true 
WHERE id IN (
  SELECT DISTINCT product_id 
  FROM public.gi_certifications 
  WHERE is_verified = true
);

-- Update products that have been rejected to rejected status
UPDATE public.products 
SET gi_status = 'rejected', is_gi_approved = false 
WHERE id IN (
  SELECT DISTINCT product_id 
  FROM public.gi_certifications 
  WHERE is_verified = false AND rejection_reason IS NOT NULL
);