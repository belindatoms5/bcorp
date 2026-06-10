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
import { MessageSquare, Plus, X, Pin, Trash2 } from "lucide-react";

export default function AnnouncementsPage() {
  const params = useParams();
  const schemeId = params.schemeId as string;

  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({ title: "", body: "", isPinned: false });

  const { data: announcements, refetch } = trpc.announcement.list.useQuery({ schemeId });

  const create = trpc.announcement.create.useMutation({
    onSuccess: () => { refetch(); setShowForm(false); setForm({ title: "", body: "", isPinned: false }); },
    onError: (e) => setError(e.message),
  });

  const togglePin = trpc.announcement.togglePin.useMutation({
    onSuccess: () => refetch(),
    onError: (e) => setError(e.message),
  });

  const remove = trpc.announcement.delete.useMutation({
    onSuccess: () => refetch(),
    onError: (e) => setError(e.message),
  });

  function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    create.mutate({ schemeId, ...form });
  }

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Announcements</h1>
          <p className="text-sm text-gray-500 mt-0.5">Notices and updates for all lot owners</p>
        </div>
        <Button onClick={() => { setShowForm(true); setError(null); }}>
          <Plus className="w-4 h-4" /> New announcement
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
              <CardTitle className="text-base">New announcement</CardTitle>
              <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-4 h-4" />
              </button>
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreate} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <Label>Title</Label>
                <Input
                  placeholder="e.g. Pool closure this weekend"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  required
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>Message</Label>
                <textarea
                  className="min-h-[120px] rounded-md border border-gray-300 px-3 py-2 text-sm resize-y focus:outline-none focus:ring-2 focus:ring-gray-900"
                  placeholder="Write your announcement…"
                  value={form.body}
                  onChange={(e) => setForm({ ...form, body: e.target.value })}
                  required
                />
              </div>
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  className="w-4 h-4 rounded border-gray-300"
                  checked={form.isPinned}
                  onChange={(e) => setForm({ ...form, isPinned: e.target.checked })}
                />
                <span className="text-sm text-gray-700">Pin to top</span>
              </label>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
                <Button type="submit" disabled={create.isPending}>
                  {create.isPending ? "Posting…" : "Post announcement"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {!announcements || announcements.length === 0 ? (
        <Card className="text-center py-12">
          <CardContent>
            <MessageSquare className="w-10 h-10 text-gray-300 mx-auto mb-4" />
            <p className="font-medium text-gray-900 mb-1">No announcements yet</p>
            <p className="text-sm text-gray-500">Post updates that all owners can see.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="flex flex-col gap-3">
          {announcements.map((a) => (
            <Card key={a.id} className={a.isPinned ? "border-amber-200 bg-amber-50/40" : ""}>
              <CardContent className="py-4">
                <div className="flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="text-sm font-semibold text-gray-900">{a.title}</p>
                      {a.isPinned && (
                        <Badge variant="warning" className="flex items-center gap-1">
                          <Pin className="w-2.5 h-2.5" /> Pinned
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{a.body}</p>
                    <p className="text-xs text-gray-400 mt-2">
                      {a.author.fullName} · {new Date(a.createdAt).toLocaleDateString("en-AU", {
                        day: "numeric", month: "long", year: "numeric",
                      })}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button
                      variant="ghost"
                      size="sm"
                      className={`text-xs ${a.isPinned ? "text-amber-600" : "text-gray-400"}`}
                      onClick={() => togglePin.mutate({ schemeId, announcementId: a.id })}
                      disabled={togglePin.isPending}
                      title={a.isPinned ? "Unpin" : "Pin to top"}
                    >
                      <Pin className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-gray-400 hover:text-red-600"
                      onClick={() => remove.mutate({ schemeId, announcementId: a.id })}
                      disabled={remove.isPending}
                      title="Delete"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
