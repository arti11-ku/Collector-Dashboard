# RECYSETU — GitHub Copilot Instructions

## 1. PROJECT IDENTITY

RECYSETU is an e-waste collection, aggregation, recycling and traceability PWA.

The intended ecosystem contains four roles:

- Collector
- Aggregator
- Recycler
- Admin

The current repository contains the Collector experience plus basic Aggregator, Recycler and Admin dashboard shells.

Another team member is developing more complete Aggregator and Recycler dashboards separately. Those dashboards will later be merged with this repository.

Therefore this repository must remain compatible with a shared backend/data model.

---

# 2. CURRENT REPOSITORY BASELINE

Treat the CURRENT repository as the source of truth.

Do not assume that features mentioned in older prompts already exist.

Before changing anything, inspect the actual current implementation.

Current major technologies:

- React
- TypeScript
- React Router
- Tailwind CSS
- Express
- Firebase / Firestore
- Firebase Admin
- Google Gemini via `@google/genai`
- i18next / react-i18next
- qrcode.react
- Vite
- PWA configuration

Important existing files/components include:

- `server.ts`
- `src/App.tsx`
- `src/types/index.ts`
- `src/context/AuthContext.tsx`
- `src/i18n.ts`
- `src/pages/auth/*`
- `src/pages/collector/AddMaterial.tsx`
- `src/pages/collector/CheckPrice.tsx`
- `src/pages/collector/CreatePickup.tsx`
- `src/pages/collector/Assistant.tsx`
- `src/pages/collector/MyLots.tsx`
- `src/pages/collector/LotDetails.tsx`
- `src/pages/collector/Earnings.tsx`
- `src/pages/collector/Contribution.tsx`
- `src/pages/dashboards/CollectorDashboard.tsx`
- `src/pages/dashboards/AggregatorDashboard.tsx`
- `src/pages/dashboards/RecyclerDashboard.tsx`
- `src/pages/dashboards/AdminDashboard.tsx`

---

# 3. MOST IMPORTANT DEVELOPMENT PRINCIPLE

This is an EXISTING application.

DO NOT rebuild RECYSETU from scratch.

DO NOT replace working functionality merely because a rewrite is easier.

Before making changes:

1. inspect the relevant files;
2. understand the existing data flow;
3. identify the actual root cause;
4. modify the smallest sensible set of files;
5. preserve compatibility;
6. run type checks/build/tests;
7. verify actual behavior.

Do not make a superficial UI change when the root problem is in backend/API/Firestore logic.

Do not claim a feature is fixed merely because the page looks correct.

---

# 4. DO NOT DESTROY EXISTING DATA

Never:

- wipe Firestore;
- delete all users;
- reset authentication data;
- delete existing Lots merely to make the new code work;
- replace real database reads with static arrays;
- create duplicate users for existing phone numbers.

Existing legacy records may have older fields/status names.

Handle legacy data safely.

Do not silently destroy existing data to solve schema inconsistencies.

---

# 5. CURRENT FEATURES THAT ALREADY EXIST

The repository currently has working/partially working foundations for:

- role selection;
- Collector OTP authentication;
- password login;
- onboarding;
- preferred language selection;
- browser geolocation attempt during onboarding;
- Collector Home;
- Add Material;
- Check Price;
- Create Pickup;
- My Lots;
- Lot Details;
- Earnings;
- Contribution / points;
- Collector Assistant UI;
- QR generation infrastructure;
- Lot handover OTP generation;
- Firestore-backed Lots;
- Firestore-backed Pickup Requests;
- persisted Events;
- notifications for assigned partner;
- basic Aggregator dashboard stats;
- basic Recycler dashboard stats;
- basic Admin stats;
- English/Hindi/Marathi translation infrastructure;
- PWA foundation.

Preserve these unless a direct modification is required to repair them.

---

# 6. CURRENTLY BROKEN / INCOMPLETE AREAS

These are known current-state problems and MUST NOT be assumed solved.

## 6.1 Add Material

Current implementation directly creates a Lot through:

`POST /api/collector/lots`

after selecting one material and weight.

That is NOT the intended final business flow.

Required future flow:

materials
→ weights
→ location
→ price/reference
→ offers
→ partner selection
→ pickup date/time
→ payment preference
→ final confirmation
→ final Lot creation

Material + weight alone MUST NOT create the final Lot.

---

## 6.2 Multiple Materials

