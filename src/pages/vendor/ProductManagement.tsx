import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  Package, 
  Search, 
  Filter, 
  ChevronDown, 
  MoreVertical, 
  PlusCircle,
  PackagePlus,
  Check,
  X,
  ArrowUpDown,
  Clock,
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Product } from '@/types/products';

import DashboardLayout from '@/components/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { categories } from '@/types/products';

const ProductManagement = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [products, setProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [sortOption, setSortOption] = useState('newest');
  const [stockFilter, setStockFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [productToDelete, setProductToDelete] = useState<string | null>(null);
  const [openEditStockDialog, setOpenEditStockDialog] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [newStockValue, setNewStockValue] = useState(0);
  const [demoProductStats, setDemoProductStats] = useState<Record<string, { views: number, sales: number }>>({});

  // Fetch products when component mounts
  useEffect(() => {
    const fetchProducts = async () => {
      if (!user) return;

      try {
        setLoading(true);
        const { data, error } = await supabase
          .from('products')
          .select('*')
          .eq('vendor_id', user.id);

        if (error) throw error;

        // Generate demo stats for products since orders table is removed
        const statsMap: Record<string, { views: number, sales: number }> = {};
        data.forEach(product => {
          statsMap[product.id] = {
            views: Math.floor(Math.random() * 200) + 20,  // 20-220 views
            sales: Math.floor(Math.random() * 20)        // 0-20 sales
          };
        });
        setDemoProductStats(statsMap);
        
        setProducts(data || []);
        setFilteredProducts(data || []);
      } catch (error) {
        console.error('Error fetching products:', error);
        toast.error('Failed to load products');
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();

    // Set up real-time listener for product changes
    const productsChannel = supabase
      .channel('vendor:products')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'products' },
        () => {
          // Refresh products when any changes occur
          fetchProducts();
        }
      )
      .subscribe();

    // Clean up the subscription when component unmounts
    return () => {
      supabase.removeChannel(productsChannel);
    };
  }, [user]);

  // Filter and sort products when filter/search/sort options change
  useEffect(() => {
    let result = [...products];

    // Apply search filter
    if (searchTerm) {
      result = result.filter(product =>
        product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (product.description && product.description.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }

    // Apply category filter
    if (categoryFilter !== 'All') {
      result = result.filter(product => product.category === categoryFilter);
    }

    // Apply stock filter
    if (stockFilter === 'in-stock') {
      result = result.filter(product => product.stock > 0);
    } else if (stockFilter === 'low-stock') {
      result = result.filter(product => product.stock > 0 && product.stock <= 5);
    } else if (stockFilter === 'out-of-stock') {
      result = result.filter(product => product.stock === 0);
    }

    // Apply sorting
    result.sort((a, b) => {
      switch (sortOption) {
        case 'newest':
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        case 'oldest':
          return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        case 'price-high':
          return b.price - a.price;
        case 'price-low':
          return a.price - b.price;
        case 'name-asc':
          return a.name.localeCompare(b.name);
        case 'name-desc':
          return b.name.localeCompare(a.name);
        default:
          return 0;
      }
    });

    setFilteredProducts(result);
  }, [products, searchTerm, categoryFilter, sortOption, stockFilter]);

  // Handle product deletion
  const handleDeleteProduct = async () => {
    if (!productToDelete) return;

    try {
      const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', productToDelete);

      if (error) throw error;

      setProducts(products.filter(p => p.id !== productToDelete));
      toast.success('Product deleted successfully');
    } catch (error) {
      console.error('Error deleting product:', error);
      toast.error('Failed to delete product');
    } finally {
      setProductToDelete(null);
    }
  };

  // Handle stock update
  const handleUpdateStock = async () => {
    if (!selectedProduct) return;

    try {
      const { error } = await supabase
        .from('products')
        .update({ stock: newStockValue })
        .eq('id', selectedProduct.id);

      if (error) throw error;

      // Update local state
      setProducts(products.map(p =>
        p.id === selectedProduct.id ? { ...p, stock: newStockValue } : p
      ));

      toast.success('Stock updated successfully');
      setOpenEditStockDialog(false);
    } catch (error) {
      console.error('Error updating stock:', error);
      toast.error('Failed to update stock');
    }
  };

  // Function to open edit stock dialog
  const openStockDialog = (product: Product) => {
    setSelectedProduct(product);
    setNewStockValue(product.stock);
    setOpenEditStockDialog(true);
  };

  // Format date for display
  const formatDate = (dateString: string) => {
    const options: Intl.DateTimeFormatOptions = { day: '2-digit', month: 'short', year: 'numeric' };
    return new Date(dateString).toLocaleDateString('en-IN', options);
  };

  return (
    <DashboardLayout title="Product Management">
      <div className="space-y-6">
        {/* Actions Bar */}
        <div className="flex flex-col sm:flex-row justify-between gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Search products..."
              className="pl-10"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectLabel>Categories</SelectLabel>
                  <SelectItem value="All">All Categories</SelectItem>
                  {categories.slice(1).map((category) => (
                    <SelectItem key={category} value={category}>
                      {category}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
            
            <Select value={stockFilter} onValueChange={setStockFilter}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Stock Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectLabel>Stock Status</SelectLabel>
                  <SelectItem value="all">All Stock</SelectItem>
                  <SelectItem value="in-stock">In Stock</SelectItem>
                  <SelectItem value="low-stock">Low Stock</SelectItem>
                  <SelectItem value="out-of-stock">Out of Stock</SelectItem>
                </SelectGroup>
              </SelectContent>
            </Select>
            
            <Button onClick={() => navigate('/vendor/product/upload')}>
              <PlusCircle className="mr-2 h-4 w-4" />
              Add Product
            </Button>
          </div>
        </div>

        {/* Product Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="p-4">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Products</CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <span className="text-2xl font-bold">{products.length}</span>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="p-4">
              <CardTitle className="text-sm font-medium text-muted-foreground">In Stock</CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <span className="text-2xl font-bold">
                {products.filter(p => p.stock > 0).length}
              </span>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="p-4">
              <CardTitle className="text-sm font-medium text-muted-foreground">Low Stock</CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <span className="text-2xl font-bold">
                {products.filter(p => p.stock > 0 && p.stock <= 5).length}
              </span>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="p-4">
              <CardTitle className="text-sm font-medium text-muted-foreground">Out of Stock</CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <span className="text-2xl font-bold">
                {products.filter(p => p.stock === 0).length}
              </span>
            </CardContent>
          </Card>
        </div>

        {/* Products Table */}
        <Card>
          <CardContent className="p-0">
            <div className="px-6 py-4 flex items-center justify-between border-b">
              <h3 className="text-lg font-medium">Your Products</h3>
              <div className="flex items-center gap-4">
                <span className="text-sm text-muted-foreground">
                  Sort by:
                </span>
                <Select value={sortOption} onValueChange={setSortOption}>
                  <SelectTrigger className="w-[180px] h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectLabel>Sort Options</SelectLabel>
                      <SelectItem value="newest">Newest First</SelectItem>
                      <SelectItem value="oldest">Oldest First</SelectItem>
                      <SelectItem value="price-high">Price High to Low</SelectItem>
                      <SelectItem value="price-low">Price Low to High</SelectItem>
                      <SelectItem value="name-asc">Name A-Z</SelectItem>
                      <SelectItem value="name-desc">Name Z-A</SelectItem>
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[300px]">Product</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Price</TableHead>
                    <TableHead>Stock</TableHead>
                    <TableHead className="hidden md:table-cell">Added</TableHead>
                     <TableHead className="hidden lg:table-cell">
                       <div className="flex items-center gap-1">
                         <span>Stats</span>
                         <ArrowUpDown className="h-3 w-3" />
                       </div>
                     </TableHead>
                     <TableHead>GI Status</TableHead>
                     <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                       <TableCell colSpan={8} className="text-center py-10">
                        Loading products...
                      </TableCell>
                    </TableRow>
                  ) : filteredProducts.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-10">
                        {searchTerm || categoryFilter !== 'All' || stockFilter !== 'all'
                          ? "No products match your search criteria"
                          : "You haven't added any products yet"}
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
                              <Link
                                to={`/product/${product.id}`}
                                className="font-medium hover:text-primary transition-colors"
                              >
                                {product.name}
                              </Link>
                              {product.description && (
                                <p className="text-xs text-muted-foreground line-clamp-1 max-w-[300px]">
                                  {product.description}
                                </p>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm">{product.category || "Uncategorized"}</span>
                        </TableCell>
                        <TableCell>
                          <span className="font-medium">₹{product.price.toLocaleString('en-IN')}</span>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center">
                            {product.stock === 0 ? (
                              <Badge variant="destructive">Out of Stock</Badge>
                            ) : product.stock <= 5 ? (
                              <Badge variant="outline" className="text-amber-600 border-amber-600 bg-amber-50">
                                Low: {product.stock}
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="text-emerald-600 border-emerald-600 bg-emerald-50">
                                In Stock: {product.stock}
                              </Badge>
                            )}
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 ml-1"
                              onClick={() => openStockDialog(product)}
                            >
                              <PackagePlus className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          <span className="text-sm text-muted-foreground">
                            {formatDate(product.created_at)}
                          </span>
                        </TableCell>
                         <TableCell className="hidden lg:table-cell">
                           <div className="flex flex-col text-sm">
                             <div className="flex items-center gap-1">
                               <span className="text-muted-foreground">Views:</span> 
                               <span>{demoProductStats[product.id]?.views || 0}</span>
                             </div>
                             <div className="flex items-center gap-1">
                               <span className="text-muted-foreground">Sales:</span> 
                               <span>{demoProductStats[product.id]?.sales || 0}</span>
                             </div>
                           </div>
                         </TableCell>
                         <TableCell>
                           <Badge 
                             variant={
                               product.gi_status === 'approved' ? "default" : 
                               product.gi_status === 'rejected' ? "destructive" : 
                               "secondary"
                             }
                           >
                             {product.gi_status === 'approved' ? "Approved" :
                              product.gi_status === 'rejected' ? "Rejected" :
                              "Pending"}
                           </Badge>
                         </TableCell>
                         <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-40">
                              <DropdownMenuLabel>Actions</DropdownMenuLabel>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={() => navigate(`/product/${product.id}`)}>
                                View Product
                              </DropdownMenuItem>
                              <DropdownMenuItem>Edit Product</DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                className="text-destructive"
                                onClick={() => setProductToDelete(product.id)}
                              >
                                Delete Product
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

      {/* Edit Stock Dialog */}
      <Dialog open={openEditStockDialog} onOpenChange={setOpenEditStockDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update Stock</DialogTitle>
            <DialogDescription>
              Update the inventory level for {selectedProduct?.name}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="space-y-4">
              <div>
                <Label htmlFor="current-stock">Current Stock</Label>
                <div className="mt-1 p-2 bg-muted rounded-md text-muted-foreground">
                  {selectedProduct?.stock || 0} units
                </div>
              </div>
              <div>
                <Label htmlFor="new-stock">New Stock Level</Label>
                <Input
                  id="new-stock"
                  type="number"
                  min="0"
                  value={newStockValue}
                  onChange={(e) => setNewStockValue(parseInt(e.target.value) || 0)}
                  className="mt-1"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenEditStockDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdateStock}>Update Stock</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!productToDelete} onOpenChange={(open) => !open && setProductToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure you want to delete this product?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. The product will be permanently deleted from your inventory.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleDeleteProduct}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
};

export default ProductManagement;
