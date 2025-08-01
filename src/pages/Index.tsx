import { LoginForm } from "@/components/LoginForm";
import { AdminDashboard } from "@/components/AdminDashboard";
import { StudentDashboard } from "@/components/StudentDashboard";
import { LecturerDashboard } from "@/components/LecturerDashboard";
import { useAuth } from "@/hooks/useAuth";
import { Toaster } from "@/components/ui/toaster";

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

  if (profile.role === "student") {
    return (
      <>
        <StudentDashboard />
        <Toaster />
      </>
    );
  }

  if (profile.role === "lecturer") {
    return (
      <>
        <LecturerDashboard />
        <Toaster />
      </>
    );
  }

  // Fallback for any other role
  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-4xl mx-auto">
        <div className="text-center">
          <h1 className="text-3xl font-bold mb-4">Welcome, {profile.full_name || 'User'}!</h1>
          <p className="text-lg text-muted-foreground">
            You are logged in as a {profile.role}.
          </p>
        </div>
      </div>
      <Toaster />
    </div>
  );
};

export default Index;
