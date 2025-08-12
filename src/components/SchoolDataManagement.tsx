import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

interface SchoolData {
  id: string;
  school_name: string | null;
  location: string | null;
  created_at: string;
}

export function SchoolDataManagement() {
  const [schoolData, setSchoolData] = useState<SchoolData[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newSchool, setNewSchool] = useState({
    school_name: '',
    location: '',
  });

  useEffect(() => {
    fetchSchoolData();
  }, []);

  const fetchSchoolData = async () => {
    try {
      const { data, error } = await supabase
        .from('school_data')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setSchoolData(data || []);
    } catch (error) {
      console.error('Error fetching school data:', error);
      toast({
        title: "Error",
        description: "Failed to fetch school data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSchool = async () => {
    try {
      const { error } = await supabase
        .from('school_data')
        .insert([newSchool]);

      if (error) throw error;

      toast({
        title: "Success",
        description: "School data created successfully",
      });

      setNewSchool({
        school_name: '',
        location: '',
      });
      setShowCreateForm(false);
      fetchSchoolData();
    } catch (error) {
      console.error('Error creating school data:', error);
      toast({
        title: "Error",
        description: "Failed to create school data",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return <div className="text-center py-8">Loading school data...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle>School Data Management</CardTitle>
            <CardDescription>
              Manage school information and locations
            </CardDescription>
          </div>
          <Button onClick={() => setShowCreateForm(!showCreateForm)}>
            {showCreateForm ? 'Cancel' : 'Add School'}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {showCreateForm && (
          <div className="mb-6 p-4 border rounded-lg space-y-4">
            <h3 className="font-semibold">Add New School</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="school_name">School Name</Label>
                <Input
                  id="school_name"
                  value={newSchool.school_name}
                  onChange={(e) => setNewSchool({...newSchool, school_name: e.target.value})}
                  placeholder="Enter school name"
                />
              </div>
              <div>
                <Label htmlFor="location">Location</Label>
                <Input
                  id="location"
                  value={newSchool.location}
                  onChange={(e) => setNewSchool({...newSchool, location: e.target.value})}
                  placeholder="Enter location"
                />
              </div>
            </div>
            <Button onClick={handleCreateSchool} className="w-full">
              Add School
            </Button>
          </div>
        )}

        <div className="space-y-4">
          {schoolData.map((school) => (
            <div key={school.id} className="flex items-center justify-between p-4 border rounded-lg">
              <div className="space-y-1">
                <h4 className="font-medium">{school.school_name || 'No name'}</h4>
                <p className="text-sm text-muted-foreground">{school.location || 'No location'}</p>
                <p className="text-xs text-muted-foreground">
                  Created: {new Date(school.created_at).toLocaleDateString()}
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
          {schoolData.length === 0 && (
            <p className="text-center text-muted-foreground py-8">No school data found</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}