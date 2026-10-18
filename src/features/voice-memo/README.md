# Voice memo

Visitors record up to 2 minutes in the Workbench's contact panel, add a name and an email, and the clip is emailed to `contact@ethanaustincruse.com` through [Resend](https://resend.com), with replies going to the visitor. Nothing is stored on the site.

- `components/voice-memo.tsx`: the recorder UI (`<VoiceMemo />`, exported from `index.ts`).
- `components/use-recorder.ts`: microphone, `MediaRecorder` and the level meter.
- `api/`: validation, the rate limit, the Resend call and the handler, all server-only, exported from `server.ts` for `src/app/api/voice-memo/route.ts`.
- `lib/`: limits, formats and messages shared by both sides.

## Formats

The recorder takes the first format the browser supports, at about 40 kbps:

| Format | Browsers | Attachment |
|---|---|---|
| `audio/webm;codecs=opus` | Chrome, Edge, Firefox 130+ | `.webm` |
| `audio/mp4` | Safari (where WebM recording isn't available) | `.m4a` |
| `audio/ogg;codecs=opus` | older Firefox | `.ogg` |

The server checks the container's first bytes as well as the declared type.

## Limits

- Recording: 2:00, then it stops itself (the server takes up to 125 s).
- Clip size: 2.5 MB.
- Name: 1 to 100 characters, one line. Email: valid, up to 254 characters.
- 3 memos per visitor (IP) per 10 minutes. The count is kept in memory per server instance, so it's best effort.
- Requests from another site's page (a foreign `Origin`) get a 403.
- A filled honeypot field (`website`) gets a normal success response and nothing is sent.

## Environment

| Variable | |
|---|---|
| `VOICE_MEMO_ENABLED` | `1` turns the endpoint on in production. Without it, production (Vercel previews included) answers 404. Development is always on. |
| `RESEND_API_KEY` | Resend key. Unset: a one-line dry run in the dev server log (size, format, length; no personal data) and a success flagged `delivered: false`. Unset in production: 503, and the panel says to email instead. |
| `VOICE_MEMO_FROM` | Optional sender. Default `Workbench <memos@ethanaustincruse.com>`; must be on the verified domain. |
| `VOICE_MEMO_TO` | Optional inbox. Default `contact@ethanaustincruse.com`. |

## Setup (Ethan)

1. Create a Resend account at resend.com.
2. **Domains → Add domain** → `ethanaustincruse.com`. Resend recommends a sending subdomain (e.g. `mail.ethanaustincruse.com`) to keep its reputation apart from the main domain's mail. If you use one, set `VOICE_MEMO_FROM` to an address on it.
3. Add the DNS records Resend lists at your DNS host: a DKIM `TXT` record (`resend._domainkey`), and the SPF `MX` + `TXT` records on the `send` subdomain. A DMARC `TXT` record (`_dmarc`) is optional but helps deliverability. None of these touch the MX records that deliver mail to `contact@`. Wait for the domain to show **Verified**.
4. **API Keys → Create API key**: permission **Sending access**, limited to that domain.
5. In Vercel → Project → Settings → Environment Variables (Production), add `RESEND_API_KEY`. Add `VOICE_MEMO_FROM` / `VOICE_MEMO_TO` only if you change the defaults.
6. When the Workbench ships to production, add `VOICE_MEMO_ENABLED=1` and redeploy.
7. Test once from the live site and check the memo arrives (look in spam the first time).

To try it locally with real delivery, put `RESEND_API_KEY` in `.env.local` and restart `npm run dev`.
