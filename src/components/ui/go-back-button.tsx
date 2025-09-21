
"use client";

import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";

interface GoBackButtonProps {
  className?: string;
}

export function GoBackButton({ className }: GoBackButtonProps) {
  const navigate = useNavigate();

  const handleGoBack = () => {
    navigate(-1);
  };

  return (
    <motion.div
      initial={{ opacity: 0.9, scale: 1 }}
      whileHover={{ scale: 1.05 }}
      className={className}
    >
      <Button
        variant="back"
        size="back"
        className="flex items-center gap-1"
        onClick={handleGoBack}
      >
        <ArrowLeft className="h-4 w-4" />
        <span>Back</span>
      </Button>
    </motion.div>
  );
}
