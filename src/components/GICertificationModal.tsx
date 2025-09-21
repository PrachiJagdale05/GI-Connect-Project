
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { X, ZoomIn, ZoomOut } from 'lucide-react';

interface GICertificationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  documentUrl: string;
  productName: string;
}

const GICertificationModal = ({ open, onOpenChange, documentUrl, productName }: GICertificationModalProps) => {
  const [scale, setScale] = useState(1);

  const handleZoomIn = () => {
    setScale(prev => Math.min(prev + 0.25, 2.5));
  };

  const handleZoomOut = () => {
    setScale(prev => Math.max(prev - 0.25, 0.5));
  };

  // Determine if the document is a PDF or image
  const isPdf = documentUrl.toLowerCase().endsWith('.pdf');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl w-full h-[80vh] p-0 overflow-hidden">
        <div className="flex flex-col h-full">
          <DialogHeader className="p-4 border-b">
            <div className="flex items-center justify-between">
              <DialogTitle>GI Certification: {productName}</DialogTitle>
              <div className="flex items-center gap-2">
                <Button 
                  variant="outline" 
                  size="icon" 
                  onClick={handleZoomOut} 
                  disabled={scale <= 0.5}
                >
                  <ZoomOut className="h-4 w-4" />
                </Button>
                <Button 
                  variant="outline" 
                  size="icon" 
                  onClick={handleZoomIn} 
                  disabled={scale >= 2.5}
                >
                  <ZoomIn className="h-4 w-4" />
                </Button>
                <DialogClose asChild>
                  <Button variant="outline" size="icon">
                    <X className="h-4 w-4" />
                  </Button>
                </DialogClose>
              </div>
            </div>
          </DialogHeader>
          
          <div className="flex-1 overflow-auto p-4 flex items-center justify-center">
            <div 
              style={{ 
                transform: `scale(${scale})`, 
                transition: 'transform 0.2s ease'
              }}
              className="origin-center"
            >
              {isPdf ? (
                <iframe 
                  src={`${documentUrl}#toolbar=0&navpanes=0&scrollbar=0`} 
                  className="w-full h-[60vh]"
                  title="GI Certification Document"
                />
              ) : (
                <img 
                  src={documentUrl} 
                  alt="GI Certification" 
                  className="max-w-full h-auto"
                />
              )}
            </div>
          </div>
          
          <div className="p-4 border-t text-center text-sm text-muted-foreground">
            This document certifies the authenticity of this product's Geographical Indication tag.
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default GICertificationModal;
