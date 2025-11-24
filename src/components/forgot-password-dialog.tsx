import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Eye, EyeOff, Mail, Lock, ArrowLeft, CheckCircle, XCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { ButtonLoader } from "@/components/ui/loader";
import { useMutation } from "@tanstack/react-query";
import { authService } from "@/lib/apis";
import { ForgotPasswordDto, VerifyOtpDto, ResetPasswordDto } from "@/lib/apis";

const forgotPasswordSchema = z.object({
  email: z.string().email("Invalid email address"),
});

const otpSchema = z.object({
  otp: z.string().min(6, "OTP must be 6 digits").max(6, "OTP must be 6 digits"),
});

const resetPasswordSchema = z.object({
  newPassword: z.string().min(6, "Password must be at least 6 characters"),
  confirmPassword: z.string().min(6, "Password must be at least 6 characters"),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type ForgotPasswordForm = z.infer<typeof forgotPasswordSchema>;
type OtpForm = z.infer<typeof otpSchema>;
type ResetPasswordForm = z.infer<typeof resetPasswordSchema>;

interface ForgotPasswordDialogProps {
  children: React.ReactNode;
}

export default function ForgotPasswordDialog({ children }: ForgotPasswordDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [step, setStep] = useState<"email" | "otp" | "password">("email");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const { toast } = useToast();

  const forgotPasswordForm = useForm<ForgotPasswordForm>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: {
      email: "",
    },
  });

  const otpForm = useForm<OtpForm>({
    resolver: zodResolver(otpSchema),
    defaultValues: {
      otp: "",
    },
  });

  const resetPasswordForm = useForm<ResetPasswordForm>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      newPassword: "",
      confirmPassword: "",
    },
  });

  const forgotPasswordMutation = useMutation({
    mutationFn: async (data: ForgotPasswordForm) => {
      const forgotPasswordDto: ForgotPasswordDto = {
        email: data.email,
      };
      return await authService.forgotPassword(forgotPasswordDto);
    },
    onSuccess: (data) => {
      setEmail(forgotPasswordForm.getValues("email"));
      setStep("otp");
      toast({
        title: "Reset Code Sent",
        description: data.message || "We've sent a 6-digit code to your email address. Please check your inbox and enter the code below.",
      });
    },
    onError: (error: any) => {
      let errorMessage = "We couldn't send the reset code. Please check your email address and try again.";
      
      // Extract user-friendly message from error response
      if (error?.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error?.response?.data?.error) {
        errorMessage = error.response.data.error;
      } else if (error?.message) {
        // Remove HTTP status codes and technical details
        let message = error.message.replace(/^\d+:\s*/, ''); // Remove status codes like "400: "
        
        // Remove JSON formatting if present
        if (message.includes('{"error":') || message.includes('{"message":')) {
          try {
            const parsed = JSON.parse(message);
            message = parsed.error || parsed.message || message;
          } catch {
            // If JSON parsing fails, use the original message
          }
        }
        
        if (!message.includes('Failed to fetch') && !message.includes('NetworkError')) {
          errorMessage = message;
        }
      }
      
      toast({
        title: "Reset Code Not Sent",
        description: errorMessage,
        variant: "destructive",
      });
    },
  });

  const verifyOtpMutation = useMutation({
    mutationFn: async (data: OtpForm) => {
      const verifyOtpDto: VerifyOtpDto = {
        email: email,
        otp: data.otp,
      };
      return await authService.verifyOtp(verifyOtpDto);
    },
    onSuccess: (data) => {
      if (data.valid) {
        setOtp(otpForm.getValues("otp"));
        setStep("password");
        toast({
          title: "Code Verified",
          description: data.message || "Great! Your code is correct. Now please enter your new password below.",
        });
      } else {
        toast({
          title: "Invalid Code",
          description: data.message || "The verification code is incorrect. Please check your email and try again.",
          variant: "destructive",
        });
      }
    },
    onError: (error: any) => {
      let errorMessage = "The verification code is incorrect. Please check your email and try again.";
      
      // Extract user-friendly message from error response
      if (error?.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error?.response?.data?.error) {
        errorMessage = error.response.data.error;
      } else if (error?.message) {
        // Remove HTTP status codes and technical details
        let message = error.message.replace(/^\d+:\s*/, ''); // Remove status codes like "400: "
        
        // Remove JSON formatting if present
        if (message.includes('{"error":') || message.includes('{"message":')) {
          try {
            const parsed = JSON.parse(message);
            message = parsed.error || parsed.message || message;
          } catch {
            // If JSON parsing fails, use the original message
          }
        }
        
        if (!message.includes('Failed to fetch') && !message.includes('NetworkError')) {
          errorMessage = message;
        }
      }
      
      toast({
        title: "Invalid Code",
        description: errorMessage,
        variant: "destructive",
      });
    },
  });

  const resetPasswordMutation = useMutation({
    mutationFn: async (data: ResetPasswordForm) => {
      const resetPasswordDto: ResetPasswordDto = {
        email: email,
        otp: otp,
        newPassword: data.newPassword,
        confirmPassword: data.confirmPassword,
      };
      return await authService.resetPassword(resetPasswordDto);
    },
    onSuccess: (data) => {
      toast({
        title: "Password Reset Complete",
        description: data.message || "Your password has been successfully updated! You can now sign in with your new password.",
      });
      handleClose();
    },
    onError: (error: any) => {
      let errorMessage = "We couldn't reset your password. Please check your information and try again.";
      
      // Extract user-friendly message from error response
      if (error?.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error?.response?.data?.error) {
        errorMessage = error.response.data.error;
      } else if (error?.message) {
        // Remove HTTP status codes and technical details
        let message = error.message.replace(/^\d+:\s*/, ''); // Remove status codes like "400: "
        
        // Remove JSON formatting if present
        if (message.includes('{"error":') || message.includes('{"message":')) {
          try {
            const parsed = JSON.parse(message);
            message = parsed.error || parsed.message || message;
          } catch {
            // If JSON parsing fails, use the original message
          }
        }
        
        if (!message.includes('Failed to fetch') && !message.includes('NetworkError')) {
          errorMessage = message;
        }
      }
      
      toast({
        title: "Password Reset Failed",
        description: errorMessage,
        variant: "destructive",
      });
    },
  });

  const handleClose = () => {
    setIsOpen(false);
    setStep("email");
    setEmail("");
    setOtp("");
    forgotPasswordForm.reset();
    otpForm.reset();
    resetPasswordForm.reset();
  };

  const handleBackToEmail = () => {
    setStep("email");
    otpForm.reset();
  };

  const handleBackToOtp = () => {
    setStep("otp");
    resetPasswordForm.reset();
  };

  const onForgotPasswordSubmit = (data: ForgotPasswordForm) => {
    forgotPasswordMutation.mutate(data);
  };

  const onOtpSubmit = (data: OtpForm) => {
    verifyOtpMutation.mutate(data);
  };

  const onResetPasswordSubmit = (data: ResetPasswordForm) => {
    resetPasswordMutation.mutate(data);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">
            {step === "email" && "Forgot Password"}
            {step === "otp" && "Enter OTP"}
            {step === "password" && "Reset Password"}
          </DialogTitle>
          <DialogDescription>
            {step === "email" && "Enter your email address to receive a password reset OTP."}
            {step === "otp" && "Enter the 6-digit OTP sent to your email."}
            {step === "password" && "Enter your new password."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Email Step */}
          {step === "email" && (
            <form onSubmit={forgotPasswordForm.handleSubmit(onForgotPasswordSubmit)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <div className="relative">
                  <Input
                    id="email"
                    type="email"
                    placeholder="Enter your email"
                    className="pl-10"
                    {...forgotPasswordForm.register("email")}
                  />
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                </div>
                {forgotPasswordForm.formState.errors.email && (
                  <p className="text-sm text-red-600">{forgotPasswordForm.formState.errors.email.message}</p>
                )}
              </div>

              <Button
                type="submit"
                className="w-full"
                disabled={forgotPasswordMutation.isPending}
              >
                {forgotPasswordMutation.isPending ? (
                  <div className="flex items-center">
                    <ButtonLoader size={16} color="#ffffff" />
                    <span className="ml-2">Sending OTP...</span>
                  </div>
                ) : (
                  "Send OTP"
                )}
              </Button>
            </form>
          )}

          {/* OTP Step */}
          {step === "otp" && (
            <form onSubmit={otpForm.handleSubmit(onOtpSubmit)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="otp">OTP Code</Label>
                <Input
                  id="otp"
                  type="text"
                  placeholder="Enter 6-digit OTP"
                  maxLength={6}
                  className="text-center text-lg tracking-widest"
                  {...otpForm.register("otp")}
                />
                {otpForm.formState.errors.otp && (
                  <p className="text-sm text-red-600">{otpForm.formState.errors.otp.message}</p>
                )}
              </div>

              <div className="flex space-x-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleBackToEmail}
                  className="flex-1"
                >
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back
                </Button>
                <Button
                  type="submit"
                  className="flex-1"
                  disabled={verifyOtpMutation.isPending}
                >
                  {verifyOtpMutation.isPending ? (
                    <div className="flex items-center">
                      <ButtonLoader size={16} color="#ffffff" />
                      <span className="ml-2">Verifying...</span>
                    </div>
                  ) : (
                    "Verify OTP"
                  )}
                </Button>
              </div>
            </form>
          )}

          {/* Password Reset Step */}
          {step === "password" && (
            <form onSubmit={resetPasswordForm.handleSubmit(onResetPasswordSubmit)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="newPassword">New Password</Label>
                <div className="relative">
                  <Input
                    id="newPassword"
                    type={showNewPassword ? "text" : "password"}
                    placeholder="Enter new password"
                    className="pl-10 pr-10"
                    {...resetPasswordForm.register("newPassword")}
                  />
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                  >
                    {showNewPassword ? (
                      <EyeOff className="h-4 w-4 text-gray-400" />
                    ) : (
                      <Eye className="h-4 w-4 text-gray-400" />
                    )}
                  </Button>
                </div>
                {resetPasswordForm.formState.errors.newPassword && (
                  <p className="text-sm text-red-600">{resetPasswordForm.formState.errors.newPassword.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm Password</Label>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    placeholder="Confirm new password"
                    className="pl-10 pr-10"
                    {...resetPasswordForm.register("confirmPassword")}
                  />
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="h-4 w-4 text-gray-400" />
                    ) : (
                      <Eye className="h-4 w-4 text-gray-400" />
                    )}
                  </Button>
                </div>
                {resetPasswordForm.formState.errors.confirmPassword && (
                  <p className="text-sm text-red-600">{resetPasswordForm.formState.errors.confirmPassword.message}</p>
                )}
              </div>

              <div className="flex space-x-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleBackToOtp}
                  className="flex-1"
                >
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back
                </Button>
                <Button
                  type="submit"
                  className="flex-1"
                  disabled={resetPasswordMutation.isPending}
                >
                  {resetPasswordMutation.isPending ? (
                    <div className="flex items-center">
                      <ButtonLoader size={16} color="#ffffff" />
                      <span className="ml-2">Resetting...</span>
                    </div>
                  ) : (
                    "Reset Password"
                  )}
                </Button>
              </div>
            </form>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
} 