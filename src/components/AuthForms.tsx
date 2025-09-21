
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, User, Briefcase, ShieldCheck, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export const AuthForms = () => {
  const navigate = useNavigate();
  const { login, register, isAuthenticated, user, redirectToDashboard } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('login');
  
  // Form state
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  
  const [registerName, setRegisterName] = useState('');
  const [registerEmail, setRegisterEmail] = useState('');
  const [registerPassword, setRegisterPassword] = useState('');
  const [registerConfirmPassword, setRegisterConfirmPassword] = useState('');
  const [showRegisterPassword, setShowRegisterPassword] = useState(false);
  const [showRegisterConfirmPassword, setShowRegisterConfirmPassword] = useState(false);
  const [role, setRole] = useState<'customer' | 'vendor' | 'admin'>('customer');
  
  // Form validation state
  const [formErrors, setFormErrors] = useState({
    loginEmail: '',
    loginPassword: '',
    registerName: '',
    registerEmail: '',
    registerPassword: '',
    registerConfirmPassword: ''
  });
  
  useEffect(() => {
    if (isAuthenticated && user) {
      const redirectPath = redirectToDashboard();
      navigate(redirectPath);
    }
  }, [isAuthenticated, user, navigate, redirectToDashboard]);
  
  // Form validation functions
  const validateLoginForm = () => {
    let isValid = true;
    const errors = { ...formErrors };
    
    if (!loginEmail) {
      errors.loginEmail = 'Email is required';
      isValid = false;
    } else if (!/\S+@\S+\.\S+/.test(loginEmail)) {
      errors.loginEmail = 'Email is invalid';
      isValid = false;
    } else {
      errors.loginEmail = '';
    }
    
    if (!loginPassword) {
      errors.loginPassword = 'Password is required';
      isValid = false;
    } else {
      errors.loginPassword = '';
    }
    
    setFormErrors(errors);
    return isValid;
  };
  
  const validateRegisterForm = () => {
    let isValid = true;
    const errors = { ...formErrors };
    
    if (!registerName) {
      errors.registerName = 'Name is required';
      isValid = false;
    } else if (registerName.length < 2) {
      errors.registerName = 'Name must be at least 2 characters';
      isValid = false;
    } else {
      errors.registerName = '';
    }
    
    if (!registerEmail) {
      errors.registerEmail = 'Email is required';
      isValid = false;
    } else if (!/\S+@\S+\.\S+/.test(registerEmail)) {
      errors.registerEmail = 'Email is invalid';
      isValid = false;
    } else {
      errors.registerEmail = '';
    }
    
    if (!registerPassword) {
      errors.registerPassword = 'Password is required';
      isValid = false;
    } else if (registerPassword.length < 6) {
      errors.registerPassword = 'Password must be at least 6 characters';
      isValid = false;
    } else {
      errors.registerPassword = '';
    }
    
    if (!registerConfirmPassword) {
      errors.registerConfirmPassword = 'Please confirm your password';
      isValid = false;
    } else if (registerPassword !== registerConfirmPassword) {
      errors.registerConfirmPassword = 'Passwords do not match';
      isValid = false;
    } else {
      errors.registerConfirmPassword = '';
    }
    
    setFormErrors(errors);
    return isValid;
  };
  
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateLoginForm()) {
      return;
    }
    
    setIsLoading(true);
    
    try {
      await login(loginEmail, loginPassword);
      toast.success('Login successful');
      // Navigation is handled in the useEffect above
    } catch (error) {
      // Error is already handled in the login function
      // toast is shown in the Auth context
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateRegisterForm()) {
      return;
    }
    
    setIsLoading(true);
    
    try {
      console.log('Registering with role:', role);
      await register(registerName, registerEmail, registerPassword, role);
      
      // Show success message
      toast.success('Registration successful! Verify your email to continue.');
      
      // Reset form
      setRegisterName('');
      setRegisterEmail('');
      setRegisterPassword('');
      setRegisterConfirmPassword('');
      
      // Switch to login tab
      setActiveTab('login');
    } catch (error: any) {
      // Error is already handled in the register function
      console.error('Registration error in component:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Helper function to render the appropriate icon based on role
  const getRoleIcon = (roleType: string) => {
    switch (roleType) {
      case 'admin':
        return <ShieldCheck className="h-4 w-4 mr-2 text-purple-500" />;
      case 'vendor':
        return <Briefcase className="h-4 w-4 mr-2 text-blue-500" />;
      case 'customer':
      default:
        return <User className="h-4 w-4 mr-2 text-green-500" />;
    }
  };
  
  // Animation variants
  const fadeIn = {
    hidden: { opacity: 0, y: 10 },
    visible: { opacity: 1, y: 0 }
  };
  
  return (
    <motion.div 
      className="max-w-md w-full mx-auto"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
    >
      <Card className="border-border/30 bg-card/80 backdrop-blur-sm shadow-lg">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid grid-cols-2 w-full bg-muted/50">
            <TabsTrigger value="login" className="data-[state=active]:bg-background/80">Login</TabsTrigger>
            <TabsTrigger value="register" className="data-[state=active]:bg-background/80">Register</TabsTrigger>
          </TabsList>
          
          <TabsContent value="login">
            <motion.div
              initial="hidden"
              animate="visible"
              variants={fadeIn}
              transition={{ duration: 0.4 }}
            >
              <CardHeader>
                <CardTitle className="text-primary">Login</CardTitle>
                <CardDescription>
                  Enter your credentials to access your account
                </CardDescription>
              </CardHeader>
              <form onSubmit={handleLogin}>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email" className={formErrors.loginEmail ? "text-destructive" : ""}>Email</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="example@mail.com"
                      value={loginEmail}
                      onChange={(e) => setLoginEmail(e.target.value)}
                      className={`transition-all duration-200 focus:ring-primary ${formErrors.loginEmail ? "border-destructive focus:ring-destructive" : ""}`}
                      required
                    />
                    {formErrors.loginEmail && (
                      <p className="text-xs text-destructive">{formErrors.loginEmail}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="password" className={formErrors.loginPassword ? "text-destructive" : ""}>Password</Label>
                      <a href="#" className="text-xs text-primary hover:underline">
                        Forgot password?
                      </a>
                    </div>
                    <div className="relative">
                      <Input
                        id="password"
                        type={showLoginPassword ? "text" : "password"}
                        placeholder="••••••••"
                        value={loginPassword}
                        onChange={(e) => setLoginPassword(e.target.value)}
                        className={`transition-all duration-200 pr-10 focus:ring-primary ${formErrors.loginPassword ? "border-destructive focus:ring-destructive" : ""}`}
                        required
                      />
                      <button 
                        type="button" 
                        onClick={() => setShowLoginPassword(!showLoginPassword)}
                        className="absolute inset-y-0 right-0 flex items-center px-3 text-muted-foreground hover:text-foreground"
                      >
                        {showLoginPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                    {formErrors.loginPassword && (
                      <p className="text-xs text-destructive">{formErrors.loginPassword}</p>
                    )}
                  </div>
                </CardContent>
                <CardFooter>
                  <Button 
                    type="submit" 
                    className="w-full bg-gradient-to-r from-primary to-accent hover:shadow-md transition-all duration-300" 
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Logging in...
                      </>
                    ) : (
                      'Login'
                    )}
                  </Button>
                </CardFooter>
              </form>
            </motion.div>
          </TabsContent>
          
          <TabsContent value="register">
            <motion.div
              initial="hidden"
              animate="visible"
              variants={fadeIn}
              transition={{ duration: 0.4 }}
            >
              <CardHeader>
                <CardTitle className="text-primary">Create an account</CardTitle>
                <CardDescription>
                  Enter your information to create an account
                </CardDescription>
              </CardHeader>
              <form onSubmit={handleRegister}>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="name" className={formErrors.registerName ? "text-destructive" : ""}>Full Name</Label>
                    <Input
                      id="name"
                      type="text"
                      placeholder="John Doe"
                      value={registerName}
                      onChange={(e) => setRegisterName(e.target.value)}
                      className={`transition-all duration-200 focus:ring-primary ${formErrors.registerName ? "border-destructive focus:ring-destructive" : ""}`}
                      required
                    />
                    {formErrors.registerName && (
                      <p className="text-xs text-destructive">{formErrors.registerName}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="register-email" className={formErrors.registerEmail ? "text-destructive" : ""}>Email</Label>
                    <Input
                      id="register-email"
                      type="email"
                      placeholder="example@mail.com"
                      value={registerEmail}
                      onChange={(e) => setRegisterEmail(e.target.value)}
                      className={`transition-all duration-200 focus:ring-primary ${formErrors.registerEmail ? "border-destructive focus:ring-destructive" : ""}`}
                      required
                    />
                    {formErrors.registerEmail && (
                      <p className="text-xs text-destructive">{formErrors.registerEmail}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="register-password" className={formErrors.registerPassword ? "text-destructive" : ""}>Password</Label>
                    <div className="relative">
                      <Input
                        id="register-password"
                        type={showRegisterPassword ? "text" : "password"}
                        placeholder="••••••••"
                        value={registerPassword}
                        onChange={(e) => setRegisterPassword(e.target.value)}
                        className={`transition-all duration-200 pr-10 focus:ring-primary ${formErrors.registerPassword ? "border-destructive focus:ring-destructive" : ""}`}
                        required
                      />
                      <button 
                        type="button" 
                        onClick={() => setShowRegisterPassword(!showRegisterPassword)}
                        className="absolute inset-y-0 right-0 flex items-center px-3 text-muted-foreground hover:text-foreground"
                      >
                        {showRegisterPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                    {formErrors.registerPassword && (
                      <p className="text-xs text-destructive">{formErrors.registerPassword}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="confirm-password" className={formErrors.registerConfirmPassword ? "text-destructive" : ""}>Confirm Password</Label>
                    <div className="relative">
                      <Input
                        id="confirm-password"
                        type={showRegisterConfirmPassword ? "text" : "password"}
                        placeholder="••••••••"
                        value={registerConfirmPassword}
                        onChange={(e) => setRegisterConfirmPassword(e.target.value)}
                        className={`transition-all duration-200 pr-10 focus:ring-primary ${formErrors.registerConfirmPassword ? "border-destructive focus:ring-destructive" : ""}`}
                        required
                      />
                      <button 
                        type="button" 
                        onClick={() => setShowRegisterConfirmPassword(!showRegisterConfirmPassword)}
                        className="absolute inset-y-0 right-0 flex items-center px-3 text-muted-foreground hover:text-foreground"
                      >
                        {showRegisterConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                    {formErrors.registerConfirmPassword && (
                      <p className="text-xs text-destructive">{formErrors.registerConfirmPassword}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="role">I am a</Label>
                    <Select
                      value={role}
                      onValueChange={(value) => setRole(value as 'customer' | 'vendor' | 'admin')}
                    >
                      <SelectTrigger className="w-full focus:ring-primary transition-all duration-200">
                        <SelectValue placeholder="Select role" />
                      </SelectTrigger>
                      <SelectContent className="border-border/30 bg-card/95 backdrop-blur-sm">
                        <SelectItem value="customer" className="flex items-center">
                          <div className="flex items-center">
                            {getRoleIcon('customer')}
                            <span>Customer</span>
                          </div>
                        </SelectItem>
                        <SelectItem value="vendor" className="flex items-center">
                          <div className="flex items-center">
                            {getRoleIcon('vendor')}
                            <span>Seller/Vendor</span>
                          </div>
                        </SelectItem>
                        <SelectItem value="admin" className="flex items-center">
                          <div className="flex items-center">
                            {getRoleIcon('admin')}
                            <span>Administrator</span>
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
                <CardFooter>
                  <Button 
                    type="submit" 
                    className="w-full bg-gradient-to-r from-primary to-accent hover:shadow-md transition-all duration-300" 
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Creating account...
                      </>
                    ) : (
                      'Create account'
                    )}
                  </Button>
                </CardFooter>
              </form>
            </motion.div>
          </TabsContent>
        </Tabs>
      </Card>
    </motion.div>
  );
};
