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
import { Users, Plus, X, ChevronRight, CalendarDays } from "lucide-react";

type MeetingType = "AGM" | "EGM" | "COMMITTEE";
type MeetingStatus = "SCHEDULED" | "NOTICE_ISSUED" | "HELD" | "MINUTES_DRAFT" | "MINUTES_APPROVED";

const statusVariant: Record<MeetingStatus, "secondary" | "outline" | "success" | "warning" | "default"> = {
  SCHEDULED: "secondary",
  NOTICE_ISSUED: "outline",
  HELD: "warning",
  MINUTES_DRAFT: "warning",
  MINUTES_APPROVED: "success",
};

const statusLabel: Record<MeetingStatus, string> = {
  SCHEDULED: "Scheduled",
  NOTICE_ISSUED: "Notice issued",
  HELD: "Held",
  MINUTES_DRAFT: "Minutes draft",
  MINUTES_APPROVED: "Approved",
};

const minNoticeDays: Record<MeetingType, number> = { AGM: 21, EGM: 21, COMMITTEE: 7 };

export default function MeetingsPage() {
  const params = useParams();
  const schemeId = params.schemeId as string;

  const [showForm, setShowForm] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showMotionForm, setShowMotionForm] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    meetingType: "AGM" as MeetingType,
    scheduledAt: "",
    location: "",
  });

  const [motionForm, setMotionForm] = useState({
    title: "",
    description: "",
    resolutionType: "ORDINARY" as "ORDINARY" | "SPECIAL" | "MAJORITY",
  });

  const { data: meetings, refetch } = trpc.meeting.list.useQuery({ schemeId });
  const { data: selectedMeeting, refetch: refetchMeeting } = trpc.meeting.get.useQuery(
    { meetingId: selectedId! },
    { enabled: !!selectedId }
  );

  const createMeeting = trpc.meeting.create.useMutation({
    onSuccess: () => { refetch(); setShowForm(false); setForm({ meetingType: "AGM", scheduledAt: "", location: "" }); },
    onError: (e) => setError(e.message),
  });

  const addMotion = trpc.meeting.addMotion.useMutation({
    onSuccess: () => { refetchMeeting(); setShowMotionForm(false); setMotionForm({ title: "", description: "", resolutionType: "ORDINARY" }); },
    onError: (e) => setError(e.message),
  });

  function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    createMeeting.mutate({
      schemeId,
      meetingType: form.meetingType,
      scheduledAt: new Date(form.scheduledAt),
      location: form.location || undefined,
    });
  }

  function handleAddMotion(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!selectedId) return;
    addMotion.mutate({ schemeId, meetingId: selectedId, ...motionForm });
  }

  const minDate = (type: MeetingType) => {
    const d = new Date(Date.now() + minNoticeDays[type] * 86400000);
    return d.toISOString().split("T")[0];
  };

  if (selectedMeeting) {
    return (
      <div className="p-6 max-w-3xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => setSelectedId(null)} className="text-sm text-gray-500 hover:text-gray-900">
            ← Meetings
          </button>
          <ChevronRight className="w-3.5 h-3.5 text-gray-400" />
          <span className="text-sm font-medium text-gray-900">
            {selectedMeeting.meetingType} · {new Date(selectedMeeting.scheduledAt).toLocaleDateString("en-AU")}
          </span>
        </div>

        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Motions</h2>
          <Button size="sm" onClick={() => setShowMotionForm(true)}>
            <Plus className="w-3.5 h-3.5" /> Add motion
          </Button>
        </div>

        {showMotionForm && (
          <Card className="mb-4 border-gray-300">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm">Add motion</CardTitle>
                <button onClick={() => setShowMotionForm(false)}><X className="w-4 h-4 text-gray-400" /></button>
              </div>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleAddMotion} className="flex flex-col gap-3">
                <div className="flex flex-col gap-1.5">
                  <Label>Motion title</Label>
                  <Input placeholder="e.g. Adopt financial statements" value={motionForm.title}
                    onChange={(e) => setMotionForm({ ...motionForm, title: e.target.value })} required />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label>Description (optional)</Label>
                  <Input placeholder="Brief description" value={motionForm.description}
                    onChange={(e) => setMotionForm({ ...motionForm, description: e.target.value })} />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label>Resolution type</Label>
                  <select
                    className="h-9 rounded-md border border-gray-300 px-3 text-sm bg-white"
                    value={motionForm.resolutionType}
                    onChange={(e) => setMotionForm({ ...motionForm, resolutionType: e.target.value as typeof motionForm.resolutionType })}
                  >
                    <option value="ORDINARY">Ordinary resolution</option>
                    <option value="SPECIAL">Special resolution</option>
                    <option value="MAJORITY">Majority resolution</option>
                  </select>
                </div>
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setShowMotionForm(false)}>Cancel</Button>
                  <Button type="submit" disabled={addMotion.isPending}>
                    {addMotion.isPending ? "Adding…" : "Add motion"}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {selectedMeeting.motions.length === 0 ? (
          <Card className="text-center py-10">
            <CardContent>
              <p className="text-sm text-gray-400">No motions added yet.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="flex flex-col gap-2">
            {selectedMeeting.motions.map((motion, i) => (
              <Card key={motion.id}>
                <CardContent className="py-3 flex items-start gap-3">
                  <span className="w-6 h-6 bg-gray-100 rounded text-xs font-medium flex items-center justify-center text-gray-600 shrink-0 mt-0.5">
                    {i + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900">{motion.title}</p>
                    {motion.description && (
                      <p className="text-xs text-gray-500 mt-0.5">{motion.description}</p>
                    )}
                    <div className="flex items-center gap-3 mt-2">
                      <Badge variant="outline">{motion.resolutionType.toLowerCase()}</Badge>
                      <span className="text-xs text-gray-500">
                        For: {motion.votesFor} · Against: {motion.votesAgainst} · Abstain: {motion.votesAbstain}
                      </span>
                      {motion.outcome && (
                        <Badge variant={motion.outcome === "PASSED" ? "success" : "destructive"}>
                          {motion.outcome}
                        </Badge>
                      )}
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

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Meetings</h1>
          <p className="text-sm text-gray-500 mt-0.5">AGMs, EGMs, and committee meetings</p>
        </div>
        <Button onClick={() => { setShowForm(true); setError(null); }}>
          <Plus className="w-4 h-4" /> Schedule meeting
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
              <CardTitle className="text-base">Schedule a meeting</CardTitle>
              <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-4 h-4" />
              </button>
            </div>
            <CardDescription>
              BCCM Act: AGM/EGM require 21 days notice; committee meetings require 7 days.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreate} className="grid grid-cols-3 gap-4">
              <div className="flex flex-col gap-1.5">
                <Label>Meeting type</Label>
                <select
                  className="h-9 rounded-md border border-gray-300 px-3 text-sm bg-white"
                  value={form.meetingType}
                  onChange={(e) => setForm({ ...form, meetingType: e.target.value as MeetingType, scheduledAt: "" })}
                >
                  <option value="AGM">AGM</option>
                  <option value="EGM">EGM</option>
                  <option value="COMMITTEE">Committee</option>
                </select>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>Date & time</Label>
                <Input
                  type="datetime-local"
                  min={`${minDate(form.meetingType)}T00:00`}
                  value={form.scheduledAt}
                  onChange={(e) => setForm({ ...form, scheduledAt: e.target.value })}
                  required
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>Location (optional)</Label>
                <Input placeholder="e.g. Common room, Level 1" value={form.location}
                  onChange={(e) => setForm({ ...form, location: e.target.value })} />
              </div>
              <div className="col-span-3 flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
                <Button type="submit" disabled={createMeeting.isPending}>
                  {createMeeting.isPending ? "Scheduling…" : "Schedule"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {!meetings || meetings.length === 0 ? (
        <Card className="text-center py-12">
          <CardContent>
            <Users className="w-10 h-10 text-gray-300 mx-auto mb-4" />
            <p className="font-medium text-gray-900 mb-1">No meetings yet</p>
            <p className="text-sm text-gray-500">Schedule your first AGM or committee meeting.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="flex flex-col gap-2">
          {meetings.map((meeting) => {
            const isPast = new Date(meeting.scheduledAt) < new Date();
            return (
              <Card
                key={meeting.id}
                className="hover:border-gray-300 transition-colors cursor-pointer"
                onClick={() => setSelectedId(meeting.id)}
              >
                <CardContent className="flex items-center gap-4 py-4">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${isPast ? "bg-gray-100" : "bg-purple-50"}`}>
                    <CalendarDays className={`w-5 h-5 ${isPast ? "text-gray-500" : "text-purple-600"}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-gray-900">{meeting.meetingType}</p>
                      <Badge variant={statusVariant[meeting.status as MeetingStatus] ?? "secondary"}>
                        {statusLabel[meeting.status as MeetingStatus] ?? meeting.status}
                      </Badge>
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {new Date(meeting.scheduledAt).toLocaleDateString("en-AU", {
                        weekday: "short", day: "numeric", month: "long", year: "numeric",
                      })}
                      {meeting.location ? ` · ${meeting.location}` : ""}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-gray-500 shrink-0">
                    <span>{meeting._count.motions} motion{meeting._count.motions !== 1 ? "s" : ""}</span>
                    <ChevronRight className="w-4 h-4 text-gray-400" />
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
