import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

interface Enrollment {
  id: string;
  status: string;
  enrollment_date: string;
  final_grade: number | null;
  course: {
    id: string;
    title: string;
    description: string | null;
    course_code: string;
    credits: number | null;
    semester: string | null;
    academic_year: string | null;
    lecturer_name?: string;
  };
}

interface AvailableCourse {
  id: string;
  title: string;
  description: string | null;
  course_code: string;
  credits: number | null;
  semester: string | null;
  academic_year: string | null;
  lecturer_name?: string;
  isRequested?: boolean;
  requestStatus?: string;
}

export function StudentCourses() {
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [availableCourses, setAvailableCourses] = useState<AvailableCourse[]>([]);
  const [loading, setLoading] = useState(true);
  const [requestingCourse, setRequestingCourse] = useState<string | null>(null);
  const { profile } = useAuth();

  useEffect(() => {
    if (profile?.id) {
      fetchMyCourses();
      fetchAvailableCourses();
    }
  }, [profile]);

  const fetchMyCourses = async () => {
    try {
      const { data, error } = await supabase
        .from('enrollments')
        .select(`
          *,
          courses(
            id,
            title,
            description,
            course_code,
            credits,
            semester,
            academic_year,
            profiles!courses_lecturer_id_fkey(full_name)
          )
        `)
        .eq('student_id', profile?.id)
        .order('enrollment_date', { ascending: false });

      if (error) throw error;

      const enrollmentsWithLecturer = data?.map(enrollment => ({
        ...enrollment,
        course: {
          ...enrollment.courses,
          lecturer_name: enrollment.courses?.profiles?.full_name || 'TBA'
        }
      })) || [];

      setEnrollments(enrollmentsWithLecturer);
    } catch (error) {
      console.error('Error fetching my courses:', error);
      toast({
        title: "Error",
        description: "Failed to fetch your courses",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchAvailableCourses = async () => {
    try {
      // Get enrolled course IDs
      const { data: enrolledData } = await supabase
        .from('enrollments')
        .select('course_id')
        .eq('student_id', profile?.id);

      const enrolledCourseIds = enrolledData?.map(e => e.course_id) || [];

      // Get enrollment requests
      const { data: requestsData } = await supabase
        .from('enrollment_requests')
        .select('course_id, status')
        .eq('student_id', profile?.id);

      const requestedCourses = new Map(
        requestsData?.map(r => [r.course_id, r.status]) || []
      );

      // Get all courses not enrolled in
      const { data: coursesData, error } = await supabase
        .from('courses')
        .select(`
          id,
          title,
          description,
          course_code,
          credits,
          semester,
          academic_year,
          profiles!courses_lecturer_id_fkey(full_name)
        `)
        .not('id', 'in', `(${enrolledCourseIds.join(',') || 'null'})`)
        .order('title');

      if (error) throw error;

      const coursesWithStatus = coursesData?.map(course => ({
        ...course,
        lecturer_name: course.profiles?.full_name || 'TBA',
        isRequested: requestedCourses.has(course.id),
        requestStatus: requestedCourses.get(course.id),
      })) || [];

      setAvailableCourses(coursesWithStatus);
    } catch (error) {
      console.error('Error fetching available courses:', error);
    }
  };

  const handleRequestEnrollment = async (courseId: string) => {
    if (!profile?.id) return;

    setRequestingCourse(courseId);
    try {
      const { error } = await supabase
        .from('enrollment_requests')
        .insert({
          student_id: profile.id,
          course_id: courseId,
        });

      if (error) throw error;

      toast({
        title: "Request Submitted",
        description: "Your enrollment request has been sent to the admin",
      });

      fetchAvailableCourses();
    } catch (error: any) {
      console.error('Error requesting enrollment:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to submit enrollment request",
        variant: "destructive",
      });
    } finally {
      setRequestingCourse(null);
    }
  };

  if (loading) {
    return <div className="text-center py-8">Loading your courses...</div>;
  }

  return (
    <Tabs defaultValue="enrolled" className="w-full">
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="enrolled">Enrolled Courses</TabsTrigger>
        <TabsTrigger value="available">Available Courses</TabsTrigger>
      </TabsList>

      <TabsContent value="enrolled">
        <Card>
          <CardHeader>
            <CardTitle>My Courses</CardTitle>
            <CardDescription>
              Courses you are currently enrolled in
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {enrollments.map((enrollment) => (
                <div key={enrollment.id} className="p-4 border rounded-lg space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <h4 className="font-medium">{enrollment.course.title}</h4>
                      <Badge variant="outline">{enrollment.course.course_code}</Badge>
                      <Badge variant="secondary">{enrollment.course.credits} credits</Badge>
                      <Badge 
                        variant={
                          enrollment.status === 'active' ? 'default' :
                          enrollment.status === 'completed' ? 'secondary' : 'destructive'
                        }
                      >
                        {enrollment.status}
                      </Badge>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm">
                        View Details
                      </Button>
                      <Button variant="outline" size="sm">
                        Assignments
                      </Button>
                    </div>
                  </div>
                  
                  {enrollment.course.description && (
                    <p className="text-sm text-muted-foreground">{enrollment.course.description}</p>
                  )}
                  
                  <div className="flex items-center justify-between text-sm text-muted-foreground">
                    <span>Instructor: {enrollment.course.lecturer_name}</span>
                    <span>{enrollment.course.semester} | {enrollment.course.academic_year}</span>
                  </div>
                  
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">
                      Enrolled: {new Date(enrollment.enrollment_date).toLocaleDateString()}
                    </span>
                    {enrollment.final_grade !== null && (
                      <div className="flex items-center gap-1">
                        <span className="text-muted-foreground">Final Grade:</span>
                        <Badge variant="outline">{enrollment.final_grade}%</Badge>
                      </div>
                    )}
                  </div>
                </div>
              ))}
              
              {enrollments.length === 0 && (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">You are not enrolled in any courses yet.</p>
                  <p className="text-sm text-muted-foreground mt-2">
                    Browse available courses to request enrollment.
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="available">
        <Card>
          <CardHeader>
            <CardTitle>Available Courses</CardTitle>
            <CardDescription>
              Request enrollment in courses you're interested in
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {availableCourses.map((course) => (
                <div key={course.id} className="p-4 border rounded-lg space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <h4 className="font-medium">{course.title}</h4>
                      <Badge variant="outline">{course.course_code}</Badge>
                      <Badge variant="secondary">{course.credits} credits</Badge>
                      {course.isRequested && (
                        <Badge
                          variant={
                            course.requestStatus === 'pending' ? 'default' :
                            course.requestStatus === 'approved' ? 'secondary' : 'destructive'
                          }
                        >
                          {course.requestStatus}
                        </Badge>
                      )}
                    </div>
                    <Button
                      onClick={() => handleRequestEnrollment(course.id)}
                      disabled={course.isRequested || requestingCourse === course.id}
                      size="sm"
                    >
                      {requestingCourse === course.id && (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      )}
                      {course.isRequested ? 'Requested' : 'Request Enrollment'}
                    </Button>
                  </div>
                  
                  {course.description && (
                    <p className="text-sm text-muted-foreground">{course.description}</p>
                  )}
                  
                  <div className="flex items-center justify-between text-sm text-muted-foreground">
                    <span>Instructor: {course.lecturer_name}</span>
                    <span>{course.semester} | {course.academic_year}</span>
                  </div>
                </div>
              ))}
              
              {availableCourses.length === 0 && (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">No available courses at this time.</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
}