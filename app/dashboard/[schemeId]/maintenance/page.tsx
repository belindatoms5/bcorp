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
import { Wrench, Plus, X, AlertTriangle, Clock, ChevronDown, UserPlus } from "lucide-react";

type Priority = "LOW" | "NORMAL" | "HIGH" | "URGENT";
type MaintenanceStatus = "OPEN" | "CLASSIFIED" | "QUOTE_REQUESTED" | "WORK_ORDERED" | "COMPLETED" | "CLOSED";
type WorkOrderStatus = "PENDING" | "ACCEPTED" | "IN_PROGRESS" | "COMPLETED" | "INVOICED" | "PAID";

const statusVariant: Record<MaintenanceStatus, "secondary" | "outline" | "warning" | "success" | "destructive"> = {
  OPEN: "secondary", CLASSIFIED: "outline", QUOTE_REQUESTED: "warning",
  WORK_ORDERED: "warning", COMPLETED: "success", CLOSED: "secondary",
};
const statusLabel: Record<MaintenanceStatus, string> = {
  OPEN: "Open", CLASSIFIED: "Classified", QUOTE_REQUESTED: "Quote requested",
  WORK_ORDERED: "Work ordered", COMPLETED: "Completed", CLOSED: "Closed",
};
const priorityVariant: Record<Priority, "secondary" | "outline" | "warning" | "destructive"> = {
  LOW: "secondary", NORMAL: "outline", HIGH: "warning", URGENT: "destructive",
};
const woStatusLabel: Record<WorkOrderStatus, string> = {
  PENDING: "Pending", ACCEPTED: "Accepted", IN_PROGRESS: "In progress",
  COMPLETED: "Completed", INVOICED: "Invoiced", PAID: "Paid",
};

