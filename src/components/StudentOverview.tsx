import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";
import { Building, User, GraduationCap, Calendar } from "lucide-react";

interface HostelAssignment {
  id: string;
  hostels: {
    name: string;
  };
  rooms: {
    room_number: string;
  } | null;
  assigned_at: string;
  status: string;
  notes: string | null;
}

interface LecturerInfo {
  full_name: string | null;
  email: string;
}

interface RecentResult {
  id: string;
  grade: string | null;
  points: number | null;
  gpa: number | null;
  academic_year: string;
  semester: string;
  forwarded_at: string | null;
  courses: {
    title: string;
    course_code: string;
  };
}

export function StudentOverview() {
  const { profile } = useAuth();
  const [hostelAssignment, setHostelAssignment] = useState<HostelAssignment | null>(null);
  const [lecturer, setLecturer] = useState<LecturerInfo | null>(null);
  const [recentResults, setRecentResults] = useState<RecentResult[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (profile?.id) {
      fetchStudentData();
    }
  }, [profile]);

  const fetchStudentData = async () => {
    try {
      const [hostelResult, lecturerResult, resultsResult] = await Promise.all([
        // Fetch hostel assignment
        supabase
          .from('student_hostel_assignments')
          .select(`
            *,
            hostels(name),
            rooms(room_number)
          `)
          .eq('student_id', profile?.id)
          .eq('status', 'assigned')
          .order('assigned_at', { ascending: false })
          .limit(1)
          .maybeSingle(),
        
        // Fetch assigned lecturer
        supabase
          .from('profiles')
          .select('full_name, email')
          .eq('id', profile?.lecturer_id || '')
          .maybeSingle(),
        
        // Fetch recent results
        supabase
          .from('results')
          .select(`
            *,
            courses(title, course_code)
          `)
          .eq('student_id', profile?.user_id)
          .eq('status', 'published')
          .order('forwarded_at', { ascending: false })
          .limit(5)
      ]);

      if (hostelResult.error && hostelResult.error.code !== 'PGRST116') {
        throw hostelResult.error;
      }
      if (lecturerResult.error && lecturerResult.error.code !== 'PGRST116') {
        throw lecturerResult.error;
      }
      if (resultsResult.error) throw resultsResult.error;

      setHostelAssignment(hostelResult.data);
      setLecturer(lecturerResult.data);
      setRecentResults(resultsResult.data as unknown as RecentResult[] || []);
    } catch (error) {
      console.error('Error fetching student data:', error);
      toast({
        title: "Error",
        description: "Failed to fetch student information",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="text-center py-8">Loading overview...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Hostel Assignment */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building className="h-5 w-5" />
              Hostel Assignment
            </CardTitle>
          </CardHeader>
          <CardContent>
            {hostelAssignment ? (
              <div className="space-y-2">
                <div>
                  <p className="font-medium">{hostelAssignment.hostels.name}</p>
                  {hostelAssignment.rooms && (
                    <p className="text-sm text-muted-foreground">
                      Room: {hostelAssignment.rooms.room_number}
                    </p>
                  )}
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">
                    Assigned: {new Date(hostelAssignment.assigned_at).toLocaleDateString()}
                  </p>
                  <Badge variant="default" className="mt-1">
                    {hostelAssignment.status}
                  </Badge>
                </div>
                {hostelAssignment.notes && (
                  <p className="text-sm mt-2">
                    <strong>Notes:</strong> {hostelAssignment.notes}
                  </p>
                )}
              </div>
            ) : (
              <p className="text-muted-foreground">No hostel assigned</p>
            )}
          </CardContent>
        </Card>

        {/* Assigned Lecturer */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Assigned Lecturer
            </CardTitle>
          </CardHeader>
          <CardContent>
            {lecturer ? (
              <div className="space-y-2">
                <p className="font-medium">{lecturer.full_name || 'No name'}</p>
                <p className="text-sm text-muted-foreground">{lecturer.email}</p>
                <Badge variant="secondary">Active</Badge>
              </div>
            ) : (
              <p className="text-muted-foreground">No lecturer assigned</p>
            )}
          </CardContent>
        </Card>

        {/* Academic Status */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <GraduationCap className="h-5 w-5" />
              Academic Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div>
                <p className="text-sm text-muted-foreground">Status</p>
                <Badge variant="default">Active Student</Badge>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Results Available</p>
                <p className="font-medium">{recentResults.length} recent results</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Results */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Recent Results
          </CardTitle>
          <CardDescription>Your latest academic results forwarded by administration</CardDescription>
        </CardHeader>
        <CardContent>
          {recentResults.length > 0 ? (
            <div className="space-y-4">
              {recentResults.map((result) => (
                <div key={result.id} className="border rounded-lg p-4">
                  <div className="flex justify-between items-start">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium">{result.courses.course_code}</h3>
                        <Badge variant={result.grade === 'A' ? 'default' : result.grade === 'F' ? 'destructive' : 'secondary'}>
                          {result.grade || 'N/A'}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">{result.courses.title}</p>
                      <div className="flex gap-4 text-sm">
                        <span>Points: {result.points || 'N/A'}</span>
                        <span>GPA: {result.gpa || 'N/A'}</span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {result.academic_year} - {result.semester}
                      </p>
                    </div>
                    {result.forwarded_at && (
                      <div className="text-right">
                        <Badge variant="outline">New</Badge>
                        <p className="text-xs text-muted-foreground mt-1">
                          Received: {new Date(result.forwarded_at).toLocaleDateString()}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-muted-foreground py-8">
              No results available yet
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}