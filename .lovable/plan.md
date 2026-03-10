

## Wine Cellar — Unified Tasting App

Combine both projects into a single app where the host chooses the tasting format during setup, and the guest experience adapts accordingly.

### Host Setup Flow
1. **Tasting Type Selection** — First step in setup: host picks **Blind Tasting** or **Open Tasting** via two clear, full-width cards
2. **Blind Tasting Options** — When blind is selected, show an additional setting: **Wine Origin Format** with two choices:
   - **International & Local Mix** — host marks which wines are international (via checkbox/globe icon per wine, plus an "International" column in the spreadsheet template)
   - **All Local** — no international guessing, just blind ranking
3. **Wine Upload & Manual Entry** — Same spreadsheet upload and manual entry flow from the existing projects. Template adjusts based on tasting type (includes "International" column only for international mix)
4. **Flight Configuration** — Wines per flight and total flights, same as current

### Session Data
- Store tasting type (`blind` or `open`) and origin format (`international_mix` or `local_only`) in the session alongside wines, flights, and guests
- Wine entries include the `isInternational` flag (only relevant for blind + international mix)

### Guest Tasting Experience

**Open Tasting:**
- Wine cards show full details (name, vintage, region, country)
- Guest ranks wines per flight (#1 = favourite)
- No reveal step — move directly to next flight or results after ranking

**Blind Tasting (Local Only):**
- Wine cards show only "Wine #1", "Wine #2" etc. — details hidden
- Guest ranks wines per flight
- After ranking, a "Reveal Flight" button shows wine identities sliding in beside rankings
- Then proceed to next flight

**Blind Tasting (International & Local Mix):**
- Same hidden wine cards as above
- After ranking all wines in a flight, international guessing checkboxes appear ("I think this is international")
- After guessing, "Reveal Flight" shows identities + correct/incorrect guess feedback
- Then proceed to next flight

### Summary & Results
- **Open Tasting**: Top picks per flight, detailed rankings with wine info, order button
- **Blind Tasting (Local)**: Top picks revealed, detailed flight-by-flight results with reveal, order button
- **Blind Tasting (International Mix)**: All of the above plus international guessing score card (X/Y correctly identified)

### Host Dashboard
- Shows tasting type badge (Blind/Open + origin format)
- QR code for guest registration
- Guest list with completion status
- Email all guests their favourites

### Design & Styling
- Carry over the existing Wine Cellar theme (Playfair Display headings, DM Sans body, gold/sage/burgundy palette, warm card-based layout)
- Apply the design brief's typography update: **Cormorant Garamond** for headings, **Source Sans 3** for body text
- Off-White background (`#F8F5F0`), Ink Black text (`#1A1A1A`), Deep Burgundy accent (`#590212`) for interactive elements
- Tasting type selection uses the same deliberate, full-screen card pattern from the design brief

### Technical Approach
- All code ported into this project from both source projects
- localStorage-based data store (no backend needed)
- Uses `xlsx` library for spreadsheet parsing (needs to be added as dependency)
- Uses `framer-motion` for animations (needs to be added)
- Uses `qrcode.react` for QR code on host dashboard (needs to be added)
- Existing assets (logo) copied over

