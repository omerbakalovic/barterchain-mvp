# BarterChain MVP  
[![Vercel](https://img.shields.io/website?url=https%3A%2F%2Fbarterchain-mvp.vercel.app&label=Vercel&up_message=Live&down_message=Down)](https://barterchain-mvp.vercel.app)
![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)
[![GitHub Stars](https://img.shields.io/github/stars/omerbakalovic/barterchain-mvp?style=social)](https://github.com/omerbakalovic/barterchain-mvp)

> “Give what you don’t use → Get what you truly want.”

BarterChain AI je eksperimentalna platforma koja zatvara **multi-hop barter lance** uz pomoć graf-algoritma i minimalnog AI-a za parsiranje oglasa.  
Ovaj repozitorij sadrži **Next.js PWA** za landing-stranicu i, uskoro, *FastAPI* servis za traženje ciklusa.

## Road-map (v0.1)
1. 🎨  **Landing page** – statički PWA + e-mail capture  
2. 🔗  **/api/match** – Python endpoint s simple_cycles (≤6 hop)  
3. 📦  **Escrow & shipping stub** – Stripe test-mode + DHL sandbox  
4. 🌱  **Demo data seed** – skripta koja uvozi anonimizirane oglase  

## Quick Start
```bash
git clone https://github.com/<username>/barterchain-mvp.git
cd barterchain-mvp
pnpm install        # ili npm / yarn
pnpm dev            # lokalno <http://localhost:3000>
```

## Next Steps
1. Install dependencies and run the app locally:
   ```bash
   pnpm install
   pnpm dev
   ```
2. Open `http://localhost:3000` and confirm the landing page loads.
3. Commit and push your changes when you are ready to deploy.

