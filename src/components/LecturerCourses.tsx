import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";

interface Course {
  id: string;
  title: string;
  description: string | null;
  course_code: string;
  credits: number | null;
  semester: string | null;
  academic_year: string | null;
  enrollment_count?: number;
}

export function LecturerCourses() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const { profile } = useAuth();

  useEffect(() => {
    if (profile?.id) {
      fetchMyCourses();
    }
  }, [profile]);

  const fetchMyCourses = async () => {
    try {
      const { data, error } = await supabase
        .from('courses')
        .select(`
          *,
          enrollments(count)
        `)
        .eq('lecturer_id', profile?.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const coursesWithCount = data?.map(course => ({
        ...course,
        enrollment_count: course.enrollments?.length || 0
      })) || [];

      setCourses(coursesWithCount);
    } catch (error) {
      console.error('Error fetching my courses:', error);
      toast({
        title: "Error",
        description: "Failed to fetch your courses",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="text-center py-8">Loading your courses...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>My Courses</CardTitle>
        <CardDescription>
          Courses you are teaching this semester
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {courses.map((course) => (
            <div key={course.id} className="p-4 border rounded-lg space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <h4 className="font-medium">{course.title}</h4>
                  <Badge variant="outline">{course.course_code}</Badge>
                  <Badge variant="secondary">{course.credits} credits</Badge>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm">
                    View Students
                  </Button>
                  <Button variant="outline" size="sm">
                    Assignments
                  </Button>
                </div>
              </div>
              
              {course.description && (
                <p className="text-sm text-muted-foreground">{course.description}</p>
              )}
              
              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <span>{course.semester} | {course.academic_year}</span>
                <span>{course.enrollment_count} students enrolled</span>
              </div>
            </div>
          ))}
          
          {courses.length === 0 && (
            <div className="text-center py-8">
              <p className="text-muted-foreground">You are not assigned to any courses yet.</p>
              <p className="text-sm text-muted-foreground mt-2">
                Contact your administrator to get assigned to courses.
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}