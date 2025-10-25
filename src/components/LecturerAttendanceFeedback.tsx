import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { MessageCircle } from "lucide-react";

interface AttendanceApprovalFeedback {
  id: string;
  submitted_at: string;
  status: string;
  admin_feedback: string | null;
  reviewed_at: string | null;
  attendance_count: number;
}

export const LecturerAttendanceFeedback = () => {
  const { profile } = useAuth();
  const [approvals, setApprovals] = useState<AttendanceApprovalFeedback[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchApprovals();
  }, [profile]);

  const fetchApprovals = async () => {
    if (!profile?.id) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("attendance_approvals")
        .select("id, submitted_at, status, admin_feedback, reviewed_at, attendance_ids")
        .eq("lecturer_id", profile.id)
        .order("submitted_at", { ascending: false });

      if (error) throw error;

      const formattedData = data?.map((approval: any) => ({
        id: approval.id,
        submitted_at: approval.submitted_at,
        status: approval.status,
        admin_feedback: approval.admin_feedback,
        reviewed_at: approval.reviewed_at,
        attendance_count: approval.attendance_ids?.length || 0,
      })) || [];

      setApprovals(formattedData);
    } catch (error: any) {
      console.error("Error fetching approvals:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div>Loading feedback...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Attendance Submission Status</CardTitle>
      </CardHeader>
      <CardContent>
        {approvals.length === 0 ? (
          <p className="text-muted-foreground text-center py-4">
            No attendance submissions yet
          </p>
        ) : (
          <div className="space-y-4">
            {approvals.map((approval) => (
              <div key={approval.id} className="border rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">
                      Submitted on {format(new Date(approval.submitted_at), "PPP")}
                    </p>
                    <p className="text-sm">
                      {approval.attendance_count} student{approval.attendance_count !== 1 ? 's' : ''}
                    </p>
                  </div>
                  <Badge
                    variant={
                      approval.status === "approved"
                        ? "default"
                        : approval.status === "rejected"
                        ? "destructive"
                        : "secondary"
                    }
                  >
                    {approval.status}
                  </Badge>
                </div>
                
                {approval.admin_feedback && (
                  <Alert>
                    <MessageCircle className="h-4 w-4" />
                    <AlertDescription>
                      <div className="space-y-1">
                        <p className="font-medium text-sm">Admin Feedback:</p>
                        <p className="text-sm">{approval.admin_feedback}</p>
                        {approval.reviewed_at && (
                          <p className="text-xs text-muted-foreground mt-1">
                            Reviewed on {format(new Date(approval.reviewed_at), "PPP")}
                          </p>
                        )}
                      </div>
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
