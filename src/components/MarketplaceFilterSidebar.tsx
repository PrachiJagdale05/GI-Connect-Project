
import { useState } from 'react';
import { Filter, Award, SlidersHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { categories, regions } from '@/types/products';

interface MarketplaceFilterSidebarProps {
  currentCategory: string;
  setCurrentCategory: (category: string) => void;
  currentRegion: string;
  setCurrentRegion: (region: string) => void;
  priceRange: { min: string; max: string };
  setPriceRange: (range: { min: string; max: string }) => void;
  isGiVerified: boolean;
  setIsGiVerified: (verified: boolean) => void;
  sortBy: string;
  setSortBy: (sort: string) => void;
  clearAllFilters: () => void;
  className?: string;
  isMobile?: boolean;
}

export const MarketplaceFilterSidebar = ({
  currentCategory,
  setCurrentCategory,
  currentRegion,
  setCurrentRegion,
  priceRange,
  setPriceRange,
  isGiVerified,
  setIsGiVerified,
  sortBy,
  setSortBy,
  clearAllFilters,
  className = '',
  isMobile = false
}: MarketplaceFilterSidebarProps) => {
  
  const handlePriceChange = (type: 'min' | 'max', value: string) => {
    // Fix the type error by directly creating a new object instead of using a function
    const newPriceRange = {
      ...priceRange,
      [type]: value
    };
    setPriceRange(newPriceRange);
  };

  return (
    <div className={`space-y-6 ${className}`}>
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center">
            <Filter className="h-5 w-5 mr-2 text-vibrant-peacock" />
            Filter Products
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          {/* Category Filter */}
          <div>
            <Label className="font-medium mb-1.5 block">Category</Label>
            <Select value={currentCategory} onValueChange={setCurrentCategory}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((category) => (
                  <SelectItem key={category} value={category}>
                    {category}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          {/* Region Filter */}
          <div>
            <Label className="font-medium mb-1.5 block">Region</Label>
            <Select value={currentRegion} onValueChange={setCurrentRegion}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select region" />
              </SelectTrigger>
              <SelectContent>
                {regions.map((region) => (
                  <SelectItem key={region} value={region}>
                    {region}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          {/* Price Range */}
          <div>
            <Label className="font-medium mb-1.5 block">Price Range (₹)</Label>
            <div className="flex items-center gap-2">
              <Input 
                type="number" 
                placeholder="Min" 
                value={priceRange.min}
                onChange={(e) => handlePriceChange('min', e.target.value)}
                className="w-full"
              />
              <span className="text-muted-foreground">-</span>
              <Input 
                type="number" 
                placeholder="Max" 
                value={priceRange.max}
                onChange={(e) => handlePriceChange('max', e.target.value)}
                className="w-full"
              />
            </div>
          </div>
          
          {/* Sort By */}
          <div>
            <Label className="font-medium mb-1.5 block">Sort By</Label>
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="popular">Popularity</SelectItem>
                <SelectItem value="newest">Newest First</SelectItem>
                <SelectItem value="price_low">Price: Low to High</SelectItem>
                <SelectItem value="price_high">Price: High to Low</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          {/* GI Verification Toggle */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="font-medium">GI Verified Only</Label>
              <p className="text-sm text-muted-foreground">Show only products with GI certification</p>
            </div>
            <Switch 
              checked={isGiVerified}
              onCheckedChange={setIsGiVerified}
            />
          </div>
          
          <Separator />
          
          {/* Clear Filters Button */}
          <Button 
            variant="outline" 
            onClick={clearAllFilters}
            className="w-full"
          >
            Clear All Filters
          </Button>
        </CardContent>
      </Card>
      
      {!isMobile && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center">
              <Award className="h-5 w-5 mr-2 text-vibrant-mehendi" />
              About GI Products
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Geographical Indication (GI) tagged products represent authentic items from specific regions, made with traditional methods and local materials.
            </p>
            <Button variant="link" className="p-0 h-auto" asChild>
              <a href="/about-gi" className="text-vibrant-peacock">Learn more about GI certification</a>
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
