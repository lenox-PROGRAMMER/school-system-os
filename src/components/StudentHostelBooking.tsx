import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useForm } from "react-hook-form";

interface Hostel {
  id: string;
  name: string;
  description: string | null;
  total_rooms: number;
}

interface Room {
  id: string;
  room_number: string;
  capacity: number;
  occupied: number;
  price: number | null;
  status: string;
  amenities: string[] | null;
  hostel_id: string;
}

interface RoomBooking {
  id: string;
  status: string;
  booking_date: string;
  admin_response: string | null;
  academic_year: string | null;
  semester: string | null;
  room: {
    room_number: string;
    hostel: {
      name: string;
    };
  };
}

interface BookingFormData {
  hostel_id: string;
  room_id: string;
  academic_year: string;
  semester: string;
}

export function StudentHostelBooking() {
  const [hostels, setHostels] = useState<Hostel[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [bookings, setBookings] = useState<RoomBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  const { register, handleSubmit, watch, setValue, reset } = useForm<BookingFormData>();
  const selectedHostelId = watch("hostel_id");

  useEffect(() => {
    fetchData();
  }, [user]);

  useEffect(() => {
    if (selectedHostelId) {
      fetchRooms(selectedHostelId);
    }
  }, [selectedHostelId]);

  const fetchData = async () => {
    if (!user) return;

    try {
      // Fetch hostels
      const { data: hostelsData, error: hostelsError } = await supabase
        .from("hostels")
        .select("*")
        .order("name");

      if (hostelsError) throw hostelsError;
      setHostels(hostelsData || []);

      // Fetch user's bookings
      const { data: bookingsData, error: bookingsError } = await supabase
        .from("room_bookings")
        .select(`
          *,
          room:rooms (
            room_number,
            hostel:hostels (name)
          )
        `)
        .eq("student_id", user.id)
        .order("booking_date", { ascending: false });

      if (bookingsError) throw bookingsError;
      setBookings(bookingsData || []);
    } catch (error) {
      console.error("Error fetching data:", error);
      toast({
        title: "Error",
        description: "Failed to load hostel data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchRooms = async (hostelId: string) => {
    try {
      const { data, error } = await supabase
        .from("rooms")
        .select("*")
        .eq("hostel_id", hostelId)
        .eq("status", "available")
        .order("room_number");

      if (error) throw error;
      setRooms(data || []);
    } catch (error) {
      console.error("Error fetching rooms:", error);
      setRooms([]);
    }
  };

  const onSubmit = async (data: BookingFormData) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from("room_bookings")
        .insert({
          student_id: user.id,
          room_id: data.room_id,
          academic_year: data.academic_year,
          semester: data.semester,
          status: "pending"
        });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Hostel booking request submitted successfully",
      });

      setOpen(false);
      reset();
      fetchData();
    } catch (error) {
      console.error("Error submitting booking:", error);
      toast({
        title: "Error",
        description: "Failed to submit booking request",
        variant: "destructive",
      });
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge variant="secondary">Pending</Badge>;
      case "approved":
        return <Badge variant="default">Approved</Badge>;
      case "rejected":
        return <Badge variant="destructive">Rejected</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            Hostel Booking
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button>Request Hostel Room</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Request Hostel Room</DialogTitle>
                  <DialogDescription>
                    Submit a request for hostel accommodation
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                  <div>
                    <Label htmlFor="hostel_id">Select Hostel</Label>
                    <Select onValueChange={(value) => setValue("hostel_id", value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Choose a hostel" />
                      </SelectTrigger>
                      <SelectContent>
                        {hostels.map((hostel) => (
                          <SelectItem key={hostel.id} value={hostel.id}>
                            {hostel.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {selectedHostelId && (
                    <div>
                      <Label htmlFor="room_id">Select Room</Label>
                      <Select onValueChange={(value) => setValue("room_id", value)}>
                        <SelectTrigger>
                          <SelectValue placeholder="Choose a room" />
                        </SelectTrigger>
                        <SelectContent>
                          {rooms.map((room) => (
                            <SelectItem key={room.id} value={room.id}>
                              Room {room.room_number} - Capacity: {room.capacity} 
                              {room.price && ` - $${room.price}/semester`}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  <div>
                    <Label htmlFor="academic_year">Academic Year</Label>
                    <Select onValueChange={(value) => setValue("academic_year", value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select academic year" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="2024-2025">2024-2025</SelectItem>
                        <SelectItem value="2025-2026">2025-2026</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="semester">Semester</Label>
                    <Select onValueChange={(value) => setValue("semester", value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select semester" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Fall">Fall</SelectItem>
                        <SelectItem value="Spring">Spring</SelectItem>
                        <SelectItem value="Summer">Summer</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <Button type="submit" className="w-full">
                    Submit Request
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          </CardTitle>
          <CardDescription>
            Request hostel accommodation and view your booking status
          </CardDescription>
        </CardHeader>
        <CardContent>
          {bookings.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              No hostel booking requests found. Click "Request Hostel Room" to get started.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Hostel</TableHead>
                  <TableHead>Room</TableHead>
                  <TableHead>Academic Year</TableHead>
                  <TableHead>Semester</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Request Date</TableHead>
                  <TableHead>Response</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {bookings.map((booking) => (
                  <TableRow key={booking.id}>
                    <TableCell>{booking.room?.hostel?.name}</TableCell>
                    <TableCell>{booking.room?.room_number}</TableCell>
                    <TableCell>{booking.academic_year}</TableCell>
                    <TableCell>{booking.semester}</TableCell>
                    <TableCell>{getStatusBadge(booking.status)}</TableCell>
                    <TableCell>
                      {new Date(booking.booking_date).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      {booking.admin_response || "No response yet"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}