import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDropzone } from 'react-dropzone';
import { 
  X, 
  ImagePlus,
  FileText,
  Check,
  AlertTriangle,
  Loader2,
  Star,
  Sparkles,
  RotateCcw,
  Upload,
  Edit3
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from '@/components/ui/carousel';
import { toast } from "sonner";
import { useAuth } from '@/contexts/AuthContext';
import DashboardLayout from '@/components/DashboardLayout';
import { categories, regions, ProductFormData, AIGenerationResponse } from '@/types/products';
import { submitProduct, uploadFile } from '@/services/productService';
import { generateProductData, checkRateLimit } from '@/services/aiGenerationService';

type FlowStep = 'initial' | 'generating' | 'editing' | 'submitting';

interface GeneratedImage {
  url: string;
  selected: boolean;
  isCover: boolean;
}

const ProductUpload = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  // Flow control
  const [currentStep, setCurrentStep] = useState<FlowStep>('initial');
  const [aiData, setAiData] = useState<AIGenerationResponse | null>(null);
  const [generatedImages, setGeneratedImages] = useState<GeneratedImage[]>([]);
  const [remainingGenerations, setRemainingGenerations] = useState(5);

  // Initial input state
  const [productName, setProductName] = useState('');
  const [primaryImage, setPrimaryImage] = useState<File | null>(null);
  const [primaryImageUrl, setPrimaryImageUrl] = useState<string>('');

  // Additional uploads
  const [additionalImages, setAdditionalImages] = useState<File[]>([]);
  const [videos, setVideos] = useState<File[]>([]);
  const [giCertificate, setGiCertificate] = useState<File | null>(null);
  const [makingVideo, setMakingVideo] = useState<File | null>(null);

  // Form data (populated by AI then editable)
  const [formData, setFormData] = useState<ProductFormData>({
    name: '',
    description: '',
    price: 0,
    stock: 0,
    category: '',
    region: '',
    location: '',
    is_gi_approved: true, // Always true since GI certification is mandatory
    images: [],
    videos: [],
    maker: {
      name: '',
      story: '',
      region: '',
    }
  });

  // Loading states
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [generationTime, setGenerationTime] = useState(0);

  // Check rate limits on component mount
  useEffect(() => {
    const initializeRateLimit = async () => {
      const { remainingGenerations } = await checkRateLimit();
      setRemainingGenerations(remainingGenerations);
    };
    initializeRateLimit();
  }, []);

  // Generation timer
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isGenerating) {
      timer = setInterval(() => {
        setGenerationTime(prev => prev + 1);
      }, 1000);
    } else {
      setGenerationTime(0);
    }
    return () => clearInterval(timer);
  }, [isGenerating]);

  // Primary image dropzone
  const primaryImageDropzone = useDropzone({
    accept: {
      'image/*': ['.jpeg', '.png', '.jpg', '.gif']
    },
    maxFiles: 1,
    maxSize: 5242880, // 5MB
    onDrop: acceptedFiles => {
      if (acceptedFiles.length > 0) {
        setPrimaryImage(acceptedFiles[0]);
      }
    }
  });

  // Additional images dropzone
  const additionalImageDropzone = useDropzone({
    accept: {
      'image/*': ['.jpeg', '.png', '.jpg', '.gif']
    },
    maxSize: 5242880, // 5MB
    onDrop: acceptedFiles => {
      setAdditionalImages(prev => [...prev, ...acceptedFiles]);
    }
  });

  // Video dropzone
  const videoDropzone = useDropzone({
    accept: {
      'video/*': ['.mp4', '.webm', '.mov']
    },
    maxSize: 31457280, // 30MB
    onDrop: acceptedFiles => {
      setVideos(prev => [...prev, ...acceptedFiles]);
    }
  });

  // GI Certificate dropzone
  const giCertificateDropzone = useDropzone({
    accept: {
      'application/pdf': ['.pdf'],
      'image/*': ['.jpeg', '.png', '.jpg']
    },
    maxFiles: 1,
    maxSize: 5242880, // 5MB
    onDrop: acceptedFiles => {
      if (acceptedFiles.length > 0) {
        setGiCertificate(acceptedFiles[0]);
      }
    }
  });

  // Making video dropzone
  const makingVideoDropzone = useDropzone({
    accept: {
      'video/*': ['.mp4', '.webm', '.mov']
    },
    maxFiles: 1,
    maxSize: 52428800, // 50MB
    onDrop: acceptedFiles => {
      if (acceptedFiles.length > 0) {
        setMakingVideo(acceptedFiles[0]);
      }
    }
  });

  // Check if generation is possible
  const canGenerate = productName.trim() && primaryImage && remainingGenerations > 0;

  // Handle AI generation
  const handleGenerate = async () => {
    if (!canGenerate || !user) return;

    setFormError(null);
    setIsGenerating(true);
    setCurrentStep('generating');

    try {
      // First upload the primary image
      const uploadResult = await uploadFile(primaryImage!, 'product-images', `products/${user.id}`);
      
      if (uploadResult.error) {
        throw new Error('Failed to upload primary image');
      }

      setPrimaryImageUrl(uploadResult.url);

      // Generate AI data
      const result = await generateProductData({
        image_url: uploadResult.url,
        product_name: productName
      });

      if (!result.success || !result.data) {
        throw new Error(result.error || 'AI generation failed');
      }

      // Update form data with AI suggestions
      setAiData(result.data);
      setFormData(prev => ({
        ...prev,
        name: result.data!.product_name,
        description: result.data!.description,
        price: result.data!.price,
        stock: result.data!.stock,
        category: result.data!.category,
      }));

      // Process generated images
      const generatedImagesData: GeneratedImage[] = result.data.generated_images.map((url, index) => ({
        url,
        selected: true, // All selected by default
        isCover: index === 0 // First one is cover by default
      }));
      setGeneratedImages(generatedImagesData);

      // Update remaining generations
      setRemainingGenerations(prev => Math.max(0, prev - 1));
      
      setCurrentStep('editing');
      toast.success('AI suggestions generated successfully!');
    } catch (error: any) {
      console.error('Generation error:', error);
      setFormError(error.message);
      toast.error(error.message);
      setCurrentStep('initial');
    } finally {
      setIsGenerating(false);
    }
  };

  // Handle regeneration
  const handleRegenerate = async () => {
    if (remainingGenerations <= 0) {
      toast.error('No regenerations remaining today');
      return;
    }
    
    await handleGenerate();
  };

  // Toggle generated image selection
  const toggleImageSelection = (index: number) => {
    setGeneratedImages(prev => prev.map((img, i) => 
      i === index ? { ...img, selected: !img.selected } : img
    ));
  };

  // Set cover image
  const setCoverImage = (index: number) => {
    setGeneratedImages(prev => prev.map((img, i) => ({
      ...img,
      isCover: i === index,
      selected: i === index ? true : img.selected // Ensure cover is selected
    })));
  };

  // Remove generated image
  const removeGeneratedImage = (index: number) => {
    setGeneratedImages(prev => {
      const newImages = prev.filter((_, i) => i !== index);
      // If removed image was cover, set first remaining as cover
      if (prev[index].isCover && newImages.length > 0) {
        newImages[0].isCover = true;
        newImages[0].selected = true;
      }
      return newImages;
    });
  };

  // Revert field to AI suggestion
  const revertToAI = (field: keyof AIGenerationResponse) => {
    if (!aiData) return;
    
    setFormData(prev => ({
      ...prev,
      [field]: aiData[field]
    }));
  };

  // Validate final form
  const validateForm = () => {
    if (!formData.name.trim()) return "Product name is required";
    if (!formData.description.trim()) return "Product description is required";
    if (!formData.category) return "Product category is required";
    if (formData.price <= 0) return "Product price must be greater than zero";
    if (formData.stock < 0) return "Product stock cannot be negative";
    
    // Check if at least one image is selected
    const selectedGeneratedImages = generatedImages.filter(img => img.selected);
    if (!primaryImage && selectedGeneratedImages.length === 0 && additionalImages.length === 0) {
      return "At least one product image is required";
    }
    
    // GI Certification is now mandatory
    if (!giCertificate) {
      return "GI Certification is mandatory to list this product.";
    }
    
    // Maker details are mandatory
    if (!formData.maker.name.trim()) {
      return "Please provide maker details before submitting.";
    }
    if (!formData.maker.story.trim()) {
      return "Please provide maker details before submitting.";
    }
    
    return null;
  };

  // Handle final submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      toast.error("Please sign in to submit a product");
      return;
    }

    setFormError(null);
    
    const validationError = validateForm();
    if (validationError) {
      setFormError(validationError);
      toast.error(validationError);
      return;
    }

    setIsSubmitting(true);
    setCurrentStep('submitting');

    try {
      // Upload additional media files
      const uploadPromises = [];
      
      // Upload additional images
      if (additionalImages.length > 0) {
        uploadPromises.push(
          Promise.all(additionalImages.map(image => 
            uploadFile(image, 'product-images', `products/${user.id}`)
          ))
        );
      } else {
        uploadPromises.push(Promise.resolve([]));
      }
      
      // Upload videos
      if (videos.length > 0) {
        uploadPromises.push(
          Promise.all(videos.map(video => 
            uploadFile(video, 'product-videos', `products/${user.id}`)
          ))
        );
      } else {
        uploadPromises.push(Promise.resolve([]));
      }
      
      // Upload making video
      if (makingVideo) {
        uploadPromises.push(
          uploadFile(makingVideo, 'product-videos', `products/${user.id}/making`)
        );
      } else {
        uploadPromises.push(Promise.resolve({ url: '', error: null }));
      }

      const [additionalImageResults, videoResults, makingVideoResult] = await Promise.all(uploadPromises);

      // Filter out failed uploads and get URLs
      const validAdditionalImageUrls = additionalImageResults.filter(result => !result.error).map(result => result.url);
      const validVideoUrls = videoResults.filter(result => !result.error).map(result => result.url);
      
      // Handle making video URL
      const makingVideoUrl = makingVideoResult && !makingVideoResult.error ? makingVideoResult.url : null;

      // Combine all image URLs
      const allImageUrls = [
        ...(primaryImageUrl ? [primaryImageUrl] : []),
        ...validAdditionalImageUrls
      ];

      // Get selected generated images
      const selectedGeneratedImageUrls = generatedImages
        .filter(img => img.selected)
        .map(img => img.url);

      // Prepare product data
      const productData = {
        ...formData,
        images: allImageUrls,
        videos: makingVideoUrl ? [...validVideoUrls, makingVideoUrl] : validVideoUrls,
        generated_images: selectedGeneratedImageUrls,
        giCertificationDocument: giCertificate,
        is_gi_approved: true, // Always true since GI certification is mandatory
      };

      // Submit product
      const result = await submitProduct(productData);

      if (result.success) {
        toast.success("Product uploaded successfully!");
        navigate('/vendor/products');
      } else {
        throw new Error(result.error || "Failed to upload product");
      }
    } catch (error: any) {
      console.error('Product Upload Error:', error);
      const errorMessage = error?.message || "An unexpected error occurred";
      toast.error(errorMessage);
      setFormError(errorMessage);
      setCurrentStep('editing');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Render initial step - minimal input form
  if (currentStep === 'initial') {
    return (
      <DashboardLayout title="Add New Product">
        <div className="max-w-2xl mx-auto">
          <div className="bg-card p-8 rounded-xl border shadow-sm">
            <div className="text-center mb-8">
              <div className="flex items-center justify-center mb-4">
                <Sparkles className="h-8 w-8 text-primary mr-2" />
                <h2 className="text-2xl font-bold text-foreground">AI-Powered Product Upload</h2>
              </div>
              <p className="text-muted-foreground">
                Provide product name + one image. AI will generate details and up to 5 image variations — you can edit before submit.
              </p>
            </div>

            <div className="space-y-6">
              {/* Product Name Input */}
              <div className="space-y-2">
                <Label htmlFor="productName" className="text-sm font-medium">Product Name *</Label>
                <Input
                  id="productName"
                  value={productName}
                  onChange={(e) => setProductName(e.target.value)}
                  placeholder="Enter your product name"
                  className="text-lg h-12"
                />
              </div>

              {/* Primary Image Upload */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Primary Product Image *</Label>
                <div 
                  {...primaryImageDropzone.getRootProps()} 
                  className="border-2 border-dashed border-primary/20 p-8 text-center cursor-pointer hover:bg-primary/5 rounded-lg transition-colors"
                >
                  <input {...primaryImageDropzone.getInputProps()} />
                  {primaryImage ? (
                    <div className="space-y-4">
                      <div className="relative inline-block">
                        <img 
                          src={URL.createObjectURL(primaryImage)} 
                          alt="Primary product" 
                          className="h-32 w-32 object-cover rounded-lg mx-auto"
                        />
                        <Button
                          type="button"
                          variant="destructive"
                          size="sm"
                          className="absolute -top-2 -right-2"
                          onClick={(e) => {
                            e.stopPropagation();
                            setPrimaryImage(null);
                          }}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                      <p className="text-sm font-medium text-foreground">{primaryImage.name}</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <ImagePlus className="h-16 w-16 text-primary mx-auto" />
                      <div>
                        <p className="text-lg font-medium text-foreground">Drop your product image here</p>
                        <p className="text-sm text-muted-foreground">or click to browse</p>
                        <p className="text-xs text-muted-foreground mt-2">
                          Maximum size: 5MB (PNG, JPG, GIF)
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Rate limit info */}
              <div className="bg-amber-50 border border-amber-200 p-4 rounded-lg">
                <div className="flex items-center space-x-2">
                  <AlertTriangle className="h-5 w-5 text-amber-600" />
                  <div>
                    <p className="text-sm font-medium text-amber-800">
                      AI image generation may incur costs — use sparingly
                    </p>
                    <p className="text-xs text-amber-700">
                      Regenerations left today: {remainingGenerations}
                    </p>
                  </div>
                </div>
              </div>

              {/* Generate Button */}
              <Button 
                onClick={handleGenerate}
                disabled={!canGenerate}
                className="w-full text-lg py-6"
                size="lg"
              >
                <Sparkles className="mr-2 h-5 w-5" />
                Generate AI Suggestions
              </Button>

              {formError && (
                <div className="p-4 border border-destructive/20 bg-destructive/10 text-destructive rounded-lg">
                  <div className="flex">
                    <AlertTriangle className="h-5 w-5 mr-2 flex-shrink-0" />
                    <p>{formError}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  // Render generating step - loading with progress
  if (currentStep === 'generating') {
    return (
      <DashboardLayout title="Generating AI Suggestions">
        <div className="max-w-2xl mx-auto">
          <div className="bg-card p-8 rounded-xl border shadow-sm text-center">
            <Loader2 className="h-16 w-16 animate-spin text-primary mx-auto mb-6" />
            <h2 className="text-2xl font-semibold mb-4 text-foreground">
              {generationTime > 10 ? 'Still working — you can cancel. Regenerations are limited.' : 'Generating AI suggestions & images...'}
            </h2>
            <p className="text-muted-foreground mb-6">
              This can take a few seconds. Regenerate is limited.
            </p>
            <div className="w-full bg-secondary rounded-full h-2 mb-6">
              <div className="bg-primary h-2 rounded-full animate-pulse" style={{ width: '70%' }}></div>
            </div>
            <Button 
              variant="outline" 
              onClick={() => {
                setCurrentStep('initial');
                setIsGenerating(false);
              }}
            >
              Cancel
            </Button>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  // Render editing step - full form with AI suggestions
  return (
    <DashboardLayout title="Edit Product Details">
      <form onSubmit={handleSubmit} className="space-y-8 max-w-6xl mx-auto">
        {formError && (
          <div className="p-4 border border-destructive/20 bg-destructive/10 text-destructive rounded-lg">
            <div className="flex">
              <AlertTriangle className="h-5 w-5 mr-2 flex-shrink-0" />
              <p>{formError}</p>
            </div>
          </div>
        )}

        {/* Image Review Section */}
        <div className="bg-card p-6 rounded-xl border shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-foreground">
              Product Images
            </h2>
            <Button
              type="button"
              variant="outline"
              onClick={handleRegenerate}
              disabled={remainingGenerations <= 0 || isGenerating}
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              Regenerate (costly)
            </Button>
          </div>

          {/* Carousel Preview */}
          <div className="mb-6">
            <Carousel className="w-full max-w-md mx-auto">
              <CarouselContent>
                {/* Always include primary image first */}
                {primaryImageUrl && (
                  <CarouselItem>
                    <div className="relative aspect-square rounded-lg overflow-hidden border-2 border-border">
                      <img 
                        src={primaryImageUrl} 
                        alt="Primary product image"
                        className="w-full h-full object-cover"
                      />
                    </div>
                  </CarouselItem>
                )}
                {/* Include only selected generated images */}
                {generatedImages
                  .filter(img => img.selected)
                  .map((image, index) => (
                    <CarouselItem key={`generated-${index}`}>
                      <div className="relative aspect-square rounded-lg overflow-hidden border-2 border-border">
                        <img 
                          src={image.url} 
                          alt={`Generated image ${index + 1}`}
                          className="w-full h-full object-cover"
                        />
                        {/* Cover indicator */}
                        {image.isCover && (
                          <div className="absolute top-2 right-2">
                            <Star className="h-6 w-6 text-yellow-500 fill-yellow-500" />
                          </div>
                        )}
                      </div>
                    </CarouselItem>
                  ))}
              </CarouselContent>
              <CarouselPrevious />
              <CarouselNext />
            </Carousel>
          </div>

          {/* Generated Images Grid - Selection Controls */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-4">
            {generatedImages.map((image, index) => (
              <div key={index} className="relative group">
                <div className="aspect-square rounded-lg overflow-hidden border-2 border-border">
                  <img 
                    src={image.url} 
                    alt={`Generated ${index + 1}`}
                    className="w-full h-full object-cover"
                  />
                </div>
                
                {/* Controls overlay */}
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center space-x-2">
                  <Button
                    type="button"
                    size="sm"
                    variant={image.selected ? "default" : "secondary"}
                    onClick={() => toggleImageSelection(index)}
                  >
                    <Check className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant={image.isCover ? "default" : "secondary"}
                    onClick={() => setCoverImage(index)}
                  >
                    <Star className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="destructive"
                    onClick={() => removeGeneratedImage(index)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>

                {/* Visual indicators without text labels */}
                <div className="absolute top-2 left-2 space-y-1">
                  {image.selected && (
                    <div className="bg-primary/90 text-primary-foreground rounded-full w-6 h-6 flex items-center justify-center">
                      <Check className="h-3 w-3" />
                    </div>
                  )}
                  {image.isCover && (
                    <div className="bg-yellow-500/90 text-white rounded-full w-6 h-6 flex items-center justify-center">
                      <Star className="h-3 w-3 fill-current" />
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          <p className="text-sm text-muted-foreground">
            {generatedImages.filter(img => img.selected).length} of {generatedImages.length} images selected
          </p>
        </div>

        {/* Product Details - Auto-filled with AI suggestions */}
        <div className="bg-card p-6 rounded-xl border shadow-sm">
          <h2 className="text-xl font-semibold mb-6 text-foreground">Product Details</h2>
          
          <div className="grid gap-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Product Name */}
              <div className="space-y-2">
                <Label htmlFor="name" className="flex items-center text-sm font-medium">
                  Product Name *
                  {aiData && (
                    <Badge variant="secondary" className="ml-2 text-xs">
                      <Sparkles className="h-3 w-3 mr-1" />
                      AI suggested
                    </Badge>
                  )}
                </Label>
                <div className="relative">
                  <Input
                    id="name"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Enter product name"
                    className="pr-10"
                  />
                  {aiData && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-2 top-1/2 -translate-y-1/2"
                      onClick={() => revertToAI('product_name')}
                    >
                      <RotateCcw className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
              
              {/* Category */}
              <div className="space-y-2">
                <Label htmlFor="category" className="flex items-center text-sm font-medium">
                  Category *
                  {aiData && (
                    <Badge variant="secondary" className="ml-2 text-xs">
                      <Sparkles className="h-3 w-3 mr-1" />
                      AI suggested
                    </Badge>
                  )}
                </Label>
                <Select 
                  value={formData.category} 
                  onValueChange={(value) => setFormData(prev => ({ ...prev, category: value }))}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select Category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.filter(cat => cat !== 'All').map(category => (
                      <SelectItem key={category} value={category}>{category}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description" className="flex items-center text-sm font-medium">
                Description *
                {aiData && (
                  <Badge variant="secondary" className="ml-2 text-xs">
                    <Sparkles className="h-3 w-3 mr-1" />
                    AI suggested
                  </Badge>
                )}
              </Label>
              <div className="relative">
                <Textarea
                  id="description"
                  required
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Describe your product"
                  className="min-h-[100px] pr-10"
                />
                {aiData && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-2 top-2"
                    onClick={() => revertToAI('description')}
                  >
                    <RotateCcw className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Price */}
              <div className="space-y-2">
                <Label htmlFor="price" className="flex items-center text-sm font-medium">
                  Price (₹) *
                  {aiData && (
                    <Badge variant="secondary" className="ml-2 text-xs">
                      <Sparkles className="h-3 w-3 mr-1" />
                      AI suggested
                    </Badge>
                  )}
                </Label>
                <div className="relative">
                  <Input
                    id="price"
                    type="number"
                    required
                    min="0"
                    step="0.01"
                    value={formData.price}
                    onChange={(e) => setFormData(prev => ({ ...prev, price: parseFloat(e.target.value) || 0 }))}
                    className="pr-10"
                  />
                  {aiData && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-2 top-1/2 -translate-y-1/2"
                      onClick={() => revertToAI('price')}
                    >
                      <RotateCcw className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
              
              {/* Stock */}
              <div className="space-y-2">
                <Label htmlFor="stock" className="flex items-center text-sm font-medium">
                  Stock *
                  {aiData && (
                    <Badge variant="secondary" className="ml-2 text-xs">
                      <Sparkles className="h-3 w-3 mr-1" />
                      AI suggested
                    </Badge>
                  )}
                </Label>
                <div className="relative">
                  <Input
                    id="stock"
                    type="number"
                    required
                    min="0"
                    value={formData.stock}
                    onChange={(e) => setFormData(prev => ({ ...prev, stock: parseInt(e.target.value) || 0 }))}
                    className="pr-10"
                  />
                  {aiData && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-2 top-1/2 -translate-y-1/2"
                      onClick={() => revertToAI('stock')}
                    >
                      <RotateCcw className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
              
              {/* Region */}
              <div className="space-y-2">
                <Label htmlFor="region" className="text-sm font-medium">Region</Label>
                <Select 
                  value={formData.region} 
                  onValueChange={(value) => setFormData(prev => ({ ...prev, region: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select Region" />
                  </SelectTrigger>
                  <SelectContent>
                    {regions.filter(r => r !== 'All Regions').map(region => (
                      <SelectItem key={region} value={region}>{region}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            {/* Location */}
            <div className="space-y-2">
              <Label htmlFor="location" className="text-sm font-medium">Location</Label>
              <Input
                id="location"
                value={formData.location || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))}
                placeholder="Specific location or landmark"
              />
            </div>
          </div>
        </div>

        {/* Maker Details */}
        <div className="bg-card p-6 rounded-xl border shadow-sm">
          <h2 className="text-xl font-semibold mb-6 text-foreground">Maker Details</h2>
          
          <div className="grid gap-6">
            {/* Maker's Name */}
            <div className="space-y-2">
              <Label htmlFor="makerName" className="text-sm font-medium">Maker's Name *</Label>
              <Input
                id="makerName"
                required
                value={formData.maker.name}
                onChange={(e) => setFormData(prev => ({ 
                  ...prev, 
                  maker: { ...prev.maker, name: e.target.value }
                }))}
                placeholder="Enter the maker's name"
              />
            </div>
            
            {/* Maker's Story */}
            <div className="space-y-2">
              <Label htmlFor="makerStory" className="text-sm font-medium">Maker's Story *</Label>
              <Textarea
                id="makerStory"
                required
                value={formData.maker.story}
                onChange={(e) => setFormData(prev => ({ 
                  ...prev, 
                  maker: { ...prev.maker, story: e.target.value }
                }))}
                placeholder="Tell us about the maker and the inspiration behind this product."
                className="min-h-[120px]"
              />
            </div>
            
            {/* Video About Making (Optional) */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Upload Video About the Making of the Product (Optional)</Label>
              <div 
                {...makingVideoDropzone.getRootProps()} 
                className="border-2 border-dashed border-border p-6 text-center cursor-pointer hover:bg-muted/50 rounded-lg transition-colors"
              >
                <input {...makingVideoDropzone.getInputProps()} />
                {makingVideo ? (
                  <div className="space-y-2">
                    <div className="flex items-center justify-center space-x-2">
                      <FileText className="h-8 w-8 text-primary" />
                      <div>
                        <p className="text-sm font-medium text-foreground">{makingVideo.name}</p>
                        <p className="text-xs text-muted-foreground">{(makingVideo.size / (1024 * 1024)).toFixed(1)} MB</p>
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        setMakingVideo(null);
                      }}
                    >
                      <X className="h-4 w-4 mr-1" />
                      Remove
                    </Button>
                  </div>
                ) : (
                  <div className="flex flex-col items-center">
                    <FileText className="h-8 w-8 text-muted-foreground mb-2" />
                    <p className="text-foreground">Upload video about the making process</p>
                    <p className="text-xs text-muted-foreground mt-1">Maximum size: 50MB (MP4, WebM, MOV)</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Additional Media Uploads */}
        <div className="bg-card p-6 rounded-xl border shadow-sm">
          <h2 className="text-xl font-semibold mb-6 text-foreground">Additional Media (Optional)</h2>
          
          {/* Additional Images */}
          <div className="space-y-4 mb-6">
            <Label className="text-sm font-medium">Additional Product Images</Label>
            <div 
              {...additionalImageDropzone.getRootProps()} 
              className="border-2 border-dashed border-border p-6 text-center cursor-pointer hover:bg-muted/50 rounded-lg transition-colors"
            >
              <input {...additionalImageDropzone.getInputProps()} />
              <div className="flex flex-col items-center">
                <Upload className="h-8 w-8 text-muted-foreground mb-2" />
                <p className="text-foreground">Upload additional product images</p>
                <p className="text-xs text-muted-foreground mt-1">Maximum size: 5MB each</p>
              </div>
            </div>
            {additionalImages.length > 0 && (
              <div className="flex gap-2 flex-wrap">
                {additionalImages.map((file, index) => (
                  <div key={index} className="relative">
                    <img 
                      src={URL.createObjectURL(file)} 
                      alt="Additional" 
                      className="h-20 w-20 object-cover rounded border" 
                    />
                    <button 
                      type="button"
                      onClick={() => setAdditionalImages(prev => prev.filter((_, i) => i !== index))}
                      className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full p-1 hover:bg-destructive/90"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Videos */}
          <div className="space-y-4">
            <Label className="text-sm font-medium">Product Videos</Label>
            <div 
              {...videoDropzone.getRootProps()} 
              className="border-2 border-dashed border-border p-6 text-center cursor-pointer hover:bg-muted/50 rounded-lg transition-colors"
            >
              <input {...videoDropzone.getInputProps()} />
              <div className="flex flex-col items-center">
                <FileText className="h-8 w-8 text-muted-foreground mb-2" />
                <p className="text-foreground">Upload product videos</p>
                <p className="text-xs text-muted-foreground mt-1">Maximum size: 30MB each (MP4, WebM, MOV)</p>
              </div>
            </div>
            {videos.length > 0 && (
              <div className="space-y-2">
                {videos.map((file, index) => (
                  <div key={index} className="flex items-center justify-between p-2 bg-muted rounded">
                    <span className="text-sm text-foreground">{file.name}</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setVideos(prev => prev.filter((_, i) => i !== index))}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* GI Certification */}
        <div className="bg-card p-6 rounded-xl border shadow-sm">
          <h2 className="text-xl font-semibold mb-6 text-foreground">Upload GI Certification (Mandatory)</h2>
          
          <div className="space-y-2">
            <Label className="text-sm font-medium">GI Certification Document *</Label>
            <div 
              {...giCertificateDropzone.getRootProps()} 
              className="border-2 border-dashed border-border p-6 text-center cursor-pointer hover:bg-muted/50 rounded-lg transition-colors"
            >
              <input {...giCertificateDropzone.getInputProps()} />
              {giCertificate ? (
                <div className="space-y-2">
                  <FileText className="h-8 w-8 text-primary mx-auto" />
                  <p className="text-sm font-medium text-foreground">{giCertificate.name}</p>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      setGiCertificate(null);
                    }}
                  >
                    <X className="h-4 w-4 mr-1" />
                    Remove
                  </Button>
                </div>
              ) : (
                <div className="flex flex-col items-center">
                  <FileText className="h-8 w-8 text-muted-foreground mb-2" />
                  <p className="text-foreground">Upload GI certification document</p>
                  <p className="text-xs text-muted-foreground mt-1">PDF, JPG, or PNG (Maximum size: 5MB)</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Submit Button */}
        <div className="flex justify-end space-x-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate('/vendor/products')}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={isSubmitting}
            className="min-w-[120px]"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Submitting...
              </>
            ) : (
              'Submit Product'
            )}
          </Button>
        </div>
      </form>
    </DashboardLayout>
  );
};

export default ProductUpload;