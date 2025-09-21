import { useState, useEffect } from 'react';
import { Flag, Tag, Eye, Check, AlertTriangle, ExternalLink, Loader2, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import AdminLayout from '@/components/AdminLayout';
import { supabase } from '@/integrations/supabase/client';

interface Product {
  id: string;
  name: string;
  description: string | null;
  price: number;
  stock: number;
  is_gi_approved: boolean;
  gi_status: string;
  created_at: string;
  images: string[];
  region: string | null;
  vendor_id: string;
  vendor_name?: string;
  vendor_email?: string;
  flagged?: boolean;
  gi_certificate?: {
    id: string;
    is_verified: boolean | null;
  };
}

const Products = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [showDetails, setShowDetails] = useState(false);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      
      // Fetch products with vendor information
      const { data, error } = await supabase
        .from('products')
        .select(`
          id, name, description, price, stock, is_gi_approved, gi_status, created_at, images, region, vendor_id
        `)
        .order('created_at', { ascending: false });
        
      if (error) {
        throw error;
      }
      
      // Get vendor information and GI certification status for each product
      const productsWithInfo = await Promise.all(
        data.map(async (product) => {
          // Fetch vendor data
          const { data: vendorData, error: vendorError } = await supabase
            .from('profiles')
            .select('name, email')
            .eq('id', product.vendor_id)
            .single();
            
          // Fetch GI certification status
          const { data: certData, error: certError } = await supabase
            .from('gi_certifications')
            .select('id, is_verified')
            .eq('product_id', product.id)
            .maybeSingle();
            
          if (certError && certError.code !== 'PGRST116') { // Not found error is expected for products without certificates
            console.error('Error fetching GI certification:', certError);
          }
            
          return {
            ...product,
            vendor_name: vendorData?.name || 'Unknown Vendor',
            vendor_email: vendorData?.email || '',
            flagged: false, // Default flag state
            gi_certificate: certData || null
          };
        })
      );
      
      setProducts(productsWithInfo);
    } catch (error) {
      console.error('Error fetching products:', error);
      toast.error('Failed to load products');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
    
    // Set up real-time listener for product changes
    const productsChannel = supabase
      .channel('admin-products-changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'products'
      }, (payload) => {
        // Refresh the products list when products change
        fetchProducts();
      })
      .subscribe();
    
    return () => {
      supabase.removeChannel(productsChannel);
    };
  }, []);

  const handleViewDetails = (product: Product) => {
    setSelectedProduct(product);
    setShowDetails(true);
  };

  const handleFlagProduct = (productId: string, isFlagged: boolean) => {
    // Update local state
    const updatedProducts = products.map(p => 
      p.id === productId ? { ...p, flagged: isFlagged } : p
    );
    
    setProducts(updatedProducts);
    
    // Update selected product if it's the one being flagged
    if (selectedProduct && selectedProduct.id === productId) {
      setSelectedProduct({ ...selectedProduct, flagged: isFlagged });
    }
    
    toast.success(`Product ${isFlagged ? 'flagged' : 'unflagged'} successfully`);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(price);
  };

  const getGIStatus = (product: Product) => {
    switch (product.gi_status) {
      case 'approved':
        return {
          label: 'GI Tagged',
          variant: 'default' as const
        };
      case 'rejected':
        return {
          label: 'Not GI Tagged',
          variant: 'destructive' as const
        };
      case 'pending':
      default:
        return {
          label: 'Pending Certificate',
          variant: 'secondary' as const
        };
    }
  };

  return (
    <AdminLayout title="Product Management">
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex justify-center p-8">
            <div className="flex flex-col items-center">
              <Loader2 className="animate-spin rounded-full h-12 w-12 mb-4 text-primary" />
              <p className="text-muted-foreground">Loading products...</p>
            </div>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[250px]">Product</TableHead>
                <TableHead>Vendor</TableHead>
                <TableHead>Price</TableHead>
                <TableHead>Stock</TableHead>
                <TableHead>Region</TableHead>
                <TableHead>GI Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {products.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    No products found
                  </TableCell>
                </TableRow>
              ) : (
                products.map((product) => {
                  const giStatus = getGIStatus(product);
                  
                  return (
                    <TableRow key={product.id} className={product.flagged ? "bg-red-50" : ""}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded bg-gray-100 overflow-hidden flex-shrink-0">
                            {product.images && product.images.length > 0 ? (
                              <img
                                src={product.images[0]}
                                alt={product.name}
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <div className="h-full w-full flex items-center justify-center bg-gray-200">
                                <Tag className="h-5 w-5 text-gray-400" />
                              </div>
                            )}
                          </div>
                          <span>{product.name}</span>
                        </div>
                      </TableCell>
                      <TableCell>{product.vendor_name}</TableCell>
                      <TableCell>{formatPrice(product.price)}</TableCell>
                      <TableCell>
                        <Badge variant={product.stock > 0 ? "outline" : "destructive"}>
                          {product.stock > 0 ? `${product.stock} in stock` : 'Out of stock'}
                        </Badge>
                      </TableCell>
                      <TableCell>{product.region || 'N/A'}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Badge variant={giStatus.variant}>
                            {giStatus.label}
                          </Badge>
                          {product.is_gi_approved && product.gi_certificate && product.gi_certificate.is_verified === null && (
                            <Button 
                              variant="ghost" 
                              size="icon"
                              className="h-6 w-6"
                              onClick={() => {
                                // Navigate to GI verification page
                                window.location.href = "/admin-dashboard/gi-tags";
                              }}
                            >
                              <AlertTriangle className="h-4 w-4 text-amber-500" />
                            </Button>
                          )}
                          {product.is_gi_approved && product.gi_certificate && product.gi_certificate.is_verified === true && (
                            <ShieldCheck className="h-4 w-4 text-green-500" />
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            onClick={() => handleFlagProduct(product.id, !product.flagged)}
                          >
                            <Flag className={`h-4 w-4 ${product.flagged ? 'text-red-500 fill-red-500' : ''}`} />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            onClick={() => handleViewDetails(product)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        )}
      </div>

      <Dialog open={showDetails} onOpenChange={setShowDetails}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Product Details</DialogTitle>
            <DialogDescription>
              View and manage product information
            </DialogDescription>
          </DialogHeader>
          
          {selectedProduct && (
            <Tabs defaultValue="details" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="details">Details</TabsTrigger>
                <TabsTrigger value="images">Images</TabsTrigger>
              </TabsList>
              
              <TabsContent value="details" className="space-y-4 pt-4">
                <div className="flex justify-between items-start">
                  <h3 className="text-lg font-semibold">{selectedProduct.name}</h3>
                  {selectedProduct.is_gi_approved && (
                    <Badge variant={
                      selectedProduct.gi_certificate?.is_verified === true ? "default" :
                      selectedProduct.gi_certificate?.is_verified === false ? "destructive" :
                      "secondary"
                    }>
                      {selectedProduct.gi_certificate?.is_verified === true ? 'GI Verified' :
                       selectedProduct.gi_certificate?.is_verified === false ? 'GI Rejected' :
                       'GI Pending'}
                    </Badge>
                  )}
                </div>
                
                <p className="text-sm text-muted-foreground">
                  {selectedProduct.description || 'No description provided'}
                </p>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-muted-foreground text-xs">Price</Label>
                    <p className="font-medium">{formatPrice(selectedProduct.price)}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground text-xs">Stock Level</Label>
                    <p className="font-medium">{selectedProduct.stock}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground text-xs">Region</Label>
                    <p className="font-medium">{selectedProduct.region || 'N/A'}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground text-xs">Listed</Label>
                    <p className="font-medium">{formatDate(selectedProduct.created_at)}</p>
                  </div>
                </div>
                
                <div className="pt-2">
                  <Label className="text-muted-foreground text-xs">Vendor</Label>
                  <div className="flex items-center justify-between">
                    <p className="font-medium">{selectedProduct.vendor_name}</p>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="h-8 text-xs"
                      onClick={() => window.location.href = `/admin-dashboard/vendors?id=${selectedProduct.vendor_id}`}
                    >
                      <ExternalLink className="mr-1 h-3 w-3" />
                      View Vendor
                    </Button>
                  </div>
                </div>
                
                {selectedProduct.is_gi_approved && selectedProduct.gi_certificate && selectedProduct.gi_certificate.is_verified === null && (
                  <div className="pt-2">
                    <div className="p-3 border border-amber-200 bg-amber-50 rounded-md flex items-center gap-2">
                      <AlertTriangle className="h-5 w-5 text-amber-500" />
                      <div>
                        <p className="font-medium">GI Verification Pending</p>
                        <p className="text-sm text-amber-700">This product requires GI verification</p>
                      </div>
                      <Button 
                        size="sm"
                        className="ml-auto"
                        onClick={() => window.location.href = "/admin-dashboard/gi-tags"}
                      >
                        Verify
                      </Button>
                    </div>
                  </div>
                )}
              </TabsContent>
              
              <TabsContent value="images">
                <div className="grid grid-cols-2 gap-3 pt-4">
                  {selectedProduct.images && selectedProduct.images.length > 0 ? (
                    selectedProduct.images.map((image, idx) => (
                      <div key={idx} className="aspect-square bg-gray-100 rounded overflow-hidden">
                        <img
                          src={image}
                          alt={`${selectedProduct.name} - Image ${idx + 1}`}
                          className="h-full w-full object-cover"
                        />
                      </div>
                    ))
                  ) : (
                    <div className="col-span-2 flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
                      <Tag className="h-8 w-8 mb-2" />
                      <p>No product images available</p>
                    </div>
                  )}
                </div>
              </TabsContent>
            </Tabs>
          )}
          
          <DialogFooter className="flex sm:justify-between">
            <div className="flex gap-2">
              {selectedProduct && (
                <Button 
                  variant={selectedProduct.flagged ? "default" : "outline"} 
                  className={selectedProduct.flagged ? "bg-red-600 hover:bg-red-700" : ""}
                  onClick={() => handleFlagProduct(selectedProduct.id, !selectedProduct.flagged)}
                >
                  {selectedProduct.flagged ? (
                    <>
                      <Check className="mr-2 h-4 w-4" />
                      Unflag Product
                    </>
                  ) : (
                    <>
                      <AlertTriangle className="mr-2 h-4 w-4" />
                      Flag Product
                    </>
                  )}
                </Button>
              )}
            </div>
            
            <Button variant="outline" onClick={() => setShowDetails(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
};

export default Products;
