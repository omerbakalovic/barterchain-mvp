"use client";

import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { useCallback, useEffect, useState } from "react";

type Phase = "intro" | "pair-fail" | "cycle" | "buffer" | "ship";

type PhaseDescriptor = {
  id: Phase;
  title: string;
  caption: string;
  durationMs: number;
};

const PHASES: PhaseDescriptor[] = [
  {
    id: "intro",
    title: "Three traders, three items",
    caption: "Each person has something to give and a different thing they want.",
    durationMs: 3000,
  },
  {
    id: "pair-fail",
    title: "Direct swap fails",
    caption: "Anya wants Bram's bike. Bram doesn't want Anya's camera. No pair-wise match.",
    durationMs: 4000,
  },
  {
    id: "cycle",
    title: "Engine finds a 3-cycle",
    caption: "Pass items around the loop and everyone gets what they want.",
    durationMs: 4500,
  },
  {
    id: "buffer",
    title: "Items deposit into buffer",
    caption: "Storage fees accrue daily. Atomicity is now the warehouse's problem, not the chain's.",
    durationMs: 4500,
  },
  {
    id: "ship",
    title: "Chain closes — ship instantly",
    caption: "Engine matches inventory in place. No party waits on another. Drop-out risk → 0.",
    durationMs: 4500,
  },
];

const NODES = [
  { id: "anya", name: "Anya", item: "camera", wants: "bike", angle: -90 },
  { id: "celine", name: "Celine", item: "espresso", wants: "camera", angle: 30 },
  { id: "bram", name: "Bram", item: "bike", wants: "espresso", angle: 150 },
] as const;

const RADIUS = 38; // % of stage
const CENTER = { x: 50, y: 52 };

function polarToCartesian(angleDeg: number, radius: number) {
  const angleRad = (angleDeg * Math.PI) / 180;
  return {
    x: CENTER.x + radius * Math.cos(angleRad),
    y: CENTER.y + radius * Math.sin(angleRad),
  };
}

const NODE_POSITIONS = Object.fromEntries(
  NODES.map((node) => [node.id, polarToCartesian(node.angle, RADIUS)])
) as Record<(typeof NODES)[number]["id"], { x: number; y: number }>;

function CycleArrow({
  from,
  to,
  active,
  variant,
  delay = 0,
}: {
  from: { x: number; y: number };
  to: { x: number; y: number };
  active: boolean;
  variant: "dashed" | "solid";
  delay?: number;
}) {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const length = Math.hypot(dx, dy);
  const ux = dx / length;
  const uy = dy / length;
  const padding = 7;
  const x1 = from.x + ux * padding;
  const y1 = from.y + uy * padding;
  const x2 = to.x - ux * padding;
  const y2 = to.y - uy * padding;

  return (
    <motion.line
      x1={`${x1}%`}
      y1={`${y1}%`}
      x2={`${x2}%`}
      y2={`${y2}%`}
      stroke={variant === "solid" ? "#f59e0b" : "#cbd5e1"}
      strokeWidth={variant === "solid" ? 0.8 : 0.5}
      strokeDasharray={variant === "solid" ? "0" : "1.6 1.2"}
      strokeLinecap="round"
      markerEnd="url(#cycle-arrow-head)"
      initial={{ opacity: 0, pathLength: 0 }}
      animate={{ opacity: active ? 1 : 0, pathLength: active ? 1 : 0 }}
      transition={{ duration: 0.7, delay }}
    />
  );
}

function NodeMarker({
  position,
  name,
  item,
  highlighted,
  scale = 1,
}: {
  position: { x: number; y: number };
  name: string;
  item: string;
  highlighted: boolean;
  scale?: number;
}) {
  return (
    <motion.div
      className="absolute -translate-x-1/2 -translate-y-1/2"
      style={{ left: `${position.x}%`, top: `${position.y}%` }}
      animate={{
        scale: highlighted ? scale * 1.05 : scale,
      }}
      transition={{ duration: 0.4 }}
    >
      <div className="flex flex-col items-center">
        <div
          className={`flex h-16 w-16 flex-col items-center justify-center rounded-full text-center shadow-lg transition-colors ${
            highlighted
              ? "bg-gradient-to-br from-amber-500 to-amber-700 text-amber-50"
              : "bg-slate-900 text-slate-100"
          }`}
        >
          <p className="text-xs font-bold leading-tight">{name}</p>
          <p className="text-[10px] leading-tight opacity-80">{item}</p>
        </div>
      </div>
    </motion.div>
  );
}

