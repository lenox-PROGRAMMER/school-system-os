import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { LecturerCourses } from "@/components/LecturerCourses";
import { LecturerAssignments } from "@/components/LecturerAssignments";
import { LecturerStudents } from "@/components/LecturerStudents";
import { LecturerStudentHostels } from "@/components/LecturerStudentHostels";
import { CreateAssignment } from "@/components/CreateAssignment";

export function LecturerDashboard() {
  const { profile } = useAuth();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.reload();
  };

  return (
    <div className="min-h-screen bg-background p-3 sm:p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold">Lecturer Dashboard</h1>
          <Button onClick={handleLogout} variant="outline" className="self-end sm:self-auto">
            Logout
          </Button>
        </div>

        <div className="grid gap-6 mb-8">
          <Card>
            <CardHeader>
              <CardTitle>Welcome, {profile?.full_name}!</CardTitle>
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
        </div>

        <Tabs defaultValue="courses" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4 gap-1">
            <TabsTrigger value="courses" className="text-xs sm:text-sm">My Courses</TabsTrigger>
            <TabsTrigger value="assignments" className="text-xs sm:text-sm">Assignments</TabsTrigger>
            <TabsTrigger value="students" className="text-xs sm:text-sm">Students</TabsTrigger>
            <TabsTrigger value="hostels" className="text-xs sm:text-sm">Student Hostels</TabsTrigger>
          </TabsList>

          <TabsContent value="courses">
            <LecturerCourses />
          </TabsContent>

          <TabsContent value="assignments">
            <div className="space-y-6">
              <CreateAssignment />
              <LecturerAssignments />
            </div>
          </TabsContent>

          <TabsContent value="students">
            <LecturerStudents />
          </TabsContent>

          <TabsContent value="hostels">
            <LecturerStudentHostels />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}