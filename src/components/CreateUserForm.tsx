import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

const createUserSchema = z.object({
  fullName: z.string().min(2, "Full name must be at least 2 characters"),
  email: z.string().email("Please enter a valid email address"),
  role: z.enum(["student", "lecturer"], {
    required_error: "Please select a role",
  }),
});
type CreateUserFormData = z.infer<typeof createUserSchema>;

export function CreateUserForm() {
  const [isLoading, setIsLoading] = useState(false);
  const [generatedPassword, setGeneratedPassword] = useState<string | null>(null);

  const form = useForm<CreateUserFormData>({
    resolver: zodResolver(createUserSchema),
    defaultValues: {
      fullName: "",
      email: "",
      role: "student",
    },
  });

  const onSubmit = async (data: CreateUserFormData) => {
    setIsLoading(true);
    setGeneratedPassword(null);

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        toast({
          title: "Error",
          description: "You must be logged in to create users",
          variant: "destructive",
        });
        setIsLoading(false);
        return;
      }

      const response = await supabase.functions.invoke("createUser", {
        body: JSON.stringify({
          email: data.email,
          fullName: data.fullName,
          role: data.role,
        }),
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          "Content-Type": "application/json",
        },
      });

      if (response.error) {
        toast({
          title: "Error",
          description: response.error.message || "Failed to create user.",
          variant: "destructive",
        });
        setIsLoading(false);
        return;
      }

      if (response.data?.password) {
        setGeneratedPassword(response.data.password);
        toast({
          title: "Success",
          description: `User created successfully! Password: ${response.data.password}`,
        });
        form.reset();
      } else {
        toast({
          title: "Warning",
          description: "User created, but no password was returned.",
        });
      }
    } catch (error) {
      console.error("Error creating user:", error);
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
          Add a new student or lecturer to the system
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
