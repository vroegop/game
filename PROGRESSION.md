# Idle Farm — Long-Running Progression Plan

A roadmap for turning the prototype into a multi-month idle game that
rewards both active dragging sessions and offline waiting.

## 1. Design philosophy

**Goal:** months of meaningful play. Each session should feel
productive in 2 minutes; each day should unlock one or two
upgrades; each week should open a new tier.

### Five engagement loops, nested

| Cadence | Loop |
|---|---|
| 30 sec | Drag → harvest → sell → buy upgrade. Dopamine. |
| 5 min | Save up for the *next* upgrade (yield, growth, cart). |
| 30 min | Hit a soft wall, finally afford the next zone unlock. |
| 1 day | Log in, collect offline gains, plan today's investments. |
| 1 week | Reach a new tier; new colors, new pacing, new cap to chase. |
| 1+ month | Prestige into a new "season" with permanent multipliers. |

### Active vs. idle balance

- **Active drag:** ~2× cart auto-rate at every cart level. Active play is
  always a real boost but never required.
- **Cart automation:** sustainable income, fully hands-off.
- **Offline:** capped sweep-area model, cap upgradable from 8 h to
  72 h. Returning players get a noticeable gift, but never *more*
  than active players.
- **Sweet spot:** ~30 min of active play / day yields ~50 % of total
  daily progression; the rest comes from carts + offline.

## 2. Crop tier ladder (12 tiers)

Designed as a roughly geometric progression. Each tier is ~5–6× more
valuable per crop than the previous, takes ~2.5–3× as long to grow,
and costs ~6–8× as much to unlock.

| # | Crop | Grow time | Sell value | Unlock | Color |
|---|------|-----------|------------|--------|-------|
| 1 | Wheat | 5 s | 1 | free | gold |
| 2 | Carrots | 14 s | 5 | 50 | orange |
| 3 | Corn | 35 s | 28 | 300 | yellow |
| 4 | Potatoes | 90 s | 150 | 2 000 | tan |
| 5 | Tomatoes | 4 min | 800 | 14 000 | red |
| 6 | Pumpkins | 12 min | 4 200 | 90 000 | deep orange |
| 7 | Berries | 35 min | 22 000 | 600 000 | purple |
| 8 | Grapes | 2.5 h | 110 000 | 4 000 000 | wine |
| 9 | Sunflowers | 7 h | 580 000 | 28 000 000 | bright yellow |
| 10 | Truffles | 15 h | 3 000 000 | 200 000 000 | dark brown |
| 11 | Saffron | 1.5 days | 16 000 000 | 1.5 billion | crimson |
| 12 | Golden Lotus | 3 days | 90 000 000 | 12 billion | luminous gold |

The tier 12 unlock cost (~12 B) takes weeks of consistent play even
with all upgrades and full offline cap. That's the intended monthly
target.

## 3. Upgrade systems

Each zone gets four upgrade lines. Each line caps at L50 (most) or
L100 (cart). Costs grow ~1.65–1.7× per level.

### 3.1 Per-zone upgrades

| Upgrade | Effect per level | Base cost | Cost mult | Max |
|---|---|---|---|---|
| **Cart** | First L1 buys 1 cart. Each level: +15% speed, +7% radius. New cart at L12, L24, L40. | 30 | 1.7× | 100 |
| **Yield** | +1 crop per harvested spot (multiplier on sell value). | 25 | 1.6× | 50 |
| **Growth** | -3 % grow time (multiplicative). Floor at 10 % of base. | 40 | 1.65× | 30 |
| **Sell price** | +5 % per crop (additive to a price multiplier). | 60 | 1.7× | 50 |

A fully maxed zone is therefore producing ~50× crops/spot at ~10× the
sell price in ~10 % of the original time — which is a 500× boost
combined. That's why the next tier costs ~600×.

### 3.2 Global upgrades

Apply across all zones.

| Upgrade | Effect | Base cost | Cost mult | Max |
|---|---|---|---|---|
| **Drag radius** | +0.018 normalized field per level | 40 | 2.6× | 20 |
| **Offline cap** | +1 hour (start 8, max 24, then 36, 48, 72) | 1 000 | 3× | 16 |
| **Coin multiplier** | +5 % all earnings | 200 | 2× | 25 |
| **Harvest fanfare** | (cosmetic) particle effects | 5 000 | 2× | 5 |

