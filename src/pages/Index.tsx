import { LoginForm } from "@/components/LoginForm";
import { AdminDashboard } from "@/components/AdminDashboard";
import { useAuth } from "@/hooks/useAuth";
import { Toaster } from "@/components/ui/toaster";
import { supabase } from "@/integrations/supabase/client";

const Index = () => {
  const { user, profile, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user || !profile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <LoginForm />
        <Toaster />
      </div>
    );
  }

  if (profile.role === "admin") {
    return (
      <>
        <AdminDashboard />
        <Toaster />
      </>
    );
  }

  // Student and Lecturer dashboards (placeholder for now)
  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">
            {profile.role === "student" ? "Student" : "Lecturer"} Dashboard
          </h1>
          <button 
            onClick={() => {
              supabase.auth.signOut();
              window.location.reload();
            }}
            className="px-4 py-2 bg-secondary text-secondary-foreground rounded-md hover:bg-secondary/80"
          >
            Logout
          </button>
        </div>
        <div className="text-center">
          <h2 className="text-2xl font-semibold mb-2">
            Welcome, {profile.full_name || 'User'}!
          </h2>
          <p className="text-muted-foreground">Your dashboard is ready.</p>
        </div>
      </div>
      <Toaster />
    </div>
  );
};

export default Index;
