
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Card } from '@/components/ui/card';
import { CheckCircle2, ArrowLeft } from 'lucide-react';
import { useCart } from '@/contexts/CartContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { formatPrice } from '@/lib/utils';
import { toast } from 'sonner';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { useAuth } from '@/contexts/AuthContext';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { supabase } from '@/integrations/supabase/client';

const Payment = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { items, totalPrice, clearCart } = useCart();
  const [isProcessing, setIsProcessing] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const taxRate = 0.05; // 5% tax
  const subtotal = totalPrice;
  const tax = subtotal * taxRate;
  const total = subtotal + tax;

  // Redirect if cart is empty
  useEffect(() => {
    // Check if items are available in cart
    if (!items || items.length === 0) {
      toast.error("Your cart is empty");
      navigate('/marketplace');
    }
  }, [items, navigate]);

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

  // Handle purchase flow
  const handleCompletePurchase = async () => {
    try {
      setIsProcessing(true);

      // Get current user
      if (!user) {
        toast.error("Please sign in to complete your purchase");
        navigate('/login');
        return;
      }

      // Get user profile for customer name
      const { data: profile } = await supabase
        .from('profiles')
        .select('name')
        .eq('id', user.id)
        .single();

      const customerName = profile?.name || user.email || 'Unknown Customer';

      // Create orders for each item in the cart
      const orderPromises = items.map(async (item) => {
        // Get product details
        const { data: product } = await supabase
          .from('products')
          .select('*')
          .eq('id', item.product.id)
          .single();

        if (!product) {
          throw new Error(`Product ${item.product.name} not found`);
        }

        // Create order record
        const orderData = {
          vendor_id: product.vendor_id,
          customer_id: user.id,
          product_id: item.product.id,
          customer_name: customerName,
          product_name: item.product.name,
          product_image: getProductImage(item.product),
          quantity: item.quantity,
          unit_price: item.product.price,
          total_price: item.product.price * item.quantity,
          status: 'pending',
          shipping_address: 'Default Address' // You can update this to use actual address
        };

        const { data, error } = await supabase
          .from('orders')
          .insert(orderData)
          .select()
          .single();

        if (error) {
          console.error('Error creating order:', error);
          throw error;
        }

        return data;
      });

      // Wait for all orders to be created
      await Promise.all(orderPromises);

      toast.success("Your order has been placed successfully");
      clearCart();
      setShowSuccess(true);
      setIsProcessing(false);

    } catch (error) {
      console.error('Processing error:', error);
      toast.error("Failed to process order. Please try again.");
      setIsProcessing(false);
    }
  };

  const handleSuccessClose = () => {
    setShowSuccess(false);
    navigate('/marketplace');
  };

  if (items.length === 0) {
    return null; // Will be redirected by useEffect
  }
  
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Navbar />
      
      <div className="flex-1 pt-24 px-4 md:px-6">
        <div className="container mx-auto max-w-4xl py-8 md:py-12">
          <div className="mb-6">
            <Button
              variant="ghost"
              onClick={() => navigate('/cart')}
              className="inline-flex items-center text-sm text-muted-foreground hover:text-primary transition-colors"
            >
              <ArrowLeft className="h-4 w-4 mr-1" />
              Back to Cart
            </Button>
          </div>
          
          <h1 className="text-2xl font-semibold mb-6">Checkout</h1>
        
          <div className="grid gap-6">
            {/* Products Summary */}
            <Card className="p-6">
              <h2 className="text-lg font-medium mb-4">Order Items</h2>
              <div className="space-y-4">
                {items.map((item) => (
                  <div key={item.product.id} className="flex items-start space-x-4">
                    <div className="h-16 w-16 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
                      <img 
                        src={getProductImage(item.product)} 
                        alt={item.product.name} 
                        className="h-full w-full object-cover"
                        onError={(e) => {
                          e.currentTarget.src = 'https://via.placeholder.com/400?text=Product';
                        }}
                      />
                    </div>
                    <div className="flex-1">
                      <div className="flex justify-between">
                        <div>
                          <p className="font-medium">{item.product.name}</p>
                          <p className="text-sm text-muted-foreground">Quantity: {item.quantity}</p>
                        </div>
                        <p className="font-medium">{formatPrice(item.product.price * item.quantity)}</p>
                      </div>
                    </div>
                  </div>
                ))}
                
                <Separator />
                
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span>{formatPrice(subtotal)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Tax (5%)</span>
                    <span>{formatPrice(tax)}</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between font-medium text-lg">
                    <span>Total</span>
                    <span>{formatPrice(total)}</span>
                  </div>
                </div>
              </div>
            </Card>

            {/* Payment Information */}
            <Card className="p-6">
              <h2 className="text-lg font-medium mb-4">Payment Information</h2>
              <Alert className="mb-4">
                <AlertTitle>Demo Mode</AlertTitle>
                <AlertDescription>
                  This is a demo application. No actual payment will be processed.
                </AlertDescription>
              </Alert>
            </Card>

            <Button 
              onClick={handleCompletePurchase}
              disabled={isProcessing} 
              className="w-full"
              size="lg"
            >
              {isProcessing ? 'Processing...' : 'Complete Purchase'}
            </Button>
          </div>

          {/* Success Dialog */}
          <Dialog open={showSuccess} onOpenChange={setShowSuccess}>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle className="text-center flex flex-col items-center gap-4">
                  <CheckCircle2 className="h-12 w-12 text-green-500" />
                  Order Placed Successfully!
                </DialogTitle>
              </DialogHeader>
              <div className="text-center space-y-4">
                <p className="text-muted-foreground">
                  Your order has been placed successfully. This is a demo application, so no actual order has been processed.
                </p>
                <Button onClick={handleSuccessClose} className="w-full">
                  Continue Shopping
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>
      
      <Footer />
    </div>
  );
};

export default Payment;
