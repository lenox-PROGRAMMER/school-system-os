import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { CalendarDays, Plus, Pencil, Trash2, CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface AcademicEvent {
  id: string;
  title: string;
  description: string | null;
  event_type: 'semester_start' | 'semester_end' | 'exam' | 'holiday' | 'registration' | 'other';
  start_date: string;
  end_date: string | null;
  academic_year: string;
  semester: string | null;
  created_at: string;
}

export function AcademicCalendar() {
  const [events, setEvents] = useState<AcademicEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [newEvent, setNewEvent] = useState({
    title: '',
    description: '',
    event_type: 'other' as const,
    start_date: new Date(),
    end_date: null as Date | null,
    academic_year: '',
    semester: ''
  });

  useEffect(() => {
    fetchEvents();
  }, []);

  const fetchEvents = async () => {
    try {
      const { data, error } = await supabase
        .from('academic_calendar')
        .select('*')
        .order('start_date', { ascending: true });

      if (error) throw error;
      setEvents(data as AcademicEvent[] || []);
    } catch (error) {
      console.error('Error fetching events:', error);
      toast({
        title: "Error",
        description: "Failed to fetch calendar events",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateEvent = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { error } = await supabase
        .from('academic_calendar')
        .insert([{
          ...newEvent,
          start_date: format(newEvent.start_date, 'yyyy-MM-dd'),
          end_date: newEvent.end_date ? format(newEvent.end_date, 'yyyy-MM-dd') : null,
          created_by: user.id
        }]);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Event created successfully",
      });

      setNewEvent({
        title: '',
        description: '',
        event_type: 'other',
        start_date: new Date(),
        end_date: null,
        academic_year: '',
        semester: ''
      });
      fetchEvents();
    } catch (error) {
      console.error('Error creating event:', error);
      toast({
        title: "Error",
        description: "Failed to create event",
        variant: "destructive",
      });
    }
  };

  const handleDeleteEvent = async (eventId: string) => {
    try {
      const { error } = await supabase
        .from('academic_calendar')
        .delete()
        .eq('id', eventId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Event deleted successfully",
      });

      fetchEvents();
    } catch (error) {
      console.error('Error deleting event:', error);
      toast({
        title: "Error",
        description: "Failed to delete event",
        variant: "destructive",
      });
    }
  };

  const getEventTypeColor = (type: string) => {
    switch (type) {
      case 'semester_start':
      case 'semester_end':
        return 'default';
      case 'exam':
        return 'destructive';
      case 'holiday':
        return 'secondary';
      case 'registration':
        return 'outline';
      default:
        return 'default';
    }
  };

  const getEventTypeLabel = (type: string) => {
    switch (type) {
      case 'semester_start':
        return 'Semester Start';
      case 'semester_end':
        return 'Semester End';
      case 'exam':
        return 'Exam';
      case 'holiday':
        return 'Holiday';
      case 'registration':
        return 'Registration';
      default:
        return 'Other';
    }
  };

  if (loading) {
    return <div className="text-center py-8">Loading calendar...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle className="flex items-center gap-2">
              <CalendarDays className="h-5 w-5" />
              Academic Calendar
            </CardTitle>
            <CardDescription>Manage academic events and important dates</CardDescription>
          </div>
          <Dialog>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Add Event
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Create Academic Event</DialogTitle>
                <DialogDescription>Add a new event to the academic calendar</DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="title">Event Title</Label>
                  <Input
                    id="title"
                    value={newEvent.title}
                    onChange={(e) => setNewEvent({...newEvent, title: e.target.value})}
                  />
                </div>
                
                <div>
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={newEvent.description}
                    onChange={(e) => setNewEvent({...newEvent, description: e.target.value})}
                  />
                </div>
                
                <div>
                  <Label htmlFor="event_type">Event Type</Label>
                  <Select value={newEvent.event_type} onValueChange={(value: any) => setNewEvent({...newEvent, event_type: value})}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="semester_start">Semester Start</SelectItem>
                      <SelectItem value="semester_end">Semester End</SelectItem>
                      <SelectItem value="exam">Exam</SelectItem>
                      <SelectItem value="holiday">Holiday</SelectItem>
                      <SelectItem value="registration">Registration</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label>Start Date</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !newEvent.start_date && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {newEvent.start_date ? format(newEvent.start_date, "PPP") : <span>Pick a date</span>}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={newEvent.start_date}
                        onSelect={(date) => date && setNewEvent({...newEvent, start_date: date})}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
                
                <div>
                  <Label>End Date (Optional)</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !newEvent.end_date && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {newEvent.end_date ? format(newEvent.end_date, "PPP") : <span>Pick a date</span>}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={newEvent.end_date}
                        onSelect={(date) => setNewEvent({...newEvent, end_date: date})}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
                
                <div>
                  <Label htmlFor="academic_year">Academic Year</Label>
                  <Input
                    id="academic_year"
                    value={newEvent.academic_year}
                    onChange={(e) => setNewEvent({...newEvent, academic_year: e.target.value})}
                    placeholder="2024-2025"
                  />
                </div>
                
                <div>
                  <Label htmlFor="semester">Semester (Optional)</Label>
                  <Input
                    id="semester"
                    value={newEvent.semester}
                    onChange={(e) => setNewEvent({...newEvent, semester: e.target.value})}
                    placeholder="Fall, Spring, etc."
                  />
                </div>
                
                <Button onClick={handleCreateEvent} className="w-full">
                  Create Event
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {events.map((event) => (
            <div key={event.id} className="border rounded-lg p-4">
              <div className="flex justify-between items-start">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold">{event.title}</h3>
                    <Badge variant={getEventTypeColor(event.event_type)}>
                      {getEventTypeLabel(event.event_type)}
                    </Badge>
                  </div>
                  {event.description && (
                    <p className="text-sm text-muted-foreground">{event.description}</p>
                  )}
                  <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                    <span>Start: {new Date(event.start_date).toLocaleDateString()}</span>
                    {event.end_date && (
                      <span>End: {new Date(event.end_date).toLocaleDateString()}</span>
                    )}
                    <span>Year: {event.academic_year}</span>
                    {event.semester && <span>Semester: {event.semester}</span>}
                  </div>
                </div>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => handleDeleteEvent(event.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
          
          {events.length === 0 && (
            <p className="text-center text-muted-foreground py-8">
              No events scheduled
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}