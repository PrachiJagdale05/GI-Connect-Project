
import { motion } from 'framer-motion';
import { Product } from '@/types/products';
import ProductCard from '@/components/ProductCard';

interface MakerProductsProps {
  makerName: string;
  products: Product[];
}

export const MakerProducts = ({ makerName, products }: MakerProductsProps) => {
  return (
    <motion.div 
      className="py-8"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.4 }}
    >
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-semibold">Products by {makerName}</h2>
        <span className="text-sm text-muted-foreground">
          {products.length} {products.length === 1 ? 'Product' : 'Products'}
        </span>
      </div>
      
      {products.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {products.map((product, index) => (
            <ProductCard key={product.id} product={product} index={index} />
          ))}
        </div>
      ) : (
        <div className="text-center py-8 bg-white rounded-xl shadow-soft">
          <p className="text-muted-foreground">No products found for this maker.</p>
        </div>
      )}
    </motion.div>
  );
};

export default MakerProducts;
