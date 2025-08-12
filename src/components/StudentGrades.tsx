import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";

interface Grade {
  assignment_title: string;
  course_title: string;
  course_code: string;
  grade: number | null;
  max_points: number | null;
  submitted_at: string;
  feedback: string | null;
}

interface CourseGrade {
  course_title: string;
  course_code: string;
  final_grade: number | null;
  assignments: Grade[];
}

export function StudentGrades() {
  const [courseGrades, setCourseGrades] = useState<CourseGrade[]>([]);
  const [loading, setLoading] = useState(true);
  const { profile } = useAuth();

  useEffect(() => {
    if (profile?.id) {
      fetchMyGrades();
    }
  }, [profile]);

  const fetchMyGrades = async () => {
    try {
      // Get submissions with grades
      const { data: submissions, error: submissionsError } = await supabase
        .from('submissions')
        .select(`
          grade,
          feedback,
          submitted_at,
          assignments(
            title,
            max_points,
            courses(title, course_code)
          )
        `)
        .eq('student_id', profile?.id)
        .not('grade', 'is', null)
        .order('submitted_at', { ascending: false });

      if (submissionsError) throw submissionsError;

      // Get enrollments with final grades
      const { data: enrollments, error: enrollmentsError } = await supabase
        .from('enrollments')
        .select(`
          final_grade,
          courses(title, course_code)
        `)
        .eq('student_id', profile?.id);

      if (enrollmentsError) throw enrollmentsError;

      // Group grades by course
      const courseGradesMap = new Map<string, CourseGrade>();

      // Initialize with enrollments
      enrollments?.forEach(enrollment => {
        const courseCode = enrollment.courses.course_code;
        courseGradesMap.set(courseCode, {
          course_title: enrollment.courses.title,
          course_code: courseCode,
          final_grade: enrollment.final_grade,
          assignments: []
        });
      });

      // Add assignment grades
      submissions?.forEach(submission => {
        const courseCode = submission.assignments.courses.course_code;
        const courseGrade = courseGradesMap.get(courseCode);
        
        if (courseGrade) {
          courseGrade.assignments.push({
            assignment_title: submission.assignments.title,
            course_title: submission.assignments.courses.title,
            course_code: courseCode,
            grade: submission.grade,
            max_points: submission.assignments.max_points,
            submitted_at: submission.submitted_at,
            feedback: submission.feedback
          });
        }
      });

      setCourseGrades(Array.from(courseGradesMap.values()));
    } catch (error) {
      console.error('Error fetching grades:', error);
      toast({
        title: "Error",
        description: "Failed to fetch your grades",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const calculateGPA = (grades: CourseGrade[]) => {
    const validGrades = grades.filter(g => g.final_grade !== null);
    if (validGrades.length === 0) return 'N/A';
    
    const total = validGrades.reduce((sum, g) => sum + (g.final_grade || 0), 0);
    return (total / validGrades.length).toFixed(2);
  };

  const getGradeColor = (grade: number, maxPoints: number) => {
    const percentage = (grade / maxPoints) * 100;
    if (percentage >= 90) return 'default';
    if (percentage >= 80) return 'secondary';
    if (percentage >= 70) return 'outline';
    return 'destructive';
  };

  if (loading) {
    return <div className="text-center py-8">Loading your grades...</div>;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Grade Summary</CardTitle>
          <CardDescription>
            Your academic performance overview
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center p-4 border rounded-lg">
              <div className="text-2xl font-bold">{calculateGPA(courseGrades)}</div>
              <div className="text-sm text-muted-foreground">Overall GPA</div>
            </div>
            <div className="text-center p-4 border rounded-lg">
              <div className="text-2xl font-bold">{courseGrades.length}</div>
              <div className="text-sm text-muted-foreground">Courses</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {courseGrades.map((courseGrade) => (
        <Card key={courseGrade.course_code}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg">{courseGrade.course_title}</CardTitle>
                <CardDescription>{courseGrade.course_code}</CardDescription>
              </div>
              {courseGrade.final_grade !== null && (
                <Badge variant="outline" className="text-lg px-3 py-1">
                  Final: {courseGrade.final_grade}%
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {courseGrade.assignments.map((assignment, index) => (
                <div key={index} className="flex items-center justify-between p-3 border rounded">
                  <div className="space-y-1">
                    <h5 className="font-medium">{assignment.assignment_title}</h5>
                    <p className="text-sm text-muted-foreground">
                      Submitted: {new Date(assignment.submitted_at).toLocaleDateString()}
                    </p>
                    {assignment.feedback && (
                      <p className="text-sm text-muted-foreground italic">
                        Feedback: {assignment.feedback}
                      </p>
                    )}
                  </div>
                  <div className="text-right">
                    <Badge 
                      variant={getGradeColor(assignment.grade || 0, assignment.max_points || 100)}
                      className="text-sm"
                    >
                      {assignment.grade}/{assignment.max_points}
                    </Badge>
                    <div className="text-xs text-muted-foreground mt-1">
                      {assignment.max_points ? Math.round(((assignment.grade || 0) / assignment.max_points) * 100) : 0}%
                    </div>
                  </div>
                </div>
              ))}
              
              {courseGrade.assignments.length === 0 && (
                <p className="text-center text-muted-foreground py-4">
                  No graded assignments yet
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      ))}

      {courseGrades.length === 0 && (
        <Card>
          <CardContent className="text-center py-8">
            <p className="text-muted-foreground">No grades available yet.</p>
            <p className="text-sm text-muted-foreground mt-2">
              Grades will appear here once your assignments are graded.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}