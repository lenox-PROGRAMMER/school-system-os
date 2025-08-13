import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { GraduationCap, Plus, Eye, Edit, CheckCircle, FileText } from "lucide-react";

interface Result {
  id: string;
  student_id: string;
  course_id: string;
  grade: string | null;
  points: number | null;
  gpa: number | null;
  status: 'draft' | 'published';
  academic_year: string;
  semester: string;
  audited_at: string | null;
  published_at: string | null;
  profiles: {
    full_name: string | null;
    email: string;
  };
  courses: {
    title: string;
    course_code: string;
  };
}

interface Course {
  id: string;
  title: string;
  course_code: string;
}

interface Student {
  user_id: string;
  full_name: string | null;
  email: string;
}

export function ResultsManagement() {
  const [results, setResults] = useState<Result[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [newResult, setNewResult] = useState({
    student_id: '',
    course_id: '',
    grade: '',
    points: 0,
    gpa: 0,
    academic_year: '',
    semester: ''
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [resultsResult, coursesResult, studentsResult] = await Promise.all([
        supabase
          .from('results')
          .select(`
            *,
            profiles!results_student_id_fkey(full_name, email),
            courses(title, course_code)
          `)
          .order('created_at', { ascending: false }),
        supabase.from('courses').select('id, title, course_code'),
        supabase.from('profiles').select('user_id, full_name, email').eq('role', 'student')
      ]);

      if (resultsResult.error) throw resultsResult.error;
      if (coursesResult.error) throw coursesResult.error;
      if (studentsResult.error) throw studentsResult.error;

      setResults(resultsResult.data as unknown as Result[] || []);
      setCourses(coursesResult.data || []);
      setStudents(studentsResult.data || []);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast({
        title: "Error",
        description: "Failed to fetch results data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateResult = async () => {
    try {
      const { error } = await supabase
        .from('results')
        .insert([{
          ...newResult,
          points: newResult.points || null,
          gpa: newResult.gpa || null
        }]);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Result created successfully",
      });

      setNewResult({
        student_id: '',
        course_id: '',
        grade: '',
        points: 0,
        gpa: 0,
        academic_year: '',
        semester: ''
      });
      fetchData();
    } catch (error) {
      console.error('Error creating result:', error);
      toast({
        title: "Error",
        description: "Failed to create result",
        variant: "destructive",
      });
    }
  };

  const handleAuditResult = async (resultId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { error } = await supabase
        .from('results')
        .update({
          audited_by: user.id,
          audited_at: new Date().toISOString()
        })
        .eq('id', resultId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Result audited successfully",
      });

      fetchData();
    } catch (error) {
      console.error('Error auditing result:', error);
      toast({
        title: "Error",
        description: "Failed to audit result",
        variant: "destructive",
      });
    }
  };

  const handlePublishResult = async (resultId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { error } = await supabase
        .from('results')
        .update({
          status: 'published',
          published_by: user.id,
          published_at: new Date().toISOString()
        })
        .eq('id', resultId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Result published successfully",
      });

      fetchData();
    } catch (error) {
      console.error('Error publishing result:', error);
      toast({
        title: "Error",
        description: "Failed to publish result",
        variant: "destructive",
      });
    }
  };

  const calculateGPA = (points: number) => {
    // Simple GPA calculation (4.0 scale)
    if (points >= 90) return 4.0;
    if (points >= 80) return 3.0;
    if (points >= 70) return 2.0;
    if (points >= 60) return 1.0;
    return 0.0;
  };

  const handlePointsChange = (points: number) => {
    const gpa = calculateGPA(points);
    let grade = 'F';
    
    if (points >= 90) grade = 'A';
    else if (points >= 80) grade = 'B';
    else if (points >= 70) grade = 'C';
    else if (points >= 60) grade = 'D';
    
    setNewResult({
      ...newResult,
      points,
      gpa,
      grade
    });
  };

  if (loading) {
    return <div className="text-center py-8">Loading results...</div>;
  }

  const draftResults = results.filter(r => r.status === 'draft');
  const publishedResults = results.filter(r => r.status === 'published');

  return (
    <div className="space-y-6">
      <Tabs defaultValue="draft" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="draft">Draft Results</TabsTrigger>
          <TabsTrigger value="published">Published Results</TabsTrigger>
        </TabsList>

        <TabsContent value="draft">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    Draft Results
                  </CardTitle>
                  <CardDescription>Manage and audit draft results before publishing</CardDescription>
                </div>
                <Dialog>
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="h-4 w-4 mr-2" />
                      Add Result
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Create New Result</DialogTitle>
                      <DialogDescription>Add a new student result</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="student">Select Student</Label>
                        <Select value={newResult.student_id} onValueChange={(value) => setNewResult({...newResult, student_id: value})}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select student" />
                          </SelectTrigger>
                          <SelectContent>
                            {students.map((student) => (
                              <SelectItem key={student.user_id} value={student.user_id || ''}>
                                {student.full_name || student.email}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div>
                        <Label htmlFor="course">Select Course</Label>
                        <Select value={newResult.course_id} onValueChange={(value) => setNewResult({...newResult, course_id: value})}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select course" />
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
                        <Label htmlFor="points">Points (0-100)</Label>
                        <Input
                          id="points"
                          type="number"
                          min="0"
                          max="100"
                          value={newResult.points}
                          onChange={(e) => handlePointsChange(parseFloat(e.target.value) || 0)}
                        />
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="grade">Grade</Label>
                          <Input
                            id="grade"
                            value={newResult.grade}
                            readOnly
                            className="bg-muted"
                          />
                        </div>
                        <div>
                          <Label htmlFor="gpa">GPA</Label>
                          <Input
                            id="gpa"
                            value={newResult.gpa}
                            readOnly
                            className="bg-muted"
                          />
                        </div>
                      </div>
                      
                      <div>
                        <Label htmlFor="academic_year">Academic Year</Label>
                        <Input
                          id="academic_year"
                          value={newResult.academic_year}
                          onChange={(e) => setNewResult({...newResult, academic_year: e.target.value})}
                          placeholder="2024-2025"
                        />
                      </div>
                      
                      <div>
                        <Label htmlFor="semester">Semester</Label>
                        <Input
                          id="semester"
                          value={newResult.semester}
                          onChange={(e) => setNewResult({...newResult, semester: e.target.value})}
                          placeholder="Fall, Spring, etc."
                        />
                      </div>
                      
                      <Button onClick={handleCreateResult} className="w-full">
                        Create Result
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Student</TableHead>
                    <TableHead>Course</TableHead>
                    <TableHead>Grade</TableHead>
                    <TableHead>Points</TableHead>
                    <TableHead>GPA</TableHead>
                    <TableHead>Year/Semester</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {draftResults.map((result) => (
                    <TableRow key={result.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{result.profiles?.full_name || 'N/A'}</p>
                          <p className="text-sm text-muted-foreground">{result.profiles?.email}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{result.courses?.course_code}</p>
                          <p className="text-sm text-muted-foreground">{result.courses?.title}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{result.grade || 'N/A'}</Badge>
                      </TableCell>
                      <TableCell>{result.points || 'N/A'}</TableCell>
                      <TableCell>{result.gpa || 'N/A'}</TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <p>{result.academic_year}</p>
                          <p className="text-muted-foreground">{result.semester}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">{result.status}</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          {!result.audited_at && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleAuditResult(result.id)}
                            >
                              <CheckCircle className="h-4 w-4 mr-1" />
                              Audit
                            </Button>
                          )}
                          {result.audited_at && (
                            <Button
                              size="sm"
                              onClick={() => handlePublishResult(result.id)}
                            >
                              <Eye className="h-4 w-4 mr-1" />
                              Publish
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              
              {draftResults.length === 0 && (
                <p className="text-center text-muted-foreground py-8">
                  No draft results found
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="published">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <GraduationCap className="h-5 w-5" />
                Published Results
              </CardTitle>
              <CardDescription>View all published results visible to students</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Student</TableHead>
                    <TableHead>Course</TableHead>
                    <TableHead>Grade</TableHead>
                    <TableHead>Points</TableHead>
                    <TableHead>GPA</TableHead>
                    <TableHead>Year/Semester</TableHead>
                    <TableHead>Published</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {publishedResults.map((result) => (
                    <TableRow key={result.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{result.profiles?.full_name || 'N/A'}</p>
                          <p className="text-sm text-muted-foreground">{result.profiles?.email}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{result.courses?.course_code}</p>
                          <p className="text-sm text-muted-foreground">{result.courses?.title}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={result.grade === 'A' ? 'default' : result.grade === 'F' ? 'destructive' : 'secondary'}>
                          {result.grade || 'N/A'}
                        </Badge>
                      </TableCell>
                      <TableCell>{result.points || 'N/A'}</TableCell>
                      <TableCell>{result.gpa || 'N/A'}</TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <p>{result.academic_year}</p>
                          <p className="text-muted-foreground">{result.semester}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm text-muted-foreground">
                          {result.published_at ? new Date(result.published_at).toLocaleDateString() : 'N/A'}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              
              {publishedResults.length === 0 && (
                <p className="text-center text-muted-foreground py-8">
                  No published results found
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}