import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";
import { Plus } from "lucide-react";

export function CreateAssignment() {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    course_name: "",
    due_date: "",
    max_points: "100",
  });
  const { profile } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title || !formData.course_name) {
      toast({
        title: "Error",
        description: "Please fill in required fields",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      // First, find or create the course
      let courseId = "";
      
      // Try to find existing course by name or code
      const { data: existingCourse } = await supabase
        .from('courses')
        .select('id')
        .or(`title.ilike.%${formData.course_name}%,course_code.ilike.%${formData.course_name}%`)
        .limit(1)
        .single();

      if (existingCourse) {
        courseId = existingCourse.id;
      } else {
        // Create new course
        const { data: newCourse, error: courseError } = await supabase
          .from('courses')
          .insert({
            title: formData.course_name,
            course_code: formData.course_name.toUpperCase().replace(/\s+/g, ''),
            lecturer_id: profile?.id,
          })
          .select('id')
          .single();

        if (courseError) throw courseError;
        courseId = newCourse.id;
      }

      // Create assignment
      const { error } = await supabase
        .from('assignments')
        .insert({
          title: formData.title,
          description: formData.description || null,
          course_id: courseId,
          due_date: formData.due_date || null,
          max_points: formData.max_points ? parseFloat(formData.max_points) : null,
          created_by: profile?.id,
        });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Assignment created successfully",
      });

      // Reset form
      setFormData({
        title: "",
        description: "",
        course_name: "",
        due_date: "",
        max_points: "100",
      });
      setIsOpen(false);
    } catch (error) {
      console.error('Error creating assignment:', error);
      toast({
        title: "Error",
        description: "Failed to create assignment",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Create Assignment</CardTitle>
        <CardDescription>
          Create new assignments for your courses
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button className="w-full">
              <Plus className="h-4 w-4 mr-2" />
              Create New Assignment
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Create Assignment</DialogTitle>
              <DialogDescription>
                Fill in the details for your new assignment.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Title *</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Assignment title"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="course_name">Course Name/Code *</Label>
                <Input
                  id="course_name"
                  value={formData.course_name}
                  onChange={(e) => setFormData({ ...formData, course_name: e.target.value })}
                  placeholder="Enter course name or code (e.g., CS101, Mathematics)"
                  required
                />
                <p className="text-xs text-muted-foreground">
                  If course doesn't exist, it will be created automatically
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Assignment instructions and details"
                  rows={4}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="due_date">Due Date</Label>
                  <Input
                    id="due_date"
                    type="datetime-local"
                    value={formData.due_date}
                    onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="max_points">Max Points</Label>
                  <Input
                    id="max_points"
                    type="number"
                    value={formData.max_points}
                    onChange={(e) => setFormData({ ...formData, max_points: e.target.value })}
                    placeholder="100"
                    min="1"
                  />
                </div>
              </div>

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={loading}>
                  {loading ? "Creating..." : "Create Assignment"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}