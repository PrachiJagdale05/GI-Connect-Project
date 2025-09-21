
import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, XCircle, PlayCircle, Video } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface MediaGalleryProps {
  images?: string[] | null;
  videos?: string[] | null;
  alt?: string;
  aspectRatio?: 'square' | '16:9' | '4:3';
}

const MediaGallery: React.FC<MediaGalleryProps> = ({
  images = [],
  videos = [],
  alt = 'Product',
  aspectRatio = 'square'
}) => {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [activeMediaType, setActiveMediaType] = useState<'image' | 'video'>('image');
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [imagesWithStatus, setImagesWithStatus] = useState<{ url: string; loaded: boolean; error: boolean }[]>([]);
  const [videosWithStatus, setVideosWithStatus] = useState<{ url: string; loaded: boolean; error: boolean }[]>([]);
  const [videoLoaded, setVideoLoaded] = useState(false);

  // Clean up the images and videos arrays at component mount
  useEffect(() => {
    // Process images
    const cleanImages = images
      ? images
          .filter(img => img && typeof img === 'string' && img.trim() !== '')
          .map(url => ({ url, loaded: false, error: false }))
      : [];
      
    // Process videos - make sure we handle videos properly
    const cleanVideos = videos 
      ? videos
          .filter(vid => vid && typeof vid === 'string' && vid.trim() !== '')
          .map(url => ({ url, loaded: false, error: false })) 
      : [];

    console.log('MediaGallery videos:', videos);
    console.log('Clean videos:', cleanVideos);
    
    setImagesWithStatus(cleanImages);
    setVideosWithStatus(cleanVideos);
    
    // If no images but has videos, set default to video
    if (cleanImages.length === 0 && cleanVideos.length > 0) {
      setActiveMediaType('video');
    }
    
    // Reset loading and error states
    setIsLoading(cleanImages.length > 0 || cleanVideos.length > 0);
    setHasError(cleanImages.length === 0 && cleanVideos.length === 0);
    
    console.log('Media Gallery initialized with:', {
      images: cleanImages.length,
      videos: cleanVideos.length
    });
    
  }, [images, videos]);

  // Calculate what media to show
  const allMedia = [
    ...(imagesWithStatus.map(img => ({ type: 'image' as const, url: img.url }))),
    ...(videosWithStatus.map(video => ({ type: 'video' as const, url: video.url })))
  ];

  const handleImageLoad = (index: number) => {
    setImagesWithStatus(prev => {
      const newImages = [...prev];
      if (newImages[index]) {
        newImages[index].loaded = true;
        newImages[index].error = false;
      }
      return newImages;
    });
    
    if (selectedIndex === index && activeMediaType === 'image') {
      setIsLoading(false);
      setHasError(false);
    }
  };

  const handleImageError = (index: number) => {
    console.error(`Failed to load image at index ${index}:`, imagesWithStatus[index]?.url);
    
    setImagesWithStatus(prev => {
      const newImages = [...prev];
      if (newImages[index]) {
        newImages[index].loaded = false;
        newImages[index].error = true;
      }
      return newImages;
    });
    
    if (selectedIndex === index && activeMediaType === 'image') {
      setIsLoading(false);
      setHasError(true);
    }
  };
  
  const handleVideoLoad = (index: number) => {
    console.log(`Video at index ${index} loaded:`, videosWithStatus[index]?.url);
    
    setVideosWithStatus(prev => {
      const newVideos = [...prev];
      if (newVideos[index]) {
        newVideos[index].loaded = true;
        newVideos[index].error = false;
      }
      return newVideos;
    });
    
    if (activeMediaType === 'video' && getVideoIndex() === index) {
      setVideoLoaded(true);
      setIsLoading(false);
      setHasError(false);
    }
  };
  
  const handleVideoError = (index: number) => {
    console.error(`Failed to load video at index ${index}:`, videosWithStatus[index]?.url);
    
    setVideosWithStatus(prev => {
      const newVideos = [...prev];
      if (newVideos[index]) {
        newVideos[index].loaded = false;
        newVideos[index].error = true;
      }
      return newVideos;
    });
    
    if (activeMediaType === 'video' && getVideoIndex() === index) {
      setIsLoading(false);
      setHasError(true);
    }
  };

  const handlePrevious = () => {
    setSelectedIndex(prev => (prev > 0 ? prev - 1 : allMedia.length - 1));
    const newType = allMedia[(selectedIndex > 0 ? selectedIndex - 1 : allMedia.length - 1)].type;
    setActiveMediaType(newType);
    if (newType === 'video') {
      setVideoLoaded(false);
      setIsLoading(true);
    }
  };

  const handleNext = () => {
    setSelectedIndex(prev => (prev < allMedia.length - 1 ? prev + 1 : 0));
    const newType = allMedia[(selectedIndex < allMedia.length - 1 ? selectedIndex + 1 : 0)].type;
    setActiveMediaType(newType);
    if (newType === 'video') {
      setVideoLoaded(false);
      setIsLoading(true);
    }
  };

  const handleThumbnailClick = (index: number) => {
    setSelectedIndex(index);
    const newType = allMedia[index].type;
    setActiveMediaType(newType);
    
    if (newType === 'video') {
      setVideoLoaded(false);
      setIsLoading(true);
    }
  };
  
  // Helper to get the correct video index when a video is selected
  const getVideoIndex = () => {
    if (activeMediaType !== 'video') return -1;
    
    const imageCount = imagesWithStatus.length;
    return selectedIndex - imageCount;
  };
  
  // Get the current video URL
  const getCurrentVideoUrl = () => {
    const videoIndex = getVideoIndex();
    if (videoIndex >= 0 && videoIndex < videosWithStatus.length) {
      return videosWithStatus[videoIndex].url;
    }
    return null;
  };

  const getAspectRatioClass = () => {
    switch (aspectRatio) {
      case '16:9':
        return 'aspect-w-16 aspect-h-9';
      case '4:3':
        return 'aspect-w-4 aspect-h-3';
      case 'square':
      default:
        return 'aspect-square';
    }
  };

  // Determine if we should show navigation
  const showNavigation = allMedia.length > 1;

  // Handle case when there's no media
  if (allMedia.length === 0) {
    return (
      <div className={`rounded-lg overflow-hidden bg-gray-100 ${getAspectRatioClass()}`}>
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <XCircle className="h-12 w-12 text-muted-foreground mx-auto mb-2 opacity-40" />
            <p className="text-muted-foreground">No media available</p>
          </div>
        </div>
      </div>
    );
  }

  // Get current media
  const currentMedia = allMedia[selectedIndex];

  return (
    <div className="space-y-4">
      {/* Main display area */}
      <div className={`relative rounded-lg overflow-hidden ${getAspectRatioClass()} bg-gray-50 border`}>
        {/* Loading indicator */}
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-50 z-10">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          </div>
        )}
        
        {/* Error fallback */}
        {hasError && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-100 z-10">
            <div className="text-center p-4">
              <XCircle className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
              <p className="text-muted-foreground">Media could not be loaded</p>
            </div>
          </div>
        )}
        
        {/* Image/Video display */}
        {currentMedia && currentMedia.type === 'image' ? (
          <div className="relative w-full h-full">
            {/* Actual image with preload */}
            <AnimatePresence>
              <motion.img
                key={currentMedia.url}
                src={currentMedia.url}
                alt={`${alt} ${selectedIndex + 1}`}
                className={`w-full h-full object-contain ${isLoading || hasError ? 'opacity-0' : 'opacity-100'}`}
                initial={{ opacity: 0 }}
                animate={{ opacity: isLoading || hasError ? 0 : 1 }}
                transition={{ duration: 0.3 }}
                onLoad={() => handleImageLoad(imagesWithStatus.findIndex(img => img.url === currentMedia.url))}
                onError={() => handleImageError(imagesWithStatus.findIndex(img => img.url === currentMedia.url))}
                style={{ pointerEvents: 'none' }}
              />
            </AnimatePresence>
            
            {/* Preload next images */}
            <div className="hidden">
              {imagesWithStatus.map((img, idx) => (
                idx !== selectedIndex && (
                  <img 
                    key={`preload-${idx}`}
                    src={img.url}
                    alt={`Preload ${idx}`}
                    onLoad={() => handleImageLoad(idx)}
                    onError={() => handleImageError(idx)}
                  />
                )
              ))}
            </div>
          </div>
        ) : currentMedia?.type === 'video' ? (
          <div className="w-full h-full flex items-center justify-center">
            <video
              src={currentMedia.url}
              controls
              className={`max-w-full max-h-full ${videoLoaded ? 'opacity-100' : 'opacity-0'}`}
              onLoadedData={() => {
                console.log("Video loaded:", currentMedia.url);
                const videoIndex = videosWithStatus.findIndex(vid => vid.url === currentMedia.url);
                handleVideoLoad(videoIndex);
              }}
              onError={(e) => {
                console.error("Video error:", e);
                const videoIndex = videosWithStatus.findIndex(vid => vid.url === currentMedia.url);
                handleVideoError(videoIndex);
              }}
            >
              Your browser does not support the video tag.
            </video>
          </div>
        ) : null}
        
        {/* Navigation arrows */}
        {showNavigation && (
          <>
            <button
              onClick={handlePrevious}
              className="absolute left-2 top-1/2 transform -translate-y-1/2 bg-black/50 text-white rounded-full p-1 hover:bg-black/70 transition-colors backdrop-blur-sm"
              aria-label="Previous image"
            >
              <ChevronLeft className="h-6 w-6" />
            </button>
            <button
              onClick={handleNext}
              className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-black/50 text-white rounded-full p-1 hover:bg-black/70 transition-colors backdrop-blur-sm"
              aria-label="Next image"
            >
              <ChevronRight className="h-6 w-6" />
            </button>
          </>
        )}
      </div>
      
      {/* Thumbnail strip */}
      {allMedia.length > 1 && (
        <div className="flex space-x-2 overflow-x-auto pb-2">
          {allMedia.map((media, index) => (
            <button
              key={`thumb-${index}`}
              onClick={() => handleThumbnailClick(index)}
              className={`relative flex-shrink-0 w-16 h-16 rounded-md overflow-hidden border-2 ${
                selectedIndex === index ? 'border-primary' : 'border-transparent'
              }`}
              aria-label={`View ${media.type} ${index + 1}`}
            >
              {media.type === 'image' ? (
                <img
                  src={media.url}
                  alt={`Thumbnail ${index + 1}`}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.onerror = null;
                    target.src = 'https://via.placeholder.com/40?text=Error';
                  }}
                />
              ) : (
                <div className="w-full h-full bg-gray-100 flex items-center justify-center">
                  <Video className="h-6 w-6 text-primary" />
                </div>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default MediaGallery;
