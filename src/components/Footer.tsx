
import { Link } from 'react-router-dom';
import { Award, Facebook, Instagram, Twitter, Youtube, Mail, MapPin, Phone } from 'lucide-react';

const Footer = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-gray-50 border-t">
      <div className="container mx-auto py-12 px-4 md:px-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Brand Section */}
          <div className="space-y-4">
            <Link to="/" className="flex items-center space-x-2">
              <Award className="h-8 w-8 text-primary" />
              <span className="font-serif text-xl font-semibold">GI Connect</span>
            </Link>
            <p className="text-sm text-gray-600 max-w-xs">
              Preserving heritage, connecting artisans with the world. Your marketplace for authentic GI-tagged products from India.
            </p>
            <div className="flex space-x-4 pt-2">
              <a href="#" className="text-gray-500 hover:text-primary transition-colors">
                <Facebook size={18} />
              </a>
              <a href="#" className="text-gray-500 hover:text-primary transition-colors">
                <Instagram size={18} />
              </a>
              <a href="#" className="text-gray-500 hover:text-primary transition-colors">
                <Twitter size={18} />
              </a>
              <a href="#" className="text-gray-500 hover:text-primary transition-colors">
                <Youtube size={18} />
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="font-serif text-lg font-medium mb-4">Quick Links</h3>
            <ul className="space-y-2">
              <li>
                <Link to="/marketplace" className="text-gray-600 hover:text-primary transition-colors text-sm">
                  Marketplace
                </Link>
              </li>
              <li>
                <Link to="/about-gi" className="text-gray-600 hover:text-primary transition-colors text-sm">
                  About GI Tags
                </Link>
              </li>
              <li>
                <Link to="/makers" className="text-gray-600 hover:text-primary transition-colors text-sm">
                  Meet Our Makers
                </Link>
              </li>
              <li>
                <Link to="/become-vendor" className="text-gray-600 hover:text-primary transition-colors text-sm">
                  Become a Vendor
                </Link>
              </li>
              <li>
                <Link to="/blog" className="text-gray-600 hover:text-primary transition-colors text-sm">
                  Blog & Stories
                </Link>
              </li>
            </ul>
          </div>

          {/* Categories */}
          <div>
            <h3 className="font-serif text-lg font-medium mb-4">Categories</h3>
            <ul className="space-y-2">
              <li>
                <Link to="/marketplace?category=Food & Beverages" className="text-gray-600 hover:text-primary transition-colors text-sm">
                  Food & Beverages
                </Link>
              </li>
              <li>
                <Link to="/marketplace?category=Textiles & Clothing" className="text-gray-600 hover:text-primary transition-colors text-sm">
                  Textiles & Clothing
                </Link>
              </li>
              <li>
                <Link to="/marketplace?category=Art & Crafts" className="text-gray-600 hover:text-primary transition-colors text-sm">
                  Art & Crafts
                </Link>
              </li>
              <li>
                <Link to="/marketplace?category=Personal Care" className="text-gray-600 hover:text-primary transition-colors text-sm">
                  Personal Care
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact Information */}
          <div>
            <h3 className="font-serif text-lg font-medium mb-4">Contact Us</h3>
            <ul className="space-y-3">
              <li className="flex items-start space-x-3">
                <MapPin size={18} className="text-primary mt-0.5 flex-shrink-0" />
                <span className="text-gray-600 text-sm">
                  123 Heritage Lane, Crafts District,
                  <br />New Delhi, 110001, India
                </span>
              </li>
              <li className="flex items-center space-x-3">
                <Phone size={18} className="text-primary flex-shrink-0" />
                <span className="text-gray-600 text-sm">+91 98765 43210</span>
              </li>
              <li className="flex items-center space-x-3">
                <Mail size={18} className="text-primary flex-shrink-0" />
                <span className="text-gray-600 text-sm">support@giconnect.com</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t mt-12 pt-8">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <p className="text-sm text-gray-500">
              © {currentYear} GI Connect. All rights reserved.
            </p>
            <div className="flex space-x-6 mt-4 md:mt-0">
              <Link to="/privacy-policy" className="text-sm text-gray-500 hover:text-primary transition-colors">
                Privacy Policy
              </Link>
              <Link to="/terms" className="text-sm text-gray-500 hover:text-primary transition-colors">
                Terms of Service
              </Link>
              <Link to="/shipping" className="text-sm text-gray-500 hover:text-primary transition-colors">
                Shipping Policy
              </Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
