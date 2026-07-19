"use client";

import { useState } from "react";
import { ArrowDown, ArrowRight, CheckCircle2, ExternalLink, LoaderCircle, ShieldCheck, XCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  type ChainInvite,
  type ChainInviteStatus,
} from "@/lib/chain-invites";
import { readJsonResponse } from "@/lib/read-json-response";

type InviteWithStatus = ChainInvite & { status: ChainInviteStatus };

const statusBadgeStyles: Record<string, string> = {
  pending: "bg-amber-100 text-amber-800",
  accepted: "bg-emerald-100 text-emerald-800",
  declined: "bg-rose-100 text-rose-700",
};

const statusLabels: Record<string, string> = {
  pending: "Offen",
  accepted: "Dabei",
  declined: "Abgesagt",
};

function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] ${statusBadgeStyles[status] ?? statusBadgeStyles.pending}`}
    >
      {statusLabels[status] ?? status}
    </span>
  );
}

export function ChainInviteView({ initialInvite }: { initialInvite: InviteWithStatus }) {
  const [invite, setInvite] = useState<InviteWithStatus>(initialInvite);
  const [respondingId, setRespondingId] = useState<string | null>(null);
  const [contactDraft, setContactDraft] = useState("");
  const [busy, setBusy] = useState<"accept" | "decline" | null>(null);
  const [message, setMessage] = useState("");
  const [messageTone, setMessageTone] = useState<"success" | "error">("success");

  async function respond(participantId: string, decision: "accepted" | "declined") {
    setBusy(decision === "accepted" ? "accept" : "decline");
    setMessage("");

    try {
      const response = await fetch(`/api/chain-invites/${invite.id}/respond`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          participantId,
          decision,
          contact: decision === "accepted" && contactDraft.trim() ? contactDraft.trim() : undefined,
        }),
      });
      const payload = await readJsonResponse<{
        message?: string;
        invite?: InviteWithStatus;
      }>(response);

      if (!response.ok || !payload.invite) {
        throw new Error(payload.message || "Antwort konnte nicht gespeichert werden.");
      }

      setInvite(payload.invite);
      setMessageTone("success");
      setMessage(payload.message || "Gespeichert.");
      setRespondingId(null);
      setContactDraft("");
    } catch (error) {
      setMessageTone("error");
      setMessage(
        error instanceof Error ? error.message : "Antwort konnte nicht gespeichert werden."
      );
    } finally {
      setBusy(null);
    }
  }

  const chainDead = invite.status === "declined";
  const chainComplete = invite.status === "accepted";
  const acceptedCount = invite.participants.filter((p) => p.status === "accepted").length;

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#f8f5ee_0%,#f1eadc_100%)] px-4 py-10 text-slate-900 md:px-10">
      <div className="mx-auto max-w-4xl space-y-8">
        <header>
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-amber-700">
            Ringtausch-Vorschlag
          </p>
          <h1 className="mt-3 text-3xl font-black tracking-tight text-slate-950 md:text-5xl">
            {invite.title}
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-600 md:text-base">
            Mehrere Tauschanzeigen passen zusammen wie ein Kreis: Jeder gibt seinen Artikel einmal
            weiter und bekommt genau das, was er sucht — auch wenn kein direkter Tausch möglich
            wäre.
          </p>
          {invite.note ? (
            <p className="mt-3 max-w-2xl rounded-2xl border border-amber-200 bg-white/80 px-4 py-3 text-sm leading-6 text-slate-600">
              {invite.note}
            </p>
          ) : null}
        </header>

        {/* Status banner */}
        {chainComplete ? (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-4">
            <p className="flex items-center gap-2 text-base font-bold text-emerald-900">
              <CheckCircle2 className="size-5" /> Alle sind dabei! Der Ring steht.
            </p>
            <p className="mt-1 text-sm leading-6 text-emerald-800">
              Unten seht ihr die Kontakte, die geteilt wurden. Schreibt euch direkt und klärt den
              Versand gemeinsam.
            </p>
          </div>
        ) : chainDead ? (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 px-5 py-4">
            <p className="flex items-center gap-2 text-base font-bold text-rose-800">
              <XCircle className="size-5" /> Diese Kette ist leider geplatzt.
            </p>
            <p className="mt-1 text-sm leading-6 text-rose-700">
              Jemand hat abgesagt. Vielleicht ergibt sich mit anderen Anzeigen ein neuer Ring.
            </p>
          </div>
        ) : (
          <div className="rounded-2xl border border-amber-200 bg-white/80 px-5 py-4">
            <p className="text-sm font-semibold text-slate-800">
              {acceptedCount} von {invite.participants.length} haben bisher zugesagt.
            </p>
            <p className="mt-1 text-sm leading-6 text-slate-600">
              Finde deine Anzeige unten und bestätige mit einem Klick, ob du dabei bist.
            </p>
          </div>
        )}

        {/* The loop */}
        <section className="space-y-3">
          {invite.participants.map((participant, index) => {
            const isResponding = respondingId === participant.id;
            const receivesFrom =
              invite.participants[(index - 1 + invite.participants.length) % invite.participants.length];
            const givesTo = invite.participants[(index + 1) % invite.participants.length];

            return (
              <div key={participant.id}>
                <div className="rounded-[1.5rem] border border-white/80 bg-white/90 p-5 shadow-[0_10px_30px_rgba(91,70,37,0.07)]">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-lg font-black text-slate-950">{participant.label}</p>
                      <p className="mt-1 text-sm leading-6 text-slate-700">
                        Gibt: <span className="font-semibold text-slate-900">{participant.gives}</span>
                        {" · "}
                        Sucht: <span className="font-semibold text-amber-800">{participant.wants}</span>
                      </p>
                      <p className="mt-1 text-xs leading-5 text-slate-500">
                        Bekommt <span className="font-medium">{receivesFrom?.gives}</span> von{" "}
                        {receivesFrom?.label} · Gibt {participant.gives} an {givesTo?.label}
                      </p>
                      {participant.listingUrl ? (
                        <a
                          href={participant.listingUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mt-2 inline-flex items-center gap-1 text-sm font-semibold text-amber-800 hover:text-amber-900"
                        >
                          Anzeige ansehen <ExternalLink className="size-3.5" />
                        </a>
                      ) : null}
                    </div>
                    <StatusBadge status={participant.status} />
                  </div>

                  {participant.status === "pending" && !chainDead && !chainComplete ? (
                    <div className="mt-4 border-t border-slate-100 pt-4">
                      {isResponding ? (
                        <div className="space-y-3">
                          <label className="block">
                            <span className="mb-1 block text-xs font-semibold text-slate-600">
                              Kontakt für die anderen (optional, z.&nbsp;B. E-Mail — wird erst
                              geteilt, wenn alle zugesagt haben)
                            </span>
                            <input
                              value={contactDraft}
                              onChange={(event) => setContactDraft(event.target.value)}
                              placeholder="name@beispiel.de"
                              className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900 focus:border-amber-400 focus:outline-none"
                            />
                          </label>
                          <div className="flex flex-wrap gap-2">
                            <Button
                              type="button"
                              size="sm"
                              disabled={busy !== null}
                              className="rounded-full bg-emerald-600 text-white hover:bg-emerald-700"
                              onClick={() => void respond(participant.id, "accepted")}
                            >
                              {busy === "accept" ? (
                                <LoaderCircle className="size-4 animate-spin" />
                              ) : (
                                <CheckCircle2 className="size-4" />
                              )}
                              Zusage bestätigen
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              disabled={busy !== null}
                              className="rounded-full border-rose-300 bg-rose-50 text-rose-700 hover:bg-rose-100"
                              onClick={() => void respond(participant.id, "declined")}
                            >
                              {busy === "decline" ? (
                                <LoaderCircle className="size-4 animate-spin" />
                              ) : (
                                <XCircle className="size-4" />
                              )}
                              Absagen
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              disabled={busy !== null}
                              className="rounded-full border-slate-300 bg-white text-slate-600"
                              onClick={() => {
                                setRespondingId(null);
                                setContactDraft("");
                              }}
                            >
                              Zurück
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <Button
                          type="button"
                          size="sm"
                          className="rounded-full bg-slate-950 text-white hover:bg-slate-800"
                          onClick={() => {
                            setRespondingId(participant.id);
                            setContactDraft("");
                            setMessage("");
                          }}
                        >
                          Das bin ich — antworten
                        </Button>
                      )}
                    </div>
                  ) : null}

                  {chainComplete && participant.contact ? (
                    <div className="mt-4 rounded-2xl bg-emerald-50 px-4 py-3">
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-800">
                        Kontakt
                      </p>
                      <p className="mt-1 font-mono text-sm text-emerald-900">{participant.contact}</p>
                    </div>
                  ) : null}
                </div>

                {index < invite.participants.length - 1 ? (
                  <div className="flex justify-center py-1 text-amber-600">
                    <ArrowDown className="size-5" />
                  </div>
                ) : (
                  <div className="flex items-center justify-center gap-2 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-amber-700">
                    <ArrowRight className="size-4 rotate-[135deg]" /> zurück zu{" "}
                    {invite.participants[0]?.label}
                  </div>
                )}
              </div>
            );
          })}
        </section>

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

        {/* Trust protocol */}
        <section className="rounded-[1.5rem] border border-white/80 bg-white/90 p-6">
          <p className="flex items-center gap-2 text-sm font-bold uppercase tracking-[0.2em] text-slate-800">
            <ShieldCheck className="size-5 text-emerald-700" /> So läuft es fair ab
          </p>
          <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm leading-6 text-slate-700">
            <li>Alle Beteiligten sagen hier auf dieser Seite zu — vorher passiert nichts.</li>
            <li>
              Danach schreibt ihr euch direkt (über die Anzeigen oder die geteilten Kontakte) und
              vereinbart den Ablauf gemeinsam.
            </li>
            <li>
              Versand nur versichert und <strong>gleichzeitig</strong>: Alle teilen zuerst ihre
              Sendungsnummern, dann geben alle am selben Tag ihr Paket ab. So geht niemand in
              Vorleistung.
            </li>
            <li>Bei Abholung vor Ort: Übergabe Zug um Zug, wie bei jedem normalen Tausch.</li>
          </ol>
        </section>

        <footer className="pb-6 text-center text-xs leading-6 text-slate-500">
          Dieser Ringtausch wurde manuell vermittelt — ein nicht-kommerzielles Experiment.
          <br />
          Der Vermittler verdient nichts daran und ist am Tausch selbst nicht beteiligt.{" "}
          <a href="/pitch" className="font-semibold text-amber-800 hover:text-amber-900">
            Mehr über das Konzept
          </a>
        </footer>
      </div>
    </main>
  );
}
