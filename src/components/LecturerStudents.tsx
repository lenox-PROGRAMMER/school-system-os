import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";

interface Student {
  id: string;
  full_name: string | null;
  email: string;
  course_title: string;
  course_code: string;
  enrollment_status: string;
  final_grade: number | null;
  source?: 'enrollment' | 'assigned';
}

export function LecturerStudents() {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const { profile } = useAuth();

  useEffect(() => {
    if (profile?.id) {
      fetchMyStudents();
    }
  }, [profile]);

  const fetchMyStudents = async () => {
    try {
      // Fetch students enrolled in lecturer's courses
      const { data: enrollmentData, error: enrollmentError } = await supabase
        .from('enrollments')
        .select(`
          *,
          profiles!enrollments_student_id_fkey(id, full_name, email),
          courses!inner(id, title, course_code, lecturer_id)
        `)
        .eq('courses.lecturer_id', profile?.user_id);

      if (enrollmentError) throw enrollmentError;

      // Also fetch students directly assigned to this lecturer via lecturer_id
      const { data: assignedData, error: assignedError } = await supabase
        .from('profiles')
        .select('id, full_name, email, lecturer_id')
        .eq('lecturer_id', profile?.id)
        .eq('role', 'student');

      if (assignedError) {
        console.error('Error fetching assigned students:', assignedError);
      }

      // Combine both sources
      const enrolledStudents = enrollmentData?.map(enrollment => ({
        id: enrollment.profiles.id,
        full_name: enrollment.profiles.full_name,
        email: enrollment.profiles.email,
        course_title: enrollment.courses.title,
        course_code: enrollment.courses.course_code,
        enrollment_status: enrollment.status,
        final_grade: enrollment.final_grade,
        source: 'enrollment' as const
      })) || [];

      const directlyAssigned = assignedData?.map(student => ({
        id: student.id,
        full_name: student.full_name,
        email: student.email,
        course_title: 'Not enrolled',
        course_code: 'N/A',
        enrollment_status: 'assigned',
        final_grade: null,
        source: 'assigned' as const
      })) || [];

      // Merge and deduplicate
      const allStudents: Student[] = [...enrolledStudents];
      directlyAssigned.forEach(assigned => {
        if (!allStudents.some(s => s.id === assigned.id)) {
          allStudents.push(assigned);
        }
      });

      setStudents(allStudents);
    } catch (error) {
      console.error('Error fetching students:', error);
      toast({
        title: "Error",
        description: "Failed to fetch students",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="text-center py-8">Loading students...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>My Students</CardTitle>
        <CardDescription>
          Students enrolled in your courses
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {students.map((student, index) => (
            <div key={`${student.id}-${index}`} className="p-4 border rounded-lg space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <h4 className="font-medium">{student.full_name || 'No name'}</h4>
                  <Badge variant="outline">{student.course_code}</Badge>
                  <Badge 
                    variant={
                      student.enrollment_status === 'active' ? 'default' :
                      student.enrollment_status === 'completed' ? 'secondary' : 'destructive'
                    }
                  >
                    {student.enrollment_status}
                  </Badge>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm">
                    View Progress
                  </Button>
                  <Button variant="outline" size="sm">
                    Grade
                  </Button>
                </div>
              </div>
              
              <div className="text-sm text-muted-foreground">
                <p>Email: {student.email}</p>
                <p>Course: {student.course_title}</p>
              </div>
              
              {student.final_grade !== null && (
                <div className="text-sm">
                  <span className="font-medium">Final Grade: </span>
                  <Badge variant="outline">{student.final_grade}%</Badge>
                </div>
              )}
            </div>
          ))}
          
          {students.length === 0 && (
            <div className="text-center py-8">
              <p className="text-muted-foreground">No students found.</p>
              <p className="text-sm text-muted-foreground mt-2">
                Students will appear here once they enroll in your courses.
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}