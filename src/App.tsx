import React from "react";
import { LandingPage } from "./pages/LandingPage";
import { AdminLogin } from "./pages/AdminLogin";
import { DisplayLogin } from "./pages/DisplayLogin";
import { MerchantLogin } from "./pages/MerchantLogin";
import { Dashboard } from "./components/pages/Dashboard";
import { POSSystem } from "./components/pages/POSSystem";
import { ItemsList } from "./components/items/ItemsList";
import { Orders } from "./components/pages/Orders";
import { Reports } from "./components/pages/Reports";
import { AdminSettings } from "./components/pages/AdminSettings";
import { Header } from "./components/layout/Header";
import { Sidebar } from "./components/layout/Sidebar";
import { OrderProvider } from "./contexts/OrderContext";
import { PaymentProvider } from "./contexts/PaymentContext";
import { SettingsProvider } from "./contexts/SettingsContext";
import { supabase } from "./lib/supabase";
import type { AuthUser } from "@/@types";

export type Page =
  | "dashboard"
  | "pos"
  | "items"
  | "orders"
  | "reports"
  | "settings";

function App() {
  const [isAuthenticated, setIsAuthenticated] = React.useState(false);
  const [userType, setUserType] = React.useState<"merchant" | "admin" | null>(
    null
  );
  const [currentUser, setCurrentUser] = React.useState<AuthUser | null>(null);
  const [currentPage, setCurrentPage] = React.useState<Page>("dashboard");
  const [sidebarOpen, setSidebarOpen] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(true);

  const path = window.location.pathname;
  const hostname = window.location.hostname;

  // Get subdomain for production routing
  const getSubdomain = () => {
    const parts = hostname.split(".");
    if (parts.length >= 3) {
      return parts[0];
    }
    return null;
  };

  const subdomain = getSubdomain();

  // Check authentication on mount
  React.useEffect(() => {
    console.log("[APP] ===== INITIALIZING AUTHENTICATION =====");
    console.log("[APP] Environment:", window.location.hostname);
    console.log("[APP] Current path:", window.location.pathname);
    console.log("[APP] Subdomain:", subdomain);
    
    // Safety timeout to prevent infinite loading
    const safetyTimeout = setTimeout(() => {
      console.warn("[APP] Safety timeout - forcing loading state to false");
      setIsLoading(false);
    }, 3000);

    // Listen for auth state changes - this will handle both initial session and future changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log("[APP] ===== AUTH STATE CHANGE =====");
      console.log("[APP] Event:", event);
      console.log("[APP] Has session:", !!session);
      console.log("[APP] Has user:", !!session?.user);

      clearTimeout(safetyTimeout);

      try {
        if (session?.user) {
          console.log("[APP] Session found - processing user");
          await handleAuthUser(session.user);
        } else {
          console.log("[APP] No session - clearing auth state");
          setIsAuthenticated(false);
          setUserType(null);
          setCurrentUser(null);
          setIsLoading(false);
        }
      } catch (error) {
        console.error("[APP] Error in auth state change handler:", error);
        setIsLoading(false);
      }
    });

    return () => {
      clearTimeout(safetyTimeout);
      subscription.unsubscribe();
    };
  }, []);


  const handleAuthUser = async (user: any) => {
    try {
      console.log("[APP] ===== PROCESSING AUTHENTICATED USER =====");
      console.log("[APP] User ID:", user.id);
      console.log("[APP] User Email:", user.email);

      // Test Supabase connectivity first with timeout
      console.log("[APP] Step 0: Testing Supabase connectivity...");
      let supabaseWorking = false;
      try {
        const connectivityTimeout = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Connectivity test timeout')), 3000)
        );
        
        const connectivityTest = supabase.from('profiles').select('count', { count: 'exact', head: true });
        
        await Promise.race([connectivityTest, connectivityTimeout]);
        console.log("[APP] ✅ Supabase connectivity OK");
        supabaseWorking = true;
      } catch (connectError) {
        console.error("[APP] ❌ Supabase connectivity failed:", connectError.message);
        console.log("[APP] Will proceed with auth-only mode (no profile/merchant data)");
        supabaseWorking = false;
      }

      // If Supabase is not working, use auth-only mode
      if (!supabaseWorking) {
        console.log("[APP] Setting up basic authenticated user (no database)");
        setIsAuthenticated(true);
        setUserType("merchant");
        setCurrentUser({
          id: user.id,
          email: user.email!,
        });
        setIsLoading(false);
        console.log("[APP] ===== AUTH COMPLETE (AUTH-ONLY MODE) =====");
        return;
      }

      // Get user profile to determine role
      console.log("[APP] Step 1: Loading user profile...");
      const profileStart = Date.now();
      
      // Add timeout to prevent hanging
      const profileTimeout = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Profile query timeout after 5 seconds')), 5000)
      );
      
      const profileQuery = supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();
      
      let profile, profileError;
      try {
        const result = await Promise.race([profileQuery, profileTimeout]);
        profile = result.data;
        profileError = result.error;
        console.log("[APP] Profile query took:", Date.now() - profileStart, "ms");
        console.log("[APP] Profile result:", { profile: !!profile, error: profileError?.message });
      } catch (error) {
        console.error("[APP] Profile query failed or timed out:", error);
        profileError = error;
        profile = null;
      }

      if (profileError || !profile) {
        console.warn("[APP] No profile found - setting up basic user:", profileError?.message);
        console.log("[APP] Setting auth state for basic user and clearing loading");
        setIsAuthenticated(true);
        setUserType("merchant");
        setCurrentUser({
          id: user.id,
          email: user.email!,
        });
        setIsLoading(false);
        console.log("[APP] ===== AUTH COMPLETE (BASIC USER) =====");
        return;
      }

      console.log("[APP] Step 2: Profile loaded - role:", profile.role);

      if (profile.role === "admin") {
        console.log("[APP] Step 3: Setting up admin user");
        setIsAuthenticated(true);
        setUserType("admin");
        setCurrentUser({
          id: user.id,
          email: user.email!,
          profile: {
            id: profile.id,
            full_name: profile.full_name,
            role: profile.role,
            created_at: profile.created_at,
            updated_at: profile.updated_at,
          },
        });
        setIsLoading(false);
        console.log("[APP] ===== AUTH COMPLETE (ADMIN USER) =====");
        return;
      }

      // Regular user - get merchant data
      console.log("[APP] Step 3: Loading merchant data for regular user...");
      const merchantStart = Date.now();
      
      // Add timeout to prevent hanging
      const merchantTimeout = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Merchant query timeout after 5 seconds')), 5000)
      );
      
      const merchantQuery = supabase
        .from("merchants")
        .select("*")
        .eq("profile_id", profile.id)
        .single();
      
      let merchant, merchantError;
      try {
        const result = await Promise.race([merchantQuery, merchantTimeout]);
        merchant = result.data;
        merchantError = result.error;
        console.log("[APP] Merchant query took:", Date.now() - merchantStart, "ms");
        console.log("[APP] Merchant result:", { merchant: !!merchant, error: merchantError?.message });
      } catch (error) {
        console.error("[APP] Merchant query failed or timed out:", error);
        merchantError = error;
        merchant = null;
      }

      if (merchantError || !merchant) {
        console.warn("[APP] No merchant found - setting up user with profile only:", merchantError?.message);
        console.log("[APP] Setting auth state for profile user and clearing loading");
        setIsAuthenticated(true);
        setUserType("merchant");
        setCurrentUser({
          id: user.id,
          email: user.email!,
          profile: {
            id: profile.id,
            full_name: profile.full_name,
            role: profile.role,
            created_at: profile.created_at,
            updated_at: profile.updated_at,
          },
        });
        setIsLoading(false);
        console.log("[APP] ===== AUTH COMPLETE (PROFILE USER) =====");
        return;
      }

      console.log("[APP] Step 4: Merchant loaded:", merchant.business_name);
      console.log("[APP] Step 5: Building merchant user object...");
      
      // Set up full merchant user
      const merchantUser: AuthUser = {
        id: user.id,
        email: user.email!,
        profile: {
          id: profile.id,
          full_name: profile.full_name,
          role: profile.role,
          created_at: profile.created_at,
          updated_at: profile.updated_at,
        },
        merchant: {
          id: merchant.id,
          businessName: merchant.business_name,
          email: user.email!,
          uen: merchant.uen,
          mobile: merchant.mobile,
          address: merchant.address,
          status: merchant.status || "pending",
          subscriptionPlan: merchant.subscription_plan,
          monthlyRevenue: merchant.monthly_revenue,
          subscriptionLink: merchant.subscription_link,
        },
      };

      console.log("[APP] Step 6: Setting authentication state...");
      setIsAuthenticated(true);
      setUserType("merchant");
      setCurrentUser(merchantUser);
      
      console.log("[APP] Step 7: Clearing loading state...");
      setIsLoading(false);
      
      console.log("[APP] ✅ MERCHANT AUTHENTICATION SUCCESS");
      console.log("[APP] Merchant:", merchant.business_name);
      console.log("[APP] ===== AUTH COMPLETE (FULL MERCHANT) =====");
      
    } catch (error) {
      console.error("[APP] ❌ AUTHENTICATION PROCESSING FAILED:", error);
      console.log("[APP] Force clearing loading state due to error");
      setIsLoading(false);
    }
  };

  const handleSignOut = () => {
    console.log("[APP] Handling sign out - clearing authentication state");
    setIsAuthenticated(false);
    setUserType(null);
    setCurrentUser(null);
    setIsLoading(false);
  };

  const handleLoginSuccess = () => {
    console.log(
      "[APP] Login success callback triggered - session should already be handled by auth listener"
    );
    // Session will be handled by onAuthStateChange listener
  };

  const handleLogout = async () => {
    console.log("[APP] Logout initiated");
    try {
      await supabase.auth.signOut();
      // handleSignOut will be called by auth state change listener
    } catch (error) {
      console.error("[APP] Error during logout:", error);
      // Force cleanup even if logout fails
      handleSignOut();
    }
    window.location.href = "/";
  };

  // Render merchant dashboard
  const renderMerchantDashboard = () => (
    <SettingsProvider>
      <OrderProvider>
        <PaymentProvider>
          <div className="flex h-screen bg-gray-50">
            <Sidebar
              currentPage={currentPage}
              setCurrentPage={setCurrentPage}
              isOpen={sidebarOpen}
              setIsOpen={setSidebarOpen}
            />
            <div className="flex-1 flex flex-col overflow-hidden">
              <Header
                onMenuClick={() => setSidebarOpen(true)}
                currentPage={currentPage}
                onLogout={handleLogout}
              />
              <main className="flex-1 overflow-auto">
                {currentPage === "dashboard" && (
                  <Dashboard onNavigate={setCurrentPage} />
                )}
                {currentPage === "pos" && <POSSystem />}
                {currentPage === "items" && <ItemsList />}
                {currentPage === "orders" && <Orders />}
                {currentPage === "reports" && <Reports />}
                {currentPage === "settings" && <AdminSettings />}
              </main>
            </div>
          </div>
        </PaymentProvider>
      </OrderProvider>
    </SettingsProvider>
  );

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Admin routes
  if (subdomain === "admin" || path === "/admin") {
    return <AdminLogin />;
  }

  // Display routes
  if (subdomain === "display" || path === "/display") {
    return <DisplayLogin />;
  }

  // Merchant routes - only for specific paths and subdomains, NOT main domain
  if (
    subdomain === "merchant" ||
    subdomain === "app" ||
    path === "/merchant" ||
    path === "/app" ||
    path.startsWith("/merchant")
  ) {
    console.log("[APP] Merchant route detected - evaluating authentication...");
    console.log("[APP] Auth state:", { isAuthenticated, userType, isLoading });
    
    // Show loading state while checking authentication
    if (isLoading) {
      console.log("[APP] Still loading - showing loading screen");
      return (
        <div className="min-h-screen bg-white flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Checking authentication...</p>
          </div>
        </div>
      );
    }
    
    if (isAuthenticated && userType === "merchant") {
      console.log("[APP] ✅ Authenticated merchant - rendering dashboard");
      return renderMerchantDashboard();
    } else {
      console.log("[APP] ❌ Not authenticated - showing login form");
      console.log("[APP] Redirect reason:", { isAuthenticated, userType });
      return <MerchantLogin onLoginSuccess={handleLoginSuccess} />;
    }
  }

  // Default to landing page for main domain (paynowgo.com) and all other cases
  return <LandingPage />;
}

export default App;
