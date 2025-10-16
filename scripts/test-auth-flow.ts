#!/usr/bin/env tsx

import fetch from "node-fetch";
import { config } from "dotenv";
config();
config({ path: ".env.local" });

const API = `http://localhost:${process.env.API_PORT || 3001}`;

// Response shapes
interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

interface LoginData {
  token: string;
  refreshToken: string;
  expiresIn: number;
}

interface RefreshData {
  token: string;
  expiresIn: number;
}

interface UserData {
  id: string;
  email: string;
  email_verified: boolean;
  display_name?: string;
  username?: string;
  created_at: string;
  updated_at: string;
  disabled: boolean;
}

async function run() {
  console.log("🚦 Starting auth flow test against", API);

  const email = `ci+${Date.now()}@example.com`;
  const password = "TestPass!123";

  // 1) Signup
  console.log("\n1) Signup");
  let res = await fetch(`${API}/api/auth/signup`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password, display_name: "CI Test" }),
  });
  const signup = (await res.json()) as ApiResponse<LoginData>;
  console.log("signup ->", signup.success ? "OK" : "FAIL", JSON.stringify(signup));
  if (!signup.success) process.exit(2);

  // 2) Login
  console.log("\n2) Login");
  res = await fetch(`${API}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const login = (await res.json()) as ApiResponse<LoginData>;
  console.log("login ->", login.success ? "OK" : "FAIL", JSON.stringify(login));
  if (!login.success) process.exit(3);

  const token = login.data!.token;
  const refreshToken = login.data!.refreshToken;

  // 3) Get /me
  console.log("\n3) GET /api/auth/me");
  res = await fetch(`${API}/api/auth/me`, {
    method: "GET",
    headers: { Authorization: `Bearer ${token}` },
  });
  const me = (await res.json()) as ApiResponse<UserData>;
  console.log("/me ->", me.success ? "OK" : "FAIL", JSON.stringify(me));
  if (!me.success) process.exit(4);

  // 4) Refresh
  console.log("\n4) Refresh token");
  res = await fetch(`${API}/api/auth/refresh`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refreshToken }),
  });
  const refreshed = (await res.json()) as ApiResponse<RefreshData>;
  console.log("refresh ->", refreshed.success ? "OK" : "FAIL", JSON.stringify(refreshed));
  if (!refreshed.success) process.exit(5);
  const newToken = refreshed.data!.token;

  // 5) Logout
  console.log("\n5) Logout (revoke)");
  res = await fetch(`${API}/api/auth/logout`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refreshToken }),
  });
  const logout = (await res.json()) as ApiResponse<{ message: string }>;
  console.log("logout ->", logout.success ? "OK" : "FAIL", JSON.stringify(logout));
  if (!logout.success) process.exit(6);

  // 6) Try refresh again (should fail)
  console.log("\n6) Refresh after logout (should fail)");
  res = await fetch(`${API}/api/auth/refresh`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refreshToken }),
  });
  const refreshed2 = (await res.json()) as ApiResponse<RefreshData>;
  console.log(
    "refresh-after-logout ->",
    refreshed2.success ? "UNEXPECTED_OK" : "EXPECTED_FAIL",
    JSON.stringify(refreshed2),
  );
  if (refreshed2.success) process.exit(7);

  console.log("\n✅ Auth flow tests passed (signup, login, me, refresh, logout, revoked)");
  process.exit(0);
}

run().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});
