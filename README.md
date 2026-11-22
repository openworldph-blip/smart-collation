# Smart Collation — shared branch requests

GitHub Pages serves the phone interface. A Google Apps Script web app authorizes every write and stores records in the private Google Sheet. Staff use branch passwords, with no Google or ChatGPT account required.

## Current release state

Apps Script version 2 is deployed and public browser reads have been verified. The release checker passes. The website is live at https://openworldph-blip.github.io/smart-collation/ . GitHub Pages deployment succeeded and public browser reads have been verified. Admin password is configured; Admin must assign branch passwords before staff order.

The old local preview and older GitHub apps are separate and unchanged.

## Private Google spreadsheet

Owner: openworldph@gmail.com

Workbook: https://docs.google.com/spreadsheets/d/13vUilTWqrAwUAZ9lcAoo7rnFoSrnhI8RlTGuccpLjWU/edit

Bound Apps Script: https://script.google.com/home/projects/1HWYTGKgj6f77KOUeTXgFsmXvTu5tIDRS6gQcmlxwSfq9UaPQAvDc4hRw/edit

Use the website to edit requests and the master checklist. `Request log` is an append-only human-readable history of submitted versions, not a table for directly editing live requests. `Heads` and `Records` hold canonical records and earlier revisions; do not sort, delete or edit them. The spreadsheet must remain private.

## Apps Script setup

1. The bound project contains the generated `Server.gs` content under `Code.gs`, plus `OwnerSetup.html`. When updating, use either generated `Server.gs` alone or `Code.gs` plus `Helpers.gs`. Never install both versions of the server.
2. Use `apps-script/appsscript.json` for the manifest. Runtime V8, time zone Asia/Manila.
3. As the spreadsheet owner, run `setup` once and authorize the requested Google permissions. Enter your own Admin password in the form that opens in the spreadsheet. The authoring assistant does not create or collect this credential.
4. Deploy a new **Web app**, execute as **Me**, who has access **Anyone**. The HTTP endpoint must be reachable without Google sign-in. Branch access is enforced by the server's own password and role checks. The spreadsheet remains private.
5. Copy the actual deployed `/exec` URL into `public/config.json` as `apiUrl`. Do not use an editor `/dev` URL.
6. Verify `GET` service health and a cross-origin browser request from the deployed GitHub origin. Cross-origin behavior and Google authorization cannot be established by local tests alone.

## GitHub deployment

Use a new repository for this app. Do not push into `snoweephPORTA/ramen-hack-UB`.

The currently connected GitHub account is `openworldph-blip`. The separate repository is https://github.com/openworldph-blip/smart-collation .

Run the checks and build locally, then copy the verified dist output into docs/ and commit source and docs together to main. In Settings → Pages select Deploy from a branch, main, /docs. The optional workflow file is a future alternative and is not needed for branch publication. A relative Vite base supports project Pages paths.

Only create the QR after GitHub reports the actual published URL and the live phone flow is verified. Encode that canonical URL, not an expected or temporary preview URL.

## Staff flow

Choose a branch → branch password → choose tomorrow or a later Admin-open delivery date → checkbox / item / optional quantity → review → submit → submitted overview / Home.

`Clear request` clears only the current branch/date draft, after confirmation. It never deletes submitted requests. `Nothing needed` records an explicit response. Optional quantities remain blank or preserve free text such as `1 tab`.

The owner signs in as Admin and assigns passwords under **Branches**. Branch passwords should be different. Password reset invalidates older sessions for that branch. Admin alone can edit other requests, the checklist, visibility, routing and delivery dates.

## Storage and network behavior

- No localStorage, sessionStorage, IndexedDB, service worker or installed app. Passwords, tokens and unsaved input exist only in page memory. The browser may keep its normal static-file cache.
- A small WebP mascot replaces the original large PNG for loading on phones.
- Draft autosave waits five seconds after typing, then saves centrally. A visible save status and retry control expose failures. Submission waits for pending draft saves.
- Reloading signs staff out. Saved server drafts return after login. If changes have not saved, the page warns before closing; they can be lost if the browser is forcibly closed or the phone shuts down.
- Status polling runs every 90 seconds only while visible, and on focus. Internet is required.
- Login sessions are memory-only tokens backed by Apps Script cache, at most six hours; Google may evict cache entries earlier. Staff can sign in again without downloading records.

## Data integrity and access

All mutations use a ScriptLock and expected revisions. A conflicting phone edit is rejected rather than silently overwriting another edit. New JSON chunks are written and flushed before one authoritative head changes, preserving the preceding revision if a write is interrupted. Requests are locked on submission; Admin corrections create a new receipt version. Public status responses exclude item details and submitter names. Branch responses include only their own drafts and receipt details.

PBKDF2-SHA256 derives a salted password proof in the browser. The server stores an HMAC of that proof with a script-only pepper. Neither plaintext passwords nor server verifiers are returned in public metadata. Login failures are throttled per branch. HTTPS is required. No secrets belong in GitHub or the spreadsheet cells.

Google Apps Script and Sheets have quotas. The full Google service, OAuth/deployment flow, cross-origin requests, multi-phone syncing and load behavior must be checked after deployment. The local tests simulate Apps Script services; they do not prove hosted behavior.

## Checks

```text
node scripts/build-server.mjs
node --test tests/*.test.js
node scripts/check-release.mjs
npm run build
```

The release checker passes. All 38 local tests pass. Hosted public reads and rejection of unauthenticated writes were verified. Check the first real staff submission on a second phone; no fictitious requests were added to production.

## November 22 update

Status reads do not acquire the shared write lock. Each execution reads its head index once; immutable revisions are cached for five minutes. Snapshots return details for the selected delivery date only. Login reuses the salt from loaded metadata to avoid the extra challenge request. No password verifiers are exposed. A live three-request concurrent status check completed successfully in 3.6–4.1 seconds; real authenticated phone login still needs confirmation.

All future dates are open automatically; today and earlier dates remain blocked for new branch requests. Historical requests remain available through date selection.

Market Summary omits its unit column. The new 58 mm receipt uses source headings, dotted guides, and item/total rows; separate unit groups are kept separate even though units are not printed. Save the 384-pixel JPEG for a 58 mm thermal printer app, or use the browser print action. Actual MP-210 hardware output is unverified.

Admin request entry now has a searchable, alphabetically sorted master-item list.
