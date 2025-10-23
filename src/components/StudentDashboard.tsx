import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { StudentCourses } from "@/components/StudentCourses";
import { StudentAssignments } from "@/components/StudentAssignments";
import { StudentGrades } from "@/components/StudentGrades";
import { StudentHostelBooking } from "@/components/StudentHostelBooking";
import { StudentPayments } from "@/components/StudentPayments";
import { StudentNotifications } from "@/components/StudentNotifications";
import { StudentSidebar } from "@/components/StudentSidebar";
import { LogOut, KeyRound } from "lucide-react";

export function StudentDashboard() {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("courses");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isPasswordDialogOpen, setIsPasswordDialogOpen] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.reload();
  };

  const handlePasswordChange = async () => {
    if (newPassword !== confirmPassword) {
      toast({
        title: "Error",
        description: "Passwords do not match",
        variant: "destructive",
      });
      return;
    }

    if (newPassword.length < 6) {
      toast({
        title: "Error",
        description: "Password must be at least 6 characters",
        variant: "destructive",
      });
      return;
    }

    setIsChangingPassword(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Password changed successfully",
      });
      setIsPasswordDialogOpen(false);
      setNewPassword("");
      setConfirmPassword("");
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsChangingPassword(false);
    }
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
      case "payments":
        return <StudentPayments />;
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
              <div className="flex items-center gap-4">
                <SidebarTrigger />
                <div>
                  <h1 className="text-2xl font-bold text-foreground">Student Dashboard</h1>
                  <p className="text-sm text-muted-foreground">Welcome, {profile?.full_name}</p>
                </div>
              </div>
              <div className="flex gap-2">
                <Dialog open={isPasswordDialogOpen} onOpenChange={setIsPasswordDialogOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm" className="gap-2">
                      <KeyRound className="h-4 w-4" />
                      Change Password
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Change Password</DialogTitle>
                      <DialogDescription>
                        Enter your new password below
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="space-y-2">
                        <Label htmlFor="new-password">New Password</Label>
                        <Input
                          id="new-password"
                          type="password"
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          placeholder="Enter new password"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="confirm-password">Confirm Password</Label>
                        <Input
                          id="confirm-password"
                          type="password"
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          placeholder="Confirm new password"
                        />
                      </div>
                    </div>
                    <Button 
                      onClick={handlePasswordChange} 
                      disabled={isChangingPassword}
                      className="w-full"
                    >
                      {isChangingPassword ? "Changing..." : "Change Password"}
                    </Button>
                  </DialogContent>
                </Dialog>
                <Button onClick={handleLogout} variant="outline" size="sm" className="gap-2">
                  <LogOut className="h-4 w-4" />
                  Logout
                </Button>
              </div>
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