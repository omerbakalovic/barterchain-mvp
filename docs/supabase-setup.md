# Supabase setup for production

Without Supabase configured, the waitlist and listing forms on the deployed
site will fail because Vercel's runtime filesystem is read-only. This guide
walks you through the one-time setup so registrations and listings actually
persist.

## What you'll get

After this setup:
- The waitlist form (hero CTA) saves submissions to a real database
- The listing creation form saves user listings to a real database
- The admin signals dashboard (`/admin/signals`) shows real submitted data
- The data survives across requests and deployments

## Step 1 — Create a Supabase account (~2 min)

1. Go to **https://supabase.com**
2. Click **Start your project**
3. Sign in with GitHub (easiest — same account as the BarterChain repo)

The free tier is generous: 500 MB database, 50K monthly active users, unlimited
API requests. More than enough for this project.

## Step 2 — Create a new project (~3 min)

1. On the Supabase dashboard click **New Project**
2. Pick the **Personal** (default) organization
3. Fill in:
   - **Name:** `barterchain` (or whatever you prefer)
   - **Database Password:** generate a strong one and save it somewhere — you
     won't need it day to day but losing it is annoying
   - **Region:** pick the one closest to you (e.g. `Central EU (Frankfurt)`
     if you're in Germany)
   - **Pricing Plan:** Free
4. Click **Create new project**
5. Wait ~2 minutes for it to provision

## Step 3 — Create the database tables (~1 min)

1. In the Supabase project, click the **SQL Editor** icon in the left sidebar
2. Click **New query**
3. Paste **everything** from the code block below and click **Run**:

```sql
create table waitlist_entries (
  id bigint generated always as identity primary key,
  email text not null,
  use_case text not null default '',
  created_at timestamptz not null
);

create table listings (
  id text primary key,
  title text not null,
  description text not null,
  category text not null,
  value_estimate numeric not null,
  city text not null,
  trust_score numeric not null,
  gives text not null,
  wants text[] not null,
  owner_name text,
  owner_contact text,
  created_at timestamptz not null
);

create table chain_proposals (
  id text primary key,
  chain_id text not null,
  chain_summary text not null,
  chain_score numeric not null,
  participating_listings text[] not null,
  participants jsonb not null,
  status text not null,
  created_at timestamptz not null,
  updated_at timestamptz not null
);

create table match_requests (
  id bigint generated always as identity primary key,
  have text not null,
  want text not null,
  max_hops integer not null,
  engine text not null,
  created_at timestamptz not null
);

-- Allow service-role inserts only (the API uses the service role key,
-- the anon key is never exposed to clients).
alter table waitlist_entries enable row level security;
alter table listings enable row level security;
alter table chain_proposals enable row level security;
alter table match_requests enable row level security;
```

You should see **Success. No rows returned**.

## Step 4 — Copy your API credentials (~30 sec)

1. In the Supabase project, click the **Settings** gear icon in the left
   sidebar (near the bottom)
2. Click **API**
3. You need two values:
   - **Project URL** — looks like `https://abcdef123456.supabase.co`. Copy it.
   - **Service Role secret** (NOT the anon key) — this is in the
     **Project API keys** section, labelled `service_role`. Click the eye icon
     to reveal, then copy.

> The service role key bypasses Row Level Security. Treat it like a password.
> It belongs in Vercel environment variables only. Never paste it into client
> code or commit it to git.

## Step 5 — Add the env vars to Vercel (~1 min)

1. Go to **https://vercel.com/dashboard**, click the `barterchain-mvp` project
2. **Settings** tab at the top
3. Left sidebar → **Environment Variables**
4. Add the following entries (one at a time — click **Add Another** between them):

   | Key | Value |
   |-----|-------|
   | `SUPABASE_URL` | the Project URL from Step 4 |
   | `SUPABASE_SERVICE_ROLE_KEY` | the service_role key from Step 4 |

5. For each, leave **Environments** set to **Production, Preview, Development**
   (all three checked)
6. Click **Save**

## Step 6 — Redeploy (~1 min)

Environment variables only take effect on new deployments.

1. Still in Vercel, click the **Deployments** tab at the top
2. Find the latest production deployment (top of the list)
3. Click the **⋯** menu on the right and choose **Redeploy**
4. Confirm **Redeploy** (no need to change build settings)
5. Wait ~1–2 min for the build to finish

## Step 7 — Test the waitlist

1. Open your live site (e.g. `https://barterchain-mvp-...vercel.app`)
2. Scroll to the waitlist form
3. Enter a real email and a short use-case description
4. Click submit
5. You should see a success message

To verify it actually saved:

- In Supabase, **Table Editor** → `waitlist_entries` — your row should be
  there with the email and timestamp.
- Or, on the live site, visit `/admin/signals` — it will show the waitlist
  count. In production, this page requires the `ADMIN_SIGNALS_ACCESS_KEY` env
  var. To enable it, repeat Step 5 with key `ADMIN_SIGNALS_ACCESS_KEY` and a
  random string, then redeploy. Access via
  `/admin/signals?key=<that-random-string>`.

## What's still not persisted

Even with Supabase set up, one thing stays on the local filesystem (so it
works in `npm run dev` but not on Vercel):
- **Buffer deposits and releases** — the buffer state is stored as a field on
  the listing JSON, but the listing-store's Supabase write doesn't include it.

Waitlist entries, listings, chain proposals, and match-request logs all
persist to Supabase when the env vars are configured. When a chain proposal
is accepted by every participant, the API attaches each participant's stored
contact (from `listings.owner_contact`) to the proposal response so the chain
can coordinate the handover directly — accepting the chain is the
participants' consent to be introduced.

## Troubleshooting

**Form submits but I never see the row in Supabase.**
Check the Vercel deployment logs (Deployments → click the latest → Functions →
look for `/api/waitlist` or `/api/listings`). A missing or wrong env var will
show up as an error there.

**I see the row in Supabase but `/admin/signals` is empty.**
The page might be querying with filters. Open it without query params and
check the Match requests / Waitlist counts at the top.

**`/admin/signals` returns 404 in production.**
That's the security gate working. Add `ADMIN_SIGNALS_ACCESS_KEY` as in
Step 5, redeploy, and visit `/admin/signals?key=<your-key>`.
