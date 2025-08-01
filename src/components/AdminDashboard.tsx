import { useState } from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

interface CreateUserFormData {
  email: string;
  fullName: string;
  role: "student" | "lecturer" | "admin";
}


export function AdminDashboard() {
  const [isLoading, setIsLoading] = useState(false);
  const [generatedPassword, setGeneratedPassword] = useState("");
  
  const form = useForm<CreateUserFormData>({
    defaultValues: {
      email: "",
      fullName: "",
      role: "student"
    }
  });

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.reload();
  };

  const onSubmit = async (data: CreateUserFormData) => {
    setIsLoading(true);
    
    try {
      // Get current session for authentication
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        toast({
          title: "Error",
          description: "You must be logged in to create users",
          variant: "destructive",
        });
        return;
      }

      // Call edge function to create user
      const response = await fetch('/functions/v1/create-user', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          email: data.email,
          fullName: data.fullName,
          role: data.role
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        toast({
          title: "Error",
          description: result.error || "Failed to create user",
          variant: "destructive",
        });
        return;
      }

      setGeneratedPassword(result.password);
      form.reset();
      
      toast({
        title: "Success",
        description: result.message,
      });
      
    } catch (error) {
      console.error('Error creating user:', error);
      toast({
        title: "Error",
        description: "Failed to create user",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">Admin Dashboard</h1>
          <Button onClick={handleLogout} variant="outline">
            Logout
          </Button>
        </div>

        <div className="grid gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Create New User</CardTitle>
              <CardDescription>
                Register new students or lecturers. A secure 8-character password will be generated automatically.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="fullName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Full Name</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter full name" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input type="email" placeholder="Enter email address" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="role"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Role</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select role" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="student">Student</SelectItem>
                            <SelectItem value="lecturer">Lecturer</SelectItem>
                            <SelectItem value="admin">Admin</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <Button type="submit" disabled={isLoading} className="w-full">
                    {isLoading ? "Creating..." : "Create User"}
                  </Button>
                </form>
              </Form>

              {generatedPassword && (
                <div className="mt-4 p-4 bg-muted rounded-lg">
                  <p className="text-sm font-medium">Generated Password:</p>
                  <code className="text-lg font-mono bg-background px-2 py-1 rounded">
                    {generatedPassword}
                  </code>
                  <p className="text-xs text-muted-foreground mt-2">
                    Share this password securely with the user. It contains uppercase, lowercase, numbers, and special characters.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}