/**
 * Admin Database API for permanent storage of admin data
 * Handles merchants, admin users, CMS content, and system settings
 */

import {
  supabase,
  supabaseAdmin,
  authHelpers,
  getSupabaseClient,
} from "./supabase";
import { signToken } from "./auth";
import type { AuthUser, Profile } from "../../types";

// Custom error class for table not found scenarios
export class SupabaseTableNotFoundError extends Error {
  constructor(tableName: string) {
    super(`Table '${tableName}' not found in Supabase schema`);
    this.name = "SupabaseTableNotFoundError";
  }
}

// Admin User Types
export interface AdminUser {
  id: string;
  email: string;
  role: "super_admin" | "admin" | "support";
  firstName?: string;
  lastName?: string;
  active: boolean;
  lastLoginAt?: string;
  createdAt: string;
  updatedAt: string;
}

// Merchant Types
export interface Merchant {
  id: string;
  businessName: string;
  email: string;
  password?: string; // For demo login
  uen?: string;
  mobile?: string;
  address?: string;
  status: "active" | "suspended" | "pending" | "expired";
  subscriptionPlan: "basic" | "professional" | "enterprise";
  subscriptionStartsAt: string;
  subscriptionExpiresAt: string;
  paymentMethod: "uen" | "mobile";
  settings: Record<string, any>;
  monthlyRevenue?: number;
  subscriptionLink?: string;
  createdAt: string;
  updatedAt: string;
}

// CMS Content Types
export interface CMSSection {
  id: string;
  section: string;
  content: Record<string, any>;
  version: number;
  active: boolean;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
}

// System Settings Types
export interface SystemSetting {
  id: string;
  key: string;
  value: any;
  description?: string;
  category: string;
  updatedBy?: string;
  createdAt: string;
  updatedAt: string;
}

// Set admin context for RLS
async function setAdminContext(adminId: string) {
  const { error } = await supabase.rpc("set_config", {
    parameter: "app.current_admin_id",
    value: adminId,
  });

  if (error) {
    console.warn("Could not set admin context:", error);
  }
}

