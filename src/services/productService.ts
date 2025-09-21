
import { supabase } from '@/integrations/supabase/client';
import { ProductFormData, FileUploadResult } from '@/types/products';

// Upload file to Supabase Storage
export const uploadFile = async (
  file: File, 
  bucket: string, 
  path: string
): Promise<FileUploadResult> => {
  try {
    const fileExt = file.name.split('.').pop();
    const fileName = `${Math.random()}.${fileExt}`;
    const filePath = `${path}/${fileName}`;

    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(filePath, file);

    if (error) {
      console.error('Upload error:', error);
      return { url: '', error: error.message };
    }

    const { data: { publicUrl } } = supabase.storage
      .from(bucket)
      .getPublicUrl(data.path);

    return { url: publicUrl };
  } catch (error: any) {
    console.error('Upload error:', error);
    return { url: '', error: error.message };
  }
};

// Submit product with maker info and GI certification
export const submitProduct = async (productData: ProductFormData): Promise<{ success: boolean; error?: string; productId?: string }> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return { success: false, error: 'User not authenticated' };
    }

    // First, upload maker image if provided
    let makerImageUrl = '';
    if (productData.maker.image) {
      const uploadResult = await uploadFile(
        productData.maker.image, 
        'product-images', 
        `makers/${user.id}`
      );
      
      if (uploadResult.error) {
        console.error('Failed to upload maker image:', uploadResult.error);
        // Continue without maker image rather than failing
      } else {
        makerImageUrl = uploadResult.url;
      }
    }

    // Create or find existing maker
    let makerId = null;
    if (productData.maker.name && productData.maker.story && productData.maker.region) {
      // Check if maker already exists for this vendor
      const { data: existingMaker, error: makerFindError } = await supabase
        .from('makers')
        .select('id')
        .eq('vendor_id', user.id)
        .eq('maker_name', productData.maker.name)
        .eq('maker_region', productData.maker.region)
        .maybeSingle();

      if (makerFindError && makerFindError.code !== 'PGRST116') {
        console.error('Error finding maker:', makerFindError);
        return { success: false, error: 'Failed to check existing makers' };
      }

      if (existingMaker) {
        makerId = existingMaker.id;
        
        // Update existing maker with new image if provided
        if (makerImageUrl) {
          const { error: updateError } = await supabase
            .from('makers')
            .update({
              maker_image_url: makerImageUrl,
              maker_story: productData.maker.story
            })
            .eq('id', makerId);
            
          if (updateError) {
            console.error('Error updating maker image:', updateError);
          }
        }
      } else {
        // Create new maker
        const { data: newMaker, error: makerError } = await supabase
          .from('makers')
          .insert({
            vendor_id: user.id,
            maker_name: productData.maker.name,
            maker_story: productData.maker.story,
            maker_region: productData.maker.region,
            maker_image_url: makerImageUrl || null
          })
          .select('id')
          .single();

        if (makerError) {
          console.error('Error creating maker:', makerError);
          return { success: false, error: 'Failed to create maker record' };
        }

        makerId = newMaker.id;
      }
    }

    // Upload GI certification document if provided
    let giCertificateUrl = null;
    if (productData.is_gi_approved && productData.giCertificationDocument) {
      try {
        const certUploadResult = await uploadFile(
          productData.giCertificationDocument,
          'gi-certification-docs',
          `gi-certificates/${user.id}`
        );

        if (certUploadResult.error) {
          console.error('Failed to upload GI certificate:', certUploadResult.error);
          return { 
            success: false, 
            error: 'Failed to upload GI certificate. Please try again.' 
          };
        }

        giCertificateUrl = certUploadResult.url;
      } catch (certError) {
        console.error('Error uploading GI certificate:', certError);
        return { 
          success: false, 
          error: 'Failed to upload GI certificate. Please try again.' 
        };
      }
    }

    // Create the product record - always start with pending status
    const { data: product, error: productError } = await supabase
      .from('products')
      .insert({
        vendor_id: user.id,
        name: productData.name,
        description: productData.description,
        price: productData.price,
        stock: productData.stock,
        category: productData.category,
        region: productData.region,
        location: productData.location,
        images: productData.images || [],
        videos: productData.videos || [],
        is_gi_approved: false,
        gi_status: productData.is_gi_approved ? 'pending' : 'not_applicable',
        gi_certificate_url: giCertificateUrl,
        maker_id: makerId,
        generated_images: productData.generated_images || []
      })
      .select('id')
      .single();

    if (productError) {
      console.error('Error creating product:', productError);
      return { success: false, error: 'Failed to create product' };
    }

    // Create notification for admin about new GI certification request if needed
    if (productData.is_gi_approved && giCertificateUrl) {
      const { error: notificationError } = await supabase
        .from('notifications')
        .insert({
          type: 'gi_certification_request',
          title: 'New GI Certification Request',
          message: `Product "${productData.name}" requires GI certification review`,
          priority: 'medium',
          action_url: '/admin/gi-verification',
          entity_id: product.id,
          user_id: null // null means it's for all admins
        });

      if (notificationError) {
        console.error('Error creating notification:', notificationError);
      }
    }

    return { success: true, productId: product.id };
  } catch (error: any) {
    console.error('Error in submitProduct:', error);
    return { success: false, error: error.message || 'An unexpected error occurred' };
  }
};
