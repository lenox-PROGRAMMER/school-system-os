import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useForm } from "react-hook-form";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { Textarea } from "@/components/ui/textarea";

interface Hostel {
  id: string;
  name: string;
  description: string;
  total_rooms: number;
  created_at: string;
  updated_at: string;
}

interface Room {
  id: string;
  hostel_id: string;
  room_number: string;
  capacity: number;
  occupied: number;
  price: number | null;
  amenities: string[] | null;
  status: string;
  created_at: string;
  updated_at: string;
}

interface Student {
  id: string;
  user_id: string | null;
  full_name: string | null;
  email: string;
}

interface RoomBooking {
  id: string;
  student_id: string;
  room_id: string;
  booking_date: string;
  status: string;
  academic_year: string | null;
  semester: string | null;
  admin_response: string | null;
  responded_by: string | null;
  responded_at: string | null;
  profiles: Student;
  rooms: {
    room_number: string;
    hostels: {
      name: string;
    };
  };
}

interface HostelFormData {
  name: string;
  description: string;
  total_rooms: number;
}

interface RoomFormData {
  hostel_id: string;
  room_number: string;
  capacity: number;
  price: number;
  amenities: string;
  status: string;
}

interface AssignmentFormData {
  student_id: string;
  hostel_id: string;
  room_id: string;
  notes: string;
}

