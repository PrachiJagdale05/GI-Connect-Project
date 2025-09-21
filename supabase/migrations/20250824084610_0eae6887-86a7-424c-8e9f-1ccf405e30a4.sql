-- Add gi_certificate_url column to products table
ALTER TABLE public.products 
ADD COLUMN gi_certificate_url TEXT;