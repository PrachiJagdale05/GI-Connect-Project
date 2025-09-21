
import { useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { AuthForms } from '@/components/AuthForms';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';

const Login = () => {
  const navigate = useNavigate();
  const { isAuthenticated, user, loading, redirectToDashboard } = useAuth();
  
  useEffect(() => {
    // Only redirect if authentication is confirmed and not still loading
    if (isAuthenticated && !loading && user) {
      const redirectPath = redirectToDashboard();
      console.log(`User authenticated as ${user.role}, redirecting to:`, redirectPath);
      navigate(redirectPath);
    }
  }, [isAuthenticated, user, loading, navigate, redirectToDashboard]);
  
  return (
    <div className="min-h-screen flex flex-col bg-background relative overflow-hidden">
      {/* Background Image with Overlay */}
      <div 
        className="absolute inset-0 bg-cover bg-center bg-no-repeat z-0" 
        style={{ 
          backgroundImage: "url('https://images.unsplash.com/photo-1582560474992-385ebb9b29a4?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2070&q=80')",
          backgroundPosition: "center"
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-r from-background/95 to-background/75 backdrop-blur-sm"></div>
      </div>

      {/* Cultural Patterns */}
      <div className="absolute top-0 left-0 w-full h-16 bg-gradient-spice opacity-10 z-0"></div>
      <div className="absolute bottom-0 left-0 w-full h-16 bg-gradient-peacock opacity-10 z-0"></div>
      <div className="absolute top-20 right-10 w-32 h-32 rounded-full bg-gradient-lotus opacity-20 blur-xl z-0"></div>
      <div className="absolute bottom-20 left-10 w-40 h-40 rounded-full bg-gradient-saffron opacity-20 blur-xl z-0"></div>

      {/* Back to Home Button */}
      <div className="relative z-10 p-6">
        <Button 
          variant="ghost" 
          size="sm" 
          asChild
          className="hover:bg-white/10"
        >
          <Link to="/">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Home
          </Link>
        </Button>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col justify-center items-center p-4 md:p-8 relative z-10">
        <motion.div 
          className="w-full max-w-md"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="text-center mb-8">
            <motion.h1 
              className="text-3xl md:text-4xl font-serif font-bold tracking-tight bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2, duration: 0.4 }}
            >
              Welcome to GI Connect
            </motion.h1>
            <motion.p 
              className="text-muted-foreground mt-2"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3, duration: 0.5 }}
            >
              Sign in to your account or create a new one
            </motion.p>
          </div>
          
          <AuthForms />
        </motion.div>
      </div>
      
      <footer className="py-6 text-center text-sm text-muted-foreground relative z-10 backdrop-blur-sm bg-background/30">
        © {new Date().getFullYear()} GI Connect. All rights reserved.
      </footer>
    </div>
  );
};

export default Login;
