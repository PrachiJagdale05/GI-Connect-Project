
import { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface ImageGalleryProps {
  images: string[] | null | undefined;
  alt: string;
}

const ImageGallery: React.FC<ImageGalleryProps> = ({ images, alt }) => {
  const [selectedImage, setSelectedImage] = useState<string>('');
  const [loadingImages, setLoadingImages] = useState<Record<string, boolean>>({});
  const [loadingMainImage, setLoadingMainImage] = useState<boolean>(true);

  useEffect(() => {
    // Initialize loading state for all images
    const initialLoadingState: Record<string, boolean> = {};
    
    // Ensure we're dealing with an array of valid image URLs
    const validImages = Array.isArray(images) 
      ? images.filter(img => img && typeof img === 'string' && img.trim() !== '') 
      : [];
    
    console.log('ImageGallery received images:', images);
    console.log('Valid images after filtering:', validImages);
    
    validImages.forEach(img => {
      initialLoadingState[img] = true;
    });
    setLoadingImages(initialLoadingState);
    
    // Reset main image when images change
    if (validImages.length > 0) {
      setSelectedImage(validImages[0]);
      setLoadingMainImage(true);
    } else {
      setSelectedImage('');
    }
  }, [images]);

  const handleImageLoad = (src: string) => {
    setLoadingImages(prev => ({
      ...prev,
      [src]: false
    }));

    if (src === selectedImage) {
      setLoadingMainImage(false);
    }
  };

  const handleThumbnailClick = (image: string) => {
    setSelectedImage(image);
    setLoadingMainImage(loadingImages[image]);
  };

  // Filter out invalid image URLs
  const validImages = Array.isArray(images)
    ? images.filter(img => img && typeof img === 'string' && img.trim() !== '')
    : [];

  if (!validImages || validImages.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 bg-gray-100 rounded-xl">
        <p className="text-gray-500">No images available</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
      {/* Thumbnails - vertical on desktop, horizontal on mobile */}
      <div className="order-2 md:order-1 md:col-span-1 flex md:flex-col gap-2 overflow-x-auto md:overflow-y-auto md:h-[580px] pb-2 md:pb-0 md:pr-2">
        {validImages.map((image, index) => (
          <div
            key={index}
            className={`relative rounded-md overflow-hidden aspect-square min-w-[80px] max-w-[80px] border-2 transition-all cursor-pointer ${
              selectedImage === image ? 'border-primary scale-95' : 'border-transparent hover:border-gray-200'
            }`}
            onClick={() => handleThumbnailClick(image)}
          >
            {loadingImages[image] && (
              <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
                <Loader2 className="h-4 w-4 text-primary animate-spin" />
              </div>
            )}
            <img
              src={image}
              alt={`${alt} thumbnail ${index + 1}`}
              className={`w-full h-full object-cover ${loadingImages[image] ? 'opacity-0' : 'opacity-100'}`}
              onLoad={() => handleImageLoad(image)}
              onError={(e) => {
                console.error(`Failed to load image: ${image}`);
                // Remove from loading state
                setLoadingImages(prev => ({
                  ...prev,
                  [image]: false
                }));
              }}
            />
          </div>
        ))}
      </div>

      {/* Main Image */}
      <div className="order-1 md:order-2 md:col-span-5 relative rounded-xl overflow-hidden aspect-square md:aspect-auto md:h-[580px] bg-white">
        {loadingMainImage && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
            <Loader2 className="h-12 w-12 text-primary animate-spin" />
          </div>
        )}
        <AnimatePresence mode="wait">
          {selectedImage && (
            <motion.img
              key={selectedImage}
              src={selectedImage}
              alt={alt}
              className={`w-full h-full object-contain ${loadingMainImage ? 'opacity-0' : 'opacity-100'}`}
              onLoad={() => setLoadingMainImage(false)}
              onError={() => {
                console.error(`Failed to load main image: ${selectedImage}`);
                setLoadingMainImage(false);
              }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
            />
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default ImageGallery;