function FlowingItem({
  from,
  to,
  label,
  active,
  delay = 0,
  durationMs = 1500,
}: {
  from: { x: number; y: number };
  to: { x: number; y: number };
  label: string;
  active: boolean;
  delay?: number;
  durationMs?: number;
}) {
  return (
    <motion.div
      className="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2"
      initial={{ opacity: 0, left: `${from.x}%`, top: `${from.y}%` }}
      animate={
        active
          ? { opacity: [0, 1, 1, 0], left: `${to.x}%`, top: `${to.y}%` }
          : { opacity: 0, left: `${from.x}%`, top: `${from.y}%` }
      }
      transition={{
        duration: durationMs / 1000,
        delay,
        times: [0, 0.15, 0.85, 1],
      }}
    >
      <span className="rounded-full bg-amber-100 px-2 py-1 text-[10px] font-semibold text-amber-900 shadow">
        {label}
      </span>
    </motion.div>
  );
}

function Buffer({ visible }: { visible: boolean }) {
  return (
    <motion.div
      className="absolute -translate-x-1/2 -translate-y-1/2"
      style={{ left: `${CENTER.x}%`, top: `${CENTER.y}%` }}
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: visible ? 1 : 0, opacity: visible ? 1 : 0 }}
      transition={{ duration: 0.5 }}
    >
      <div className="flex h-20 w-28 flex-col items-center justify-center rounded-2xl bg-gradient-to-br from-slate-900 to-amber-700 px-3 text-center shadow-xl">
        <p className="text-xs font-black uppercase tracking-wider text-amber-50">Buffer</p>
        <p className="mt-1 text-[10px] font-medium leading-tight text-amber-100">
          camera · bike · espresso
        </p>
        <p className="mt-1 text-[9px] font-medium text-amber-200">€ daily storage</p>
      </div>
    </motion.div>
  );
}