The backend/type system already contains multi-material concepts through `LotItem` / `items`, but the current Collector Add Material UI still fundamentally selects one material.

The intended design is:

ONE transaction
→ ONE final Lot
→ MULTIPLE LotItems

Example:

Mobile Phone — 5 kg
Laptop — 3 kg
Battery — 2 kg

Do not create three unrelated final Lots for one collector transaction.

The collector must be able to add/remove/edit multiple waste items before final confirmation.

---

## 6.3 Check Price

The current `CheckPrice.tsx` contains prototype/mock logic including:

- hardcoded state fallback;
- hardcoded state options;
- mock pricing;
- mock distances;
- mock transport costs;
- mock partner adjustment;
- hardcoded/demo partner names;
- hardcoded/demo offers.

This is NOT authoritative production business data.

The future architecture must separate:

1. reference/estimated market value;
2. actual partner-submitted offer.

Do not confuse the two.

---

## 6.4 Maharashtra Fallback

This is a known critical bug.

The current Check Price implementation contains Maharashtra as a generic/default state fallback.

This must NOT remain the authoritative location behavior.

Never silently turn an unresolved or different location into Maharashtra.

Examples:

Bhilai, Chhattisgarh
→ Chhattisgarh

Durg, Chhattisgarh
→ Chhattisgarh

Mumbai, Maharashtra
→ Maharashtra

If state cannot be determined reliably:

ASK for clarification.

Do not guess Maharashtra.

---

## 6.5 Current Location

Current onboarding location logic uses browser geolocation and a direct reverse-geocoding request.

This is not yet a proper shared location system.

Future implementation should introduce/reuse one authoritative location-resolution service used by all relevant flows.

It should support:

### Current location

coordinates
→ reverse geocoding
→ city
→ district
→ state
→ country
→ formatted address

### Manual address

typed address
→ forward geocoding
→ city
→ district
→ state
→ country
→ coordinates where possible

Do not treat address as plain text only.

The application may run inside an embedded AI Studio/iframe-like environment where browser geolocation can be restricted.

That must be handled gracefully.

Manual address resolution must still work even when embedded preview geolocation is blocked.

---

# 7. ASSISTANT CURRENT STATE

The Collector Assistant UI exists in:

`src/pages/collector/Assistant.tsx`

The backend has:

`POST /api/ai/chat`

and `@google/genai` integration.

The Assistant currently has tools such as:

- `findNearbyPartners`
- `getMaterialPrice`
- `createPickupRequest`
- `getUserData`
- `getUserLots`
- `getPaymentStatus`

However, some of those current tools contain mock/static business behavior.

Examples include:

- mock partner generation;
- mock prices;
- direct pickup request creation;
- mock payment-status response.

Do not trust those tools as the desired final architecture.

The Assistant must eventually become:

1. a normal conversational AI assistant;
2. a conversational entry point into the real Collector workflow.

The Assistant should understand:

- English;
- Hindi;
- Marathi;
- Hinglish;
- mixed/broken English-Hindi-Marathi;
- natural voice transcription where browser support exists.

Examples:

"I have 5 kg mobile phones and want pickup."

"मुझे 5 किलो मोबाइल बेचने हैं।"

"माझ्याकडे ५ किलो मोबाईल आहेत, पिकअप हवा आहे."

"मेरे पास 5 kg mobile और 3 kg laptop हैं।"

The Assistant should identify intent and collect missing information.

AI interpretation MUST NOT directly bypass trusted backend validation and create arbitrary Lots.

---

# 8. ASSISTANT TRANSACTION RULE

The Assistant should use the SAME authoritative Collector transaction workflow as:

- Add Material;
- Check Price;
- Generate Pickup Request.

Do not create a completely separate Assistant-only transaction architecture.

The Assistant may maintain a draft transaction/session.

Draft transaction
≠
final Lot.

Only final trusted backend confirmation should create:

- Lot;
- LotItems;
- Lot ID;
- QR;
- handover OTP;
- PickupRequest;
- selected partner;
- payment preference;
- notification;
- traceability events.

---

# 9. MULTILINGUAL ASSISTANT

Assistant requirements:

- English understanding;
- Hindi understanding;
- Marathi understanding;
- mixed-language understanding;
- broken/informal phrases;
- natural conversational corrections.

The application should respond in the user's current language where practical.

Voice recognition, when supported, should use appropriate:

- `en-IN`
- `hi-IN`
- `mr-IN`

language configuration.

