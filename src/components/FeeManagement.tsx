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
  const [paybillNumber, setPaybillNumber] = useState("");
  const [paybillAccountNumber, setPaybillAccountNumber] = useState("");
  const [showPaybillDialog, setShowPaybillDialog] = useState(false);

  useEffect(() => {
    fetchData();
    fetchPaybillInfo();
  }, []);

  const fetchPaybillInfo = async () => {
    try {
      const { data } = await supabase
        .from("school_data")
        .select("*")
        .single();

      if (data) {
        setPaybillNumber(data.paybill_number || "");
        setPaybillAccountNumber(data.paybill_account_number || "");
      }
    } catch (error) {
      console.error("Error fetching paybill info:", error);
    }
  };

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

  const handleUpdatePaybill = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    try {
      const { data: existingData } = await supabase
        .from("school_data")
        .select("id")
        .single();

      if (existingData) {
        const { error } = await supabase
          .from("school_data")
          .update({
            paybill_number: paybillNumber,
            paybill_account_number: paybillAccountNumber,
          })
          .eq("id", existingData.id);

        if (error) throw error;
      } else {
        const { error } = await supabase.from("school_data").insert({
          paybill_number: paybillNumber,
          paybill_account_number: paybillAccountNumber,
          created_by: user.id,
        });

        if (error) throw error;
      }

      toast({
        title: "Paybill Updated",
        description: "Payment information has been updated for all students",
      });

      setShowPaybillDialog(false);
      fetchPaybillInfo();
    } catch (error: any) {
      console.error("Error updating paybill:", error);
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
      {/* Paybill Information Card */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Payment Information</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Students will see this payment information when making fee payments
            </p>
          </div>
          <Button onClick={() => setShowPaybillDialog(true)}>
            Update Paybill
          </Button>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Paybill Number</p>
              <p className="text-lg font-semibold">{paybillNumber || "Not set"}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Account Number</p>
              <p className="text-lg font-semibold">{paybillAccountNumber || "Not set"}</p>
            </div>
          </div>
        </CardContent>
      </Card>

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

      {/* Update Paybill Dialog */}
      <Dialog open={showPaybillDialog} onOpenChange={setShowPaybillDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update Payment Information</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleUpdatePaybill} className="space-y-4">
            <div>
              <Label>Paybill Number</Label>
              <Input
                value={paybillNumber}
                onChange={(e) => setPaybillNumber(e.target.value)}
                placeholder="e.g., 400200"
                required
              />
            </div>
            <div>
              <Label>Account Number (Instructions)</Label>
              <Input
                value={paybillAccountNumber}
                onChange={(e) => setPaybillAccountNumber(e.target.value)}
                placeholder="e.g., Student ID or Account Number"
                required
              />
            </div>
            <p className="text-sm text-muted-foreground">
              This information will be displayed to all registered students when they make payments.
            </p>
            <Button type="submit" className="w-full">
              Update Information
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};
