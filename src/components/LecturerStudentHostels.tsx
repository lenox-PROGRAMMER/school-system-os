import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface StudentHostelAssignment {
  id: string;
  status: string;
  assigned_at: string;
  notes: string | null;
  student: {
    full_name: string;
    email: string;
  };
  hostel: {
    name: string;
  };
  room: {
    room_number: string;
  } | null;
}

export function LecturerStudentHostels() {
  const [assignments, setAssignments] = useState<StudentHostelAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    fetchStudentHostelAssignments();
  }, [user]);

  const fetchStudentHostelAssignments = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from("student_hostel_assignments")
        .select(`
          *,
          student:profiles!student_id (
            full_name,
            email
          ),
          hostel:hostels (
            name
          ),
          room:rooms (
            room_number
          )
        `)
        .order("assigned_at", { ascending: false });

      if (error) throw error;
      setAssignments(data || []);
    } catch (error) {
      console.error("Error fetching student hostel assignments:", error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "assigned":
        return <Badge variant="default">Assigned</Badge>;
      case "moved_out":
        return <Badge variant="secondary">Moved Out</Badge>;
      case "suspended":
        return <Badge variant="destructive">Suspended</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Student Hostel Assignments</CardTitle>
        <CardDescription>
          View hostel assignments for your students
        </CardDescription>
      </CardHeader>
      <CardContent>
        {assignments.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">
            No student hostel assignments found.
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Student Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Hostel</TableHead>
                <TableHead>Room</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Assigned Date</TableHead>
                <TableHead>Notes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {assignments.map((assignment) => (
                <TableRow key={assignment.id}>
                  <TableCell className="font-medium">
                    {assignment.student?.full_name}
                  </TableCell>
                  <TableCell>{assignment.student?.email}</TableCell>
                  <TableCell>{assignment.hostel?.name}</TableCell>
                  <TableCell>
                    {assignment.room?.room_number || "Not assigned"}
                  </TableCell>
                  <TableCell>{getStatusBadge(assignment.status)}</TableCell>
                  <TableCell>
                    {new Date(assignment.assigned_at).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    {assignment.notes || "No notes"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}