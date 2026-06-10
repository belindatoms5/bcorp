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
import { FileText, Plus, X, ExternalLink, Trash2 } from "lucide-react";

const CATEGORIES = ["MINUTES", "FINANCIAL", "INSURANCE", "BYLAW", "CMS", "CORRESPONDENCE", "OTHER"] as const;
type Category = typeof CATEGORIES[number];

const categoryLabel: Record<Category, string> = {
  MINUTES: "Minutes",
  FINANCIAL: "Financial",
  INSURANCE: "Insurance",
  BYLAW: "By-law",
  CMS: "CMS",
  CORRESPONDENCE: "Correspondence",
  OTHER: "Other",
};

export default function DocumentsPage() {
  const params = useParams();
  const schemeId = params.schemeId as string;

  const [showForm, setShowForm] = useState(false);
  const [filterCat, setFilterCat] = useState<Category | "">("");
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    title: "",
    category: "MINUTES" as Category,
    fileUrl: "",
  });

  const { data: documents, refetch } = trpc.document.list.useQuery({
    schemeId,
    ...(filterCat ? { category: filterCat } : {}),
  });

  const create = trpc.document.create.useMutation({
    onSuccess: () => { refetch(); setShowForm(false); setForm({ title: "", category: "MINUTES", fileUrl: "" }); },
    onError: (e) => setError(e.message),
  });

  const remove = trpc.document.delete.useMutation({
    onSuccess: () => refetch(),
    onError: (e) => setError(e.message),
  });

  function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    create.mutate({ schemeId, ...form });
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Documents</h1>
          <p className="text-sm text-gray-500 mt-0.5">{documents?.length ?? 0} document{documents?.length !== 1 ? "s" : ""}</p>
        </div>
        <Button onClick={() => { setShowForm(true); setError(null); }}>
          <Plus className="w-4 h-4" /> Add document
        </Button>
      </div>

      {error && (
        <Alert variant="destructive" className="mb-4">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Category filter */}
      <div className="flex gap-2 flex-wrap mb-4">
        <button
          onClick={() => setFilterCat("")}
          className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${!filterCat ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}
        >
          All
        </button>
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            onClick={() => setFilterCat(filterCat === cat ? "" : cat)}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${filterCat === cat ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}
          >
            {categoryLabel[cat]}
          </button>
        ))}
      </div>

      {showForm && (
        <Card className="mb-6 border-gray-300">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Add document</CardTitle>
              <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-4 h-4" />
              </button>
            </div>
            <CardDescription>
              Paste a file URL (e.g. Supabase Storage, Google Drive direct link).
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreate} className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <Label>Title</Label>
                <Input placeholder="e.g. AGM Minutes 2024" value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })} required />
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
              <div className="col-span-2 flex flex-col gap-1.5">
                <Label>File URL</Label>
                <Input type="url" placeholder="https://…" value={form.fileUrl}
                  onChange={(e) => setForm({ ...form, fileUrl: e.target.value })} required />
              </div>
              <div className="col-span-2 flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
                <Button type="submit" disabled={create.isPending}>
                  {create.isPending ? "Saving…" : "Save document"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {!documents || documents.length === 0 ? (
        <Card className="text-center py-12">
          <CardContent>
            <FileText className="w-10 h-10 text-gray-300 mx-auto mb-4" />
            <p className="font-medium text-gray-900 mb-1">No documents</p>
            <p className="text-sm text-gray-500">
              {filterCat ? `No ${categoryLabel[filterCat]} documents found.` : "Upload minutes, financials, insurance, and more."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="flex flex-col gap-2">
          {documents.map((doc) => (
            <Card key={doc.id} className="hover:border-gray-300 transition-colors">
              <CardContent className="flex items-center gap-4 py-3">
                <div className="w-9 h-9 bg-gray-100 rounded-lg flex items-center justify-center shrink-0">
                  <FileText className="w-4 h-4 text-gray-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-gray-900 truncate">{doc.title}</p>
                    <Badge variant="secondary">{categoryLabel[doc.category as Category] ?? doc.category}</Badge>
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Added by {doc.uploadedBy.fullName} · {new Date(doc.createdAt).toLocaleDateString("en-AU")}
                  </p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Button variant="ghost" size="sm" asChild>
                    <a href={doc.fileUrl} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-gray-400 hover:text-red-600"
                    onClick={() => remove.mutate({ schemeId, documentId: doc.id })}
                    disabled={remove.isPending}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