### 3.3 Late-game (post v1)

Once a player has unlocked tier 8+, two new systems open:

- **Prestige (Pass the Farm):** soft reset all zones to L0, keep
  global upgrades. Earn "Heirloom Seeds" proportional to highest
  tier reached. Spend on permanent multipliers (e.g. +1 % all
  yield per seed). Each successive prestige takes longer; total
  multiplier asymptotes around 50× over many prestiges.
- **Specializations:** pick *one* permanent path
  - **Tractorhead** — carts move 2×, harvest 2× crops per pass.
  - **Greenthumb** — crops grow 50 % faster, +2 yield default.
  - **Salesman** — +50 % sell price, +25 % offline cap.
  Locked-in choice creates build identity and replay value across
  prestiges.

## 4. Layout presets (visual)

Crop placement uses one of six hand-designed templates per zone. The
template is picked deterministically by zone seed, so the same zone
always has the same layout. Spot count varies (10–24) so screens
don't have to feel "full".

1. **Sparse Meadow** — 12 spots in 3 small clusters; lots of empty
   soil between.
2. **Random Scatter** — 16 spots truly random (rejection sampling),
   uniform distribution.
3. **Two Groves** — 18 spots in 2 distinct dense clusters with a
   narrow path in the middle.
4. **Diagonal Stripe** — 14 spots in a gentle diagonal band, edges
   bare.
5. **L-shape** — 16 spots in an L pattern, two corners empty.
6. **Corner Cluster** — 20 spots packed into one corner, a few
   outliers — feels like the rest of the field is fallow.

Min distance is enforced regardless of preset so sprites never
visually overlap.

## 5. Pacing math

A few sanity checks the simulator will validate:

- **Tier 1 → Tier 2 unlock:** ~80 s with 1 cart, ~30 s with active drag.
- **Tier 2 → Tier 3:** ~3 min active.
- **Tier 5 → Tier 6:** ~1 day idle, ~2 hr active.
- **Tier 8 → Tier 9:** ~5 days idle, ~8 hr active.
- **Tier 11 → Tier 12:** weeks idle, days active.
- **First prestige worth doing:** roughly when reaching tier 9, you're
  earning more from prestige rebound than from raw progression.

## 6. AFK fairness

To make sure offline players don't fall too far behind:

- Offline rate per cart ~80 % of active rate (cart sweep is the same
  formula whether app is open or not, just simulated against the
  stored time delta).
- Offline cap upgrades reach 72 hours so weekend-only players still
  feel rewarded.
- Daily login bonus (post v1): +25 % production for 4 hours after
  daily login.

## 7. Implementation order

This document is the contract. Implementation in main repo:

| Phase | Scope | Status |
|---|---|---|
| **0** Plan | This file | ✅ |
| **1** Data | 12 crops in `zones.ts`, layout templates | ✅ |
| **2** Upgrades | Per-zone yield/growth/sell, applied in core game functions | ✅ |
| **3** Layout | Preset selector by zone seed, spot count varies | ✅ |
| **4** UI | Upgrade panel with 4 buttons (cart/yield/growth/sell) per zone, tab strip with horizontal scroll for 12 zones | ✅ |
| **5** Visuals | Tinted crop sprites per tier, simulator updated | ✅ |
| **6** Global | Drag radius, offline cap, coin multiplier (next session) | 🟡 |
| **7** Prestige | Heirloom Seeds, specializations | ⏳ |

## 8. Gem economy and live-ops layer

A second currency, **Gems**, opens a parallel economy that handles
quality-of-life, premium boosts, and game-changers. The base game
must remain fully playable and completable without spending a
single gem.

### 8.1 Gem sources

- **Lucky harvest (primary, free):** every harvested spot has a tiny
  chance to drop a gem. Base rate 0.05 % per crop, scales with crop
  tier (~0.5 % at tier 12). The Scarecrow greenhouse upgrade and
  Lucky Charm gem upgrade both increase this.
- **Daily login (post v1):** small fixed amount per day.
- **Achievements (post v1):** one-time rewards for milestones.
- **Premium purchase (post launch):** real money. Always strictly
  optional and never the cheapest way to progress.

### 8.2 Gem shop categories

