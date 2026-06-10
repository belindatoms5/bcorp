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
import { Plus, X, Pencil, Trash2, TrendingUp, TrendingDown, Minus } from "lucide-react";

export default function SinkingFundPage() {
  const params = useParams();
  const schemeId = params.schemeId as string;

  const [showForm, setShowForm] = useState(false);
  const [editYear, setEditYear] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const emptyForm = {
    year: new Date().getFullYear(),
    openingBalance: "",
    contributions: "",
    expenditure: "",
    notes: "",
  };
  const [form, setForm] = useState(emptyForm);

  const { data: rows, refetch } = trpc.sinking.list.useQuery({ schemeId });

  const upsert = trpc.sinking.upsert.useMutation({
    onSuccess: () => { refetch(); setShowForm(false); setEditYear(null); setForm(emptyForm); },
    onError: (e) => setError(e.message),
  });

  const remove = trpc.sinking.delete.useMutation({
    onSuccess: () => refetch(),
    onError: (e) => setError(e.message),
  });

  function openEdit(row: { year: number; openingBalance: unknown; contributions: unknown; expenditure: unknown; notes: string | null }) {
    setForm({
      year: row.year,
      openingBalance: String(row.openingBalance),
      contributions: String(row.contributions),
      expenditure: String(row.expenditure),
      notes: row.notes ?? "",
    });
    setEditYear(row.year);
    setShowForm(true);
    setError(null);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    upsert.mutate({
      schemeId,
      year: form.year,
      openingBalance: parseFloat(form.openingBalance),
      contributions: parseFloat(form.contributions),
      expenditure: parseFloat(form.expenditure),
      notes: form.notes || undefined,
    });
  }

  const aud = (n: unknown) =>
    `$${Number(n ?? 0).toLocaleString("en-AU", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const latestBalance = rows && rows.length > 0
    ? Number(rows[rows.length - 1].closingBalance)
    : null;

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Sinking fund forecast</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {latestBalance !== null
              ? `Projected closing balance: ${aud(latestBalance)}`
              : "Plan and track long-term capital expenditure"}
          </p>
        </div>
        <Button onClick={() => { setShowForm(true); setEditYear(null); setForm(emptyForm); setError(null); }}>
          <Plus className="w-4 h-4" /> Add year
        </Button>
      </div>

      {error && <Alert variant="destructive" className="mb-4"><AlertDescription>{error}</AlertDescription></Alert>}

      {showForm && (
        <Card className="mb-6 border-gray-300">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">{editYear ? `Edit ${editYear}` : "Add forecast year"}</CardTitle>
              <button onClick={() => { setShowForm(false); setEditYear(null); }} className="text-gray-400 hover:text-gray-600">
                <X className="w-4 h-4" />
              </button>
            </div>
            <CardDescription>
              Closing balance = opening balance + contributions − expenditure.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <Label>Financial year</Label>
                <Input type="number" min="2020" max="2060"
                  value={form.year}
                  onChange={(e) => setForm({ ...form, year: parseInt(e.target.value) })}
                  disabled={!!editYear}
                  required />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>Opening balance ($)</Label>
                <Input type="number" step="0.01" placeholder="0.00"
                  value={form.openingBalance}
                  onChange={(e) => setForm({ ...form, openingBalance: e.target.value })}
                  required />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>Contributions ($)</Label>
                <Input type="number" min="0" step="0.01" placeholder="0.00"
                  value={form.contributions}
                  onChange={(e) => setForm({ ...form, contributions: e.target.value })}
                  required />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>Expenditure ($)</Label>
                <Input type="number" min="0" step="0.01" placeholder="0.00"
                  value={form.expenditure}
                  onChange={(e) => setForm({ ...form, expenditure: e.target.value })}
                  required />
              </div>
              {(form.openingBalance && form.contributions && form.expenditure) && (
                <div className="col-span-2 bg-gray-50 rounded-lg px-4 py-3">
                  <p className="text-xs text-gray-500 mb-0.5">Projected closing balance</p>
                  <p className="text-lg font-semibold text-gray-900">
                    {aud(parseFloat(form.openingBalance || "0") + parseFloat(form.contributions || "0") - parseFloat(form.expenditure || "0"))}
                  </p>
                </div>
              )}
              <div className="col-span-2 flex flex-col gap-1.5">
                <Label>Notes (optional)</Label>
                <Input placeholder="e.g. Roof replacement scheduled" value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })} />
              </div>
              <div className="col-span-2 flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => { setShowForm(false); setEditYear(null); }}>Cancel</Button>
                <Button type="submit" disabled={upsert.isPending}>
                  {upsert.isPending ? "Saving…" : editYear ? "Save changes" : "Add year"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {!rows || rows.length === 0 ? (
        <Card className="text-center py-12">
          <CardContent>
            <TrendingUp className="w-10 h-10 text-gray-300 mx-auto mb-4" />
            <p className="font-medium text-gray-900 mb-1">No forecast years yet</p>
            <p className="text-sm text-gray-500">Add years to plan contributions and expenditure over time.</p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Bar chart — visual balance trend */}
          <Card className="mb-4">
            <CardContent className="pt-4 pb-3">
              <p className="text-xs text-gray-500 uppercase tracking-wide mb-3">Closing balance by year</p>
              <div className="flex items-end gap-2 h-24">
                {rows.map((row) => {
                  const maxBalance = Math.max(...rows.map((r) => Math.abs(Number(r.closingBalance))), 1);
                  const balance = Number(row.closingBalance);
                  const heightPct = Math.abs(balance) / maxBalance;
                  const isNeg = balance < 0;
                  return (
                    <div key={row.year} className="flex flex-col items-center gap-1 flex-1">
                      <div className="w-full flex flex-col justify-end" style={{ height: "80px" }}>
                        <div
                          className={`w-full rounded-t ${isNeg ? "bg-red-300" : "bg-blue-400"}`}
                          style={{ height: `${Math.max(heightPct * 80, 4)}px` }}
                        />
                      </div>
                      <p className="text-xs text-gray-500">{row.year}</p>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Table */}
          <Card>
            <CardContent className="p-0">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Year</th>
                    <th className="text-right px-4 py-3 text-xs font-medium text-gray-500">Opening</th>
                    <th className="text-right px-4 py-3 text-xs font-medium text-gray-500">Contributions</th>
                    <th className="text-right px-4 py-3 text-xs font-medium text-gray-500">Expenditure</th>
                    <th className="text-right px-4 py-3 text-xs font-medium text-gray-500">Closing</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, i) => {
                    const closing = Number(row.closingBalance);
                    const prevClosing = i > 0 ? Number(rows[i - 1].closingBalance) : null;
                    const trend = prevClosing !== null ? closing - prevClosing : null;
                    return (
                      <tr key={row.year} className="border-b border-gray-50 hover:bg-gray-50">
                        <td className="px-4 py-3 font-medium text-gray-900">
                          {row.year}
                          {row.notes && <p className="text-xs text-gray-400 font-normal mt-0.5">{row.notes}</p>}
                        </td>
                        <td className="px-4 py-3 text-right text-gray-600">{aud(row.openingBalance)}</td>
                        <td className="px-4 py-3 text-right text-green-700">+{aud(row.contributions)}</td>
                        <td className="px-4 py-3 text-right text-red-600">−{aud(row.expenditure)}</td>
                        <td className="px-4 py-3 text-right">
                          <span className={`font-semibold ${closing < 0 ? "text-red-600" : "text-gray-900"}`}>
                            {closing < 0 ? "-" : ""}{aud(Math.abs(closing))}
                          </span>
                          {trend !== null && (
                            <span className={`ml-1.5 text-xs ${trend >= 0 ? "text-green-600" : "text-red-500"}`}>
                              {trend >= 0
                                ? <TrendingUp className="inline w-3 h-3" />
                                : trend === 0
                                  ? <Minus className="inline w-3 h-3" />
                                  : <TrendingDown className="inline w-3 h-3" />}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1 justify-end">
                            <Button variant="ghost" size="sm" onClick={() => openEdit(row)}>
                              <Pencil className="w-3.5 h-3.5" />
                            </Button>
                            <Button variant="ghost" size="sm" className="text-gray-400 hover:text-red-600"
                              onClick={() => remove.mutate({ schemeId, year: row.year })} disabled={remove.isPending}>
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
