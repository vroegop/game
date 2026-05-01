# Idle Farming Game — Design Document

A detailed design for an idle / incremental farming game. The systems below
are interlocking layers, each unlocking the next, designed to give players
a satisfying progression curve from minute one to month twelve.

---

## 1. Core Loop

The 30-second loop the entire game is built around:

1. **Tend** — tap a ripe crop to harvest it (active play), or let it
   auto-harvest (idle play).
2. **Refine** — raw crops are processed at workshops (Mill, Cannery, Dairy)
   into higher-value goods.
3. **Sell or Stockpile** — sell goods at the Market for Coins, or stockpile
   them for recipes and upgrades.
4. **Upgrade** — spend Coins on plot expansions, faster growth, larger storage.
5. **Repeat at higher tier** — bigger numbers, better crops, new zones.

Every layer added below feeds back into this loop without replacing it.

---

## 2. Resource Hierarchy

Three parallel currencies with different roles:

| Resource | Source | Spent on | Resets on prestige? |
|---|---|---|---|
| **Coins** | Selling crops/goods | Plot upgrades, tools, growth speed | Yes |
| **Crops & Goods** | Farming + refining | Recipes, Market Orders, Workshop research | Yes |
| **Pollen** | Wild Patches (rare nodes) | Greenhouse research, Heirloom unlocks | No |
| **Legacy Seeds** | Prestige reward | Permanent multipliers, card gilding | No |
| **Sun Drops** | Premium / rewards / login | Time skips, premium chests | No |

Coins inflate fast (used and discarded). Pollen and Legacy Seeds are slow,
permanent, and gate the late game.

---

## 3. Crops & Tiers (Zones)

The map is divided into zones, each unlocked by progress through the
Festival Boss layer (see §6). Each zone introduces one base crop and one
"refined good" recipe.

| Zone | Crop | Refined good (workshop) | Grow time | Base sell |
|---|---|---|---|---|
| 1. Meadow | Wheat | Flour (Mill) | 5s | 1 |
| 2. Vegetable Patch | Carrots | Carrot Juice (Press) | 15s | 5 |
| 3. Cornfield | Corn | Cornmeal (Mill) | 45s | 25 |
| 4. Orchard | Apples | Cider (Press) | 2m | 120 |
| 5. Pumpkin Field | Pumpkins | Pumpkin Pie (Bakery) | 6m | 600 |
| 6. Berry Grove | Berries | Jam (Cannery) | 18m | 3 000 |
| 7. Vineyard | Grapes | Wine (Cellar) | 1h | 15 000 |
| 8. Pasture | Milk | Cheese (Dairy) | 3h | 75 000 |
| 9. Apiary | Honey | Mead (Cellar) | 9h | 375 000 |
| 10. Greenhouse | Exotics | Elixirs (Lab) | 24h | 1 875 000 |

**Critical design choice — old zones never die.** Late-game upgrades require
recipes that combine crops from across the entire chain, so every zone keeps
producing for the entire run.

### Wild Patches
Within any zone, ~1% of harvest cycles a normal plot is replaced by a
**Wild Patch**. Wild patches give the same crop *plus* a tiny amount of
**Pollen** — a permanent currency used in late-game research. They are
the primary reason to keep low-tier zones automated and running.

---

## 4. Workshops (Refining)

Each crop has an associated workshop that converts raw crops into refined
goods at a defined ratio (e.g. 10 Wheat → 1 Flour). Workshops have their
own upgrade track:

- **Throughput** — items produced per cycle.
- **Speed** — cycle time.
- **Yield** — chance for a bonus output.
- **Storage** — buffer cap before production halts.

Refined goods are worth ~5–10× their raw inputs sold individually but are
also the only way to satisfy Market Orders and most recipes. This forces
players to choose between fast cash (sell raw) and progression (refine).

---

## 5. Tools (The Spending Track)

Tools are permanent purchases that automate or amplify the loop. Each
zone supports its own set; tools also have global tiers.

