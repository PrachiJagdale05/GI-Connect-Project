import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { AspectRatio } from '@/components/ui/aspect-ratio';
import { Upload, Sparkles, Check, X } from 'lucide-react';
import { toast } from 'sonner';
import { uploadToStorage } from '@/integrations/supabase/client';

interface EnhancedImage {
  id: string;
  url: string;
  selected: boolean;
}

const AIImageEnhancement: React.FC = () => {
  const [step, setStep] = useState<'upload' | 'enhance' | 'confirm'>('upload');
  const [originalImage, setOriginalImage] = useState<string | null>(null);
  const [enhancedImages, setEnhancedImages] = useState<EnhancedImage[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedImages, setSelectedImages] = useState<EnhancedImage[]>([]);

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const { path, publicUrl, error } = await uploadToStorage(file, 'product-images');
      if (error) throw error;
      
      if (publicUrl) {
        setOriginalImage(publicUrl);
        setStep('enhance');
        await generateEnhancedImages(publicUrl);
      }
    } catch (error) {
      toast.error('Failed to upload image');
      console.error('Upload error:', error);
    }
  };

  const generateEnhancedImages = async (imageUrl: string) => {
    setIsGenerating(true);
    
    try {
      // Mock AI enhancement - in real implementation, this would call your AI service
      // Simulating 4 enhanced versions
      const mockEnhanced: EnhancedImage[] = [
        { id: '1', url: imageUrl, selected: false },
        { id: '2', url: imageUrl, selected: false },
        { id: '3', url: imageUrl, selected: false },
        { id: '4', url: imageUrl, selected: false },
      ];
      
      // Simulate processing time
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      setEnhancedImages(mockEnhanced);
      toast.success('Enhanced images generated successfully!');
    } catch (error) {
      toast.error('Failed to generate enhanced images');
      console.error('Enhancement error:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  const toggleImageSelection = (imageId: string) => {
    setEnhancedImages(prev => 
      prev.map(img => 
        img.id === imageId ? { ...img, selected: !img.selected } : img
      )
    );
  };

  const proceedToConfirmation = () => {
    const selected = enhancedImages.filter(img => img.selected);
    if (selected.length === 0) {
      toast.error('Please select at least one enhanced image');
      return;
    }
    setSelectedImages(selected);
    setStep('confirm');
  };

  const saveSelection = async () => {
    try {
      // Here you would save the selection to your database
      // For now, just show success message
      toast.success(`Saved ${selectedImages.length} enhanced images!`);
      
      // Reset the flow
      setStep('upload');
      setOriginalImage(null);
      setEnhancedImages([]);
      setSelectedImages([]);
    } catch (error) {
      toast.error('Failed to save selection');
      console.error('Save error:', error);
    }
  };

  const resetFlow = () => {
    setStep('upload');
    setOriginalImage(null);
    setEnhancedImages([]);
    setSelectedImages([]);
  };

  if (step === 'upload') {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              AI Product Image Enhancement
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-12 text-center">
              <Upload className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">Upload Product Image</h3>
              <p className="text-muted-foreground mb-4">
                Upload your product image and we'll generate 4 professionally enhanced versions
              </p>
              <input
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
                id="image-upload"
              />
              <label htmlFor="image-upload">
                <Button asChild className="cursor-pointer">
                  <span>Choose Image</span>
                </Button>
              </label>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (step === 'enhance') {
    return (
      <div className="max-w-7xl mx-auto p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold">AI Image Enhancement</h2>
          <Button variant="outline" onClick={resetFlow}>
            <X className="h-4 w-4 mr-2" />
            Start Over
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Original Image */}
          <div>
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Original Image</CardTitle>
              </CardHeader>
              <CardContent>
                <AspectRatio ratio={1}>
                  <img
                    src={originalImage!}
                    alt="Original product"
                    className="w-full h-full object-cover rounded-lg"
                  />
                </AspectRatio>
              </CardContent>
            </Card>
          </div>

          {/* Enhanced Images */}
          <div>
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-primary" />
                  AI Enhanced Images
                </CardTitle>
              </CardHeader>
              <CardContent>
                {isGenerating ? (
                  <div className="flex items-center justify-center h-64">
                    <div className="text-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                      <p className="text-muted-foreground">Generating enhanced images...</p>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-4">
                    {enhancedImages.map((image, index) => (
                      <div key={image.id} className="relative">
                        <div 
                          className={`border-2 rounded-lg p-2 cursor-pointer transition-all ${
                            image.selected 
                              ? 'border-primary bg-primary/5' 
                              : 'border-muted-foreground/25 hover:border-primary/50'
                          }`}
                          onClick={() => toggleImageSelection(image.id)}
                        >
                          <AspectRatio ratio={1}>
                            <img
                              src={image.url}
                              alt={`Enhanced version ${index + 1}`}
                              className="w-full h-full object-cover rounded"
                            />
                          </AspectRatio>
                          <div className="absolute top-1 right-1">
                            <Checkbox 
                              checked={image.selected}
                              onChange={() => toggleImageSelection(image.id)}
                            />
                          </div>
                          <div className="mt-2 text-center">
                            <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-full">
                              AI Enhanced
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {!isGenerating && enhancedImages.length > 0 && (
              <div className="mt-4 flex justify-end">
                <Button onClick={proceedToConfirmation} disabled={!enhancedImages.some(img => img.selected)}>
                  Continue with Selection ({enhancedImages.filter(img => img.selected).length})
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (step === 'confirm') {
    return (
      <div className="max-w-6xl mx-auto p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold">Confirm Your Selection</h2>
          <Button variant="outline" onClick={() => setStep('enhance')}>
            Back to Selection
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
          {/* Original Image */}
          <Card>
            <CardHeader>
              <CardTitle>Original Image</CardTitle>
            </CardHeader>
            <CardContent>
              <AspectRatio ratio={1}>
                <img
                  src={originalImage!}
                  alt="Original product"
                  className="w-full h-full object-cover rounded-lg"
                />
              </AspectRatio>
            </CardContent>
          </Card>

          {/* Selected Enhanced Images */}
          <Card>
            <CardHeader>
              <CardTitle>Selected Enhanced Images ({selectedImages.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                {selectedImages.map((image, index) => (
                  <div key={image.id}>
                    <AspectRatio ratio={1}>
                      <img
                        src={image.url}
                        alt={`Selected enhanced ${index + 1}`}
                        className="w-full h-full object-cover rounded-lg border-2 border-primary"
                      />
                    </AspectRatio>
                    <div className="mt-2 text-center">
                      <span className="flex items-center justify-center gap-1 text-xs text-primary">
                        <Check className="h-3 w-3" />
                        Selected
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="flex justify-center">
          <Button onClick={saveSelection} size="lg" className="px-8">
            <Check className="h-4 w-4 mr-2" />
            Save Selection
          </Button>
        </div>
      </div>
    );
  }

  return null;
};

export default AIImageEnhancement;