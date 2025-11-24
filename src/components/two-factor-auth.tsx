import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Shield, Mail, ArrowLeft } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { authService } from '@/lib/apis';

interface TwoFactorAuthProps {
  email: string;
  onVerificationSuccess: (user: any) => void;
  onBack: () => void;
}

export default function TwoFactorAuth({ email, onVerificationSuccess, onBack }: TwoFactorAuthProps) {
  const [otp, setOtp] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [error, setError] = useState('');
  const [remainingAttempts, setRemainingAttempts] = useState<number | undefined>();
  const [timeLeft, setTimeLeft] = useState(600); // 10 minutes in seconds
  const { toast } = useToast();
  
  // Show notification that OTP was sent (backend sends it automatically during login)
  useEffect(() => {
    // Backend automatically sends OTP when login returns requiresTwoFactor: true
    // No need to send it again here - just notify the user
    console.log("✅ Backend already sent OTP during login to:", email);
    console.log("User should check their email for the 6-digit code");
    
    toast({
      title: "OTP Sent",
      description: `A verification code has been sent to ${email}. Please check your inbox and spam folder.`,
    });
    
    // Only run once when component mounts
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Countdown timer
  useEffect(() => {
    if (timeLeft > 0) {
      const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [timeLeft]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleVerifyOTP = async () => {
    if (!otp || otp.length !== 6) {
      setError('Please enter a valid 6-digit code');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const response = await authService.verify2FAOTP({
        email,
        otp,
      });

      console.log("========== OTP VERIFICATION RESPONSE (Component) ==========");
      console.log("Full response object:", response);
      console.log("Full response JSON:", JSON.stringify(response, null, 2));
      console.log("response.valid:", response.valid);
      console.log("typeof response.valid:", typeof response.valid);
      console.log("response.accessToken:", response.accessToken ? `✅ Present (${response.accessToken.substring(0, 20)}...)` : "❌ MISSING");
      console.log("response.refreshToken:", response.refreshToken ? `✅ Present (${response.refreshToken.substring(0, 20)}...)` : "❌ MISSING");
      console.log("response.user:", response.user ? JSON.stringify(response.user) : "❌ MISSING");
      console.log("response.message:", response.message);
      
      // Check for alternative property names
      const altResponse: any = response;
      console.log("Alternative property check:");
      console.log("- access_token:", altResponse.access_token ? "✅ Found" : "Not found");
      console.log("- refresh_token:", altResponse.refresh_token ? "✅ Found" : "Not found");
      console.log("- token:", altResponse.token ? "✅ Found" : "Not found");
      console.log("All response keys:", Object.keys(response));
      console.log("===========================================================");

      // Check if OTP is valid - backend might not include 'valid' field if successful
      // If we have tokens, it means OTP was valid
      const hasTokens = !!(response.accessToken || altResponse.access_token || altResponse.token);
      const isValid = response.valid === true || (response.valid === undefined && hasTokens);
      
      console.log("Validity check:");
      console.log("- response.valid:", response.valid);
      console.log("- hasTokens:", hasTokens);
      console.log("- isValid (computed):", isValid);

      if (isValid) {
        console.log("✅ OTP verified successfully");
        
        // Check if tokens might be in a nested structure
        const responseObj: any = response;
        let accessToken = response.accessToken || responseObj.access_token || responseObj.token;
        let refreshToken = response.refreshToken || responseObj.refresh_token;
        
        // Check if response might be wrapped (e.g., response.data.accessToken)
        if (!accessToken && responseObj.data) {
          console.log("🔍 Checking nested data property...");
          accessToken = responseObj.data.accessToken || responseObj.data.access_token || responseObj.data.token;
          refreshToken = responseObj.data.refreshToken || responseObj.data.refresh_token;
          console.log("Found in nested data:", { accessToken: !!accessToken, refreshToken: !!refreshToken });
        }
        
        console.log("Final token check:");
        console.log("- accessToken:", accessToken ? `✅ Present (length: ${accessToken.length})` : "❌ MISSING");
        console.log("- refreshToken:", refreshToken ? `✅ Present (length: ${refreshToken.length})` : "❌ MISSING");
        
        // Check if we have tokens
        if (!accessToken || !refreshToken) {
          console.error("❌ CRITICAL: Backend did not return tokens!");
          console.error("Response structure:", JSON.stringify(response, null, 2));
          console.error("Checked properties: accessToken, access_token, token, refreshToken, refresh_token");
          console.error("Also checked: response.data.*");
          toast({
            title: "Backend Configuration Error",
            description: "Authentication tokens not received from server. Please contact support.",
            variant: "destructive",
          });
          setError("Backend did not return authentication tokens. Please contact administrator.");
          return;
        }
        
        console.log("✅ Tokens found, proceeding with success handler");
        
        toast({
          title: "Success",
          description: response.message || "Two-factor authentication verified successfully!",
        });
        
        // Get user data (might be nested too)
        const userData = response.user || responseObj.data?.user;
        
        console.log("Passing to success handler:");
        console.log("- email:", email);
        console.log("- accessToken length:", accessToken.length);
        console.log("- refreshToken length:", refreshToken.length);
        console.log("- user data:", userData);
        
        // Pass complete response data including user info to the success handler
        onVerificationSuccess({ 
          email,
          accessToken: accessToken,
          refreshToken: refreshToken,
          // Include user data if provided by backend
          id: userData?.id,
          fullName: userData?.fullName,
          role: userData?.role,
          companyName: userData?.companyName,
        });
      } else {
        console.log("❌ OTP verification failed");
        console.log("response.valid:", response.valid);
        console.log("response.message:", response.message);
        console.log("Showing error to user");
        
        const errorMsg = response.message || 'Invalid OTP code';
        setError(errorMsg);
        
        toast({
          title: "Verification Failed",
          description: errorMsg,
          variant: "destructive",
        });
        
        // Handle remaining attempts if provided in response
        if (response.remainingAttempts !== undefined) {
          setRemainingAttempts(response.remainingAttempts);
          console.log("Remaining attempts:", response.remainingAttempts);
        }
      }
    } catch (error: any) {
      console.error("========== OTP VERIFICATION ERROR ==========");
      console.error("Caught error during OTP verification");
      console.error("Error object:", error);
      console.error("error.response:", error?.response);
      console.error("error.response.status:", error?.response?.status);
      console.error("error.response.data:", error?.response?.data);
      console.error("===========================================");
      
      const errorMessage = error?.response?.data?.message || 
                          error?.message || 
                          'Verification failed. Please try again.';
      setError(errorMessage);
      
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
      
      // Handle remaining attempts if provided in error response
      if (error?.response?.data?.remainingAttempts !== undefined) {
        setRemainingAttempts(error.response.data.remainingAttempts);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendOTP = async () => {
    console.log("========== MANUAL RESEND OTP ==========");
    console.log("User clicked 'Resend Code' button");
    console.log("Calling POST /auth/2fa/send-otp");
    console.log("Email:", email);
    setIsResending(true);
    setError('');

    try {
      const response = await authService.send2FAOTP({ email });
      console.log("✅ Resend OTP successful:", response);
      
      toast({
        title: "OTP Sent",
        description: response.message || "A new verification code has been sent to your email.",
      });
      setTimeLeft(600); // Reset timer to 10 minutes
      setOtp(''); // Clear previous OTP input
      setRemainingAttempts(undefined);
      console.log("=======================================");
    } catch (error: any) {
      console.error("❌ Error resending OTP:", error);
      const errorMessage = error?.response?.data?.message || 
                          error?.message || 
                          'Failed to resend OTP. Please try again.';
      setError(errorMessage);
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
      console.log("=======================================");
    } finally {
      setIsResending(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleVerifyOTP();
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-blue-100">
            <Shield className="h-6 w-6 text-blue-600" />
          </div>
          <CardTitle className="mt-4 text-2xl font-bold text-gray-900">
            Two-Factor Authentication
          </CardTitle>
          <CardDescription className="mt-2 text-gray-600">
            Enter the 6-digit code sent to your email
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Email Display */}
          <div className="flex items-center justify-center space-x-2 text-sm text-gray-600">
            <Mail className="h-4 w-4" />
            <span>{email}</span>
          </div>

          {/* OTP Input */}
          <div className="space-y-2">
            <Label htmlFor="otp" className="text-sm font-medium text-gray-700">
              Verification Code
            </Label>
            <Input
              id="otp"
              type="text"
              placeholder="000000"
              value={otp}
              onChange={(e) => {
                const value = e.target.value.replace(/\D/g, '').slice(0, 6);
                setOtp(value);
              }}
              onKeyPress={handleKeyPress}
              className="text-center text-2xl font-mono tracking-widest"
              maxLength={6}
              autoComplete="one-time-code"
              autoFocus
            />
          </div>

          {/* Timer */}
          <div className="text-center">
            <p className="text-sm text-gray-500">
              Code expires in: <span className="font-mono">{formatTime(timeLeft)}</span>
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Remaining Attempts */}
          {remainingAttempts !== undefined && (
            <Alert>
              <AlertDescription>
                Attempts remaining: <span className="font-semibold">{remainingAttempts}</span>
              </AlertDescription>
            </Alert>
          )}

          {/* Action Buttons */}
          <div className="space-y-3">
            <Button
              onClick={handleVerifyOTP}
              disabled={isLoading || otp.length !== 6 || timeLeft === 0}
              className="w-full"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Verifying...
                </>
              ) : (
                'Verify Code'
              )}
            </Button>

            <Button
              variant="outline"
              onClick={handleResendOTP}
              disabled={isResending || timeLeft > 0}
              className="w-full"
              title={timeLeft > 0 ? `Please wait ${formatTime(timeLeft)} before resending` : 'Request a new OTP code'}
            >
              {isResending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Sending...
                </>
              ) : (
                `Resend Code${timeLeft > 0 ? ` (${formatTime(timeLeft)})` : ''}`
              )}
            </Button>

            <Button
              variant="ghost"
              onClick={onBack}
              className="w-full"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Login
            </Button>
          </div>

          {/* Security Notice */}
          <div className="text-center text-xs text-gray-500">
            <p>This code will expire automatically for security reasons.</p>
            <p>If you didn't request this code, please contact support.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 