// Admin Users Database API
export const AdminUsersDB = {
  async authenticate(
    email: string,
    password: string
  ): Promise<{
    success: boolean;
    user?: AuthUser;
    error?: string;
    token?: string;
  }> {
    try {
      console.log("[ADMIN_AUTH] Authenticating with Supabase:", email);

      // Use Supabase authentication
      const { user, error } = await authHelpers.signIn(email, password);

      console.log("[ADMIN_AUTH] Sign in result:", { user, error });
      if (error || !user) {
        console.log("[ADMIN_AUTH] Authentication failed:", error);
        return {
          success: false,
          error: error || "Authentication failed",
        };
      }

      // If no profile, try to create one or fetch it with admin client
      if (!user.profile) {
        console.log(
          "[ADMIN_AUTH] No profile found, attempting to fetch with admin client..."
        );

        // Try to get profile with admin client (bypasses RLS)
        const { data: profileData, error: profileError } = await supabaseAdmin
          .from("profiles")
          .select("*")
          .eq("id", user.id)
          .maybeSingle();

        console.log("[ADMIN_AUTH] Admin client profile fetch:", {
          profileData,
          profileError,
        });

        if (profileData) {
          // Add profile to user object
          user.profile = {
            id: profileData.id,
            full_name: profileData.full_name,
            role: profileData.role,
            created_at: profileData.created_at,
            updated_at: profileData.updated_at,
          };
          console.log(
            "[ADMIN_AUTH] Profile loaded with admin client:",
            user.profile
          );
        } else if (email === "admin@mail.com") {
          // For the main admin user, create profile if it doesn't exist
          console.log("[ADMIN_AUTH] Creating admin profile...");
          const { data: createdProfile, error: createError } =
            await supabaseAdmin
              .from("profiles")
              .insert({
                id: user.id,
                full_name: "System Administrator",
                role: "admin",
              })
              .select()
              .single();

          if (createdProfile && !createError) {
            user.profile = {
              id: createdProfile.id,
              full_name: createdProfile.full_name,
              role: createdProfile.role,
              created_at: createdProfile.created_at,
              updated_at: createdProfile.updated_at,
            };
            console.log("[ADMIN_AUTH] Admin profile created:", user.profile);
          }
        }
      }

      // Check if user is admin
      if (!user.profile || user.profile.role !== "admin") {
        console.log("[ADMIN_AUTH] User is not an admin:", user.profile?.role);
        await authHelpers.signOut(); // Sign out non-admin users
        return {
          success: false,
          error: "Access denied. Admin role required.",
        };
      }

      console.log("[ADMIN_AUTH] Admin authentication successful:", user.id);

      // Get session token
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const token = session?.access_token || "";

      return {
        success: true,
        user: user,
        token: token,
      };
    } catch (error) {
      console.error("[ADMIN_AUTH] Authentication error:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Authentication failed",
      };
    }
  },

  // Get current authenticated admin user
  async getCurrentUser(): Promise<AuthUser | null> {
    try {
      const user = await authHelpers.getCurrentUser();

      if (!user || !user.profile || user.profile.role !== "admin") {
        return null;
      }

      return user;
    } catch (error) {
      console.error("[ADMIN_AUTH] Error getting current user:", error);
      return null;
    }
  },

  // Get all users with admin role from profiles table
  async getAll(): Promise<AuthUser[]> {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select(
          `
          *,
          auth_users:id (
            email,
            created_at
          )
        `
        )
        .eq("role", "admin")
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching admin users:", error);
        throw new Error("Failed to fetch admin users");
      }

      // Note: This is a simplified mapping since we're working with profiles
      // In a real implementation, you might need to join with auth.users
      return (data || []).map((profile) => ({
        id: profile.id,
        email: profile.auth_users?.email || "unknown@example.com",
        profile: {
          id: profile.id,
          full_name: profile.full_name,
          role: profile.role,
          created_at: profile.created_at,
          updated_at: profile.updated_at,
        },
      }));
    } catch (error) {
      console.error("Error fetching admin users:", error);
      return [];
    }
  },

  // Create new admin user (requires service role)
  async create(data: {
    email: string;
    password: string;
    fullName?: string;
  }): Promise<AuthUser> {
    try {
      const result = await authHelpers.adminCreateUser(
        data.email,
        data.password,
        data.fullName || data.email.split("@")[0],
        "admin"
      );

      if (result.error || !result.user) {
        throw new Error(result.error || "Failed to create admin user");
      }

      return result.user;
    } catch (error) {
      console.error("Error creating admin user:", error);
      throw new Error(
        error instanceof Error ? error.message : "Failed to create admin user"
      );
    }
  },

  // Update admin profile
  async updateProfile(
    userId: string,
    updates: Partial<Omit<Profile, "id" | "created_at" | "updated_at">>
  ): Promise<Profile | null> {
    try {
      return await authHelpers.updateProfile(userId, updates);
    } catch (error) {
      console.error("Error updating admin profile:", error);
      return null;
    }
  },

  // Sign out current admin
  async signOut(): Promise<void> {
    await authHelpers.signOut();
  },
};

