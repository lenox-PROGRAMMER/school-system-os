import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Search, Pencil, Trash2 } from "lucide-react";

interface Profile {
  id: string;
  full_name: string | null;
  email: string;
  role: string;
  created_at: string;
  user_id: string | null;
}

interface Course {
  id: string;
  title: string;
  course_code: string;
}

interface UserManagementProps {
  userType?: 'student' | 'lecturer';
}

export function UserManagement({ userType }: UserManagementProps) {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [filteredProfiles, setFilteredProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [editingProfile, setEditingProfile] = useState<Profile | null>(null);
  const [courses, setCourses] = useState<Course[]>([]);
  const [selectedCourses, setSelectedCourses] = useState<string[]>([]);
  const [selectedLecturer, setSelectedLecturer] = useState<string>("");

  useEffect(() => {
    fetchProfiles();
    fetchCourses();
  }, []);

  useEffect(() => {
    filterProfiles();
  }, [profiles, searchTerm, userType]);

  const filterProfiles = () => {
    let filtered = profiles;
    
    if (userType) {
      filtered = filtered.filter(profile => profile.role === userType);
    }
    
    if (searchTerm) {
      filtered = filtered.filter(profile => 
        profile.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        profile.email.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    setFilteredProfiles(filtered);
  };

  const fetchCourses = async () => {
    try {
      const { data, error } = await supabase
        .from('courses')
        .select('id, title, course_code');
      
      if (error) throw error;
      setCourses(data || []);
    } catch (error) {
      console.error('Error fetching courses:', error);
    }
  };

  const fetchProfiles = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setProfiles(data || []);
    } catch (error) {
      console.error('Error fetching profiles:', error);
      toast({
        title: "Error",
        description: "Failed to fetch users",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (profile: Profile) => {
    setEditingProfile(profile);
    setSelectedCourses([]);
    setSelectedLecturer("");
  };

  const handleSaveEdit = async () => {
    if (!editingProfile) return;

    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: editingProfile.full_name,
          email: editingProfile.email,
          role: editingProfile.role,
        })
        .eq('id', editingProfile.id);

      if (error) throw error;

      // Handle course assignments for students
      if (editingProfile.role === 'student' && selectedCourses.length > 0) {
        for (const courseId of selectedCourses) {
          await supabase
            .from('enrollments')
            .upsert({
              student_id: editingProfile.user_id,
              course_id: courseId,
              status: 'active'
            });
        }
      }

      // Handle lecturer assignment for students
      if (editingProfile.role === 'student' && selectedLecturer) {
        for (const courseId of selectedCourses) {
          await supabase
            .from('courses')
            .update({ lecturer_id: selectedLecturer })
            .eq('id', courseId);
        }
      }

      toast({
        title: "Success",
        description: "User updated successfully",
      });

      setEditingProfile(null);
      fetchProfiles();
    } catch (error) {
      console.error('Error updating profile:', error);
      toast({
        title: "Error",
        description: "Failed to update user",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (profileId: string) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .delete()
        .eq('id', profileId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "User deleted successfully",
      });

      fetchProfiles();
    } catch (error) {
      console.error('Error deleting profile:', error);
      toast({
        title: "Error",
        description: "Failed to delete user",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return <div className="text-center py-8">Loading users...</div>;
  }

  const title = userType ? `${userType.charAt(0).toUpperCase() + userType.slice(1)} Management` : "User Management";
  const description = userType ? `Manage all ${userType}s in the system` : "Manage all users in the system";

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
        <div className="flex gap-4 items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder={`Search ${userType || 'users'}...`}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {filteredProfiles.map((profile) => (
            <div key={profile.id} className="flex items-center justify-between p-4 border rounded-lg">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h4 className="font-medium">{profile.full_name || 'No name'}</h4>
                  <Badge variant={profile.role === 'admin' ? 'destructive' : profile.role === 'lecturer' ? 'default' : 'secondary'}>
                    {profile.role}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">{profile.email}</p>
                <p className="text-xs text-muted-foreground">
                  Created: {new Date(profile.created_at).toLocaleDateString()}
                </p>
              </div>
              <div className="flex gap-2">
                <Dialog>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm" onClick={() => handleEdit(profile)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-md">
                    <DialogHeader>
                      <DialogTitle>Edit User</DialogTitle>
                      <DialogDescription>
                        Update user information and assignments
                      </DialogDescription>
                    </DialogHeader>
                    {editingProfile && (
                      <div className="space-y-4">
                        <div>
                          <Label htmlFor="full_name">Full Name</Label>
                          <Input
                            id="full_name"
                            value={editingProfile.full_name || ''}
                            onChange={(e) => setEditingProfile({...editingProfile, full_name: e.target.value})}
                          />
                        </div>
                        <div>
                          <Label htmlFor="email">Email</Label>
                          <Input
                            id="email"
                            value={editingProfile.email}
                            onChange={(e) => setEditingProfile({...editingProfile, email: e.target.value})}
                          />
                        </div>
                        <div>
                          <Label htmlFor="role">Role</Label>
                          <Select value={editingProfile.role} onValueChange={(value) => setEditingProfile({...editingProfile, role: value})}>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="student">Student</SelectItem>
                              <SelectItem value="lecturer">Lecturer</SelectItem>
                              <SelectItem value="admin">Admin</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        
                        {editingProfile.role === 'student' && (
                          <>
                            <div>
                              <Label>Assign Courses</Label>
                              <div className="grid grid-cols-1 gap-2 max-h-40 overflow-y-auto">
                                {courses.map((course) => (
                                  <div key={course.id} className="flex items-center space-x-2">
                                    <Checkbox
                                      id={course.id}
                                      checked={selectedCourses.includes(course.id)}
                                      onCheckedChange={(checked) => {
                                        if (checked) {
                                          setSelectedCourses([...selectedCourses, course.id]);
                                        } else {
                                          setSelectedCourses(selectedCourses.filter(id => id !== course.id));
                                        }
                                      }}
                                    />
                                    <Label htmlFor={course.id} className="text-sm">
                                      {course.course_code} - {course.title}
                                    </Label>
                                  </div>
                                ))}
                              </div>
                            </div>
                            
                            <div>
                              <Label htmlFor="lecturer">Assign Lecturer</Label>
                              <Select value={selectedLecturer} onValueChange={setSelectedLecturer}>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select lecturer" />
                                </SelectTrigger>
                                <SelectContent>
                                  {profiles.filter(p => p.role === 'lecturer').map((lecturer) => (
                                    <SelectItem key={lecturer.user_id} value={lecturer.user_id || ''}>
                                      {lecturer.full_name || lecturer.email}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          </>
                        )}
                        
                        <div className="flex justify-end gap-2">
                          <Button variant="outline" onClick={() => setEditingProfile(null)}>
                            Cancel
                          </Button>
                          <Button onClick={handleSaveEdit}>
                            Save Changes
                          </Button>
                        </div>
                      </div>
                    )}
                  </DialogContent>
                </Dialog>
                
                {profile.role !== 'admin' && (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="destructive" size="sm">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This action cannot be undone. This will permanently delete the user account.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={() => handleDelete(profile.id)}>
                          Delete
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                )}
              </div>
            </div>
          ))}
          {filteredProfiles.length === 0 && (
            <p className="text-center text-muted-foreground py-8">
              No {userType || 'users'} found
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}