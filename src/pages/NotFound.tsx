
import { useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { motion } from 'framer-motion';

const NotFound = () => {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    console.error(
      "404 Error: User attempted to access non-existent route:",
      location.pathname
    );

    // Check if we're on a direct access that needs to be redirected to home
    // When directly accessing a URL like /product/123 from a new tab
    if (window.location.pathname !== '/' && !location.key) {
      // This is a direct access with no history key
      console.log("Direct access detected, redirecting appropriately");
      
      // Try to match common patterns
      const productMatch = window.location.pathname.match(/\/product\/([^\/]+)/);
      const vendorProductMatch = window.location.pathname.match(/\/vendor\/ProductManagement/i);
      
      if (productMatch) {
        // If it's a product URL, try to load it normally
        console.log("Product URL detected:", productMatch[1]);
      } else if (vendorProductMatch) {
        // Redirect to the proper vendor products page
        console.log("Redirecting from ProductManagement to products");
        navigate('/vendor/products', { replace: true });
      } else {
        // Redirect to homepage for other direct accesses that cause 404s
        console.log("Non-product direct access, navigating to home page");
        navigate('/', { replace: true });
      }
    }
  }, [location.pathname, navigate, location.key]);

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="max-w-md w-full text-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
          >
            <h1 className="text-9xl font-bold text-primary/20">404</h1>
            <h2 className="text-2xl font-semibold mt-4">Page Not Found</h2>
            <p className="text-muted-foreground mt-2 mb-8">
              The page you are looking for doesn't exist or has been moved.
            </p>
            
            <div className="flex flex-col sm:flex-row justify-center gap-4">
              <Button asChild>
                <Link to="/">
                  Go to Homepage
                </Link>
              </Button>
              <Button variant="outline" asChild>
                <Link to="/marketplace">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Browse Products
                </Link>
              </Button>
            </div>
          </motion.div>
        </div>
      </div>
      
      <Footer />
    </div>
  );
};

export default NotFound;