// Merchants Database API
export const MerchantsDB = {
  async getAll(authToken?: string): Promise<Merchant[]> {
    console.log("[MERCHANTS_DB] Fetching from Supabase...");

    // Use admin client for admin operations
    const { data, error } = await supabaseAdmin
      .from("merchants")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch merchants: ${error.message}`);
    }

    return (data || []).map((merchant) => ({
      id: merchant.id,
      businessName: merchant.business_name,
      email: merchant.email,
      uen: merchant.uen || undefined,
      mobile: merchant.mobile || undefined,
      address: merchant.address || undefined,
      status:
        (merchant.status as "active" | "suspended" | "pending" | "expired") ||
        "active",
      subscriptionPlan:
        (merchant.subscription_plan as
          | "basic"
          | "professional"
          | "enterprise") || "basic",
      subscriptionStartsAt: merchant.subscription_starts_at || "",
      subscriptionExpiresAt: merchant.subscription_expires_at || "",
      paymentMethod: (merchant.payment_method as "uen" | "mobile") || "uen",
      settings: (merchant.settings as Record<string, any>) || {},
      monthlyRevenue: merchant.monthly_revenue || 0,
      subscriptionLink: merchant.subscription_link || "",
      createdAt: merchant.created_at || "",
      updatedAt: merchant.updated_at || "",
    }));
  },

  async create(data: {
    businessName: string;
    email: string;
    password: string;
    uen?: string;
    mobile?: string;
    address?: string;
    subscriptionPlan?: "basic" | "professional" | "enterprise";
    monthlyRevenue?: number;
    subscriptionLink?: string;
  }): Promise<Merchant> {
    console.log("=== MERCHANTS_DB CREATE FUNCTION START ===");
    console.log("[MERCHANTS_DB] Function called at:", new Date().toISOString());
    console.log("[MERCHANTS_DB] Input data received:", data);
    console.log("[MERCHANTS_DB] Data types:", {
      businessName: typeof data.businessName,
      email: typeof data.email,
      password: typeof data.password,
      monthlyRevenue: typeof data.monthlyRevenue,
    });

    // Test connectivity and service role key first
    console.log("[MERCHANTS_DB] Testing Supabase Admin connectivity...");
    try {
      const testStartTime = Date.now();
      const { data: testData, error: testError } = await supabaseAdmin
        .from("profiles")
        .select("id")
        .limit(1);
      const testTime = Date.now() - testStartTime;

      console.log(
        `[MERCHANTS_DB] Connectivity test completed in ${testTime}ms`
      );
      console.log("[MERCHANTS_DB] Test result:", { testData, testError });

      if (testError) {
        console.log("[MERCHANTS_DB] ❌ CONNECTIVITY TEST FAILED:");
        console.log(
          "[MERCHANTS_DB] This suggests service role key or database issue"
        );
        console.log("[MERCHANTS_DB] Test error:", testError);
      } else {
        console.log("[MERCHANTS_DB] ✅ Connectivity test passed");
      }
    } catch (connectError) {
      console.log("[MERCHANTS_DB] ❌ CONNECTIVITY EXCEPTION:");
      console.error("[MERCHANTS_DB] Connection exception:", connectError);
    }

    let userResult;
    try {
      console.log(
        "[MERCHANTS_DB] About to create user account for merchant..."
      );
      console.log("[MERCHANTS_DB] Calling authHelpers.adminCreateUser with:", {
        email: data.email,
        businessName: data.businessName,
        role: "user",
      });

      const startTime = Date.now();
      userResult = await authHelpers.adminCreateUser(
        data.email,
        data.password,
        data.businessName,
        "user" // Merchants have 'user' role
      );
      const userCreationTime = Date.now() - startTime;

      console.log(
        `[MERCHANTS_DB] User creation completed in ${userCreationTime}ms`
      );
      console.log("[MERCHANTS_DB] User creation result:", userResult);

      if (userResult.error || !userResult.user) {
        console.log("[MERCHANTS_DB] ❌ USER CREATION FAILED:");
        console.log("[MERCHANTS_DB] Error:", userResult.error);
        console.log("[MERCHANTS_DB] User:", userResult.user);
        throw new Error(`Failed to create merchant user: ${userResult.error}`);
      }

      console.log("[MERCHANTS_DB] ✅ User created successfully!");
      console.log("[MERCHANTS_DB] Created user ID:", userResult.user.id);
      console.log("[MERCHANTS_DB] User email:", userResult.user.email);
      console.log("[MERCHANTS_DB] User profile:", userResult.user.profile);

      console.log("[MERCHANTS_DB] Now proceeding to create merchant record...");
    } catch (userError) {
      console.log("[MERCHANTS_DB] ❌ EXCEPTION during user creation:");
      console.error("[MERCHANTS_DB] Exception details:", userError);
      console.log("=== MERCHANTS_DB CREATE FUNCTION END (ERROR) ===");
      throw userError;
    }

    try {
      console.log("[MERCHANTS_DB] Preparing merchant record data...");
      // Create merchant record with profile reference
      const merchantData = {
        profile_id: userResult.user.id,
        business_name: data.businessName,
        email: data.email,
        password_hash: "UNUSED_AUTH_VIA_SUPABASE", // Placeholder - auth handled by Supabase
        uen: data.uen || null,
        mobile: data.mobile || null,
        address: data.address || null,
        subscription_plan: data.subscriptionPlan || "basic",
        subscription_link: data.subscriptionLink || null,
        monthly_revenue: data.monthlyRevenue || null,
        subscription_starts_at: new Date().toISOString(),
        subscription_expires_at: new Date(
          Date.now() + 365 * 24 * 60 * 60 * 1000
        ).toISOString(),
        status: "active" as const,
        payment_method: data.uen
          ? ("uen" as const)
          : data.mobile
          ? ("mobile" as const)
          : null,
        settings: {},
      };

      console.log(
        "[MERCHANTS_DB] Final merchant data to insert:",
        merchantData
      );
      console.log("[MERCHANTS_DB] Attempting database insert...");

      const insertStartTime = Date.now();
      const { data: result, error } = await supabaseAdmin
        .from("merchants")
        .insert(merchantData)
        .select()
        .single();
      const insertTime = Date.now() - insertStartTime;

      console.log(
        `[MERCHANTS_DB] Database insert completed in ${insertTime}ms`
      );
      console.log("[MERCHANTS_DB] Insert result:", { result, error });

      if (error) {
        console.log("[MERCHANTS_DB] ❌ MERCHANT CREATION FAILED:");
        console.error("[MERCHANTS_DB] Database error:", error);
        console.log("[MERCHANTS_DB] Error code:", error.code);
        console.log("[MERCHANTS_DB] Error message:", error.message);
        console.log("[MERCHANTS_DB] Error details:", error.details);

        // If merchant creation fails, cleanup the user account
        try {
          console.log(
            "[MERCHANTS_DB] Attempting to cleanup user account:",
            userResult.user.id
          );
          await supabaseAdmin.auth.admin.deleteUser(userResult.user.id);
          console.log("[MERCHANTS_DB] User account cleaned up successfully");
        } catch (cleanupError) {
          console.error(
            "[MERCHANTS_DB] Failed to cleanup user after merchant creation failure:",
            cleanupError
          );
        }
        throw new Error(`Failed to create merchant: ${error.message}`);
      }

      if (!result) {
        console.log(
          "[MERCHANTS_DB] ❌ No result returned from merchant creation"
        );
        throw new Error("Failed to create merchant: No result returned");
      }

      console.log(
        "[MERCHANTS_DB] ✅ Merchant record created successfully:",
        result
      );
      console.log("[MERCHANTS_DB] Building return object...");

      const merchantResponse = {
        id: result.id,
        businessName: result.business_name,
        email: result.email,
        uen: result.uen || undefined,
        mobile: result.mobile || undefined,
        address: result.address || undefined,
        status:
          (result.status as "active" | "suspended" | "pending" | "expired") ||
          "active",
        subscriptionPlan:
          (result.subscription_plan as
            | "basic"
            | "professional"
            | "enterprise") || "basic",
        subscriptionStartsAt: result.subscription_starts_at || "",
        subscriptionExpiresAt: result.subscription_expires_at || "",
        paymentMethod:
          (result.payment_method as "uen" | "mobile") ||
          (data.uen ? "uen" : "mobile"),
        settings: (result.settings as Record<string, any>) || {},
        monthlyRevenue: result.monthly_revenue || 0,
        subscriptionLink: result.subscription_link || "",
        createdAt: result.created_at || "",
        updatedAt: result.updated_at || "",
      };

      console.log("[MERCHANTS_DB] Final merchant response:", merchantResponse);
      console.log("=== MERCHANTS_DB CREATE FUNCTION END (SUCCESS) ===");
      return merchantResponse;
    } catch (merchantError) {
      console.log("[MERCHANTS_DB] ❌ EXCEPTION during merchant creation:");
      console.error(
        "[MERCHANTS_DB] Merchant creation exception:",
        merchantError
      );
      console.log("=== MERCHANTS_DB CREATE FUNCTION END (ERROR) ===");
      throw merchantError;
    }
  },

  async update(
    id: string,
    data: {
      businessName?: string;
      email?: string;
      uen?: string;
      mobile?: string;
      address?: string;
      subscriptionPlan?: "basic" | "professional" | "enterprise";
      monthlyRevenue?: number;
      subscriptionLink?: string;
    }
  ): Promise<Merchant> {
    console.log("=== MERCHANTS_DB UPDATE START ===");
    console.log("[MERCHANTS_DB] Function called at:", new Date().toISOString());
    console.log("[MERCHANTS_DB] Updating merchant ID:", id);
    console.log("[MERCHANTS_DB] Input data:", data);
    console.log(
      "[MERCHANTS_DB] Data types:",
      Object.keys(data).map(
        (key) => `${key}: ${typeof data[key as keyof typeof data]}`
      )
    );

    try {
      const updateData: any = {
        updated_at: new Date().toISOString(),
      };

      if (data.businessName !== undefined) {
        updateData.business_name = data.businessName;
        console.log("[MERCHANTS_DB] Setting business_name:", data.businessName);
      }
      if (data.email !== undefined) {
        updateData.email = data.email;
        console.log("[MERCHANTS_DB] Setting email:", data.email);
      }
      if (data.uen !== undefined) {
        updateData.uen = data.uen;
        console.log("[MERCHANTS_DB] Setting uen:", data.uen);
      }
      if (data.mobile !== undefined) {
        updateData.mobile = data.mobile;
        console.log("[MERCHANTS_DB] Setting mobile:", data.mobile);
      }
      if (data.address !== undefined) {
        updateData.address = data.address;
        console.log("[MERCHANTS_DB] Setting address:", data.address);
      }
      if (data.subscriptionPlan !== undefined) {
        updateData.subscription_plan = data.subscriptionPlan;
        console.log(
          "[MERCHANTS_DB] Setting subscription_plan:",
          data.subscriptionPlan
        );
      }
      if (data.monthlyRevenue !== undefined) {
        updateData.monthly_revenue = data.monthlyRevenue;
        console.log(
          "[MERCHANTS_DB] Setting monthly_revenue:",
          data.monthlyRevenue
        );
      }
      if (data.subscriptionLink !== undefined) {
        updateData.subscription_link = data.subscriptionLink;
        console.log(
          "[MERCHANTS_DB] Setting subscription_link:",
          data.subscriptionLink
        );
      }

      console.log("[MERCHANTS_DB] Final updateData object:", updateData);
      console.log(
        "[MERCHANTS_DB] About to call supabaseAdmin.from('merchants').update()..."
      );

      // Debug supabaseAdmin client
      console.log("[MERCHANTS_DB] Checking supabaseAdmin client:");
      console.log("[MERCHANTS_DB] supabaseAdmin exists:", !!supabaseAdmin);

      // Debug environment variables
      const serviceRoleKey = import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY;
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      console.log("[MERCHANTS_DB] Environment check:");
      console.log("[MERCHANTS_DB] VITE_SUPABASE_URL exists:", !!supabaseUrl);
      console.log("[MERCHANTS_DB] VITE_SUPABASE_URL:", supabaseUrl);
      console.log(
        "[MERCHANTS_DB] VITE_SUPABASE_SERVICE_ROLE_KEY exists:",
        !!serviceRoleKey
      );
      console.log(
        "[MERCHANTS_DB] VITE_SUPABASE_SERVICE_ROLE_KEY length:",
        serviceRoleKey?.length
      );
      console.log(
        "[MERCHANTS_DB] VITE_SUPABASE_SERVICE_ROLE_KEY preview:",
        serviceRoleKey?.substring(0, 20) + "..."
      );

      // Test simple query first
      console.log("[MERCHANTS_DB] Testing simple select query first...");
      try {
        const testQuery = await supabaseAdmin
          .from("merchants")
          .select("id, business_name")
          .eq("id", id)
          .single();
        console.log("[MERCHANTS_DB] Test query result:", testQuery);
      } catch (testError) {
        console.log("[MERCHANTS_DB] Test query failed:", testError);
      }

      console.log("[MERCHANTS_DB] Now attempting the actual update...");
      const updateStartTime = Date.now();

      const updateQuery = supabaseAdmin
        .from("merchants")
        .update(updateData)
        .eq("id", id)
        .select()
        .single();

      console.log(
        "[MERCHANTS_DB] Update query object created, now executing..."
      );

      const { data: result, error } = await updateQuery;
      const updateEndTime = Date.now();

      console.log(
        `[MERCHANTS_DB] Supabase update completed in ${
          updateEndTime - updateStartTime
        }ms`
      );
      console.log("[MERCHANTS_DB] Supabase result:", result);
      console.log("[MERCHANTS_DB] Supabase error:", error);

      if (error) {
        console.log("[MERCHANTS_DB] ❌ Database update failed:");
        console.log("[MERCHANTS_DB] Error code:", error.code);
        console.log("[MERCHANTS_DB] Error message:", error.message);
        console.log("[MERCHANTS_DB] Error details:", error.details);
        console.log("[MERCHANTS_DB] Error hint:", error.hint);
        throw new Error(`Failed to update merchant: ${error.message}`);
      }

      if (!result) {
        console.log(
          "[MERCHANTS_DB] ❌ No result returned from update operation"
        );
        throw new Error("No merchant found with the provided ID");
      }

      console.log("[MERCHANTS_DB] ✅ Database update successful!");
      console.log("[MERCHANTS_DB] Building response object...");

      const updatedMerchant = {
        id: result.id,
        businessName: result.business_name,
        email: result.email,
        uen: result.uen || undefined,
        mobile: result.mobile || undefined,
        address: result.address || undefined,
        status:
          (result.status as "active" | "suspended" | "pending" | "expired") ||
          "active",
        subscriptionPlan:
          (result.subscription_plan as
            | "basic"
            | "professional"
            | "enterprise") || "basic",
        subscriptionStartsAt: result.subscription_starts_at || "",
        subscriptionExpiresAt: result.subscription_expires_at || "",
        paymentMethod:
          (result.payment_method as "uen" | "mobile") ||
          (result.uen ? "uen" : "mobile"),
        settings: (result.settings as Record<string, any>) || {},
        monthlyRevenue: result.monthly_revenue || 0,
        subscriptionLink: result.subscription_link || "",
        createdAt: result.created_at || "",
        updatedAt: result.updated_at || "",
      };

      console.log("[MERCHANTS_DB] Final response object:", updatedMerchant);
      console.log("=== MERCHANTS_DB UPDATE END (SUCCESS) ===");
      return updatedMerchant;
    } catch (error) {
      console.log("[MERCHANTS_DB] ❌ EXCEPTION in update function:");
      console.error("[MERCHANTS_DB] Exception details:", error);
      console.log("[MERCHANTS_DB] Exception type:", typeof error);
      console.log(
        "[MERCHANTS_DB] Exception constructor:",
        error?.constructor?.name
      );

      if (error instanceof Error) {
        console.log("[MERCHANTS_DB] Exception message:", error.message);
        console.log("[MERCHANTS_DB] Exception stack:", error.stack);
      }

      console.log("=== MERCHANTS_DB UPDATE END (ERROR) ===");
      throw error;
    }
  },

  async updateStatus(
    id: string,
    status: "active" | "suspended" | "pending"
  ): Promise<Merchant | null> {
    console.log("[MERCHANTS_DB] Updating status in Supabase:", id, status);
    const { data: result, error } = await supabaseAdmin
      .from("merchants")
      .update({
        status,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update merchant status: ${error.message}`);
    }

    return {
      id: result.id,
      businessName: result.business_name,
      email: result.email,
      uen: result.uen || undefined,
      mobile: result.mobile || undefined,
      address: result.address || undefined,
      status:
        (result.status as "active" | "suspended" | "pending" | "expired") ||
        "active",
      subscriptionPlan:
        (result.subscription_plan as "basic" | "professional" | "enterprise") ||
        "basic",
      subscriptionStartsAt: result.subscription_starts_at || "",
      subscriptionExpiresAt: result.subscription_expires_at || "",
      paymentMethod: (result.payment_method as "uen" | "mobile") || "uen",
      settings: (result.settings as Record<string, any>) || {},
      monthlyRevenue: result.monthly_revenue || 0,
      subscriptionLink: result.subscription_link || "",
      createdAt: result.created_at || "",
      updatedAt: result.updated_at || "",
    };
  },

  async delete(id: string): Promise<boolean> {
    console.log("[MERCHANTS_DB] Deleting from Supabase:", id);

    // Get merchant to find profile_id before deleting
    const { data: merchant, error: fetchError } = await supabaseAdmin
      .from("merchants")
      .select("profile_id")
      .eq("id", id)
      .single();

    if (fetchError) {
      throw new Error(
        `Failed to fetch merchant for deletion: ${fetchError.message}`
      );
    }

    // Delete merchant record
    const { error } = await supabaseAdmin
      .from("merchants")
      .delete()
      .eq("id", id);

    if (error) {
      throw new Error(`Failed to delete merchant: ${error.message}`);
    }

    // Delete associated user account if profile_id exists
    if (merchant?.profile_id) {
      try {
        await supabaseAdmin.auth.admin.deleteUser(merchant.profile_id);
        console.log(
          "[MERCHANTS_DB] Deleted associated user account:",
          merchant.profile_id
        );
      } catch (userDeleteError) {
        console.error(
          "[MERCHANTS_DB] Failed to delete user account:",
          userDeleteError
        );
        // Don't fail the operation if user deletion fails
      }
    }

    return true;
  },
};

