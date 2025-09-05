import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Building, Users, Bed, Plus, Pencil, Trash2, CheckCircle, XCircle } from "lucide-react";

interface Hostel {
  id: string;
  name: string;
  description: string | null;
  total_rooms: number;
  created_at: string;
}

interface Room {
  id: string;
  hostel_id: string;
  room_number: string;
  capacity: number;
  occupied: number;
  price: number | null;
  amenities: string[] | null;
  status: 'available' | 'occupied' | 'maintenance';
  created_at: string;
}

interface RoomBooking {
  id: string;
  student_id: string;
  room_id: string;
  booking_date: string;
  status: 'pending' | 'approved' | 'rejected' | 'cancelled';
  admin_response: string | null;
  academic_year: string | null;
  semester: string | null;
  profiles: {
    full_name: string | null;
    email: string;
  };
  rooms: {
    room_number: string;
    hostels: {
      name: string;
    };
  };
}

export function HostelManagement() {
  const [hostels, setHostels] = useState<Hostel[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [bookings, setBookings] = useState<RoomBooking[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [hostelAssignments, setHostelAssignments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [newHostel, setNewHostel] = useState({ name: '', description: '', total_rooms: 0 });
  const [newRoom, setNewRoom] = useState({
    hostel_id: '',
    room_number: '',
    capacity: 1,
    price: 0,
    amenities: '',
    status: 'available' as const
  });
  const [newAssignment, setNewAssignment] = useState({
    student_id: '',
    hostel_id: '',
    room_id: '',
    notes: ''
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      // Fetch hostels first
      const hostelsResult = await supabase
        .from('hostels')
        .select('*')
        .order('created_at', { ascending: false });

      if (hostelsResult.error) {
        console.error('Hostels error:', hostelsResult.error);
        throw hostelsResult.error;
      }

      // Fetch rooms
      const roomsResult = await supabase
        .from('rooms')
        .select('*')
        .order('created_at', { ascending: false });

      if (roomsResult.error) {
        console.error('Rooms error:', roomsResult.error);
        throw roomsResult.error;
      }

      // Fetch students
      const studentsResult = await supabase
        .from('profiles')
        .select('id, user_id, full_name, email')
        .eq('role', 'student');

      if (studentsResult.error) {
        console.error('Students error:', studentsResult.error);
        throw studentsResult.error;
      }

      // Fetch bookings with simplified join
      const bookingsResult = await supabase
        .from('room_bookings')
        .select(`
          id,
          student_id,
          room_id,
          booking_date,
          status,
          admin_response,
          academic_year,
          semester
        `)
        .order('booking_date', { ascending: false });

      // Fetch assignments with simplified join
      const assignmentsResult = await supabase
        .from('student_hostel_assignments')
        .select(`
          id,
          student_id,
          hostel_id,
          room_id,
          assigned_by,
          assigned_at,
          notes,
          status
        `)
        .order('assigned_at', { ascending: false });

      setHostels(hostelsResult.data || []);
      setRooms(roomsResult.data as Room[] || []);
      setStudents(studentsResult.data || []);
      
      // Process bookings with student names
      const bookingsWithNames = (bookingsResult.data || []).map((booking: any) => {
        const student = studentsResult.data?.find(s => s.user_id === booking.student_id);
        const room = roomsResult.data?.find(r => r.id === booking.room_id);
        const hostel = hostelsResult.data?.find(h => h.id === room?.hostel_id);
        
        return {
          ...booking,
          profiles: {
            full_name: student?.full_name || null,
            email: student?.email || 'Unknown'
          },
          rooms: {
            room_number: room?.room_number || 'Unknown',
            hostels: {
              name: hostel?.name || 'Unknown'
            }
          }
        };
      });
      
      setBookings(bookingsWithNames as RoomBooking[]);
      
        // Process assignments with names from students data
        const assignmentsWithNames = (assignmentsResult.data || []).map((assignment: any) => {
          const student = studentsResult.data?.find(s => s.id === assignment.student_id);
          const hostel = hostelsResult.data?.find(h => h.id === assignment.hostel_id);
          const room = roomsResult.data?.find(r => r.id === assignment.room_id);
          
          return {
            ...assignment,
            student_name: student?.full_name || student?.email || 'Unknown Student',
            student_email: student?.email || 'Unknown',
            hostel_name: hostel?.name || 'Unknown',
            room_number: room?.room_number || 'N/A'
          };
        });
      
      setHostelAssignments(assignmentsWithNames);
    } catch (error: any) {
      console.error('Error fetching data:', error);
      toast({
        title: "Error",
        description: `Failed to fetch hostel data: ${error?.message || 'Unknown error'}`,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateHostel = async () => {
    try {
      const { error } = await supabase
        .from('hostels')
        .insert([newHostel]);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Hostel created successfully",
      });

      setNewHostel({ name: '', description: '', total_rooms: 0 });
      fetchData();
    } catch (error) {
      console.error('Error creating hostel:', error);
      toast({
        title: "Error",
        description: "Failed to create hostel",
        variant: "destructive",
      });
    }
  };

  const handleCreateRoom = async () => {
    try {
      const amenitiesArray = newRoom.amenities ? newRoom.amenities.split(',').map(a => a.trim()) : [];
      
      const { error } = await supabase
        .from('rooms')
        .insert([{
          ...newRoom,
          amenities: amenitiesArray,
          price: newRoom.price || null
        }]);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Room created successfully",
      });

      setNewRoom({
        hostel_id: '',
        room_number: '',
        capacity: 1,
        price: 0,
        amenities: '',
        status: 'available'
      });
      fetchData();
    } catch (error) {
      console.error('Error creating room:', error);
      toast({
        title: "Error",
        description: "Failed to create room",
        variant: "destructive",
      });
    }
  };

  const handleBookingResponse = async (bookingId: string, status: 'approved' | 'rejected', response: string) => {
    try {
      const { error } = await supabase
        .from('room_bookings')
        .update({
          status,
          admin_response: response,
          responded_at: new Date().toISOString()
        })
        .eq('id', bookingId);

      if (error) throw error;

      toast({
        title: "Success",
        description: `Booking ${status} successfully`,
      });

      fetchData();
    } catch (error) {
      console.error('Error updating booking:', error);
      toast({
        title: "Error",
        description: "Failed to update booking",
        variant: "destructive",
      });
    }
  };

  const handleAssignStudent = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { data: adminProfile } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (!adminProfile) throw new Error('Admin profile not found');

      const { error } = await supabase
        .from('student_hostel_assignments')
        .insert([{
          student_id: newAssignment.student_id, // This should be profile.id, not user_id
          hostel_id: newAssignment.hostel_id,
          room_id: newAssignment.room_id || null,
          assigned_by: adminProfile.id,
          notes: newAssignment.notes
        }]);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Student assigned to hostel successfully",
      });

      setNewAssignment({
        student_id: '',
        hostel_id: '',
        room_id: '',
        notes: ''
      });
      fetchData();
    } catch (error) {
      console.error('Error assigning student:', error);
      toast({
        title: "Error",
        description: "Failed to assign student to hostel",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return <div className="text-center py-8">Loading hostel data...</div>;
  }

  return (
    <div className="space-y-6">
      <Tabs defaultValue="hostels" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="hostels">Hostels</TabsTrigger>
          <TabsTrigger value="rooms">Rooms</TabsTrigger>
          <TabsTrigger value="assignments">Assignments</TabsTrigger>
          <TabsTrigger value="bookings">Bookings</TabsTrigger>
        </TabsList>

        <TabsContent value="hostels">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Building className="h-5 w-5" />
                    Hostels Management
                  </CardTitle>
                  <CardDescription>Manage hostels and their information</CardDescription>
                </div>
                <Dialog>
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="h-4 w-4 mr-2" />
                      Add Hostel
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Create New Hostel</DialogTitle>
                      <DialogDescription>Add a new hostel to the system</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="name">Hostel Name</Label>
                        <Input
                          id="name"
                          value={newHostel.name}
                          onChange={(e) => setNewHostel({...newHostel, name: e.target.value})}
                        />
                      </div>
                      <div>
                        <Label htmlFor="description">Description</Label>
                        <Textarea
                          id="description"
                          value={newHostel.description}
                          onChange={(e) => setNewHostel({...newHostel, description: e.target.value})}
                        />
                      </div>
                      <div>
                        <Label htmlFor="total_rooms">Total Rooms</Label>
                        <Input
                          id="total_rooms"
                          type="number"
                          value={newHostel.total_rooms}
                          onChange={(e) => setNewHostel({...newHostel, total_rooms: parseInt(e.target.value) || 0})}
                        />
                      </div>
                      <Button onClick={handleCreateHostel} className="w-full">
                        Create Hostel
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4">
                {hostels.map((hostel) => (
                  <div key={hostel.id} className="border rounded-lg p-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-semibold">{hostel.name}</h3>
                        <p className="text-sm text-muted-foreground">{hostel.description}</p>
                        <p className="text-sm">Total Rooms: {hostel.total_rooms}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="rooms">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Bed className="h-5 w-5" />
                    Rooms Management
                  </CardTitle>
                  <CardDescription>Manage individual rooms in hostels</CardDescription>
                </div>
                <Dialog>
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="h-4 w-4 mr-2" />
                      Add Room
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Create New Room</DialogTitle>
                      <DialogDescription>Add a new room to a hostel</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="hostel">Select Hostel</Label>
                        <Select value={newRoom.hostel_id} onValueChange={(value) => setNewRoom({...newRoom, hostel_id: value})}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select hostel" />
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
                      <div>
                        <Label htmlFor="room_number">Room Number</Label>
                        <Input
                          id="room_number"
                          value={newRoom.room_number}
                          onChange={(e) => setNewRoom({...newRoom, room_number: e.target.value})}
                        />
                      </div>
                      <div>
                        <Label htmlFor="capacity">Capacity</Label>
                        <Input
                          id="capacity"
                          type="number"
                          value={newRoom.capacity}
                          onChange={(e) => setNewRoom({...newRoom, capacity: parseInt(e.target.value) || 1})}
                        />
                      </div>
                      <div>
                        <Label htmlFor="price">Price (per semester)</Label>
                        <Input
                          id="price"
                          type="number"
                          value={newRoom.price}
                          onChange={(e) => setNewRoom({...newRoom, price: parseFloat(e.target.value) || 0})}
                        />
                      </div>
                      <div>
                        <Label htmlFor="amenities">Amenities (comma-separated)</Label>
                        <Input
                          id="amenities"
                          value={newRoom.amenities}
                          onChange={(e) => setNewRoom({...newRoom, amenities: e.target.value})}
                          placeholder="WiFi, AC, Attached Bathroom"
                        />
                      </div>
                      <Button onClick={handleCreateRoom} className="w-full">
                        Create Room
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4">
                {rooms.map((room) => (
                  <div key={room.id} className="border rounded-lg p-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-semibold">Room {room.room_number}</h3>
                        <p className="text-sm text-muted-foreground">
                          Capacity: {room.capacity} | Occupied: {room.occupied}
                        </p>
                        {room.price && <p className="text-sm">Price: ${room.price}/semester</p>}
                        {room.amenities && (
                          <p className="text-sm">Amenities: {room.amenities.join(', ')}</p>
                        )}
                      </div>
                      <Badge variant={room.status === 'available' ? 'default' : room.status === 'occupied' ? 'secondary' : 'destructive'}>
                        {room.status}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="assignments">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    Student Hostel Assignments
                  </CardTitle>
                  <CardDescription>Assign students to hostels and rooms</CardDescription>
                </div>
                <Dialog>
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="h-4 w-4 mr-2" />
                      Assign Student
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Assign Student to Hostel</DialogTitle>
                      <DialogDescription>Select a student and assign them to a hostel</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="student">Select Student</Label>
                        <Select value={newAssignment.student_id} onValueChange={(value) => setNewAssignment({...newAssignment, student_id: value})}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select student" />
                          </SelectTrigger>
                          <SelectContent>
                            {students.map((student) => (
                              <SelectItem key={student.id} value={student.id}>
                                {student.full_name || student.email}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div>
                        <Label htmlFor="hostel">Select Hostel</Label>
                        <Select value={newAssignment.hostel_id} onValueChange={(value) => setNewAssignment({...newAssignment, hostel_id: value})}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select hostel" />
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
                      
                      <div>
                        <Label htmlFor="room">Select Room (Optional)</Label>
                        <Select value={newAssignment.room_id} onValueChange={(value) => setNewAssignment({...newAssignment, room_id: value})}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select room (optional)" />
                          </SelectTrigger>
                          <SelectContent>
                            {rooms.filter(room => room.hostel_id === newAssignment.hostel_id).map((room) => (
                              <SelectItem key={room.id} value={room.id}>
                                Room {room.room_number}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div>
                        <Label htmlFor="notes">Notes</Label>
                        <Textarea
                          id="notes"
                          value={newAssignment.notes}
                          onChange={(e) => setNewAssignment({...newAssignment, notes: e.target.value})}
                          placeholder="Any additional notes..."
                        />
                      </div>
                      
                      <Button onClick={handleAssignStudent} className="w-full">
                        Assign Student
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {hostelAssignments.map((assignment) => (
                  <div key={assignment.id} className="border rounded-lg p-4">
                    <div className="flex justify-between items-start">
                      <div className="space-y-2">
                         <div>
                           <h3 className="font-semibold">
                             {assignment.student_name}
                           </h3>
                           <p className="text-sm text-muted-foreground">
                             {assignment.student_email}
                           </p>
                         </div>
                         <div>
                           <p className="text-sm">
                             Hostel: {assignment.hostel_name}
                           </p>
                           {assignment.room_number !== 'N/A' && (
                             <p className="text-sm text-muted-foreground">
                               Room: {assignment.room_number}
                             </p>
                           )}
                          <p className="text-sm text-muted-foreground">
                            Assigned: {new Date(assignment.assigned_at).toLocaleDateString()}
                          </p>
                          {assignment.notes && (
                            <p className="text-sm mt-2">
                              <strong>Notes:</strong> {assignment.notes}
                            </p>
                          )}
                        </div>
                      </div>
                      <Badge variant={assignment.status === 'assigned' ? 'default' : 'secondary'}>
                        {assignment.status}
                      </Badge>
                    </div>
                  </div>
                ))}
                
                {hostelAssignments.length === 0 && (
                  <p className="text-center text-muted-foreground py-8">
                    No hostel assignments found
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="bookings">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Room Booking Requests
              </CardTitle>
              <CardDescription>Manage student room booking requests</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {bookings.map((booking) => (
                  <div key={booking.id} className="border rounded-lg p-4">
                    <div className="flex justify-between items-start">
                      <div className="space-y-2">
                        <div>
                          <h3 className="font-semibold">
                            {booking.profiles?.full_name || booking.profiles?.email}
                          </h3>
                          <p className="text-sm text-muted-foreground">
                            {booking.profiles?.email}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm">
                            Room: {booking.rooms?.room_number} in {booking.rooms?.hostels?.name}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            Booking Date: {new Date(booking.booking_date).toLocaleDateString()}
                          </p>
                          {booking.academic_year && (
                            <p className="text-sm text-muted-foreground">
                              Academic Year: {booking.academic_year} - {booking.semester}
                            </p>
                          )}
                          {booking.admin_response && (
                            <p className="text-sm mt-2">
                              <strong>Admin Response:</strong> {booking.admin_response}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge 
                          variant={
                            booking.status === 'approved' ? 'default' : 
                            booking.status === 'rejected' ? 'destructive' : 
                            'secondary'
                          }
                        >
                          {booking.status}
                        </Badge>
                        
                        {booking.status === 'pending' && (
                          <div className="flex gap-2">
                            <Dialog>
                              <DialogTrigger asChild>
                                <Button size="sm" variant="outline">
                                  <CheckCircle className="h-4 w-4 mr-1" />
                                  Approve
                                </Button>
                              </DialogTrigger>
                              <DialogContent>
                                <DialogHeader>
                                  <DialogTitle>Approve Booking</DialogTitle>
                                  <DialogDescription>
                                    Provide a response message for the student
                                  </DialogDescription>
                                </DialogHeader>
                                <div className="space-y-4">
                                  <Textarea
                                    placeholder="Your approval message..."
                                    id={`approve-${booking.id}`}
                                  />
                                  <Button 
                                    onClick={() => {
                                      const textarea = document.getElementById(`approve-${booking.id}`) as HTMLTextAreaElement;
                                      handleBookingResponse(booking.id, 'approved', textarea.value);
                                    }}
                                    className="w-full"
                                  >
                                    Approve Booking
                                  </Button>
                                </div>
                              </DialogContent>
                            </Dialog>
                            
                            <Dialog>
                              <DialogTrigger asChild>
                                <Button size="sm" variant="destructive">
                                  <XCircle className="h-4 w-4 mr-1" />
                                  Reject
                                </Button>
                              </DialogTrigger>
                              <DialogContent>
                                <DialogHeader>
                                  <DialogTitle>Reject Booking</DialogTitle>
                                  <DialogDescription>
                                    Provide a reason for rejection
                                  </DialogDescription>
                                </DialogHeader>
                                <div className="space-y-4">
                                  <Textarea
                                    placeholder="Reason for rejection..."
                                    id={`reject-${booking.id}`}
                                  />
                                  <Button 
                                    onClick={() => {
                                      const textarea = document.getElementById(`reject-${booking.id}`) as HTMLTextAreaElement;
                                      handleBookingResponse(booking.id, 'rejected', textarea.value);
                                    }}
                                    variant="destructive"
                                    className="w-full"
                                  >
                                    Reject Booking
                                  </Button>
                                </div>
                              </DialogContent>
                            </Dialog>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
                
                {bookings.length === 0 && (
                  <p className="text-center text-muted-foreground py-8">
                    No booking requests found
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}