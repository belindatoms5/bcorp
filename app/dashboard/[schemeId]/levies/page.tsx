"use client";

export const dynamic = "force-dynamic";

import { useState } from "react";
import { useParams } from "next/navigation";
import { trpc } from "@/lib/trpc-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import {
  Receipt, Plus, X, AlertTriangle, CheckCircle2, Clock, CreditCard, ChevronDown, Pencil, RefreshCw,
} from "lucide-react";

type FundType = "ADMIN" | "SINKING";
type PaymentMethod = "BANK_TRANSFER" | "BPAY" | "CHEQUE" | "CASH" | "OTHER";

const statusVariant: Record<string, "success" | "warning" | "destructive" | "secondary" | "outline"> = {
  DRAFT: "secondary", ISSUED: "outline", PAID: "success", OVERDUE: "destructive", DEBT_RECOVERY: "destructive",
};
const statusLabel: Record<string, string> = {
  DRAFT: "Draft", ISSUED: "Issued", PAID: "Paid", OVERDUE: "Overdue", DEBT_RECOVERY: "Debt recovery",
};
const methodLabel: Record<PaymentMethod, string> = {
  BANK_TRANSFER: "Bank transfer", BPAY: "BPAY", CHEQUE: "Cheque", CASH: "Cash", OTHER: "Other",
};

