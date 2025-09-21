import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Loader2, LogIn } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { Maker, Product } from '@/types/products';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { MakerHero } from '@/components/maker/MakerHero';
import { MakerStory } from '@/components/maker/MakerStory';
import { MakerProducts } from '@/components/maker/MakerProducts';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

const MakerDetails = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  
  const [maker, setMaker] = useState<Maker | null>(null);
  const [makerProducts, setMakerProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showLoginDialog, setShowLoginDialog] = useState(false);
  
  useEffect(() => {
    // Scroll to top when the page loads
    window.scrollTo(0, 0);
    
    setIsLoading(true);
    
    const fetchMakerAndProducts = async () => {
      try {
        // First try to get maker from the makers table
        const { data: makerData, error: makerError } = await supabase
          .from('makers')
          .select('*')
          .eq('id', id)
          .single();
        
        let makerFromData: Maker | null = null;
        
        if (!makerError && makerData) {
          console.log("Found maker in makers table:", makerData);
          
          // Convert maker table data to Maker type
          makerFromData = {
            id: makerData.id,
            name: makerData.maker_name,
            image: makerData.maker_image_url || 'https://via.placeholder.com/400',
            region: makerData.maker_region,
            story: makerData.maker_story || `${makerData.maker_name} is a creator of authentic GI products.`,
            additionalImages: [],
            longStory: makerData.maker_story
          };
        } else {
          console.log("Maker not found in makers table, falling back to profiles");
          
          // Fall back to getting maker info from profiles table
          const { data: profileData, error: profileError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', id)
            .single();
          
          if (profileError) {
            console.error('Error fetching maker profile:', profileError);
            console.log("Profile ID being searched:", id);
            setIsLoading(false);
            return;
          }
          
          // Convert profile to maker
          makerFromData = {
            id: profileData.id,
            name: profileData.name,
            image: profileData.avatar_url || 'https://via.placeholder.com/400',
            region: profileData.address || 'India',
            story: profileData.bio || `${profileData.name} is a vendor specializing in authentic GI products.`,
            additionalImages: [],
            longStory: profileData.bio || `${profileData.name} is a vendor specializing in authentic GI products from various regions of India. They work directly with artisans to bring you the best quality products.`
          };
        }
        
        setMaker(makerFromData);
        
        // Fetch products by maker
        const { data: productsData, error: productsError } = await supabase
          .from('products')
          .select('*')
          .eq('vendor_id', id);
        
        if (productsError) {
          console.error('Error fetching products:', productsError);
          setIsLoading(false);
          return;
        }
        
        setMakerProducts(productsData as Product[]);
      } catch (error) {
        console.error('Unexpected error:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchMakerAndProducts();
  }, [id, navigate]);
  
  const handleLoginPrompt = () => {
    if (isAuthenticated) return;
    
    // For mobile or small screens, redirect directly to login
    if (window.innerWidth < 768) {
      navigate('/login', { state: { from: `/maker/${id}` } });
    } else {
      // For larger screens, show dialog
      setShowLoginDialog(true);
    }
  };
  
  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="h-12 w-12 text-primary animate-spin" />
        </div>
        <Footer />
      </div>
    );
  }
  
  if (!maker) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <div className="flex-1 pt-24 px-6">
          <div className="container mx-auto max-w-6xl py-12 text-center">
            <h1 className="text-2xl font-semibold mb-4">
              Maker Not Found
            </h1>
            <p className="text-muted-foreground mb-8">
              The maker you're looking for doesn't exist or has been removed.
            </p>
            <Button onClick={() => navigate(-1)}>Go Back</Button>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      
      <div className="flex-1 pt-24 px-6">
        <div className="container mx-auto max-w-6xl">
          {/* Breadcrumb */}
          <div className="py-4">
            <div className="flex items-center space-x-2 text-sm text-muted-foreground">
              <Link to="/" className="hover:text-primary transition-colors">Home</Link>
              <span>/</span>
              <Link to="/makers" className="hover:text-primary transition-colors">Makers</Link>
              <span>/</span>
              <span>{maker.name}</span>
            </div>
          </div>
          
          <MakerHero maker={maker} />
          
          <MakerStory 
            maker={maker} 
            isAuthenticated={isAuthenticated} 
            onLoginPrompt={handleLoginPrompt} 
          />
          
          <Separator className="my-8" />
          
          <MakerProducts 
            makerName={maker.name}
            products={makerProducts}
          />
        </div>
      </div>
      
      {/* Login Dialog for non-authenticated users */}
      <Dialog open={showLoginDialog} onOpenChange={setShowLoginDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Sign in Required</DialogTitle>
            <DialogDescription>
              Please sign in to view the full maker profile, including their story, images, and videos.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setShowLoginDialog(false)}>
              Cancel
            </Button>
            <Button onClick={() => {
              setShowLoginDialog(false);
              navigate('/login', { state: { from: `/maker/${id}` } });
            }}>
              Sign in Now
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      
      <Footer />
    </div>
  );
};

export default MakerDetails;
