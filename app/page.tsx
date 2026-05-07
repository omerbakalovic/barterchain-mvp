'use client';

import { FormEvent, useEffect, useMemo, useState, useTransition } from "react";
import { motion, type Variants } from "framer-motion";
import {
  ArrowRight,
  Boxes,
  Leaf,
  Link2,
  Mail,
  PackageCheck,
  PlusCircle,
  Route,
  Search,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

import { MatchResultsPanel, type MatchExplorerResponse } from "@/components/match-results-panel";
import { Button } from "@/components/ui/button";
import { toChainProposalPayload, type ChainProposal } from "@/lib/chain-proposals";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { type MatchResultChain } from "@/lib/match-results";
import { buildItemOptions, demoListings } from "@/lib/barter-data";
import {
  MAX_TRUST_SCORE,
  MIN_TRUST_SCORE,
  toBarterListing,
  type StoredListing,
} from "@/lib/listings";

const steps = [
  {
    title: "List what you have",
    description:
      "Post an item you no longer use and describe what would make the trade worthwhile for you.",
    icon: Boxes,
  },
  {
    title: "Match through chains",
    description:
      "BarterChain connects several people into one circular swap so nobody needs a direct one-to-one match.",
    icon: Route,
  },
  {
    title: "Confirm and ship",
    description:
      "Each participant gets a clear route, shipping guidance, and visibility into the environmental impact.",
    icon: PackageCheck,
  },
];

const demoChain = [
  { user: "Lena", gives: "espresso machine", wants: "standing desk lamp" },
  { user: "Samir", gives: "desk lamp", wants: "city bike helmet" },
  { user: "Noah", gives: "bike helmet", wants: "vinyl record player" },
  { user: "Mira", gives: "record player", wants: "espresso machine" },
];

const highlights = [
  {
    title: "Multi-hop instead of dead ends",
    description:
      "Users do not need a perfect direct match. The engine searches for trade loops across several people.",
    icon: Link2,
  },
  {
    title: "Lower waste, higher utility",
    description:
      "Useful products stay in circulation longer and every completed chain reduces unnecessary new purchases.",
    icon: Leaf,
  },
  {
    title: "Built for trusted swaps",
    description:
      "The MVP is designed around transparent chain previews, confirmation checkpoints, and future escrow integrations.",
    icon: ShieldCheck,
  },
];

const fadeInUp: Variants = {
  hidden: { opacity: 0, y: 24 },
  show: (index: number = 0) => ({
    opacity: 1,
    y: 0,
    transition: {
      delay: 0.08 * index,
      duration: 0.55,
      ease: [0.16, 1, 0.3, 1],
    },
  }),
};

type ListingsApiResponse = {
  listings: StoredListing[];
  count: number;
};

type ChainProposalsApiResponse = {
  proposals: ChainProposal[];
  count: number;
};

type ListingFormState = {
  title: string;
  description: string;
  category: string;
  valueEstimate: string;
  city: string;
  trustScore: string;
  gives: string;
  wants: string;
};

const initialListingForm: ListingFormState = {
  title: "",
  description: "",
  category: "",
  valueEstimate: "",
  city: "",
  trustScore: "4.5",
  gives: "",
  wants: "",
};

export default function LandingPage() {
  const [email, setEmail] = useState("");
  const [useCase, setUseCase] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState("");
  const [storedListings, setStoredListings] = useState<StoredListing[]>([]);
  const [listingsLoaded, setListingsLoaded] = useState(false);
  const [listingStatus, setListingStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [listingMessage, setListingMessage] = useState("");
  const [listingForm, setListingForm] = useState<ListingFormState>(initialListingForm);
  const [haveItem, setHaveItem] = useState("");
  const [wantItem, setWantItem] = useState("");
  const [maxHops, setMaxHops] = useState("6");
  const [engineMode, setEngineMode] = useState<"legacy" | "graph" | "compare">("legacy");
  const [matchData, setMatchData] = useState<MatchExplorerResponse | null>(null);
  const [matchError, setMatchError] = useState("");
  const [proposalMessage, setProposalMessage] = useState("");
  const [proposalMessageTone, setProposalMessageTone] = useState<"success" | "error">("success");
  const [chainProposals, setChainProposals] = useState<ChainProposal[]>([]);
  const [proposalActionState, setProposalActionState] = useState<{
    type: "create" | "decision";
    chainId?: string;
    proposalId?: string;
    listingId?: string;
    decision?: "accept" | "decline";
  } | null>(null);
  const [isPending, startTransition] = useTransition();

  const matcherListings = useMemo(
    () => [...demoListings, ...storedListings.map(toBarterListing)],
    [storedListings]
  );
  const itemOptions = useMemo(() => buildItemOptions(matcherListings), [matcherListings]);
  const stats = useMemo(
    () => [
      {
        value: `${matcherListings.length}`,
        label: "matchable listings across demo and submitted inventory",
      },
      { value: `${storedListings.length}`, label: "real user listings saved to storage" },
      { value: "scored", label: "results ranked instead of returned arbitrarily" },
    ],
    [matcherListings.length, storedListings.length]
  );

  const proposalsByChainId = useMemo(
    () =>
      Object.fromEntries(chainProposals.map((proposal) => [proposal.chainId, proposal])) as Record<
        string,
        ChainProposal
      >,
    [chainProposals]
  );
  async function loadStoredListings() {
    try {
      const response = await fetch("/api/listings");
      const payload = (await response.json()) as ListingsApiResponse & { message?: string };

      if (!response.ok) {
        throw new Error(payload.message || "Could not load listings.");
      }

      setStoredListings(payload.listings);
    } catch {
      setStoredListings([]);
    } finally {
      setListingsLoaded(true);
    }
  }

  useEffect(() => {
    void loadStoredListings();
  }, []);


  async function loadChainProposals() {
    try {
      const response = await fetch("/api/chain-proposals");
      const payload = (await response.json()) as ChainProposalsApiResponse & { message?: string };

      if (!response.ok) {
        throw new Error(payload.message || "Could not load chain proposals.");
      }

      setChainProposals(payload.proposals);
    } catch {
      setChainProposals([]);
    }
  }

  useEffect(() => {
    void loadChainProposals();
  }, []);
  useEffect(() => {
    if (itemOptions.length === 0) {
      return;
    }

    setHaveItem((current) =>
      current && itemOptions.some((option) => option.value === current)
        ? current
        : (itemOptions[0]?.value ?? "")
    );

    setWantItem((current) => {
      if (current && itemOptions.some((option) => option.value === current)) {
        return current;
      }

      return itemOptions[1]?.value ?? itemOptions[0]?.value ?? "";
    });
  }, [itemOptions]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("loading");
    setMessage("");

    try {
      const response = await fetch("/api/waitlist", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, useCase }),
      });

      const payload = (await response.json()) as { message?: string };

      if (!response.ok) {
        throw new Error(payload.message || "Something went wrong.");
      }

      setStatus("success");
      setMessage(payload.message || "You are on the waitlist.");
      setEmail("");
      setUseCase("");
    } catch (error) {
      setStatus("error");
      setMessage(error instanceof Error ? error.message : "We could not save your request.");
    }
  }

  async function handleListingSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setListingStatus("loading");
    setListingMessage("");

    try {
      const response = await fetch("/api/listings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: listingForm.title,
          description: listingForm.description,
          category: listingForm.category,
          valueEstimate: Number(listingForm.valueEstimate),
          city: listingForm.city,
          trustScore: Number(listingForm.trustScore),
          gives: listingForm.gives,
          wants: listingForm.wants,
        }),
      });

      const payload = (await response.json()) as {
        message?: string;
        listing?: StoredListing;
        errors?: string[];
      };

      if (!response.ok || !payload.listing) {
        throw new Error(payload.errors?.[0] || payload.message || "Could not create listing.");
      }

      setStoredListings((current) => [payload.listing!, ...current]);
      setListingForm(initialListingForm);
      setListingStatus("success");
      setListingMessage(payload.message || "Listing created.");
    } catch (error) {
      setListingStatus("error");
      setListingMessage(error instanceof Error ? error.message : "Could not create listing.");
    }
  }

  async function loadChains(
    have: string,
    want: string,
    hopLimit: string,
    mode: "legacy" | "graph" | "compare"
  ) {
    setMatchError("");

    if (!have || !want) {
      setMatchData(null);
      return;
    }

    try {
      const params = new URLSearchParams({
        have,
        want,
        maxHops: hopLimit,
        engine: mode,
      });
      const response = await fetch(`/api/match?${params.toString()}`);
      const payload = (await response.json()) as MatchExplorerResponse & { message?: string };

      if (!response.ok) {
        throw new Error(payload.message || "Could not compute barter chains.");
      }

      setMatchData(payload);
    } catch (error) {
      setMatchData(null);
      setMatchError(error instanceof Error ? error.message : "Could not compute barter chains.");
    }
  }


  async function handleCreateProposal(chain: MatchResultChain) {
    setProposalActionState({
      type: "create",
      chainId: chain.chainId,
    });
    setProposalMessage("");

    try {
      const response = await fetch("/api/chain-proposals", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(toChainProposalPayload(chain)),
      });
      const payload = (await response.json()) as {
        message?: string;
        proposal?: ChainProposal;
      };

      if (!response.ok || !payload.proposal) {
        throw new Error(payload.message || "Could not create proposal.");
      }

      setChainProposals((current) => {
        const next = current.filter((proposal) => proposal.id !== payload.proposal?.id);
        return [payload.proposal!, ...next];
      });
      setProposalMessageTone("success");
      setProposalMessage(payload.message || "Chain proposal created.");
    } catch (error) {
      setProposalMessageTone("error");
      setProposalMessage(error instanceof Error ? error.message : "Could not create proposal.");
    } finally {
      setProposalActionState(null);
    }
  }

  async function handleProposalDecision(
    proposalId: string,
    listingId: string,
    decision: "accept" | "decline"
  ) {
    setProposalActionState({
      type: "decision",
      proposalId,
      listingId,
      decision,
    });
    setProposalMessage("");

    try {
      const response = await fetch(`/api/chain-proposals/${proposalId}/${decision}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ listingId }),
      });
      const payload = (await response.json()) as {
        message?: string;
        proposal?: ChainProposal;
      };

      if (!response.ok || !payload.proposal) {
        throw new Error(payload.message || `Could not ${decision} proposal.`);
      }

      setChainProposals((current) =>
        current.map((proposal) => (proposal.id === payload.proposal?.id ? payload.proposal! : proposal))
      );
      setProposalMessageTone("success");
      setProposalMessage(payload.message || "Proposal updated.");
    } catch (error) {
      setProposalMessageTone("error");
      setProposalMessage(error instanceof Error ? error.message : "Could not update proposal.");
    } finally {
      setProposalActionState(null);
    }
  }
  useEffect(() => {
    if (!haveItem || !wantItem || !listingsLoaded) {
      return;
    }

    startTransition(() => {
      void loadChains(haveItem, wantItem, maxHops, engineMode);
    });
  }, [engineMode, haveItem, wantItem, maxHops, listingsLoaded]);

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(255,241,220,0.9),_transparent_35%),linear-gradient(180deg,_#fffdf8_0%,_#f7f2e8_52%,_#efe5d4_100%)] text-slate-900">
      <section className="mx-auto flex max-w-6xl flex-col gap-12 px-6 pb-20 pt-8 md:px-10 lg:px-12">
        <motion.div
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: "easeOut" }}
          className="flex items-center justify-between gap-4"
        >
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-amber-700">
              BarterChain MVP
            </p>
            <p className="mt-2 max-w-md text-sm text-slate-600">
              Circular trading for useful things that should stay in motion.
            </p>
          </div>
          <div className="rounded-full border border-amber-200 bg-white/80 px-4 py-2 text-sm text-slate-600 shadow-sm backdrop-blur">
            Berlin-built, open-source in progress
          </div>
        </motion.div>

        <div className="grid items-center gap-10 lg:grid-cols-[1.15fr_0.85fr]">
          <div className="space-y-8">
            <motion.div
              variants={fadeInUp}
              initial="hidden"
              animate="show"
              custom={0}
              className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm text-emerald-900"
            >
              <Sparkles className="size-4" />
              Multi-hop matching instead of one-to-one barter dead ends
            </motion.div>

            <motion.div variants={fadeInUp} initial="hidden" animate="show" custom={1}>
              <h1 className="max-w-4xl text-5xl font-black leading-[0.95] tracking-tight md:text-7xl">
                Give what you do not use.
                <span className="block text-amber-700">Get what you actually want.</span>
              </h1>
            </motion.div>

            <motion.p
              variants={fadeInUp}
              initial="hidden"
              animate="show"
              custom={2}
              className="max-w-2xl text-lg leading-8 text-slate-700 md:text-xl"
            >
              BarterChain finds circular swap chains across multiple people, helping unused
              items move to their next owner without money changing hands.
            </motion.p>

            <motion.div
              variants={fadeInUp}
              initial="hidden"
              animate="show"
              custom={3}
              className="flex flex-col gap-4 sm:flex-row"
            >
              <Button
                size="lg"
                className="h-13 rounded-full bg-slate-950 px-8 text-base font-semibold text-white hover:bg-slate-800"
                onClick={() => {
                  document.getElementById("listing-form")?.scrollIntoView({ behavior: "smooth" });
                }}
              >
                Create a listing
                <ArrowRight className="size-4" />
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="h-13 rounded-full border-slate-300 bg-white/70 px-8 text-base text-slate-800 hover:bg-white"
                onClick={() => {
                  document.getElementById("chain-lab")?.scrollIntoView({ behavior: "smooth" });
                }}
              >
                Try the chain lab
              </Button>
            </motion.div>

            <motion.div
              variants={fadeInUp}
              initial="hidden"
              animate="show"
              custom={4}
              className="grid gap-4 sm:grid-cols-3"
            >
              {stats.map((stat) => (
                <div
                  key={stat.label}
                  className="rounded-3xl border border-white/70 bg-white/75 p-5 shadow-[0_20px_60px_rgba(148,111,62,0.09)] backdrop-blur"
                >
                  <p className="text-3xl font-black text-slate-950">{stat.value}</p>
                  <p className="mt-2 text-sm leading-6 text-slate-600">{stat.label}</p>
                </div>
              ))}
            </motion.div>
          </div>

          <motion.div
            variants={fadeInUp}
            initial="hidden"
            animate="show"
            custom={3}
            className="relative"
          >
            <div className="absolute inset-0 -rotate-3 rounded-[2rem] bg-amber-300/25 blur-3xl" />
            <Card className="relative overflow-hidden rounded-[2rem] border-amber-100 bg-white/90 py-0 shadow-[0_30px_90px_rgba(84,54,23,0.16)]">
              <div className="border-b border-amber-100 bg-[linear-gradient(135deg,_rgba(255,245,228,0.95),_rgba(255,255,255,0.95))] p-8">
                <p className="text-sm font-semibold uppercase tracking-[0.28em] text-amber-700">
                  Live chain preview
                </p>
                <h2 className="mt-3 text-3xl font-black text-slate-950">
                  Four people. Four useful trades. One closed loop.
                </h2>
                <p className="mt-3 max-w-md text-sm leading-6 text-slate-600">
                  This is the core experience the MVP is working toward: chains that unlock trades
                  even when nobody has a direct pair.
                </p>
              </div>

              <CardContent className="space-y-4 p-6">
                {demoChain.map((entry, index) => (
                  <div
                    key={entry.user}
                    className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
                  >
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">
                          Trader {index + 1}
                        </p>
                        <p className="mt-1 text-xl font-bold text-slate-950">{entry.user}</p>
                      </div>
                      <div className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-emerald-800">
                        Match-ready
                      </div>
                    </div>
                    <div className="mt-4 grid gap-3 text-sm text-slate-700">
                      <div className="rounded-xl bg-white px-4 py-3">
                        Gives: <span className="font-semibold">{entry.gives}</span>
                      </div>
                      <div className="rounded-xl bg-white px-4 py-3">
                        Wants: <span className="font-semibold">{entry.wants}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </section>

      <section className="border-y border-amber-100 bg-white/60 py-16">
        <div className="mx-auto grid max-w-6xl gap-6 px-6 md:grid-cols-3 md:px-10 lg:px-12">
          {steps.map((step, index) => {
            const Icon = step.icon;
            return (
              <motion.div
                key={step.title}
                variants={fadeInUp}
                initial="hidden"
                whileInView="show"
                viewport={{ once: true, amount: 0.35 }}
                custom={index}
              >
                <Card className="h-full rounded-[1.75rem] border-white/80 bg-white/85 py-0 shadow-[0_20px_60px_rgba(91,70,37,0.09)]">
                  <CardHeader className="space-y-4 p-7">
                    <div className="flex size-14 items-center justify-center rounded-2xl bg-slate-950 text-white">
                      <Icon className="size-6" />
                    </div>
                    <CardTitle className="text-2xl font-black">{step.title}</CardTitle>
                    <CardDescription className="text-base leading-7 text-slate-600">
                      {step.description}
                    </CardDescription>
                  </CardHeader>
                </Card>
              </motion.div>
            );
          })}
        </div>
      </section>

      <section id="demo-chain" className="mx-auto max-w-6xl px-6 py-20 md:px-10 lg:px-12">
        <div className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="space-y-5">
            <p className="text-sm font-semibold uppercase tracking-[0.28em] text-amber-700">
              Why this matters
            </p>
            <h2 className="text-4xl font-black leading-tight text-slate-950 md:text-5xl">
              Most barter platforms fail because direct matches are too rare.
            </h2>
            <p className="max-w-xl text-lg leading-8 text-slate-700">
              BarterChain shifts the problem from &ldquo;Who wants exactly what I have?&rdquo; to &ldquo;Can a chain of people satisfy everybody at once?&rdquo;
            </p>
          </div>

          <div className="grid gap-5">
            {highlights.map((highlight, index) => {
              const Icon = highlight.icon;
              return (
                <motion.div
                  key={highlight.title}
                  variants={fadeInUp}
                  initial="hidden"
                  whileInView="show"
                  viewport={{ once: true, amount: 0.35 }}
                  custom={index}
                >
                  <Card className="rounded-[1.75rem] border-slate-200/70 bg-slate-950 py-0 text-white shadow-[0_25px_70px_rgba(15,23,42,0.18)]">
                    <CardContent className="flex gap-4 p-6">
                      <div className="mt-1 flex size-12 shrink-0 items-center justify-center rounded-2xl bg-white/10">
                        <Icon className="size-5" />
                      </div>
                      <div>
                        <h3 className="text-xl font-bold">{highlight.title}</h3>
                        <p className="mt-2 text-sm leading-7 text-slate-300">
                          {highlight.description}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      <section id="chain-lab" className="border-y border-amber-100 bg-[#f8f4ec] py-20">
        <div className="mx-auto max-w-6xl px-6 md:px-10 lg:px-12">
          <div className="grid gap-8 lg:grid-cols-[0.82fr_1.18fr]">
            <div className="space-y-5">
              <p className="text-sm font-semibold uppercase tracking-[0.28em] text-amber-700">
                Chain lab
              </p>
              <h2 className="text-4xl font-black leading-tight text-slate-950 md:text-5xl">
                Create real listings and search across the active dataset.
              </h2>
              <p className="max-w-xl text-lg leading-8 text-slate-700">
                Submit barter listings with category, city, value, trust, and have or want intent.
                The matcher will include stored listings automatically alongside the demo network.
              </p>

              <Card
                id="listing-form"
                className="rounded-[1.75rem] border-white/80 bg-white/90 py-0 shadow-[0_20px_60px_rgba(91,70,37,0.09)]"
              >
                <CardHeader className="space-y-3 p-6">
                  <div className="flex items-center gap-3">
                    <div className="flex size-12 items-center justify-center rounded-2xl bg-amber-100 text-amber-800">
                      <PlusCircle className="size-5" />
                    </div>
                    <div>
                      <CardTitle className="text-2xl font-black text-slate-950">
                        Create a listing
                      </CardTitle>
                      <CardDescription className="mt-1 text-sm leading-6 text-slate-600">
                        Stored listings are used by the matcher and exposed through `/api/listings`.
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-6 pt-0">
                  <form className="space-y-4" onSubmit={handleListingSubmit}>
                    <div className="grid gap-4 md:grid-cols-2">
                      <label className="block">
                        <span className="mb-2 block text-sm font-semibold text-slate-700">Title</span>
                        <input
                          required
                          value={listingForm.title}
                          onChange={(event) =>
                            setListingForm((current) => ({ ...current, title: event.target.value }))
                          }
                          placeholder="Vintage road bike"
                          className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-base text-slate-900 focus:border-amber-400 focus:outline-none"
                        />
                      </label>
                      <label className="block">
                        <span className="mb-2 block text-sm font-semibold text-slate-700">Item category</span>
                        <input
                          required
                          value={listingForm.category}
                          onChange={(event) =>
                            setListingForm((current) => ({ ...current, category: event.target.value }))
                          }
                          placeholder="Mobility"
                          className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-base text-slate-900 focus:border-amber-400 focus:outline-none"
                        />
                      </label>
                    </div>

                    <label className="block">
                      <span className="mb-2 block text-sm font-semibold text-slate-700">Description</span>
                      <textarea
                        required
                        rows={4}
                        value={listingForm.description}
                        onChange={(event) =>
                          setListingForm((current) => ({ ...current, description: event.target.value }))
                        }
                        placeholder="Condition, age, pickup details, and what makes the item useful for the next owner."
                        className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-base text-slate-900 focus:border-amber-400 focus:outline-none"
                      />
                    </label>

                    <div className="grid gap-4 md:grid-cols-3">
                      <label className="block">
                        <span className="mb-2 block text-sm font-semibold text-slate-700">Value estimate</span>
                        <input
                          required
                          min="1"
                          step="1"
                          type="number"
                          value={listingForm.valueEstimate}
                          onChange={(event) =>
                            setListingForm((current) => ({ ...current, valueEstimate: event.target.value }))
                          }
                          placeholder="150"
                          className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-base text-slate-900 focus:border-amber-400 focus:outline-none"
                        />
                      </label>
                      <label className="block">
                        <span className="mb-2 block text-sm font-semibold text-slate-700">City</span>
                        <input
                          required
                          value={listingForm.city}
                          onChange={(event) =>
                            setListingForm((current) => ({ ...current, city: event.target.value }))
                          }
                          placeholder="Berlin"
                          className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-base text-slate-900 focus:border-amber-400 focus:outline-none"
                        />
                      </label>
                      <label className="block">
                        <span className="mb-2 block text-sm font-semibold text-slate-700">Trust / self-rating</span>
                        <select
                          value={listingForm.trustScore}
                          onChange={(event) =>
                            setListingForm((current) => ({ ...current, trustScore: event.target.value }))
                          }
                          className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-base text-slate-900 focus:border-amber-400 focus:outline-none"
                        >
                          {Array.from({ length: (MAX_TRUST_SCORE - MIN_TRUST_SCORE) * 2 + 1 }, (_, index) => {
                            const value = (MIN_TRUST_SCORE + index * 0.5).toFixed(1);
                            return (
                              <option key={value} value={value}>
                                {value} / 5
                              </option>
                            );
                          })}
                        </select>
                      </label>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                      <label className="block">
                        <span className="mb-2 block text-sm font-semibold text-slate-700">I have</span>
                        <input
                          required
                          value={listingForm.gives}
                          onChange={(event) =>
                            setListingForm((current) => ({ ...current, gives: event.target.value }))
                          }
                          placeholder="road bike"
                          className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-base text-slate-900 focus:border-amber-400 focus:outline-none"
                        />
                      </label>
                      <label className="block">
                        <span className="mb-2 block text-sm font-semibold text-slate-700">I want</span>
                        <input
                          required
                          value={listingForm.wants}
                          onChange={(event) =>
                            setListingForm((current) => ({ ...current, wants: event.target.value }))
                          }
                          placeholder="record player, espresso machine"
                          className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-base text-slate-900 focus:border-amber-400 focus:outline-none"
                        />
                      </label>
                    </div>

                    <Button
                      type="submit"
                      size="lg"
                      disabled={listingStatus === "loading"}
                      className="h-12 w-full rounded-full bg-slate-950 text-white hover:bg-slate-800"
                    >
                      {listingStatus === "loading" ? "Creating listing..." : "Create listing"}
                    </Button>

                    <p className="text-sm leading-6 text-slate-500">
                      Stored listings: {storedListings.length}. Matcher dataset: {matcherListings.length}.
                    </p>

                    {listingMessage ? (
                      <div
                        className={`rounded-2xl px-4 py-3 text-sm ${
                          listingStatus === "success"
                            ? "bg-emerald-100 text-emerald-800"
                            : "bg-rose-100 text-rose-700"
                        }`}
                      >
                        {listingMessage}
                      </div>
                    ) : null}
                  </form>
                </CardContent>
              </Card>

              <Card className="rounded-[1.75rem] border-white/80 bg-white/90 py-0 shadow-[0_20px_60px_rgba(91,70,37,0.09)]">
                <CardContent className="space-y-5 p-6">
                  <div>
                    <label className="mb-2 block text-sm font-semibold text-slate-700">
                      I have
                    </label>
                    <select
                      value={haveItem}
                      onChange={(event) => setHaveItem(event.target.value)}
                      className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-base text-slate-900 focus:border-amber-400 focus:outline-none"
                    >
                      {itemOptions.map((option) => (
                        <option key={`have-${option.value}`} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-semibold text-slate-700">
                      I want
                    </label>
                    <select
                      value={wantItem}
                      onChange={(event) => setWantItem(event.target.value)}
                      className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-base text-slate-900 focus:border-amber-400 focus:outline-none"
                    >
                      {itemOptions.map((option) => (
                        <option key={`want-${option.value}`} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-semibold text-slate-700">
                      Engine mode
                    </label>
                    <select
                      value={engineMode}
                      onChange={(event) =>
                        setEngineMode(event.target.value as "legacy" | "graph" | "compare")
                      }
                      className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-base text-slate-900 focus:border-amber-400 focus:outline-none"
                    >
                      <option value="legacy">Legacy ranking</option>
                      <option value="graph">Graph ranking</option>
                      <option value="compare">Compare legacy vs graph</option>
                    </select>
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-semibold text-slate-700">
                      Maximum hops
                    </label>
                    <select
                      value={maxHops}
                      onChange={(event) => setMaxHops(event.target.value)}
                      className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-base text-slate-900 focus:border-amber-400 focus:outline-none"
                    >
                      <option value="3">3 hops</option>
                      <option value="4">4 hops</option>
                      <option value="5">5 hops</option>
                      <option value="6">6 hops</option>
                    </select>
                  </div>

                  <Button
                    size="lg"
                    disabled={itemOptions.length === 0}
                    className="h-12 w-full rounded-full bg-slate-950 text-white hover:bg-slate-800"
                    onClick={() => {
                      startTransition(() => {
                        void loadChains(haveItem, wantItem, maxHops, engineMode);
                      });
                    }}
                  >
                    <Search className="size-4" />
                    {isPending ? "Searching chains..." : "Find barter chains"}
                  </Button>
                </CardContent>
              </Card>
            </div>

            <div className="space-y-4">
              {proposalMessage ? (
                <div
                  className={`rounded-[1.5rem] border px-5 py-4 text-sm ${
                    proposalMessageTone === "success"
                      ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                      : "border-rose-200 bg-rose-50 text-rose-700"
                  }`}
                >
                  {proposalMessage}
                </div>
              ) : null}
              <MatchResultsPanel
                engineMode={engineMode}
                matchData={matchData}
                matchError={matchError}
                proposalsByChainId={proposalsByChainId}
                onCreateProposal={handleCreateProposal}
                onRespondToProposal={handleProposalDecision}
                proposalActionState={proposalActionState}
              />
            </div>
          </div>
        </div>
      </section>

      <section
        id="waitlist"
        className="border-t border-amber-100 bg-[linear-gradient(180deg,_rgba(18,24,38,0.98),_rgba(32,39,56,0.98))] py-20 text-white"
      >
        <div className="mx-auto grid max-w-6xl gap-10 px-6 md:px-10 lg:grid-cols-[0.85fr_1.15fr] lg:px-12">
          <div className="space-y-5">
            <p className="text-sm font-semibold uppercase tracking-[0.28em] text-amber-300">
              Beta waitlist
            </p>
            <h2 className="text-4xl font-black leading-tight md:text-5xl">
              Join the next round of BarterChain testing.
            </h2>
            <p className="max-w-lg text-lg leading-8 text-slate-300">
              Leave your email and tell us what kinds of goods or communities you want to trade inside first.
            </p>
          </div>

          <Card className="rounded-[2rem] border-white/10 bg-white/5 py-0 text-white shadow-[0_30px_90px_rgba(0,0,0,0.25)] backdrop-blur">
            <CardContent className="p-6 sm:p-8">
              <form className="space-y-4" onSubmit={handleSubmit}>
                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-slate-200">Email</span>
                  <div className="relative">
                    <Mail className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-slate-400" />
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      placeholder="you@example.com"
                      className="h-14 w-full rounded-2xl border border-white/10 bg-slate-900/60 pl-12 pr-4 text-base text-white placeholder:text-slate-500 focus:border-amber-300 focus:outline-none"
                    />
                  </div>
                </label>

                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-slate-200">
                    What should we support first?
                  </span>
                  <textarea
                    value={useCase}
                    onChange={(event) => setUseCase(event.target.value)}
                    rows={4}
                    placeholder="Examples: baby gear, home office swaps, expat community exchanges, student housing essentials..."
                    className="w-full rounded-2xl border border-white/10 bg-slate-900/60 px-4 py-4 text-base text-white placeholder:text-slate-500 focus:border-amber-300 focus:outline-none"
                  />
                </label>

                <Button
                  type="submit"
                  size="lg"
                  disabled={status === "loading"}
                  className="h-14 w-full rounded-full bg-amber-400 text-base font-bold text-slate-950 hover:bg-amber-300"
                >
                  {status === "loading" ? "Joining..." : "Join the beta waitlist"}
                </Button>

                <p className="text-sm leading-6 text-slate-400">
                  Current MVP focus: landing page, real listing intake, ranked matching API, and early community intake.
                </p>

                {message ? (
                  <div
                    className={`rounded-2xl px-4 py-3 text-sm ${
                      status === "success"
                        ? "bg-emerald-500/15 text-emerald-200"
                        : "bg-rose-500/15 text-rose-200"
                    }`}
                  >
                    {message}
                  </div>
                ) : null}
              </form>
            </CardContent>
          </Card>
        </div>
      </section>

      <footer className="border-t border-black/5 bg-[#f7f1e7] px-6 py-8 text-sm text-slate-600 md:px-10 lg:px-12">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} BarterChain. Circular swaps for useful things.</p>
          <p>Built in Germany, evolving in public.</p>
        </div>
      </footer>
    </main>
  );
}









