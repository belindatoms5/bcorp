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
import { MessageSquare, Plus, X, AlertTriangle, CheckCircle2, ChevronDown } from "lucide-react";

type BreachStatus = "REPORTED" | "FORM_1_ISSUED" | "RESPONSE_PENDING" | "RESOLVED" | "ESCALATED_TO_BCCM";

const statusVariant: Record<BreachStatus, "secondary" | "warning" | "outline" | "success" | "destructive"> = {
  REPORTED: "secondary",
  FORM_1_ISSUED: "warning",
  RESPONSE_PENDING: "warning",
  RESOLVED: "success",
  ESCALATED_TO_BCCM: "destructive",
};

const statusLabel: Record<BreachStatus, string> = {
  REPORTED: "Reported",
  FORM_1_ISSUED: "Form 1 issued",
  RESPONSE_PENDING: "Response pending",
  RESOLVED: "Resolved",
  ESCALATED_TO_BCCM: "Escalated to BCCM",
};

export default function NoticesPage() {
  const params = useParams();
  const schemeId = params.schemeId as string;

  const [showForm, setShowForm] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    accusedLotId: "",
    bylawReference: "",
    description: "",
  });

  const { data: notices, refetch } = trpc.breach.list.useQuery({ schemeId });
  const { data: scheme } = trpc.scheme.get.useQuery({ schemeId });

  const create = trpc.breach.create.useMutation({
    onSuccess: () => { refetch(); setShowForm(false); setForm({ accusedLotId: "", bylawReference: "", description: "" }); },
    onError: (e) => setError(e.message),
  });

  const issueForm1 = trpc.breach.issueForm1.useMutation({
    onSuccess: () => refetch(),
    onError: (e) => setError(e.message),
  });

  const updateStatus = trpc.breach.updateStatus.useMutation({
    onSuccess: () => refetch(),
    onError: (e) => setError(e.message),
  });

  function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    create.mutate({ schemeId, ...form });
  }

  const lots = scheme?.lots ?? [];
  const openCount = notices?.filter((n) => !["RESOLVED"].includes(n.status)).length ?? 0;

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Breach notices</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {openCount > 0 ? `${openCount} active` : "No active breaches"} · Body Corporate & Community Management Act
          </p>
        </div>
        <Button onClick={() => { setShowForm(true); setError(null); }}>
          <Plus className="w-4 h-4" /> New notice
        </Button>
      </div>

      {error && (
        <Alert variant="destructive" className="mb-4">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {showForm && (
        <Card className="mb-6 border-gray-300">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Issue breach notice</CardTitle>
              <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-4 h-4" />
              </button>
            </div>
            <CardDescription>
              Issuing a Form 1 Notice to Remedy starts a 14-day response period under the BCCM Act.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreate} className="flex flex-col gap-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <Label>Accused lot</Label>
                  <select
                    className="h-9 rounded-md border border-gray-300 px-3 text-sm bg-white"
                    value={form.accusedLotId}
                    onChange={(e) => setForm({ ...form, accusedLotId: e.target.value })}
                    required
                  >
                    <option value="">Select a lot…</option>
                    {lots.map((lot) => (
                      <option key={lot.id} value={lot.id}>Lot {lot.lotNumber} — {lot.address}</option>
                    ))}
                  </select>
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label>By-law reference</Label>
                  <Input placeholder="e.g. By-law 12 — Noise" value={form.bylawReference}
                    onChange={(e) => setForm({ ...form, bylawReference: e.target.value })} required />
                </div>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>Description</Label>
                <textarea
                  className="min-h-[80px] rounded-md border border-gray-300 px-3 py-2 text-sm resize-y focus:outline-none focus:ring-2 focus:ring-gray-900"
                  placeholder="Describe the alleged breach…"
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  required
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
                <Button type="submit" disabled={create.isPending}>
                  {create.isPending ? "Saving…" : "Create notice"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {!notices || notices.length === 0 ? (
        <Card className="text-center py-12">
          <CardContent>
            <MessageSquare className="w-10 h-10 text-gray-300 mx-auto mb-4" />
            <p className="font-medium text-gray-900 mb-1">No breach notices</p>
            <p className="text-sm text-gray-500">Issue a notice when a by-law breach is reported.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="flex flex-col gap-2">
          {notices.map((notice) => {
            const isExpanded = expandedId === notice.id;
            const isActive = !["RESOLVED"].includes(notice.status);

            return (
              <Card key={notice.id} className={isActive ? "" : "opacity-70"}>
                <CardContent className="py-0">
                  <button
                    className="w-full flex items-center gap-4 py-4 text-left"
                    onClick={() => setExpandedId(isExpanded ? null : notice.id)}
                  >
                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                      notice.status === "RESOLVED" ? "bg-green-50" :
                      notice.status === "ESCALATED_TO_BCCM" ? "bg-red-50" : "bg-amber-50"
                    }`}>
                      {notice.status === "RESOLVED" ? (
                        <CheckCircle2 className="w-4 h-4 text-green-600" />
                      ) : (
                        <AlertTriangle className={`w-4 h-4 ${notice.status === "ESCALATED_TO_BCCM" ? "text-red-600" : "text-amber-600"}`} />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-medium text-gray-900">
                          Lot {notice.accusedLot.lotNumber}
                        </p>
                        <Badge variant={statusVariant[notice.status as BreachStatus] ?? "secondary"}>
                          {statusLabel[notice.status as BreachStatus] ?? notice.status}
                        </Badge>
                      </div>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {notice.bylawReference} · {new Date(notice.createdAt).toLocaleDateString("en-AU")}
                      </p>
                    </div>
                    <ChevronDown className={`w-4 h-4 text-gray-400 shrink-0 transition-transform ${isExpanded ? "rotate-180" : ""}`} />
                  </button>

                  {isExpanded && (
                    <div className="pb-4 pt-0 px-0 border-t border-gray-100 mt-0">
                      <div className="pt-3 px-0 space-y-3">
                        <p className="text-sm text-gray-700">{notice.description}</p>
                        {notice.form1IssuedAt && (
                          <p className="text-xs text-gray-500">
                            Form 1 issued: {new Date(notice.form1IssuedAt).toLocaleDateString("en-AU")}
                            {notice.responseDeadline && ` · Response due: ${new Date(notice.responseDeadline).toLocaleDateString("en-AU")}`}
                          </p>
                        )}
                        {notice.resolvedAt && (
                          <p className="text-xs text-green-700">
                            Resolved: {new Date(notice.resolvedAt).toLocaleDateString("en-AU")}
                          </p>
                        )}
                        <div className="flex flex-wrap gap-2 pt-1">
                          {notice.status === "REPORTED" && (
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={issueForm1.isPending}
                              onClick={() => issueForm1.mutate({ schemeId, breachId: notice.id })}
                            >
                              Issue Form 1
                            </Button>
                          )}
                          {["FORM_1_ISSUED", "RESPONSE_PENDING"].includes(notice.status) && (
                            <>
                              <Button size="sm" variant="outline"
                                onClick={() => updateStatus.mutate({ schemeId, breachId: notice.id, status: "RESOLVED" })}>
                                Mark resolved
                              </Button>
                              <Button size="sm" variant="outline" className="text-red-700 border-red-200"
                                onClick={() => updateStatus.mutate({ schemeId, breachId: notice.id, status: "ESCALATED_TO_BCCM" })}>
                                Escalate to BCCM
                              </Button>
                            </>
                          )}
                        </div>
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
