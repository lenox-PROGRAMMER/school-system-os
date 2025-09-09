import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useForm } from "react-hook-form";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { Textarea } from "@/components/ui/textarea";
import { Edit, Trash2, MoreVertical } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

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
  const [editingHostel, setEditingHostel] = useState<Hostel | null>(null);
  const [editingRoom, setEditingRoom] = useState<Room | null>(null);
  const [openEditHostelDialog, setOpenEditHostelDialog] = useState(false);
  const [openEditRoomDialog, setOpenEditRoomDialog] = useState(false);

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

  const editHostelForm = useForm<HostelFormData>({
    defaultValues: {
      name: "",
      description: "",
      total_rooms: 0,
    },
  });

  const editRoomForm = useForm<RoomFormData>({
    defaultValues: {
      hostel_id: "",
      room_number: "",
      capacity: 1,
      price: 0,
      amenities: "",
      status: "available",
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

  const handleEditHostel = (hostel: Hostel) => {
    setEditingHostel(hostel);
    editHostelForm.reset({
      name: hostel.name,
      description: hostel.description,
      total_rooms: hostel.total_rooms,
    });
    setOpenEditHostelDialog(true);
  };

  const handleEditRoom = (room: Room) => {
    setEditingRoom(room);
    editRoomForm.reset({
      hostel_id: room.hostel_id,
      room_number: room.room_number,
      capacity: room.capacity,
      price: room.price || 0,
      amenities: room.amenities?.join(", ") || "",
      status: room.status,
    });
    setOpenEditRoomDialog(true);
  };

  const onUpdateHostel = async (data: HostelFormData) => {
    if (!editingHostel) return;

    try {
      const { error } = await supabase
        .from("hostels")
        .update(data)
        .eq("id", editingHostel.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Hostel updated successfully",
      });

      setOpenEditHostelDialog(false);
      setEditingHostel(null);
      editHostelForm.reset();
      fetchHostels();
    } catch (error) {
      console.error("Error updating hostel:", error);
      toast({
        title: "Error",
        description: "Failed to update hostel",
        variant: "destructive",
      });
    }
  };

  const onUpdateRoom = async (data: RoomFormData) => {
    if (!editingRoom) return;

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
        .update(roomData)
        .eq("id", editingRoom.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Room updated successfully",
      });

      setOpenEditRoomDialog(false);
      setEditingRoom(null);
      editRoomForm.reset();
      fetchRooms();
    } catch (error) {
      console.error("Error updating room:", error);
      toast({
        title: "Error",
        description: "Failed to update room",
        variant: "destructive",
      });
    }
  };

  const handleDeleteHostel = async (hostelId: string) => {
    try {
      // Check if hostel has rooms
      const { data: rooms } = await supabase
        .from("rooms")
        .select("id")
        .eq("hostel_id", hostelId);

      if (rooms && rooms.length > 0) {
        toast({
          title: "Error",
          description: "Cannot delete hostel with existing rooms. Delete all rooms first.",
          variant: "destructive",
        });
        return;
      }

      const { error } = await supabase
        .from("hostels")
        .delete()
        .eq("id", hostelId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Hostel deleted successfully",
      });

      fetchHostels();
    } catch (error) {
      console.error("Error deleting hostel:", error);
      toast({
        title: "Error",
        description: "Failed to delete hostel",
        variant: "destructive",
      });
    }
  };

  const handleDeleteRoom = async (roomId: string) => {
    try {
      // Check if room is occupied
      const room = rooms.find(r => r.id === roomId);
      if (room && room.occupied > 0) {
        toast({
          title: "Error",
          description: "Cannot delete room with occupants. Remove all occupants first.",
          variant: "destructive",
        });
        return;
      }

      const { error } = await supabase
        .from("rooms")
        .delete()
        .eq("id", roomId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Room deleted successfully",
      });

      fetchRooms();
    } catch (error) {
      console.error("Error deleting room:", error);
      toast({
        title: "Error",
        description: "Failed to delete room",
        variant: "destructive",
      });
    }
  };

  const handleUpdateRoomStatus = async (roomId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from("rooms")
        .update({ status: newStatus })
        .eq("id", roomId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Room status updated successfully",
      });

      fetchRooms();
    } catch (error) {
      console.error("Error updating room status:", error);
      toast({
        title: "Error",
        description: "Failed to update room status",
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
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {hostels.map((hostel) => (
                <TableRow key={hostel.id}>
                  <TableCell className="font-medium">{hostel.name}</TableCell>
                  <TableCell>{hostel.description}</TableCell>
                  <TableCell>{hostel.total_rooms}</TableCell>
                  <TableCell>{new Date(hostel.created_at).toLocaleDateString()}</TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleEditHostel(hostel)}>
                          <Edit className="mr-2 h-4 w-4" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          onClick={() => handleDeleteHostel(hostel.id)}
                          className="text-destructive"
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
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
                <TableHead>Actions</TableHead>
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
                      <Select value={room.status} onValueChange={(value) => handleUpdateRoomStatus(room.id, value)}>
                        <SelectTrigger className="w-32">
                          <SelectValue>
                            <Badge variant={room.status === "available" ? "default" : "secondary"}>
                              {room.status}
                            </Badge>
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="available">Available</SelectItem>
                          <SelectItem value="occupied">Occupied</SelectItem>
                          <SelectItem value="maintenance">Maintenance</SelectItem>
                          <SelectItem value="reserved">Reserved</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      {room.amenities?.join(", ") || "None"}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleEditRoom(room)}>
                            <Edit className="mr-2 h-4 w-4" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={() => handleDeleteRoom(room.id)}
                            className="text-destructive"
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
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