| Category | Examples |
|---|---|
| **Coin packs** | 1K coins / 5K coins / instant 10× current sell |
| **Boosters** | 5-min Super Fertilizer, 10-min Sunshine, 1-h Festival |
| **QOL upgrades** | Auto-sell at threshold, larger drag preview, offline cap +24 h |
| **Game-changers** | Magnet Drag, Combo Multiplier, Lucky Cart, Game Speed 2× |
| **Cosmetics** | Golden cart skin, festive crop tints |

### 8.3 Cool gem-buyable game-changers (proposed)

| Item | Effect | Gem cost |
|---|---|---|
| **Magnet Drag** | While dragging, ripe crops are pulled toward the touch point — effective reach grows without changing visual radius. | 50 |
| **Combo Multiplier** | Chaining harvests within 2 s adds +5 % per combo step, max +200 %. Resets on idle. | 75 |
| **Lucky Cart** | Cart has a 3 % chance to find a gem instead of (or in addition to) a crop. | 100 |
| **Game Speed 1.5×** | All timers run 50 % faster, permanently. Stacks once at 2×. | 200 |
| **Auto-Seller** | Inventory auto-sells when basket exceeds threshold. Threshold is configurable. | 60 |
| **Phantom Harvester** | Carts continue ticking on every zone, not just the active one. Half rate on inactive zones. | 150 |
| **Time Garden** | Adds a small bonus zone where time runs 10× faster, with a single random ripe crop tier. | 300 |
| **Weather Insurance** | Bad weather no longer applies to your fields (only the good kinds). | 120 |
| **Lucky Charm** | +100 % gem drop rate. Stackable up to 3×. | 80 each |
| **Heirloom Seeds** | 1 % chance harvested crop is one tier higher. | 250 |
| **Offline Cap +24h** | Stack from base 8 h to 72 h, in 24-hour increments (max 3 stacks). | 100 each |

Each item is a one-time permanent purchase except the offline cap
and Lucky Charm stacks.

## 9. Temporary boosts and weather

### 9.1 Player-triggered boosts

Earned occasionally for free, buyable for gems, fully optional.

| Boost | Effect | Duration |
|---|---|---|
| **Super Fertilizer** | +100 % yield | 5 min |
| **Sunshine** | +100 % growth speed | 5 min |
| **Market Day** | +100 % sell price | 5 min |
| **Lucky Day** | +500 % gem drop rate | 1 h |
| **Bountiful Harvest** | Next harvest only: +200 % yield | one shot |

Active boosts are visible in the HUD with a countdown bar.

### 9.2 Ambient weather (passive)

Weather changes randomly every 8–15 min. Always one weather at a
time; effects layer with player-triggered boosts.

| Weather | Effect | Frequency |
|---|---|---|
| **Sunny** (default) | baseline | ~50 % |
| **Rain** | +25 % growth speed | ~25 % |
| **Drought** | −25 % growth speed | ~10 % |
| **Festival** | +30 % sell price | ~10 % |
| **Storm** | growth halts; next harvest +100 % yield | ~5 % |

The Weather Insurance gem upgrade prevents Drought and Storm
penalties from applying to you.

## 10. Greenhouse — permanent percentage boosts

Coin-buyable global upgrades, a separate tab from per-zone
upgrades. Effects stack additively across all zones.

| Upgrade | Effect per level | Max | Base cost | Mult |
|---|---|---|---|---|
| **Greenhouse Glass** | +5 % grow speed (all zones) | 20 | 500 | 1.65 |
| **Sprinkler Network** | +1 baseline yield (all zones) | 10 | 800 | 1.8 |
| **Compost Bin** | +5 % sell price (all zones) | 20 | 1 200 | 1.7 |
| **Scarecrow** | +50 % gem drop rate (multiplicative) | 5 | 5 000 (gem) | × 2 |
| **Auto-Replanter** | Spots replant 1 s faster after harvest | 10 | 600 | 1.7 |

These are tuned to be reachable mid-game. Maxing all greenhouse
upgrades represents a significant late-game investment but doesn't
gate progress.

## 11. IOM-inspired deep systems

The reference game (Idle Obelisk Miner) has been running for years and
has a well-tuned set of interlocking long-term systems. We want the
same long-term depth, theme-translated into farming. These systems
unlock progressively as the player advances through the tier ladder
in §2 — the early game stays simple, then more layers reveal as
players reach the appropriate tier or boss-equivalent.

