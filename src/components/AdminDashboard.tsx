import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { CreateUserForm } from "@/components/CreateUserForm";
import { UserManagement } from "@/components/UserManagement";
import { CourseManagement } from "@/components/CourseManagement";
import { SchoolDataManagement } from "@/components/SchoolDataManagement";
import { HostelManagement } from "@/components/HostelManagement";
import { AcademicCalendar } from "@/components/AcademicCalendar";
import { ResultsManagement } from "@/components/ResultsManagement";
import { FeeManagement } from "@/components/FeeManagement";
import { EnrollmentRequests } from "@/components/EnrollmentRequests";
import { AttendanceApprovals } from "@/components/AttendanceApprovals";
import { RegistrationChart } from "@/components/RegistrationChart";
import { AdminSidebar } from "@/components/AdminSidebar";
import { LogOut } from "lucide-react";

export function AdminDashboard() {
  const { profile } = useAuth();
  const [activeTab, setActiveTab] = useState("students");

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.reload();
  };

  const renderContent = () => {
    switch (activeTab) {
      case "students":
        return <UserManagement userType="student" />;
      case "lecturers":
        return <UserManagement userType="lecturer" />;
      case "courses":
        return <CourseManagement />;
      case "enrollment-requests":
        return <EnrollmentRequests />;
      case "attendance":
        return <AttendanceApprovals />;
      case "hostels":
        return <HostelManagement />;
      case "calendar":
        return <AcademicCalendar />;
      case "results":
        return <ResultsManagement />;
      case "fees":
        return <FeeManagement />;
      case "analytics":
        return <RegistrationChart />;
      case "school":
        return <SchoolDataManagement />;
      case "create":
        return <CreateUserForm />;
      default:
        return <UserManagement userType="student" />;
    }
  };

  return (
    <SidebarProvider defaultOpen={true}>
      <div className="min-h-screen flex w-full bg-background">
        <AdminSidebar activeTab={activeTab} onTabChange={setActiveTab} />
        
        <main className="flex-1 overflow-auto">
          <header className="sticky top-0 z-10 border-b bg-card shadow-sm">
            <div className="flex items-center justify-between px-6 py-4">
              <div className="flex items-center gap-4">
                <SidebarTrigger />
                <div>
                  <h1 className="text-2xl font-bold text-foreground">Admin Dashboard</h1>
                  <p className="text-sm text-muted-foreground">Welcome, {profile?.full_name}</p>
                </div>
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
                <CardTitle>System Overview</CardTitle>
                <CardDescription>
                  You have full administrative access to manage the system.
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