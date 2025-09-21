
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Product } from '@/types/products';
import { useAuth } from '@/contexts/AuthContext';
import { useCart } from '@/contexts/CartContext';
import { toast } from 'sonner';

interface ProductCardAuthWrapperProps {
  product: Product;
  children: (handleAddToCart: () => void) => React.ReactNode;
}

const ProductCardAuthWrapper = ({ product, children }: ProductCardAuthWrapperProps) => {
  const { isAuthenticated } = useAuth();
  const { addToCart } = useCart();
  const navigate = useNavigate();

  const handleAddToCart = () => {
    if (isAuthenticated) {
      addToCart(product, 1);
    } else {
      toast.error("Please sign in to add items to your cart");
      navigate('/login', { state: { from: `/product/${product.id}` } });
    }
  };

  return <>{children(handleAddToCart)}</>;
};

export default ProductCardAuthWrapper;