| Tool | Effect | Unlocked at |
|---|---|---|
| **Watering Can** | +50% growth speed in one zone | Zone 1 |
| **Wooden Cart** | Auto-harvests one zone | Zone 2 |
| **Tractor** | Auto-replants + adds plots | Zone 3 |
| **Irrigation Network** | -50% grow time across all current zones | Zone 4 |
| **Greenhouse Roof** | Eliminates weather penalty | Zone 5 |
| **Drone Swarm** | Auto-harvests every zone simultaneously | Zone 7 |
| **Auto-Refiner Belt** | Workshops auto-feed from storage | Zone 8 |
| **Solar Array** | Doubles offline production rate | Zone 9 |

Each tool has **5 levels** with escalating cost (≈3× per level), so a single
tool is a continuous goal across many sessions.

---

## 6. Festival Bosses (Progression Gate)

The primary "boss" layer. Every few zones the player must enter the
**County Fair** and submit a basket against the **Festival Judge** —
a timed challenge that gates the next zone.

### Mechanics
- **Score Threshold (HP)** — total goods value the basket must exceed.
  Increases with each Festival defeated.
- **Pickiness (Armor)** — flat reduction subtracted from each item's
  scored value before it counts. If your best item is below the
  Pickiness threshold, you contribute zero — forces players to push
  refined-good quality, not just quantity.
- **Time Limit** — 30-second submission window; unique tools and Trinkets
  can extend it.
- **Defeating the Festival** raises the player's **Farmer Level cap** by
  +5, which gates further upgrades and unlocks.

Festival #1 is trivial; Festival #19 is the first hard wall in the game,
unlocking the Greenhouse research tree (see §11).

---

## 7. Farmer Level

A simple XP track fed by every harvest, sale, and refine. Each level
increases base growth speed, storage caps, and unlocks tool/recipe tiers.
**Initial cap is 30**; rises +5 per Festival cleared, so a player who has
beaten Festival #20 has a Farmer Level cap of 130.

This decouples passive grinding from real progression — you can grind XP
for a while, but you'll plateau until you beat the next Festival.

---

## 8. Recipes (The Backtracking Hook)

Recipes are the spine of the game. They consume crops and goods from
*multiple* zones to craft major upgrades, structures, and tools.

Examples:

- *Wooden Cart* = 50 Wheat + 10 Carrots
- *Tractor* = 200 Carrots + 50 Cornmeal + 1 Wooden Cart
- *Cider Press* = 100 Apples + 20 Carrot Juice + 10 Flour
- *Greenhouse Foundation* = 5 000 Berries + 200 Wine + 50 Cheese
- *Drone Swarm* = 10 Mead + 50 Elixirs + 1 Auto-Refiner Belt

The escalating recipe complexity is the single most important retention
mechanic: it forces *investment* in old zones (more plots, faster growth,
better workshops) instead of abandoning them.

---

## 9. Market Orders

Time-limited contracts unlocked at Festival #12. Each order requests a
specific bundle of refined goods within a deadline; completing it pays
**Reputation Points** (a soft currency reset on prestige) and a coin bonus.

- Reputation buys **Order Upgrades**: more concurrent orders, longer
  deadlines, double rewards, bigger bundles.
- Rerolls cost a small amount of Sun Drops.
- Orders escalate in size, providing a directed goal that makes the
  player optimize their refined-good throughput.

Because orders reset on prestige, they create a fresh mid-run goal each
prestige cycle without invalidating long-term progress.

---

## 10. Almanac Tasks (Challenges)

Unlocked at Festival #10. The Almanac is a list of permanent achievement
challenges, each granting **Blue Ribbons**.

Examples:
- Harvest 10 000 Wheat without buying any tools.
- Reach Festival #5 within 30 minutes of a fresh prestige.
- Refine 1 Cheese without ever selling raw Milk.
- Complete a run using only Zones 1–3.

Blue Ribbons are spent on **permanent global upgrades** (e.g.
+5% global growth speed, +1 plot in every zone). When all standard
Almanac tasks are complete, **Heirloom Tasks** unlock — a brutal endgame
challenge tier with 3× rewards.

---

## 11. Greenhouse Research (Construct Layer)

The hardest progression wall in the game. Unlocked at Festival #19, the
Greenhouse is a research lab where Pollen (§3) is spent to permanently
unlock new mechanics:

- Reveal **Stargazing** — a moon-phase modifier system (see §13).
- Reveal **Monuments** — major structures with global passive effects.
- Reveal **Heirloom Seeds** — unique permanent crop variants.

Greenhouse research is intentionally slow. A player at this stage is
expected to spend several prestige cycles funneling Pollen into a
single research node before unlocking it.

---

## 12. Cards (Seed Almanac)

Every crop and refined good has an associated **Card**. Cards are earned
by hitting milestones (e.g. "harvest 10 000 of crop X", "build 5
workshops"). Each card grants a small permanent buff for its associated
resource — typically +production or +sell value.

### Gilding
Standard cards can be **Gilded** by spending Legacy Seeds, Coins, and
Sun Drops. Gilded cards have ~2× the effect. Strategy guidance for
players: gild crop cards before refined-good cards, because crop cards
also boost coin yield and are required for one of the Almanac tasks.

---

## 13. Stargazing (Moon Phase Buffs)

Unlocked via Greenhouse research. Each in-game day cycles through a
**Moon Phase** (8 phases, ~3 hours real-time each), and each phase
applies a global modifier:

- *Harvest Moon* — +100% crop yield, no refined-good bonus.
- *Blood Moon* — +50% Festival score, -25% growth speed.
- *Hunter's Moon* — Wild Patches double in frequency.
- ...etc.

Players can spend a small amount of Sun Drops to **Skip** to a preferred
phase, creating an interesting micro-decision: do you push through a
sub-optimal phase or pay to align it with your current goal?

---

## 14. Monuments (Statues)

Late-game permanent structures crafted from huge resource bundles.
Each monument provides a **passive global buff** that does not reset
on prestige.

- *The Great Scarecrow* — +25% Pollen drop chance.
- *The Old Mill Statue* — Workshops produce 10% more.
- *The Beekeeper's Shrine* — Honey grows 50% faster.

Monuments are the long-term sink for surplus mid-tier resources at the
endgame. They are the player's "wallpaper" — visible in the main view
and slowly accumulated as a flex.

---

## 15. Trinkets (Items / Relics)

Random-drop items obtained from **Curio Chests** (earned slowly via
play, faster via Sun Drops). Each trinket is a passive buff with rarity
tiers:

| Tier | Drop chance | Power |
|---|---|---|
| Common | 70% | +X% to one stat |
| Rare | 25% | +X% to two stats |
| Epic | 4% | Unique conditional buff |
| Legendary | 1% | Major mechanic alteration (e.g. +30s Festival timer) |
| Divine | 1 / 25 000 | Game-changing buff (build runs around them) |

Trinkets are **slot-equipped** (e.g. 6 active slots). Surplus trinkets
can be melted into a "fragment" currency used to reroll for better
trinkets — a controlled gambling loop without real money exposure.

---

## 16. Burst Tools (Active Abilities)

Cooldown-based active abilities that use a **charge meter** filled by
play. They reward active sessions without making them mandatory.

- **Sprinkler Burst** — instantly waters all plots, harvest now.
- **Fertilizer Bomb** — next 30 seconds, all yields ×3.
- **Bee Swarm** — guarantees the next 10 plots are Wild Patches.
- **Pollen Storm** — converts current crops directly to Pollen.

Once charge regen is high enough to sustain it, players can enable
**Auto-Cast** for a chosen burst, turning it into a passive system.
This mirrors the classic idle-game pattern of "active mechanic →
unlocked for automation later."

---

## 17. Prestige — "Pass the Farm Down"

The standard idle reset, themed as the farmer retiring and passing the
land to their heir. Available after Farmer Level 20.

### What resets
- Coins, Crops, Goods, Tools, Workshops, Plots, Farmer Level, Market
  Orders, Reputation.

### What persists
- Legacy Seeds (the prestige currency itself).
- Almanac progress and Blue Ribbon upgrades.
- Cards and Gilding.
- Greenhouse research.
- Monuments.
- Trinkets.
- Pollen (rare).

### Legacy Seeds formula
Earned proportional to the highest Festival defeated this run. Spent on
permanent multipliers in a separate Legacy upgrade tree (e.g. +X% all
crop yield, +X% Sun Drop drops, -X% all upgrade costs).

---

## 18. Offline Progression

Closing the app does **not** stop progression. On reopen, the game
simulates elapsed time with two important caveats:

1. **Reduced rate** — offline production runs at ~50% of online rate.
   This protects active engagement (whales playing actively still earn
   meaningfully more than passive ones) and avoids server-burning idle
   trivializations.
2. **Capped duration** — first 8 hours offline simulated at 50%, anything
   beyond is heavily diminished. Encourages a daily login cadence
   without being punitive about a missed weekend.

Bursts and active-only systems do not progress while offline; only the
core grow→harvest→refine→sell pipeline does.

---

## 19. Sun Drops (Premium Currency)

Sun Drops are the only premium currency. Sources:

- **Free:** daily login, Almanac milestones, Festival defeats, very rare
  Wild Patch drops.
- **Paid (post-launch):** Sun Drop bundles, "remove ads" pack
  (irrelevant for v1 since we ship ad-free).

Spent on:

- Time skips on growth/refining.
- Curio Chests (trinket gambling).
- Card gilding (smallest of three costs).
- Stargazing phase skips.
- Cosmetic farm decorations.

**Important design rule:** Sun Drops never buy raw progression
(Coins, Crops, Festival completions). They only **accelerate** what the
player would earn anyway. This protects against pay-to-win backlash
and keeps the game balanceable.

---

## 20. Events & Seasons

Recurring 7-to-14-day events with a unique theme and time-limited rewards:

- **Harvest Festival** — submit goods to a leaderboard for unique cosmetics.
- **Pumpkin Spice Season** — Pumpkin yields ×3, exclusive recipes.
- **Lunar New Year** — Pollen drops doubled.

Events provide:
- Renewed engagement for veteran players.
- A controlled drip of new content without permanent design debt.
- A reason to log in daily for the event window.

---

## 21. Suggested Implementation Order (Prototype → v1.0)

| Milestone | Systems |
|---|---|
| **Prototype (2 wks)** | §1 core loop, §3 Zones 1–2, §5 one tool per zone, §17 save/load |
| **Vertical slice (4 wks)** | + §4 workshops, §6 first 3 Festivals, §7 Farmer Level, §8 first 5 recipes |
| **Beta (8 wks)** | + §9 Market Orders, §10 Almanac, §17 Prestige, §18 offline |
| **v1.0 launch (14 wks)** | + §12 Cards, §15 Trinkets, §16 Bursts, §19 Sun Drops |
| **Post-launch updates** | §11 Greenhouse, §13 Stargazing, §14 Monuments, §20 Events |

The order matters: every system listed earlier is a hard prerequisite for
the systems listed later. Implementing them out of order produces a game
that "feels off" because the supporting economy isn't in place yet.

---

## 22. Why This Design Works

- **No system is wasted.** Every tier of crop, every old zone, and every
  mid-tier currency keeps mattering through recipes, Wild Patches,
  Almanac tasks, and Monuments.
- **Multiple parallel goals** at every stage — Festival boss, Almanac
  challenges, Market Orders, recipe completion, card gilding, prestige
  progression. The player always has something to push toward.
- **Active and idle players both rewarded.** Active play earns 2× via
  bursts, Festivals, and order rerolls. Idle play still meaningfully
  progresses the core loop. Neither is "wrong."
- **Premium currency never gates progression**, which keeps the game
  playable forever for free — the entire point of the project.

---

## Appendix — Tuning Notes

A few non-obvious tuning rules learned from comparable games in the genre:

- **Cost curves should be ~3× per level**, not 2× or 10×. Below 3×,
  every upgrade feels mandatory and trivial; above 3×, players hit walls
  and quit.
- **Prestige should be available roughly every 4–8 hours** in the
  early game, scaling to several days in the late game.
- **The first prestige should be a noticeable speedup** (≥5× faster to
  reach the same point) — otherwise players don't understand why they'd
  ever reset.
- **Offline cap should be tuned to natural sleep cycles** (~8 hours).
  Capping shorter feels stingy; capping longer makes long absences too
  rewarding and devalues active play.
- **Festival difficulty should never spike by more than 2×** between
  consecutive bosses — predictable difficulty scaling lets players
  self-tune their grind expectations.