// Legacy localStorage functions removed - using Supabase exclusively now

// CMS Content Database API
export const CMSDB = {
  async getContent(section: string): Promise<any> {
    try {
      const { data, error } = await supabase
        .from("cms_content")
        .select("content")
        .eq("section", section)
        .eq("active", true)
        .order('created_at', { ascending: false })
        .maybeSingle();

      if (error) {
        if (
          error.code === "PGRST116" ||
          error.message?.includes("table") ||
          error.message?.includes("schema cache")
        ) {
          console.warn("CMS table not found, using fallback storage");
          return null;
        }
        console.warn("CMS content not found for section:", section);
        return null;
      }

      return data?.content || null;
    } catch (error) {
      console.warn("CMS database error, using fallback:", error);
      return null;
    }
  },

  async getAllContent(): Promise<Record<string, any>> {
    try {
      console.log('[CMSDB] Getting all content from website_content table...');
      
      const { data, error } = await supabase
        .from("website_content")
        .select("section, content")
        .eq("active", true)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('[CMSDB] Supabase query error:', error);
        if (
          error.code === "PGRST205" ||
          error.code === "PGRST116" ||
          error.message?.includes("table") ||
          error.message?.includes("schema cache") ||
          error.message?.includes("Could not find")
        ) {
          throw new SupabaseTableNotFoundError("website_content");
        }
        console.warn("CMS content table error:", error);
        return {};
      }

      console.log('[CMSDB] Raw data from Supabase:', data);

      const content: Record<string, any> = {};
      (data || []).forEach((item) => {
        if (item.section && item.content) {
          content[item.section] = item.content;
        }
      });

      console.log('[CMSDB] Processed content sections:', Object.keys(content));
      return content;
    } catch (error) {
      console.error('[CMSDB] Error in getAllContent:', error);
      if (error instanceof SupabaseTableNotFoundError) {
        throw error;
      }
      return {};
    }
  },

  async saveContent(
    section: string,
    content: any,
    adminId?: string
  ): Promise<void> {
    try {
      console.log(`[CMSDB] Saving content for section: ${section}`);
      
      // Deactivate current version
      const { error: deactivateError } = await supabase
        .from("website_content")
        .update({ active: false })
        .eq("section", section)
        .eq("active", true);
      
      if (deactivateError) {
        console.warn(`[CMSDB] Warning deactivating old content:`, deactivateError);
      }

      // Insert new version
      const { error: insertError } = await supabase
        .from("website_content")
        .insert({
          section,
          content,
          active: true,
          version: 1,
          created_by: adminId,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });

      if (insertError) {
        console.error(`[CMSDB] Error inserting new content:`, insertError);
        throw new Error(`Failed to save content: ${insertError.message}`);
      }
      
      console.log(`[CMSDB] Content saved successfully for section: ${section}`);
    } catch (error) {
      console.error(`[CMSDB] Save content failed:`, error);
      throw error;
    }
  },

  async saveAllContent(
    allContent: Record<string, any>,
    adminId?: string
  ): Promise<void> {
    console.log('[CMSDB] Saving all content sections...');
    
    try {
      for (const [section, content] of Object.entries(allContent)) {
        await this.saveContent(section, content, adminId);
      }
      console.log('[CMSDB] All content sections saved successfully');
    } catch (error) {
      console.error('[CMSDB] Save all content failed:', error);
      throw error;
    }
  }
};

// Legacy saveAllContent method - keeping for backward compatibility
const legacySaveAllContent = CMSDB.saveAllContent;
CMSDB.saveAllContent = async function(allContent: Record<string, any>, adminId?: string): Promise<void> {
  try {
    // Try new method first
    await legacySaveAllContent.call(this, allContent, adminId);
  } catch (error) {
    if (
      error instanceof Error && (
        error.message?.includes("table") ||
        error.message?.includes("schema cache") ||
        error.message?.includes("PGRST116")
      )
    ) {
      throw new SupabaseTableNotFoundError("cms_content");
    }
    throw error;
  }
};

// SystemSettingsDB removed - not implemented in current schema

// Migration helper for existing data
export function migrateAdminData() {
  console.log(
    "[ADMIN_MIGRATION] Migration skipped - using localStorage as primary storage"
  );
  // Migration is disabled until database tables are properly set up
  // This prevents errors when CMS tables don't exist in Supabase
}

// Check if admin migration is needed
export function needsAdminMigration(): boolean {
  const migrated = localStorage.getItem("paynowgo_cms_migrated");
  const hasLocalCMS = localStorage.getItem("paynowgo_cms_content");

  return !migrated && !!hasLocalCMS;
}