Text input must continue to work even if browser speech recognition is unsupported.

---

# 10. CURRENT CREATE PICKUP STATE

The current `CreatePickup.tsx` contains a hardcoded `PARTNERS` array.

That is currently a prototype implementation.

Do not treat this static array as the final partner database.

Future partner data must come from shared backend/database data.

The Collector should eventually select from actual eligible partner records.

---

# 11. NEARBY PARTNER MODEL

The intended future partner-selection architecture is:

Collector location
→ geographic partner search
→ eligible nearby Aggregators/Recyclers
→ offers
→ Collector selects one

Target maximum partner search radius:

15 km

The system should use:

Collector latitude/longitude
+
Partner latitude/longitude

to calculate actual distance.

Do not use fake hardcoded distances.

Do not invent partners.

Do not show fake partner responses merely to fill three cards.

If three or more eligible partners exist, the system should request quotations from multiple nearby partners.

“At least three options” means three eligible/relevant options where available, not fabricated responses.

---

# 12. TWO POSSIBLE OFFER MODES

RECYSETU may support two offer sources:

## Mode A — Prototype/reference mode

Reference or historical/current configured market rates can be used to show indicative offers for demonstration.

This must be clearly separated from actual partner quotations.

## Mode B — Real quotation mode

Collector request
→ eligible nearby partners
→ partner submits price
→ Collector receives submitted offer.

This mode is designed to connect to the separate Aggregator/Recycler dashboards.

Do not mix these two modes invisibly.

---

# 13. PARTNER OFFER RULES

Actual partner offers should be backend records.

Conceptually:

PartnerOffer:

- offerId
- requestId
- partnerId
- partnerType
- partnerName
- partnerAddress
- offeredBaseAmount
- transportCharge
- otherCharges
- finalAmount
- status
- submittedAt
- validUntil where needed

Do not hardcode:

EcoHub = ₹1615

inside the Collector UI.

The price should come from:

- reference pricing logic;
OR
- actual partner submission.

---

# 14. BEST OFFER

The highest CURRENT VALID OFFER may be marked:

BEST OFFER
or
BEST PRICE

But it must be dynamically calculated.

If:

EcoHub = ₹1615
Partner B = ₹1590
Partner C = ₹1540

then EcoHub can be highlighted as BEST OFFER.

If another partner later submits ₹1700, that partner becomes BEST OFFER.

Never permanently hardcode one partner as best.

The Collector must still explicitly select the partner.

---

# 15. DEMO PARTNER

Primary demonstration Aggregator:

**EcoHub Aggregators**

Operational address:

**KRIPAL NAGAR KOHKA BHILAI,  
Bhilai, Durg Tahsil,  
Durg, Chhattisgarh,  
490001, India**

Use the shared/real partner record when available.

Do not create an unrelated Collector-only partner record.

---

# 16. FINAL COLLECTOR TRANSACTION FLOW

The intended final Collector flow is:

Material selection
→ one or more materials
→ weight(s)
→ location resolution
→ reference price
→ nearby partner offers
→ choose partner/offer
→ pickup date/time
→ payment preference
→ final review
→ final confirmation
→ final Lot + Pickup + QR + OTP

All Collector entry points must eventually converge into this same business flow:

- Add Material
- Check Price
- Generate Pickup Request
- Assistant

Do not maintain unrelated business rules for each screen.

---

# 17. FINAL LOT CREATION RULE

Final Lot creation is allowed ONLY after the Collector has supplied the required transaction information and explicitly confirms.

Do NOT create a final Lot when:

- material is selected;
- weight is entered;
- Check Price is opened;
- offers are displayed;
- an offer is merely viewed;
- an offer is received;
- Generate Pickup Request is clicked.

Only final confirmation creates the final Lot.

---

# 18. LOT CREATION DATA

A final Lot should contain enough data for the complete lifecycle.

Important concepts include:

- lotId;
- collectorId;
- items;
- selected partner;
- partner type;
- pickup reference;
- payment preference;
- amount/offer;
- QR;
- handover OTP;
- verification state;
- status;
- timestamps.

The current backend already supports fields such as:

- `assignedPartnerId`
- `assignedPartnerType`
- `pickupRequestId`
- `items`
- `qrToken`
- `handoverOtp`
- `payment`
- `status`

Preserve compatibility with those structures unless a justified improvement is necessary.

---

# 19. PICKUP ↔ LOT

The final transaction should link:

Lot
↔
PickupRequest

