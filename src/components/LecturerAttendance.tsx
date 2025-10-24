import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { CalendarIcon, Send } from "lucide-react";
import { cn } from "@/lib/utils";

interface Student {
  id: string;
  full_name: string;
  email: string;
}

interface Course {
  id: string;
  title: string;
  course_code: string;
}

interface AttendanceRecord {
  studentId: string;
  status: 'present' | 'absent' | 'late';
  notes: string;
}

export const LecturerAttendance = () => {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [courses, setCourses] = useState<Course[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<string>("");
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [attendance, setAttendance] = useState<Record<string, AttendanceRecord>>({});
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCourses();
  }, [profile]);

  useEffect(() => {
    if (selectedCourse) {
      fetchStudents();
    }
  }, [selectedCourse]);

  const fetchCourses = async () => {
    if (!profile) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("courses")
        .select("id, title, course_code")
        .eq("lecturer_id", profile.user_id);

      if (error) throw error;
      setCourses(data || []);
    } catch (error: any) {
      console.error("Error fetching courses:", error);
      toast({
        title: "Error",
        description: "Failed to load courses",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchStudents = async () => {
    if (!selectedCourse) return;

    try {
      const { data, error } = await supabase
        .from("enrollments")
        .select(`
          student_id,
          profiles:student_id (
            id,
            full_name,
            email
          )
        `)
        .eq("course_id", selectedCourse)
        .eq("status", "active");

      if (error) throw error;

      const studentsList = data?.map((enrollment: any) => ({
        id: enrollment.profiles.id,
        full_name: enrollment.profiles.full_name,
        email: enrollment.profiles.email,
      })) || [];

      setStudents(studentsList);
      
      // Initialize attendance records
      const initialAttendance: Record<string, AttendanceRecord> = {};
      studentsList.forEach((student) => {
        initialAttendance[student.id] = {
          studentId: student.id,
          status: 'present',
          notes: '',
        };
      });
      setAttendance(initialAttendance);
    } catch (error: any) {
      console.error("Error fetching students:", error);
      toast({
        title: "Error",
        description: "Failed to load students",
        variant: "destructive",
      });
    }
  };

  const updateAttendance = (studentId: string, field: keyof AttendanceRecord, value: any) => {
    setAttendance((prev) => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        [field]: value,
      },
    }));
  };

  const handleSubmitAttendance = async () => {
    if (!profile || !selectedCourse) return;

    setSubmitting(true);
    try {
      // Insert attendance records
      const attendanceRecords = Object.values(attendance).map((record) => ({
        student_id: record.studentId,
        course_id: selectedCourse,
        lecturer_id: profile.id,
        date: format(selectedDate, "yyyy-MM-dd"),
        status: record.status,
        notes: record.notes,
      }));

      const { data: insertedAttendance, error: attendanceError } = await supabase
        .from("attendance")
        .insert(attendanceRecords)
        .select("id");

      if (attendanceError) throw attendanceError;

      // Create approval request
      const attendanceIds = insertedAttendance.map((record) => record.id);
      const { error: approvalError } = await supabase
        .from("attendance_approvals")
        .insert({
          attendance_ids: attendanceIds,
          lecturer_id: profile.id,
        });

      if (approvalError) throw approvalError;

      toast({
        title: "Success",
        description: "Attendance submitted for admin approval",
      });

      // Reset form
      setSelectedCourse("");
      setStudents([]);
      setAttendance({});
    } catch (error: any) {
      console.error("Error submitting attendance:", error);
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div>Loading courses...</div>;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Record Attendance</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Select Course</label>
              <Select value={selectedCourse} onValueChange={setSelectedCourse}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a course" />
                </SelectTrigger>
                <SelectContent>
                  {courses.map((course) => (
                    <SelectItem key={course.id} value={course.id}>
                      {course.course_code} - {course.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Select Date</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !selectedDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {selectedDate ? format(selectedDate, "PPP") : <span>Pick a date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={(date) => date && setSelectedDate(date)}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {selectedCourse && students.length > 0 && (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Student Name</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Notes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {students.map((student) => (
                    <TableRow key={student.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{student.full_name}</p>
                          <p className="text-sm text-muted-foreground">{student.email}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Select
                          value={attendance[student.id]?.status || 'present'}
                          onValueChange={(value: any) =>
                            updateAttendance(student.id, 'status', value)
                          }
                        >
                          <SelectTrigger className="w-32">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="present">Present</SelectItem>
                            <SelectItem value="absent">Absent</SelectItem>
                            <SelectItem value="late">Late</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <Input
                          placeholder="Optional notes"
                          value={attendance[student.id]?.notes || ''}
                          onChange={(e) =>
                            updateAttendance(student.id, 'notes', e.target.value)
                          }
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              <Button
                onClick={handleSubmitAttendance}
                disabled={submitting}
                className="w-full"
              >
                <Send className="mr-2 h-4 w-4" />
                {submitting ? "Submitting..." : "Submit for Approval"}
              </Button>
            </>
          )}

          {selectedCourse && students.length === 0 && (
            <p className="text-muted-foreground text-center py-4">
              No students enrolled in this course
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};