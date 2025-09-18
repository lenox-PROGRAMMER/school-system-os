import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";
import { Eye } from "lucide-react";

interface Submission {
  id: string;
  content: string;
  submitted_at: string;
  grade: number | null;
  feedback: string | null;
  profiles: {
    full_name: string;
    email: string;
  };
}

interface ViewSubmissionsProps {
  assignmentId: string;
  assignmentTitle: string;
  maxPoints: number | null;
}

export function ViewSubmissions({ assignmentId, assignmentTitle, maxPoints }: ViewSubmissionsProps) {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [selectedSubmission, setSelectedSubmission] = useState<Submission | null>(null);
  const [isMainDialogOpen, setIsMainDialogOpen] = useState(false);
  const [isGradeDialogOpen, setIsGradeDialogOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [grading, setGrading] = useState(false);
  const [gradeForm, setGradeForm] = useState({
    grade: "",
    feedback: "",
  });
  const { profile } = useAuth();

  useEffect(() => {
    if (isMainDialogOpen) {
      fetchSubmissions();
    }
  }, [assignmentId, isMainDialogOpen]);

  const fetchSubmissions = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('submissions')
        .select(`
          *,
          profiles!submissions_student_id_fkey(full_name, email)
        `)
        .eq('assignment_id', assignmentId)
        .order('submitted_at', { ascending: false });

      if (error) throw error;
      setSubmissions(data || []);
    } catch (error) {
      console.error('Error fetching submissions:', error);
      toast({
        title: "Error",
        description: "Failed to fetch submissions",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleViewSubmission = (submission: Submission) => {
    setSelectedSubmission(submission);
    setGradeForm({
      grade: submission.grade?.toString() || "",
      feedback: submission.feedback || "",
    });
    setIsGradeDialogOpen(true);
  };

  const handleGradeSubmission = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSubmission) return;

    const grade = parseFloat(gradeForm.grade);
    if (isNaN(grade) || grade < 0 || (maxPoints && grade > maxPoints)) {
      toast({
        title: "Error",
        description: `Grade must be between 0 and ${maxPoints || 100}`,
        variant: "destructive",
      });
      return;
    }

    setGrading(true);
    try {
      const { error } = await supabase
        .from('submissions')
        .update({
          grade: grade,
          feedback: gradeForm.feedback.trim() || null,
          graded_by: profile?.id,
          graded_at: new Date().toISOString(),
        })
        .eq('id', selectedSubmission.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Submission graded successfully",
      });

      setIsGradeDialogOpen(false);
      fetchSubmissions();
    } catch (error) {
      console.error('Error grading submission:', error);
      toast({
        title: "Error",
        description: "Failed to grade submission",
        variant: "destructive",
      });
    } finally {
      setGrading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  return (
    <>
      <Dialog open={isMainDialogOpen} onOpenChange={setIsMainDialogOpen}>
        <DialogTrigger asChild>
          <Button variant="outline" size="sm">
            <Eye className="h-4 w-4 mr-1" />
            View Submissions
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-[800px]">
          <DialogHeader>
            <DialogTitle>Submissions for: {assignmentTitle}</DialogTitle>
            <DialogDescription>
              {loading ? "Loading..." : `${submissions.length} submission${submissions.length !== 1 ? 's' : ''} received`}
            </DialogDescription>
          </DialogHeader>
          
          <div className="max-h-[500px] overflow-y-auto">
            <div className="space-y-4">
              {loading ? (
                <div className="text-center py-8">Loading submissions...</div>
              ) : (
                <>
                  {submissions.map((submission) => (
                    <div key={submission.id} className="p-4 border rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <h4 className="font-medium">{submission.profiles.full_name}</h4>
                          <p className="text-sm text-muted-foreground">{submission.profiles.email}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          {submission.grade !== null ? (
                            <Badge variant="secondary">
                              Graded: {submission.grade}/{maxPoints || 100}
                            </Badge>
                          ) : (
                            <Badge variant="outline">Pending Grade</Badge>
                          )}
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleViewSubmission(submission)}
                          >
                            {submission.grade !== null ? "Review" : "Grade"}
                          </Button>
                        </div>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Submitted: {formatDate(submission.submitted_at)}
                      </p>
                    </div>
                  ))}

                  {submissions.length === 0 && (
                    <div className="text-center py-8">
                      <p className="text-muted-foreground">No submissions yet.</p>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {selectedSubmission && (
        <Dialog open={isGradeDialogOpen} onOpenChange={setIsGradeDialogOpen}>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>Grade Submission</DialogTitle>
              <DialogDescription>
                Submission by {selectedSubmission.profiles.full_name}
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              <div>
                <Label>Student Submission</Label>
                <div className="p-3 bg-muted rounded-md mt-2 max-h-48 overflow-y-auto">
                  <p className="text-sm whitespace-pre-wrap">{selectedSubmission.content}</p>
                </div>
              </div>

              <Separator />

              <form onSubmit={handleGradeSubmission} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="grade">Grade (out of {maxPoints || 100})</Label>
                  <Input
                    id="grade"
                    type="number"
                    value={gradeForm.grade}
                    onChange={(e) => setGradeForm({ ...gradeForm, grade: e.target.value })}
                    placeholder="Enter grade"
                    min="0"
                    max={maxPoints || 100}
                    step="0.1"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="feedback">Feedback (Optional)</Label>
                  <Textarea
                    id="feedback"
                    value={gradeForm.feedback}
                    onChange={(e) => setGradeForm({ ...gradeForm, feedback: e.target.value })}
                    placeholder="Provide feedback for the student..."
                    rows={4}
                  />
                </div>

                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsGradeDialogOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={grading}>
                    {grading ? "Grading..." : "Save Grade"}
                  </Button>
                </DialogFooter>
              </form>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}