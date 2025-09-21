
import React from 'react';
import { Award, CheckCircle, Shield } from 'lucide-react';
import { motion } from 'framer-motion';

const GICertificationBadge = () => {
  return (
    <motion.div 
      className="relative p-6 bg-white rounded-lg shadow-medium border border-gray-100"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <div className="flex items-start space-x-4">
        <div className="flex-shrink-0">
          <div className="p-3 rounded-full bg-gradient-to-r from-vibrant-saffron to-vibrant-marigold relative">
            <Award className="h-6 w-6 text-white" />
            <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-vibrant-saffron opacity-75"></span>
              <CheckCircle className="relative inline-flex h-3 w-3 text-vibrant-saffron" />
            </span>
          </div>
        </div>
        <div className="flex-1">
          <h4 className="text-base font-medium mb-1 flex items-center">
            <span>Geographical Indication (GI) Tag</span>
            <Shield className="h-4 w-4 ml-1.5 text-vibrant-saffron" />
          </h4>
          <p className="text-sm text-muted-foreground">
            A Geographical Indication (GI) tag is an official certification that ensures products originate from a specific region and possess unique qualities or reputation tied to their geographical origin.
          </p>
          <div className="mt-3 px-3 py-2 bg-vibrant-saffron/10 rounded-md border border-vibrant-saffron/20">
            <span className="text-xs font-medium text-vibrant-spice flex items-center">
              <CheckCircle className="h-3 w-3 mr-1" />
              All GI products on our platform are verified for authenticity
            </span>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default GICertificationBadge;