export function HostelManagement() {
  const { profile } = useAuth();
  const [hostels, setHostels] = useState<Hostel[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [bookings, setBookings] = useState<RoomBooking[]>([]);
  const [selectedHostel, setSelectedHostel] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [openHostelDialog, setOpenHostelDialog] = useState(false);
  const [openRoomDialog, setOpenRoomDialog] = useState(false);
  const [openAssignDialog, setOpenAssignDialog] = useState(false);

  const hostelForm = useForm<HostelFormData>({
    defaultValues: {
      name: "",
      description: "",
      total_rooms: 0,
    },
  });

  const roomForm = useForm<RoomFormData>({
    defaultValues: {
      hostel_id: "",
      room_number: "",
      capacity: 1,
      price: 0,
      amenities: "",
      status: "available",
    },
  });

  const assignForm = useForm<AssignmentFormData>({
    defaultValues: {
      student_id: "",
      hostel_id: "",
      room_id: "",
      notes: "",
    },
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      await Promise.all([
        fetchHostels(),
        fetchRooms(),
        fetchStudents(),
        fetchBookings(),
      ]);
    } catch (error) {
      console.error("Error fetching data:", error);
      toast({
        title: "Error",
        description: "Failed to fetch data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchHostels = async () => {
    const { data, error } = await supabase
      .from("hostels")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching hostels:", error);
      throw error;
    }

    setHostels(data || []);
  };

  const fetchRooms = async () => {
    const { data, error } = await supabase
      .from("rooms")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching rooms:", error);
      throw error;
    }

    setRooms(data || []);
  };

  const fetchStudents = async () => {
    const { data, error } = await supabase
      .from("profiles")
      .select("id, user_id, full_name, email")
      .eq("role", "student");

    if (error) {
      console.error("Error fetching students:", error);
      throw error;
    }

    setStudents(data || []);
  };

  const fetchBookings = async () => {
    const { data, error } = await supabase
      .from("room_bookings")
      .select(`
        *,
        profiles!room_bookings_student_id_fkey(id, full_name, email),
        rooms(room_number, hostels(name))
      `)
      .order("booking_date", { ascending: false });

    if (error) {
      console.error("Error fetching bookings:", error);
      // Don't throw error, just set empty array
      setBookings([]);
      return;
    }

    // Type assertion to handle the foreign key data structure
    setBookings((data as any) || []);
  };

  const onSubmitHostel = async (data: HostelFormData) => {
    try {
      const { error } = await supabase
        .from("hostels")
        .insert([data]);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Hostel created successfully",
      });

      setOpenHostelDialog(false);
      hostelForm.reset();
      fetchHostels();
    } catch (error) {
      console.error("Error creating hostel:", error);
      toast({
        title: "Error",
        description: "Failed to create hostel",
        variant: "destructive",
      });
    }
  };

  const onSubmitRoom = async (data: RoomFormData) => {
    try {
      const amenitiesArray = data.amenities 
        ? data.amenities.split(",").map(item => item.trim())
        : [];

      const roomData = {
        hostel_id: data.hostel_id,
        room_number: data.room_number,
        capacity: data.capacity,
        price: data.price,
        amenities: amenitiesArray,
        status: data.status,
      };

      const { error } = await supabase
        .from("rooms")
        .insert([roomData]);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Room created successfully",
      });

      setOpenRoomDialog(false);
      roomForm.reset();
      fetchRooms();
    } catch (error) {
      console.error("Error creating room:", error);
      toast({
        title: "Error",
        description: "Failed to create room",
        variant: "destructive",
      });
    }
  };

  const onSubmitAssignment = async (data: AssignmentFormData) => {
    try {
      if (!profile?.id) {
        toast({
          title: "Error",
          description: "Admin profile not found",
          variant: "destructive",
        });
        return;
      }

      const assignmentData = {
        student_id: data.student_id,
        hostel_id: data.hostel_id,
        room_id: data.room_id,
        assigned_by: profile.id,
        notes: data.notes,
        status: "assigned",
      };

      const { error } = await supabase
        .from("student_hostel_assignments")
        .insert([assignmentData]);

      if (error) throw error;

      // Update room occupied count
      const room = rooms.find(r => r.id === data.room_id);
      if (room) {
        const { error: updateError } = await supabase
          .from("rooms")
          .update({ occupied: room.occupied + 1 })
          .eq("id", data.room_id);

        if (updateError) {
          console.error("Error updating room occupancy:", updateError);
        }
      }

      toast({
        title: "Success",
        description: "Student assigned to room successfully",
      });

      setOpenAssignDialog(false);
      assignForm.reset();
      fetchRooms();
    } catch (error) {
      console.error("Error assigning student:", error);
      toast({
        title: "Error",
        description: "Failed to assign student to room",
        variant: "destructive",
      });
    }
  };

  const handleBookingResponse = async (bookingId: string, status: "approved" | "rejected", response: string) => {
    try {
      if (!profile?.id) {
        toast({
          title: "Error",
          description: "Admin profile not found",
          variant: "destructive",
        });
        return;
      }

      const { error } = await supabase
        .from("room_bookings")
        .update({
          status,
          admin_response: response,
          responded_by: profile.id,
          responded_at: new Date().toISOString(),
        })
        .eq("id", bookingId);

      if (error) throw error;

      toast({
        title: "Success",
        description: `Booking ${status} successfully`,
      });

      fetchBookings();
    } catch (error) {
      console.error("Error updating booking:", error);
      toast({
        title: "Error",
        description: "Failed to update booking",
        variant: "destructive",
      });
    }
  };

  const getFilteredRooms = () => {
    if (!selectedHostel) return rooms;
    return rooms.filter(room => room.hostel_id === selectedHostel);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-bold">Hostel Management</h2>
        <div className="flex gap-2">
          <Dialog open={openHostelDialog} onOpenChange={setOpenHostelDialog}>
            <DialogTrigger asChild>
              <Button>Add Hostel</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add New Hostel</DialogTitle>
                <DialogDescription>
                  Create a new hostel in the system.
                </DialogDescription>
              </DialogHeader>
              <Form {...hostelForm}>
                <form onSubmit={hostelForm.handleSubmit(onSubmitHostel)} className="space-y-4">
                  <FormField
                    control={hostelForm.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Hostel Name</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter hostel name" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={hostelForm.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Description</FormLabel>
                        <FormControl>
                          <Textarea placeholder="Enter hostel description" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={hostelForm.control}
                    name="total_rooms"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Total Rooms</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            placeholder="Enter total rooms" 
                            {...field}
                            onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button type="submit" className="w-full">Create Hostel</Button>
                </form>
              </Form>
            </DialogContent>
          </Dialog>

          <Dialog open={openRoomDialog} onOpenChange={setOpenRoomDialog}>
            <DialogTrigger asChild>
              <Button variant="outline">Add Room</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add New Room</DialogTitle>
                <DialogDescription>
                  Create a new room in a hostel.
                </DialogDescription>
              </DialogHeader>
              <Form {...roomForm}>
                <form onSubmit={roomForm.handleSubmit(onSubmitRoom)} className="space-y-4">
                  <FormField
                    control={roomForm.control}
                    name="hostel_id"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Hostel</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select a hostel" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {hostels.map((hostel) => (
                              <SelectItem key={hostel.id} value={hostel.id}>
                                {hostel.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={roomForm.control}
                    name="room_number"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Room Number</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter room number" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={roomForm.control}
                    name="capacity"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Capacity</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            placeholder="Enter room capacity" 
                            {...field}
                            onChange={(e) => field.onChange(parseInt(e.target.value) || 1)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={roomForm.control}
                    name="price"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Price</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            placeholder="Enter room price" 
                            {...field}
                            onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={roomForm.control}
                    name="amenities"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Amenities (comma-separated)</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g., WiFi, AC, TV" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={roomForm.control}
                    name="status"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Status</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select status" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="available">Available</SelectItem>
                            <SelectItem value="occupied">Occupied</SelectItem>
                            <SelectItem value="maintenance">Maintenance</SelectItem>
                            <SelectItem value="reserved">Reserved</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button type="submit" className="w-full">Create Room</Button>
                </form>
              </Form>
            </DialogContent>
          </Dialog>

          <Dialog open={openAssignDialog} onOpenChange={setOpenAssignDialog}>
            <DialogTrigger asChild>
              <Button variant="outline">Assign Student</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Assign Student to Room</DialogTitle>
                <DialogDescription>
                  Assign a student to a specific room.
                </DialogDescription>
              </DialogHeader>
              <Form {...assignForm}>
                <form onSubmit={assignForm.handleSubmit(onSubmitAssignment)} className="space-y-4">
                  <FormField
                    control={assignForm.control}
                    name="student_id"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Student</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select a student" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {students.map((student) => (
                              <SelectItem key={student.id} value={student.id}>
                                {student.full_name || student.email} ({student.email})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={assignForm.control}
                    name="hostel_id"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Hostel</FormLabel>
                        <Select onValueChange={(value) => {
                          field.onChange(value);
                          setSelectedHostel(value);
                          assignForm.setValue("room_id", "");
                        }}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select a hostel" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {hostels.map((hostel) => (
                              <SelectItem key={hostel.id} value={hostel.id}>
                                {hostel.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={assignForm.control}
                    name="room_id"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Room</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select a room" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {getFilteredRooms()
                              .filter(room => room.occupied < room.capacity && room.status === "available")
                              .map((room) => (
                              <SelectItem key={room.id} value={room.id}>
                                Room {room.room_number} (Available: {room.capacity - room.occupied})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={assignForm.control}
                    name="notes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Notes</FormLabel>
                        <FormControl>
                          <Textarea placeholder="Additional notes" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button type="submit" className="w-full">Assign Student</Button>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Hostels List */}
      <Card>
        <CardHeader>
          <CardTitle>Hostels</CardTitle>
          <CardDescription>Manage all hostels in the system</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Total Rooms</TableHead>
                <TableHead>Created</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {hostels.map((hostel) => (
                <TableRow key={hostel.id}>
                  <TableCell className="font-medium">{hostel.name}</TableCell>
                  <TableCell>{hostel.description}</TableCell>
                  <TableCell>{hostel.total_rooms}</TableCell>
                  <TableCell>{new Date(hostel.created_at).toLocaleDateString()}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Rooms List */}
      <Card>
        <CardHeader>
          <CardTitle>Rooms</CardTitle>
          <CardDescription>Manage all rooms across hostels</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Room Number</TableHead>
                <TableHead>Hostel</TableHead>
                <TableHead>Capacity</TableHead>
                <TableHead>Occupied</TableHead>
                <TableHead>Price</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Amenities</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rooms.map((room) => {
                const hostel = hostels.find(h => h.id === room.hostel_id);
                return (
                  <TableRow key={room.id}>
                    <TableCell className="font-medium">{room.room_number}</TableCell>
                    <TableCell>{hostel?.name || "Unknown"}</TableCell>
                    <TableCell>{room.capacity}</TableCell>
                    <TableCell>{room.occupied}</TableCell>
                    <TableCell>{room.price ? `$${room.price}` : "N/A"}</TableCell>
                    <TableCell>
                      <Badge variant={room.status === "available" ? "default" : "secondary"}>
                        {room.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {room.amenities?.join(", ") || "None"}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Room Booking Requests */}
      <Card>
        <CardHeader>
          <CardTitle>Room Booking Requests</CardTitle>
          <CardDescription>Manage student room booking requests</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Student</TableHead>
                <TableHead>Room</TableHead>
                <TableHead>Hostel</TableHead>
                <TableHead>Booking Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {bookings.map((booking) => (
                <TableRow key={booking.id}>
                  <TableCell>
                    {booking.profiles?.full_name || booking.profiles?.email || "Unknown"}
                  </TableCell>
                  <TableCell>{booking.rooms?.room_number || "Unknown"}</TableCell>
                  <TableCell>{booking.rooms?.hostels?.name || "Unknown"}</TableCell>
                  <TableCell>
                    {new Date(booking.booking_date).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    <Badge 
                      variant={
                        booking.status === "approved" ? "default" : 
                        booking.status === "rejected" ? "destructive" : 
                        "secondary"
                      }
                    >
                      {booking.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {booking.status === "pending" && (
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={() => handleBookingResponse(booking.id, "approved", "Booking approved")}
                        >
                          Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleBookingResponse(booking.id, "rejected", "Booking rejected")}
                        >
                          Reject
                        </Button>
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}