# Idle Farming Game — Functional Design Brief

A functional-only description of every screen and overlay in the game.
Use this as a brief for design tools to propose fresh visual concepts.
This document deliberately avoids any current colors, layouts, fonts,
or component styles — it lists *what* the player needs to see and do,
not *how* it should look.

The game is a free-to-play idle farming game played on portrait-mode
phones. Sessions are short and bursty; the player taps in once or
twice an hour, plus occasional active sessions. Long-term progression
spans weeks or months. Visual direction can be any style: pixel art,
clean modern flat, hand-drawn illustration, claymation, watercolor,
isometric — the design is wide open.

## 1. Main game screen

This is the screen the player sees most of the time.

### What it shows

- **The active field**, which is a continuous play area filled with
  scattered crops at various stages of growth. Crops visibly grow,
  ripen, and reset over time. The same field can hold up to ~20
  individual crop spots.
- **The player's resources at a glance**:
  - Total coins (the main currency, used for almost all upgrades)
  - Total gems (a rare premium currency)
  - Current production rate per second
  - Current weather effect (sunny / rain / drought / festival /
    storm) with a short summary of what that weather does
- **A row of zone selectors**, one for each crop tier the player
  has unlocked, plus the next locked one. The active zone is
  highlighted. A locked zone's selector shows the unlock cost
  in coins; tapping it pays the cost and switches to it. There
  are 12 zones total, unlocked progressively (Wheat → Carrots → …
  → Golden Lotus). The selector strip needs to handle anywhere
  from 1 (start of game) to 12 (end-game) entries gracefully.
- **One or more autonomous "cart" sprites** that drive around the
  field at slow speed, pausing on ripe crops to harvest them. The
  number of carts and their visible size scales as the player
  upgrades them. Carts can be pixel art, illustrated vehicles,
  animals, robots — whatever fits the chosen art direction.
- **A status line below the field** that shows the active zone
  name, the basket count (unsold harvested crops), and a brief
  hint ("X READY · drag to harvest" or similar). The basket
  count grows continuously as the player harvests and resets to
  zero each time they sell.

### What the player can do

- **Drag a finger across the field** to instantly harvest every ripe
  crop within a circular "reach" radius around the touch point. The
  reach is upgradable. While dragging, a soft visual indicator shows
  the radius. This is the primary interactive action.
- **Tap the Sell button** to convert all crops in the basket into
  coins at the current price. This is the most-used action button,
  and it should be visually prominent.
- **Tap the Menu button** to open the menu modal. This is the second
  most-used action.
- **Tap a zone selector** to switch to a different unlocked zone, or
  to spend coins to unlock the next one.

### Information hierarchy

