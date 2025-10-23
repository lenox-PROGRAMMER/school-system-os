import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";
import { CheckCircle2, XCircle } from "lucide-react";

interface EnrollmentRequest {
  id: string;
  status: string;
  requested_at: string;
  reviewed_at: string | null;
  admin_notes: string | null;
  student: {
    id: string;
    full_name: string;
    email: string;
  };
  course: {
    id: string;
    title: string;
    course_code: string;
  };
}

export function EnrollmentRequests() {
  const [requests, setRequests] = useState<EnrollmentRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState<EnrollmentRequest | null>(null);
  const [adminNotes, setAdminNotes] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const { profile } = useAuth();

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    try {
      const { data, error } = await supabase
        .from('enrollment_requests')
        .select(`
          *,
          student:profiles!enrollment_requests_student_id_fkey(id, full_name, email),
          course:courses(id, title, course_code)
        `)
        .order('requested_at', { ascending: false });

      if (error) throw error;

      setRequests(data || []);
    } catch (error) {
      console.error('Error fetching enrollment requests:', error);
      toast({
        title: "Error",
        description: "Failed to fetch enrollment requests",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleReviewRequest = (request: EnrollmentRequest) => {
    setSelectedRequest(request);
    setAdminNotes(request.admin_notes || "");
  };

  const handleApprove = async () => {
    if (!selectedRequest || !profile) return;
    
    setActionLoading(true);
    try {
      // Update request status
      const { error: updateError } = await supabase
        .from('enrollment_requests')
        .update({
          status: 'approved',
          reviewed_at: new Date().toISOString(),
          reviewed_by: profile.id,
          admin_notes: adminNotes,
        })
        .eq('id', selectedRequest.id);

      if (updateError) throw updateError;

      // Create enrollment
      const { error: enrollError } = await supabase
        .from('enrollments')
        .insert({
          student_id: selectedRequest.student.id,
          course_id: selectedRequest.course.id,
          status: 'active',
        });

      if (enrollError) throw enrollError;

      toast({
        title: "Request Approved",
        description: "Student has been enrolled in the course",
      });

      setSelectedRequest(null);
      setAdminNotes("");
      fetchRequests();
    } catch (error: any) {
      console.error('Error approving request:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to approve request",
        variant: "destructive",
      });
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async () => {
    if (!selectedRequest || !profile) return;
    
    setActionLoading(true);
    try {
      const { error } = await supabase
        .from('enrollment_requests')
        .update({
          status: 'rejected',
          reviewed_at: new Date().toISOString(),
          reviewed_by: profile.id,
          admin_notes: adminNotes,
        })
        .eq('id', selectedRequest.id);

      if (error) throw error;

      toast({
        title: "Request Rejected",
        description: "The enrollment request has been rejected",
      });

      setSelectedRequest(null);
      setAdminNotes("");
      fetchRequests();
    } catch (error: any) {
      console.error('Error rejecting request:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to reject request",
        variant: "destructive",
      });
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return <div className="text-center py-8">Loading enrollment requests...</div>;
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Course Enrollment Requests</CardTitle>
          <CardDescription>
            Review and approve or reject student course enrollment requests
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Student</TableHead>
                <TableHead>Course</TableHead>
                <TableHead>Requested At</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {requests.map((request) => (
                <TableRow key={request.id}>
                  <TableCell>
                    <div>
                      <div className="font-medium">{request.student.full_name}</div>
                      <div className="text-sm text-muted-foreground">{request.student.email}</div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div>
                      <div className="font-medium">{request.course.title}</div>
                      <Badge variant="outline">{request.course.course_code}</Badge>
                    </div>
                  </TableCell>
                  <TableCell>
                    {new Date(request.requested_at).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        request.status === 'pending' ? 'default' :
                        request.status === 'approved' ? 'secondary' : 'destructive'
                      }
                    >
                      {request.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {request.status === 'pending' && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleReviewRequest(request)}
                      >
                        Review
                      </Button>
                    )}
                    {request.status !== 'pending' && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleReviewRequest(request)}
                      >
                        View Details
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {requests.length === 0 && (
            <div className="text-center py-8">
              <p className="text-muted-foreground">No enrollment requests found.</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!selectedRequest} onOpenChange={() => setSelectedRequest(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Review Enrollment Request</DialogTitle>
            <DialogDescription>
              Approve or reject this course enrollment request
            </DialogDescription>
          </DialogHeader>

          {selectedRequest && (
            <div className="space-y-4">
              <div>
                <Label>Student</Label>
                <p className="text-sm font-medium">{selectedRequest.student.full_name}</p>
                <p className="text-sm text-muted-foreground">{selectedRequest.student.email}</p>
              </div>

              <div>
                <Label>Course</Label>
                <p className="text-sm font-medium">{selectedRequest.course.title}</p>
                <Badge variant="outline">{selectedRequest.course.course_code}</Badge>
              </div>

              <div>
                <Label>Requested At</Label>
                <p className="text-sm">{new Date(selectedRequest.requested_at).toLocaleString()}</p>
              </div>

              <div>
                <Label htmlFor="admin-notes">Admin Notes</Label>
                <Textarea
                  id="admin-notes"
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  placeholder="Add notes about this request..."
                  disabled={selectedRequest.status !== 'pending'}
                />
              </div>

              {selectedRequest.reviewed_at && (
                <div>
                  <Label>Reviewed At</Label>
                  <p className="text-sm">{new Date(selectedRequest.reviewed_at).toLocaleString()}</p>
                </div>
              )}
            </div>
          )}

          {selectedRequest?.status === 'pending' && (
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setSelectedRequest(null)}
                disabled={actionLoading}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleReject}
                disabled={actionLoading}
              >
                <XCircle className="h-4 w-4 mr-2" />
                Reject
              </Button>
              <Button
                onClick={handleApprove}
                disabled={actionLoading}
              >
                <CheckCircle2 className="h-4 w-4 mr-2" />
                Approve
              </Button>
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
