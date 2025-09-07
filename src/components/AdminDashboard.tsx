import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { CreateUserForm } from "@/components/CreateUserForm";
import { UserManagement } from "@/components/UserManagement";
import { CourseManagement } from "@/components/CourseManagement";
import { SchoolDataManagement } from "@/components/SchoolDataManagement";
import { HostelManagement } from "@/components/HostelManagement";
import { AcademicCalendar } from "@/components/AcademicCalendar";
import { ResultsManagement } from "@/components/ResultsManagement";

export function AdminDashboard() {
  const { profile } = useAuth();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.reload();
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">Admin Dashboard</h1>
          <Button onClick={handleLogout} variant="outline">
            Logout
          </Button>
        </div>

        <div className="grid gap-6 mb-8">
          <Card>
            <CardHeader>
              <CardTitle>Welcome, {profile?.full_name}!</CardTitle>
              <CardDescription>
                You have full administrative access to the system.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Email</p>
                  <p className="font-medium">{profile?.email}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Role</p>
                  <p className="font-medium capitalize">{profile?.role}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="students" className="space-y-6">
          <TabsList className="grid w-full grid-cols-8">
            <TabsTrigger value="students">Students</TabsTrigger>
            <TabsTrigger value="lecturers">Lecturers</TabsTrigger>
            <TabsTrigger value="courses">Courses</TabsTrigger>
            <TabsTrigger value="hostels">Hostels</TabsTrigger>
            <TabsTrigger value="calendar">Calendar</TabsTrigger>
            <TabsTrigger value="results">Results</TabsTrigger>
            <TabsTrigger value="school">School Data</TabsTrigger>
            <TabsTrigger value="create">Create User</TabsTrigger>
          </TabsList>

          <TabsContent value="students">
            <UserManagement userType="student" />
          </TabsContent>

          <TabsContent value="lecturers">
            <UserManagement userType="lecturer" />
          </TabsContent>

          <TabsContent value="courses">
            <CourseManagement />
          </TabsContent>

          <TabsContent value="hostels">
            <HostelManagement />
          </TabsContent>

          <TabsContent value="calendar">
            <AcademicCalendar />
          </TabsContent>

          <TabsContent value="results">
            <ResultsManagement />
          </TabsContent>

          <TabsContent value="school">
            <SchoolDataManagement />
          </TabsContent>

          <TabsContent value="create">
            <CreateUserForm />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}