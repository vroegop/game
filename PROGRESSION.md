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

## 8. What this plan deliberately *avoids*

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
