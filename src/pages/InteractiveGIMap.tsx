
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, GeoJSON, useMap } from 'react-leaflet';
import { motion, AnimatePresence } from 'framer-motion';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { toast } from '@/hooks/use-toast';
import { Search, X, MapPin, Award, ExternalLink } from 'lucide-react';
import 'leaflet/dist/leaflet.css';

// Mock data for GI products by region
const mockGIProducts = {
  'Karnataka': [
    { id: 1, name: 'Mysore Silk', price: 8500, image: '/placeholder.svg', isGIApproved: true, region: 'Karnataka', story: 'Traditional silk sarees with pure gold zari...' },
    { id: 2, name: 'Bidriware', price: 3200, image: '/placeholder.svg', isGIApproved: true, region: 'Karnataka', story: 'Metal handicraft from Bidar...' },
    { id: 3, name: 'Channapatna Toys', price: 450, image: '/placeholder.svg', isGIApproved: true, region: 'Karnataka', story: 'Wooden toys made with natural colors...' },
  ],
  'Tamil Nadu': [
    { id: 4, name: 'Kancheepuram Silk', price: 9800, image: '/placeholder.svg', isGIApproved: true, region: 'Tamil Nadu', story: 'Royal silk weaving tradition...' },
    { id: 5, name: 'Thanjavur Paintings', price: 12000, image: '/placeholder.svg', isGIApproved: true, region: 'Tamil Nadu', story: 'Gold leaf embellished paintings...' },
    { id: 6, name: 'Madurai Jasmine', price: 120, image: '/placeholder.svg', isGIApproved: false, region: 'Tamil Nadu', story: 'Fragrant jasmine variety...' },
  ],
  'Kerala': [
    { id: 7, name: 'Aranmula Kannadi', price: 15000, image: '/placeholder.svg', isGIApproved: true, region: 'Kerala', story: 'Metal mirrors with unique reflective properties...' },
    { id: 8, name: 'Kasaragod Sarees', price: 3500, image: '/placeholder.svg', isGIApproved: true, region: 'Kerala', story: 'Hand-woven cotton sarees...' },
  ],
  'Maharashtra': [
    { id: 9, name: 'Paithani Sarees', price: 12000, image: '/placeholder.svg', isGIApproved: true, region: 'Maharashtra', story: 'Silk sarees with peacock motifs...' },
    { id: 10, name: 'Warli Painting', price: 2800, image: '/placeholder.svg', isGIApproved: true, region: 'Maharashtra', story: 'Tribal art with geometric patterns...' },
  ],
  'West Bengal': [
    { id: 11, name: 'Darjeeling Tea', price: 1200, image: '/placeholder.svg', isGIApproved: true, region: 'West Bengal', story: 'World-famous tea from the hills...' },
    { id: 12, name: 'Shantiniketan Leather', price: 1800, image: '/placeholder.svg', isGIApproved: true, region: 'West Bengal', story: 'Unique leather crafts...' },
  ],
  'Gujarat': [
    { id: 13, name: 'Kutch Embroidery', price: 4500, image: '/placeholder.svg', isGIApproved: true, region: 'Gujarat', story: 'Intricate thread work on textiles...' },
    { id: 14, name: 'Patan Patola', price: 25000, image: '/placeholder.svg', isGIApproved: true, region: 'Gujarat', story: 'Double ikat woven sarees...' },
  ],
  'Rajasthan': [
    { id: 15, name: 'Blue Pottery', price: 2200, image: '/placeholder.svg', isGIApproved: true, region: 'Rajasthan', story: 'Persian-influenced ceramic art...' },
    { id: 16, name: 'Sanganer Hand Block Print', price: 1500, image: '/placeholder.svg', isGIApproved: true, region: 'Rajasthan', story: 'Traditional textile printing technique...' },
  ],
  'Uttar Pradesh': [
    { id: 17, name: 'Lucknow Chikankari', price: 3800, image: '/placeholder.svg', isGIApproved: true, region: 'Uttar Pradesh', story: 'Delicate shadow-work embroidery...' },
    { id: 18, name: 'Banaras Brocades', price: 18000, image: '/placeholder.svg', isGIApproved: true, region: 'Uttar Pradesh', story: 'Gold and silver thread weaving...' },
  ],
};

