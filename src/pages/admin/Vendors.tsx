import { useState, useEffect } from 'react';
import { Eye, Check, X, Loader2 } from 'lucide-react';
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
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import AdminLayout from '@/components/AdminLayout';
import { supabase } from '@/integrations/supabase/client';

interface Vendor {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  avatar_url: string | null;
  created_at: string;
  is_active?: boolean;
  product_count?: number;
}

const Vendors = () => {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedVendor, setSelectedVendor] = useState<Vendor | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [isActive, setIsActive] = useState(true);

  const fetchVendors = async () => {
    try {
      setLoading(true);
      
      // Fetch vendors with product counts
      const { data, error } = await supabase
        .from('profiles')
        .select('id, name, email, phone, avatar_url, created_at')
        .eq('role', 'vendor')
        .order('created_at', { ascending: false });
        
      if (error) {
        throw error;
      }
      
      // Get product counts for each vendor
      const vendorsWithProductCounts = await Promise.all(
        data.map(async (vendor) => {
          const { count, error: countError } = await supabase
            .from('products')
            .select('id', { count: 'exact', head: true })
            .eq('vendor_id', vendor.id);
            
          return {
            ...vendor,
            is_active: true, // Default active state
            product_count: count || 0
          };
        })
      );
      
      setVendors(vendorsWithProductCounts);
    } catch (error) {
      console.error('Error fetching vendors:', error);
      toast.error('Failed to load vendors');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVendors();
    
    // Set up real-time listener for new vendors
    const profilesChannel = supabase
      .channel('vendors-changes')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'profiles',
        filter: `role=eq.vendor`
      }, (payload) => {
        // Refresh the vendors list when a new vendor is added
        fetchVendors();
      })
      .subscribe();
      
    // Set up real-time listener for product changes
    const productsChannel = supabase
      .channel('vendor-products-changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'products'
      }, (payload) => {
        // Refresh the vendors list when products change
        fetchVendors();
      })
      .subscribe();
    
    return () => {
      supabase.removeChannel(profilesChannel);
      supabase.removeChannel(productsChannel);
    };
  }, []);

  const handleViewDetails = (vendor: Vendor) => {
    setSelectedVendor(vendor);
    setIsActive(vendor.is_active || false);
    setShowDetails(true);
  };

  const handleStatusChange = async () => {
    if (!selectedVendor) return;
    
    try {
      // In a real app, you would update a vendor status field
      // Here we're just updating the local state for demonstration
      const updatedVendors = vendors.map(v => 
        v.id === selectedVendor.id ? { ...v, is_active: isActive } : v
      );
      
      setVendors(updatedVendors);
      toast.success(`Vendor status updated to ${isActive ? 'active' : 'inactive'}`);
      setShowDetails(false);
    } catch (error) {
      console.error('Error updating vendor status:', error);
      toast.error('Failed to update vendor status');
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  };

  return (
    <AdminLayout title="Vendor Management">
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex justify-center p-8">
            <div className="flex flex-col items-center">
              <Loader2 className="animate-spin rounded-full h-12 w-12 mb-4 text-primary" />
              <p className="text-muted-foreground">Loading vendors...</p>
            </div>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[250px]">Vendor</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Registered</TableHead>
                <TableHead>Products</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {vendors.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    No vendors found
                  </TableCell>
                </TableRow>
              ) : (
                vendors.map((vendor) => (
                  <TableRow key={vendor.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={vendor.avatar_url || ''} />
                          <AvatarFallback>{getInitials(vendor.name)}</AvatarFallback>
                        </Avatar>
                        <span>{vendor.name}</span>
                      </div>
                    </TableCell>
                    <TableCell>{vendor.email}</TableCell>
                    <TableCell>{vendor.phone || 'N/A'}</TableCell>
                    <TableCell>{formatDate(vendor.created_at)}</TableCell>
                    <TableCell>{vendor.product_count}</TableCell>
                    <TableCell>
                      <Badge variant={vendor.is_active ? "default" : "destructive"}>
                        {vendor.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" onClick={() => handleViewDetails(vendor)}>
                        <Eye className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        )}
      </div>

      <Dialog open={showDetails} onOpenChange={setShowDetails}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Vendor Details</DialogTitle>
            <DialogDescription>
              View and manage vendor information
            </DialogDescription>
          </DialogHeader>
          
          {selectedVendor && (
            <div className="space-y-4">
              <div className="flex flex-col items-center py-4">
                <Avatar className="h-20 w-20 mb-4">
                  <AvatarImage src={selectedVendor.avatar_url || ''} />
                  <AvatarFallback className="text-xl">{getInitials(selectedVendor.name)}</AvatarFallback>
                </Avatar>
                <h3 className="text-lg font-semibold">{selectedVendor.name}</h3>
                <p className="text-muted-foreground">{selectedVendor.email}</p>
              </div>
              
              <div className="grid gap-2">
                <Label>Account Status</Label>
                <div className="flex items-center justify-between">
                  <span>Vendor account is {isActive ? 'active' : 'inactive'}</span>
                  <Switch 
                    checked={isActive} 
                    onCheckedChange={setIsActive} 
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground text-sm">Registration Date</Label>
                  <p>{formatDate(selectedVendor.created_at)}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground text-sm">Products Listed</Label>
                  <p>{selectedVendor.product_count}</p>
                </div>
              </div>
            </div>
          )}
          
          <DialogFooter className="flex sm:justify-between">
            <Button variant="outline" onClick={() => setShowDetails(false)}>
              Cancel
            </Button>
            <Button onClick={handleStatusChange}>
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
};

export default Vendors;
