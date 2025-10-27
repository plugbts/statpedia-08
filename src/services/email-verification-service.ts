/**
 * Email Verification Service
 * Handles sending and verifying email codes for sensitive operations
 */

import { supabase } from "@/integrations/supabase/client";

export interface VerificationCode {
  code: string;
  expiresAt: Date;
  purpose: "password_change" | "email_change" | "security";
}

class EmailVerificationService {
  private readonly CODE_LENGTH = 6;
  private readonly CODE_EXPIRY_MINUTES = 10;

  /**
   * Generate a random verification code
   */
  private generateCode(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  /**
   * Send verification code via email
   */
  async sendVerificationCode(
    email: string,
    purpose: "password_change" | "email_change" | "security",
  ): Promise<{ success: boolean; message: string }> {
    try {
      const code = this.generateCode();
      const expiresAt = new Date(Date.now() + this.CODE_EXPIRY_MINUTES * 60 * 1000);

      // Store the verification code in the database
      const { error: insertError } = await supabase.from("verification_codes").insert({
        email,
        code,
        purpose,
        expires_at: expiresAt.toISOString(),
        created_at: new Date().toISOString(),
      });

      if (insertError) {
        console.error("Error storing verification code:", insertError);
        return { success: false, message: "Failed to generate verification code" };
      }

      // Send email with the verification code
      const { error: emailError } = await supabase.functions.invoke("send-verification-code", {
        body: {
          email,
          code,
          purpose,
          expiresIn: this.CODE_EXPIRY_MINUTES,
        },
      });

      if (emailError) {
        console.error("Error sending verification email:", emailError);
        return { success: false, message: "Failed to send verification email" };
      }

      return {
        success: true,
        message: `Verification code sent to ${email}. Code expires in ${this.CODE_EXPIRY_MINUTES} minutes.`,
      };
    } catch (error) {
      console.error("Error in sendVerificationCode:", error);
      return { success: false, message: "An unexpected error occurred" };
    }
  }

  /**
   * Verify the provided code
   */
  async verifyCode(
    email: string,
    code: string,
    purpose: "password_change" | "email_change" | "security",
  ): Promise<{ success: boolean; message: string }> {
    try {
      // Get the verification code from database
      const { data, error } = await supabase
        .from("verification_codes")
        .select("*")
        .eq("email", email)
        .eq("code", code)
        .eq("purpose", purpose)
        .eq("used", false)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        console.error("Error verifying code:", error);
        return { success: false, message: "Failed to verify code" };
      }

      if (!data) {
        return { success: false, message: "Invalid verification code" };
      }

      // Check if code has expired
      const now = new Date();
      const expiresAt = new Date(data.expires_at);

      if (now > expiresAt) {
        return { success: false, message: "Verification code has expired" };
      }

      // Mark code as used
      await supabase
        .from("verification_codes")
        .update({ used: true, used_at: new Date().toISOString() })
        .eq("id", data.id);

      return { success: true, message: "Verification code verified successfully" };
    } catch (error) {
      console.error("Error in verifyCode:", error);
      return { success: false, message: "An unexpected error occurred" };
    }
  }

  /**
   * Clean up expired codes (should be called periodically)
   */
  async cleanupExpiredCodes(): Promise<void> {
    try {
      const now = new Date().toISOString();
      await supabase.from("verification_codes").delete().lt("expires_at", now);
    } catch (error) {
      console.error("Error cleaning up expired codes:", error);
    }
  }

  /**
   * Check if user has reached rate limit for verification codes
   */
  async checkRateLimit(email: string): Promise<{ allowed: boolean; message: string }> {
    try {
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();

      const { data, error } = await supabase
        .from("verification_codes")
        .select("id")
        .eq("email", email)
        .gte("created_at", oneHourAgo);

      if (error) {
        console.error("Error checking rate limit:", error);
        return { allowed: true, message: "" }; // Allow on error to avoid blocking users
      }

      const codeCount = data?.length || 0;
      const maxCodesPerHour = 5;

      if (codeCount >= maxCodesPerHour) {
        return {
          allowed: false,
          message: `Too many verification codes requested. Please wait before requesting another code.`,
        };
      }

      return { allowed: true, message: "" };
    } catch (error) {
      console.error("Error in checkRateLimit:", error);
      return { allowed: true, message: "" };
    }
  }
}

export const emailVerificationService = new EmailVerificationService();
