import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";
import { SubmissionDialog } from "@/components/SubmissionDialog";

interface Assignment {
  id: string;
  title: string;
  description: string | null;
  due_date: string | null;
  max_points: number | null;
  course: {
    title: string;
    course_code: string;
  };
  submission?: {
    id: string;
    submitted_at: string;
    grade: number | null;
    feedback: string | null;
  };
}

export function StudentAssignments() {
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
  const { profile } = useAuth();

  useEffect(() => {
    if (profile?.id) {
      fetchMyAssignments();
    }
  }, [profile]);

  const fetchMyAssignments = async () => {
    if (!profile?.id) return;
    
    try {
      // First get enrolled courses
      const { data: enrollments, error: enrollError } = await supabase
        .from('enrollments')
        .select('course_id')
        .eq('student_id', profile.id)
        .eq('status', 'active');

      if (enrollError) throw enrollError;

      const courseIds = enrollments?.map(e => e.course_id) || [];

      if (courseIds.length === 0) {
        setAssignments([]);
        setLoading(false);
        return;
      }

      // Get assignments for enrolled courses with course details
      const { data: assignmentsData, error: assignmentsError } = await supabase
        .from('assignments')
        .select(`
          *,
          courses(title, course_code)
        `)
        .in('course_id', courseIds)
        .order('due_date', { ascending: true, nullsFirst: false });

      if (assignmentsError) throw assignmentsError;

      // Get all submissions for this student
      const assignmentIds = assignmentsData?.map(a => a.id) || [];
      
      const { data: submissionsData, error: submissionsError } = await supabase
        .from('submissions')
        .select('id, assignment_id, submitted_at, grade, feedback, status')
        .eq('student_id', profile.id)
        .in('assignment_id', assignmentIds);

      if (submissionsError) throw submissionsError;

      // Map submissions to assignments
      const submissionsMap = new Map(
        submissionsData?.map(sub => [sub.assignment_id, sub]) || []
      );

      const assignmentsWithSubmissions = assignmentsData?.map(assignment => ({
        ...assignment,
        course: assignment.courses,
        submission: submissionsMap.get(assignment.id) || null
      })) || [];

      setAssignments(assignmentsWithSubmissions);
    } catch (error: any) {
      console.error('Error fetching assignments:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to fetch assignments",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'No due date';
    return new Date(dateString).toLocaleDateString();
  };

  const isOverdue = (dateString: string | null) => {
    if (!dateString) return false;
    return new Date(dateString) < new Date();
  };

  const getStatusBadge = (assignment: Assignment) => {
    if (assignment.submission) {
      if (assignment.submission.grade !== null) {
        return <Badge variant="secondary">Graded</Badge>;
      }
      return <Badge variant="default">Submitted</Badge>;
    }
    
    if (assignment.due_date && isOverdue(assignment.due_date)) {
      return <Badge variant="destructive">Overdue</Badge>;
    }
    
    return <Badge variant="outline">Pending</Badge>;
  };

  if (loading) {
    return <div className="text-center py-8">Loading assignments...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>My Assignments</CardTitle>
        <CardDescription>
          Assignments for your enrolled courses
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {assignments.map((assignment) => (
            <div key={assignment.id} className="p-4 border rounded-lg space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <h4 className="font-medium">{assignment.title}</h4>
                  <Badge variant="outline">{assignment.course.course_code}</Badge>
                  {getStatusBadge(assignment)}
                </div>
                <div className="flex gap-2">
                  {!assignment.submission ? (
                    <SubmissionDialog
                      assignmentId={assignment.id}
                      assignmentTitle={assignment.title}
                      onSubmissionComplete={fetchMyAssignments}
                    />
                  ) : (
                    <Button variant="outline" size="sm">
                      View Submission
                    </Button>
                  )}
                </div>
              </div>
              
              {assignment.description && (
                <p className="text-sm text-muted-foreground">{assignment.description}</p>
              )}
              
              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <span>Course: {assignment.course.title}</span>
                <span>Due: {formatDate(assignment.due_date)}</span>
              </div>
              
              <div className="flex items-center justify-between text-sm">
                <span>Max Points: {assignment.max_points || 'Not set'}</span>
                {assignment.submission?.grade !== null && (
                  <div className="flex items-center gap-1">
                    <span className="text-muted-foreground">Grade:</span>
                    <Badge variant="outline">{assignment.submission.grade}/{assignment.max_points}</Badge>
                  </div>
                )}
              </div>
              
              {assignment.submission?.feedback && (
                <div className="p-2 bg-muted rounded text-sm">
                  <span className="font-medium">Feedback: </span>
                  {assignment.submission.feedback}
                </div>
              )}
            </div>
          ))}
          
          {assignments.length === 0 && (
            <div className="text-center py-8">
              <p className="text-muted-foreground">No assignments found.</p>
              <p className="text-sm text-muted-foreground mt-2">
                Assignments will appear here once your instructors post them.
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}