using stable references such as:

- lotId;
- pickupRequestId.

Do not allow a final business transaction to produce an orphan pickup without the associated Lot.

Do not create unrelated duplicate records for Home, Track Pickup and My Lots.

---

# 20. STATUS LIFECYCLE

The intended final Lot lifecycle is:

PENDING_HANDOVER
→ HANDOVER_CONFIRMED
→ PAYMENT_PROCESSING
→ COMPLETED

The meaning is:

### PENDING_HANDOVER

Lot created and assigned to partner, waiting for partner pickup/handover action.

### HANDOVER_CONFIRMED

Partner has completed the appropriate handover workflow.

### PAYMENT_PROCESSING

Partner-side process has moved the transaction into payment handling.

### COMPLETED

Collector confirms payment has actually been received.

Do NOT mark COMPLETED simply because pickup happened.

Do NOT let Collector pretend a partner action occurred.

---

# 21. CURRENT STATUS COMPATIBILITY PROBLEM

The current repository has inconsistent status naming across layers.

Examples:

Backend/type model uses:

- `PENDING_HANDOVER`
- `HANDOVER_CONFIRMED`
- `PAYMENT_PROCESSING`
- `COMPLETED`

Some UI code currently expects:

- `HANDED_OVER`
- `PROCESSING`

Some older Admin/Recycler logic still references:

- `RECYCLING_COMPLETED`

When repairing the application:

1. identify all status strings;
2. establish one authoritative lifecycle;
3. add compatibility handling for older records where necessary;
4. do not silently break legacy data.

Do not let different pages use different meanings for the same status.

---

# 22. COLLECTOR HOME

After a final transaction exists, Home should show the actual current transaction from backend data.

Important information should include, where available:

- Lot ID
- Partner
- partner type
- material(s)
- weight(s)
- agreed amount
- pickup date
- pickup time
- payment preference
- current status
- QR access
- OTP access where appropriate

If pickup is today:

show:

**PICKUP TODAY**

Home must not depend only on stale local React state.

---

# 23. TRACK PICKUP

Track Pickup must act as a tracker.

If no active transaction exists:

show an empty state:

No active pickup request yet.

[Generate Pickup Request]

Clicking this should START the shared workflow.

It must NOT instantly create an orphan PickupRequest.

After a final transaction exists:

Track Pickup must show the real transaction and its progress.

It should not be a separate fake data source.

---

# 24. MY LOTS

My Lots must classify final Lots by authoritative backend status.

The UI should eventually support categories such as:

- ALL
- PENDING HANDOVER
- HANDOVER CONFIRMED
- PAYMENT PROCESSING
- COMPLETED

Map older status values safely where necessary.

Material display must be human-readable.

Do not show only a raw ID such as:

`mobile`

when the UI should display:

`Mobile Phone`

---

# 25. LOT MATERIAL INFORMATION

A final Lot must retain the material information.

Where possible, show:

Material Name
+
Weight
+
Unit

for every LotItem.

Do not lose material details between:

- Add Material
- final Lot
- Home
- My Lots
- Lot Details
- Track Pickup
- partner dashboards.

---

# 26. QR + OTP

The current backend already generates:

- QR token;
- handover OTP.

Preserve this infrastructure.

However:

QR and handover OTP must belong to the actual final persisted Lot.

Do not create fake frontend-only values.

Do not generate final QR/OTP before final Lot creation.

---

# 27. PARTNER ROLE SEPARATION

Collector dashboard owns:

- request;
- offers;
- selection;
- pickup details;
- payment preference;
- tracking;
- payment receipt confirmation.

Aggregator/Recycler dashboards own their operational actions.

Do NOT simulate in Collector UI:

- partner acceptance;
- partner pickup;
- QR scan;
- OTP verification;
- handover confirmation;
- partner payment processing.

The Collector should read the resulting backend state.

---

# 28. FUTURE AGGREGATOR / RECYCLER MERGE

Another team member is building more complete Aggregator and Recycler dashboards.

Therefore backend contracts must remain clean.

Use shared stable identifiers:

- collectorId
- partnerId
- partnerType
- requestId
- offerId
- lotId
- pickupRequestId

If Collector selects:

partnerType = AGGREGATOR

the request must be targetable to that specific Aggregator.

If:

partnerType = RECYCLER

the request must be targetable to that specific Recycler.

Do not notify every partner.

---

# 29. PAYMENT PREFERENCE

