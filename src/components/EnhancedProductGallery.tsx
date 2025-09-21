import React, { useState } from 'react';
import { X, ChevronLeft, ChevronRight, Maximize2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from '@/components/ui/carousel';

interface EnhancedProductGalleryProps {
  productName: string;
  originalImages: string[] | null | undefined;
  generatedImages: string[] | null | undefined;
  videos?: string[] | null | undefined;
}

const EnhancedProductGallery: React.FC<EnhancedProductGalleryProps> = ({
  productName,
  originalImages,
  generatedImages,
  videos
}) => {
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [imageLoadError, setImageLoadError] = useState<Record<string, boolean>>({});

  // Clean and process images
  const cleanOriginalImages = Array.isArray(originalImages) 
    ? originalImages.filter(img => img && typeof img === 'string' && img.trim() !== '')
    : [];
  
  const cleanGeneratedImages = Array.isArray(generatedImages)
    ? generatedImages.filter(img => img && typeof img === 'string' && img.trim() !== '')
    : [];

  // Combine all images for display - original first, then generated
  const allImages = [
    ...cleanOriginalImages,
    ...cleanGeneratedImages
  ];

  const handleImageError = (imageUrl: string) => {
    setImageLoadError(prev => ({ ...prev, [imageUrl]: true }));
  };

  const openLightbox = (imageUrl: string) => {
    const index = allImages.findIndex(img => img === imageUrl);
    if (index !== -1) {
      setCurrentImageIndex(index);
      setLightboxOpen(true);
    }
  };

  const navigateLightbox = (direction: 'prev' | 'next') => {
    if (direction === 'prev') {
      setCurrentImageIndex(prev => prev > 0 ? prev - 1 : allImages.length - 1);
    } else {
      setCurrentImageIndex(prev => prev < allImages.length - 1 ? prev + 1 : 0);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setLightboxOpen(false);
    } else if (e.key === 'ArrowLeft') {
      navigateLightbox('prev');
    } else if (e.key === 'ArrowRight') {
      navigateLightbox('next');
    }
  };

  // If no images at all, show fallback
  if (allImages.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 bg-muted/20 rounded-xl border border-border">
        <p className="text-muted-foreground">No images available</p>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-4">
        {/* Main Product Images Carousel */}
        <Carousel className="w-full">
          <CarouselContent>
            {allImages.map((imageUrl, index) => (
              <CarouselItem key={index}>
                <div 
                  className="relative aspect-square rounded-lg overflow-hidden bg-white border border-border cursor-pointer group"
                  onClick={() => openLightbox(imageUrl)}
                >
                  {!imageLoadError[imageUrl] ? (
                    <img
                      src={imageUrl}
                      alt={`${productName} image ${index + 1}`}
                      className="w-full h-full object-contain transition-transform group-hover:scale-105"
                      loading="lazy"
                      onError={() => handleImageError(imageUrl)}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-muted/20">
                      <p className="text-sm text-muted-foreground">Image unavailable</p>
                    </div>
                  )}
                  
                  {/* Hover overlay */}
                  <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <Maximize2 className="h-6 w-6 text-white" />
                  </div>
                </div>
              </CarouselItem>
            ))}
          </CarouselContent>
          {allImages.length > 1 && (
            <>
              <CarouselPrevious className="left-2" />
              <CarouselNext className="right-2" />
            </>
          )}
        </Carousel>

        {/* Thumbnail Navigation (if more than one image) */}
        {allImages.length > 1 && (
          <div className="grid grid-cols-4 md:grid-cols-6 gap-2 mt-4">
            {allImages.map((imageUrl, index) => (
              <div
                key={index}
                className="relative aspect-square rounded-md overflow-hidden bg-white border border-border cursor-pointer hover:border-primary transition-colors"
                onClick={() => openLightbox(imageUrl)}
              >
                {!imageLoadError[imageUrl] ? (
                  <img
                    src={imageUrl}
                    alt={`${productName} thumbnail ${index + 1}`}
                    className="w-full h-full object-contain"
                    loading="lazy"
                    onError={() => handleImageError(imageUrl)}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-muted/20">
                    <p className="text-xs text-muted-foreground">N/A</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Lightbox Modal */}
      <AnimatePresence>
        {lightboxOpen && allImages.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4"
            onKeyDown={handleKeyDown}
            tabIndex={-1}
          >
            {/* Close Button */}
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-4 right-4 z-10 text-white hover:bg-white/20"
              onClick={() => setLightboxOpen(false)}
            >
              <X className="h-6 w-6" />
            </Button>

            {/* Navigation Buttons */}
            {allImages.length > 1 && (
              <>
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute left-4 top-1/2 -translate-y-1/2 z-10 text-white hover:bg-white/20"
                  onClick={() => navigateLightbox('prev')}
                >
                  <ChevronLeft className="h-8 w-8" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-4 top-1/2 -translate-y-1/2 z-10 text-white hover:bg-white/20"
                  onClick={() => navigateLightbox('next')}
                >
                  <ChevronRight className="h-8 w-8" />
                </Button>
              </>
            )}

            {/* Current Image */}
            <motion.div
              key={currentImageIndex}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="relative max-w-4xl max-h-[90vh] w-full"
            >
              <img
                src={allImages[currentImageIndex]}
                alt={`${productName} image ${currentImageIndex + 1}`}
                className="w-full h-full object-contain rounded-lg"
              />
            </motion.div>

            {/* Image Counter */}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/50 text-white px-3 py-1 rounded-full text-sm">
              {currentImageIndex + 1} / {allImages.length}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default EnhancedProductGallery;