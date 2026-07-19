"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { CheckCircle2, Copy, LoaderCircle, Plus, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { type ChainInvite, type ChainInviteStatus } from "@/lib/chain-invites";
import { readJsonResponse } from "@/lib/read-json-response";

type InviteWithStatus = ChainInvite & { status: ChainInviteStatus };

type ParticipantDraft = {
  label: string;
  gives: string;
  wants: string;
  listingUrl: string;
};

const emptyParticipant: ParticipantDraft = { label: "", gives: "", wants: "", listingUrl: "" };

const statusLabels: Record<string, string> = {
  pending: "offen",
  accepted: "komplett",
  declined: "geplatzt",
};

function AdminChainsContent() {
  const searchParams = useSearchParams();
  const accessKey = searchParams.get("key") ?? "";

  const [title, setTitle] = useState("");
  const [note, setNote] = useState("");
  const [participants, setParticipants] = useState<ParticipantDraft[]>([
    { ...emptyParticipant },
    { ...emptyParticipant },
    { ...emptyParticipant },
  ]);
  const [creating, setCreating] = useState(false);
  const [message, setMessage] = useState("");
  const [messageTone, setMessageTone] = useState<"success" | "error">("success");
  const [createdUrl, setCreatedUrl] = useState("");
  const [invites, setInvites] = useState<InviteWithStatus[]>([]);
  const [copied, setCopied] = useState("");

  const loadInvites = useCallback(async () => {
    try {
      const query = accessKey ? `?key=${encodeURIComponent(accessKey)}` : "";
      const response = await fetch(`/api/chain-invites${query}`);
      const payload = await readJsonResponse<{ invites?: InviteWithStatus[] }>(response);
      if (response.ok && payload.invites) {
        setInvites(payload.invites);
      }
    } catch {
      // list stays empty; creation still works
    }
  }, [accessKey]);

  useEffect(() => {
    void loadInvites();
  }, [loadInvites]);

  function updateParticipant(index: number, patch: Partial<ParticipantDraft>) {
    setParticipants((current) =>
      current.map((entry, i) => (i === index ? { ...entry, ...patch } : entry))
    );
  }

  async function handleCreate() {
    setCreating(true);
    setMessage("");
    setCreatedUrl("");

    try {
      const response = await fetch("/api/chain-invites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          key: accessKey,
          title,
          note,
          participants,
        }),
      });
      const payload = await readJsonResponse<{
        message?: string;
        url?: string;
        errors?: string[];
      }>(response);

      if (!response.ok || !payload.url) {
        throw new Error(payload.errors?.[0] || payload.message || "Could not create chain.");
      }

      const absolute = `${window.location.origin}${payload.url}`;
      setCreatedUrl(absolute);
      setMessageTone("success");
      setMessage("Chain created — share the link below with every participant.");
      setTitle("");
      setNote("");
      setParticipants([{ ...emptyParticipant }, { ...emptyParticipant }, { ...emptyParticipant }]);
      void loadInvites();
    } catch (error) {
      setMessageTone("error");
      setMessage(error instanceof Error ? error.message : "Could not create chain.");
    } finally {
      setCreating(false);
    }
  }

  async function copyUrl(url: string) {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(url);
      window.setTimeout(() => setCopied(""), 2000);
    } catch {
      // clipboard unavailable; user can copy manually
    }
  }

  const inputClass =
    "h-11 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900 focus:border-amber-400 focus:outline-none";

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#f8f5ee_0%,#f1eadc_100%)] px-6 py-10 text-slate-900 md:px-10">
      <div className="mx-auto max-w-5xl space-y-8">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-amber-700">
            Internal dashboard
          </p>
          <h1 className="mt-3 text-4xl font-black tracking-tight text-slate-950">
            Chain invites
          </h1>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600">
            Turn a manually found chain into a shareable page: enter the participants in loop
            order (each gives to the next, the last gives to the first), create, and send every
            participant the same link. They confirm on the page; contacts unlock when everyone
            accepted.
          </p>
        </div>

        <Card className="rounded-[1.75rem] border-white/80 bg-white/90 py-0">
          <CardHeader className="p-6 pb-3">
            <CardTitle className="text-2xl font-black text-slate-950">New chain</CardTitle>
            <CardDescription className="text-sm leading-6 text-slate-600">
              Loop order matters: participant 1 gives to participant 2, and the last one gives back
              to participant 1.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 p-6 pt-0">
            <div className="grid gap-4 md:grid-cols-2">
              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-slate-700">Title</span>
                <input
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  placeholder="Apple-Kaskade"
                  className={inputClass}
                />
              </label>
              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-slate-700">
                  Note shown on the page (optional)
                </span>
                <input
                  value={note}
                  onChange={(event) => setNote(event.target.value)}
                  placeholder="Gefunden am 19.07. auf Kleinanzeigen"
                  className={inputClass}
                />
              </label>
            </div>

            {participants.map((participant, index) => (
              <div
                key={index}
                className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4"
              >
                <div className="flex items-center justify-between">
                  <p className="text-sm font-bold uppercase tracking-[0.18em] text-slate-700">
                    Participant {index + 1}
                  </p>
                  {participants.length > 3 ? (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="rounded-full border-slate-300 bg-white text-slate-600"
                      onClick={() =>
                        setParticipants((current) => current.filter((_, i) => i !== index))
                      }
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  ) : null}
                </div>
                <div className="mt-3 grid gap-3 md:grid-cols-2">
                  <input
                    value={participant.label}
                    onChange={(event) => updateParticipant(index, { label: event.target.value })}
                    placeholder="Name / Ort (z.B. Sulz aus Essen)"
                    className={inputClass}
                  />
                  <input
                    value={participant.listingUrl}
                    onChange={(event) =>
                      updateParticipant(index, { listingUrl: event.target.value })
                    }
                    placeholder="Link zur Anzeige (optional)"
                    className={inputClass}
                  />
                  <input
                    value={participant.gives}
                    onChange={(event) => updateParticipant(index, { gives: event.target.value })}
                    placeholder="Gibt (z.B. iPhone 17 Pro Max)"
                    className={inputClass}
                  />
                  <input
                    value={participant.wants}
                    onChange={(event) => updateParticipant(index, { wants: event.target.value })}
                    placeholder="Sucht (z.B. iPhone 16 Pro Max)"
                    className={inputClass}
                  />
                </div>
              </div>
            ))}

            <div className="flex flex-wrap gap-3">
              <Button
                type="button"
                variant="outline"
                className="rounded-full border-slate-300 bg-white text-slate-700"
                onClick={() => setParticipants((current) => [...current, { ...emptyParticipant }])}
              >
                <Plus className="size-4" /> Add participant
              </Button>
              <Button
                type="button"
                disabled={creating}
                className="rounded-full bg-slate-950 text-white hover:bg-slate-800"
                onClick={() => void handleCreate()}
              >
                {creating ? <LoaderCircle className="size-4 animate-spin" /> : <CheckCircle2 className="size-4" />}
                Create chain
              </Button>
            </div>

            {message ? (
              <p
                className={`rounded-2xl px-4 py-3 text-sm font-medium ${
                  messageTone === "success"
                    ? "bg-emerald-50 text-emerald-800"
                    : "bg-rose-50 text-rose-700"
                }`}
              >
                {message}
              </p>
            ) : null}

            {createdUrl ? (
              <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3">
                <span className="font-mono text-sm text-emerald-900">{createdUrl}</span>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="rounded-full border-emerald-300 bg-white text-emerald-800"
                  onClick={() => void copyUrl(createdUrl)}
                >
                  <Copy className="size-4" /> {copied === createdUrl ? "Copied!" : "Copy"}
                </Button>
              </div>
            ) : null}
          </CardContent>
        </Card>

        <Card className="rounded-[1.75rem] border-white/80 bg-white/90 py-0">
          <CardHeader className="p-6 pb-3">
            <CardTitle className="text-2xl font-black text-slate-950">Existing chains</CardTitle>
            <CardDescription className="text-sm leading-6 text-slate-600">
              Newest first. Statuses update as participants respond.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6 pt-0">
            {invites.length === 0 ? (
              <p className="text-sm leading-6 text-slate-500">No chain invites yet.</p>
            ) : (
              <div className="space-y-3">
                {invites.map((invite) => {
                  const acceptedCount = invite.participants.filter(
                    (p) => p.status === "accepted"
                  ).length;
                  const url =
                    typeof window !== "undefined"
                      ? `${window.location.origin}/chain/${invite.id}`
                      : `/chain/${invite.id}`;

                  return (
                    <div
                      key={invite.id}
                      className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3"
                    >
                      <div>
                        <p className="font-bold text-slate-900">{invite.title}</p>
                        <p className="mt-0.5 text-xs text-slate-500">
                          {invite.participants.length} Teilnehmer · {acceptedCount} Zusagen ·{" "}
                          {statusLabels[invite.status] ?? invite.status}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <a
                          href={`/chain/${invite.id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm font-semibold text-amber-800 hover:text-amber-900"
                        >
                          Open
                        </a>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className="rounded-full border-slate-300 bg-white text-slate-700"
                          onClick={() => void copyUrl(url)}
                        >
                          <Copy className="size-4" /> {copied === url ? "Copied!" : "Copy link"}
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  );
}

export default function AdminChainsPage() {
  return (
    <Suspense fallback={null}>
      <AdminChainsContent />
    </Suspense>
  );
}