Before final confirmation, the Collector must eventually choose:

- CASH
- UPI

If UPI:

use the Collector's registered mobile number as the UPI identifier according to the current RECYSETU business rule.

Store the payment preference in the transaction.

Do not consider a transaction completed merely because the payment preference exists.

---

# 30. COLLECTOR PROFILE

The current route:

`/collector/profile`

is currently a placeholder:

`Profile (Coming Soon)`

Future work should turn this into a visually useful profile containing relevant Collector information, including where appropriate:

- name
- mobile
- address
- city
- district
- state
- location
- language
- UPI/mobile
- points
- contribution score
- role

Do not remove the route.

---

# 31. TRANSLATION

The repository has:

- English
- Hindi
- Marathi

via i18next.

However, many pages still contain hardcoded English strings.

Do not consider translation complete merely because `i18n.ts` contains translations.

New UI text should use translation keys.

Eventually language switching should apply throughout the Collector application, including:

- navigation;
- dashboard;
- cards;
- buttons;
- forms;
- statuses;
- errors;
- empty states;
- My Lots;
- Track Pickup;
- Profile;
- Contribution;
- Assistant;
- notifications;
- dialogs.

Proper names such as RECYSETU and partner names should remain names unless transliteration is intentionally desired.

---

# 32. CONTRIBUTION / POINTS

Current repository has a basic points/contribution foundation.

The backend currently awards points on completion and updates contribution score.

Do not unnecessarily rewrite this until the core transaction lifecycle is stable.

Future feedback/reputation work will build on this.

---

# 33. CURRENT AGGREGATOR / RECYCLER DASHBOARDS

The current repository contains basic dashboard shells/stats endpoints.

They are NOT yet the complete operational dashboards being developed separately.

Do not assume they are complete.

When implementing Collector-side integration:

build against clean backend contracts.

Do not fake the partner's operational actions in the Collector UI.

---

# 34. CURRENT ADMIN DASHBOARD

Admin functionality is currently mostly statistics/overview level.

Do not assume full:

- user management;
- disputes;
- complaints;
- traceability;
- partner management;
- reputation management

already exists.

Those are later phases.

---

# 35. ASSISTANT ACTION SAFETY

AI output is untrusted interpretation.

The AI may:

- understand intent;
- extract material;
- extract weight;
- extract date/time;
- identify location intent;
- ask missing questions.

The AI must NOT be trusted to arbitrarily decide:

- final partner ID;
- final Lot ID;
- payment received;
- completed state;
- unauthorized status changes.

Backend validation must remain authoritative.

---

# 36. DUPLICATE PROTECTION

Final transaction creation must protect against accidental double-clicks/repeated requests.

Do not create:

- duplicate Lots;
- duplicate PickupRequests;
- duplicate notifications

from one final user confirmation.

Use suitable idempotency or duplicate detection where practical.

---

# 37. ERROR HANDLING

Never hide backend failures behind fake success.

Do not show:

"Pickup scheduled"

unless the backend actually created the intended transaction.

Do not show:

"Lot created"

unless the Lot was persisted successfully.

Do not show fake partner offers.

Do not silently substitute Maharashtra for failed location resolution.

Technical errors should be logged for debugging while user-facing errors should remain clear.

---

# 38. LOCATION RULES

Location is a shared domain service, not page-specific logic.

Relevant flows must eventually reuse the same location resolution:

- onboarding;
- Add Material;
- Check Price;
- Create Pickup;
- Track Pickup;
- Assistant;
- partner search;
- pricing;
- final transaction.

Location should provide, where available:

- formattedAddress
- city
- district
- state
- country
- latitude
- longitude

If location is unavailable:

ask for manual address.

Do not guess a state.

---

# 39. CURRENT PROJECT'S PROTOTYPE NATURE

Some current features deliberately use prototype/demo behavior.

Examples include:

- OTP delivery simulation;
- AI material identification simulation;
- reference pricing;
- some dashboard statistics.

Do not remove prototype functionality unnecessarily.

Instead, keep demo layers clearly separated from authoritative business data and make future replacement possible.

---

# 40. SIH DEMONSTRATION PRINCIPLE

The project is intended for an SIH prototype/demo.

Therefore the UX must tell one consistent story.

Avoid situations where:

- Check Price shows one partner;
- Create Pickup shows unrelated partners;
- Home shows another transaction;
- Track Pickup shows a different request;
- Lot Details shows missing material;
- pricing says Maharashtra while location says Chhattisgarh.

