import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  ShoppingCart, 
  Trash2, 
  Plus, 
  Minus, 
  Loader2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { useCart } from '@/contexts/CartContext';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { formatPrice } from '@/lib/utils';

const Cart = () => {
  const navigate = useNavigate();
  const { items, removeFromCart, updateQuantity, totalItems, totalPrice } = useCart();
  const { isAuthenticated } = useAuth();
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  
  // Redirect unauthenticated users
  useEffect(() => {
    if (!isAuthenticated) {
      toast.error("Please sign in to view your cart");
      navigate('/login', { state: { from: '/cart' } });
    }
  }, [isAuthenticated, navigate]);
  
  // Helper function to get the correct product image
  const getProductImage = (product) => {
    if (product.images && product.images.length > 0) {
      return product.images[0];
    } 
    if (product.mainImage) {
      return product.mainImage;
    }
    return 'https://via.placeholder.com/400?text=No+Image';
  };
  
  const handleCheckout = () => {
    if (!isAuthenticated) {
      toast.error("Please sign in to checkout");
      navigate('/login', { state: { from: '/cart' } });
      return;
    }
    
    if (items.length === 0) {
      toast.error("Your cart is empty");
      return;
    }
    
    setIsCheckingOut(true);
    
    // Navigate to payment page immediately without timeout
    navigate('/payment');
    setIsCheckingOut(false);
  };
  
  // Show loading state while checking authentication
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <div className="flex-1 pt-24 px-6 flex items-center justify-center">
          <Loader2 className="h-12 w-12 text-primary animate-spin" />
        </div>
        <Footer />
      </div>
    );
  }
  
  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Navbar />
      
      <div className="flex-1 pt-24 px-4 md:px-6">
        <div className="container mx-auto max-w-6xl py-8 md:py-12">
          <div className="mb-6">
            <Link 
              to="/marketplace" 
              className="inline-flex items-center text-sm text-muted-foreground hover:text-primary transition-colors"
            >
              <ArrowLeft className="h-4 w-4 mr-1" />
              Continue Shopping
            </Link>
          </div>
          
          <h1 className="text-2xl md:text-3xl font-semibold mb-8 md:mb-10 flex items-center">
            <ShoppingCart className="mr-3 h-6 w-6 md:h-7 md:w-7" />
            Shopping Cart ({totalItems} item{totalItems !== 1 ? 's' : ''})
          </h1>
          
          {items.length === 0 ? (
            <div className="bg-white rounded-xl shadow-soft p-8 text-center">
              <h2 className="text-xl font-medium mb-4">Your cart is empty</h2>
              <p className="text-muted-foreground mb-8">
                Looks like you haven't added anything to your cart yet.
              </p>
              <Button onClick={() => navigate('/marketplace')}>
                Explore Products
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Cart Items */}
              <div className="lg:col-span-2">
                <div className="bg-white rounded-xl shadow-soft overflow-hidden">
                  <div className="p-6">
                    <h2 className="text-xl font-medium mb-0">Cart Items</h2>
                  </div>
                  <Separator />
                  
                  {items.map((item, index) => (
                    <div key={item.product.id}>
                      <div className="p-6 flex flex-col sm:flex-row gap-6">
                        <div className="flex-shrink-0">
                          <Link to={`/product/${item.product.id}`}>
                            <div className="h-28 w-28 rounded-lg overflow-hidden bg-gray-100">
                              <img 
                                src={getProductImage(item.product)} 
                                alt={item.product.name} 
                                className="h-full w-full object-cover"
                                onError={(e) => {
                                  e.currentTarget.src = 'https://via.placeholder.com/400?text=Product';
                                }}
                              />
                            </div>
                          </Link>
                        </div>
                        
                        <div className="flex-1 flex flex-col justify-between">
                          <div>
                            <div className="flex flex-col sm:flex-row justify-between mb-4">
                              <div>
                                <Link to={`/product/${item.product.id}`}>
                                  <h3 className="text-lg font-medium hover:text-primary transition-colors">
                                    {item.product.name}
                                  </h3>
                                </Link>
                                <p className="text-sm text-muted-foreground mt-1">
                                  {item.product.giTag} • {item.product.region}
                                </p>
                              </div>
                              <div className="text-right mt-2 sm:mt-0">
                                <p className="text-lg font-medium">
                                  {formatPrice(item.product.price)}
                                </p>
                              </div>
                            </div>
                            
                            <div className="flex justify-between items-center">
                              <div className="flex items-center space-x-3">
                                <Button
                                  variant="outline"
                                  size="icon"
                                  className="h-8 w-8"
                                  onClick={() => updateQuantity(item.product.id, item.quantity - 1)}
                                  disabled={item.quantity <= 1}
                                >
                                  <Minus className="h-3 w-3" />
                                </Button>
                                <span className="w-8 text-center text-base">{item.quantity}</span>
                                <Button
                                  variant="outline"
                                  size="icon"
                                  className="h-8 w-8"
                                  onClick={() => updateQuantity(item.product.id, item.quantity + 1)}
                                >
                                  <Plus className="h-3 w-3" />
                                </Button>
                              </div>
                              
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-red-500 hover:text-red-600 hover:bg-red-50"
                                onClick={() => removeFromCart(item.product.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      {index < items.length - 1 && <Separator />}
                    </div>
                  ))}
                </div>
              </div>
              
              {/* Order Summary */}
              <div className="lg:col-span-1">
                <div className="bg-white rounded-xl shadow-soft p-6 sticky top-28">
                  <h2 className="text-xl font-medium mb-4">Order Summary</h2>
                  <Separator />
                  
                  <div className="mt-4 space-y-3">
                    <div className="flex justify-between text-base">
                      <span className="text-muted-foreground">Subtotal</span>
                      <span>{formatPrice(totalPrice)}</span>
                    </div>
                    <div className="flex justify-between text-base">
                      <span className="text-muted-foreground">Shipping</span>
                      <span>{formatPrice(0)}</span>
                    </div>
                    <div className="flex justify-between text-base">
                      <span className="text-muted-foreground">Tax</span>
                      <span>{formatPrice(totalPrice * 0.05)}</span>
                    </div>
                  </div>
                  
                  <Separator className="my-4" />
                  
                  <div className="flex justify-between font-medium text-lg">
                    <span>Total</span>
                    <span>{formatPrice(totalPrice + totalPrice * 0.05)}</span>
                  </div>
                  
                  <Button 
                    className="w-full mt-6"
                    size="lg"
                    onClick={handleCheckout}
                    disabled={isCheckingOut}
                  >
                    {isCheckingOut ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      'Checkout'
                    )}
                  </Button>
                  
                  <p className="text-xs text-muted-foreground text-center mt-4">
                    This is a demo application. No actual payment will be processed.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
      
      <Footer />
    </div>
  );
};

export default Cart;