// GeoJSON data for India (simplified for this example)
// In a real implementation, you would use a more detailed GeoJSON file
const indiaGeoJSON = {
  type: "FeatureCollection",
  features: [
    {
      type: "Feature",
      properties: { name: "Karnataka", id: "KA" },
      geometry: { type: "Polygon", coordinates: [[[76.5, 14.5], [77.5, 14.5], [77.5, 15.5], [76.5, 15.5], [76.5, 14.5]]] }
    },
    {
      type: "Feature",
      properties: { name: "Tamil Nadu", id: "TN" },
      geometry: { type: "Polygon", coordinates: [[[78.0, 11.0], [79.5, 11.0], [79.5, 13.0], [78.0, 13.0], [78.0, 11.0]]] }
    },
    {
      type: "Feature",
      properties: { name: "Kerala", id: "KL" },
      geometry: { type: "Polygon", coordinates: [[[75.5, 8.5], [77.0, 8.5], [77.0, 12.5], [75.5, 12.5], [75.5, 8.5]]] }
    },
    {
      type: "Feature",
      properties: { name: "Maharashtra", id: "MH" },
      geometry: { type: "Polygon", coordinates: [[[73.0, 16.0], [78.0, 16.0], [78.0, 21.0], [73.0, 21.0], [73.0, 16.0]]] }
    },
    {
      type: "Feature",
      properties: { name: "West Bengal", id: "WB" },
      geometry: { type: "Polygon", coordinates: [[[86.0, 22.0], [88.0, 22.0], [88.0, 26.0], [86.0, 26.0], [86.0, 22.0]]] }
    },
    {
      type: "Feature",
      properties: { name: "Gujarat", id: "GJ" },
      geometry: { type: "Polygon", coordinates: [[[68.0, 20.0], [73.0, 20.0], [73.0, 24.0], [68.0, 24.0], [68.0, 20.0]]] }
    },
    {
      type: "Feature",
      properties: { name: "Rajasthan", id: "RJ" },
      geometry: { type: "Polygon", coordinates: [[[70.0, 24.0], [77.0, 24.0], [77.0, 28.0], [70.0, 28.0], [70.0, 24.0]]] }
    },
    {
      type: "Feature",
      properties: { name: "Uttar Pradesh", id: "UP" },
      geometry: { type: "Polygon", coordinates: [[[77.0, 25.0], [84.0, 25.0], [84.0, 29.0], [77.0, 29.0], [77.0, 25.0]]] }
    }
  ]
};

// Map center coordinates (approximate center of India)
const INDIA_CENTER = [20.5937, 78.9629];
const DEFAULT_ZOOM = 5;

// Styling for the GeoJSON layers
const regionStyle = {
  weight: 1,
  opacity: 1,
  color: 'white',
  fillOpacity: 0.7,
  fillColor: '#FF9800'
};

interface Product {
  id: number;
  name: string;
  price: number;
  image: string;
  isGIApproved: boolean;
  region: string;
  story: string;
}