export function CycleVisualization() {
  const reduceMotion = useReducedMotion();
  const [phaseIndex, setPhaseIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  const phase = PHASES[phaseIndex] ?? PHASES[0];

  useEffect(() => {
    if (paused || reduceMotion) {
      return;
    }
    const timer = window.setTimeout(() => {
      setPhaseIndex((current) => (current + 1) % PHASES.length);
    }, phase!.durationMs);
    return () => window.clearTimeout(timer);
  }, [phase, paused, phaseIndex, reduceMotion]);

  const goToPhase = useCallback((index: number) => {
    setPhaseIndex(index);
  }, []);

  const showPairFail = phase!.id === "pair-fail";
  const showCycle = phase!.id === "cycle";
  const showBuffer = phase!.id === "buffer" || phase!.id === "ship";
  const flowingItems = phase!.id === "cycle" || phase!.id === "ship";
  const itemsAtBuffer = phase!.id === "buffer";

  const anya = NODE_POSITIONS.anya;
  const bram = NODE_POSITIONS.bram;
  const celine = NODE_POSITIONS.celine;

  return (
    <div className="w-full">
      <div className="relative aspect-video w-full overflow-hidden rounded-3xl border border-slate-200 bg-[linear-gradient(180deg,#f8f5ee_0%,#f1eadc_100%)] shadow-[0_30px_80px_rgba(91,70,37,0.12)]">
        <svg
          className="absolute inset-0 h-full w-full"
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
        >
          <defs>
            <marker
              id="cycle-arrow-head"
              viewBox="0 0 10 10"
              refX="9"
              refY="5"
              markerWidth="3"
              markerHeight="3"
              orient="auto"
            >
              <path d="M0 0 L10 5 L0 10 Z" fill="#f59e0b" />
            </marker>
          </defs>

          {/* Pair-wise dashed (always one direction Anya → Bram for "wants bike") */}
          <CycleArrow
            from={anya!}
            to={bram!}
            active={showPairFail}
            variant="dashed"
            delay={0.2}
          />

          {/* Cycle arrows: Anya → Celine (camera), Celine → Bram (espresso), Bram → Anya (bike) */}
          <CycleArrow from={anya!} to={celine!} active={showCycle} variant="solid" delay={0.1} />
          <CycleArrow from={celine!} to={bram!} active={showCycle} variant="solid" delay={0.5} />
          <CycleArrow from={bram!} to={anya!} active={showCycle} variant="solid" delay={0.9} />
        </svg>

        {/* Buffer */}
        <Buffer visible={showBuffer} />

        {/* Nodes */}
        {NODES.map((node) => {
          const pos = NODE_POSITIONS[node.id]!;
          const isHighlighted = showCycle || phase!.id === "ship";
          const scale = showBuffer ? 0.75 : 1;
          return (
            <NodeMarker
              key={node.id}
              position={pos}
              name={node.name}
              item={node.item}
              highlighted={isHighlighted}
              scale={scale}
            />
          );
        })}

        {/* Flowing items in cycle phase */}
        {flowingItems && phase!.id === "cycle" && (
          <>
            <FlowingItem from={anya!} to={celine!} label="camera" active delay={0.2} />
            <FlowingItem from={celine!} to={bram!} label="espresso" active delay={0.7} />
            <FlowingItem from={bram!} to={anya!} label="bike" active delay={1.2} />
          </>
        )}

        {/* Items moving INTO buffer */}
        {itemsAtBuffer && (
          <>
            <FlowingItem from={anya!} to={CENTER} label="camera" active delay={0.1} durationMs={1800} />
            <FlowingItem from={celine!} to={CENTER} label="espresso" active delay={0.4} durationMs={1800} />
            <FlowingItem from={bram!} to={CENTER} label="bike" active delay={0.7} durationMs={1800} />
          </>
        )}

        {/* Items shipping OUT of buffer to recipients */}
        {phase!.id === "ship" && (
          <>
            <FlowingItem from={CENTER} to={celine!} label="camera" active delay={0.2} />
            <FlowingItem from={CENTER} to={bram!} label="espresso" active delay={0.5} />
            <FlowingItem from={CENTER} to={anya!} label="bike" active delay={0.8} />
          </>
        )}

        {/* Wants labels (only in intro) */}
        <AnimatePresence>
          {phase!.id === "intro" && (
            <motion.div
              key="wants-overlay"
              className="absolute inset-0 pointer-events-none"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.4 }}
            >
              {NODES.map((node) => {
                const pos = NODE_POSITIONS[node.id]!;
                return (
                  <div
                    key={`wants-${node.id}`}
                    className="absolute -translate-x-1/2 -translate-y-1/2"
                    style={{ left: `${pos.x}%`, top: `${pos.y + 11}%` }}
                  >
                    <span className="rounded-full bg-white/90 px-2 py-0.5 text-[10px] font-semibold text-amber-900 shadow">
                      wants {node.wants}
                    </span>
                  </div>
                );
              })}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Phase caption */}
        <div className="absolute bottom-4 left-4 right-4">
          <AnimatePresence mode="wait">
            <motion.div
              key={phase!.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.3 }}
              className="rounded-2xl bg-white/85 px-4 py-3 backdrop-blur-sm"
            >
              <p className="text-xs font-semibold uppercase tracking-wider text-amber-700">
                {phase!.title}
              </p>
              <p className="mt-1 text-sm text-slate-800">{phase!.caption}</p>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* Step navigation */}
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => setPaused((current) => !current)}
          className="rounded-full border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
        >
          {paused ? "Play" : "Pause"}
        </button>
        <div className="flex flex-wrap gap-1">
          {PHASES.map((step, index) => (
            <button
              key={step.id}
              type="button"
              onClick={() => goToPhase(index)}
              className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
                index === phaseIndex
                  ? "bg-slate-900 text-white"
                  : "bg-white text-slate-700 hover:bg-slate-100 border border-slate-200"
              }`}
            >
              {index + 1}. {step.title}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
