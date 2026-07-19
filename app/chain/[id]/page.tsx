import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { ChainInviteView } from "@/components/chain-invite/chain-invite-view";
import {
  deriveChainInviteStatus,
  sanitizeChainInvite,
} from "@/lib/chain-invites";
import { findChainInviteById } from "@/lib/chain-invite-store";

export const metadata: Metadata = {
  title: "Ringtausch-Vorschlag | BarterChain",
  description:
    "Ein Ringtausch-Vorschlag: mehrere Tauschanzeigen, die zusammen einen Kreis ergeben, in dem jeder genau das bekommt, was er sucht.",
  robots: {
    index: false,
    follow: false,
  },
};

export default async function ChainInvitePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const invite = await findChainInviteById(id);

  if (!invite) {
    notFound();
  }

  const sanitized = sanitizeChainInvite(invite);

  return (
    <ChainInviteView
      initialInvite={{
        ...sanitized,
        status: deriveChainInviteStatus(sanitized),
      }}
    />
  );
}
