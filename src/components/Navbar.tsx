
import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { 
  ShoppingCart, 
  User, 
  LogIn, 
  Menu, 
  X, 
  Search,
  ShoppingBag,
  Award,
  Home,
  Users,
  Globe
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAuth } from '@/contexts/AuthContext';
import { useCart } from '@/contexts/CartContext';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const Navbar = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [language, setLanguage] = useState('en');
  const { user, isAuthenticated, logout } = useAuth();
  const { totalItems } = useCart();
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 10) {
        setIsScrolled(true);
      } else {
        setIsScrolled(false);
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    // Close mobile menu when route changes
    setIsMobileMenuOpen(false);
  }, [location.pathname]);

  const dashboardLink = () => {
    if (!user) return '/login';
    
    switch (user.role) {
      case 'admin':
        return '/admin-dashboard';
      case 'vendor':
        return '/vendor-dashboard';
      case 'customer':
        return '/customer-dashboard';
      default:
        return '/';
    }
  };

  const getUserInitials = () => {
    if (!user || !user.name) return 'U';
    return user.name.split(' ').map(n => n[0]).join('').toUpperCase();
  };
  
  // Handle search submission
  const handleSubmitSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/marketplace?search=${encodeURIComponent(searchQuery.trim())}`);
    }
  };
  
  // Handle language change
  const handleLanguageChange = (value: string) => {
    setLanguage(value);
    // Here you would implement the actual language change logic
    console.log(`Language changed to: ${value}`);
    // This would typically involve using i18n library like react-i18next
    
    // Store the selected language in localStorage for persistence
    localStorage.setItem('preferredLanguage', value);
    
    // You could dispatch an event to notify other components about the language change
    const event = new CustomEvent('languageChange', { detail: { language: value } });
    window.dispatchEvent(event);
  };

  // Load the preferred language from localStorage on component mount
  useEffect(() => {
    const savedLanguage = localStorage.getItem('preferredLanguage');
    if (savedLanguage) {
      setLanguage(savedLanguage);
    }
  }, []);

  // List of supported Indian languages
  const languages = [
    { code: 'en', name: 'English' },
    { code: 'hi', name: 'हिन्दी (Hindi)' },
    { code: 'bn', name: 'বাংলা (Bengali)' },
    { code: 'te', name: 'తెలుగు (Telugu)' },
    { code: 'mr', name: 'मराठी (Marathi)' },
    { code: 'ta', name: 'தமிழ் (Tamil)' },
    { code: 'gu', name: 'ગુજરાતી (Gujarati)' },
    { code: 'kn', name: 'ಕನ್ನಡ (Kannada)' },
    { code: 'ml', name: 'മലയാളം (Malayalam)' },
    { code: 'pa', name: 'ਪੰਜਾਬੀ (Punjabi)' },
    { code: 'or', name: 'ଓଡ଼ିଆ (Odia)' }
  ];
  
  // Find current language name for display
  const currentLanguageName = languages.find(lang => lang.code === language)?.name || 'English';

  return (
    <nav 
      className={cn(
        'fixed top-0 left-0 right-0 z-50 transition-all duration-300 ease-in-out py-4 px-6 flex items-center justify-between',
        {
          'bg-white/80 backdrop-blur-md shadow-sm': isScrolled,
          'bg-transparent': !isScrolled
        }
      )}
    >
      <div className="flex items-center">
        <Link to="/" className="flex items-center space-x-2">
          <Award className="h-8 w-8 text-primary" />
          <span className="font-serif text-xl font-semibold">GI Connect</span>
        </Link>
      </div>

      {/* Desktop Navigation with integrated search */}
      <div className="hidden md:flex items-center space-x-4">
        <Link to="/" className="transition hover:text-primary">Home</Link>
        <Link to="/marketplace" className="transition hover:text-primary">Marketplace</Link>
        
        {/* Search form moved next to navigation links */}
        <form onSubmit={handleSubmitSearch} className="relative flex items-center">
          <div className="relative flex items-center">
            <Input 
              type="text" 
              placeholder="Search products..."
              className="h-9 w-48 pl-8 pr-2 text-sm rounded-full bg-white/90 border border-gray-200 focus-visible:ring-primary"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <Search className="h-4 w-4 absolute left-2.5 text-gray-500" />
          </div>
        </form>
        
        <Link to="/about-gi" className="transition hover:text-primary">About GI</Link>
        <Link to="/makers" className="transition hover:text-primary">Meet The Makers</Link>
      </div>

      {/* Right side Icons */}
      <div className="flex items-center space-x-4">
        {/* Mobile search form */}
        <form onSubmit={handleSubmitSearch} className="relative flex md:hidden items-center">
          <div className="relative flex items-center">
            <Input 
              type="text" 
              placeholder="Search..."
              className="h-8 w-36 pl-8 pr-2 text-xs rounded-full bg-white/90 border border-gray-200 focus-visible:ring-primary"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <Search className="h-3.5 w-3.5 absolute left-2.5 text-gray-500" />
          </div>
        </form>
        
        {/* Improved language selector */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button 
              variant="outline" 
              size="sm" 
              className="h-8 px-3 rounded-full border border-gray-200 bg-white/90 hover:bg-white hover:border-primary transition-colors"
            >
              <Globe className="h-4 w-4 mr-1.5" />
              <span className="text-xs font-medium">{language.toUpperCase()}</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56 max-h-72 overflow-y-auto">
            <DropdownMenuLabel>Select Language</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {languages.map((lang) => (
              <DropdownMenuItem 
                key={lang.code}
                className={cn(
                  "cursor-pointer flex items-center gap-2 py-2", 
                  language === lang.code ? "bg-primary/10 text-primary font-medium" : ""
                )}
                onClick={() => handleLanguageChange(lang.code)}
              >
                {language === lang.code && (
                  <span className="w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0" />
                )}
                <span className={language === lang.code ? "ml-1" : "ml-4"}>
                  {lang.name}
                </span>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
        
        <Link to="/cart" className="relative transition hover:text-primary">
          <ShoppingCart className="h-5 w-5" />
          {totalItems > 0 && (
            <Badge 
              variant="destructive" 
              className="absolute -top-2 -right-2 h-5 w-5 flex items-center justify-center p-0 text-xs"
            >
              {totalItems}
            </Badge>
          )}
        </Link>

        {isAuthenticated ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="rounded-full p-0 h-auto" aria-label="User menu">
                <Avatar className="h-8 w-8 transition transform hover:scale-105">
                  <AvatarFallback>{getUserInitials()}</AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>My Account</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link to={dashboardLink()} className="cursor-pointer flex w-full items-center">
                  <User className="mr-2 h-4 w-4" />
                  <span>Dashboard</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link to="/customer-dashboard/orders" className="cursor-pointer flex w-full items-center">
                  <ShoppingBag className="mr-2 h-4 w-4" />
                  <span>My Orders</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                onClick={logout}
                className="cursor-pointer text-red-500 focus:text-red-500"
              >
                Log out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          <Link to="/login">
            <Button variant="ghost" size="sm" className="flex items-center gap-1">
              <LogIn className="h-4 w-4" />
              <span className="hidden sm:inline">Login</span>
            </Button>
          </Link>
        )}

        {/* Mobile menu button */}
        <Button 
          variant="ghost" 
          size="icon" 
          className="md:hidden"
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        >
          {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </Button>
      </div>

      {/* Mobile Navigation */}
      {isMobileMenuOpen && (
        <div className="absolute top-full left-0 right-0 bg-white shadow-md border-t z-50 md:hidden">
          <div className="flex flex-col p-4 space-y-4">
            <Link to="/" className="flex items-center space-x-2 p-2 hover:bg-gray-100 rounded-md">
              <Home className="h-5 w-5" />
              <span>Home</span>
            </Link>
            <Link to="/marketplace" className="flex items-center space-x-2 p-2 hover:bg-gray-100 rounded-md">
              <ShoppingBag className="h-5 w-5" />
              <span>Marketplace</span>
            </Link>
            <Link to="/about-gi" className="flex items-center space-x-2 p-2 hover:bg-gray-100 rounded-md">
              <Award className="h-5 w-5" />
              <span>About GI</span>
            </Link>
            <Link to="/makers" className="flex items-center space-x-2 p-2 hover:bg-gray-100 rounded-md">
              <Users className="h-5 w-5" />
              <span>Meet The Makers</span>
            </Link>
            
            {/* Language selector in mobile menu with selected language indicator */}
            <div className="p-2">
              <label className="block text-sm font-medium mb-1">Language</label>
              <div className="space-y-1.5 pl-2">
                {languages.map((lang) => (
                  <div 
                    key={lang.code}
                    className={cn(
                      "p-1.5 rounded-md flex items-center cursor-pointer",
                      language === lang.code ? "bg-primary/10" : "hover:bg-gray-50"
                    )}
                    onClick={() => handleLanguageChange(lang.code)}
                  >
                    {language === lang.code ? (
                      <span className="w-2 h-2 bg-primary rounded-full mr-2"></span>
                    ) : (
                      <span className="w-2 h-2 border border-gray-300 rounded-full mr-2"></span>
                    )}
                    <span className={cn(
                      "text-sm",
                      language === lang.code ? "font-medium text-primary" : ""
                    )}>
                      {lang.name}
                    </span>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="border-t pt-4">
              {!isAuthenticated && (
                <Link to="/login">
                  <Button className="w-full">Login / Register</Button>
                </Link>
              )}
            </div>
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
