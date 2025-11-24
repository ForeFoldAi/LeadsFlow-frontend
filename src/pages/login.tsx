import { useState } from "react";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Eye, EyeOff, LogIn, Users, Sparkles, Target, TrendingUp, Shield } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { ButtonLoader } from "@/components/ui/loader";
import { authService, profileService } from "@/lib/apis";
import { LoginDto, AuthResponse, UserResponse } from "@/lib/apis";
import backgroundImage from "@assets/Gemini_Generated_Image_br5r4ibr5r4ibr5r_1754413922041.png";

import ForgotPasswordDialog from "@/components/forgot-password-dialog";
import TwoFactorAuth from "@/components/two-factor-auth";

const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

type LoginForm = z.infer<typeof loginSchema>;

export default function Login() {
  const [, setLocation] = useLocation();
  const [showPassword, setShowPassword] = useState(false);
  const [show2FA, setShow2FA] = useState(false);
  const [twoFactorData, setTwoFactorData] = useState<any>(null);
  const { toast } = useToast();

  const form = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const [isLoading, setIsLoading] = useState(false);

  const onSubmit = async (data: LoginForm) => {
    setIsLoading(true);
    try {
      const loginData: LoginDto = {
        email: data.email,
        password: data.password,
      };

      const response: AuthResponse = await authService.login(loginData);
      
      console.log("Login response received:", {
        requires2FA: response.requires2FA,
        requiresTwoFactor: response.requiresTwoFactor,
        hasUser: !!response.user,
        hasAccessToken: !!response.accessToken,
        hasRefreshToken: !!response.refreshToken
      });
      
      // Check if 2FA is required in the success response
      // Support both requiresTwoFactor (new) and requires2FA (legacy)
      if (response.requiresTwoFactor === true || response.requires2FA === true) {
        console.log("✅ 2FA is required for this account - redirecting to OTP screen");
        setTwoFactorData({
          email: data.email,
          password: data.password,
        });
        setShow2FA(true);
        setIsLoading(false);
        return;
      }
      
      console.log("Proceeding with normal login (no 2FA required)");
      
      // Fetch full user profile to get all user data (including sub-user data)
      let fullUserData: UserResponse;
      try {
        fullUserData = await profileService.getProfile();
      } catch (profileError: any) {
        console.warn("Could not fetch user profile, using login response data:", profileError);
        
        // Safety check: Ensure user object exists before accessing properties
        if (!response.user) {
          throw new Error("No user data returned from login");
        }
        
        // Fallback to login response data if profile fetch fails
        fullUserData = {
          id: response.user.id,
          email: response.user.email,
          fullName: response.user.fullName,
          role: response.user.role,
          companyName: response.user.companyName,
        } as UserResponse;
      }
      
      // Store complete user data in localStorage
      const user = {
        id: fullUserData.id,
        email: fullUserData.email,
        fullName: fullUserData.fullName,
        name: fullUserData.fullName,
        role: fullUserData.role,
        customRole: fullUserData.customRole,
        companyName: fullUserData.companyName,
        companySize: fullUserData.companySize,
        industry: fullUserData.industry,
        customIndustry: fullUserData.customIndustry,
        website: fullUserData.website,
        phoneNumber: fullUserData.phoneNumber,
      };
      localStorage.setItem("user", JSON.stringify(user));

      toast({
        title: "Success",
        description: "Logged in successfully",
      });
      
      // Redirect to dashboard
      setLocation("/");
    } catch (error: any) {
      console.error("Login error:", error);
      
      // Check if 2FA is required (if backend returns specific status code or message)
      // Support both requiresTwoFactor (new) and requires2FA (legacy)
      if (error?.response?.status === 202 || 
          error?.response?.data?.requiresTwoFactor || 
          error?.response?.data?.requires2FA) {
        console.log("2FA is required (from error response)");
        setTwoFactorData({
          email: data.email,
          password: data.password,
        });
        setShow2FA(true);
        setIsLoading(false);
        return;
      }

      const errorMessage = error?.response?.data?.message || 
                          error?.message || 
                          "Failed to login. Please check your credentials.";
      
      toast({
        title: "Error",
        description: Array.isArray(errorMessage) ? errorMessage.join(", ") : errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handle2FASuccess = async (user: any) => {
    console.log("========== 2FA SUCCESS HANDLER ==========");
    console.log("2FA Success - received user data:", JSON.stringify(user, null, 2));
    console.log("Has accessToken:", !!user.accessToken);
    console.log("Has refreshToken:", !!user.refreshToken);
    console.log("Has user.id:", !!user.id);
    console.log("Has user.email:", !!user.email);
    
    // IMPORTANT: Store tokens FIRST before fetching profile
    // The tokens should have been stored by authService.verify2FAOTP
    // But let's verify they exist
    if (user.accessToken && user.refreshToken) {
      console.log("✅ Storing tokens from 2FA verification");
      localStorage.setItem("accessToken", user.accessToken);
      localStorage.setItem("refreshToken", user.refreshToken);
    } else {
      console.error("❌ No tokens received from 2FA verification");
      console.error("This will cause login to fail!");
      toast({
        title: "Error",
        description: "Authentication tokens not received. Please try logging in again.",
        variant: "destructive",
      });
      return;
    }
    
    // Now fetch full user profile (using the stored tokens)
    try {
      console.log("Fetching user profile after 2FA...");
      const fullUserData = await profileService.getProfile();
      console.log("Profile fetched successfully:", fullUserData);
      
      const completeUser = {
        id: fullUserData.id,
        email: fullUserData.email,
        fullName: fullUserData.fullName,
        name: fullUserData.fullName,
        role: fullUserData.role,
        customRole: fullUserData.customRole,
        companyName: fullUserData.companyName,
        companySize: fullUserData.companySize,
        industry: fullUserData.industry,
        customIndustry: fullUserData.customIndustry,
        website: fullUserData.website,
        phoneNumber: fullUserData.phoneNumber,
      };
      localStorage.setItem("user", JSON.stringify(completeUser));
      console.log("User data stored successfully");
    } catch (profileError: any) {
      console.error("Could not fetch user profile after 2FA:", profileError);
      console.warn("Falling back to basic user data");
      
      // Fallback to basic user data
      // Check if we have user data from the 2FA response
      if (!user.id && !user.fullName) {
        console.error("❌ No user data available! Cannot complete login.");
        toast({
          title: "Error",
          description: "Unable to retrieve user information. Please try logging in again.",
          variant: "destructive",
        });
        setLocation("/login");
        return;
      }
      
      const basicUser = {
        id: user.id,
        email: user.email,
        fullName: user.fullName || user.email,
        name: user.fullName || user.email,
        role: user.role || "User",
        companyName: user.companyName,
      };
      localStorage.setItem("user", JSON.stringify(basicUser));
      console.log("Basic user data stored as fallback:", basicUser);
    }
    
    // Verify everything is stored before redirecting
    const storedAccessToken = localStorage.getItem("accessToken");
    const storedRefreshToken = localStorage.getItem("refreshToken");
    const storedUser = localStorage.getItem("user");
    
    console.log("========== PRE-REDIRECT VERIFICATION ==========");
    console.log("Stored accessToken:", storedAccessToken ? "✅ Present" : "❌ Missing");
    console.log("Stored refreshToken:", storedRefreshToken ? "✅ Present" : "❌ Missing");
    console.log("Stored user:", storedUser ? "✅ Present" : "❌ Missing");
    
    if (storedUser) {
      try {
        const parsedUser = JSON.parse(storedUser);
        console.log("Stored user data:", parsedUser);
        console.log("User has ID:", !!parsedUser.id);
      } catch (e) {
        console.error("Failed to parse stored user:", e);
      }
    }
    
    if (!storedAccessToken || !storedRefreshToken || !storedUser) {
      console.error("❌ CRITICAL: Missing required data for login!");
      toast({
        title: "Error",
        description: "Login data incomplete. Please try again.",
        variant: "destructive",
      });
      return;
    }
    
    toast({
      title: "Success",
      description: "Two-factor authentication completed successfully!",
    });
    
    console.log("✅ All checks passed. Redirecting to dashboard...");
    console.log("==========================================");
    window.location.href = "/";
  };

  const handle2FABack = () => {
    setShow2FA(false);
    setTwoFactorData(null);
  };

  // Show 2FA component if required
  if (show2FA && twoFactorData) {
    return (
      <TwoFactorAuth
        email={twoFactorData.email}
        onVerificationSuccess={handle2FASuccess}
        onBack={handle2FABack}
      />
    );
  }

  return (
    <div className="h-screen flex overflow-hidden">
      {/* Left Side - Hero Section */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden">
        <div 
          className="absolute inset-0 bg-gradient-to-br from-blue-50 via-indigo-100 to-purple-200"
          style={{
            backgroundImage: `url(${backgroundImage})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat'
          }}
        >
          <div className="absolute inset-0 bg-gradient-to-br from-white/70 via-blue-50/80 to-purple-100/70"></div>
        </div>
        
        {/* Animated Background Elements */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-20 left-20 w-32 h-32 bg-blue-200/20 rounded-full blur-xl animate-pulse"></div>
          <div className="absolute bottom-40 right-20 w-24 h-24 bg-purple-200/30 rounded-full blur-lg animate-bounce"></div>
          <div className="absolute top-1/2 left-1/3 w-16 h-16 bg-indigo-200/25 rounded-full blur-md animate-ping"></div>
        </div>
        
        <div className="relative z-10 flex flex-col justify-center px-12 py-8 text-gray-800 h-full">
          {/* Logo and Brand */}
          <div className="mb-4 animate-fade-in">
            <div className="text-center mb-4">
              <div className="flex justify-center mb-3">
                <div className="relative">
                  <img 
                    src="/logo.png" 
                    alt="ForeFold AI Logo" 
                    className="h-16 w-16 transition-transform duration-300 hover:scale-110 drop-shadow-lg"
                  />
                  <div className="absolute inset-0 bg-gradient-to-r from-blue-400 to-purple-400 rounded-full opacity-0 hover:opacity-10 transition-opacity duration-300 blur-xl"></div>
                </div>
              </div>
              <div>
                <h1 className="text-4xl font-bold mb-1 drop-shadow-sm bg-gradient-to-r from-gray-800 to-blue-700 bg-clip-text text-transparent">
                  LeadsFlow
                </h1>
                <p className="text-lg text-gray-600 drop-shadow-sm font-medium">
                  powered by <span className="text-purple-600 font-semibold">ForeFold AI</span>
                </p>
              </div>
            </div>
            
            {/* Feature Highlights */}
            <div className="space-y-2 mb-4">
              <h2 className="text-lg font-bold mb-2 text-gray-700 drop-shadow-sm">
                Transform Your Leads Management
              </h2>
              <div className="space-y-2">
                <div className="flex items-center space-x-3 p-2 bg-white/60 backdrop-blur-sm rounded-lg border border-gray-200/50 hover:bg-white/80 transition-all duration-300 group shadow-sm">
                  <div className="p-1.5 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg group-hover:scale-110 transition-transform duration-300 shadow-md">
                    <Target className="h-4 w-4 text-white" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-gray-800">Onboard Potential Clients</h3>
                    <p className="text-gray-600 text-xs">Streamline client acquisition process</p>
                  </div>
                </div>
                
                <div className="flex items-center space-x-3 p-2 bg-white/60 backdrop-blur-sm rounded-lg border border-gray-200/50 hover:bg-white/80 transition-all duration-300 group shadow-sm">
                  <div className="p-1.5 bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg group-hover:scale-110 transition-transform duration-300 shadow-md">
                    <TrendingUp className="h-4 w-4 text-white" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-gray-800">Generate Quality Leads</h3>
                    <p className="text-gray-600 text-xs">AI-powered leads generation strategies</p>
                  </div>
                </div>
                
                <div className="flex items-center space-x-3 p-2 bg-white/60 backdrop-blur-sm rounded-lg border border-gray-200/50 hover:bg-white/80 transition-all duration-300 group shadow-sm">
                  <div className="p-1.5 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-lg group-hover:scale-110 transition-transform duration-300 shadow-md">
                    <Sparkles className="h-4 w-4 text-white" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-gray-800">Convert to Customers</h3>
                    <p className="text-gray-600 text-xs">Intelligent conversion optimization</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          {/* What is LeadsFlow Section */}
          <div className="mt-auto animate-fade-in-up">
            <div className="bg-white/70 backdrop-blur-md rounded-xl p-4 border border-gray-200/50 shadow-lg hover:bg-white/80 transition-all duration-300">
              <div className="flex items-center mb-2">
                <div className="p-1.5 bg-gradient-to-br from-blue-500 to-purple-500 rounded-lg mr-2 shadow-md">
                  <Shield className="h-3 w-3 text-white" />
                </div>
                <h3 className="text-base font-bold text-gray-800">What is LeadsFlow?</h3>
              </div>
              <p className="text-gray-600 text-xs leading-relaxed">
                LeadsFlow is an <span className="text-purple-600 font-semibold">AI-powered leads management platform</span> that helps businesses 
                onboard potential clients, generate quality leads, and convert them into 
                paying customers through intelligent automation and insights.
              </p>
              <div className="mt-2 flex items-center space-x-2">
                <div className="flex space-x-1">
                  <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></div>
                  <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" style={{animationDelay: '0.2s'}}></div>
                  <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" style={{animationDelay: '0.4s'}}></div>
                </div>
                <span className="text-xs text-green-600 font-medium">AI-Powered & Secure</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right Side - Login Form */}
      <div className="flex-1 flex items-center justify-center px-4 sm:px-6 py-8 bg-gray-50 overflow-hidden">
        <div className="w-full max-w-sm sm:max-w-md">
          {/* Mobile Logo */}
          <div className="lg:hidden text-center mb-6">
            <img 
              src="/logo.png" 
              alt="ForeFold AI Logo" 
              className="h-12 w-12 mx-auto mb-3 drop-shadow-lg"
            />
            <h1 className="text-2xl font-bold text-gray-900 mb-1">LeadsFlow</h1>
            <p className="text-sm text-gray-600">powered by ForeFold AI</p>
          </div>

          <Card className="shadow-2xl border-0 bg-white/90 backdrop-blur-sm">
            <CardHeader className="text-center pb-3">
              <CardTitle className="text-xl sm:text-2xl font-bold text-gray-900">
                Welcome to Unlock Potential Customers
              </CardTitle>
              <CardDescription className="text-sm text-gray-600">
                Sign in to access your leads management dashboard
              </CardDescription>
            </CardHeader>
            
            <CardContent className="space-y-4">
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3">
                <div className="space-y-1.5">
                  <Label htmlFor="email" className="text-sm font-medium text-gray-700">
                    Email Address
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="Enter your email"
                    className="h-10 border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                    {...form.register("email")}
                    data-testid="input-email"
                  />
                  {form.formState.errors.email && (
                    <p className="text-xs text-red-600">{form.formState.errors.email.message}</p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="password" className="text-sm font-medium text-gray-700">
                    Password
                  </Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Enter your password"
                      className="h-10 border-gray-300 focus:border-blue-500 focus:ring-blue-500 pr-10"
                      {...form.register("password")}
                      data-testid="input-password"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-2 py-1 hover:bg-transparent"
                      onClick={() => setShowPassword(!showPassword)}
                      data-testid="button-toggle-password"
                    >
                      {showPassword ? (
                        <EyeOff className="h-3 w-3 text-gray-400" />
                      ) : (
                        <Eye className="h-3 w-3 text-gray-400" />
                      )}
                    </Button>
                  </div>
                  {form.formState.errors.password && (
                    <p className="text-xs text-red-600">{form.formState.errors.password.message}</p>
                  )}
                </div>

                <div className="flex justify-end">
                  <ForgotPasswordDialog>
                    <button
                      type="button"
                      className="text-xs text-blue-600 hover:text-blue-500 font-medium transition-colors"
                    >
                      Forgot Password?
                    </button>
                  </ForgotPasswordDialog>
                </div>

                <Button
                  type="submit"
                  className="w-full h-10 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold rounded-lg shadow-lg hover:shadow-xl transition-all duration-200"
                  disabled={isLoading}
                  data-testid="button-login"
                >
                  {isLoading ? (
                    <div className="flex items-center justify-center">
                      <ButtonLoader size={14} color="#ffffff" />
                      <span className="ml-2 text-sm">Signing in...</span>
                    </div>
                  ) : (
                    <>
                      <LogIn className="mr-2 h-3 w-3" />
                      <span className="text-sm">Sign In</span>
                    </>
                  )}
                </Button>
              </form>

              <div className="text-center">
                <p className="text-xs text-gray-600">
                  Don't have an account?{" "}
                  <button
                    onClick={() => setLocation("/signup")}
                    className="text-blue-600 hover:text-blue-500 font-semibold transition-colors"
                    data-testid="link-signup"
                  >
                    Create Account
                  </button>
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Footer */}
          <div className="mt-4 text-center space-y-1">
            <div className="text-xs text-gray-400 space-y-0.5">
              <p>© 2024 ForeFold Consulting Services LLP. All rights reserved.</p>
              <p>ForeFold, LeadsFlow, and related trademarks are owned by ForeFold Consulting Services LLP.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}