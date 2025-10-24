import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { CheckCircle, XCircle, Eye } from "lucide-react";
import { format } from "date-fns";

interface AttendanceApproval {
  id: string;
  lecturer_id: string;
  submitted_at: string;
  status: string;
  admin_feedback: string | null;
  lecturer_name: string;
  attendance_count: number;
}

interface AttendanceDetail {
  id: string;
  student_name: string;
  course_name: string;
  date: string;
  status: string;
  notes: string | null;
}

export const AttendanceApprovals = () => {
  const { toast } = useToast();
  const [approvals, setApprovals] = useState<AttendanceApproval[]>([]);
  const [selectedApproval, setSelectedApproval] = useState<string | null>(null);
  const [attendanceDetails, setAttendanceDetails] = useState<AttendanceDetail[]>([]);
  const [feedback, setFeedback] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchApprovals();
  }, []);

  const fetchApprovals = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("attendance_approvals")
        .select(`
          id,
          lecturer_id,
          submitted_at,
          status,
          admin_feedback,
          attendance_ids,
          profiles:lecturer_id (
            full_name
          )
        `)
        .order("submitted_at", { ascending: false });

      if (error) throw error;

      const formattedData = data?.map((approval: any) => ({
        id: approval.id,
        lecturer_id: approval.lecturer_id,
        submitted_at: approval.submitted_at,
        status: approval.status,
        admin_feedback: approval.admin_feedback,
        lecturer_name: approval.profiles.full_name,
        attendance_count: approval.attendance_ids?.length || 0,
      })) || [];

      setApprovals(formattedData);
    } catch (error: any) {
      console.error("Error fetching approvals:", error);
      toast({
        title: "Error",
        description: "Failed to load attendance approvals",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchAttendanceDetails = async (approvalId: string) => {
    try {
      const { data: approval, error: approvalError } = await supabase
        .from("attendance_approvals")
        .select("attendance_ids")
        .eq("id", approvalId)
        .single();

      if (approvalError) throw approvalError;

      const { data, error } = await supabase
        .from("attendance")
        .select(`
          id,
          date,
          status,
          notes,
          profiles:student_id (
            full_name
          ),
          courses (
            title
          )
        `)
        .in("id", approval.attendance_ids);

      if (error) throw error;

      const formattedDetails = data?.map((record: any) => ({
        id: record.id,
        student_name: record.profiles.full_name,
        course_name: record.courses.title,
        date: record.date,
        status: record.status,
        notes: record.notes,
      })) || [];

      setAttendanceDetails(formattedDetails);
    } catch (error: any) {
      console.error("Error fetching attendance details:", error);
      toast({
        title: "Error",
        description: "Failed to load attendance details",
        variant: "destructive",
      });
    }
  };

  const handleReview = async (approvalId: string, status: 'approved' | 'rejected') => {
    try {
      const { error } = await supabase
        .from("attendance_approvals")
        .update({
          status,
          admin_feedback: feedback,
          reviewed_at: new Date().toISOString(),
          reviewed_by: (await supabase.auth.getUser()).data.user?.id,
        })
        .eq("id", approvalId);

      if (error) throw error;

      toast({
        title: "Success",
        description: `Attendance ${status}`,
      });

      setFeedback("");
      setSelectedApproval(null);
      fetchApprovals();
    } catch (error: any) {
      console.error("Error reviewing attendance:", error);
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return <div>Loading attendance approvals...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Attendance Approvals</CardTitle>
      </CardHeader>
      <CardContent>
        {approvals.length === 0 ? (
          <p className="text-muted-foreground text-center py-4">
            No attendance submissions to review
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Lecturer</TableHead>
                <TableHead>Submitted</TableHead>
                <TableHead>Records</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {approvals.map((approval) => (
                <TableRow key={approval.id}>
                  <TableCell>{approval.lecturer_name}</TableCell>
                  <TableCell>
                    {format(new Date(approval.submitted_at), "PPP")}
                  </TableCell>
                  <TableCell>{approval.attendance_count} students</TableCell>
                  <TableCell>
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
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedApproval(approval.id);
                              fetchAttendanceDetails(approval.id);
                            }}
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            View
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                          <DialogHeader>
                            <DialogTitle>Attendance Details</DialogTitle>
                          </DialogHeader>
                          <div className="space-y-4">
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead>Student</TableHead>
                                  <TableHead>Course</TableHead>
                                  <TableHead>Date</TableHead>
                                  <TableHead>Status</TableHead>
                                  <TableHead>Notes</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {attendanceDetails.map((detail) => (
                                  <TableRow key={detail.id}>
                                    <TableCell>{detail.student_name}</TableCell>
                                    <TableCell>{detail.course_name}</TableCell>
                                    <TableCell>{format(new Date(detail.date), "PP")}</TableCell>
                                    <TableCell>
                                      <Badge variant={detail.status === 'present' ? 'default' : 'secondary'}>
                                        {detail.status}
                                      </Badge>
                                    </TableCell>
                                    <TableCell>{detail.notes || "-"}</TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>

                            {approval.status === "pending" && (
                              <div className="space-y-4">
                                <div>
                                  <label className="text-sm font-medium mb-2 block">
                                    Feedback to Lecturer
                                  </label>
                                  <Textarea
                                    value={feedback}
                                    onChange={(e) => setFeedback(e.target.value)}
                                    placeholder="Optional feedback..."
                                    rows={3}
                                  />
                                </div>
                                <div className="flex gap-2">
                                  <Button
                                    onClick={() => handleReview(approval.id, "approved")}
                                    className="flex-1"
                                  >
                                    <CheckCircle className="mr-2 h-4 w-4" />
                                    Approve
                                  </Button>
                                  <Button
                                    onClick={() => handleReview(approval.id, "rejected")}
                                    variant="destructive"
                                    className="flex-1"
                                  >
                                    <XCircle className="mr-2 h-4 w-4" />
                                    Reject
                                  </Button>
                                </div>
                              </div>
                            )}

                            {approval.admin_feedback && (
                              <div className="bg-muted p-4 rounded-lg">
                                <p className="text-sm font-medium mb-1">Admin Feedback:</p>
                                <p className="text-sm">{approval.admin_feedback}</p>
                              </div>
                            )}
                          </div>
                        </DialogContent>
                      </Dialog>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
};