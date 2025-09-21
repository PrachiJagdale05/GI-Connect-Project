-- Add generated_images column to products table
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS generated_images TEXT[] DEFAULT '{}';