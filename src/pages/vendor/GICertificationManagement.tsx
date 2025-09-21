
import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ShieldCheck, Clock, XCircle, FileText } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import VendorLayout from '@/components/DashboardLayout';
import { GoBackButton } from '@/components/ui/go-back-button';

interface GICertification {
  id: string;
  productName: string;
  productImage: string;
  region: string;
  status: 'pending' | 'approved' | 'rejected';
  submittedDate: string;
  verificationDate: string | null;
  rejectionReason: string | null;
}

const GICertificationManagement = () => {
  const { user } = useAuth();
  const [certifications, setCertifications] = useState<GICertification[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    if (user) {
      fetchGICertifications();
    }
  }, [user]);

  const fetchGICertifications = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        toast.error('Please log in to view certifications');
        return;
      }

      // Fetch vendor's products with their GI status and certification info
      const { data: products, error: productsError } = await supabase
        .from('products')
        .select(`
          id,
          name,
          images,
          region,
          gi_status,
          is_gi_approved,
          created_at,
          gi_certifications (
            id,
            is_verified,
            verification_date,
            rejection_reason,
            created_at
          )
        `)
        .eq('vendor_id', user.id)
        .eq('is_gi_approved', true) // Only products that requested GI certification
        .order('created_at', { ascending: false });

      if (productsError) {
        console.error('Error fetching products:', productsError);
        toast.error('Failed to load data');
        return;
      }

      // Transform products into certification format
      const certifications: GICertification[] = (products || []).map(product => ({
        id: product.id,
        productName: product.name,
        productImage: product.images?.[0] || '',
        region: product.region || '',
        status: product.gi_status as 'pending' | 'approved' | 'rejected',
        submittedDate: product.created_at,
        verificationDate: product.gi_certifications?.[0]?.verification_date || null,
        rejectionReason: product.gi_certifications?.[0]?.rejection_reason || null
      }));

      setCertifications(certifications);
    } catch (error) {
      console.error('Error in fetchGICertifications:', error);
      toast.error('An error occurred while loading data');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: 'pending' | 'approved' | 'rejected') => {
    switch (status) {
      case 'approved':
        return (
          <Badge className="bg-green-100 text-green-800 hover:bg-green-200">
            <ShieldCheck className="h-3 w-3 mr-1" />
            Approved
          </Badge>
        );
      case 'rejected':
        return (
          <Badge variant="destructive" className="bg-red-100 text-red-800 hover:bg-red-200">
            <XCircle className="h-3 w-3 mr-1" />
            Rejected
          </Badge>
        );
      case 'pending':
      default:
        return (
          <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-200">
            <Clock className="h-3 w-3 mr-1" />
            Pending
          </Badge>
        );
    }
  };

  const filteredCertifications = certifications.filter(cert => {
    if (filter === 'all') return true;
    if (filter === 'approved') return cert.status === 'approved';
    if (filter === 'pending') return cert.status === 'pending';
    if (filter === 'rejected') return cert.status === 'rejected';
    return true;
  });

  const stats = {
    total: certifications.length,
    approved: certifications.filter(c => c.status === 'approved').length,
    pending: certifications.filter(c => c.status === 'pending').length,
    rejected: certifications.filter(c => c.status === 'rejected').length
  };

  if (loading) {
    return (
      <VendorLayout title="GI Certification Management">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading certifications...</p>
          </div>
        </div>
      </VendorLayout>
    );
  }

  return (
    <VendorLayout title="GI Certification Management">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <GoBackButton />
          <h1 className="text-2xl font-bold">GI Certification Management</h1>
          <div></div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Applications
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Approved
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{stats.approved}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Pending
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">{stats.pending}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Rejected
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{stats.rejected}</div>
            </CardContent>
          </Card>
        </div>

        {/* Certifications Table */}
        <Card>
          <CardHeader>
            <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
              <CardTitle>GI Certification Applications</CardTitle>
              <Select value={filter} onValueChange={setFilter}>
                <SelectTrigger className="w-full md:w-48">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Applications</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent>
            {filteredCertifications.length === 0 ? (
              <div className="text-center py-8">
                <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">No certifications found</h3>
                <p className="text-muted-foreground">
                  {filter === 'all' 
                    ? "You haven't submitted any GI certification applications yet." 
                    : `No certifications with status "${filter}".`
                  }
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Product</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Region</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Applied Date</TableHead>
                      <TableHead>Verified Date</TableHead>
                      <TableHead>Rejection Reason</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredCertifications.map((certification) => (
                      <TableRow key={certification.id}>
                        <TableCell>
                          <div className="flex items-center space-x-3">
                            <div className="flex-shrink-0">
                              <img
                                src={certification.productImage || "https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=400&h=400&fit=crop"}
                                alt={certification.productName}
                                className="h-10 w-10 rounded-lg object-cover border border-border"
                                onError={(e) => {
                                  const target = e.currentTarget;
                                  target.src = "https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=400&h=400&fit=crop";
                                }}
                              />
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-medium text-foreground truncate">
                                {certification.productName}
                              </p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>-</TableCell>
                        <TableCell>{certification.region}</TableCell>
                        <TableCell>{getStatusBadge(certification.status)}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {new Date(certification.submittedDate).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {certification.verificationDate 
                            ? new Date(certification.verificationDate).toLocaleDateString()
                            : '-'
                          }
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {certification.rejectionReason || '-'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </VendorLayout>
  );
};

export default GICertificationManagement;
