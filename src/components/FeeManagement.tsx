import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface Student {
  id: string;
  full_name: string;
  email: string;
}

interface FeeAccount {
  id: string;
  student_id: string;
  total_fees: number;
  amount_paid: number;
  balance: number;
  academic_year: string;
  semester: string;
  profiles?: Student;
}

interface Payment {
  id: string;
  student_id: string;
  amount: number;
  status: string;
  submitted_at: string;
  payment_slip_url?: string;
  transaction_message?: string;
  profiles?: Student;
}

export const FeeManagement = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [feeAccounts, setFeeAccounts] = useState<FeeAccount[]>([]);
  const [pendingPayments, setPendingPayments] = useState<Payment[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);
  const [adminNotes, setAdminNotes] = useState("");
  const [showAccountDialog, setShowAccountDialog] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState("");
  const [totalFees, setTotalFees] = useState("");
  const [academicYear, setAcademicYear] = useState("");
  const [semester, setSemester] = useState("");

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch all students
      const { data: studentsData } = await supabase
        .from("profiles")
        .select("id, full_name, email")
        .eq("role", "student");

      setStudents(studentsData || []);

      // Fetch fee accounts
      const { data: accountsData } = await supabase
        .from("fee_accounts")
        .select("*");

      // Fetch student profiles separately and join
      if (accountsData) {
        const studentIds = accountsData.map((a) => a.student_id);
        const { data: studentProfiles } = await supabase
          .from("profiles")
          .select("id, full_name, email")
          .in("id", studentIds);

        const accountsWithProfiles = accountsData.map((account) => ({
          ...account,
          profiles: studentProfiles?.find((p) => p.id === account.student_id),
        }));

        setFeeAccounts(accountsWithProfiles as any);
      }

      // Fetch pending payments
      const { data: paymentsData } = await supabase
        .from("fee_payments")
        .select("*")
        .eq("status", "pending")
        .order("submitted_at", { ascending: false });

      // Fetch student profiles for payments
      if (paymentsData) {
        const studentIds = paymentsData.map((p) => p.student_id);
        const { data: studentProfiles } = await supabase
          .from("profiles")
          .select("id, full_name, email")
          .in("id", studentIds);

        const paymentsWithProfiles = paymentsData.map((payment) => ({
          ...payment,
          profiles: studentProfiles?.find((p) => p.id === payment.student_id),
        }));

        setPendingPayments(paymentsWithProfiles as any);
      }
    } catch (error: any) {
      console.error("Error fetching data:", error);
      toast({
        title: "Error",
        description: "Failed to load data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleReviewPayment = async (paymentId: string, approved: boolean) => {
    if (!user) return;

    try {
      const payment = pendingPayments.find((p) => p.id === paymentId);
      if (!payment) return;

      // Update payment status
      const { error: paymentError } = await supabase
        .from("fee_payments")
        .update({
          status: approved ? "approved" : "rejected",
          reviewed_at: new Date().toISOString(),
          reviewed_by: user.id,
          admin_notes: adminNotes,
        })
        .eq("id", paymentId);

      if (paymentError) throw paymentError;

      // If approved, update fee account
      if (approved) {
        const { data: accountData } = await supabase
          .from("fee_accounts")
          .select("*")
          .eq("student_id", payment.student_id)
          .single();

        if (accountData) {
          const { error: accountError } = await supabase
            .from("fee_accounts")
            .update({
              amount_paid: accountData.amount_paid + payment.amount,
              updated_by: user.id,
            })
            .eq("id", accountData.id);

          if (accountError) throw accountError;
        }
      }

      toast({
        title: approved ? "Payment Approved" : "Payment Rejected",
        description: `Payment has been ${approved ? "approved" : "rejected"}`,
      });

      setSelectedPayment(null);
      setAdminNotes("");
      fetchData();
    } catch (error: any) {
      console.error("Error reviewing payment:", error);
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleCreateFeeAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    try {
      const { error } = await supabase.from("fee_accounts").insert({
        student_id: selectedStudent,
        total_fees: parseFloat(totalFees),
        academic_year: academicYear,
        semester: semester,
        updated_by: user.id,
      });

      if (error) throw error;

      toast({
        title: "Fee Account Created",
        description: "Student fee account has been created",
      });

      setShowAccountDialog(false);
      setSelectedStudent("");
      setTotalFees("");
      setAcademicYear("");
      setSemester("");
      fetchData();
    } catch (error: any) {
      console.error("Error creating fee account:", error);
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleUpdateFeeAccount = async (accountId: string, field: string, value: number) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from("fee_accounts")
        .update({ [field]: value, updated_by: user.id })
        .eq("id", accountId);

      if (error) throw error;

      toast({
        title: "Account Updated",
        description: "Fee account has been updated",
      });

      fetchData();
    } catch (error: any) {
      console.error("Error updating account:", error);
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <Tabs defaultValue="pending">
        <TabsList>
          <TabsTrigger value="pending">Pending Payments ({pendingPayments.length})</TabsTrigger>
          <TabsTrigger value="accounts">Fee Accounts</TabsTrigger>
        </TabsList>

        <TabsContent value="pending">
          <Card>
            <CardHeader>
              <CardTitle>Pending Payment Approvals</CardTitle>
            </CardHeader>
            <CardContent>
              {pendingPayments.length === 0 ? (
                <p className="text-muted-foreground">No pending payments</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Student</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Transaction</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pendingPayments.map((payment) => (
                      <TableRow key={payment.id}>
                        <TableCell>{payment.profiles?.full_name || "N/A"}</TableCell>
                        <TableCell>${payment.amount}</TableCell>
                        <TableCell>
                          {new Date(payment.submitted_at).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="max-w-xs truncate">
                          {payment.transaction_message || "-"}
                        </TableCell>
                        <TableCell>
                          <Button
                            size="sm"
                            onClick={() => setSelectedPayment(payment)}
                          >
                            Review
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="accounts">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Student Fee Accounts</CardTitle>
              <Button onClick={() => setShowAccountDialog(true)}>
                Create Fee Account
              </Button>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Student</TableHead>
                    <TableHead>Total Fees</TableHead>
                    <TableHead>Amount Paid</TableHead>
                    <TableHead>Balance</TableHead>
                    <TableHead>Year/Semester</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {feeAccounts.map((account) => (
                    <TableRow key={account.id}>
                      <TableCell>{account.profiles?.full_name || "N/A"}</TableCell>
                      <TableCell>${account.total_fees}</TableCell>
                      <TableCell className="text-green-600">${account.amount_paid}</TableCell>
                      <TableCell className="text-red-600">${account.balance}</TableCell>
                      <TableCell>
                        {account.academic_year} - {account.semester}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Payment Review Dialog */}
      <Dialog open={!!selectedPayment} onOpenChange={() => setSelectedPayment(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Review Payment</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Student</Label>
              <p>{selectedPayment?.profiles?.full_name}</p>
            </div>
            <div>
              <Label>Amount</Label>
              <p className="text-2xl font-bold">${selectedPayment?.amount}</p>
            </div>
            <div>
              <Label>Transaction Message</Label>
              <p className="text-sm">{selectedPayment?.transaction_message || "None provided"}</p>
            </div>
            {selectedPayment?.payment_slip_url && (
              <div>
                <Label>Payment Slip</Label>
                <a
                  href={selectedPayment.payment_slip_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline block"
                >
                  View Payment Slip
                </a>
              </div>
            )}
            <div>
              <Label>Admin Notes</Label>
              <Textarea
                value={adminNotes}
                onChange={(e) => setAdminNotes(e.target.value)}
                placeholder="Add notes about this payment"
                rows={3}
              />
            </div>
            <div className="flex gap-2">
              <Button
                onClick={() => selectedPayment && handleReviewPayment(selectedPayment.id, true)}
                className="flex-1"
              >
                Approve Payment
              </Button>
              <Button
                onClick={() => selectedPayment && handleReviewPayment(selectedPayment.id, false)}
                variant="destructive"
                className="flex-1"
              >
                Reject Payment
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Create Fee Account Dialog */}
      <Dialog open={showAccountDialog} onOpenChange={setShowAccountDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Fee Account</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateFeeAccount} className="space-y-4">
            <div>
              <Label>Student</Label>
              <Select value={selectedStudent} onValueChange={setSelectedStudent}>
                <SelectTrigger>
                  <SelectValue placeholder="Select student" />
                </SelectTrigger>
                <SelectContent>
                  {students.map((student) => (
                    <SelectItem key={student.id} value={student.id}>
                      {student.full_name} ({student.email})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Total Fees</Label>
              <Input
                type="number"
                step="0.01"
                value={totalFees}
                onChange={(e) => setTotalFees(e.target.value)}
                required
              />
            </div>
            <div>
              <Label>Academic Year</Label>
              <Input
                value={academicYear}
                onChange={(e) => setAcademicYear(e.target.value)}
                placeholder="e.g., 2024-2025"
                required
              />
            </div>
            <div>
              <Label>Semester</Label>
              <Select value={semester} onValueChange={setSemester}>
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
              Create Account
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};
