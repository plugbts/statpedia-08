import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface VerificationEmailRequest {
  email: string;
  code: string;
  purpose: "password_change" | "email_change" | "security";
  expiresIn: number;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { email, code, purpose, expiresIn } = (await req.json()) as VerificationEmailRequest;

    if (!email || !code || !purpose) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Create Supabase client
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    // Get email service configuration
    const emailService = Deno.env.get("EMAIL_SERVICE") || "resend";
    const emailApiKey = Deno.env.get("EMAIL_API_KEY");

    if (!emailApiKey) {
      console.error("Email API key not configured");
      return new Response(JSON.stringify({ error: "Email service not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Prepare email content based on purpose
    let subject: string;
    let htmlContent: string;
    let textContent: string;

    switch (purpose) {
      case "password_change":
        subject = "Statpedia - Password Change Verification Code";
        htmlContent = `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <title>Password Change Verification</title>
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
              .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
              .code { background: #667eea; color: white; font-size: 24px; font-weight: bold; padding: 15px 25px; border-radius: 6px; text-align: center; margin: 20px 0; letter-spacing: 3px; }
              .warning { background: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 6px; margin: 20px 0; }
              .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>🔒 Password Change Verification</h1>
              </div>
              <div class="content">
                <h2>Hello!</h2>
                <p>You requested to change your password on Statpedia. Please use the verification code below to confirm this action:</p>
                
                <div class="code">${code}</div>
                
                <div class="warning">
                  <strong>⚠️ Security Notice:</strong>
                  <ul>
                    <li>This code expires in ${expiresIn} minutes</li>
                    <li>Never share this code with anyone</li>
                    <li>If you didn't request this change, please ignore this email</li>
                  </ul>
                </div>
                
                <p>If you didn't request this password change, please contact our support team immediately.</p>
              </div>
              <div class="footer">
                <p>© 2025 Statpedia. All rights reserved.</p>
                <p>This email was sent from a secure system.</p>
              </div>
            </div>
          </body>
          </html>
        `;
        textContent = `
          Password Change Verification Code
          
          Hello!
          
          You requested to change your password on Statpedia. Please use the verification code below to confirm this action:
          
          Code: ${code}
          
          Security Notice:
          - This code expires in ${expiresIn} minutes
          - Never share this code with anyone
          - If you didn't request this change, please ignore this email
          
          If you didn't request this password change, please contact our support team immediately.
          
          © 2025 Statpedia. All rights reserved.
        `;
        break;

      case "email_change":
        subject = "Statpedia - Email Change Verification Code";
        htmlContent = `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <title>Email Change Verification</title>
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
              .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
              .code { background: #667eea; color: white; font-size: 24px; font-weight: bold; padding: 15px 25px; border-radius: 6px; text-align: center; margin: 20px 0; letter-spacing: 3px; }
              .warning { background: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 6px; margin: 20px 0; }
              .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>📧 Email Change Verification</h1>
              </div>
              <div class="content">
                <h2>Hello!</h2>
                <p>You requested to change your email address on Statpedia. Please use the verification code below to confirm this action:</p>
                
                <div class="code">${code}</div>
                
                <div class="warning">
                  <strong>⚠️ Security Notice:</strong>
                  <ul>
                    <li>This code expires in ${expiresIn} minutes</li>
                    <li>Never share this code with anyone</li>
                    <li>If you didn't request this change, please ignore this email</li>
                  </ul>
                </div>
                
                <p>If you didn't request this email change, please contact our support team immediately.</p>
              </div>
              <div class="footer">
                <p>© 2025 Statpedia. All rights reserved.</p>
                <p>This email was sent from a secure system.</p>
              </div>
            </div>
          </body>
          </html>
        `;
        textContent = `
          Email Change Verification Code
          
          Hello!
          
          You requested to change your email address on Statpedia. Please use the verification code below to confirm this action:
          
          Code: ${code}
          
          Security Notice:
          - This code expires in ${expiresIn} minutes
          - Never share this code with anyone
          - If you didn't request this change, please ignore this email
          
          If you didn't request this email change, please contact our support team immediately.
          
          © 2025 Statpedia. All rights reserved.
        `;
        break;

      default:
        subject = "Statpedia - Security Verification Code";
        htmlContent = `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <title>Security Verification</title>
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
              .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
              .code { background: #667eea; color: white; font-size: 24px; font-weight: bold; padding: 15px 25px; border-radius: 6px; text-align: center; margin: 20px 0; letter-spacing: 3px; }
              .warning { background: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 6px; margin: 20px 0; }
              .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>🔐 Security Verification</h1>
              </div>
              <div class="content">
                <h2>Hello!</h2>
                <p>A security verification code has been requested for your Statpedia account. Please use the code below to proceed:</p>
                
                <div class="code">${code}</div>
                
                <div class="warning">
                  <strong>⚠️ Security Notice:</strong>
                  <ul>
                    <li>This code expires in ${expiresIn} minutes</li>
                    <li>Never share this code with anyone</li>
                    <li>If you didn't request this, please ignore this email</li>
                  </ul>
                </div>
                
                <p>If you didn't request this verification, please contact our support team immediately.</p>
              </div>
              <div class="footer">
                <p>© 2025 Statpedia. All rights reserved.</p>
                <p>This email was sent from a secure system.</p>
              </div>
            </div>
          </body>
          </html>
        `;
        textContent = `
          Security Verification Code
          
          Hello!
          
          A security verification code has been requested for your Statpedia account. Please use the code below to proceed:
          
          Code: ${code}
          
          Security Notice:
          - This code expires in ${expiresIn} minutes
          - Never share this code with anyone
          - If you didn't request this, please ignore this email
          
          If you didn't request this verification, please contact our support team immediately.
          
          © 2025 Statpedia. All rights reserved.
        `;
        break;
    }

    // Send email using the configured service
    let emailResponse;

    if (emailService === "resend") {
      // Send via Resend
      emailResponse = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${emailApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: "Statpedia <noreply@statpedia.com>",
          to: [email],
          subject: subject,
          html: htmlContent,
          text: textContent,
        }),
      });
    } else {
      // Fallback to Supabase email service
      emailResponse = await fetch(
        "https://api.supabase.com/v1/projects/" +
          Deno.env.get("SUPABASE_PROJECT_ID") +
          "/functions/send-email",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${emailApiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            to: email,
            subject: subject,
            html: htmlContent,
            text: textContent,
          }),
        },
      );
    }

    if (!emailResponse.ok) {
      const errorText = await emailResponse.text();
      console.error("Email service error:", errorText);
      return new Response(JSON.stringify({ error: "Failed to send email" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(
      JSON.stringify({ success: true, message: "Verification email sent successfully" }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("Error in send-verification-code function:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
