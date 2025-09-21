
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ActiveFiltersProps {
  currentCategory: string;
  currentRegion: string;
  priceRange: { min: string; max: string };
  isGiVerified: boolean;
  searchQuery: string;
  handleClearCategory: () => void;
  handleClearRegion: () => void;
  handleClearPrice: () => void;
  handleClearGiVerified: () => void;
  handleClearSearch: () => void;
  handleClearAll: () => void;
}

const ActiveFilters = ({
  currentCategory,
  currentRegion,
  priceRange,
  isGiVerified,
  searchQuery,
  handleClearCategory,
  handleClearRegion,
  handleClearPrice,
  handleClearGiVerified,
  handleClearSearch,
  handleClearAll
}: ActiveFiltersProps) => {
  
  const hasActiveFilters = 
    currentCategory !== 'All' || 
    currentRegion !== 'All Regions' || 
    priceRange.min || 
    priceRange.max || 
    isGiVerified ||
    searchQuery;
  
  if (!hasActiveFilters) return null;
  
  return (
    <div className="flex flex-wrap gap-2 items-center">
      <span className="text-sm text-muted-foreground mr-1">Active filters:</span>
      
      {currentCategory !== 'All' && (
        <Button 
          variant="secondary" 
          size="sm" 
          className="rounded-full text-xs h-7 px-3"
          onClick={handleClearCategory}
        >
          Category: {currentCategory}
          <X className="ml-1 h-3 w-3" />
        </Button>
      )}
      
      {currentRegion !== 'All Regions' && (
        <Button 
          variant="secondary" 
          size="sm" 
          className="rounded-full text-xs h-7 px-3"
          onClick={handleClearRegion}
        >
          Region: {currentRegion}
          <X className="ml-1 h-3 w-3" />
        </Button>
      )}
      
      {(priceRange.min || priceRange.max) && (
        <Button 
          variant="secondary" 
          size="sm" 
          className="rounded-full text-xs h-7 px-3"
          onClick={handleClearPrice}
        >
          Price: {priceRange.min || 0} - {priceRange.max || '∞'}
          <X className="ml-1 h-3 w-3" />
        </Button>
      )}
      
      {isGiVerified && (
        <Button 
          variant="secondary" 
          size="sm" 
          className="rounded-full text-xs h-7 px-3"
          onClick={handleClearGiVerified}
        >
          GI Verified Only
          <X className="ml-1 h-3 w-3" />
        </Button>
      )}
      
      {searchQuery && (
        <Button 
          variant="secondary" 
          size="sm" 
          className="rounded-full text-xs h-7 px-3"
          onClick={handleClearSearch}
        >
          Search: "{searchQuery}"
          <X className="ml-1 h-3 w-3" />
        </Button>
      )}
      
      {hasActiveFilters && (
        <Button 
          variant="ghost" 
          size="sm" 
          className="text-xs text-muted-foreground h-7 px-3"
          onClick={handleClearAll}
        >
          Clear All
        </Button>
      )}
    </div>
  );
};

export default ActiveFilters;
