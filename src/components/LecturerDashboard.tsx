import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { SidebarProvider } from "@/components/ui/sidebar";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { LecturerCourses } from "@/components/LecturerCourses";
import { LecturerAssignments } from "@/components/LecturerAssignments";
import { LecturerStudents } from "@/components/LecturerStudents";
import { LecturerStudentHostels } from "@/components/LecturerStudentHostels";
import { CreateAssignment } from "@/components/CreateAssignment";
import { LecturerSidebar } from "@/components/LecturerSidebar";
import { LogOut } from "lucide-react";

export function LecturerDashboard() {
  const { profile } = useAuth();
  const [activeTab, setActiveTab] = useState("courses");

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.reload();
  };

  const renderContent = () => {
    switch (activeTab) {
      case "courses":
        return <LecturerCourses />;
      case "assignments":
        return (
          <div className="space-y-6">
            <CreateAssignment />
            <LecturerAssignments />
          </div>
        );
      case "students":
        return <LecturerStudents />;
      case "hostels":
        return <LecturerStudentHostels />;
      default:
        return <LecturerCourses />;
    }
  };

  return (
    <SidebarProvider defaultOpen={true}>
      <div className="min-h-screen flex w-full bg-background">
        <LecturerSidebar activeTab={activeTab} onTabChange={setActiveTab} />
        
        <main className="flex-1 overflow-auto">
          <header className="sticky top-0 z-10 border-b bg-card shadow-sm">
            <div className="flex items-center justify-between px-6 py-4">
              <div>
                <h1 className="text-2xl font-bold text-foreground">Lecturer Dashboard</h1>
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
                  Manage your courses, assignments, and students.
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
