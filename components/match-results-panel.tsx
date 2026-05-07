import {
  CheckCircle2,
  GitCompareArrows,
  LoaderCircle,
  MapPin,
  Scale,
  Send,
  Shield,
  Star,
  TimerReset,
  XCircle,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { type ChainProposal, type ChainProposalStatus } from "@/lib/chain-proposals";
import {
  buildChainMetrics,
  buildWhyThisMatch,
  formatComparisonWinner,
  type MatchResultChain,
} from "@/lib/match-results";

type CompareMetric = {
  legacy: number;
  graph: number;
  delta: number;
  winner: "legacy" | "graph" | "tie";
};

type CompareDifferences = {
  candidateOnlyInLegacy: string[];
  candidateOnlyInGraph: string[];
  selectedOnlyInLegacy: string[];
  selectedOnlyInGraph: string[];
  scoreMismatches: Array<{
    chain: string;
    legacyScore: number;
    graphScore: number;
    delta: number;
  }>;
  topCandidateChange?: {
    legacy: string;
    graph: string;
  };
  topSelectedChange?: {
    legacy: string;
    graph: string;
  };
  summaryMetricComparisons: {
    coverage: CompareMetric;
    disjointChainCount: CompareMetric;
    averageChainQuality: CompareMetric;
    trustAverage: CompareMetric;
    valueFairness: CompareMetric;
  };
  graphBetterOn: string[];
  legacyBetterOn: string[];
};

type CompareEnginePayload = {
  candidateChainCount: number;
  selectedChainCount: number;
  averageCandidateScore: number;
  averageSelectedScore: number;
  durationMs: number;
  summaryMetrics: {
    totalListings: number;
    selectedListingCount: number;
    coverage: number;
    disjointChainCount: number;
    averageChainQuality: number;
    trustAverage: number;
    valueFairness: number;
  };
  candidateChains: MatchResultChain[];
  selectedChains: MatchResultChain[];
};

export type MatchExplorerResponse =
  | {
      mode: "listing" | "trade-request";
      listing?: unknown;
      have?: string;
      want?: string;
      maxHops: number;
      totalListings: number;
      chainCount: number;
      chains: MatchResultChain[];
      engine?: undefined;
    }
  | {
      mode: "listing" | "trade-request";
      listing?: unknown;
      have?: string;
      want?: string;
      maxHops: number;
      totalListings: number;
      engine: "compare";
      comparison: {
        legacy: CompareEnginePayload;
        graph: CompareEnginePayload;
        differences: CompareDifferences;
      };
    };

type MatchResultsPanelProps = {
  engineMode: "legacy" | "graph" | "compare";
  matchData: MatchExplorerResponse | null;
  matchError: string;
  proposalsByChainId?: Record<string, ChainProposal>;
  onCreateProposal?: (chain: MatchResultChain) => Promise<void>;
  onRespondToProposal?: (
    proposalId: string,
    listingId: string,
    decision: "accept" | "decline"
  ) => Promise<void>;
  proposalActionState?: {
    type: "create" | "decision";
    chainId?: string;
    proposalId?: string;
    listingId?: string;
    decision?: "accept" | "decline";
  } | null;
};

const metricIcons = {
  score: Star,
  trust: Shield,
  fairness: Scale,
  city: MapPin,
  length: TimerReset,
};

const engineCardClasses = {
  legacy: "border-slate-200 bg-white/90",
  graph: "border-emerald-200 bg-emerald-50/70",
};

const proposalStatusStyles: Record<ChainProposalStatus, string> = {
  pending: "bg-amber-100 text-amber-800",
  accepted: "bg-emerald-100 text-emerald-800",
  declined: "bg-rose-100 text-rose-700",
};

function ProposalStatusBadge({ status }: { status: ChainProposalStatus }) {
  return (
    <span
      className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] ${proposalStatusStyles[status]}`}
    >
      {status}
    </span>
  );
}

function MetricBar({
  label,
  display,
  value,
  hint,
  metricKey,
}: {
  label: string;
  display: string;
  value: number;
  hint: string;
  metricKey: "score" | "trust" | "fairness" | "city" | "length";
}) {
  const Icon = metricIcons[metricKey];

  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
          <Icon className="size-4 text-amber-700" />
          {label}
        </div>
        <span className="text-sm font-bold text-slate-950">{display}</span>
      </div>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-200">
        <div className="h-full rounded-full bg-[linear-gradient(90deg,#f59e0b,#0f172a)]" style={{ width: `${value}%` }} />
      </div>
      <p className="mt-2 text-xs leading-5 text-slate-500">{hint}</p>
    </div>
  );
}

function ChainCard({
  chain,
  index,
  maxHops,
  engineLabel,
  proposal,
  onCreateProposal,
  onRespondToProposal,
  proposalActionState,
}: {
  chain: MatchResultChain;
  index: number;
  maxHops: number;
  engineLabel?: string;
  proposal?: ChainProposal;
  onCreateProposal?: (chain: MatchResultChain) => Promise<void>;
  onRespondToProposal?: (
    proposalId: string,
    listingId: string,
    decision: "accept" | "decline"
  ) => Promise<void>;
  proposalActionState?: MatchResultsPanelProps["proposalActionState"];
}) {
  const metrics = buildChainMetrics(chain, maxHops);
  const insights = buildWhyThisMatch(chain, maxHops);
  const isCreatingProposal =
    proposalActionState?.type === "create" && proposalActionState.chainId === chain.chainId;

  return (
    <Card className="rounded-[1.75rem] border-white/80 bg-white/92 py-0 shadow-[0_20px_60px_rgba(91,70,37,0.09)]">
      <CardHeader className="space-y-4 p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <CardTitle className="text-2xl font-black text-slate-950">
              {engineLabel ? `${engineLabel} chain ${index + 1}` : `Chain ${index + 1}`}
            </CardTitle>
            <CardDescription className="mt-2 text-sm leading-7 text-slate-600">
              {chain.summary}
            </CardDescription>
          </div>
          <div className="rounded-full bg-emerald-100 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-emerald-800">
            Score {chain.score.toFixed(2)}
          </div>
        </div>

        <div className="rounded-[1.5rem] border border-slate-200 bg-slate-50/80 p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-700">
                Trade proposal
              </p>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                {proposal
                  ? "This chain has a stored proposal with participant-level responses."
                  : "Promote this ranked chain into a real trade proposal for all listed participants."}
              </p>
            </div>
            {proposal ? <ProposalStatusBadge status={proposal.status} /> : null}
          </div>

          {!proposal && onCreateProposal ? (
            <div className="mt-4">
              <Button
                type="button"
                size="sm"
                disabled={isCreatingProposal}
                className="rounded-full bg-slate-950 text-white hover:bg-slate-800"
                onClick={() => {
                  void onCreateProposal(chain);
                }}
              >
                {isCreatingProposal ? (
                  <LoaderCircle className="size-4 animate-spin" />
                ) : (
                  <Send className="size-4" />
                )}
                {isCreatingProposal ? "Creating proposal..." : "Propose this chain"}
              </Button>
            </div>
          ) : null}

          {proposal ? (
            <div className="mt-4 space-y-3">
              {proposal.participants.map((participant) => {
                const isAccepting =
                  proposalActionState?.type === "decision" &&
                  proposalActionState.proposalId === proposal.id &&
                  proposalActionState.listingId === participant.listingId &&
                  proposalActionState.decision === "accept";
                const isDeclining =
                  proposalActionState?.type === "decision" &&
                  proposalActionState.proposalId === proposal.id &&
                  proposalActionState.listingId === participant.listingId &&
                  proposalActionState.decision === "decline";
                const canRespond = proposal.status === "pending" && participant.status === "pending";

                return (
                  <div
                    key={participant.listingId}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-white px-4 py-3"
                  >
                    <div>
                      <p className="text-sm font-semibold text-slate-900">{participant.name}</p>
                      <p className="mt-1 text-xs uppercase tracking-[0.18em] text-slate-500">
                        Listing {participant.listingId}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <ProposalStatusBadge status={participant.status} />
                      {canRespond && onRespondToProposal ? (
                        <>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            disabled={isAccepting || isDeclining}
                            className="rounded-full border-emerald-300 bg-emerald-50 text-emerald-800 hover:bg-emerald-100"
                            onClick={() => {
                              void onRespondToProposal(proposal.id, participant.listingId, "accept");
                            }}
                          >
                            {isAccepting ? (
                              <LoaderCircle className="size-4 animate-spin" />
                            ) : (
                              <CheckCircle2 className="size-4" />
                            )}
                            Accept
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            disabled={isAccepting || isDeclining}
                            className="rounded-full border-rose-300 bg-rose-50 text-rose-700 hover:bg-rose-100"
                            onClick={() => {
                              void onRespondToProposal(proposal.id, participant.listingId, "decline");
                            }}
                          >
                            {isDeclining ? (
                              <LoaderCircle className="size-4 animate-spin" />
                            ) : (
                              <XCircle className="size-4" />
                            )}
                            Decline
                          </Button>
                        </>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : null}
        </div>

        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          {metrics.map((metric) => (
            <MetricBar
              key={metric.key}
              label={metric.label}
              display={metric.display}
              value={metric.value}
              hint={metric.hint}
              metricKey={metric.key}
            />
          ))}
        </div>

        <div className="rounded-[1.5rem] border border-amber-100 bg-amber-50/80 p-5">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-amber-800">
            Why this match?
          </p>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {insights.map((insight) => (
              <div key={insight.title} className="rounded-2xl bg-white/80 p-4">
                <p className="text-sm font-semibold text-slate-900">{insight.title}</p>
                <p className="mt-2 text-sm leading-6 text-slate-600">{insight.body}</p>
              </div>
            ))}
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {chain.reasons.map((reason) => (
              <span
                key={reason}
                className="rounded-full bg-white px-3 py-1 text-xs font-medium text-slate-600"
              >
                {reason}
              </span>
            ))}
          </div>
        </div>
      </CardHeader>
      <CardContent className="grid gap-4 p-6 pt-0 md:grid-cols-2">
        {chain.listings.map((listing, listingIndex) => {
          const next = chain.listings[(listingIndex + 1) % chain.listings.length];

          return (
            <div key={listing.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                    Step {listingIndex + 1}
                  </p>
                  <p className="mt-1 text-lg font-bold text-slate-950">{listing.trader}</p>
                </div>
                <div className="text-right text-xs uppercase tracking-[0.18em] text-slate-500">
                  {listing.city}
                </div>
              </div>
              <div className="mt-4 space-y-2 text-sm text-slate-700">
                <p>
                  Gives: <span className="font-semibold">{listing.gives}</span>
                </p>
                <p>
                  Wants: <span className="font-semibold">{listing.wants.join(", ")}</span>
                </p>
                <p>
                  Value / trust: <span className="font-semibold">EUR {listing.estimatedValue}</span> /{" "}
                  <span className="font-semibold">{listing.trustScore.toFixed(1)}</span>
                </p>
                <p className="rounded-xl bg-white px-3 py-2 text-slate-600">
                  Passes item to <span className="font-semibold">{next.trader}</span>
                </p>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}

function CompareOverview({ comparison }: { comparison: MatchExplorerResponse & { engine: "compare" } }) {
  const metricHighlights = [
    ["Coverage", comparison.comparison.differences.summaryMetricComparisons.coverage],
    ["Chain quality", comparison.comparison.differences.summaryMetricComparisons.averageChainQuality],
    ["Trust average", comparison.comparison.differences.summaryMetricComparisons.trustAverage],
    ["Value fairness", comparison.comparison.differences.summaryMetricComparisons.valueFairness],
  ] as const;

  return (
    <div className="space-y-4">
      <Card className="rounded-[1.75rem] border-slate-200 bg-slate-950 py-0 text-white">
        <CardHeader className="p-6">
          <div className="flex items-center gap-3">
            <div className="flex size-12 items-center justify-center rounded-2xl bg-white/10">
              <GitCompareArrows className="size-5" />
            </div>
            <div>
              <CardTitle className="text-2xl font-black">Compare mode inspector</CardTitle>
              <CardDescription className="mt-1 text-sm leading-6 text-slate-300">
                Legacy remains available while graph behavior is inspected side by side.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="grid gap-3 p-6 pt-0 md:grid-cols-2 xl:grid-cols-4">
          {metricHighlights.map(([label, entry]) => (
            <div key={label} className="rounded-2xl bg-white/8 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">{label}</p>
              <p className="mt-2 text-sm leading-6 text-white">
                {formatComparisonWinner(label, entry.winner, entry.delta)}
              </p>
              <p className="mt-2 text-xs text-slate-400">
                Legacy {entry.legacy.toFixed(2)} vs Graph {entry.graph.toFixed(2)}
              </p>
            </div>
          ))}
        </CardContent>
      </Card>

      <div className="grid gap-4 xl:grid-cols-2">
        {(["legacy", "graph"] as const).map((engineKey) => {
          const engine = comparison.comparison[engineKey];
          const title = engineKey === "legacy" ? "Legacy" : "Graph";

          return (
            <Card key={engineKey} className={`rounded-[1.75rem] py-0 ${engineCardClasses[engineKey]}`}>
              <CardHeader className="space-y-3 p-6">
                <div className="flex items-center justify-between gap-3">
                  <CardTitle className="text-2xl font-black text-slate-950">{title}</CardTitle>
                  <div className="rounded-full bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-slate-600">
                    {engine.durationMs.toFixed(2)} ms
                  </div>
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                  <div className="rounded-2xl bg-white/80 p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Selection</p>
                    <p className="mt-2 text-sm text-slate-700">
                      {engine.selectedChainCount} selected from {engine.candidateChainCount} candidates
                    </p>
                  </div>
                  <div className="rounded-2xl bg-white/80 p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Outcome quality</p>
                    <p className="mt-2 text-sm text-slate-700">
                      Avg score {engine.averageSelectedScore.toFixed(2)}, coverage {engine.summaryMetrics.coverage.toFixed(2)}%
                    </p>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="grid gap-3 p-6 pt-0 md:grid-cols-3">
                <MetricBar
                  label="Trust strength"
                  display={`${engine.summaryMetrics.trustAverage.toFixed(1)} / 5`}
                  value={Math.round((engine.summaryMetrics.trustAverage / 5) * 100)}
                  hint="Average trust across selected listings."
                  metricKey="trust"
                />
                <MetricBar
                  label="Value fairness"
                  display={`${engine.summaryMetrics.valueFairness.toFixed(0)}%`}
                  value={Math.round(engine.summaryMetrics.valueFairness)}
                  hint="Average fairness across selected chains."
                  metricKey="fairness"
                />
                <MetricBar
                  label="Disjoint chains"
                  display={engine.summaryMetrics.disjointChainCount.toFixed(0)}
                  value={Math.min(100, engine.summaryMetrics.disjointChainCount * 25)}
                  hint="Non-overlapping chains selected for the current dataset."
                  metricKey="length"
                />
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card className="rounded-[1.75rem] border-white/80 bg-white/90 py-0">
        <CardHeader className="p-6">
          <CardTitle className="text-2xl font-black text-slate-950">Difference summary</CardTitle>
          <CardDescription className="mt-1 text-sm leading-6 text-slate-600">
            Useful for inspecting why rankings or selected chains diverge during migration.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 p-6 pt-0 md:grid-cols-2">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-sm font-semibold text-slate-900">Engine advantages</p>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Graph wins on: {comparison.comparison.differences.graphBetterOn.length > 0 ? comparison.comparison.differences.graphBetterOn.join(", ") : "none"}
            </p>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Legacy wins on: {comparison.comparison.differences.legacyBetterOn.length > 0 ? comparison.comparison.differences.legacyBetterOn.join(", ") : "none"}
            </p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-sm font-semibold text-slate-900">Selection drift</p>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Graph-only selected chains: {comparison.comparison.differences.selectedOnlyInGraph.length}
            </p>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Legacy-only selected chains: {comparison.comparison.differences.selectedOnlyInLegacy.length}
            </p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 md:col-span-2">
            <p className="text-sm font-semibold text-slate-900">Largest score mismatches</p>
            {comparison.comparison.differences.scoreMismatches.length === 0 ? (
              <p className="mt-2 text-sm leading-6 text-slate-600">No score drift for overlapping sampled chains.</p>
            ) : (
              <div className="mt-3 grid gap-2">
                {comparison.comparison.differences.scoreMismatches.map((entry) => (
                  <div key={entry.chain} className="rounded-xl bg-white p-3 text-sm text-slate-600">
                    {entry.chain}: legacy {entry.legacyScore.toFixed(2)} vs graph {entry.graphScore.toFixed(2)} ({entry.delta > 0 ? "+" : ""}{entry.delta.toFixed(2)})
                  </div>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 xl:grid-cols-2">
        <div className="space-y-4">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">Legacy selected chains</p>
          {comparison.comparison.legacy.selectedChains.length === 0 ? (
            <Card className="rounded-[1.75rem] border-white/80 bg-white/80 py-0">
              <CardContent className="p-6 text-sm leading-7 text-slate-600">Legacy selected no chains for this request.</CardContent>
            </Card>
          ) : (
            comparison.comparison.legacy.selectedChains.map((chain, index) => (
              <ChainCard key={`legacy-${chain.summary}-${index}`} chain={chain} index={index} maxHops={comparison.maxHops} engineLabel="Legacy" />
            ))
          )}
        </div>
        <div className="space-y-4">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">Graph selected chains</p>
          {comparison.comparison.graph.selectedChains.length === 0 ? (
            <Card className="rounded-[1.75rem] border-white/80 bg-white/80 py-0">
              <CardContent className="p-6 text-sm leading-7 text-slate-600">Graph selected no chains for this request.</CardContent>
            </Card>
          ) : (
            comparison.comparison.graph.selectedChains.map((chain, index) => (
              <ChainCard key={`graph-${chain.summary}-${index}`} chain={chain} index={index} maxHops={comparison.maxHops} engineLabel="Graph" />
            ))
          )}
        </div>
      </div>
    </div>
  );
}

export function MatchResultsPanel({
  engineMode,
  matchData,
  matchError,
  proposalsByChainId,
  onCreateProposal,
  onRespondToProposal,
  proposalActionState,
}: MatchResultsPanelProps) {
  const isCompareMode = matchData?.engine === "compare";

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">
            Matching results
          </p>
          <h3 className="mt-1 text-2xl font-black text-slate-950">
            {matchData
              ? isCompareMode
                ? "Compare-mode diagnostics"
                : `${matchData.chainCount} chains found`
              : "Waiting for results"}
          </h3>
        </div>
        {matchData ? (
          <div className="rounded-full bg-white px-4 py-2 text-sm text-slate-600 shadow-sm">
            Dataset: {matchData.totalListings} listings
          </div>
        ) : null}
      </div>

      {matchData ? (
        <Card className="rounded-[1.75rem] border-white/80 bg-white/80 py-0">
          <CardContent className="flex flex-wrap items-center justify-between gap-3 p-5 text-sm text-slate-700">
            <div>
              Query: trade <span className="font-semibold">{matchData.have}</span> for <span className="font-semibold">{matchData.want}</span>
            </div>
            <div className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-slate-600">
              Mode {engineMode}
            </div>
          </CardContent>
        </Card>
      ) : null}

      {matchError ? (
        <Card className="rounded-[1.75rem] border-rose-200 bg-rose-50 py-0">
          <CardContent className="p-6 text-sm text-rose-700">{matchError}</CardContent>
        </Card>
      ) : null}

      {!matchError && !matchData ? (
        <Card className="rounded-[1.75rem] border-white/80 bg-white/80 py-0">
          <CardContent className="p-6 text-sm leading-7 text-slate-600">
            Choose what you have and what you want to inspect ranked chains. Compare mode keeps legacy and graph side by side for development.
          </CardContent>
        </Card>
      ) : null}

      {!matchError && matchData?.engine !== "compare" && matchData?.chains.length === 0 ? (
        <Card className="rounded-[1.75rem] border-white/80 bg-white/80 py-0">
          <CardContent className="p-6 text-sm leading-7 text-slate-600">
            No chain was found for this request with the current hop limit. Try a higher limit or another item pair.
          </CardContent>
        </Card>
      ) : null}

      {matchData?.engine === "compare" ? <CompareOverview comparison={matchData} /> : null}

      {matchData?.engine !== "compare"
        ? matchData?.chains.map((chain, chainIndex) => (
            <ChainCard
              key={`${chain.summary}-${chainIndex}`}
              chain={chain}
              index={chainIndex}
              maxHops={matchData.maxHops}
              proposal={proposalsByChainId?.[chain.chainId]}
              onCreateProposal={onCreateProposal}
              onRespondToProposal={onRespondToProposal}
              proposalActionState={proposalActionState}
            />
          ))
        : null}
    </div>
  );
}