export default function LeviesPage() {
  const params = useParams();
  const schemeId = params.schemeId as string;

  const [showBudget, setShowBudget] = useState(false);
  const [showIssue, setShowIssue] = useState(false);
  const [payingId, setPayingId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editBudgetId, setEditBudgetId] = useState<string | null>(null);
  const [editBudgetAmount, setEditBudgetAmount] = useState("");
  const [reissueForm, setReissueForm] = useState({ budgetId: "", dueDate: "" });
  const [showReissue, setShowReissue] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [budgetForm, setBudgetForm] = useState({
    financialYear: new Date().getFullYear(), fundType: "ADMIN" as FundType, totalAmount: "",
  });
  const [issueForm, setIssueForm] = useState({ budgetId: "", dueDate: "" });
  const [payForm, setPayForm] = useState({
    amount: "", paidDate: new Date().toISOString().split("T")[0],
    method: "BANK_TRANSFER" as PaymentMethod, reference: "",
  });

  const { data: notices, refetch } = trpc.levy.listForScheme.useQuery({ schemeId });
  const { data: budgets, refetch: refetchBudgets } = trpc.levy.listBudgets.useQuery({ schemeId });
  const { data: summary } = trpc.levy.summary.useQuery({ schemeId });

  const createBudget = trpc.levy.createBudget.useMutation({
    onSuccess: (budget) => {
      refetch(); refetchBudgets();
      setShowBudget(false);
      setIssueForm((f) => ({ ...f, budgetId: budget.id }));
      setShowIssue(true);
      setBudgetForm({ financialYear: new Date().getFullYear(), fundType: "ADMIN", totalAmount: "" });
    },
    onError: (e) => setError(e.message),
  });

  const updateBudget = trpc.levy.updateBudget.useMutation({
    onSuccess: () => { refetchBudgets(); setEditBudgetId(null); setEditBudgetAmount(""); },
    onError: (e) => setError(e.message),
  });

  const issueNotices = trpc.levy.issueNotices.useMutation({
    onSuccess: () => { refetch(); setShowIssue(false); setIssueForm({ budgetId: "", dueDate: "" }); },
    onError: (e) => setError(e.message),
  });

  const reissueNotices = trpc.levy.reissueNotices.useMutation({
    onSuccess: () => { refetch(); setShowReissue(false); setReissueForm({ budgetId: "", dueDate: "" }); },
    onError: (e) => setError(e.message),
  });

  const recordPayment = trpc.levy.recordPayment.useMutation({
    onSuccess: () => {
      refetch();
      setPayingId(null);
      setPayForm({ amount: "", paidDate: new Date().toISOString().split("T")[0], method: "BANK_TRANSFER", reference: "" });
    },
    onError: (e) => setError(e.message),
  });

  function handleBudget(e: React.FormEvent) {
    e.preventDefault(); setError(null);
    createBudget.mutate({ schemeId, financialYear: budgetForm.financialYear, fundType: budgetForm.fundType, totalAmount: parseFloat(budgetForm.totalAmount) });
  }

  function handleUpdateBudget(e: React.FormEvent) {
    e.preventDefault(); setError(null);
    if (!editBudgetId) return;
    updateBudget.mutate({ schemeId, budgetId: editBudgetId, totalAmount: parseFloat(editBudgetAmount) });
  }

  function handleIssue(e: React.FormEvent) {
    e.preventDefault(); setError(null);
    issueNotices.mutate({ schemeId, budgetId: issueForm.budgetId, dueDate: new Date(issueForm.dueDate) });
  }

  function handleReissue(e: React.FormEvent) {
    e.preventDefault(); setError(null);
    reissueNotices.mutate({ schemeId, budgetId: reissueForm.budgetId, dueDate: new Date(reissueForm.dueDate) });
  }

  function handlePayment(e: React.FormEvent) {
    e.preventDefault(); setError(null);
    if (!payingId) return;
    recordPayment.mutate({
      schemeId, levyNoticeId: payingId,
      amount: parseFloat(payForm.amount),
      paidDate: new Date(payForm.paidDate),
      method: payForm.method,
      reference: payForm.reference || undefined,
    });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const aud = (n: any) =>
    `$${Number(n ?? 0).toLocaleString("en-AU", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const minDueDate = new Date(Date.now() + 30 * 86400000).toISOString().split("T")[0];

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Levies</h1>
          <p className="text-sm text-gray-500 mt-0.5">Manage budgets, notices, and payments</p>
        </div>
        <Button onClick={() => { setShowBudget(true); setError(null); }}>
          <Plus className="w-4 h-4" /> New budget
        </Button>
      </div>

      {error && (
        <Alert variant="destructive" className="mb-4">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Summary cards */}
      {summary && (
        <div className="grid grid-cols-3 gap-4 mb-6">
          <Card><CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2"><Receipt className="w-4 h-4 text-blue-600" /><span className="text-xs text-gray-500 uppercase tracking-wide">Total issued</span></div>
            <p className="text-xl font-semibold text-gray-900">{aud(summary.totalAmount)}</p>
            <p className="text-xs text-gray-500 mt-0.5">{summary.totalCount} notices</p>
          </CardContent></Card>
          <Card><CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2"><CheckCircle2 className="w-4 h-4 text-green-600" /><span className="text-xs text-gray-500 uppercase tracking-wide">Collected</span></div>
            <p className="text-xl font-semibold text-gray-900">{aud(summary.paidAmount)}</p>
            <p className="text-xs text-gray-500 mt-0.5">{summary.paidCount} paid</p>
          </CardContent></Card>
          <Card><CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2"><AlertTriangle className="w-4 h-4 text-red-600" /><span className="text-xs text-gray-500 uppercase tracking-wide">Overdue</span></div>
            <p className="text-xl font-semibold text-gray-900">{aud(summary.overdueAmount)}</p>
            <p className="text-xs text-gray-500 mt-0.5">{summary.overdueCount} notices</p>
          </CardContent></Card>
        </div>
      )}

      {/* Budgets list */}
      {budgets && budgets.length > 0 && (
        <Card className="mb-6">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Budgets</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="flex flex-col divide-y divide-gray-100">
              {budgets.map((b) => (
                <div key={b.id} className="py-3">
                  {editBudgetId === b.id ? (
                    <form onSubmit={handleUpdateBudget} className="flex items-end gap-3">
                      <div className="flex flex-col gap-1 flex-1">
                        <Label className="text-xs">New total amount ($)</Label>
                        <Input
                          type="number" min="0.01" step="0.01" autoFocus
                          value={editBudgetAmount}
                          onChange={(e) => setEditBudgetAmount(e.target.value)}
                          required
                        />
                      </div>
                      <Button type="submit" size="sm" disabled={updateBudget.isPending}>
                        {updateBudget.isPending ? "Saving…" : "Save"}
                      </Button>
                      <Button type="button" size="sm" variant="outline" onClick={() => setEditBudgetId(null)}>Cancel</Button>
                    </form>
                  ) : (
                    <div className="flex items-center gap-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-gray-900">
                            {b.financialYear} — {b.fundType === "ADMIN" ? "Admin fund" : "Sinking fund"}
                          </span>
                          <Badge variant="outline">{b._count.levyNotices} notices</Badge>
                        </div>
                        <p className="text-sm text-gray-500 mt-0.5">{aud(b.totalAmount)} total</p>
                      </div>
                      <Button
                        variant="ghost" size="sm"
                        onClick={() => { setError(null); setEditBudgetId(b.id); setEditBudgetAmount(String(Number(b.totalAmount))); }}
                      >
                        <Pencil className="w-3.5 h-3.5 mr-1" /> Edit amount
                      </Button>
                      <Button
                        variant="outline" size="sm"
                        onClick={() => { setError(null); setReissueForm({ budgetId: b.id, dueDate: "" }); setShowReissue(true); }}
                      >
                        <RefreshCw className="w-3.5 h-3.5 mr-1" /> Reissue notices
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Create budget form */}
      {showBudget && (
        <Card className="mb-6 border-gray-300">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Create budget</CardTitle>
              <button onClick={() => setShowBudget(false)} className="text-gray-400 hover:text-gray-600"><X className="w-4 h-4" /></button>
            </div>
            <CardDescription>Set the annual budget for a fund. Notices will be issued to all lots proportionally by entitlement.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleBudget} className="grid grid-cols-3 gap-4">
              <div className="flex flex-col gap-1.5">
                <Label>Financial year</Label>
                <Input type="number" min="2020" max="2040" value={budgetForm.financialYear}
                  onChange={(e) => setBudgetForm({ ...budgetForm, financialYear: parseInt(e.target.value) })} required />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>Fund type</Label>
                <select className="h-9 rounded-md border border-gray-300 px-3 text-sm bg-white"
                  value={budgetForm.fundType} onChange={(e) => setBudgetForm({ ...budgetForm, fundType: e.target.value as FundType })}>
                  <option value="ADMIN">Admin fund</option>
                  <option value="SINKING">Sinking fund</option>
                </select>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>Total amount ($)</Label>
                <Input type="number" min="0.01" step="0.01" placeholder="e.g. 24000"
                  value={budgetForm.totalAmount} onChange={(e) => setBudgetForm({ ...budgetForm, totalAmount: e.target.value })} required />
              </div>
              <div className="col-span-3 flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setShowBudget(false)}>Cancel</Button>
                <Button type="submit" disabled={createBudget.isPending}>{createBudget.isPending ? "Creating…" : "Create & issue notices"}</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Issue notices form */}
      {showIssue && (
        <Card className="mb-6 border-blue-200 bg-blue-50">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base text-blue-900">Issue levy notices</CardTitle>
              <button onClick={() => setShowIssue(false)} className="text-blue-400 hover:text-blue-600"><X className="w-4 h-4" /></button>
            </div>
            <CardDescription className="text-blue-700">BCCM Act requires at least 30 days notice before the due date.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleIssue} className="flex items-end gap-4">
              <div className="flex flex-col gap-1.5 flex-1">
                <Label className="text-blue-900">Due date (min. 30 days from today)</Label>
                <Input type="date" min={minDueDate} value={issueForm.dueDate}
                  onChange={(e) => setIssueForm({ ...issueForm, dueDate: e.target.value })} required />
              </div>
              <div className="flex gap-2">
                <Button type="button" variant="outline" onClick={() => setShowIssue(false)}>Cancel</Button>
                <Button type="submit" disabled={issueNotices.isPending}>{issueNotices.isPending ? "Issuing…" : "Issue to all lots"}</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Reissue notices form */}
      {showReissue && (
        <Card className="mb-6 border-amber-200 bg-amber-50">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base text-amber-900">Reissue levy notices</CardTitle>
              <button onClick={() => setShowReissue(false)} className="text-amber-400 hover:text-amber-600"><X className="w-4 h-4" /></button>
            </div>
            <CardDescription className="text-amber-700">
              Unpaid notices for this budget will be voided and new notices issued at the updated amounts. Paid notices are kept.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleReissue} className="flex items-end gap-4">
              <div className="flex flex-col gap-1.5 flex-1">
                <Label className="text-amber-900">New due date (min. 30 days from today)</Label>
                <Input type="date" min={minDueDate} value={reissueForm.dueDate}
                  onChange={(e) => setReissueForm({ ...reissueForm, dueDate: e.target.value })} required />
              </div>
              <div className="flex gap-2">
                <Button type="button" variant="outline" onClick={() => setShowReissue(false)}>Cancel</Button>
                <Button type="submit" disabled={reissueNotices.isPending}>
                  {reissueNotices.isPending ? "Reissuing…" : "Void & reissue"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Record payment form */}
      {payingId && (
        <Card className="mb-6 border-green-200 bg-green-50">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base text-green-900">Record payment</CardTitle>
              <button onClick={() => setPayingId(null)} className="text-green-400 hover:text-green-600"><X className="w-4 h-4" /></button>
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={handlePayment} className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <Label className="text-green-900">Amount ($)</Label>
                <Input type="number" min="0.01" step="0.01" placeholder="0.00"
                  value={payForm.amount} onChange={(e) => setPayForm({ ...payForm, amount: e.target.value })} required />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label className="text-green-900">Payment date</Label>
                <Input type="date" value={payForm.paidDate}
                  onChange={(e) => setPayForm({ ...payForm, paidDate: e.target.value })} required />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label className="text-green-900">Method</Label>
                <select className="h-9 rounded-md border border-gray-300 px-3 text-sm bg-white"
                  value={payForm.method} onChange={(e) => setPayForm({ ...payForm, method: e.target.value as PaymentMethod })}>
                  {(Object.keys(methodLabel) as PaymentMethod[]).map((m) => (
                    <option key={m} value={m}>{methodLabel[m]}</option>
                  ))}
                </select>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label className="text-green-900">Reference (optional)</Label>
                <Input placeholder="e.g. BSB/account ref" value={payForm.reference}
                  onChange={(e) => setPayForm({ ...payForm, reference: e.target.value })} />
              </div>
              <div className="col-span-2 flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setPayingId(null)}>Cancel</Button>
                <Button type="submit" disabled={recordPayment.isPending}>{recordPayment.isPending ? "Saving…" : "Record payment"}</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Notices list */}
      {!notices || notices.length === 0 ? (
        <Card className="text-center py-12">
          <CardContent>
            <Receipt className="w-10 h-10 text-gray-300 mx-auto mb-4" />
            <p className="font-medium text-gray-900 mb-1">No levy notices yet</p>
            <p className="text-sm text-gray-500">Create a budget and issue notices to all lots.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="flex flex-col gap-2">
          {notices.map((notice) => {
            const owner = notice.lot.owners.find((o) => !o.ownershipTo);
            const totalPaid = notice.payments.reduce((s, p) => s + Number(p.amount), 0);
            const owing = Number(notice.amount) - totalPaid;
            const isOverdue = notice.status === "OVERDUE" || notice.status === "DEBT_RECOVERY";
            const isPaid = notice.status === "PAID";
            const isExpanded = expandedId === notice.id;

            return (
              <Card key={notice.id} className={isOverdue ? "border-red-200" : isPaid ? "opacity-70" : ""}>
                <CardContent className="py-0">
                  <div className="flex items-center gap-4 py-3">
                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${isPaid ? "bg-green-50" : isOverdue ? "bg-red-50" : "bg-blue-50"}`}>
                      {isPaid ? <CheckCircle2 className="w-4 h-4 text-green-600" /> : isOverdue ? <AlertTriangle className="w-4 h-4 text-red-600" /> : <Clock className="w-4 h-4 text-blue-600" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-gray-900">Lot {notice.lot.lotNumber}</p>
                        <Badge variant={statusVariant[notice.status] ?? "secondary"}>{statusLabel[notice.status] ?? notice.status}</Badge>
                        <Badge variant="outline">{notice.fundType === "ADMIN" ? "Admin" : "Sinking"}</Badge>
                      </div>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {owner?.user.fullName ?? "No owner"} · Due {new Date(notice.dueDate).toLocaleDateString("en-AU")}
                      </p>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <div className="text-right">
                        <p className="text-sm font-semibold text-gray-900">{aud(notice.amount)}</p>
                        {owing > 0 && owing < Number(notice.amount) && (
                          <p className="text-xs text-amber-600">{aud(owing)} owing</p>
                        )}
                      </div>
                      {!isPaid && (
                        <Button size="sm" variant="outline" className="text-xs"
                          onClick={() => { setPayingId(notice.id); setError(null); setPayForm((f) => ({ ...f, amount: String(owing) })); }}>
                          <CreditCard className="w-3.5 h-3.5 mr-1" /> Pay
                        </Button>
                      )}
                      {notice.payments.length > 0 && (
                        <button onClick={() => setExpandedId(isExpanded ? null : notice.id)} className="text-gray-400 hover:text-gray-600">
                          <ChevronDown className={`w-4 h-4 transition-transform ${isExpanded ? "rotate-180" : ""}`} />
                        </button>
                      )}
                    </div>
                  </div>
                  {isExpanded && notice.payments.length > 0 && (
                    <div className="border-t border-gray-100 px-0 pb-3">
                      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide px-1 pt-3 pb-2">Payment history</p>
                      <div className="flex flex-col gap-1">
                        {notice.payments.map((p) => (
                          <div key={p.id} className="flex items-center justify-between px-1 py-1 text-xs text-gray-600">
                            <span>{new Date(p.paidDate).toLocaleDateString("en-AU")} · {methodLabel[p.method as PaymentMethod] ?? p.method}</span>
                            <span className="font-medium text-green-700">{aud(p.amount)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
