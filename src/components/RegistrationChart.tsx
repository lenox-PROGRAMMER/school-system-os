import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { useToast } from "@/hooks/use-toast";

interface ChartData {
  date: string;
  students: number;
  lecturers: number;
}

export const RegistrationChart = () => {
  const { toast } = useToast();
  const [chartData, setChartData] = useState<ChartData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRegistrationData();
  }, []);

  const fetchRegistrationData = async () => {
    setLoading(true);
    try {
      // Fetch all profiles with created_at dates
      const { data, error } = await supabase
        .from("profiles")
        .select("role, created_at")
        .order("created_at", { ascending: true });

      if (error) throw error;

      // Group by month and role
      const groupedData: Record<string, { students: number; lecturers: number }> = {};
      
      data?.forEach((profile) => {
        const date = new Date(profile.created_at);
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        
        if (!groupedData[monthKey]) {
          groupedData[monthKey] = { students: 0, lecturers: 0 };
        }
        
        if (profile.role === 'student') {
          groupedData[monthKey].students += 1;
        } else if (profile.role === 'lecturer') {
          groupedData[monthKey].lecturers += 1;
        }
      });

      // Convert to array and calculate cumulative counts
      const sortedMonths = Object.keys(groupedData).sort();
      let cumulativeStudents = 0;
      let cumulativeLecturers = 0;
      
      const formattedData = sortedMonths.map((month) => {
        cumulativeStudents += groupedData[month].students;
        cumulativeLecturers += groupedData[month].lecturers;
        
        return {
          date: month,
          students: cumulativeStudents,
          lecturers: cumulativeLecturers,
        };
      });

      setChartData(formattedData);
    } catch (error: any) {
      console.error("Error fetching registration data:", error);
      toast({
        title: "Error",
        description: "Failed to load registration data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div>Loading chart...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Registration Performance</CardTitle>
      </CardHeader>
      <CardContent>
        {chartData.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">
            No registration data available
          </p>
        ) : (
          <ResponsiveContainer width="100%" height={400}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="date" 
                label={{ value: 'Month', position: 'insideBottom', offset: -5 }}
              />
              <YAxis 
                label={{ value: 'Total Registrations', angle: -90, position: 'insideLeft' }}
              />
              <Tooltip />
              <Legend />
              <Line 
                type="monotone" 
                dataKey="students" 
                stroke="hsl(var(--primary))" 
                strokeWidth={2}
                name="Students"
              />
              <Line 
                type="monotone" 
                dataKey="lecturers" 
                stroke="hsl(var(--chart-2))" 
                strokeWidth={2}
                name="Lecturers"
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
};