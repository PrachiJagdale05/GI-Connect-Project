
export interface Product {
  id: string;
  name: string;
  description: string | null;
  price: number;
  images: string[] | null;
  videos: string[] | null;
  category: string | null;
  stock: number;
  vendor_id: string;
  location: string | null;
  region: string | null;
  is_gi_approved: boolean | null;
  gi_status?: string;
  created_at: string;
  updated_at: string;
  // Aliases for compatibility
  createdAt?: string;
  updatedAt?: string;
  giTag?: string;
  vendorName?: string;
  vendor_name?: string;
  vendorLogo?: string;
  vendor_image?: string;
  mainImage?: string;
  maker_id?: string;
  maker?: Maker | null;
  inStock?: boolean;
  longDescription?: string;
  new?: boolean;
  featured?: boolean;
  bestSeller?: boolean;
  generated_images?: string[] | null;
}

// Simplified Order interface (since orders table was removed)
export interface Order {
  id: string;
  customer_id: string;
  product_id: string;
  product?: Product;
  quantity: number;
  total_price: number;
  status: string;
  created_at: string;
  updated_at: string;
  shipping_address?: string;
  customer?: {
    id: string;
    name: string;
    email: string;
    role: string;
    created_at: string;
    updated_at: string;
    phone?: string | null;
  };
}

export interface Favorite {
  id: string;
  user_id: string;
  product_id: string;
  product?: Product;
  createdAt: string;
  created_at?: string;
}

export interface Maker {
  id: string;
  name: string;
  image: string;
  region: string;
  story: string;
  additionalImages?: string[];
  longStory?: string;
  videoUrl?: string;
}

export interface ProductFormData {
  name: string;
  description: string;
  price: number;
  stock: number;
  category: string;
  region: string;
  location: string;
  is_gi_approved: boolean;
  maker: MakerFormData;
  images: string[];
  videos: string[];
  giCertificationDocument?: File;
  generated_images?: string[];
}

export interface AIGenerationRequest {
  image_url: string;
  product_name: string;
}

export interface AIGenerationResponse {
  product_name: string;
  category: string;
  description: string;
  price: number;
  stock: number;
  generated_images: string[];
}

export interface MakerFormData {
  name: string;
  region: string;
  story: string;
  image?: File;
}

export interface FileUploadResult {
  url: string;
  error?: string;
}

// Common categories for the marketplace
export const categories = [
  "All",
  "Handicrafts",
  "Textiles",
  "Food & Beverages",
  "Agricultural Products",
  "Pottery & Ceramics",
  "Jewelry",
  "Home Decor",
  "Art & Paintings",
  "Wellness & Personal Care"
];

// Regions with GI tags in India
export const regions = [
  "All Regions",
  "Kashmir",
  "Rajasthan",
  "Gujarat",
  "Karnataka",
  "Tamil Nadu",
  "West Bengal",
  "Uttar Pradesh",
  "Kerala",
  "Madhya Pradesh",
  "Odisha",
  "Maharashtra",
  "Andhra Pradesh",
  "Assam",
  "Bihar",
  "Himachal Pradesh"
];
