import React, { useState, useEffect } from 'react';
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
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Badge } from '@/components/ui/badge';
import { useToast } from "@/hooks/use-toast";
import AdminLayout from '@/components/AdminLayout';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Loader2, Plus, Edit, Trash2 } from 'lucide-react';

interface SubscriptionPlan {
  id: string;
  plan_name: string;
  monthly_fee: number;
  yearly_fee: number;
  commission_rate: number;
  product_limit: number | null;
  status: string;
  created_at: string;
  updated_at: string;
}

const formSchema = z.object({
  plan_name: z.string().min(2, {
    message: "Plan name must be at least 2 characters.",
  }),
  monthly_fee: z.number().min(0, {
    message: "Monthly fee must be a positive number.",
  }),
  yearly_fee: z.number().min(0, {
    message: "Yearly fee must be a positive number.",
  }),
  commission_rate: z.number().min(0).max(100, {
    message: "Commission rate must be between 0 and 100.",
  }),
  product_limit: z.number().nullable(),
});

const SubscriptionManagement = () => {
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [editingPlan, setEditingPlan] = useState<SubscriptionPlan | null>(null);
  const [deletingPlanId, setDeletingPlanId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const { toast } = useToast();

  // Predefined subscription plans based on the screenshot
  const predefinedPlans: Omit<SubscriptionPlan, 'id' | 'created_at' | 'updated_at'>[] = [
    {
      plan_name: 'Community',
      monthly_fee: 0,
      yearly_fee: 0,
      commission_rate: 15,
      product_limit: null,
      status: 'active',
    },
    {
      plan_name: 'Starter',
      monthly_fee: 199,
      yearly_fee: 1999,
      commission_rate: 12,
      product_limit: null,
      status: 'active',
    },
    {
      plan_name: 'Growth',
      monthly_fee: 699,
      yearly_fee: 6999,
      commission_rate: 8,
      product_limit: null,
      status: 'active',
    },
    {
      plan_name: 'Premium',
      monthly_fee: 1499,
      yearly_fee: 14999,
      commission_rate: 5,
      product_limit: null,
      status: 'active',
    },
  ];

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      plan_name: "",
      monthly_fee: 0,
      yearly_fee: 0,
      commission_rate: 0,
      product_limit: null,
    },
  });

  const fetchPlans = async () => {
    setLoading(true);
    try {
      // Fetch all plans from admin_subscriptions table
      const { data: allPlans, error } = await supabase
        .from('admin_subscriptions')
        .select('*')
        .order('monthly_fee', { ascending: true });
        
      if (error) {
        throw error;
      }
      
      setPlans(allPlans || []);
    } catch (error) {
      console.error('Error fetching subscription plans:', error);
      toast({
        title: "Error",
        description: "Failed to load subscription plans.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPlans();
  }, []);

  const handleCreatePlan = async (values: z.infer<typeof formSchema>) => {
    setSubmitting(true);
    try {
      const { error } = await supabase
        .from('admin_subscriptions')
        .insert([
          {
            plan_name: values.plan_name,
            monthly_fee: values.monthly_fee,
            yearly_fee: values.yearly_fee,
            commission_rate: values.commission_rate,
            product_limit: values.product_limit,
            status: 'active',
          }
        ]);
        
      if (error) {
        throw error;
      }
      
      fetchPlans();
      setShowDialog(false);
      form.reset();
      toast({
        title: "Success",
        description: "Subscription plan created successfully.",
      });
    } catch (error) {
      console.error('Error creating subscription plan:', error);
      toast({
        title: "Error",
        description: "Failed to create subscription plan.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdatePlan = async (values: z.infer<typeof formSchema>) => {
    if (!editingPlan) return;
    
    setSubmitting(true);
    try {
      const { error } = await supabase
        .from('admin_subscriptions')
        .update({
          plan_name: values.plan_name,
          monthly_fee: values.monthly_fee,
          yearly_fee: values.yearly_fee,
          commission_rate: values.commission_rate,
          product_limit: values.product_limit,
        })
        .eq('id', editingPlan.id);
        
      if (error) {
        throw error;
      }
      
      fetchPlans();
      setEditingPlan(null);
      setShowDialog(false);
      form.reset();
      toast({
        title: "Success",
        description: "Subscription plan updated successfully.",
      });
    } catch (error) {
      console.error('Error updating subscription plan:', error);
      toast({
        title: "Error",
        description: "Failed to update subscription plan.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeletePlan = async () => {
    if (!deletingPlanId) return;
    
    setDeleting(true);
    try {
      const { error } = await supabase
        .from('admin_subscriptions')
        .delete()
        .eq('id', deletingPlanId);
        
      if (error) {
        throw error;
      }
      
      fetchPlans();
      setDeletingPlanId(null);
      toast({
        title: "Success",
        description: "Subscription plan deleted successfully.",
      });
    } catch (error) {
      console.error('Error deleting subscription plan:', error);
      toast({
        title: "Error",
        description: "Failed to delete subscription plan.",
        variant: "destructive",
      });
    } finally {
      setDeleting(false);
    }
  };

  const openCreateDialog = () => {
    setEditingPlan(null);
    form.reset();
    setShowDialog(true);
  };

  const openEditDialog = (plan: SubscriptionPlan) => {
    setEditingPlan(plan);
    form.setValue('plan_name', plan.plan_name);
    form.setValue('monthly_fee', plan.monthly_fee);
    form.setValue('yearly_fee', plan.yearly_fee);
    form.setValue('commission_rate', plan.commission_rate);
    form.setValue('product_limit', plan.product_limit);
    setShowDialog(true);
  };

  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), 'MMM d, yyyy');
    } catch (error) {
      return 'Invalid date';
    }
  };

  return (
    <AdminLayout title="Subscription Management">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Subscription Plans</h1>
            <p className="text-muted-foreground mt-1">
              Manage vendor subscription plans and pricing
            </p>
          </div>
          <Button onClick={openCreateDialog} className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Create Plan
          </Button>
        </div>

        {/* Plans Table */}
        <Card>
          <CardHeader>
            <CardTitle>Available Plans</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center p-8">
                <div className="flex flex-col items-center">
                  <Loader2 className="animate-spin h-12 w-12 mb-4 text-primary" />
                  <p className="text-muted-foreground">Loading subscription plans...</p>
                </div>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Plan Name</TableHead>
                    <TableHead>Price</TableHead>
                    <TableHead>Commission Rate</TableHead>
                    <TableHead>Product Limit</TableHead>
                    <TableHead>Created At</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {plans.map((plan) => (
                    <TableRow key={plan.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{plan.plan_name}</span>
                          {plan.plan_name === 'Community' && (
                            <Badge variant="secondary" className="text-xs">Free</Badge>
                          )}
                          {plan.plan_name === 'Growth' && (
                            <Badge variant="default" className="text-xs">Most Popular</Badge>
                          )}
                          {plan.plan_name === 'Premium' && (
                            <Badge variant="outline" className="text-xs">Exporter</Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <div className="font-medium">₹{plan.monthly_fee}/month</div>
                          {plan.yearly_fee > 0 && (
                            <div className="text-sm text-muted-foreground">₹{plan.yearly_fee}/year</div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{plan.commission_rate}% per order</Badge>
                      </TableCell>
                      <TableCell>
                        {plan.product_limit === null ? (
                          <span className="text-muted-foreground">Unlimited</span>
                        ) : (
                          plan.product_limit
                        )}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {formatDate(plan.created_at)}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => openEditDialog(plan)}
                            className="flex items-center gap-1"
                          >
                            <Edit className="h-3 w-3" />
                            Edit
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => setDeletingPlanId(plan.id)}
                            className="flex items-center gap-1 text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-3 w-3" />
                            Delete
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Create/Edit Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingPlan ? 'Edit Subscription Plan' : 'Create Subscription Plan'}
            </DialogTitle>
            <DialogDescription>
              {editingPlan 
                ? 'Update the subscription plan details below.' 
                : 'Create a new subscription plan for vendors.'
              }
            </DialogDescription>
          </DialogHeader>
          
          <Form {...form}>
            <form onSubmit={form.handleSubmit(editingPlan ? handleUpdatePlan : handleCreatePlan)} className="space-y-4">
              <FormField
                control={form.control}
                name="plan_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Plan Name</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Premium" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="monthly_fee"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Monthly Fee (₹)</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          placeholder="0" 
                          {...field} 
                          onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="yearly_fee"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Yearly Fee (₹)</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          placeholder="0" 
                          {...field} 
                          onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <FormField
                control={form.control}
                name="commission_rate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Commission Rate (%)</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        placeholder="5" 
                        {...field} 
                        onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="product_limit"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Product Limit (leave blank for unlimited)</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        placeholder="Unlimited" 
                        {...field} 
                        value={field.value !== null ? field.value : ''}
                        onChange={(e) => {
                          const value = e.target.value !== '' ? parseInt(e.target.value, 10) : null;
                          field.onChange(value);
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <DialogFooter className="gap-2">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => {
                    setShowDialog(false);
                    setEditingPlan(null);
                    form.reset();
                  }}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={submitting}>
                  {submitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      {editingPlan ? 'Updating...' : 'Creating...'}
                    </>
                  ) : (
                    editingPlan ? 'Update Plan' : 'Create Plan'
                  )}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deletingPlanId !== null} onOpenChange={(open) => {
        if (!open) setDeletingPlanId(null);
      }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete Subscription Plan</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this subscription plan? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button 
              type="button" 
              variant="outline" 
              disabled={deleting} 
              onClick={() => setDeletingPlanId(null)}
            >
              Cancel
            </Button>
            <Button 
              type="button" 
              variant="destructive" 
              disabled={deleting} 
              onClick={handleDeletePlan}
            >
              {deleting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                'Delete Plan'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
};

export default SubscriptionManagement;