### A. Cards (collectables) — unlocks tier 3+

Every crop has a **Card**. Cards have three states:

1. **Locked** — invisible until you harvest enough of the crop to
   unlock the entry. Threshold is `100 × tier_index`, so Wheat
   unlocks at 100 harvested, Carrots at 200, Corn at 300, …, Lotus
   at 1 200.
2. **Unlocked** — gives a permanent **+10 % yield** for that crop.
3. **Gilded** — costs gems to gild (50 × tier_index, so 50 → 600
   across the ladder). Adds **+25 % yield** on top of the unlocked
   bonus, and **+5 % gem drop rate** for that crop.

Cards live in their own menu tab `🃏 Cards`. Each card row shows the
zone icon, current state, and the action (collect more / gild for X
gems). This creates a parallel collection meta-loop that doesn't
interfere with main progression but rewards going deep on each tier.

### B. Almanac (challenges / achievements) — unlocks tier 2+

A scrollable list of one-time tasks. Three rough categories, mixed:

| Category | Examples |
|---|---|
| Volume | "Harvest 1 000 wheat", "Sell 100 K coins of crops" |
| Mastery | "Buy Cart L10 in any zone", "Reach Yield L20", "Gild 3 Cards" |
| Exploration | "Unlock Tier 5", "Trigger 10 different weathers", "Survive a Storm" |

Each task pays out **Almanac Tokens** (a third permanent currency).
Tokens spent in an Almanac shop on:

- Permanent +1 % to all coin earnings (cap 50)
- Permanent +1 % to all gem drop rate (cap 25)
- Unlock a 2nd boost slot (boosts can stack 2 at a time)
- Cosmetic banner / cart skin

Maxed Almanac is hundreds of hours of play.

### C. Prestige — "Sell the Farm" — unlocks tier 5+

Soft reset triggered manually once tier 5 is unlocked. Resets:

- All zone progress (cart, yield, growth, price, inventory, spots)
- Coin balance
- Active boosts and weather

Keeps:

- Almanac progress and tokens
- Cards (and their gild state)
- Greenhouse upgrades
- Gem balance and gem-shop items
- Drag radius

Awards **Heirloom Seeds** = `floor(highest_tier_reached_squared / 4)`.
Heirloom Seeds spent in a Heirloom shop on:

- +1 % all yield per seed (no cap, asymptotic value)
- +1 % all sell price per seed
- −0.5 % all grow time per seed (floor at 5 % of base)
- Unlock a starter cart (begin each prestige with Cart L1)
- Unlock a starter yield bonus

Asymptote at ~50 × multiplier across many prestiges. Each prestige
takes longer than the last but rewards more, so the loop is
self-pacing.

### D. Contracts / Daily Orders — unlocks tier 4+

Three contracts every 24 real-time hours. Each contract requests a
specific bundle of crops (e.g. "200 wheat + 50 corn") in exchange
for a coin payout, gems, or Almanac tokens. Contracts expire if
unfulfilled. Players can reroll all 3 once per day for free, or
spend gems for additional rerolls.

This adds a daily-touch loop — log in, glance at contracts, decide
what to harvest today. No FOMO since rewards are modest and not
required for progression.

### E. Trinkets (random items) — unlocks tier 6+

Equippable buff items dropped from **Curio Chests**. Chests open
randomly when harvesting (very rare base rate, scaling with tier),
or buyable for gems. Items have rarity tiers:

| Rarity | Drop chance | Power |
|---|---|---|
| Common | 70 % | +X % to one stat |
| Rare | 25 % | +X % to two stats |
| Epic | 4 % | Unique conditional buff |
| Legendary | 1 % | Major effect (e.g. +30 s storm protection) |
| Divine | 1 / 25 000 | Game-changer (e.g. carts harvest 3 spots at once) |

Six equip slots. Surplus trinkets melt into **Trinket Dust**, a
currency used to reroll chest opens.

### F. Statues / Monuments — unlocks tier 7+

Crafted from huge resource bundles. Each statue gives a passive
global buff. Three tiers per statue:

1. **Built** — basic effect, e.g. "+5 % grow speed Wheat".
2. **Gilded** — 3× effect; requires ALL statues built.
3. **Platinized** — 5× effect; requires ALL statues gilded.

