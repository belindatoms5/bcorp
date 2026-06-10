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
import { Plus, X, Trash2, Building2, Users, ShieldCheck } from "lucide-react";

type CommitteeRole = "CHAIRPERSON" | "SECRETARY" | "TREASURER" | "COMMITTEE_MEMBER";

const roleLabel: Record<string, string> = {
  CHAIRPERSON: "Chairperson",
  SECRETARY: "Secretary",
  TREASURER: "Treasurer",
  COMMITTEE_MEMBER: "Committee member",
  OWNER: "Owner",
  CONTRACTOR: "Contractor",
};

const roleVariant: Record<string, "default" | "secondary" | "outline" | "warning"> = {
  CHAIRPERSON: "default",
  SECRETARY: "secondary",
  TREASURER: "secondary",
  COMMITTEE_MEMBER: "outline",
  OWNER: "outline",
  CONTRACTOR: "outline",
};

const REGULATION_MODULES = [
  { value: "STANDARD", label: "Standard module" },
  { value: "ACCOMMODATION", label: "Accommodation module" },
  { value: "COMMERCIAL", label: "Commercial module" },
  { value: "SMALL_SCHEME", label: "Small schemes module" },
];

export default function SettingsPage() {
  const params = useParams();
  const schemeId = params.schemeId as string;

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showAddRole, setShowAddRole] = useState(false);

  type RegModule = "STANDARD" | "ACCOMMODATION" | "COMMERCIAL" | "SMALL_SCHEME";
  const [schemeForm, setSchemeForm] = useState<{
    name: string; address: string; regulationModule: RegModule; lotCount: string;
  } | null>(null);

  const [roleForm, setRoleForm] = useState({
    email: "", fullName: "", role: "COMMITTEE_MEMBER" as CommitteeRole,
  });

  const { data: scheme, refetch } = trpc.settings.get.useQuery({ schemeId });

  // Initialise form once data arrives
  if (scheme && !schemeForm) {
    setSchemeForm({ name: scheme.name, address: scheme.address, regulationModule: scheme.regulationModule as RegModule, lotCount: String(scheme.lotCount) });
  }

  const updateScheme = trpc.settings.update.useMutation({
    onSuccess: () => { refetch(); setSuccess("Scheme details saved."); setTimeout(() => setSuccess(null), 3000); },
    onError: (e) => setError(e.message),
  });

  const addRole = trpc.settings.addRole.useMutation({
    onSuccess: () => {
      refetch();
      setShowAddRole(false);
      setRoleForm({ email: "", fullName: "", role: "COMMITTEE_MEMBER" });
      setSuccess("Member added.");
      setTimeout(() => setSuccess(null), 3000);
    },
    onError: (e) => setError(e.message),
  });

  const removeRole = trpc.settings.removeRole.useMutation({
    onSuccess: () => refetch(),
    onError: (e) => setError(e.message),
  });

  function handleSchemeSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!schemeForm) return;
    updateScheme.mutate({ schemeId, ...schemeForm, lotCount: parseInt(schemeForm.lotCount) });
  }

  function handleAddRole(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    addRole.mutate({ schemeId, ...roleForm });
  }

  const committeeRoles = scheme?.roles.filter((r) =>
    ["CHAIRPERSON", "SECRETARY", "TREASURER", "COMMITTEE_MEMBER"].includes(r.role)
  ) ?? [];

  const ownerRoles = scheme?.roles.filter((r) =>
    ["OWNER", "CONTRACTOR"].includes(r.role)
  ) ?? [];

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-gray-900">Scheme settings</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          CTS {scheme?.ctsNumber} · {scheme?.lotCount} lots
        </p>
      </div>

      {error && (
        <Alert variant="destructive" className="mb-4">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      {success && (
        <Alert className="mb-4 border-green-200 bg-green-50">
          <AlertDescription className="text-green-800">{success}</AlertDescription>
        </Alert>
      )}

      {/* Scheme details */}
      <Card className="mb-6">
        <CardHeader className="pb-4">
          <div className="flex items-center gap-2">
            <Building2 className="w-4 h-4 text-gray-500" />
            <CardTitle className="text-base">Scheme details</CardTitle>
          </div>
          <CardDescription>Only the chairperson can edit these fields.</CardDescription>
        </CardHeader>
        <CardContent>
          {schemeForm && (
            <form onSubmit={handleSchemeSubmit} className="flex flex-col gap-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <Label>Scheme name</Label>
                  <Input value={schemeForm.name}
                    onChange={(e) => setSchemeForm({ ...schemeForm, name: e.target.value })} required />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label>CTS number</Label>
                  <Input value={scheme?.ctsNumber ?? ""} disabled className="bg-gray-50 text-gray-500" />
                  <p className="text-xs text-gray-400">Contact Titles Queensland to change your CTS number.</p>
                </div>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>Address</Label>
                <Input value={schemeForm.address}
                  onChange={(e) => setSchemeForm({ ...schemeForm, address: e.target.value })} required />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>Regulation module</Label>
                <select
                  className="h-9 rounded-md border border-gray-300 px-3 text-sm bg-white"
                  value={schemeForm.regulationModule}
                  onChange={(e) => setSchemeForm({ ...schemeForm, regulationModule: e.target.value as RegModule })}
                >
                  {REGULATION_MODULES.map((m) => (
                    <option key={m.value} value={m.value}>{m.label}</option>
                  ))}
                </select>
                <p className="text-xs text-gray-400">
                  Set in your community management statement. Affects which BCCM Act provisions apply.
                </p>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>Number of lots</Label>
                <Input
                  type="number"
                  min="1"
                  value={schemeForm.lotCount}
                  onChange={(e) => setSchemeForm({ ...schemeForm, lotCount: e.target.value })}
                  required
                />
                <p className="text-xs text-gray-400">Total lots in the scheme as per the CMS.</p>
              </div>
              <div className="flex justify-end">
                <Button type="submit" disabled={updateScheme.isPending}>
                  {updateScheme.isPending ? "Saving…" : "Save changes"}
                </Button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>

      {/* Committee members */}
      <Card className="mb-6">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-gray-500" />
              <CardTitle className="text-base">Committee</CardTitle>
            </div>
            <Button size="sm" variant="outline" onClick={() => { setShowAddRole(true); setError(null); }}>
              <Plus className="w-3.5 h-3.5" /> Add member
            </Button>
          </div>
          <CardDescription>
            Committee members have full access to manage the scheme.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {showAddRole && (
            <Card className="border-gray-300 mb-2">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm">Add committee member</CardTitle>
                  <button onClick={() => setShowAddRole(false)} className="text-gray-400 hover:text-gray-600">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleAddRole} className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <Label>Full name</Label>
                    <Input placeholder="Jane Smith" value={roleForm.fullName}
                      onChange={(e) => setRoleForm({ ...roleForm, fullName: e.target.value })} required />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label>Email</Label>
                    <Input type="email" placeholder="jane@example.com" value={roleForm.email}
                      onChange={(e) => setRoleForm({ ...roleForm, email: e.target.value })} required />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label>Role</Label>
                    <select
                      className="h-9 rounded-md border border-gray-300 px-3 text-sm bg-white"
                      value={roleForm.role}
                      onChange={(e) => setRoleForm({ ...roleForm, role: e.target.value as CommitteeRole })}
                    >
                      <option value="CHAIRPERSON">Chairperson</option>
                      <option value="SECRETARY">Secretary</option>
                      <option value="TREASURER">Treasurer</option>
                      <option value="COMMITTEE_MEMBER">Committee member</option>
                    </select>
                  </div>
                  <div className="flex items-end justify-end gap-2">
                    <Button type="button" variant="outline" onClick={() => setShowAddRole(false)}>Cancel</Button>
                    <Button type="submit" disabled={addRole.isPending}>
                      {addRole.isPending ? "Adding…" : "Add"}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          )}

          {committeeRoles.length === 0 ? (
            <p className="text-sm text-gray-400">No committee members.</p>
          ) : (
            committeeRoles.map((r) => (
              <div key={r.id} className="flex items-center gap-3 py-2 border-b border-gray-100 last:border-0">
                <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center shrink-0 text-xs font-medium text-gray-600">
                  {r.user.fullName.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900">{r.user.fullName}</p>
                  <p className="text-xs text-gray-500">{r.user.email}</p>
                </div>
                <Badge variant={roleVariant[r.role] ?? "outline"}>{roleLabel[r.role] ?? r.role}</Badge>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-gray-400 hover:text-red-600 shrink-0"
                  disabled={removeRole.isPending}
                  onClick={() => removeRole.mutate({ schemeId, roleId: r.id })}
                  title="Remove member"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {/* Owners & contractors (read-only here) */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-gray-500" />
            <CardTitle className="text-base">Owners & contractors</CardTitle>
          </div>
          <CardDescription>
            Owners are managed via the Lots page. Contractors are managed via the Maintenance page.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {ownerRoles.length === 0 ? (
            <p className="text-sm text-gray-400">No owners or contractors registered yet.</p>
          ) : (
            <div className="flex flex-col gap-1">
              {ownerRoles.map((r) => (
                <div key={r.id} className="flex items-center gap-3 py-2 border-b border-gray-100 last:border-0">
                  <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center shrink-0 text-xs font-medium text-gray-600">
                    {r.user.fullName.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900">{r.user.fullName}</p>
                    <p className="text-xs text-gray-500">{r.user.email}</p>
                  </div>
                  <Badge variant={roleVariant[r.role] ?? "outline"}>{roleLabel[r.role] ?? r.role}</Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