All screens should eventually tell the same transaction story from shared data.

---

# 41. DEVELOPMENT ORDER

When implementing future requests, prefer this general order:

### Priority 1
Fix broken fundamentals:

- Assistant
- location resolution
- shared transaction data flow
- Lot creation timing
- pickup flow consistency

### Priority 2
Implement/refine:

- reference pricing
- nearby partner discovery
- quotation/offer system
- partner selection

### Priority 3
Implement/refine:

- Home
- Track Pickup
- My Lots
- status lifecycle
- QR/OTP presentation

### Priority 4
Implement:

- profile
- payment preference
- complete translations

### Priority 5
Implement:

- Aggregator integration
- Recycler integration
- feedback/reputation
- Admin functionality

Do not skip foundational work and patch later screens with fake data.

---

# 42. HOW COPILOT SHOULD WORK

For each task:

1. Inspect the relevant current files.
2. Identify the root cause.
3. Explain the planned change briefly.
4. Modify code.
5. Reuse existing architecture.
6. Run `npm run lint`.
7. Run `npm run build` when appropriate.
8. Test relevant API/data flow where possible.
9. Check that unrelated features remain intact.
10. Report exact files and logic changed.

Do not make broad unrelated refactors during a focused task.

---

# 43. NEVER ASSUME A PREVIOUS AI STUDIO PROMPT WAS SUCCESSFUL

Older prompts may have described desired behavior that is NOT actually present.

The current repository must always be inspected before implementation.

The desired behavior comes from these instructions plus the current task.

Do not say:

"this was already implemented"

until verified in code/runtime.

---

# 44. WHEN A TASK TOUCHES MULTIPLE ROLES

Keep responsibilities separated.

Collector:
request/select/track.

Aggregator:
receive/quote/pickup/handover/payment.

Recycler:
receive/quote/process/handover/payment.

Admin:
monitor/manage.

Shared backend:
persist/connect/validate.

Do not move another role's responsibility into Collector merely because that dashboard has not yet been merged.

---

# 45. TESTING STANDARD

A feature is NOT complete just because:

- a button appears;
- a card appears;
- a message appears;
- hardcoded data appears;
- TypeScript compiles.

A feature is complete only when the real data flow works.

Where applicable, verify:

Frontend
→ API
→ backend logic
→ Firestore
→ response
→ frontend state
→ visible UI

---

# 46. REQUIRED PRECAUTION BEFORE MAJOR CHANGES

For substantial changes:

- inspect git status;
- preserve existing changes;
- avoid overwriting unrelated work;
- prefer a focused commit/branch when possible.

Do not reset user changes.

Do not run destructive commands unless explicitly required.

---

# 47. CURRENT WORKING BASELINE TO PRESERVE

The following existing foundation should remain intact unless directly relevant to a requested fix:

- authentication;
- OTP;
- password login;
- onboarding;
- preferred language;
- Collector Home;
- existing Lot details route;
- existing QR generation;
- existing OTP generation;
- Firebase/Firestore connection;
- existing contribution and earnings foundation;
- role-based route protection;
- PWA configuration.

---

# 48. FINAL RULE

RECYSETU should be treated as ONE connected platform, not a collection of disconnected pages.

The target architecture is:

Collector
↕
Shared backend / Firestore
↕
Aggregator

and:

Collector
↕
Shared backend / Firestore
↕
Recycler

and:

Admin
↕
Shared backend / Firestore

Every future change should move the repository toward that architecture without unnecessarily breaking what already works.

## MOST IMPORTANT BUSINESS RULES

1. Material + weight alone must NEVER create a final Lot.
2. Multiple materials must be possible in one Lot.
3. Location must come from actual resolved location data.
4. Never blindly default location/state to Maharashtra.
5. Assistant must understand English, Hindi and Marathi.
6. Assistant must use the same trusted transaction workflow as the normal Collector UI.
7. Actual partner offers must come from backend data, not hardcoded Collector cards.
8. Highest valid current offer may be highlighted as BEST OFFER, but Collector chooses.
9. Collector must not fake Aggregator/Recycler actions.
10. Home, Track Pickup, My Lots and Lot Details must show the same persisted transaction.
11. Final status must follow the authoritative lifecycle.
12. Future Aggregator/Recycler dashboards must be able to consume the same shared records.
13. Existing working features and existing Firestore data must be preserved.
14. Never claim a feature is fixed without testing it.
