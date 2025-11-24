import { useState } from "react";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Eye, EyeOff, UserPlus, Users, Sparkles, Target, TrendingUp, Shield, Building, Globe, CheckCircle, ArrowRight, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { ButtonLoader } from "@/components/ui/loader";
import { authService } from "@/lib/apis";
import { UserRole, CompanySize, Industry } from "@/lib/apis";
import newLogo from "@assets/ChatGPT Image Aug 5, 2025, 10_54_30 PM_1754414686727.png";
import backgroundImage from "@assets/Gemini_Generated_Image_br5r4ibr5r4ibr5r_1754413922041.png";


// Custom URL validation function that accepts various formats
const flexibleUrlSchema = z.string().refine((value) => {
  if (!value || value === "") return true; // Allow empty strings
  
  // Remove leading/trailing whitespace
  const trimmedValue = value.trim();
  
  // Basic URL patterns
  const urlPatterns = [
    // Full URLs with protocol
    /^https?:\/\/[^\s/$.?#].[^\s]*$/i,
    // URLs without protocol but with www
    /^www\.[^\s/$.?#].[^\s]*$/i,
    // URLs without protocol and www
    /^[^\s/$.?#][^\s]*\.[a-z]{2,}$/i,
    // URLs with subdomains
    /^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)*\.[a-z]{2,}$/i,
    // IP addresses
    /^https?:\/\/\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}(:\d+)?(\/.*)?$/i,
  ];
  
  return urlPatterns.some(pattern => pattern.test(trimmedValue));
}, {
  message: "Please enter a valid website URL (e.g., example.com, www.example.com, https://example.com)"
});

// Name validation - only letters, spaces, and dots
const nameSchema = z.string()
  .min(1, "Name is required")
  .min(2, "Name must be at least 2 characters")
  .max(50, "Name must be less than 50 characters")
  .regex(/^[a-zA-Z\s.]+$/, "Name can only contain letters, spaces, and dots")
  .refine((value) => {
    // Check if name contains at least one letter
    return /[a-zA-Z]/.test(value);
  }, {
    message: "Name must contain at least one letter"
  });

// Phone number validation - allow up to 15 digits and any formatting characters
const phoneSchema = z.string()
  .refine((value) => {
    if (!value || value.trim() === "") return true;
    const digitCount = (value.match(/\d/g) ?? []).length;
    return digitCount > 0 && digitCount <= 15;
  }, {
    message: "Phone number can include formatting characters but must contain up to 15 digits",
  })
  .optional()
  .or(z.literal(""));

// Company name validation - allow any characters up to 100 length
const companyNameSchema = z.string()
  .min(1, "Company name is required")
  .max(100, "Company name must be less than 100 characters");

// Password strength validation
const passwordSchema = z.string()
  .min(8, "Password must be at least 8 characters")
  .max(128, "Password must be less than 128 characters")
  .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
  .regex(/[a-z]/, "Password must contain at least one lowercase letter")
  .regex(/[0-9]/, "Password must contain at least one number")
  .regex(/[^A-Za-z0-9]/, "Password must contain at least one special character")
  .refine((value) => {
    // Check for common passwords (basic check)
    const commonPasswords = [
      'password', '123456', '123456789', 'qwerty', 'abc123', 'password123',
      'admin', 'letmein', 'welcome', 'monkey', 'dragon', 'master'
    ];
    return !commonPasswords.includes(value.toLowerCase());
  }, {
    message: "Password is too common. Please choose a more secure password"
  });

const signupSchema = z.object({
  name: nameSchema,
  email: z.string()
    .min(1, "Email is required")
    .email("Invalid email address")
    .max(254, "Email must be less than 254 characters")
    .toLowerCase(),
  password: passwordSchema,
  confirmPassword: z.string().min(1, "Please confirm your password"),
  companyName: companyNameSchema,
  companySize: z.nativeEnum(CompanySize).optional().refine((val) => val !== undefined, {
    message: "Company size is required",
  }),
  industry: z.nativeEnum(Industry).optional().refine((val) => val !== undefined, {
    message: "Industry is required",
  }),
  customIndustry: z.string().optional(),
  website: flexibleUrlSchema.optional().or(z.literal("")),
  phoneNumber: phoneSchema,
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
}).refine((data) => {
  if (data.industry && data.industry === Industry.OTHER && (!data.customIndustry || data.customIndustry.trim() === "")) {
    return false;
  }
  return true;
}, {
  message: "Please specify your industry",
  path: ["customIndustry"],
});

type SignupForm = z.infer<typeof signupSchema>;

// Password strength indicator component
const PasswordStrengthIndicator = ({ password }: { password: string }) => {
  const getStrength = (password: string) => {
    let score = 0;
    let feedback: string[] = [];

    if (password.length >= 8) score++;
    else feedback.push("At least 8 characters");

    if (/[A-Z]/.test(password)) score++;
    else feedback.push("One uppercase letter");

    if (/[a-z]/.test(password)) score++;
    else feedback.push("One lowercase letter");

    if (/[0-9]/.test(password)) score++;
    else feedback.push("One number");

    if (/[^A-Za-z0-9]/.test(password)) score++;
    else feedback.push("One special character");

    if (password.length >= 12) score++;
    else feedback.push("12+ characters for better security");

    return { score, feedback };
  };

  const { score, feedback } = getStrength(password);
  const percentage = (score / 6) * 100;

  const getColor = (percentage: number) => {
    if (percentage < 50) return "bg-red-500";
    if (percentage < 75) return "bg-yellow-500";
    return "bg-green-500";
  };

  const getText = (percentage: number) => {
    if (percentage < 50) return "Weak";
    if (percentage < 75) return "Fair";
    return "Strong";
  };

  if (!password) return null;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-xs">
        <span className="text-gray-600">Password strength:</span>
        <span className={`font-medium ${percentage >= 75 ? 'text-green-600' : percentage >= 50 ? 'text-yellow-600' : 'text-red-600'}`}>
          {getText(percentage)}
        </span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div 
          className={`h-2 rounded-full transition-all duration-300 ${getColor(percentage)}`}
          style={{ width: `${percentage}%` }}
        ></div>
      </div>
      {feedback.length > 0 && (
        <div className="text-xs text-gray-500 space-y-1">
          <p className="font-medium">Requirements:</p>
          <ul className="list-disc list-inside space-y-0.5">
            {feedback.map((item, index) => (
              <li key={index} className="flex items-center">
                <AlertCircle className="h-3 w-3 mr-1 text-red-400" />
                {item}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

// Password match indicator component
const PasswordMatchIndicator = ({ password, confirmPassword }: { password: string; confirmPassword: string }) => {
  if (!password || !confirmPassword) return null;

  const isMatch = password === confirmPassword;
  const isConfirming = confirmPassword.length > 0;

  if (!isConfirming) return null;

  return (
    <div className="flex items-center space-x-2 text-xs">
      {isMatch ? (
        <>
          <CheckCircle className="h-4 w-4 text-green-500" />
          <span className="text-green-600 font-medium">Passwords match</span>
        </>
      ) : (
        <>
          <AlertCircle className="h-4 w-4 text-red-500" />
          <span className="text-red-600 font-medium">Passwords don't match</span>
        </>
      )}
    </div>
  );
};

// Helper function to format company size label
const formatCompanySizeLabel = (value: string): string => {
  return `${value} employees`;
};

// Helper function to format industry label
const formatIndustryLabel = (value: string): string => {
  // Special cases for complex industry names
  const specialCases: Record<string, string> = {
    'energy-oil-gas': 'Energy (Oil & Gas)',
    'renewable-energy': 'Renewable Energy',
    'paper-pulp': 'Paper & Pulp',
    'printing-publishing': 'Printing & Publishing',
    'manpower-services': 'Manpower Services',
    'food-beverage': 'Food & Beverage',
  };

  if (specialCases[value]) {
    return specialCases[value];
  }

  return value
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

export default function Signup() {
  const [, setLocation] = useLocation();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const { toast } = useToast();

  const form = useForm<SignupForm>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
      confirmPassword: "",
      companyName: "",
      companySize: undefined,
      industry: undefined,
      customIndustry: "",
      website: "",
      phoneNumber: "",
    },
  });

  const [isLoading, setIsLoading] = useState(false);

  const onSubmit = async (data: SignupForm) => {
    setIsLoading(true);
    try {
      // TypeScript: These fields are validated by refine, so they will be defined at this point
      const signupData = {
        fullName: data.name,
        email: data.email,
        role: UserRole.MANAGEMENT,
        companyName: data.companyName,
        companySize: data.companySize!,
        industry: data.industry!,
        customIndustry: data.industry === Industry.OTHER ? data.customIndustry : undefined,
        website: data.website || undefined,
        password: data.password,
        confirmPassword: data.confirmPassword,
      };

      await authService.signup(signupData);
      
      toast({
        title: "Success",
        description: "Account created successfully! Please sign in.",
      });
      setLocation("/login");
    } catch (error: any) {
      console.error("Signup error:", error);
      const errorMessage = error?.response?.data?.message || 
                          error?.message || 
                          "Failed to create account. Please try again.";
      
      toast({
        title: "Error",
        description: Array.isArray(errorMessage) ? errorMessage.join(", ") : errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Watch password and confirmPassword for real-time validation
  const password = form.watch("password");
  const confirmPassword = form.watch("confirmPassword");

  return (
    <div 
      className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden"
      style={{
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        backgroundImage: `url(${backgroundImage})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat'
      }}
    >
      {/* Animated background overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-indigo-900/60 via-purple-900/60 to-pink-900/60"></div>
      
      {/* Floating elements */}
      <div className="absolute top-20 left-20 w-32 h-32 bg-white/10 rounded-full blur-xl animate-pulse"></div>
      <div className="absolute bottom-20 right-20 w-40 h-40 bg-purple-400/20 rounded-full blur-xl animate-pulse delay-1000"></div>
      <div className="absolute top-1/2 left-1/4 w-24 h-24 bg-blue-400/15 rounded-full blur-lg animate-pulse delay-500"></div>
      
      <div className="w-full max-w-5xl relative z-10">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-6">
            <div className="bg-white/20 backdrop-blur-sm rounded-full p-4 mr-4">
            <img 
              src={newLogo} 
              alt="ForeFold AI Logo" 
                className="h-12 w-12 drop-shadow-lg"
            />
          </div>
            <div className="text-left">
              <h1 className="text-4xl font-bold text-white drop-shadow-lg">LeadsFlow</h1>
              <p className="text-white/90 text-lg">powered by ForeFold AI</p>
            </div>
          </div>
          
          
        </div>

                {/* Main Content */}
        <div className="flex justify-center">
          <Card className="bg-white/95 backdrop-blur-md border-0 shadow-2xl rounded-2xl w-full max-w-6xl">
      <CardHeader className="text-center pb-6">
        <CardTitle className="text-3xl font-bold text-gray-900">
          Start Your Free Trial
        </CardTitle>
        <CardDescription className="text-gray-600 text-lg">
          Create your account and begin your lead generation journey
            </CardDescription>
          </CardHeader>
      
      <CardContent className="px-16 pb-12">
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* Personal Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center">
              <UserPlus className="mr-2 h-5 w-5 text-blue-600" />
              Personal Information
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name" className="text-sm font-medium text-gray-700">
                  Full Name *
                </Label>
                <Input
                  id="name"
                  type="text"
                  className="h-12 border-gray-300 focus:border-blue-500 focus:ring-blue-500 rounded-lg"
                  {...form.register("name")}
                  data-testid="input-name"
                />
                {form.formState.errors.name && (
                  <p className="text-sm text-red-600 flex items-center">
                    <AlertCircle className="h-4 w-4 mr-1" />
                    {form.formState.errors.name.message}
                  </p>
                )}
                <p className="text-xs text-gray-500">Only letters, spaces, and dots are allowed</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-medium text-gray-700">
                  Email Address *
                </Label>
                <Input
                  id="email"
                  type="email"
                  className="h-12 border-gray-300 focus:border-blue-500 focus:ring-blue-500 rounded-lg"
                  {...form.register("email")}
                  data-testid="input-email"
                />
                {form.formState.errors.email && (
                  <p className="text-sm text-red-600 flex items-center">
                    <AlertCircle className="h-4 w-4 mr-1" />
                    {form.formState.errors.email.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="phoneNumber" className="text-sm font-medium text-gray-700">
                  Phone Number
                </Label>
                <Input
                  id="phoneNumber"
                  type="tel"
                  placeholder="Enter phone number"
                  className="h-12 border-gray-300 focus:border-blue-500 focus:ring-blue-500 rounded-lg"
                  {...form.register("phoneNumber")}
                  data-testid="input-phone-number"
                />
                {form.formState.errors.phoneNumber && (
                  <p className="text-sm text-red-600 flex items-center">
                    <AlertCircle className="h-4 w-4 mr-1" />
                    {form.formState.errors.phoneNumber.message}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Company Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center">
              <Building className="mr-2 h-5 w-5 text-green-600" />
              Company Information
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="companyName" className="text-sm font-medium text-gray-700">
                  Company Name *
                </Label>
                <Input
                  id="companyName"
                  type="text"
                  className="h-12 border-gray-300 focus:border-blue-500 focus:ring-blue-500 rounded-lg"
                  {...form.register("companyName")}
                  data-testid="input-company-name"
                />
                {form.formState.errors.companyName && (
                  <p className="text-sm text-red-600 flex items-center">
                    <AlertCircle className="h-4 w-4 mr-1" />
                    {form.formState.errors.companyName.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="companySize" className="text-sm font-medium text-gray-700">
                  Company Size *
                </Label>
                <Select 
                  value={form.watch("companySize")}
                  onValueChange={(value) => form.setValue("companySize", value as CompanySize)}
                >
                  <SelectTrigger className="h-12 border-gray-300 focus:border-blue-500 focus:ring-blue-500 rounded-lg" data-testid="select-company-size">
                    <SelectValue placeholder="Select Company Size" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.values(CompanySize).map((size) => (
                      <SelectItem key={size} value={size}>
                        {formatCompanySizeLabel(size)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {form.formState.errors.companySize && (
                  <p className="text-sm text-red-600 flex items-center">
                    <AlertCircle className="h-4 w-4 mr-1" />
                    {form.formState.errors.companySize.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="industry" className="text-sm font-medium text-gray-700">
                  Industry *
                </Label>
                <Select 
                  value={form.watch("industry")}
                  onValueChange={(value) => {
                  form.setValue("industry", value as Industry);
                  if (value !== Industry.OTHER) {
                    form.setValue("customIndustry", "");
                  }
                }}>
                  <SelectTrigger className="h-12 border-gray-300 focus:border-blue-500 focus:ring-blue-500 rounded-lg" data-testid="select-industry">
                    <SelectValue placeholder="Select Industry" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.values(Industry).map((industry) => (
                      <SelectItem key={industry} value={industry}>
                        {formatIndustryLabel(industry)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {form.formState.errors.industry && (
                  <p className="text-sm text-red-600 flex items-center">
                    <AlertCircle className="h-4 w-4 mr-1" />
                    {form.formState.errors.industry.message}
                  </p>
                )}
              </div>

              {form.watch("industry") === Industry.OTHER && (
                <div className="space-y-2">
                  <Label htmlFor="customIndustry" className="text-sm font-medium text-gray-700">
                    Specify Industry *
                  </Label>
                  <Input
                    id="customIndustry"
                    type="text"
                    placeholder="Enter your industry"
                    className="h-12 border-gray-300 focus:border-blue-500 focus:ring-blue-500 rounded-lg"
                    {...form.register("customIndustry")}
                    data-testid="input-custom-industry"
                  />
                  {form.formState.errors.customIndustry && (
                    <p className="text-sm text-red-600 flex items-center">
                      <AlertCircle className="h-4 w-4 mr-1" />
                      {form.formState.errors.customIndustry.message}
                    </p>
                  )}
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="website" className="text-sm font-medium text-gray-700">
                  Website
                </Label>
                <Input
                  id="website"
                  type="url"
                  className="h-12 border-gray-300 focus:border-blue-500 focus:ring-blue-500 rounded-lg"
                  {...form.register("website")}
                  data-testid="input-website"
                />
                {form.formState.errors.website && (
                  <p className="text-sm text-red-600 flex items-center">
                    <AlertCircle className="h-4 w-4 mr-1" />
                    {form.formState.errors.website.message}
                  </p>
                )}
              </div>
            </div>
              </div>

          {/* Security */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center">
              <Shield className="mr-2 h-5 w-5 text-purple-600" />
              Security
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="password" className="text-sm font-medium text-gray-700">
                  Password *
                </Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter your password"
                    className="h-12 border-gray-300 focus:border-blue-500 focus:ring-blue-500 rounded-lg pr-12"
                    {...form.register("password")}
                    data-testid="input-password"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowPassword(!showPassword)}
                    data-testid="button-toggle-password"
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4 text-gray-400" />
                    ) : (
                      <Eye className="h-4 w-4 text-gray-400" />
                    )}
                  </Button>
                </div>
                {form.formState.errors.password && (
                  <p className="text-sm text-red-600 flex items-center">
                    <AlertCircle className="h-4 w-4 mr-1" />
                    {form.formState.errors.password.message}
                  </p>
                )}
                <PasswordStrengthIndicator password={password} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword" className="text-sm font-medium text-gray-700">
                  Confirm Password *
                </Label>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    placeholder="Confirm your password"
                    className="h-12 border-gray-300 focus:border-blue-500 focus:ring-blue-500 rounded-lg pr-12"
                    {...form.register("confirmPassword")}
                    data-testid="input-confirm-password"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    data-testid="button-toggle-confirm-password"
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="h-4 w-4 text-gray-400" />
                    ) : (
                      <Eye className="h-4 w-4 text-gray-400" />
                    )}
                  </Button>
                </div>
                {form.formState.errors.confirmPassword && (
                  <p className="text-sm text-red-600 flex items-center">
                    <AlertCircle className="h-4 w-4 mr-1" />
                    {form.formState.errors.confirmPassword.message}
                  </p>
                )}
                <PasswordMatchIndicator password={password} confirmPassword={confirmPassword} />
              </div>
            </div>
              </div>

              <Button
                type="submit"
            className="w-full h-14 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 text-lg"
                disabled={isLoading}
                data-testid="button-signup"
              >
                {isLoading ? (
              <div className="flex items-center justify-center">
                <ButtonLoader size={20} color="#ffffff" />
                <span className="ml-3">Creating your account...</span>
              </div>
                ) : (
                  <>
                Start Free Trial
                <ArrowRight className="ml-2 h-5 w-5" />
                  </>
                )}
              </Button>
            </form>

        <div className="mt-6 text-center">
              <p className="text-sm text-gray-600">
                Already have an account?{" "}
                <button
                  onClick={() => setLocation("/login")}
              className="text-indigo-600 hover:text-indigo-500 font-semibold transition-colors"
                  data-testid="link-login"
                >
              Sign in here
                </button>
              </p>
            </div>
          </CardContent>
        </Card>
    
  </div>


 {/* Footer */}
 <div className="mt-8 text-center">
          <div className="text-xs text-white/70 space-y-1">
            <p>© 2024 ForeFold Consulting Services LLP. All rights reserved.</p>
            <p>ForeFold, LeadsFlow, and related trademarks are owned by ForeFold Consulting Services LLP.</p>
          </div>
        </div>
      </div>
    </div>
    
  );
}