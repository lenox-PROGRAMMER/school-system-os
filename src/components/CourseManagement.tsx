import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

interface Course {
  id: string;
  title: string;
  description: string | null;
  course_code: string;
  lecturer_id: string | null;
  credits: number | null;
  semester: string | null;
  academic_year: string | null;
  lecturer_name?: string;
}

interface Lecturer {
  id: string;
  full_name: string;
}

export function CourseManagement() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [lecturers, setLecturers] = useState<Lecturer[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newCourse, setNewCourse] = useState({
    title: '',
    description: '',
    course_code: '',
    lecturer_id: '',
    credits: 3,
    semester: '',
    academic_year: '',
  });

  useEffect(() => {
    fetchCourses();
    fetchLecturers();
  }, []);

  const fetchCourses = async () => {
    try {
      const { data, error } = await supabase
        .from('courses')
        .select(`
          *,
          profiles!courses_lecturer_id_fkey(full_name)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      const coursesWithLecturerName = data?.map(course => ({
        ...course,
        lecturer_name: course.profiles?.full_name || 'Unassigned'
      })) || [];
      
      setCourses(coursesWithLecturerName);
    } catch (error) {
      console.error('Error fetching courses:', error);
      toast({
        title: "Error",
        description: "Failed to fetch courses",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchLecturers = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name')
        .eq('role', 'lecturer');

      if (error) throw error;
      setLecturers(data || []);
    } catch (error) {
      console.error('Error fetching lecturers:', error);
    }
  };

  const handleCreateCourse = async () => {
    try {
      // Check if course code already exists
      const { data: existing } = await supabase
        .from('courses')
        .select('id')
        .eq('course_code', newCourse.course_code)
        .maybeSingle();

      if (existing) {
        toast({
          title: "Error",
          description: "A course with this course code already exists",
          variant: "destructive",
        });
        return;
      }

      const { error } = await supabase
        .from('courses')
        .insert([newCourse]);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Course created successfully",
      });

      setNewCourse({
        title: '',
        description: '',
        course_code: '',
        lecturer_id: '',
        credits: 3,
        semester: '',
        academic_year: '',
      });
      setShowCreateForm(false);
      fetchCourses();
    } catch (error: any) {
      console.error('Error creating course:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to create course",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return <div className="text-center py-8">Loading courses...</div>;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Course Management</CardTitle>
              <CardDescription>
                Manage all courses in the system
              </CardDescription>
            </div>
            <Button onClick={() => setShowCreateForm(!showCreateForm)}>
              {showCreateForm ? 'Cancel' : 'Create Course'}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {showCreateForm && (
            <div className="mb-6 p-4 border rounded-lg space-y-4">
              <h3 className="font-semibold">Create New Course</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="title">Course Title</Label>
                  <Input
                    id="title"
                    value={newCourse.title}
                    onChange={(e) => setNewCourse({...newCourse, title: e.target.value})}
                    placeholder="Enter course title"
                  />
                </div>
                <div>
                  <Label htmlFor="course_code">Course Code</Label>
                  <Input
                    id="course_code"
                    value={newCourse.course_code}
                    onChange={(e) => setNewCourse({...newCourse, course_code: e.target.value})}
                    placeholder="e.g., CS101"
                  />
                </div>
                <div>
                  <Label htmlFor="lecturer">Lecturer</Label>
                  <Select value={newCourse.lecturer_id} onValueChange={(value) => setNewCourse({...newCourse, lecturer_id: value})}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select lecturer" />
                    </SelectTrigger>
                    <SelectContent>
                      {lecturers.map((lecturer) => (
                        <SelectItem key={lecturer.id} value={lecturer.id}>
                          {lecturer.full_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="credits">Credits</Label>
                  <Input
                    id="credits"
                    type="number"
                    value={newCourse.credits}
                    onChange={(e) => setNewCourse({...newCourse, credits: parseInt(e.target.value)})}
                  />
                </div>
                <div>
                  <Label htmlFor="semester">Semester</Label>
                  <Input
                    id="semester"
                    value={newCourse.semester}
                    onChange={(e) => setNewCourse({...newCourse, semester: e.target.value})}
                    placeholder="e.g., Fall 2024"
                  />
                </div>
                <div>
                  <Label htmlFor="academic_year">Academic Year</Label>
                  <Input
                    id="academic_year"
                    value={newCourse.academic_year}
                    onChange={(e) => setNewCourse({...newCourse, academic_year: e.target.value})}
                    placeholder="e.g., 2024-2025"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={newCourse.description}
                  onChange={(e) => setNewCourse({...newCourse, description: e.target.value})}
                  placeholder="Course description"
                />
              </div>
              <Button onClick={handleCreateCourse} className="w-full">
                Create Course
              </Button>
            </div>
          )}

          <div className="space-y-4">
            {courses.map((course) => (
              <div key={course.id} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h4 className="font-medium">{course.title}</h4>
                    <Badge variant="outline">{course.course_code}</Badge>
                    <Badge variant="secondary">{course.credits} credits</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">{course.description}</p>
                  <p className="text-sm text-muted-foreground">
                    Lecturer: {course.lecturer_name} | {course.semester} | {course.academic_year}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm">
                    Edit
                  </Button>
                  <Button variant="destructive" size="sm">
                    Delete
                  </Button>
                </div>
              </div>
            ))}
            {courses.length === 0 && (
              <p className="text-center text-muted-foreground py-8">No courses found</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}