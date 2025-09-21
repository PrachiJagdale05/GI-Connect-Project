
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { usePaymentMethods } from '@/hooks/useSupabase';
import DashboardLayout from '@/components/DashboardLayout';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { toast } from '@/hooks/use-toast';
import { CreditCard, Plus, Building, Wallet, CheckCircle, AlertTriangle } from 'lucide-react';

const PaymentMethods = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated, loading } = useAuth();
  const { paymentMethods, loading: loadingPaymentMethods, error } = usePaymentMethods();
  const [open, setOpen] = useState(false);
  const [newMethodType, setNewMethodType] = useState<'card' | 'upi' | 'cod'>('card');
  const [cardNumber, setCardNumber] = useState('');
  const [expiry, setExpiry] = useState('');
  const [cardName, setCardName] = useState('');
  const [upiId, setUpiId] = useState('');

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      navigate('/login');
    }
  }, [isAuthenticated, loading, navigate]);

  if (loading || loadingPaymentMethods) {
    return <div className="flex justify-center items-center h-screen">Loading...</div>;
  }

  const handleAddPaymentMethod = async () => {
    // Basic validation
    if (newMethodType === 'card' && (!cardNumber || !expiry || !cardName)) {
      toast({
        title: "Error",
        description: "Please fill in all card details.",
        variant: "destructive",
      });
      return;
    }

    if (newMethodType === 'upi' && !upiId) {
      toast({
        title: "Error",
        description: "Please enter UPI ID.",
        variant: "destructive",
      });
      return;
    }

    // Payment method details
    let details = {};
    if (newMethodType === 'card') {
      details = {
        card_number: cardNumber,
        expiry: expiry,
        name: cardName,
        brand: 'Visa', // You might want to detect the card brand
      };
    } else if (newMethodType === 'upi') {
      details = {
        upi_id: upiId,
      };
    }

    // Optimistic update
    toast({
      title: "Success",
      description: "Payment method added successfully.",
    });
    setOpen(false);
  };

  return (
    <DashboardLayout title="Payment Methods">
      <div className="mb-6">
        <h2 className="text-2xl font-semibold mb-2">Payment Methods</h2>
        <p className="text-gray-600">Manage your saved payment methods here.</p>
      </div>

      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="mb-4">
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button variant="outline">
              <Plus className="mr-2 h-4 w-4" /> Add Payment Method
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Add Payment Method</DialogTitle>
              <DialogDescription>
                Choose a payment method to add to your account.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="method-type" className="text-right">
                  Method Type
                </Label>
                <select
                  id="method-type"
                  className="col-span-3 rounded-md border border-gray-200 px-2 py-1"
                  value={newMethodType}
                  onChange={(e) => setNewMethodType(e.target.value as 'card' | 'upi' | 'cod')}
                >
                  <option value="card">Credit Card</option>
                  <option value="upi">UPI</option>
                </select>
              </div>
              {newMethodType === 'card' && (
                <>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="card-number" className="text-right">
                      Card Number
                    </Label>
                    <Input
                      type="text"
                      id="card-number"
                      value={cardNumber}
                      onChange={(e) => setCardNumber(e.target.value)}
                      className="col-span-3"
                    />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="expiry" className="text-right">
                      Expiry
                    </Label>
                    <Input
                      type="text"
                      id="expiry"
                      value={expiry}
                      onChange={(e) => setExpiry(e.target.value)}
                      className="col-span-3"
                      placeholder="MM/YY"
                    />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="card-name" className="text-right">
                      Name on Card
                    </Label>
                    <Input
                      type="text"
                      id="card-name"
                      value={cardName}
                      onChange={(e) => setCardName(e.target.value)}
                      className="col-span-3"
                    />
                  </div>
                </>
              )}
              {newMethodType === 'upi' && (
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="upi-id" className="text-right">
                    UPI ID
                  </Label>
                  <Input
                    type="text"
                    id="upi-id"
                    value={upiId}
                    onChange={(e) => setUpiId(e.target.value)}
                    className="col-span-3"
                  />
                </div>
              )}
            </div>
            <div className="flex justify-end">
              <Button variant="default" onClick={handleAddPaymentMethod}>
                Add Method
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {paymentMethods.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center p-6 text-center">
            <AlertTriangle className="h-10 w-10 text-gray-400 mb-4" />
            <h3 className="text-xl font-medium mb-2">No Payment Methods Yet</h3>
            <p className="text-gray-500 mb-4">
              You haven't added any payment methods yet.
            </p>
          </CardContent>
        </Card>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Method</TableHead>
              <TableHead>Details</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paymentMethods.map((method) => (
              <TableRow key={method.id}>
                <TableCell>
                  {method.method_type === 'card' && (
                    <div className="flex items-center gap-2">
                      <CreditCard className="h-4 w-4" />
                      Credit Card
                    </div>
                  )}
                  {method.method_type === 'upi' && (
                    <div className="flex items-center gap-2">
                      <Building className="h-4 w-4" />
                      UPI
                    </div>
                  )}
                  {method.method_type === 'cod' && (
                    <div className="flex items-center gap-2">
                      <Wallet className="h-4 w-4" />
                      Cash on Delivery
                    </div>
                  )}
                </TableCell>
                <TableCell>
                  {method.method_type === 'card' && (
                    <div>
                      <p className="text-sm font-medium">Card Number: **** **** **** {method.card_number.slice(-4)}</p>
                      <p className="text-sm text-gray-500">Expiry: {method.expiry}</p>
                    </div>
                  )}
                  {method.method_type === 'upi' && (
                    <div>
                      <p className="text-sm font-medium">UPI ID: {method.details?.upi_id}</p>
                    </div>
                  )}
                </TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="sm">
                    Remove
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </DashboardLayout>
  );
};

export default PaymentMethods;
