
import React, { createContext, useContext, useState, useEffect } from 'react';
import { Product } from '@/types/products';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';

interface CartItem {
  product: Product;
  quantity: number;
}

interface CartContextType {
  items: CartItem[];
  addToCart: (product: Product, quantity?: number) => void;
  removeFromCart: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
  totalItems: number;
  totalPrice: number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [items, setItems] = useState<CartItem[]>([]);
  const { isAuthenticated } = useAuth();

  useEffect(() => {
    // Only load cart from localStorage if user is authenticated
    if (isAuthenticated) {
      const storedCart = localStorage.getItem('gi_connect_cart');
      if (storedCart) {
        setItems(JSON.parse(storedCart));
      }
    } else {
      // Clear cart if not authenticated
      setItems([]);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    // Save cart to localStorage whenever it changes (only if authenticated)
    if (isAuthenticated) {
      localStorage.setItem('gi_connect_cart', JSON.stringify(items));
    }
  }, [items, isAuthenticated]);

  const addToCart = (product: Product, quantity = 1) => {
    // For Buy Now, we don't need to check authentication here
    // as we'll handle that in the ProductDetails component
    setItems(prevItems => {
      const existingItem = prevItems.find(item => item.product.id === product.id);
      
      if (existingItem) {
        // If product already exists, update quantity
        const updatedItems = prevItems.map(item => 
          item.product.id === product.id 
            ? { ...item, quantity: item.quantity + quantity } 
            : item
        );
        toast.success(`Updated quantity of ${product.name} in cart`);
        return updatedItems;
      } else {
        // If product is new, add it
        toast.success(`Added ${product.name} to your cart`);
        return [...prevItems, { product, quantity }];
      }
    });
  };

  const removeFromCart = (productId: string) => {
    // Prevent cart operations if not authenticated
    if (!isAuthenticated) {
      toast.error("Please sign in to manage your cart");
      return;
    }
    
    setItems(prevItems => {
      const itemToRemove = prevItems.find(item => item.product.id === productId);
      if (itemToRemove) {
        toast.info(`Removed ${itemToRemove.product.name} from your cart`);
      }
      return prevItems.filter(item => item.product.id !== productId);
    });
  };

  const updateQuantity = (productId: string, quantity: number) => {
    // Prevent cart operations if not authenticated
    if (!isAuthenticated) {
      toast.error("Please sign in to manage your cart");
      return;
    }
    
    if (quantity < 1) return;
    
    setItems(prevItems => 
      prevItems.map(item => 
        item.product.id === productId 
          ? { ...item, quantity } 
          : item
      )
    );
  };

  const clearCart = () => {
    setItems([]);
    toast.info('Your cart has been cleared');
  };

  const totalItems = items.reduce((total, item) => total + item.quantity, 0);
  
  const totalPrice = items.reduce(
    (total, item) => total + item.quantity * item.product.price, 
    0
  );

  return (
    <CartContext.Provider
      value={{
        items,
        addToCart,
        removeFromCart,
        updateQuantity,
        clearCart,
        totalItems,
        totalPrice
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};