Statues only matter for the absolute end-game (months in). Their
existence motivates the entire late-game economy.

### G. Skill Tree — unlocks via Prestige

Spend **Skill Points** (earned 1 per Almanac task completed, plus
gem-shop purchase) on a tree of mutually-exclusive perks:

- **Greener Thumb** — +1 % yield per skill point invested
- **Faster Carts** — +1 % cart speed per point
- **Bigger Pockets** — +1 % offline cap per point
- **Lucky Days** — +1 % gem drop per point

Each branch has 50 nodes; total tree has 200+ nodes. Players
specialize over many prestiges.

### H. Pets — unlocks tier 9+

Companion sprites that wander the field alongside carts. Each pet
has:

- A unique passive buff (e.g. "+10 % yield Wheat")
- A level (1–100) that scales the buff
- An XP requirement to level (gain XP from harvesting)

Pets cost 200 gems each from the shop. Total Pet Level is required
to unlock later pets, creating a long collection chain.

### I. Burst Tools (Active Abilities) — unlocks tier 4+

Cooldown-based abilities filled by play:

- **Sprinkler Burst** — instantly waters all plots; everything
  ripens.
- **Fertilizer Bomb** — next 30 s, all yields ×3.
- **Bee Swarm** — guarantees the next 10 plots drop a gem.
- **Pollen Storm** — converts current ripe crops directly to gems.

Each has a charge meter that fills via play. Once a tool's charge
regen is high enough, **Auto-Cast** is unlocked and the tool fires
automatically.

### J. Construct / Greenhouse Research — unlocks tier 9+

A research lab where Pollen (gained from Wild Patches in §A) is
spent on permanent unlocks of NEW MECHANICS:

- Reveal **Moon Phases** (passive 8-phase rotation, each phase a
  global buff/penalty)
- Reveal **Wild Patches** (rare lucky harvest spots that drop Pollen)
- Reveal **Heirloom Crops** (1 % chance harvested crop is one tier
  higher)

Construct nodes are intentionally slow. A player at this stage funnels
multiple prestige cycles of Pollen into one research node.

## 11.B Implementation order for the IOM-inspired systems

Each system below is independent and can ship in its own commit.
The order is roughly cheapest → most expensive in code.

| Phase | System | Status |
|---|---|---|
| **A** | Cards | ✅ |
| **B** | Almanac & tokens | ⏳ |
| **C** | Prestige & Heirloom Seeds | ⏳ |
| **I** | Burst Tools | ⏳ |
| **D** | Daily Contracts | ⏳ |
| **E** | Trinkets | ⏳ |
| **G** | Skill Tree | ⏳ |
| **F** | Statues & Monuments | ⏳ |
| **J** | Construct / Moon Phases / Wild Patches | ⏳ |
| **H** | Pets | ⏳ |

Targeting 4–6 weeks of dev time across all phases. Each phase adds
one menu tab or sub-tab; players never see all this at once because
unlocks are gated by tier progression.

## 12. Menu structure

The top bar has a single ☰ button that opens a modal menu with
tabs. The action bar at the bottom shrinks to just the **Sell**
button (the most-used action).

Tabs:
1. **🌾 Upgrades** — per-zone cart, yield, growth, price, plus the
   global drag radius
2. **🌿 Greenhouse** — permanent global percentage boosts
3. **⚡ Boosts** — owned consumable boosts; tap to activate
4. **💎 Shop** — buy gems → upgrades, QOL, cosmetics
5. **📊 Stats** *(post v1)* — total earned, biggest harvest, etc.



- **No pay-to-win.** Sun Drops (premium currency, post v1) only buy
  cosmetics, time skips, and chest rerolls — never raw progression.
- **No mandatory daily login.** Daily bonuses are nice but you can
  ignore them and still progress.
- **No FOMO timers.** Events run on a long cadence; you never lose
  earned content by missing a day.

## 9. Tuning principles

- Every upgrade should produce a **visible** change within one
  session. If you can't tell yield went up, the gain per level is
  too small.
- Every tier should be **reachable** within one week of *casual*
  play (15 min/day). Players who push harder reach faster, but
  nobody is gated for months by any single tier.
- Upgrades should **never plateau silently**. If a stat is capped,
  show it. Don't quietly lose value on a purchase.
