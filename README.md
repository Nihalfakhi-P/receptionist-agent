# Receptionist Agent

An AI voice receptionist for a local business. Callers dial your business
number; a Vapi voice agent answers, converses naturally, and grounds every
answer in live data the owner edits from a web dashboard.

```
Caller ──PSTN──▶ Phone number (Vapi/Twilio)
                     │  inbound call
                     ▼
              ┌─────────────────────────┐
              │  VAPI (voice runtime)   │  telephony + STT + LLM + TTS,
              │  runs the audio loop    │  all real-time, on Vapi infra
              └───────┬─────────▲───────┘
        assistant-request │         │ transient assistant JSON
        tool-calls        │         │ { results: [...] }
                     ▼         │
              ┌─────────────────────────┐
              │  VERCEL (this repo)     │  Next.js App Router
              │  /api/vapi/webhook      │  builds prompt per call
              │  /api/admin/business    │  owner CRUD
              │  /admin                 │  owner dashboard
              └───────┬─────────────────┘
                     ▼
              Upstash Redis  (business data: hours, fees, slots, FAQs)
```

**Why this shape:** Vercel functions are stateless and short-lived — they can't
hold the persistent WebSocket a raw Twilio Media Streams voice bot needs. So
the latency-critical audio loop lives on Vapi, and Vercel does what it's great
at: stateless webhooks and a dashboard. Fresh data is injected into the system
prompt on **every call** (via `assistant-request`), and truly live numbers
(seat availability) are fetched **mid-call** via the `check_availability` tool.

## Setup

### 1. Data store — Upstash Redis (free tier)

In the Vercel dashboard: **Storage → Marketplace → Upstash for Redis → Create**,
link it to this project. `UPSTASH_REDIS_REST_URL` and
`UPSTASH_REDIS_REST_TOKEN` are injected automatically.
(Or create a DB at console.upstash.com and set the two vars yourself.)

### 2. Deploy to Vercel

```bash
npm i -g vercel
vercel link
vercel env add VAPI_WEBHOOK_SECRET   # long random string
vercel env add ADMIN_TOKEN           # long random string (owner's dashboard password)
vercel --prod
```

Note your production URL, e.g. `https://receptionist-agent.vercel.app`.

### 3. Vapi

1. Sign up at [dashboard.vapi.ai](https://dashboard.vapi.ai).
2. Add an OpenAI provider key (Settings → Provider Keys) or use Vapi's built-in.
3. **Phone Numbers → Create** — get a free US number, or import a Twilio number.
4. On the number, set:
   - **Server URL**: `https://<your-app>.vercel.app/api/vapi/webhook`
   - **Server URL Secret**: the same value as `VAPI_WEBHOOK_SECRET`
   - Leave "Assistant" **unassigned** — that's what makes Vapi send
     `assistant-request` to our webhook, so we can build the assistant with
     fresh data per call.
5. Call the number.

### 4. Test without a phone (works from India, free)

Open `https://<your-app>.vercel.app/test`, paste your **Vapi public key**
(Dashboard → Settings → API Keys) and the `ADMIN_TOKEN`, click **Start test
call**, and talk to the agent through your mic. It uses the identical
assistant config, live data, and tools as real phone calls.

### 5. Owner workflow

Open `https://<your-app>.vercel.app/admin`, enter the `ADMIN_TOKEN`, edit
hours/fees/availability/FAQs/announcements, hit **Save**. The very next call
uses the new data. No redeploys, ever.

## The +91 India number

TRAI regulations prevent Vapi/Twilio from provisioning Indian numbers
directly. Options, in order of practicality:

1. **Call forwarding (fastest):** keep your existing +91 number and set
   unconditional call forwarding to your Vapi number. Callers still dial the
   number they know. (International forwarding charges apply to the SIM plan.)
2. **Indian SIP trunk:** use an Indian cloud-telephony provider (Exotel,
   Plivo, Ozonetel, etc.) with a virtual +91 number and connect it to Vapi via
   **SIP trunking** (Vapi: Phone Numbers → Import → SIP). Compliant and
   production-grade, but requires KYC paperwork with the Indian provider.
3. **Test first with the free US number**, then do (2) when going live.

## Local development

```bash
npm install
cp .env.example .env.local   # fill in values (Redis optional locally)
npm run dev
```

To receive real Vapi webhooks locally, tunnel with `npx ngrok http 3000` and
put the ngrok URL as the Server URL on the Vapi number.

## Adapting to another business

Everything the agent knows comes from `BusinessData`
([lib/business.ts](lib/business.ts)). To turn this into a salon, clinic, or
gym receptionist, just edit the data in `/admin`: rename fees to prices,
model chairs/courts/appointment-slots as `resources`, update FAQs. The
webhook, prompt builder, and dashboard are all business-agnostic. The agent
persona lives in [lib/prompt.ts](lib/prompt.ts) if you want a different name
or tone.
