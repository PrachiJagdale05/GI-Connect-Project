
import React from 'react';
import { motion } from 'framer-motion';

const TypingIndicator = () => {
  return (
    <div className="flex items-center p-2">
      <div className="flex space-x-1">
        <motion.div
          className="h-2 w-2 rounded-full bg-primary"
          animate={{ scale: [0.8, 1.2, 0.8] }}
          transition={{ duration: 1, repeat: Infinity }}
        />
        <motion.div
          className="h-2 w-2 rounded-full bg-primary"
          animate={{ scale: [0.8, 1.2, 0.8] }}
          transition={{ duration: 1, repeat: Infinity, delay: 0.2 }}
        />
        <motion.div
          className="h-2 w-2 rounded-full bg-primary"
          animate={{ scale: [0.8, 1.2, 0.8] }}
          transition={{ duration: 1, repeat: Infinity, delay: 0.4 }}
        />
      </div>
      <span className="ml-2 text-xs text-muted-foreground">Vendor is typing...</span>
    </div>
  );
};

export default TypingIndicator;
