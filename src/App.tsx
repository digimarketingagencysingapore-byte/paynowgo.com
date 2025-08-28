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
    console.log("[APP] Initializing app and checking Supabase session...");
    console.log("[APP] Environment:", window.location.hostname);

    checkSupabaseSession();

    // Timeout fallback to prevent infinite loading
    const loadingTimeout = setTimeout(() => {
      console.warn('[APP] Loading timeout reached, forcing loading state to false');
      setIsLoading(false);
    }, 10000); // 10 second timeout

    // Listen for auth state changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log("[APP] Auth state changed:", event, session?.user?.id);

      if (event === "SIGNED_IN" && session?.user) {
        await handleAuthUser(session.user);
      } else if (event === "SIGNED_OUT") {
        handleSignOut();
        setIsLoading(false); // Ensure loading is cleared on signout
      } else {
        // Handle other auth events (TOKEN_REFRESHED, etc.)
        console.log("[APP] Other auth event, clearing loading state");
        setIsLoading(false);
      }
    });

    return () => {
      clearTimeout(loadingTimeout);
      subscription.unsubscribe();
    };
  }, []);

  const checkSupabaseSession = async () => {
    try {
      console.log("[APP] Getting current Supabase session...");
      const {
        data: { session },
        error,
      } = await supabase.auth.getSession();

      if (error) {
        console.error("[APP] Error getting session:", error);
        console.log("[APP] Setting loading to false due to session error");
        setIsLoading(false);
        return;
      }

      if (session?.user) {
        console.log("[APP] Found active session for user:", session.user.id);
        await handleAuthUser(session.user);
      } else {
        console.log("[APP] No active session found");
        console.log("[APP] Setting loading to false - no session found");
        setIsLoading(false);
      }
    } catch (error) {
      console.error("[APP] Error checking session:", error);
      console.log("[APP] Setting loading to false due to catch error");
      setIsLoading(false);
    }
  };

  const handleAuthUser = async (user: any) => {
    try {
      console.log("[APP] Processing authenticated user:", user.id, user.email);

      // Get user profile to determine role with timeout
      console.log("[APP] Querying profiles table...");
      const profileTimeout = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Profile query timeout')), 5000)
      );
      
      const profileQuery = supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      const { data: profile, error: profileError } = await Promise.race([
        profileQuery,
        profileTimeout
      ]).catch((error: any) => {
        console.error("[APP] Profile query failed:", error);
        return { data: null, error };
      }) as { data: any, error: any };

      if (profileError || !profile) {
        console.warn(
          "[APP] Profile query failed or no profile found:",
          profileError?.message || "No profile data"
        );
        console.log("[APP] Continuing with basic authentication (no profile)");
        
        // Continue without profile but with basic auth
        setIsAuthenticated(true);
        setUserType("merchant"); // Default to merchant for routing
        setCurrentUser({
          id: user.id,
          email: user.email!,
        });

        console.log("[APP] Setting loading to false - user without profile");
        setIsLoading(false);
        return;
      }

      console.log("[APP] Profile loaded:", profile.role);

      if (profile.role === "admin") {
        // Admin user
        console.log("[APP] Setting up admin user");
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
      } else {
        // Regular user - try to get merchant data
        console.log("[APP] Looking for merchant data for regular user");
        console.log("[APP] Querying merchants table...");
        const merchantTimeout = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Merchant query timeout')), 5000)
        );
        
        const merchantQuery = supabase
          .from("merchants")
          .select("*")
          .eq("profile_id", profile.id)
          .single();

        const { data: merchant, error: merchantError } = await Promise.race([
          merchantQuery,
          merchantTimeout
        ]).catch((error: any) => {
          console.error("[APP] Merchant query failed:", error);
          return { data: null, error };
        }) as { data: any, error: any };

        if (merchantError || !merchant) {
          console.warn(
            "[APP] Merchant query failed or no merchant found:",
            merchantError?.message || "No merchant data"
          );
          console.log("[APP] Continuing with profile but no merchant data");

          // Still set as authenticated but without merchant data
          setIsAuthenticated(true);
          setUserType("merchant"); // Keep as merchant type for routing
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
          
          console.log("[APP] Setting loading to false - user with profile but no merchant");
          setIsLoading(false);
          return;
        } else {
          console.log("[APP] Merchant loaded:", merchant.business_name);

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

          setIsAuthenticated(true);
          setUserType("merchant");
          setCurrentUser(merchantUser);
        }
      }

      console.log("[APP] Setting loading to false - auth user processing complete");
      setIsLoading(false);
    } catch (error) {
      console.error("[APP] Error processing authenticated user:", error);
      console.log("[APP] Setting loading to false due to auth user error");
      setIsLoading(false);
    }
  };

  const handleSignOut = () => {
    console.log("[APP] Handling sign out");
    setIsAuthenticated(false);
    setUserType(null);
    setCurrentUser(null);
    setIsLoading(false); // Ensure loading state is cleared
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
    // Show loading state while checking authentication
    if (isLoading) {
      return (
        <div className="min-h-screen bg-white flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Checking authentication...</p>
          </div>
        </div>
      );
    }
    
    return isAuthenticated && userType === "merchant" ? (
      renderMerchantDashboard()
    ) : (
      <MerchantLogin onLoginSuccess={handleLoginSuccess} />
    );
  }

  // Default to landing page for main domain (paynowgo.com) and all other cases
  return <LandingPage />;
}

export default App;