Most-prominent → least-prominent:
1. The field itself (most of the screen real estate)
2. Sell button (player's main "reward" action)
3. Coin / gem totals (always visible)
4. Active zone name and basket count
5. Production rate, weather, menu button

## 2. Menu modal

A full-screen overlay opened by tapping the Menu button on the main
screen. It darkens or hides the underlying field. There are five
tabs; tapping a tab swaps the body content. Each tab has a single,
clear name and a one-line subtitle that explains its purpose.

### Common menu chrome

- **A title bar** showing the current tab's name and one short
  sentence describing what the tab is for.
- **A close affordance** that returns the player to the main screen.
- **A row of tab buttons** that act like top-level navigation between
  the five sections.
- **A scrollable content area** that holds the items relevant to the
  active tab. Content must never visually overflow into the title
  bar or the device's edges.

### Tab 1 — Farm Upgrades

Per-zone improvements purchased with coins.

#### What it shows

A list of five upgrade lines, each with:
- A short name (Cart / Yield / Growth / Sell Price / Reach)
- The current level (e.g. "Lv 4 / 50") and remaining cap
- The cost to buy the next level, in coins
- An indication of whether the purchase is currently affordable
- A way to read more detail (the long-form description of what
  the upgrade does mechanically)

The first four upgrades only affect the active zone. The fifth
("Reach") is global. When a zone is freshly unlocked all of its
levels reset to zero except Reach.

#### What the player can do

- Tap an upgrade to see its detailed description.
- Tap the buy affordance to spend coins for the next level. If
  unaffordable, the action is unavailable but the description is
  still readable.

### Tab 2 — Crop Cards

A collection of trading-card-style entries, one per crop tier
(twelve total).

#### What it shows

A grid of card-shaped tiles, three or four per row. Each card
represents one crop. A card has three possible states:

- **Locked** — the player has not yet found this card. The art
  and name are obscured (the player should not be able to read
  what this card is — only that there is *something* to find).
- **Found** — the player has discovered this card by harvesting
  the corresponding crop. The card's full art and name are visible.
  When found, a card grants a permanent +10% yield bonus to that
  zone.
- **Shiny** — the player has spent gems to upgrade a found card
  to its premium variant. A shiny card grants a doubled bonus
  (+20% yield) and looks visually distinct from its non-shiny
  state.

Each card needs:
- A piece of artwork representing the crop (could be illustrative,
  symbolic, photographic, etc. — open for design)
- The crop name, when visible
- An indication of state (locked / found / shiny)
- For found-but-not-shiny cards: an action affordance with the
  gem cost to make it shiny
- For shiny cards: a "shiny" indicator

Cards are randomly dropped while harvesting the corresponding
crop, with a tiny chance per harvest. Players will go hours of
play time between drops, so finding a new card should feel like
a meaningful discovery moment — there should be some way to
celebrate it (a toast, a flip animation, a unique sound, etc.).

#### What the player can do

- Tap a card to see its description and state.
- Tap a "make shiny" affordance on a found card to spend gems
  and upgrade it.

### Tab 3 — Greenhouse

Permanent, global percentage boosts purchased with coins (and one
with gems).

#### What it shows

A list of five upgrade lines, each with:
- An icon/illustration that hints at what the upgrade does
- A name (e.g. "Greenhouse Glass", "Sprinkler Network")
- The current level and cap
- A short summary of the bonus per level ("+5% grow speed all
  zones")
- The cost in either coins or gems (the currency should be
  visually distinguishable in the cost label)

These bonuses stack with per-zone upgrades and apply across every
zone simultaneously.

#### What the player can do

- Tap to read details.
- Tap to buy if affordable.

### Tab 4 — Boosts

Time-limited buffs the player owns or can buy with gems.

#### What it shows

A list of four boost types, each with:
- An icon/illustration
- The boost's name (Super Fertilizer / Sunshine / Market Day /
  Lucky Day)
- A short description of the effect and duration
- The number the player currently owns
- The gem cost to buy another one
- An "Activate" affordance when the player owns at least one

Active boosts also need to be visible somewhere on the main game
screen — at minimum an icon and a countdown timer — so the player
remembers the buff is running.

#### What the player can do

- Tap "Activate" to start a boost (consumes one from inventory and
  begins its timer).
- Tap to buy another boost using gems.
- Tap to read full description.

### Tab 5 — Gem Shop

Premium purchases. This is the only tab where most actions cost
gems instead of coins.

#### What it shows

A list of items the player can buy with gems. Items fall into
three rough groups (the design can choose to show them as one
list, multiple sections, sub-tabs, cards, etc.):

1. **Coin packs** — instant chunks of coins for gems. Multiple
   sizes from "small bag" to "large vault".
2. **One-time game-changing perks** — each is a single permanent
   purchase that meaningfully alters how the game plays.
   Examples: Magnet Drag (bigger reach), Combo Multiplier (chain
   harvests pay more), Lucky Cart (cart finds gems sometimes),
   Auto-Seller (basket auto-empties at a threshold), Phantom
   Harvester (inactive zones run at full rate), Weather Insurance
   (no penalty from bad weather), Heirloom Seeds (chance for a
   higher-tier crop).
3. **Stackable upgrades** — perks the player can buy multiple
   times up to a cap. Examples: Lucky Charm (stacks 3×, multiplies
   gem drop rate), Offline Cap +24h (stacks 3×), Game Speed (two
   tiers: 1.5×, then 2×).

Each item needs:
- An icon/illustration
- A name
- A short effect description
- A gem cost
- A clear indicator when the player already owns it (or owns it
  at max stack), so they know not to buy more.

#### What the player can do

- Tap to read details.
- Tap to buy with gems if affordable and not already owned.

## 3. Tooltip / detail overlay

Tapping any icon or row in the menu reveals a small overlay that
explains the thing the player tapped. The overlay disappears after
a short delay (around 1.5–2 seconds) or when the player taps the
same target again. It should:

- Float near the tapped element, not cover the entire screen.
- Stay within screen bounds (flip or shift if it would clip an
  edge).
- Show a title (the thing's name) and a body (one or two sentences
  describing what it does).

## 4. Action feedback overlays

Small ephemeral visuals that appear when the player does
something:

- **Coin floats** — when selling, a "+N" label rises from the sell
  button and fades out. Coins/gems counter pulses briefly.
- **Card discovered** — when a card drops, the player should get
  some clear celebration moment (animation, sound, banner).
- **Boost active** — while a boost is running, its icon and
  remaining time should be visible somewhere persistently
  (ideally on the main screen so the player knows it's burning
  down).

## 5. Active state indicators on the main screen

When transient effects are active, they should be visible without
the player opening any menus:

- **Weather indicator** (current weather + one-line effect)
- **Active boosts** with countdown rings/bars
- **Coins-per-second** rate
- **Drag radius** (only briefly, while actively dragging)

## 6. Long-form information

Some information lives in tooltips or detail panels and is not
needed in the always-visible UI. Designs should figure out a
satisfying way to surface it on demand:

- Per-upgrade descriptions ("Cart: each cart auto-harvests the
  field; +15% speed and +7% radius per level; new cart joins at
  level 12, 24, 40")
- Per-zone stats (current grow time, sell price, total harvested,
  cards found state)
- Boost effects (exact percentages and durations)
- Gem-shop items' full effects

## 7. Things the design should be aware of

- **The field is the heart of the game.** It is what the player
  looks at most. Every other element is in service of the loop
  "watch crops grow → harvest → sell → upgrade".
- **Active and idle play both matter.** Some players will tap
  actively for hours; others will check in once a day. The UI
  should feel rewarding for both — the dramatic feedback of a
  big drag harvest should sit alongside calm passive accumulation.
- **The player can be on the screen for hours per session.**
  Avoid visual noise that fatigues the eyes. The default state
  should be calm and pleasant; bright effects should be reserved
  for harvesting / buying / discovering.
- **Mobile-first.** Every screen runs in portrait on a phone.
  Nothing should require a stylus or precise tap. Touch targets
  should be generous (≥ 48 px).
- **Internationalisation.** Names and descriptions will eventually
  be translated. The design should accommodate longer or shorter
  strings without breaking layout.
- **Number scaling.** Resources can range from "0 coins" at start
  to billions late game. Cost labels and counters need to handle
  4-character formats like "1.2K", "8.7M", "12.3B" cleanly.
- **Grace under poverty.** Most of the game, the player can't
  afford most things. Disabled / unavailable states need to be
  designed *first*, not as an afterthought, because they are the
  default appearance most of the time.

## 8. Out of scope (future tabs)

The current menu has five tabs. Several more are planned but not
yet built. The design should leave room for these without a
disruptive restructure later:

- **Almanac / Achievements** — list of one-time tasks with
  reward currency
- **Prestige / Sell the Farm** — soft reset for permanent
  multipliers
- **Daily Contracts** — three time-limited orders refreshed each
  day
- **Trinkets** — equippable random-drop items with rarity tiers
- **Statues / Monuments** — late-game permanent buffs
- **Skill Tree** — long-term branching progression
- **Pets** — companion sprites with their own levels

The design system established now will be reused for these tabs,
so it should be flexible: lists, grids, cards, progress bars,
radial diagrams, etc. should all feel native to the same
language.
