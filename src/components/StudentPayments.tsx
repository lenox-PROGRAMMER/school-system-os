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

interface FeeAccount {
  id: string;
  total_fees: number;
  amount_paid: number;
  balance: number;
  academic_year: string;
  semester: string;
}

interface Payment {
  id: string;
  amount: number;
  status: string;
  submitted_at: string;
  reviewed_at?: string;
  admin_notes?: string;
  payment_slip_url?: string;
  transaction_message?: string;
}

export const StudentPayments = () => {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const [feeAccount, setFeeAccount] = useState<FeeAccount | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [amount, setAmount] = useState("");
  const [transactionMessage, setTransactionMessage] = useState("");
  const [paymentSlip, setPaymentSlip] = useState<File | null>(null);

  useEffect(() => {
    fetchData();
  }, [user]);

  const fetchData = async () => {
    if (!user || !profile) return;
    
    setLoading(true);
    try {
      // Fetch fee account
      const { data: accountData } = await supabase
        .from("fee_accounts")
        .select("*")
        .eq("student_id", profile.id)
        .single();

      setFeeAccount(accountData);

      // Fetch payment history
      const { data: paymentsData } = await supabase
        .from("fee_payments")
        .select("*")
        .eq("student_id", profile.id)
        .order("submitted_at", { ascending: false });

      setPayments(paymentsData || []);
    } catch (error: any) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !profile || !feeAccount) return;

    if (!amount || parseFloat(amount) <= 0) {
      toast({
        title: "Invalid Amount",
        description: "Please enter a valid payment amount",
        variant: "destructive",
      });
      return;
    }

    setSubmitting(true);
    try {
      let paymentSlipUrl = null;

      // Upload payment slip if provided
      if (paymentSlip) {
        const fileExt = paymentSlip.name.split(".").pop();
        const fileName = `${user.id}/${Date.now()}.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage
          .from("payment-slips")
          .upload(fileName, paymentSlip);

        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage
          .from("payment-slips")
          .getPublicUrl(fileName);

        paymentSlipUrl = urlData.publicUrl;
      }

      // Submit payment record
      const { error } = await supabase.from("fee_payments").insert({
        student_id: profile.id,
        amount: parseFloat(amount),
        payment_slip_url: paymentSlipUrl,
        transaction_message: transactionMessage,
        academic_year: feeAccount.academic_year,
        semester: feeAccount.semester,
      });

      if (error) throw error;

      toast({
        title: "Payment Submitted",
        description: "Your payment has been submitted for review",
      });

      // Reset form
      setAmount("");
      setTransactionMessage("");
      setPaymentSlip(null);
      fetchData();
    } catch (error: any) {
      console.error("Error submitting payment:", error);
      toast({
        title: "Submission Failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!feeAccount) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-muted-foreground">
            No fee account found. Please contact the administration.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Fee Balance Card */}
      <Card>
        <CardHeader>
          <CardTitle>Fee Balance</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Total Fees</p>
              <p className="text-2xl font-bold">${feeAccount.total_fees}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Amount Paid</p>
              <p className="text-2xl font-bold text-green-600">${feeAccount.amount_paid}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Balance Due</p>
              <p className="text-2xl font-bold text-red-600">${feeAccount.balance}</p>
            </div>
          </div>
          <div className="mt-4 text-sm text-muted-foreground">
            {feeAccount.academic_year} - {feeAccount.semester}
          </div>
        </CardContent>
      </Card>

      {/* Payment Submission Form */}
      <Card>
        <CardHeader>
          <CardTitle>Submit Payment</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmitPayment} className="space-y-4">
            <div>
              <Label htmlFor="amount">Amount *</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="Enter payment amount"
                required
              />
            </div>

            <div>
              <Label htmlFor="transactionMessage">Transaction Message</Label>
              <Textarea
                id="transactionMessage"
                value={transactionMessage}
                onChange={(e) => setTransactionMessage(e.target.value)}
                placeholder="Enter transaction details or reference number"
                rows={3}
              />
            </div>

            <div>
              <Label htmlFor="paymentSlip">Payment Slip / Bank Receipt</Label>
              <Input
                id="paymentSlip"
                type="file"
                accept="image/*,.pdf"
                onChange={(e) => setPaymentSlip(e.target.files?.[0] || null)}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Upload a screenshot or PDF of your payment receipt
              </p>
            </div>

            <Button type="submit" disabled={submitting}>
              {submitting ? "Submitting..." : "Submit Payment"}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Payment History */}
      <Card>
        <CardHeader>
          <CardTitle>Payment History</CardTitle>
        </CardHeader>
        <CardContent>
          {payments.length === 0 ? (
            <p className="text-muted-foreground">No payments submitted yet</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Admin Notes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payments.map((payment) => (
                  <TableRow key={payment.id}>
                    <TableCell>
                      {new Date(payment.submitted_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell>${payment.amount}</TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          payment.status === "approved"
                            ? "default"
                            : payment.status === "rejected"
                            ? "destructive"
                            : "secondary"
                        }
                      >
                        {payment.status}
                      </Badge>
                    </TableCell>
                    <TableCell>{payment.admin_notes || "-"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