const InteractiveGIMap: React.FC = () => {
  const [selectedRegion, setSelectedRegion] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [visibleProducts, setVisibleProducts] = useState<Product[]>([]);
  const mapRef = useRef<any>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (selectedRegion && mockGIProducts[selectedRegion]) {
      setVisibleProducts(
        mockGIProducts[selectedRegion].filter(product => 
          product.name.toLowerCase().includes(searchQuery.toLowerCase())
        )
      );
    } else {
      setVisibleProducts([]);
    }
  }, [selectedRegion, searchQuery]);

  const onEachFeature = (feature: any, layer: any) => {
    if (feature.properties && feature.properties.name) {
      const regionName = feature.properties.name;
      
      // Add popups and click events
      layer.bindPopup(`<b>${regionName}</b><br>${mockGIProducts[regionName]?.length || 0} GI Products`);
      
      layer.on({
        mouseover: (e: any) => {
          const layer = e.target;
          layer.setStyle({
            weight: 2,
            color: '#666',
            dashArray: '',
            fillOpacity: 0.9,
            fillColor: '#FFA726'
          });
          layer.bringToFront();
        },
        mouseout: (e: any) => {
          const layer = e.target;
          layer.setStyle(regionStyle);
        },
        click: (e: any) => {
          const region = e.target.feature.properties.name;
          setSelectedRegion(region);
          toast({
            title: `${region} Selected`,
            description: `Displaying ${mockGIProducts[region]?.length || 0} GI products from ${region}`,
          });
        }
      });
    }
  };

  // Function to handle "View Story" button click
  const handleViewStory = (product: Product) => {
    toast({
      title: "Feature Coming Soon",
      description: `The story of ${product.name} will be available soon!`,
      variant: "default",
    });
  };

  // Function to handle filter reset
  const resetFilter = () => {
    setSearchQuery('');
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="bg-gradient-to-r from-vibrant-peacock to-teal-400 rounded-lg p-6 mb-8 text-white">
        <h1 className="text-3xl md:text-4xl font-serif font-bold mb-2">Geographical Indication Map of India</h1>
        <p className="text-lg opacity-90">Explore India's rich heritage of GI-tagged products region by region</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Map Container */}
        <div className="lg:col-span-2 bg-white rounded-xl shadow-medium overflow-hidden h-[600px] relative">
          <MapContainer 
            center={INDIA_CENTER as [number, number]} 
            zoom={DEFAULT_ZOOM} 
            style={{ height: "100%", width: "100%" }}
            ref={mapRef}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <GeoJSON 
              data={indiaGeoJSON as any}
              style={() => regionStyle}
              onEachFeature={onEachFeature}
            />
          </MapContainer>
          
          <div className="absolute top-4 left-4 right-4 bg-white/90 backdrop-blur-sm rounded-lg shadow-soft p-3 z-[1000]">
            <div className="text-sm font-medium text-muted-foreground mb-2">Click on a region to explore GI products</div>
            <div className="flex items-center gap-2 text-xs">
              <div className="flex items-center gap-1">
                <span className="inline-block w-3 h-3 rounded-full bg-[#FF9800]"></span>
                <span>Available Data</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="inline-block w-3 h-3 rounded-full bg-[#FFA726]"></span>
                <span>Selected Region</span>
              </div>
            </div>
          </div>
        </div>

        {/* Products Panel */}
        <AnimatePresence>
          {selectedRegion && (
            <motion.div
              initial={{ x: 100, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 100, opacity: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="bg-white rounded-xl shadow-medium overflow-hidden"
            >
              <div className="p-4 bg-gradient-to-r from-vibrant-lotus to-vibrant-silk text-white">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-serif font-bold flex items-center gap-2">
                    <MapPin size={18} />
                    {selectedRegion}
                  </h2>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => setSelectedRegion(null)}
                    className="text-white hover:bg-white/20"
                  >
                    <X size={18} />
                  </Button>
                </div>
                
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500" size={16} />
                  <Input 
                    type="text" 
                    placeholder="Search products..." 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 bg-white/90 border-none focus-visible:ring-white"
                  />
                  {searchQuery && (
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={resetFilter}
                      className="absolute right-2 top-1/2 transform -translate-y-1/2 h-5 w-5 p-0"
                    >
                      <X size={12} />
                    </Button>
                  )}
                </div>
              </div>

              <div className="p-4 max-h-[520px] overflow-y-auto">
                {visibleProducts.length > 0 ? (
                  <div className="grid grid-cols-1 gap-4">
                    {visibleProducts.map((product) => (
                      <motion.div
                        key={product.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3 }}
                        whileHover={{ scale: 1.02 }}
                        className="hover-lift"
                      >
                        <Card>
                          <CardHeader className="pb-2">
                            <div className="flex justify-between items-start">
                              <CardTitle className="text-lg">{product.name}</CardTitle>
                              {product.isGIApproved && (
                                <Badge className="bg-gradient-to-r from-green-500 to-emerald-600 flex items-center gap-1">
                                  <Award size={12} />
                                  GI Verified
                                </Badge>
                              )}
                            </div>
                          </CardHeader>
                          <CardContent className="pb-2">
                            <div className="relative aspect-video rounded-md overflow-hidden mb-3">
                              <img 
                                src={product.image} 
                                alt={product.name} 
                                className="w-full h-full object-cover"
                              />
                              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-2">
                                <div className="text-white font-bold">₹{product.price.toLocaleString()}</div>
                              </div>
                            </div>
                            <p className="text-sm text-muted-foreground line-clamp-2">{product.story}</p>
                          </CardContent>
                          <CardFooter>
                            <Button 
                              variant="outline" 
                              size="sm" 
                              className="w-full gap-1 hover:bg-accent"
                              onClick={() => handleViewStory(product)}
                            >
                              <ExternalLink size={14} />
                              View Maker's Story
                            </Button>
                          </CardFooter>
                        </Card>
                      </motion.div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 px-4">
                    <div className="text-3xl mb-2">🔍</div>
                    <h3 className="text-lg font-medium mb-1">No products found</h3>
                    <p className="text-muted-foreground text-sm">
                      {searchQuery ? 
                        `Try a different search term or explore another region` : 
                        `This region doesn't have any GI products in our database yet`}
                    </p>
                    {searchQuery && (
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="mt-4"
                        onClick={resetFilter}
                      >
                        Clear Search
                      </Button>
                    )}
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* No Region Selected State */}
        {!selectedRegion && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="bg-white rounded-xl shadow-medium p-6 flex flex-col items-center justify-center text-center"
          >
            <div className="text-6xl mb-4">🗺️</div>
            <h2 className="text-xl font-serif font-bold mb-2">Explore India's GI Products</h2>
            <p className="text-muted-foreground max-w-md mx-auto mb-6">
              Click on any region in the map to discover unique Geographical Indication products from that area.
            </p>
            <div className="grid grid-cols-2 gap-3 w-full max-w-xs">
              {Object.keys(mockGIProducts).slice(0, 4).map(region => (
                <Button 
                  key={region}
                  variant="outline" 
                  size="sm"
                  onClick={() => setSelectedRegion(region)}
                  className="bg-gradient-to-r from-muted/50 to-muted/30 hover:from-muted/70 hover:to-muted/50"
                >
                  {region}
                </Button>
              ))}
            </div>
          </motion.div>
        )}
      </div>

      {/* Information Section */}
      <div className="mt-12 bg-white rounded-xl shadow-soft p-6">
        <h2 className="text-2xl font-serif font-bold mb-4">About Geographical Indication (GI) Tags</h2>
        <div className="grid md:grid-cols-3 gap-6">
          <motion.div 
            whileHover={{ y: -5 }}
            className="p-4 rounded-lg bg-gradient-to-r from-vibrant-saffron/10 to-vibrant-marigold/10 border border-vibrant-saffron/20"
          >
            <h3 className="text-lg font-medium mb-2 text-vibrant-saffron">What is a GI Tag?</h3>
            <p className="text-sm text-muted-foreground">
              A geographical indication (GI) is a sign used on products that have a specific geographical origin and possess 
              qualities or a reputation that are due to that origin.
            </p>
          </motion.div>
          <motion.div 
            whileHover={{ y: -5 }}
            className="p-4 rounded-lg bg-gradient-to-r from-vibrant-mehendi/10 to-green-300/10 border border-vibrant-mehendi/20"
          >
            <h3 className="text-lg font-medium mb-2 text-vibrant-mehendi">Why are GI Tags Important?</h3>
            <p className="text-sm text-muted-foreground">
              GI tags protect the livelihood of traditional producers, preserve cultural heritage, and guarantee authentic 
              products to consumers from specific regions.
            </p>
          </motion.div>
          <motion.div 
            whileHover={{ y: -5 }}
            className="p-4 rounded-lg bg-gradient-to-r from-vibrant-peacock/10 to-teal-400/10 border border-vibrant-peacock/20"
          >
            <h3 className="text-lg font-medium mb-2 text-vibrant-peacock">How to Support GI Products?</h3>
            <p className="text-sm text-muted-foreground">
              By purchasing authentic GI products, you support traditional artisans and communities, preserve cultural 
              heritage, and enjoy genuine products with unique qualities.
            </p>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default InteractiveGIMap;
