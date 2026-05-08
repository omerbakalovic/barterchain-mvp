export const BUFFER_STATUS_LISTED = "listed";
export const BUFFER_STATUS_DEPOSITED = "deposited";
export const BUFFER_STATUS_SHIPPED = "shipped";
export const BUFFER_STATUS_WITHDRAWN = "withdrawn";

export type BufferStatus =
  | typeof BUFFER_STATUS_LISTED
  | typeof BUFFER_STATUS_DEPOSITED
  | typeof BUFFER_STATUS_SHIPPED
  | typeof BUFFER_STATUS_WITHDRAWN;

export const BUFFER_SIZE_CLASSES = ["S", "M", "L", "XL"] as const;
export type BufferSizeClass = (typeof BUFFER_SIZE_CLASSES)[number];

export const BUFFER_DAILY_FEE_EUR: Record<BufferSizeClass, number> = {
  S: 0.5,
  M: 1.0,
  L: 2.5,
  XL: 5.0,
};

export type BufferEvent = {
  status: BufferStatus;
  recordedAt: string;
  note?: string;
};

export type BufferState = {
  status: BufferStatus;
  sizeClass: BufferSizeClass;
  depositedAt: string | null;
  releasedAt: string | null;
  history: BufferEvent[];
};

const ALLOWED_TRANSITIONS: Record<BufferStatus, BufferStatus[]> = {
  listed: [BUFFER_STATUS_DEPOSITED, BUFFER_STATUS_WITHDRAWN],
  deposited: [BUFFER_STATUS_SHIPPED, BUFFER_STATUS_WITHDRAWN],
  shipped: [],
  withdrawn: [],
};

export function isValidTransition(from: BufferStatus, to: BufferStatus): boolean {
  return ALLOWED_TRANSITIONS[from]?.includes(to) ?? false;
}

export function isBufferSizeClass(value: unknown): value is BufferSizeClass {
  return typeof value === "string" && (BUFFER_SIZE_CLASSES as readonly string[]).includes(value);
}

export function isInBuffer(state: BufferState | undefined): boolean {
  return state?.status === BUFFER_STATUS_DEPOSITED;
}

export function calculateAccruedFeeEur(
  state: BufferState,
  asOf: Date = new Date()
): number {
  if (!state.depositedAt) {
    return 0;
  }

  const start = new Date(state.depositedAt).getTime();
  const end = state.releasedAt ? new Date(state.releasedAt).getTime() : asOf.getTime();
  const elapsedMs = Math.max(0, end - start);
  const days = elapsedMs / (1000 * 60 * 60 * 24);
  return Number((BUFFER_DAILY_FEE_EUR[state.sizeClass] * days).toFixed(2));
}

export function createInitialBufferState(sizeClass: BufferSizeClass, now = new Date()): BufferState {
  const recordedAt = now.toISOString();
  return {
    status: BUFFER_STATUS_LISTED,
    sizeClass,
    depositedAt: null,
    releasedAt: null,
    history: [{ status: BUFFER_STATUS_LISTED, recordedAt }],
  };
}

export type BufferTransitionInput = {
  state: BufferState;
  to: BufferStatus;
  note?: string;
  now?: Date;
};

export type BufferTransitionResult =
  | { success: true; state: BufferState }
  | { success: false; message: string };

export function applyBufferTransition(input: BufferTransitionInput): BufferTransitionResult {
  if (!isValidTransition(input.state.status, input.to)) {
    return {
      success: false,
      message: `Cannot transition from ${input.state.status} to ${input.to}.`,
    };
  }

  const recordedAt = (input.now ?? new Date()).toISOString();
  const event: BufferEvent = { status: input.to, recordedAt, note: input.note };

  const next: BufferState = {
    ...input.state,
    status: input.to,
    history: [...input.state.history, event],
  };

  if (input.to === BUFFER_STATUS_DEPOSITED && !next.depositedAt) {
    next.depositedAt = recordedAt;
  }

  if (input.to === BUFFER_STATUS_SHIPPED || input.to === BUFFER_STATUS_WITHDRAWN) {
    next.releasedAt = recordedAt;
  }

  return { success: true, state: next };
}
