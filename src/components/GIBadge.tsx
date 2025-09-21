
import { Award, MapPin, Sparkles, Eye } from 'lucide-react';
import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';
import GICertificationModal from './GICertificationModal';
import { supabase } from '@/integrations/supabase/client';

interface GIBadgeProps {
  giTag: string;
  region: string;
  className?: string;
  productName: string;
  productId: string; // Add product ID to fetch certification status
}

const GIBadge: React.FC<GIBadgeProps> = ({ 
  giTag, 
  region, 
  className,
  productName,
  productId
}) => {
  const [showCertification, setShowCertification] = useState(false);
  const [certificationDocument, setCertificationDocument] = useState<string | null>(null);
  const [isVerified, setIsVerified] = useState<boolean>(false);

  // Fetch GI certification status
  useEffect(() => {
    const fetchCertificationStatus = async () => {
      try {
        const { data, error } = await supabase
          .from('gi_certifications')
          .select('document, is_verified')
          .eq('product_id', productId)
          .eq('is_verified', true) // Only show badge if verified
          .maybeSingle();

        if (error && error.code !== 'PGRST116') {
          console.error('Error fetching certification:', error);
          return;
        }

        if (data) {
          setCertificationDocument(data.document);
          setIsVerified(true);
        }
      } catch (error) {
        console.error('Error in fetchCertificationStatus:', error);
      }
    };

    if (productId) {
      fetchCertificationStatus();
    }
  }, [productId]);

  // Only render badge if product is verified
  if (!isVerified) {
    return null;
  }

  return (
    <>
      <motion.div
        className={`bg-white rounded-xl shadow-medium border border-gray-100 p-5 flex items-center ${className}`}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 0.5 }}
      >
        <div className="mr-4 p-3 rounded-full bg-gradient-to-r from-vibrant-saffron to-vibrant-marigold relative">
          <Award className="h-6 w-6 text-white" />
          <div className="absolute -top-1 -right-1 animate-ping">
            <Sparkles className="h-3 w-3 text-vibrant-saffron" />
          </div>
        </div>
        <div className="flex-1">
          <h4 className="font-medium flex items-center">
            <span className="mr-1.5">GI Protected Product</span>
            <span className="text-xs px-2 py-0.5 bg-vibrant-saffron/10 text-vibrant-saffron rounded-full">Verified</span>
          </h4>
          <div className="flex flex-col mt-1">
            <span className="text-sm">
              <span className="font-medium text-vibrant-spice">{giTag}</span> 
              <div className="flex items-center mt-1 text-muted-foreground">
                <MapPin className="h-3.5 w-3.5 mr-1" />
                {region}
              </div>
            </span>
            <span className="text-xs text-muted-foreground flex items-center mt-1.5">
              <Sparkles className="h-3 w-3 mr-1 text-vibrant-saffron" />
              Authentic & Verified Product
            </span>
          </div>
        </div>
        {certificationDocument && (
          <div 
            className="ml-2 p-2 hover:bg-gray-100 rounded-full cursor-pointer transition-colors"
            onClick={() => setShowCertification(true)}
            title="View certification"
          >
            <Eye className="h-5 w-5 text-vibrant-spice" />
          </div>
        )}
      </motion.div>

      {certificationDocument && (
        <GICertificationModal
          open={showCertification}
          onOpenChange={setShowCertification}
          documentUrl={certificationDocument}
          productName={productName}
        />
      )}
    </>
  );
};

export default GIBadge;
