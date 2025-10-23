import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

const createUserSchema = z.object({
  fullName: z.string().min(2, "Full name must be at least 2 characters"),
  email: z.string().email("Please enter a valid email address"),
  role: z.enum(["student", "lecturer"], {
    required_error: "Please select a role",
  }),
  courseIds: z.array(z.string()).optional(),
});

type CreateUserFormData = z.infer<typeof createUserSchema>;

interface Course {
  id: string;
  title: string;
  course_code: string;
}

export function CreateUserForm() {
  const [isLoading, setIsLoading] = useState(false);
  const [generatedPassword, setGeneratedPassword] = useState<string | null>(null);
  const [courses, setCourses] = useState<Course[]>([]);
  const [selectedCourses, setSelectedCourses] = useState<string[]>([]);

  const form = useForm<CreateUserFormData>({
    resolver: zodResolver(createUserSchema),
    defaultValues: {
      fullName: "",
      email: "",
      role: "student",
      courseIds: [],
    },
  });

  useEffect(() => {
    fetchCourses();
  }, []);

  const fetchCourses = async () => {
    try {
      const { data, error } = await supabase
        .from('courses')
        .select('id, title, course_code')
        .order('title');

      if (error) throw error;
      setCourses(data || []);
    } catch (error) {
      console.error('Error fetching courses:', error);
    }
  };

  const handleCourseToggle = (courseId: string) => {
    setSelectedCourses(prev =>
      prev.includes(courseId)
        ? prev.filter(id => id !== courseId)
        : [...prev, courseId]
    );
  };

  const onSubmit = async (data: CreateUserFormData) => {
    setIsLoading(true);
    setGeneratedPassword(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        toast({
          title: "Error",
          description: "You must be logged in to create users",
          variant: "destructive",
        });
        return;
      }

      const { data: result, error } = await supabase.functions.invoke('create-user', {
        body: {
          email: data.email,
          fullName: data.fullName,
          role: data.role,
        },
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) {
        console.error('Edge function error:', error);
        toast({
          title: "Error",
          description: error.message || "Failed to create user. Please try again.",
          variant: "destructive",
        });
        return;
      }

      if (result?.error) {
        console.error('Server error:', result.error);
        toast({
          title: "Error", 
          description: result.error,
          variant: "destructive",
        });
        return;
      }

      // Get the created user's profile ID
      if (result?.userId) {
        const { data: profileData } = await supabase
          .from('profiles')
          .select('id')
          .eq('user_id', result.userId)
          .single();

        if (profileData && selectedCourses.length > 0) {
          // Assign courses to the user
          if (data.role === 'student') {
            // Enroll student in selected courses
            const enrollments = selectedCourses.map(courseId => ({
              student_id: profileData.id,
              course_id: courseId,
              status: 'active',
            }));

            const { error: enrollError } = await supabase
              .from('enrollments')
              .insert(enrollments);

            if (enrollError) {
              console.error('Error enrolling student:', enrollError);
              toast({
                title: "Warning",
                description: "User created but failed to enroll in courses",
                variant: "destructive",
              });
            }
          } else if (data.role === 'lecturer') {
            // Assign lecturer to selected courses
            const { error: assignError } = await supabase
              .from('courses')
              .update({ lecturer_id: result.userId })
              .in('id', selectedCourses);

            if (assignError) {
              console.error('Error assigning lecturer:', assignError);
              toast({
                title: "Warning",
                description: "User created but failed to assign to courses",
                variant: "destructive",
              });
            }
          }
        }
      }

      if (result?.password) {
        setGeneratedPassword(result.password);
        toast({
          title: "Success",
          description: `User created successfully! Password: ${result.password}`,
        });
        form.reset();
        setSelectedCourses([]);
      }
    } catch (error) {
      console.error('Error creating user:', error);
      toast({
        title: "Error",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Create New User</CardTitle>
        <CardDescription>
          Add a new student or lecturer to the system and optionally assign them to courses
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
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
                        <SelectValue placeholder="Select a role" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="student">Student</SelectItem>
                      <SelectItem value="lecturer">Lecturer</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {courses.length > 0 && (
              <div className="space-y-3">
                <Label>
                  {form.watch('role') === 'student' 
                    ? 'Enroll in Courses (Optional)' 
                    : 'Assign to Courses (Optional)'}
                </Label>
                <div className="border rounded-md p-4 max-h-60 overflow-y-auto space-y-2">
                  {courses.map((course) => (
                    <div key={course.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={course.id}
                        checked={selectedCourses.includes(course.id)}
                        onCheckedChange={() => handleCourseToggle(course.id)}
                      />
                      <label
                        htmlFor={course.id}
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                      >
                        {course.title} ({course.course_code})
                      </label>
                    </div>
                  ))}
                </div>
                {selectedCourses.length > 0 && (
                  <p className="text-xs text-muted-foreground">
                    {selectedCourses.length} course(s) selected
                  </p>
                )}
              </div>
            )}

            <Button type="submit" disabled={isLoading} className="w-full">
              {isLoading ? "Creating..." : "Create User"}
            </Button>
          </form>
        </Form>

        {generatedPassword && (
          <div className="mt-6 p-4 bg-muted rounded-lg">
            <h3 className="font-semibold text-sm mb-2">Generated Password</h3>
            <p className="text-sm font-mono bg-background p-2 rounded border">
              {generatedPassword}
            </p>
            <p className="text-xs text-muted-foreground mt-2">
              Please save this password and share it securely with the user.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}