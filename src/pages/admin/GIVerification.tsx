import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Check, 
  X, 
  AlertTriangle, 
  FileText, 
  Eye, 
  CheckCircle,
  XCircle,
  Clock,
  Loader2,
  ExternalLink,
  ZoomIn,
  ZoomOut
} from 'lucide-react';
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import AdminLayout from '@/components/AdminLayout';
import { supabase } from '@/integrations/supabase/client';

interface VerificationRequest {
  id: string;
  productName: string;
  productDescription: string;
  productPrice: number;
  productImages: string[];
  productCategory: string;
  productRegion: string;
  productLocation: string;
  vendorName: string;
  vendorEmail: string;
  vendorCompany: string;
  submissionDate: string;
  document: string;
}

const GIVerification = () => {
  const navigate = useNavigate();
  const [requests, setRequests] = useState<VerificationRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState<VerificationRequest | null>(null);
  const [viewingCertificate, setViewingCertificate] = useState(false);
  const [viewingProduct, setViewingProduct] = useState(false);
  const [approvingProduct, setApprovingProduct] = useState(false);
  const [rejectingProduct, setRejectingProduct] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [processingAction, setProcessingAction] = useState(false);
  const [certificateScale, setCertificateScale] = useState(1);
  
  // Fetch verification requests
  useEffect(() => {
    fetchVerificationRequests();

    // Set up real-time listener for product changes
    const productsChannel = supabase
      .channel('public:products')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'products' },
        () => {
          // Refresh verification requests when any products change
          fetchVerificationRequests();
        }
      )
      .subscribe();

    // Clean up the subscription when component unmounts
    return () => {
      supabase.removeChannel(productsChannel);
    };
  }, []);
  
  const fetchVerificationRequests = async () => {
    try {
      setLoading(true);
      
      // Fetch products with pending GI status along with vendor details
      const { data: productsData, error: productsError } = await supabase
        .from('products')
        .select(`
          id, name, description, price, images, category, region, 
          location, gi_status, gi_certificate_url, vendor_id, created_at,
          profiles!vendor_id (name, email, company)
        `)
        .eq('gi_status', 'pending')
        .order('created_at', { ascending: false });

      if (productsError) {
        console.error('Error fetching products:', productsError);
        toast.error(`Failed to load data: ${productsError.message}`);
        return;
      }

      // Combine the data
      const requests: VerificationRequest[] = productsData?.map(product => {
        const vendor = Array.isArray(product.profiles) ? product.profiles[0] : product.profiles;
        
        return {
          id: product.id,
          productName: product.name,
          productDescription: product.description,
          productPrice: product.price,
          productImages: product.images || [],
          productCategory: product.category,
          productRegion: product.region,
          productLocation: product.location,
          vendorName: vendor?.name || 'Unknown',
          vendorEmail: vendor?.email || '',
          vendorCompany: vendor?.company || '',
          submissionDate: product.created_at,
          document: product.gi_certificate_url || ''
        };
      }) || [];

      setRequests(requests);
    } catch (error) {
      console.error('Error in fetchVerificationRequests:', error);
      toast.error("Failed to load data");
    } finally {
      setLoading(false);
    }
  };
  
  const handleViewProduct = (request: VerificationRequest) => {
    setSelectedRequest(request);
    setViewingProduct(true);
  };
  
  const handleViewCertificate = (request: VerificationRequest) => {
    setSelectedRequest(request);
    setViewingCertificate(true);
    setCertificateScale(1);
  };
  
  const handleApproveRequest = (request: VerificationRequest) => {
    setSelectedRequest(request);
    setApprovingProduct(true);
  };
  
  const handleRejectRequest = (request: VerificationRequest) => {
    setSelectedRequest(request);
    setRejectingProduct(true);
  };
  
  const confirmApproval = async () => {
    if (!selectedRequest) return;
    
    setProcessingAction(true);
    
    try {
      // Update the product's GI status to approved
      const { error: productError } = await supabase
        .from('products')
        .update({ 
          gi_status: 'approved',
          is_gi_approved: true
        })
        .eq('id', selectedRequest.id);
        
      if (productError) {
        console.error('Error updating product status:', productError);
        toast.error(`Failed to update product status: ${productError.message}`);
        return;
      }
      
      toast.success("Product approved - Now visible to customers");
      fetchVerificationRequests(); // Refresh the list
      setApprovingProduct(false);
    } catch (error) {
      console.error('Error in confirmApproval:', error);
      toast.error("An unexpected error occurred during approval");
    } finally {
      setProcessingAction(false);
    }
  };
  
  const confirmRejection = async () => {
    if (!selectedRequest || !rejectionReason.trim()) return;
    
    setProcessingAction(true);
    
    try {
      // Update the product to rejected status
      const { error: productError } = await supabase
        .from('products')
        .update({ 
          gi_status: 'rejected',
          is_gi_approved: false 
        })
        .eq('id', selectedRequest.id);
        
      if (productError) {
        console.error('Error updating product:', productError);
        toast.error(`Failed to update product: ${productError.message}`);
        return;
      }
      
      toast.success("Product rejected - Will not appear to customers");
      fetchVerificationRequests(); // Refresh the list
      setRejectingProduct(false);
      setRejectionReason('');
    } catch (error) {
      console.error('Error in confirmRejection:', error);
      toast.error("An unexpected error occurred during rejection");
    } finally {
      setProcessingAction(false);
    }
  };
  
  const handleZoomIn = () => {
    setCertificateScale(prev => Math.min(prev + 0.25, 2.5));
  };

  const handleZoomOut = () => {
    setCertificateScale(prev => Math.max(prev - 0.25, 0.5));
  };
  
  const isPdf = (url: string) => url.toLowerCase().endsWith('.pdf');
  
  return (
    <AdminLayout title="GI Tag Verification">
      <div className="bg-white rounded-xl shadow-soft">
        <div className="p-6 flex justify-between items-center">
          <div>
            <h2 className="text-xl font-semibold">GI Tag Verification Requests</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Showing all products with GI Status = Pending awaiting admin approval
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={fetchVerificationRequests}
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Loading...
              </>
            ) : (
              'Refresh'
            )}
          </Button>
        </div>
        
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Request ID</TableHead>
              <TableHead>Vendor</TableHead>
              <TableHead>Product</TableHead>
              <TableHead>GI Certificate</TableHead>
              <TableHead>Submission Date</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8">
                  <div className="flex justify-center">
                    <Loader2 className="h-8 w-8 animate-spin text-primary/70" />
                  </div>
                  <p className="mt-2 text-muted-foreground">Loading verification requests...</p>
                </TableCell>
              </TableRow>
            ) : requests.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8">
                  <AlertTriangle className="h-8 w-8 mx-auto text-muted-foreground" />
                  <p className="mt-2 text-muted-foreground">No pending products found</p>
                  <p className="text-sm text-muted-foreground">
                    All products have been reviewed or no products are awaiting approval
                  </p>
                </TableCell>
              </TableRow>
            ) : (
              requests.map((request) => (
                <TableRow key={request.id}>
                  <TableCell className="font-medium">
                    #{request.id.split('-')[0]}
                  </TableCell>
                  <TableCell>
                    {request.vendorName}
                  </TableCell>
                  <TableCell>
                    {request.productName}
                  </TableCell>
                  <TableCell>
                    {request.document ? (
                      isPdf(request.document) ? (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => window.open(request.document, '_blank')}
                          className="h-8 text-xs"
                        >
                          <FileText className="h-3 w-3 mr-1" />
                          View PDF
                        </Button>
                      ) : (
                        <img
                          src={request.document}
                          alt="GI Certificate"
                          className="h-12 w-16 object-cover rounded border cursor-pointer"
                          onClick={() => window.open(request.document, '_blank')}
                        />
                      )
                    ) : (
                      <span className="text-xs text-muted-foreground">
                        No Certificate Uploaded
                      </span>
                    )}
                  </TableCell>
                  <TableCell>
                    {new Date(request.submissionDate).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleViewProduct(request)}
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        Product
                      </Button>
                      {request.document && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleViewCertificate(request)}
                        >
                          <FileText className="h-4 w-4 mr-1" />
                          Certificate
                        </Button>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-green-600 border-green-200 hover:bg-green-50"
                        onClick={() => handleApproveRequest(request)}
                      >
                        <Check className="h-4 w-4 mr-1" />
                        Approve
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-red-600 border-red-200 hover:bg-red-50"
                        onClick={() => handleRejectRequest(request)}
                      >
                        <X className="h-4 w-4 mr-1" />
                        Reject
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
      
      {/* Product Details Dialog */}
      <Dialog open={viewingProduct} onOpenChange={setViewingProduct}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Product Details</DialogTitle>
            <DialogDescription>
              Review the product details submitted for GI verification
            </DialogDescription>
          </DialogHeader>
          
          {selectedRequest && (
            <div className="mt-4 space-y-4">
              <div className="aspect-video rounded-lg overflow-hidden bg-gray-100">
                {selectedRequest.productImages && selectedRequest.productImages.length > 0 ? (
                  <img
                    src={selectedRequest.productImages[0]}
                    alt={selectedRequest.productName}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="flex items-center justify-center h-full text-muted-foreground">
                    No image available
                  </div>
                )}
              </div>
              
              <div className="grid gap-4">
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground">Product Name</h3>
                  <p className="text-lg font-semibold">{selectedRequest.productName}</p>
                </div>
                
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground">Description</h3>
                  <p>{selectedRequest.productDescription}</p>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground">Price</h3>
                    <p className="text-lg font-semibold">₹{selectedRequest.productPrice}</p>
                  </div>
                  
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground">Region</h3>
                    <p>{selectedRequest.productRegion}</p>
                  </div>
                </div>
                
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground">Vendor Information</h3>
                  <div className="mt-1 p-3 bg-gray-50 rounded-lg">
                    <p className="font-medium">{selectedRequest.vendorName}</p>
                    <p className="text-sm text-muted-foreground">{selectedRequest.vendorEmail}</p>
                  </div>
                </div>
                
                {selectedRequest.document && (
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-sm font-medium text-muted-foreground">GI Certification Document</h3>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => window.open(selectedRequest.document, '_blank')}
                      >
                        <ExternalLink className="h-4 w-4 mr-2" />
                        Open Full Size
                      </Button>
                    </div>
                    <div className="border rounded-lg overflow-hidden bg-gray-50">
                      {isPdf(selectedRequest.document) ? (
                        <div className="p-4 text-center">
                          <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-2" />
                          <p className="text-sm text-muted-foreground mb-3">PDF Document</p>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => window.open(selectedRequest.document, '_blank')}
                          >
                            <ExternalLink className="h-4 w-4 mr-2" />
                            View PDF
                          </Button>
                        </div>
                      ) : (
                        <img
                          src={selectedRequest.document}
                          alt="GI Certificate"
                          className="w-full h-auto max-h-64 object-contain"
                        />
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setViewingProduct(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Certificate Viewer Dialog */}
      <Dialog open={viewingCertificate} onOpenChange={setViewingCertificate}>
        <DialogContent className="max-w-3xl h-[80vh]">
          <DialogHeader className="flex flex-row items-center justify-between">
            <div>
              <DialogTitle>GI Certificate</DialogTitle>
              <DialogDescription>
                Review the certificate submitted for verification
              </DialogDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button 
                variant="outline" 
                size="icon" 
                onClick={handleZoomOut} 
                disabled={certificateScale <= 0.5}
              >
                <ZoomOut className="h-4 w-4" />
              </Button>
              <Button 
                variant="outline" 
                size="icon" 
                onClick={handleZoomIn} 
                disabled={certificateScale >= 2.5}
              >
                <ZoomIn className="h-4 w-4" />
              </Button>
              {selectedRequest && (
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => window.open(selectedRequest.document, '_blank')}
                >
                  <ExternalLink className="h-4 w-4 mr-1" />
                  Open
                </Button>
              )}
            </div>
          </DialogHeader>
          
          {selectedRequest && (
            <div className="mt-4 flex-1 overflow-auto">
              <div 
                className="origin-center"
                style={{ 
                  transform: `scale(${certificateScale})`, 
                  transformOrigin: 'top center',
                  transition: 'transform 0.2s ease'
                }}
              >
                {isPdf(selectedRequest.document) ? (
                  <iframe
                    src={`${selectedRequest.document}#toolbar=0&navpanes=0&scrollbar=0`}
                    className="w-full h-[60vh] border"
                    title="GI Certificate"
                  />
                ) : (
                  <img
                    src={selectedRequest.document}
                    alt="GI Certificate"
                    className="max-w-full mx-auto border"
                  />
                )}
              </div>
            </div>
          )}
          
          <DialogFooter>
            <Button
              variant="outline"
              className="text-red-600 border-red-200 hover:bg-red-50"
              onClick={() => {
                setViewingCertificate(false);
                setRejectingProduct(true);
              }}
            >
              <X className="h-4 w-4 mr-2" />
              Reject
            </Button>
            <Button
              className="bg-green-600 hover:bg-green-700"
              onClick={() => {
                setViewingCertificate(false);
                setApprovingProduct(true);
              }}
            >
              <Check className="h-4 w-4 mr-2" />
              Approve
            </Button>
            <Button variant="outline" onClick={() => setViewingCertificate(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Approval Confirmation Dialog */}
      <Dialog open={approvingProduct} onOpenChange={setApprovingProduct}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Confirm Approval</DialogTitle>
            <DialogDescription>
              This will approve the GI certificate and verify the product's GI status.
            </DialogDescription>
          </DialogHeader>
          
          <div className="my-4 p-4 bg-green-50 border border-green-100 rounded-lg">
            <div className="flex items-start">
              <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 mr-2" />
              <div>
                <p className="font-medium text-green-800">Approve GI Certification</p>
                <p className="text-sm text-green-700">
                  {selectedRequest?.productName}
                </p>
              </div>
            </div>
          </div>
          
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setApprovingProduct(false)}
              disabled={processingAction}
            >
              Cancel
            </Button>
            <Button
              onClick={confirmApproval}
              disabled={processingAction}
              className="bg-green-600 hover:bg-green-700"
            >
              {processingAction ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <Check className="h-4 w-4 mr-2" />
                  Approve
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Rejection Dialog */}
      <Dialog open={rejectingProduct} onOpenChange={setRejectingProduct}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Reject Verification</DialogTitle>
            <DialogDescription>
              Please provide a reason for rejecting this GI verification request.
            </DialogDescription>
          </DialogHeader>
          
          <div className="my-4 p-4 bg-red-50 border border-red-100 rounded-lg">
            <div className="flex items-start">
              <XCircle className="h-5 w-5 text-red-500 mt-0.5 mr-2" />
              <div>
                <p className="font-medium text-red-800">Reject GI Certification</p>
                <p className="text-sm text-red-700">
                  {selectedRequest?.productName}
                </p>
              </div>
            </div>
          </div>
          
          <div className="mt-4">
            <label className="text-sm font-medium" htmlFor="rejection-reason">
              Rejection Reason
            </label>
            <Textarea
              id="rejection-reason"
              placeholder="Explain why this verification is being rejected..."
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              className="mt-1"
              rows={3}
            />
          </div>
          
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setRejectingProduct(false)}
              disabled={processingAction}
            >
              Cancel
            </Button>
            <Button
              onClick={confirmRejection}
              disabled={processingAction || !rejectionReason.trim()}
              className="bg-red-600 hover:bg-red-700"
            >
              {processingAction ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <X className="h-4 w-4 mr-2" />
                  Reject
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
};

export default GIVerification;