export default function MaintenancePage() {
  const params = useParams();
  const schemeId = params.schemeId as string;

  const [showForm, setShowForm] = useState(false);
  const [showContractorForm, setShowContractorForm] = useState(false);
  const [classifyId, setClassifyId] = useState<string | null>(null);
  const [workOrderId, setWorkOrderId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({ title: "", description: "", priority: "NORMAL" as Priority });
  const [contractorForm, setContractorForm] = useState({ email: "", fullName: "", phone: "" });
  const [woForm, setWoForm] = useState({ contractorId: "", quotedAmount: "", notes: "" });
  const [woUpdateForm, setWoUpdateForm] = useState<{ id: string; status: WorkOrderStatus; finalAmount: string; invoiceUrl: string } | null>(null);

  const { data: requests, refetch } = trpc.maintenance.list.useQuery({ schemeId });
  const { data: contractors, refetch: refetchContractors } = trpc.maintenance.listContractors.useQuery({ schemeId });

  const create = trpc.maintenance.create.useMutation({
    onSuccess: () => { refetch(); setShowForm(false); setForm({ title: "", description: "", priority: "NORMAL" }); },
    onError: (e) => setError(e.message),
  });
  const classify = trpc.maintenance.classify.useMutation({
    onSuccess: () => { refetch(); setClassifyId(null); },
    onError: (e) => setError(e.message),
  });
  const createWorkOrder = trpc.maintenance.createWorkOrder.useMutation({
    onSuccess: () => { refetch(); setWorkOrderId(null); setWoForm({ contractorId: "", quotedAmount: "", notes: "" }); },
    onError: (e) => setError(e.message),
  });
  const updateWorkOrder = trpc.maintenance.updateWorkOrder.useMutation({
    onSuccess: () => { refetch(); setWoUpdateForm(null); },
    onError: (e) => setError(e.message),
  });
  const addContractor = trpc.maintenance.addContractor.useMutation({
    onSuccess: () => { refetchContractors(); setShowContractorForm(false); setContractorForm({ email: "", fullName: "", phone: "" }); },
    onError: (e) => setError(e.message),
  });

  function handleCreate(e: React.FormEvent) {
    e.preventDefault(); setError(null);
    create.mutate({ schemeId, ...form });
  }
  function handleWorkOrder(e: React.FormEvent) {
    e.preventDefault(); setError(null);
    if (!workOrderId) return;
    createWorkOrder.mutate({
      schemeId, requestId: workOrderId,
      contractorId: woForm.contractorId,
      ...(woForm.quotedAmount ? { quotedAmount: parseFloat(woForm.quotedAmount) } : {}),
      ...(woForm.notes ? { notes: woForm.notes } : {}),
    });
  }
  function handleWoUpdate(e: React.FormEvent) {
    e.preventDefault(); setError(null);
    if (!woUpdateForm) return;
    updateWorkOrder.mutate({
      schemeId,
      workOrderId: woUpdateForm.id,
      status: woUpdateForm.status,
      ...(woUpdateForm.finalAmount ? { finalAmount: parseFloat(woUpdateForm.finalAmount) } : {}),
      ...(woUpdateForm.invoiceUrl ? { invoiceUrl: woUpdateForm.invoiceUrl } : {}),
    });
  }
  function handleAddContractor(e: React.FormEvent) {
    e.preventDefault(); setError(null);
    addContractor.mutate({ schemeId, ...contractorForm });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const aud = (n: any) =>
    `$${Number(n ?? 0).toLocaleString("en-AU", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const openCount = requests?.filter((r) => ["OPEN", "CLASSIFIED", "QUOTE_REQUESTED", "WORK_ORDERED"].includes(r.status)).length ?? 0;

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Maintenance</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {openCount > 0 ? `${openCount} open` : "No open requests"}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => { setShowContractorForm(true); setError(null); }}>
            <UserPlus className="w-4 h-4" /> Add contractor
          </Button>
          <Button onClick={() => { setShowForm(true); setError(null); }}>
            <Plus className="w-4 h-4" /> New request
          </Button>
        </div>
      </div>

      {error && <Alert variant="destructive" className="mb-4"><AlertDescription>{error}</AlertDescription></Alert>}

      {/* Add contractor form */}
      {showContractorForm && (
        <Card className="mb-6 border-gray-300">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Add contractor</CardTitle>
              <button onClick={() => setShowContractorForm(false)} className="text-gray-400 hover:text-gray-600"><X className="w-4 h-4" /></button>
            </div>
            <CardDescription>Contractors can be assigned to work orders.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleAddContractor} className="grid grid-cols-3 gap-4">
              <div className="flex flex-col gap-1.5">
                <Label>Full name</Label>
                <Input placeholder="ABC Plumbing" value={contractorForm.fullName}
                  onChange={(e) => setContractorForm({ ...contractorForm, fullName: e.target.value })} required />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>Email</Label>
                <Input type="email" placeholder="info@abcplumbing.com.au" value={contractorForm.email}
                  onChange={(e) => setContractorForm({ ...contractorForm, email: e.target.value })} required />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>Phone (optional)</Label>
                <Input placeholder="07 3000 0000" value={contractorForm.phone}
                  onChange={(e) => setContractorForm({ ...contractorForm, phone: e.target.value })} />
              </div>
              <div className="col-span-3 flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setShowContractorForm(false)}>Cancel</Button>
                <Button type="submit" disabled={addContractor.isPending}>{addContractor.isPending ? "Saving…" : "Add contractor"}</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* New request form */}
      {showForm && (
        <Card className="mb-6 border-gray-300">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Log maintenance request</CardTitle>
              <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600"><X className="w-4 h-4" /></button>
            </div>
            <CardDescription>Committee will classify it as common property or lot owner responsibility.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreate} className="flex flex-col gap-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <Label>Title</Label>
                  <Input placeholder="e.g. Pool pump not working" value={form.title}
                    onChange={(e) => setForm({ ...form, title: e.target.value })} required />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label>Priority</Label>
                  <select className="h-9 rounded-md border border-gray-300 px-3 text-sm bg-white"
                    value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value as Priority })}>
                    <option value="LOW">Low</option>
                    <option value="NORMAL">Normal</option>
                    <option value="HIGH">High</option>
                    <option value="URGENT">Urgent</option>
                  </select>
                </div>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>Description</Label>
                <textarea className="min-h-[80px] rounded-md border border-gray-300 px-3 py-2 text-sm resize-y focus:outline-none focus:ring-2 focus:ring-gray-900"
                  placeholder="Describe the issue…" value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })} required />
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
                <Button type="submit" disabled={create.isPending}>{create.isPending ? "Submitting…" : "Submit"}</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Classify panel */}
      {classifyId && (
        <Card className="mb-6 border-amber-200 bg-amber-50">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm text-amber-900">Classify request</CardTitle>
              <button onClick={() => setClassifyId(null)}><X className="w-4 h-4 text-amber-400" /></button>
            </div>
          </CardHeader>
          <CardContent className="flex gap-3">
            <Button variant="outline" size="sm" className="border-amber-300 text-amber-900" disabled={classify.isPending}
              onClick={() => classify.mutate({ schemeId, requestId: classifyId, areaType: "COMMON_PROPERTY" })}>
              Common property
            </Button>
            <Button variant="outline" size="sm" className="border-amber-300 text-amber-900" disabled={classify.isPending}
              onClick={() => classify.mutate({ schemeId, requestId: classifyId, areaType: "LOT_OWNER" })}>
              Lot owner responsibility
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Create work order form */}
      {workOrderId && (
        <Card className="mb-6 border-blue-200 bg-blue-50">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base text-blue-900">Create work order</CardTitle>
              <button onClick={() => setWorkOrderId(null)} className="text-blue-400 hover:text-blue-600"><X className="w-4 h-4" /></button>
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleWorkOrder} className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <Label className="text-blue-900">Contractor</Label>
                {contractors && contractors.length > 0 ? (
                  <select className="h-9 rounded-md border border-gray-300 px-3 text-sm bg-white"
                    value={woForm.contractorId}
                    onChange={(e) => setWoForm({ ...woForm, contractorId: e.target.value })} required>
                    <option value="">Select contractor…</option>
                    {contractors.map((c) => (
                      <option key={c.id} value={c.id}>{c.fullName}{c.phone ? ` · ${c.phone}` : ""}</option>
                    ))}
                  </select>
                ) : (
                  <p className="text-sm text-blue-700">No contractors yet — add one first.</p>
                )}
              </div>
              <div className="flex flex-col gap-1.5">
                <Label className="text-blue-900">Quoted amount ($, optional)</Label>
                <Input type="number" min="0.01" step="0.01" placeholder="0.00"
                  value={woForm.quotedAmount} onChange={(e) => setWoForm({ ...woForm, quotedAmount: e.target.value })} />
              </div>
              <div className="col-span-2 flex flex-col gap-1.5">
                <Label className="text-blue-900">Notes (optional)</Label>
                <Input placeholder="e.g. Access via car park level 1" value={woForm.notes}
                  onChange={(e) => setWoForm({ ...woForm, notes: e.target.value })} />
              </div>
              <div className="col-span-2 flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setWorkOrderId(null)}>Cancel</Button>
                <Button type="submit" disabled={createWorkOrder.isPending || !woForm.contractorId}>
                  {createWorkOrder.isPending ? "Creating…" : "Create work order"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Update work order status */}
      {woUpdateForm && (
        <Card className="mb-6 border-gray-300">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Update work order</CardTitle>
              <button onClick={() => setWoUpdateForm(null)} className="text-gray-400 hover:text-gray-600"><X className="w-4 h-4" /></button>
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleWoUpdate} className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <Label>Status</Label>
                <select className="h-9 rounded-md border border-gray-300 px-3 text-sm bg-white"
                  value={woUpdateForm.status}
                  onChange={(e) => setWoUpdateForm({ ...woUpdateForm, status: e.target.value as WorkOrderStatus })}>
                  {(Object.keys(woStatusLabel) as WorkOrderStatus[]).map((s) => (
                    <option key={s} value={s}>{woStatusLabel[s]}</option>
                  ))}
                </select>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>Final amount ($, optional)</Label>
                <Input type="number" min="0.01" step="0.01" placeholder="0.00"
                  value={woUpdateForm.finalAmount}
                  onChange={(e) => setWoUpdateForm({ ...woUpdateForm, finalAmount: e.target.value })} />
              </div>
              <div className="col-span-2 flex flex-col gap-1.5">
                <Label>Invoice URL (optional)</Label>
                <Input type="url" placeholder="https://…" value={woUpdateForm.invoiceUrl}
                  onChange={(e) => setWoUpdateForm({ ...woUpdateForm, invoiceUrl: e.target.value })} />
              </div>
              <div className="col-span-2 flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setWoUpdateForm(null)}>Cancel</Button>
                <Button type="submit" disabled={updateWorkOrder.isPending}>
                  {updateWorkOrder.isPending ? "Saving…" : "Update"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* List */}
      {!requests || requests.length === 0 ? (
        <Card className="text-center py-12">
          <CardContent>
            <Wrench className="w-10 h-10 text-gray-300 mx-auto mb-4" />
            <p className="font-medium text-gray-900 mb-1">No maintenance requests</p>
            <p className="text-sm text-gray-500">Log an issue to get started.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="flex flex-col gap-2">
          {requests.map((req) => {
            const isOpen = ["OPEN", "CLASSIFIED", "QUOTE_REQUESTED", "WORK_ORDERED"].includes(req.status);
            const isExpanded = expandedId === req.id;
            return (
              <Card key={req.id} className={isOpen ? "" : "opacity-70"}>
                <CardContent className="py-0">
                  <button className="w-full flex items-start gap-4 py-4 text-left"
                    onClick={() => setExpandedId(isExpanded ? null : req.id)}>
                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
                      req.priority === "URGENT" ? "bg-red-50" : req.priority === "HIGH" ? "bg-amber-50" : "bg-gray-100"
                    }`}>
                      {req.priority === "URGENT" || req.priority === "HIGH"
                        ? <AlertTriangle className={`w-4 h-4 ${req.priority === "URGENT" ? "text-red-600" : "text-amber-600"}`} />
                        : <Clock className="w-4 h-4 text-gray-500" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-medium text-gray-900">{req.title}</p>
                        <Badge variant={statusVariant[req.status as MaintenanceStatus] ?? "secondary"}>
                          {statusLabel[req.status as MaintenanceStatus] ?? req.status}
                        </Badge>
                        <Badge variant={priorityVariant[req.priority as Priority] ?? "outline"}>{req.priority.toLowerCase()}</Badge>
                        {req.areaType && (
                          <Badge variant="outline">{req.areaType === "COMMON_PROPERTY" ? "Common property" : "Lot owner"}</Badge>
                        )}
                      </div>
                      <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">{req.description}</p>
                      {req.workOrder && (
                        <p className="text-xs text-gray-400 mt-0.5">
                          Work order · {req.workOrder.contractor.fullName} · {woStatusLabel[req.workOrder.status as WorkOrderStatus]}
                          {req.workOrder.quotedAmount ? ` · Quote: ${aud(req.workOrder.quotedAmount)}` : ""}
                          {req.workOrder.finalAmount ? ` · Final: ${aud(req.workOrder.finalAmount)}` : ""}
                        </p>
                      )}
                    </div>
                    <ChevronDown className={`w-4 h-4 text-gray-400 shrink-0 mt-1 transition-transform ${isExpanded ? "rotate-180" : ""}`} />
                  </button>

                  {isExpanded && (
                    <div className="border-t border-gray-100 pb-4 pt-3 flex flex-wrap gap-2">
                      <p className="w-full text-sm text-gray-700 mb-2">{req.description}</p>
                      <p className="w-full text-xs text-gray-400 mb-2">
                        Reported by {req.reportedBy.fullName} · {new Date(req.createdAt).toLocaleDateString("en-AU")}
                      </p>
                      {req.status === "OPEN" && (
                        <Button size="sm" variant="outline" onClick={() => { setClassifyId(req.id); setError(null); }}>
                          Classify
                        </Button>
                      )}
                      {req.status === "CLASSIFIED" && !req.workOrder && (
                        <Button size="sm" variant="outline" onClick={() => { setWorkOrderId(req.id); setError(null); }}>
                          <Wrench className="w-3.5 h-3.5 mr-1" /> Create work order
                        </Button>
                      )}
                      {req.workOrder && !["COMPLETED", "PAID"].includes(req.workOrder.status) && (
                        <Button size="sm" variant="outline"
                          onClick={() => setWoUpdateForm({
                            id: req.workOrder!.id,
                            status: req.workOrder!.status as WorkOrderStatus,
                            finalAmount: req.workOrder!.finalAmount ? String(req.workOrder!.finalAmount) : "",
                            invoiceUrl: req.workOrder!.invoiceUrl ?? "",
                          })}>
                          Update work order
                        </Button>
                      )}
                      {req.workOrder?.invoiceUrl && (
                        <Button size="sm" variant="ghost" asChild>
                          <a href={req.workOrder.invoiceUrl} target="_blank" rel="noopener noreferrer">View invoice</a>
                        </Button>
                      )}
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
