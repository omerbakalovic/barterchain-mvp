# BarterChain MVP  
[![Vercel](https://vercelbadge.vercel.app/api/omerbakalovic/barterchain-mvp)](https://barterchain.vercel.app)
![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)
[![GitHub Stars](https://img.shields.io/github/stars/omerbakalovic/barterchain-mvp?style=social)](https://github.com/omerbakalovic/barterchain-mvp)

> “Give what you don’t use → Get what you truly want.”

BarterChain AI is an experimental marketplace that closes **multi-hop barter chains** (up to six steps) using a graph algorithm plus lightweight AI for parsing free-text ads.  
This repository will eventually hold two codebases:

1. **Next.js PWA** – public landing page + e-mail waiting-list  
2. **FastAPI service** – cycle-matching endpoint and future integrations (escrow, shipping)

---

## Road-map (v0.1)

| Stage | Goal |
|-------|------|
| **1 Landing page** | Static PWA, responsive, email capture |
| **2 `/api/match`** | Python endpoint wrapping `networkx.simple_cycles` (≤ 6 hops) |
| **3 Escrow & shipping stub** | Stripe (test mode) + DHL sandbox |
| **4 Demo seed script** | Import anonymised Kleinanzeigen ads for live demo |

---

## Quick Start

```bash
git clone https://github.com/<your-user>/barterchain-mvp.git
cd barterchain-mvp
pnpm install        # or npm / yarn
pnpm dev            # local dev at http://localhost:3000
