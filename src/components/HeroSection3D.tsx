
import { motion } from 'framer-motion';
import { ArrowRight, ShoppingCart, CreditCard, Laptop, Banknote } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';

const HeroSection3D = () => {
  return (
    <div className="relative w-full overflow-hidden bg-gradient-to-br from-purple-100 via-purple-50 to-white py-16 md:py-24">
      {/* Background floating elements */}
      <div className="absolute inset-0 overflow-hidden">
        <motion.div 
          className="absolute top-1/4 left-[15%] w-16 h-16 rounded-full bg-purple-200 opacity-40"
          animate={{ 
            y: [0, -20, 0],
            opacity: [0.4, 0.6, 0.4]
          }}
          transition={{ 
            duration: 5,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
        <motion.div 
          className="absolute bottom-1/4 right-[20%] w-20 h-20 rounded-full bg-purple-300 opacity-30"
          animate={{ 
            y: [0, -30, 0],
            opacity: [0.3, 0.5, 0.3]
          }}
          transition={{ 
            duration: 7,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 1
          }}
        />
        <motion.div 
          className="absolute top-2/3 left-[30%] w-12 h-12 rounded-full bg-yellow-200 opacity-50"
          animate={{ 
            y: [0, -15, 0],
            opacity: [0.5, 0.7, 0.5]
          }}
          transition={{ 
            duration: 6,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 2
          }}
        />
      </div>

      <div className="container mx-auto px-6 relative">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
          {/* Text content */}
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="max-w-xl"
          >
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold leading-tight text-gray-900 mb-6">
              <span className="text-gradient bg-gradient-to-r from-purple-600 to-indigo-600 inline-block">GI Connect</span>
              <span className="block mt-2">Authentic Products from Local Makers</span>
            </h1>
            <p className="text-lg text-gray-700 mb-8">
              Discover genuine GI-tagged products directly from verified artisans and farmers across India. Support local craftsmanship with every purchase.
            </p>
            <Link to="/marketplace">
              <Button size="lg" className="rounded-full px-8 py-6 text-lg shadow-colorful transition-all duration-300 group">
                <span>Shop Now</span>
                <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
              </Button>
            </Link>
          </motion.div>

          {/* 3D Elements */}
          <div className="relative h-[400px] md:h-[500px]">
            {/* Shopping Cart with GI Products */}
            <motion.div
              className="absolute left-[10%] top-[20%] flex items-center"
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              whileHover={{ scale: 1.05, rotate: -2 }}
            >
              <div className="relative">
                <div className="absolute -top-2 -right-2 w-20 h-20 rounded-full bg-vibrant-saffron flex items-center justify-center shadow-lg transform rotate-12">
                  <span className="text-white font-bold text-sm">ADD TO CART</span>
                </div>
                <div className="bg-gradient-to-r from-amber-200 to-amber-300 p-4 rounded-xl shadow-lg transform -rotate-6">
                  <ShoppingCart className="h-16 w-16 text-amber-600" />
                </div>
                <motion.div
                  className="absolute -bottom-4 -right-4 w-8 h-8 rounded-full bg-yellow-400"
                  animate={{ y: [0, -10, 0] }}
                  transition={{ repeat: Infinity, duration: 2 }}
                />
              </div>
            </motion.div>

            {/* Credit Card */}
            <motion.div
              className="absolute right-[15%] top-[15%]"
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.4 }}
              whileHover={{ scale: 1.05, rotate: 5 }}
            >
              <div className="bg-gradient-to-r from-yellow-400 to-orange-400 p-6 rounded-xl shadow-lg transform rotate-12 h-32 w-52">
                <div className="flex justify-between">
                  <CreditCard className="h-8 w-8 text-white" />
                  <div className="text-white font-bold">GI Pay</div>
                </div>
                <div className="mt-8 text-white text-sm">**** **** **** 1234</div>
                <div className="mt-2 text-white text-xs">Valid thru: 12/28</div>
              </div>
            </motion.div>

            {/* Cash Notes */}
            <motion.div
              className="absolute left-[25%] bottom-[20%]"
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.6 }}
              whileHover={{ scale: 1.05, rotate: -5 }}
            >
              <div className="relative">
                <div className="bg-gradient-to-r from-green-300 to-green-400 p-5 rounded-lg shadow-lg transform -rotate-12 h-24 w-40">
                  <Banknote className="h-6 w-6 text-green-700" />
                  <div className="text-right text-green-800 font-bold mt-2">₹500</div>
                </div>
                <div className="absolute top-2 left-2 bg-gradient-to-r from-green-400 to-green-500 p-5 rounded-lg shadow-lg transform -rotate-6 h-24 w-40">
                  <Banknote className="h-6 w-6 text-green-700" />
                  <div className="text-right text-green-800 font-bold mt-2">₹1000</div>
                </div>
              </div>
            </motion.div>

            {/* Laptop with Graph */}
            <motion.div
              className="absolute right-[25%] bottom-[25%]"
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.8 }}
              whileHover={{ scale: 1.05 }}
            >
              <div className="bg-gradient-to-r from-blue-200 to-blue-300 p-4 rounded-xl shadow-lg h-32 w-40">
                <Laptop className="h-8 w-8 text-blue-700 mb-2" />
                <div className="flex h-12 items-end space-x-1">
                  <div className="w-3 bg-red-400 h-4 rounded-t"></div>
                  <div className="w-3 bg-blue-400 h-6 rounded-t"></div>
                  <div className="w-3 bg-green-400 h-8 rounded-t"></div>
                  <div className="w-3 bg-purple-400 h-5 rounded-t"></div>
                  <div className="w-3 bg-yellow-400 h-7 rounded-t"></div>
                  <div className="w-3 bg-indigo-400 h-10 rounded-t"></div>
                </div>
              </div>
            </motion.div>

            {/* Small decorative elements */}
            {[...Array(6)].map((_, i) => (
              <motion.div
                key={i}
                className={`absolute rounded-full ${
                  ['bg-red-300', 'bg-blue-300', 'bg-green-300', 'bg-yellow-300', 'bg-purple-300', 'bg-indigo-300'][i % 6]
                }`}
                style={{
                  width: `${Math.random() * 20 + 10}px`,
                  height: `${Math.random() * 20 + 10}px`,
                  left: `${Math.random() * 80 + 10}%`,
                  top: `${Math.random() * 80 + 10}%`,
                }}
                animate={{
                  y: [0, -20, 0],
                  x: [0, Math.random() * 10 - 5, 0],
                  opacity: [0.7, 1, 0.7],
                }}
                transition={{
                  duration: Math.random() * 3 + 4,
                  repeat: Infinity,
                  delay: Math.random() * 2,
                }}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default HeroSection3D;
