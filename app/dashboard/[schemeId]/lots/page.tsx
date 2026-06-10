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
import { Plus, Home, User, ChevronRight, X, Pencil } from "lucide-react";

type EditForm = {
  lotId: string;
  lotNumber: string;
  address: string;
  entitlementAdmin: string;
  entitlementSinking: string;
};

export default function LotsPage() {
  const params = useParams();
  const schemeId = params.schemeId as string;
  const [showAddLot, setShowAddLot] = useState(false);
  const [showInvite, setShowInvite] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<EditForm | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [lotForm, setLotForm] = useState({
    lotNumber: "", address: "", entitlementAdmin: "", entitlementSinking: "",
  });
  const [inviteForm, setInviteForm] = useState({
    email: "", fullName: "", ownershipFrom: new Date().toISOString().split("T")[0],
  });

  const { data: scheme, refetch } = trpc.scheme.get.useQuery({ schemeId });

  const addLot = trpc.scheme.addLot.useMutation({
    onSuccess: () => { refetch(); setShowAddLot(false); setLotForm({ lotNumber: "", address: "", entitlementAdmin: "", entitlementSinking: "" }); },
    onError: (e) => setError(e.message),
  });

  const updateLot = trpc.scheme.updateLot.useMutation({
    onSuccess: () => { refetch(); setEditForm(null); },
    onError: (e) => setError(e.message),
  });

  const inviteOwner = trpc.scheme.inviteOwner.useMutation({
    onSuccess: () => { refetch(); setShowInvite(null); setInviteForm({ email: "", fullName: "", ownershipFrom: new Date().toISOString().split("T")[0] }); },
    onError: (e) => setError(e.message),
  });

  function handleAddLot(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    addLot.mutate({
      schemeId,
      lotNumber: lotForm.lotNumber,
      address: lotForm.address,
      entitlementAdmin: parseInt(lotForm.entitlementAdmin),
      entitlementSinking: parseInt(lotForm.entitlementSinking),
    });
  }

  function handleEditLot(e: React.FormEvent) {
    e.preventDefault();
    if (!editForm) return;
    setError(null);
    updateLot.mutate({
      schemeId,
      lotId: editForm.lotId,
      lotNumber: editForm.lotNumber,
      address: editForm.address,
      entitlementAdmin: parseInt(editForm.entitlementAdmin),
      entitlementSinking: parseInt(editForm.entitlementSinking),
    });
  }

  function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!showInvite) return;
    inviteOwner.mutate({
      schemeId,
      lotId: showInvite,
      email: inviteForm.email,
      fullName: inviteForm.fullName,
      ownershipFrom: new Date(inviteForm.ownershipFrom),
    });
  }

  const lots = scheme?.lots ?? [];

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Lots</h1>
          <p className="text-sm text-gray-500 mt-0.5">{lots.length} of {scheme?.lotCount ?? "—"} lots registered</p>
        </div>
        <Button onClick={() => { setShowAddLot(true); setEditForm(null); setError(null); }}>
          <Plus className="w-4 h-4" /> Add lot
        </Button>
      </div>

      {error && (
        <Alert variant="destructive" className="mb-4">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Add lot form */}
      {showAddLot && (
        <Card className="mb-6 border-gray-300">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Add a lot</CardTitle>
              <button onClick={() => setShowAddLot(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-4 h-4" />
              </button>
            </div>
            <CardDescription>Entitlements determine levy proportions. Check your community management statement.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleAddLot} className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <Label>Lot number</Label>
                <Input placeholder="e.g. 5" value={lotForm.lotNumber} onChange={(e) => setLotForm({ ...lotForm, lotNumber: e.target.value })} required />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>Address / unit</Label>
                <Input placeholder="e.g. Unit 5, 12 Beach Rd" value={lotForm.address} onChange={(e) => setLotForm({ ...lotForm, address: e.target.value })} required />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>Admin fund entitlement</Label>
                <Input type="number" min="1" placeholder="e.g. 100" value={lotForm.entitlementAdmin} onChange={(e) => setLotForm({ ...lotForm, entitlementAdmin: e.target.value })} required />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>Sinking fund entitlement</Label>
                <Input type="number" min="1" placeholder="e.g. 100" value={lotForm.entitlementSinking} onChange={(e) => setLotForm({ ...lotForm, entitlementSinking: e.target.value })} required />
              </div>
              <div className="col-span-2 flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setShowAddLot(false)}>Cancel</Button>
                <Button type="submit" disabled={addLot.isPending}>{addLot.isPending ? "Adding…" : "Add lot"}</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Edit lot form */}
      {editForm && (
        <Card className="mb-6 border-blue-200 bg-blue-50/30">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Edit lot</CardTitle>
              <button onClick={() => setEditForm(null)} className="text-gray-400 hover:text-gray-600">
                <X className="w-4 h-4" />
              </button>
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleEditLot} className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <Label>Lot number</Label>
                <Input value={editForm.lotNumber} onChange={(e) => setEditForm({ ...editForm, lotNumber: e.target.value })} required />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>Address / unit</Label>
                <Input value={editForm.address} onChange={(e) => setEditForm({ ...editForm, address: e.target.value })} required />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>Admin fund entitlement</Label>
                <Input type="number" min="1" value={editForm.entitlementAdmin} onChange={(e) => setEditForm({ ...editForm, entitlementAdmin: e.target.value })} required />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>Sinking fund entitlement</Label>
                <Input type="number" min="1" value={editForm.entitlementSinking} onChange={(e) => setEditForm({ ...editForm, entitlementSinking: e.target.value })} required />
              </div>
              <div className="col-span-2 flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setEditForm(null)}>Cancel</Button>
                <Button type="submit" disabled={updateLot.isPending}>{updateLot.isPending ? "Saving…" : "Save changes"}</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Invite owner form */}
      {showInvite && (
        <Card className="mb-6 border-gray-300">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Add owner</CardTitle>
              <button onClick={() => setShowInvite(null)} className="text-gray-400 hover:text-gray-600">
                <X className="w-4 h-4" />
              </button>
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleInvite} className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <Label>Full name</Label>
                <Input placeholder="Jane Smith" value={inviteForm.fullName} onChange={(e) => setInviteForm({ ...inviteForm, fullName: e.target.value })} required />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>Email address</Label>
                <Input type="email" placeholder="jane@example.com" value={inviteForm.email} onChange={(e) => setInviteForm({ ...inviteForm, email: e.target.value })} required />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>Ownership from</Label>
                <Input type="date" value={inviteForm.ownershipFrom} onChange={(e) => setInviteForm({ ...inviteForm, ownershipFrom: e.target.value })} required />
              </div>
              <div className="flex items-end justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setShowInvite(null)}>Cancel</Button>
                <Button type="submit" disabled={inviteOwner.isPending}>{inviteOwner.isPending ? "Adding…" : "Add owner"}</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Lots list */}
      {lots.length === 0 ? (
        <Card className="text-center py-12">
          <CardContent>
            <Home className="w-10 h-10 text-gray-300 mx-auto mb-4" />
            <p className="font-medium text-gray-900 mb-1">No lots yet</p>
            <p className="text-sm text-gray-500">Add your first lot to get started.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="flex flex-col gap-2">
          {lots.map((lot) => {
            const activeOwner = lot.owners.find((o) => !o.ownershipTo);
            const isEditing = editForm?.lotId === lot.id;
            return (
              <Card key={lot.id} className={`hover:border-gray-300 transition-colors ${isEditing ? "border-blue-300" : ""}`}>
                <CardContent className="flex items-center gap-4 py-4">
                  <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center shrink-0">
                    <Home className="w-5 h-5 text-gray-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-gray-900">Lot {lot.lotNumber}</p>
                      <span className="text-gray-300">·</span>
                      <p className="text-sm text-gray-500 truncate">{lot.address}</p>
                    </div>
                    <div className="flex items-center gap-3 mt-1">
                      {activeOwner ? (
                        <span className="flex items-center gap-1 text-xs text-gray-500">
                          <User className="w-3 h-3" />
                          {activeOwner.user.fullName}
                        </span>
                      ) : (
                        <Badge variant="warning">No owner</Badge>
                      )}
                      <span className="text-xs text-gray-400">
                        Admin: {lot.entitlementAdmin} · Sinking: {lot.entitlementSinking}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setShowAddLot(false);
                        setError(null);
                        setEditForm({
                          lotId: lot.id,
                          lotNumber: lot.lotNumber,
                          address: lot.address,
                          entitlementAdmin: String(lot.entitlementAdmin),
                          entitlementSinking: String(lot.entitlementSinking),
                        });
                      }}
                      className="text-xs text-gray-500"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => { setShowInvite(lot.id); setEditForm(null); setError(null); }}
                      className="text-xs"
                    >
                      {activeOwner ? <><User className="w-3.5 h-3.5 mr-1" />Change owner</> : <><Plus className="w-3.5 h-3.5 mr-1" />Add owner</>}
                      <ChevronRight className="w-3.5 h-3.5 ml-1 text-gray-400" />
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
