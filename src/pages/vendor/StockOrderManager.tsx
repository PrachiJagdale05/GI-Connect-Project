import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
  Package,
  Search,
  Save,
  ChevronDown,
  AlertTriangle,
  Check,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Badge } from '@/components/ui/badge';
import DashboardLayout from '@/components/DashboardLayout';
import { Product } from '@/types/products';

interface ProductWithUpdatedStock extends Product {
  newStock?: number;
  hasChanged?: boolean;
}

// Demo order data since orders table was removed
const demoOrders = [
  {
    id: '1',
    product_id: 'demo-product-1',
    status: 'delivered',
    quantity: 2,
    created_at: '2023-10-14T10:00:00Z',
    product: {
      name: 'Demo Product 1'
    }
  },
  {
    id: '2',
    product_id: 'demo-product-2',
    status: 'shipped',
    quantity: 1,
    created_at: '2023-10-13T09:30:00Z',
    product: {
      name: 'Demo Product 2'
    }
  },
  {
    id: '3',
    product_id: 'demo-product-3',
    status: 'processing',
    quantity: 3,
    created_at: '2023-10-12T15:20:00Z',
    product: {
      name: 'Demo Product 3'
    }
  }
];

const StockOrderManager = () => {
  const { user } = useAuth();
  const [products, setProducts] = useState<ProductWithUpdatedStock[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<ProductWithUpdatedStock[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [stockFilter, setStockFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [hasChanges, setHasChanges] = useState(false);
  const [recentOrders, setRecentOrders] = useState<any[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    
    const fetchProducts = async () => {
      try {
        setLoading(true);
        
        const { data, error } = await supabase
          .from('products')
          .select('*')
          .eq('vendor_id', user.id);
          
        if (error) throw error;
        
        // Initialize products with newStock equal to current stock
        const productsWithNewStock = (data || []).map(p => ({
          ...p,
          newStock: p.stock,
          hasChanged: false
        }));
        
        setProducts(productsWithNewStock);
        setFilteredProducts(productsWithNewStock);
      } catch (error) {
        console.error('Error fetching products:', error);
        toast.error('Failed to load products');
      } finally {
        setLoading(false);
      }
    };
    
    fetchProducts();
    
    // Load demo orders data since orders table was removed
    setRecentOrders(demoOrders);
    setOrdersLoading(false);
    
  }, [user]);
  
  useEffect(() => {
    // Check if any product has changes
    const hasAnyChanges = products.some(p => p.hasChanged);
    setHasChanges(hasAnyChanges);
  }, [products]);
  
  useEffect(() => {
    // Filter products based on search term and stock filter
    let filtered = [...products];
    
    if (searchTerm) {
      filtered = filtered.filter(p => 
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (p.description && p.description.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }
    
    switch (stockFilter) {
      case 'low':
        filtered = filtered.filter(p => p.stock > 0 && p.stock <= 5);
        break;
      case 'out':
        filtered = filtered.filter(p => p.stock === 0);
        break;
      case 'in':
        filtered = filtered.filter(p => p.stock > 5);
        break;
    }
    
    setFilteredProducts(filtered);
  }, [searchTerm, stockFilter, products]);
  
  const handleStockChange = (id: string, value: number) => {
    const updatedProducts = products.map(p => {
      if (p.id === id) {
        return {
          ...p,
          newStock: value,
          hasChanged: value !== p.stock,
        };
      }
      return p;
    });
    
    setProducts(updatedProducts);
  };
  
  const handleSaveChanges = async () => {
    const productsToUpdate = products.filter(p => p.hasChanged);
    
    if (productsToUpdate.length === 0) {
      toast.info('No changes to save');
      return;
    }
    
    try {
      for (const product of productsToUpdate) {
        const { error } = await supabase
          .from('products')
          .update({ stock: product.newStock })
          .eq('id', product.id);
          
        if (error) throw error;
      }
      
      // Update the state with the new stock values
      const updatedProducts = products.map(p => {
        if (p.hasChanged) {
          return {
            ...p,
            stock: p.newStock!,
            hasChanged: false
          };
        }
        return p;
      });
      
      setProducts(updatedProducts);
      toast.success(`Updated stock for ${productsToUpdate.length} product(s)`);
    } catch (error) {
      console.error('Error updating stock:', error);
      toast.error('Failed to update stock');
    }
  };
  
  const getStockLevelClass = (stock: number) => {
    if (stock === 0) return 'bg-red-100 text-red-800';
    if (stock <= 5) return 'bg-amber-100 text-amber-800';
    return 'bg-emerald-100 text-emerald-800';
  };
  
  const getStockLevelText = (stock: number) => {
    if (stock === 0) return 'Out of Stock';
    if (stock <= 5) return 'Low Stock';
    return 'In Stock';
  };

  return (
    <DashboardLayout title="Stock Manager">
      <div className="space-y-8">
        {/* Top Actions */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Search products..."
              className="pl-10"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          <div className="flex items-center gap-3">
            <Select value={stockFilter} onValueChange={setStockFilter}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Stock Level" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectItem value="all">All Stock</SelectItem>
                  <SelectItem value="out">Out of Stock</SelectItem>
                  <SelectItem value="low">Low Stock</SelectItem>
                  <SelectItem value="in">In Stock</SelectItem>
                </SelectGroup>
              </SelectContent>
            </Select>
            
            <Button 
              onClick={handleSaveChanges}
              disabled={!hasChanges}
            >
              <Save className="mr-2 h-4 w-4" />
              Save Changes
            </Button>
          </div>
        </div>
        
        {/* Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Stock Management Table */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle>Inventory Management</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[300px]">Product</TableHead>
                        <TableHead>Current Stock</TableHead>
                        <TableHead>New Stock</TableHead>
                        <TableHead>Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {loading ? (
                        <TableRow>
                          <TableCell colSpan={4} className="text-center py-10">
                            Loading products...
                          </TableCell>
                        </TableRow>
                      ) : filteredProducts.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={4} className="text-center py-10">
                            {searchTerm || stockFilter !== 'all'
                              ? "No products match your filter criteria"
                              : "You don't have any products yet"}
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredProducts.map(product => (
                          <TableRow key={product.id}>
                            <TableCell>
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded bg-slate-100 overflow-hidden flex-shrink-0">
                                  {product.images && product.images.length > 0 ? (
                                    <img
                                      src={product.images[0]}
                                      alt={product.name}
                                      className="w-full h-full object-cover"
                                      onError={(e) => {
                                        (e.target as HTMLImageElement).src = "https://via.placeholder.com/40";
                                      }}
                                    />
                                  ) : (
                                    <div className="w-full h-full flex items-center justify-center">
                                      <Package className="h-5 w-5 text-muted-foreground" />
                                    </div>
                                  )}
                                </div>
                                <div>
                                  <div className="font-medium">{product.name}</div>
                                  {product.description && (
                                    <p className="text-xs text-muted-foreground line-clamp-1 max-w-[250px]">
                                      {product.description}
                                    </p>
                                  )}
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant="outline"
                                className={getStockLevelClass(product.stock)}
                              >
                                {product.stock} units
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center space-x-2">
                                <Input
                                  type="number"
                                  min="0"
                                  value={product.newStock}
                                  onChange={(e) => handleStockChange(product.id, parseInt(e.target.value) || 0)}
                                  className={`w-24 h-8 ${product.hasChanged ? 'border-primary' : ''}`}
                                />
                                {product.hasChanged && (
                                  <Badge variant="outline" className="bg-primary/10 text-primary">
                                    <Check className="mr-1 h-3 w-3" />
                                    Changed
                                  </Badge>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="sm">
                                    Actions <ChevronDown className="ml-2 h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-40">
                                  <DropdownMenuLabel>Quick Actions</DropdownMenuLabel>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem onClick={() => handleStockChange(product.id, product.stock + 10)}>
                                    Add +10
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => handleStockChange(product.id, product.stock + 50)}>
                                    Add +50
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => handleStockChange(product.id, product.stock + 100)}>
                                    Add +100
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem onClick={() => handleStockChange(product.id, 0)}>
                                    Set to 0
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </div>
          
          {/* Side Section */}
          <div className="space-y-6">
            {/* Stock Summary */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle>Stock Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Total Products</span>
                    <span className="font-medium">{products.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Out of Stock</span>
                    <span className="font-medium">{products.filter(p => p.stock === 0).length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Low Stock (1-5)</span>
                    <span className="font-medium">{products.filter(p => p.stock > 0 && p.stock <= 5).length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Healthy Stock ({`>`}5)</span>
                    <span className="font-medium">{products.filter(p => p.stock > 5).length}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            {/* Critical Stock Alerts */}
            <Card className={products.some(p => p.stock === 0) ? 'border-destructive' : ''}>
              <CardHeader className="pb-3">
                <CardTitle className={products.some(p => p.stock === 0) ? 'text-destructive flex items-center' : ''}>
                  {products.some(p => p.stock === 0) && <AlertTriangle className="mr-2 h-4 w-4" />}
                  Critical Stock Alerts
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {products
                    .filter(p => p.stock === 0)
                    .map(product => (
                      <div key={product.id} className="flex justify-between items-center p-3 border rounded-md bg-red-50">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded bg-slate-100 overflow-hidden">
                            {product.images && product.images.length > 0 ? (
                              <img
                                src={product.images[0]}
                                alt={product.name}
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  (e.target as HTMLImageElement).src = "https://via.placeholder.com/32";
                                }}
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <Package className="h-4 w-4 text-muted-foreground" />
                              </div>
                            )}
                          </div>
                          <span className="text-sm font-medium text-red-800">
                            {product.name}
                          </span>
                        </div>
                        <Badge variant="destructive">
                          Out of Stock
                        </Badge>
                      </div>
                    ))}
                    
                  {!products.some(p => p.stock === 0) && (
                    <div className="text-center py-6">
                      <Check className="h-10 w-10 text-emerald-500 mx-auto mb-2" />
                      <p className="text-sm text-muted-foreground">No critical stock alerts</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
            
            {/* Recent Orders */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle>Recent Orders</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {ordersLoading ? (
                    <p className="text-sm text-muted-foreground text-center">
                      Loading recent orders...
                    </p>
                  ) : recentOrders.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center">
                      No recent orders
                    </p>
                  ) : (
                    recentOrders.map(order => (
                      <div key={order.id} className="flex justify-between items-center py-2 border-b">
                        <div>
                          <p className="text-sm font-medium">{order.product.name}</p>
                          <p className="text-xs text-muted-foreground">
                            Qty: {order.quantity} - {new Date(order.created_at).toLocaleDateString()}
                          </p>
                        </div>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger>
                              <Badge variant={order.status === 'delivered' ? 'default' : 'outline'}>
                                {order.status}
                              </Badge>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Order ID: {order.id}</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default StockOrderManager;
