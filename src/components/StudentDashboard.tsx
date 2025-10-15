import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { SidebarProvider } from "@/components/ui/sidebar";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { StudentCourses } from "@/components/StudentCourses";
import { StudentAssignments } from "@/components/StudentAssignments";
import { StudentGrades } from "@/components/StudentGrades";
import { StudentHostelBooking } from "@/components/StudentHostelBooking";
import { StudentNotifications } from "@/components/StudentNotifications";
import { StudentSidebar } from "@/components/StudentSidebar";
import { LogOut } from "lucide-react";

export function StudentDashboard() {
  const { profile } = useAuth();
  const [activeTab, setActiveTab] = useState("courses");

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.reload();
  };

  const renderContent = () => {
    switch (activeTab) {
      case "courses":
        return <StudentCourses />;
      case "assignments":
        return <StudentAssignments />;
      case "grades":
        return <StudentGrades />;
      case "hostel":
        return <StudentHostelBooking />;
      case "notifications":
        return <StudentNotifications />;
      default:
        return <StudentCourses />;
    }
  };

  return (
    <SidebarProvider defaultOpen={true}>
      <div className="min-h-screen flex w-full bg-background">
        <StudentSidebar activeTab={activeTab} onTabChange={setActiveTab} />
        
        <main className="flex-1 overflow-auto">
          <header className="sticky top-0 z-10 border-b bg-card shadow-sm">
            <div className="flex items-center justify-between px-6 py-4">
              <div>
                <h1 className="text-2xl font-bold text-foreground">Student Dashboard</h1>
                <p className="text-sm text-muted-foreground">Welcome, {profile?.full_name}</p>
              </div>
              <Button onClick={handleLogout} variant="outline" size="sm" className="gap-2">
                <LogOut className="h-4 w-4" />
                Logout
              </Button>
            </div>
          </header>

          <div className="p-6">
            <Card className="mb-6">
              <CardHeader>
                <CardTitle>Your Portal</CardTitle>
                <CardDescription>
                  Access your courses, assignments, and grades.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Email</p>
                    <p className="font-medium break-all">{profile?.email}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Role</p>
                    <p className="font-medium capitalize">{profile?.role}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="space-y-6">{renderContent()}</div>
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
}