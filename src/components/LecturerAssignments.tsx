import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";
import { ViewSubmissions } from "@/components/ViewSubmissions";

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
  submission_count?: number;
}

export function LecturerAssignments() {
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
  const { profile } = useAuth();

  useEffect(() => {
    if (profile?.id) {
      fetchMyAssignments();
    }
  }, [profile]);

  const fetchMyAssignments = async () => {
    try {
      const { data, error } = await supabase
        .from('assignments')
        .select(`
          *,
          courses!inner(title, course_code),
          submissions(count)
        `)
        .eq('courses.lecturer_id', profile?.id)
        .order('due_date', { ascending: true });

      if (error) throw error;

      const assignmentsWithCount = data?.map(assignment => ({
        ...assignment,
        course: assignment.courses,
        submission_count: assignment.submissions?.length || 0
      })) || [];

      setAssignments(assignmentsWithCount);
    } catch (error) {
      console.error('Error fetching assignments:', error);
      toast({
        title: "Error",
        description: "Failed to fetch assignments",
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

  if (loading) {
    return <div className="text-center py-8">Loading assignments...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>My Assignments</CardTitle>
        <CardDescription>
          Assignments for courses you are teaching
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
                  {assignment.due_date && isOverdue(assignment.due_date) && (
                    <Badge variant="destructive">Overdue</Badge>
                  )}
                </div>
                <div className="flex gap-2">
                  <ViewSubmissions
                    assignmentId={assignment.id}
                    assignmentTitle={assignment.title}
                    maxPoints={assignment.max_points}
                  />
                  <Button variant="outline" size="sm">
                    Edit
                  </Button>
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
                <span className="text-muted-foreground">
                  {assignment.submission_count} submissions
                </span>
              </div>
            </div>
          ))}
          
          {assignments.length === 0 && (
            <div className="text-center py-8">
              <p className="text-muted-foreground">No assignments found.</p>
              <p className="text-sm text-muted-foreground mt-2">
                Create assignments for your courses to get started.
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}