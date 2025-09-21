
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapPin, Plus, Edit, Trash2 } from 'lucide-react';
import { 
  Card, 
  CardContent
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { useUserAddresses } from '@/hooks/useSupabase';
import DashboardLayout from '@/components/DashboardLayout';
import { toast } from 'sonner';
import supabaseService from '@/services/supabaseService';
import { Address } from '@/services/supabaseService';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose
} from "@/components/ui/dialog";
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { useForm } from 'react-hook-form';

interface AddressFormData {
  name: string;
  address_line1: string;
  address_line2?: string;
  city: string;
  state: string;
  postal_code: string;
  country: string;
  is_default: boolean;
}

const SavedAddresses = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated, loading } = useAuth();
  const { addresses, loading: loadingAddresses, error, refetch } = useUserAddresses(user?.id);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingAddress, setEditingAddress] = useState<Address | null>(null);
  
  const { register, handleSubmit, setValue, reset, formState: { errors, isSubmitting } } = useForm<AddressFormData>();
  
  useEffect(() => {
    // If not authenticated or not a customer, redirect to login
    if (!loading && (!isAuthenticated || user?.role !== 'customer')) {
      navigate('/login');
    }
  }, [isAuthenticated, user, loading, navigate]);
  
  const handleAddAddress = async (data: AddressFormData) => {
    try {
      const { success, error } = await supabaseService.addresses.createAddress(data);
      
      if (success) {
        toast.success('Address added successfully');
        reset();
        setIsEditDialogOpen(false);
        refetch();
      } else {
        toast.error(error || 'Failed to add address');
      }
    } catch (err) {
      console.error('Error adding address:', err);
      toast.error('An error occurred while adding address');
    }
  };
  
  const handleUpdateAddress = async (data: AddressFormData) => {
    if (!editingAddress) return;
    
    try {
      const { success, error } = await supabaseService.addresses.updateAddress(editingAddress.id, data);
      
      if (success) {
        toast.success('Address updated successfully');
        setEditingAddress(null);
        setIsEditDialogOpen(false);
        refetch();
      } else {
        toast.error(error || 'Failed to update address');
      }
    } catch (err) {
      console.error('Error updating address:', err);
      toast.error('An error occurred while updating address');
    }
  };
  
  const handleDeleteAddress = async (addressId: string) => {
    try {
      setIsDeleting(addressId);
      const { success, error } = await supabaseService.addresses.deleteAddress(addressId);
      
      if (success) {
        toast.success('Address deleted successfully');
        refetch();
      } else {
        toast.error(error || 'Failed to delete address');
      }
    } catch (err) {
      console.error('Error deleting address:', err);
      toast.error('An error occurred while deleting address');
    } finally {
      setIsDeleting(null);
    }
  };
  
  const openAddressDialog = (address: Address | null = null) => {
    setEditingAddress(address);
    
    if (address) {
      // Fill form with address data
      setValue('name', address.name);
      setValue('address_line1', address.address_line1);
      setValue('address_line2', address.address_line2 || '');
      setValue('city', address.city);
      setValue('state', address.state);
      setValue('postal_code', address.postal_code);
      setValue('country', address.country);
      setValue('is_default', address.is_default);
    } else {
      // Reset form for new address
      reset({
        name: '',
        address_line1: '',
        address_line2: '',
        city: '',
        state: '',
        postal_code: '',
        country: 'India',
        is_default: false
      });
    }
    
    setIsEditDialogOpen(true);
  };
  
  if (loading || loadingAddresses || !isAuthenticated || user?.role !== 'customer') {
    return <div className="flex justify-center items-center h-screen">Loading...</div>;
  }
  
  return (
    <DashboardLayout title="Saved Addresses">
      <div className="mb-6 flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-semibold mb-2">My Addresses</h2>
          <p className="text-gray-600">Manage your delivery addresses</p>
        </div>
        <Button onClick={() => openAddressDialog()}>
          <Plus className="mr-2 h-4 w-4" />
          Add New Address
        </Button>
      </div>
      
      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      
      {addresses.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center p-6 text-center">
            <MapPin className="w-16 h-16 text-gray-300 mb-4" />
            <h3 className="text-xl font-medium mb-2">No Saved Addresses</h3>
            <p className="text-gray-500 mb-4">
              You haven't added any delivery addresses yet.
            </p>
            <Button onClick={() => openAddressDialog()}>
              <Plus className="mr-2 h-4 w-4" />
              Add New Address
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {addresses.map((address) => (
            <Card key={address.id} className={`${address.is_default ? 'border-primary' : ''}`}>
              <CardContent className="p-6">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-medium text-lg">{address.name}</h3>
                    {address.is_default && (
                      <span className="bg-primary/10 text-primary text-xs px-2 py-1 rounded-full">
                        Default
                      </span>
                    )}
                  </div>
                  <div className="flex space-x-2">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => openAddressDialog(address)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button 
                      variant="destructive" 
                      size="sm"
                      onClick={() => handleDeleteAddress(address.id)}
                      disabled={isDeleting === address.id}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                
                <div className="mt-4 text-gray-600">
                  <p>{address.address_line1}</p>
                  {address.address_line2 && <p>{address.address_line2}</p>}
                  <p>{address.city}, {address.state} {address.postal_code}</p>
                  <p>{address.country}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
      
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[550px]">
          <DialogHeader>
            <DialogTitle>
              {editingAddress ? 'Edit Address' : 'Add New Address'}
            </DialogTitle>
          </DialogHeader>
          
          <form onSubmit={handleSubmit(editingAddress ? handleUpdateAddress : handleAddAddress)}>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label className="text-right" htmlFor="name">
                  Address Name
                </Label>
                <Input
                  id="name"
                  className="col-span-3"
                  placeholder="Home, Office, etc."
                  {...register('name', { required: 'Address name is required' })}
                />
                {errors.name && (
                  <p className="text-destructive text-sm col-start-2 col-span-3">
                    {errors.name.message}
                  </p>
                )}
              </div>
              
              <div className="grid grid-cols-4 items-center gap-4">
                <Label className="text-right" htmlFor="address_line1">
                  Address Line 1
                </Label>
                <Input
                  id="address_line1"
                  className="col-span-3"
                  placeholder="Street address"
                  {...register('address_line1', { required: 'Address line 1 is required' })}
                />
                {errors.address_line1 && (
                  <p className="text-destructive text-sm col-start-2 col-span-3">
                    {errors.address_line1.message}
                  </p>
                )}
              </div>
              
              <div className="grid grid-cols-4 items-center gap-4">
                <Label className="text-right" htmlFor="address_line2">
                  Address Line 2
                </Label>
                <Input
                  id="address_line2"
                  className="col-span-3"
                  placeholder="Apartment, suite, etc. (optional)"
                  {...register('address_line2')}
                />
              </div>
              
              <div className="grid grid-cols-4 items-center gap-4">
                <Label className="text-right" htmlFor="city">
                  City
                </Label>
                <Input
                  id="city"
                  className="col-span-3"
                  {...register('city', { required: 'City is required' })}
                />
                {errors.city && (
                  <p className="text-destructive text-sm col-start-2 col-span-3">
                    {errors.city.message}
                  </p>
                )}
              </div>
              
              <div className="grid grid-cols-4 items-center gap-4">
                <Label className="text-right" htmlFor="state">
                  State
                </Label>
                <Input
                  id="state"
                  className="col-span-3"
                  {...register('state', { required: 'State is required' })}
                />
                {errors.state && (
                  <p className="text-destructive text-sm col-start-2 col-span-3">
                    {errors.state.message}
                  </p>
                )}
              </div>
              
              <div className="grid grid-cols-4 items-center gap-4">
                <Label className="text-right" htmlFor="postal_code">
                  Postal Code
                </Label>
                <Input
                  id="postal_code"
                  className="col-span-3"
                  {...register('postal_code', { required: 'Postal code is required' })}
                />
                {errors.postal_code && (
                  <p className="text-destructive text-sm col-start-2 col-span-3">
                    {errors.postal_code.message}
                  </p>
                )}
              </div>
              
              <div className="grid grid-cols-4 items-center gap-4">
                <Label className="text-right" htmlFor="country">
                  Country
                </Label>
                <Input
                  id="country"
                  className="col-span-3"
                  defaultValue="India"
                  {...register('country', { required: 'Country is required' })}
                />
                {errors.country && (
                  <p className="text-destructive text-sm col-start-2 col-span-3">
                    {errors.country.message}
                  </p>
                )}
              </div>
              
              <div className="grid grid-cols-4 items-center gap-4">
                <div className="col-start-2 col-span-3 flex items-center space-x-2">
                  <Checkbox 
                    id="is_default" 
                    {...register('is_default')}
                  />
                  <Label htmlFor="is_default">Set as default address</Label>
                </div>
              </div>
            </div>
            
            <DialogFooter>
              <DialogClose asChild>
                <Button type="button" variant="outline">
                  Cancel
                </Button>
              </DialogClose>
              <Button type="submit" disabled={isSubmitting}>
                {editingAddress ? 'Update Address' : 'Add Address'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
};

export default SavedAddresses;
