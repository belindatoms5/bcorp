"use client";

export const dynamic = "force-dynamic";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { trpc } from "@/lib/trpc-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Building2, ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function NewSchemePage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    ctsNumber: "",
    name: "",
    address: "",
    lotCount: "",
  });

  const createScheme = trpc.scheme.create.useMutation({
    onSuccess: (scheme) => {
      router.push(`/dashboard/${scheme.id}`);
    },
    onError: (err) => {
      setError(err.message);
    },
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    createScheme.mutate({
      ctsNumber: form.ctsNumber,
      name: form.name,
      address: form.address,
      lotCount: parseInt(form.lotCount),
    });
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        <div className="flex items-center gap-2 mb-8">
          <div className="w-9 h-9 bg-gray-900 rounded-lg flex items-center justify-center">
            <Building2 className="w-5 h-5 text-white" />
          </div>
          <span className="text-xl font-semibold text-gray-900">bcorp</span>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Set up your body corporate</CardTitle>
            <CardDescription>
              Enter your scheme details. You'll find your CTS number on your community management statement or title search.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="flex flex-col gap-5">
              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="ctsNumber">CTS number</Label>
                <Input
                  id="ctsNumber"
                  placeholder="e.g. 12345"
                  value={form.ctsNumber}
                  onChange={(e) => setForm({ ...form, ctsNumber: e.target.value })}
                  required
                />
                <p className="text-xs text-gray-500">
                  Community Titles Scheme number from Titles Queensland
                </p>
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="name">Scheme name</Label>
                <Input
                  id="name"
                  placeholder="e.g. Riverfront Apartments"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  required
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="address">Address</Label>
                <Input
                  id="address"
                  placeholder="e.g. 12 Beach Road, Surfers Paradise QLD 4217"
                  value={form.address}
                  onChange={(e) => setForm({ ...form, address: e.target.value })}
                  required
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="lotCount">Number of lots</Label>
                <Input
                  id="lotCount"
                  type="number"
                  min="1"
                  placeholder="e.g. 24"
                  value={form.lotCount}
                  onChange={(e) => setForm({ ...form, lotCount: e.target.value })}
                  required
                />
              </div>

              <div className="flex gap-3 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  asChild
                  className="flex-1"
                >
                  <Link href="/dashboard">
                    <ArrowLeft className="w-4 h-4" />
                    Back
                  </Link>
                </Button>
                <Button
                  type="submit"
                  className="flex-1"
                  disabled={createScheme.isPending}
                >
                  {createScheme.isPending ? "Creating…" : "Create scheme"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
