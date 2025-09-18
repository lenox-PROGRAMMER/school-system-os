import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Bell, CheckCircle, Clock, FileText } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";

interface Notification {
  id: string;
  assignment_title: string;
  course_code: string;
  course_title: string;
  submitted_at: string;
  grade: number | null;
  feedback: string | null;
  graded_at: string | null;
  max_points: number | null;
}

export function StudentNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const { profile } = useAuth();

  useEffect(() => {
    if (profile?.id) {
      fetchNotifications();
    }
  }, [profile]);

  const fetchNotifications = async () => {
    try {
      const { data, error } = await supabase
        .from('submissions')
        .select(`
          *,
          assignments!inner(title, max_points, courses!inner(title, course_code))
        `)
        .eq('student_id', profile?.id)
        .order('submitted_at', { ascending: false })
        .limit(10);

      if (error) throw error;

      const formattedNotifications = data?.map(submission => ({
        id: submission.id,
        assignment_title: submission.assignments.title,
        course_code: submission.assignments.courses.course_code,
        course_title: submission.assignments.courses.title,
        submitted_at: submission.submitted_at,
        grade: submission.grade,
        feedback: submission.feedback,
        graded_at: submission.graded_at,
        max_points: submission.assignments.max_points,
      })) || [];

      setNotifications(formattedNotifications);
    } catch (error) {
      console.error('Error fetching notifications:', error);
      toast({
        title: "Error",
        description: "Failed to fetch notifications",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const getNotificationIcon = (notification: Notification) => {
    if (notification.grade !== null) {
      return <CheckCircle className="h-5 w-5 text-green-500" />;
    }
    return <Clock className="h-5 w-5 text-blue-500" />;
  };

  const getStatusBadge = (notification: Notification) => {
    if (notification.grade !== null) {
      return (
        <Badge variant="secondary">
          Graded: {notification.grade}/{notification.max_points || 100}
        </Badge>
      );
    }
    return <Badge variant="outline">Received</Badge>;
  };

  if (loading) {
    return <div className="text-center py-8">Loading notifications...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="h-5 w-5" />
          Assignment Notifications
        </CardTitle>
        <CardDescription>
          Updates on your assignment submissions
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {notifications.map((notification) => (
            <div key={notification.id} className="p-4 border rounded-lg">
              <div className="flex items-start gap-3">
                {getNotificationIcon(notification)}
                <div className="flex-1 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-muted-foreground" />
                      <h4 className="font-medium">{notification.assignment_title}</h4>
                      <Badge variant="outline">{notification.course_code}</Badge>
                    </div>
                    {getStatusBadge(notification)}
                  </div>
                  
                  <p className="text-sm text-muted-foreground">
                    Course: {notification.course_title}
                  </p>
                  
                  <div className="text-sm text-muted-foreground">
                    <p>Submitted: {formatDate(notification.submitted_at)}</p>
                    {notification.graded_at && (
                      <p>Graded: {formatDate(notification.graded_at)}</p>
                    )}
                  </div>
                  
                  {notification.feedback && (
                    <div className="p-2 bg-muted rounded text-sm">
                      <span className="font-medium">Feedback: </span>
                      {notification.feedback}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}

          {notifications.length === 0 && (
            <div className="text-center py-8">
              <p className="text-muted-foreground">No notifications yet.</p>
              <p className="text-sm text-muted-foreground mt-2">
                Submit assignments to see updates here.
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}