import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";

interface Enrollment {
  id: string;
  status: string;
  enrollment_date: string;
  final_grade: number | null;
  course: {
    id: string;
    title: string;
    description: string | null;
    course_code: string;
    credits: number | null;
    semester: string | null;
    academic_year: string | null;
    lecturer_name?: string;
  };
}

export function StudentCourses() {
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
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
        .from('enrollments')
        .select(`
          *,
          courses(
            id,
            title,
            description,
            course_code,
            credits,
            semester,
            academic_year,
            profiles!courses_lecturer_id_fkey(full_name)
          )
        `)
        .eq('student_id', profile?.id)
        .order('enrollment_date', { ascending: false });

      if (error) throw error;

      const enrollmentsWithLecturer = data?.map(enrollment => ({
        ...enrollment,
        course: {
          ...enrollment.courses,
          lecturer_name: enrollment.courses?.profiles?.full_name || 'TBA'
        }
      })) || [];

      setEnrollments(enrollmentsWithLecturer);
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
          Courses you are currently enrolled in
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {enrollments.map((enrollment) => (
            <div key={enrollment.id} className="p-4 border rounded-lg space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <h4 className="font-medium">{enrollment.course.title}</h4>
                  <Badge variant="outline">{enrollment.course.course_code}</Badge>
                  <Badge variant="secondary">{enrollment.course.credits} credits</Badge>
                  <Badge 
                    variant={
                      enrollment.status === 'active' ? 'default' :
                      enrollment.status === 'completed' ? 'secondary' : 'destructive'
                    }
                  >
                    {enrollment.status}
                  </Badge>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm">
                    View Details
                  </Button>
                  <Button variant="outline" size="sm">
                    Assignments
                  </Button>
                </div>
              </div>
              
              {enrollment.course.description && (
                <p className="text-sm text-muted-foreground">{enrollment.course.description}</p>
              )}
              
              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <span>Instructor: {enrollment.course.lecturer_name}</span>
                <span>{enrollment.course.semester} | {enrollment.course.academic_year}</span>
              </div>
              
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">
                  Enrolled: {new Date(enrollment.enrollment_date).toLocaleDateString()}
                </span>
                {enrollment.final_grade !== null && (
                  <div className="flex items-center gap-1">
                    <span className="text-muted-foreground">Final Grade:</span>
                    <Badge variant="outline">{enrollment.final_grade}%</Badge>
                  </div>
                )}
              </div>
            </div>
          ))}
          
          {enrollments.length === 0 && (
            <div className="text-center py-8">
              <p className="text-muted-foreground">You are not enrolled in any courses yet.</p>
              <p className="text-sm text-muted-foreground mt-2">
                Contact your academic advisor to enroll in courses.
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}