"use client";

export const dynamic = "force-dynamic";

import { useState } from "react";
import { useParams } from "next/navigation";
import { trpc } from "@/lib/trpc-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { ArrowDownLeft, ArrowUpRight, Plus, X, Trash2, TrendingUp } from "lucide-react";

type FundType = "ADMIN" | "SINKING";

const CATEGORIES = [
  "LEVY_INCOME", "INSURANCE", "UTILITIES", "REPAIRS", "MANAGEMENT",
  "LEGAL", "ACCOUNTING", "LANDSCAPING", "CLEANING", "CAPITAL_WORKS", "OTHER",
] as const;
type Category = typeof CATEGORIES[number];

const categoryLabel: Record<Category, string> = {
  LEVY_INCOME: "Levy income",
  INSURANCE: "Insurance",
  UTILITIES: "Utilities",
  REPAIRS: "Repairs",
  MANAGEMENT: "Management",
  LEGAL: "Legal",
  ACCOUNTING: "Accounting",
  LANDSCAPING: "Landscaping",
  CLEANING: "Cleaning",
  CAPITAL_WORKS: "Capital works",
  OTHER: "Other",
};

export default function TransactionsPage() {
  const params = useParams();
  const schemeId = params.schemeId as string;

  const currentYear = new Date().getFullYear();
  const [fundFilter, setFundFilter] = useState<FundType | "">("");
  const [yearFilter, setYearFilter] = useState<number>(currentYear);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    fundType: "ADMIN" as FundType,
    category: "OTHER" as Category,
    type: "expense" as "income" | "expense",
    amount: "",
    transactionDate: new Date().toISOString().split("T")[0],
    description: "",
  });

  const { data: transactions, refetch } = trpc.transaction.list.useQuery({
    schemeId,
    ...(fundFilter ? { fundType: fundFilter } : {}),
    year: yearFilter,
  });

  const { data: summary } = trpc.transaction.summary.useQuery({
    schemeId,
    ...(fundFilter ? { fundType: fundFilter } : {}),
  });

  const create = trpc.transaction.create.useMutation({
    onSuccess: () => {
      refetch();
      setShowForm(false);
      setForm({ fundType: "ADMIN", category: "OTHER", type: "expense", amount: "", transactionDate: new Date().toISOString().split("T")[0], description: "" });
    },
    onError: (e) => setError(e.message),
  });

  const remove = trpc.transaction.delete.useMutation({
    onSuccess: () => refetch(),
    onError: (e) => setError(e.message),
  });

  function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const rawAmount = parseFloat(form.amount);
    create.mutate({
      schemeId,
      fundType: form.fundType,
      category: form.category,
      amount: form.type === "expense" ? -Math.abs(rawAmount) : Math.abs(rawAmount),
      transactionDate: new Date(form.transactionDate),
      description: form.description,
    });
  }

  const aud = (n: number) =>
    `$${Math.abs(n).toLocaleString("en-AU", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const years = Array.from({ length: 5 }, (_, i) => currentYear - i);

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Transactions</h1>
          <p className="text-sm text-gray-500 mt-0.5">Income and expenses for admin and sinking funds</p>
        </div>
        <Button onClick={() => { setShowForm(true); setError(null); }}>
          <Plus className="w-4 h-4" /> Add transaction
        </Button>
      </div>

      {error && (
        <Alert variant="destructive" className="mb-4">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Summary */}
      {summary && (
        <div className="grid grid-cols-3 gap-4 mb-6">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <ArrowDownLeft className="w-4 h-4 text-green-600" />
                <span className="text-xs text-gray-500 uppercase tracking-wide">Income</span>
              </div>
              <p className="text-xl font-semibold text-gray-900">{aud(summary.income)}</p>
              <p className="text-xs text-gray-500 mt-0.5">{summary.incomeCount} transactions</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <ArrowUpRight className="w-4 h-4 text-red-500" />
                <span className="text-xs text-gray-500 uppercase tracking-wide">Expenses</span>
              </div>
              <p className="text-xl font-semibold text-gray-900">{aud(summary.expenses)}</p>
              <p className="text-xs text-gray-500 mt-0.5">{summary.expensesCount} transactions</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className={`w-4 h-4 ${summary.balance >= 0 ? "text-blue-600" : "text-red-500"}`} />
                <span className="text-xs text-gray-500 uppercase tracking-wide">Balance</span>
              </div>
              <p className={`text-xl font-semibold ${summary.balance >= 0 ? "text-gray-900" : "text-red-600"}`}>
                {summary.balance < 0 ? "-" : ""}{aud(summary.balance)}
              </p>
              <p className="text-xs text-gray-500 mt-0.5">All time</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <div className="flex items-center gap-3 mb-4">
        <div className="flex gap-1.5">
          {(["", "ADMIN", "SINKING"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFundFilter(f)}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                fundFilter === f ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {f === "" ? "All funds" : f === "ADMIN" ? "Admin" : "Sinking"}
            </button>
          ))}
        </div>
        <select
          className="ml-auto h-8 rounded-md border border-gray-300 px-3 text-sm bg-white"
          value={yearFilter}
          onChange={(e) => setYearFilter(parseInt(e.target.value))}
        >
          {years.map((y) => (
            <option key={y} value={y}>{y}</option>
          ))}
        </select>
      </div>

      {/* Add form */}
      {showForm && (
        <Card className="mb-6 border-gray-300">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Add transaction</CardTitle>
              <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-4 h-4" />
              </button>
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreate} className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <Label>Type</Label>
                <div className="flex rounded-md border border-gray-300 overflow-hidden">
                  {(["income", "expense"] as const).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setForm({ ...form, type: t })}
                      className={`flex-1 py-2 text-sm font-medium transition-colors ${
                        form.type === t
                          ? t === "income" ? "bg-green-600 text-white" : "bg-red-500 text-white"
                          : "bg-white text-gray-600 hover:bg-gray-50"
                      }`}
                    >
                      {t === "income" ? "Income" : "Expense"}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>Fund</Label>
                <select
                  className="h-9 rounded-md border border-gray-300 px-3 text-sm bg-white"
                  value={form.fundType}
                  onChange={(e) => setForm({ ...form, fundType: e.target.value as FundType })}
                >
                  <option value="ADMIN">Admin fund</option>
                  <option value="SINKING">Sinking fund</option>
                </select>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>Category</Label>
                <select
                  className="h-9 rounded-md border border-gray-300 px-3 text-sm bg-white"
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value as Category })}
                >
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>{categoryLabel[c]}</option>
                  ))}
                </select>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>Amount ($)</Label>
                <Input
                  type="number" min="0.01" step="0.01" placeholder="0.00"
                  value={form.amount}
                  onChange={(e) => setForm({ ...form, amount: e.target.value })}
                  required
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>Date</Label>
                <Input
                  type="date"
                  value={form.transactionDate}
                  onChange={(e) => setForm({ ...form, transactionDate: e.target.value })}
                  required
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>Description</Label>
                <Input
                  placeholder="e.g. Strata insurance renewal"
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  required
                />
              </div>
              <div className="col-span-2 flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
                <Button type="submit" disabled={create.isPending}>
                  {create.isPending ? "Saving…" : "Save transaction"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* List */}
      {!transactions || transactions.length === 0 ? (
        <Card className="text-center py-12">
          <CardContent>
            <TrendingUp className="w-10 h-10 text-gray-300 mx-auto mb-4" />
            <p className="font-medium text-gray-900 mb-1">No transactions for {yearFilter}</p>
            <p className="text-sm text-gray-500">Record income and expenses to track fund balances.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="flex flex-col gap-1.5">
          {transactions.map((tx) => {
            const isIncome = Number(tx.amount) > 0;
            return (
              <Card key={tx.id} className="hover:border-gray-300 transition-colors">
                <CardContent className="flex items-center gap-4 py-3">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${isIncome ? "bg-green-50" : "bg-red-50"}`}>
                    {isIncome
                      ? <ArrowDownLeft className="w-4 h-4 text-green-600" />
                      : <ArrowUpRight className="w-4 h-4 text-red-500" />
                    }
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-gray-900 truncate">{tx.description}</p>
                      <Badge variant="secondary">{categoryLabel[tx.category as Category] ?? tx.category}</Badge>
                      <Badge variant="outline">{tx.fundType === "ADMIN" ? "Admin" : "Sinking"}</Badge>
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {new Date(tx.transactionDate).toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" })}
                      {" · "}{tx.createdBy.fullName}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <p className={`text-sm font-semibold tabular-nums ${isIncome ? "text-green-700" : "text-red-600"}`}>
                      {isIncome ? "+" : "−"}{aud(Number(tx.amount))}
                    </p>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-gray-400 hover:text-red-600"
                      onClick={() => remove.mutate({ schemeId, transactionId: tx.id })}
                      disabled={remove.isPending}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
