# Mobile Game Strategy

A strategy for building a free-to-play mobile game that is engaging, sustainable,
and monetizes through optional purchases without compromising player trust.

## Core Principle

Design the game to be **fully enjoyable for free**. Sell convenience, expression,
and depth — never power. Players who feel respected become long-term players,
word-of-mouth marketers, and eventually paying customers.

## The Four Pillars

### 1. The Hook Loop (first 60 seconds)

Mobile churn is brutal: most installs never return for a second session. The
core loop must satisfy *before* any meta-systems exist.

- One-tap to play (no mandatory tutorial wall, no account creation up front).
- A clear goal visible on screen at all times.
- Visible progress every few seconds.
- A small, juicy reward at the end of every attempt — even failures.

If the 60-second loop isn't fun without progression, currencies, or unlocks,
no amount of monetization design will save the game.

### 2. Retention Systems (days 1–30)

Once the loop works, layer meta-systems that give players a reason to come back
tomorrow:

- **Daily quests** — small, achievable in one session.
- **Login streaks** — escalating rewards, but forgiving (one "freeze" per week).
- **Battle-pass-style progression** — a slow track that spans 4–8 weeks and
  resets, giving long-term players a fresh goal.
- **Smart push notifications** — tied to *player-initiated events* ("your
  crops are ready", "your energy is full"), not generic spam.

**Target metrics before scaling:**
- Day 1 retention ≥ 40%
- Day 7 retention ≥ 20%
- Day 30 retention ≥ 8%

### 3. Monetization — Pick ONE Primary Model

Trying to do all of these at once produces an incoherent economy. Pick one
and design the game around it.

| Model | Examples | Pros | Cons |
|---|---|---|---|
| **Cosmetics + battle pass** | Fortnite, Brawl Stars | Healthiest long-term, no pay-to-win backlash | Requires strong art identity, slow ramp |
| **Energy / time-skips** | Candy Crush, Clash of Clans | Reliable revenue, predictable | Easy to tune into something predatory |
| **Rewarded ads + small IAPs** | Most hyper/hybrid-casual | Best for solo devs; ads scale with DAU | Lower ceiling per user |
| **Gacha / loot boxes** | Genshin Impact | Highest ARPU | Regulatory risk, ethical concerns, hard to balance |

**Recommended for a first game by a small team:**
**Rewarded ads + cosmetic IAPs + a one-time "remove ads" purchase ($4.99).**

This combo:
- Earns from the 98% of players who don't pay (via ads).
- Earns from cosmetic-buying players without affecting balance.
- Gives ad-averse players an honest opt-out for the price of a coffee.
- Avoids the dark patterns that draw negative press and platform scrutiny.

### 4. Build & Ship Strategy

**Engine choice:**
- **Unity** — easiest ad SDK integration (LevelPlay, AppLovin MAX, Google
  AdMob), largest asset/plugin ecosystem, best for a commercial F2P game.
- **Godot 4** — open source, no royalties, lighter footprint, but ad and IAP
  integration is more DIY.

For a free-to-play mobile game with ads, Unity is the pragmatic default.

**Milestone plan (suggested, ~6 months to soft launch):**

1. **Weeks 1–2 — Prototype the core loop.** Greybox art only. If the loop
   isn't fun with placeholder squares, the art won't fix it.
2. **Weeks 3–6 — Vertical slice.** One polished level/mode, final art style
   established, basic UI flow.
3. **Weeks 7–10 — Meta-systems.** Progression, daily quests, currency,
   one cosmetic shop entry.
4. **Weeks 11–14 — Monetization & analytics.** Wire up ad SDK, IAP, and an
   analytics tool (GameAnalytics is free; Firebase + BigQuery for more depth).
5. **Weeks 15–18 — Internal testing.** TestFlight (iOS) and Play Internal
   Testing (Android). Hunt crashes and tune the first-time-user experience.
6. **Weeks 19–24 — Soft launch.** Release in one or two small English-speaking
   markets (Philippines, Canada, New Zealand) to measure retention and ARPDAU
   without burning your global launch window.

**Only scale user acquisition spend after** D1 ≥ 40% and D7 ≥ 20% are hit
in soft launch. Paid UA on a leaky funnel just sets money on fire.

## The Main Tradeoff

Cosmetic-only monetization protects player trust and the game's longevity but
earns meaningfully less per user than energy or gacha mechanics. Most
successful indie F2P games accept lower ARPU in exchange for organic
word-of-mouth growth, because paid user acquisition is brutally expensive
at small scale and only works if your retention numbers are already strong.

## Anti-Patterns to Avoid

- **Pay-to-win** — kills competitive integrity and word-of-mouth.
- **Energy systems that block play after 5 minutes** — feels hostile.
- **FOMO-driven limited offers every session** — works short-term, destroys
  trust long-term.
- **Forced interstitial ads mid-action** — top cause of one-star reviews.
- **Hidden odds on randomized purchases** — increasingly illegal and always
  unethical.

## Tools & Stack Summary

- **Engine:** Unity (or Godot 4 if open-source matters more than convenience)
- **Ads:** LevelPlay or AppLovin MAX (mediation, higher eCPM than single network)
- **IAP:** Unity IAP or RevenueCat
- **Analytics:** GameAnalytics (free) or Firebase + BigQuery
- **Backend (if needed):** PlayFab, Nakama, or a thin custom service
- **Crash reporting:** Sentry or Firebase Crashlytics
- **Live ops / remote config:** Firebase Remote Config or PlayFab

## Next Steps

1. Decide the genre and the 60-second core loop on paper.
2. Pick the monetization model and design the economy around it from day one.
3. Build the prototype in 2 weeks; if the loop isn't fun, iterate or pivot
   before investing in art or meta-systems.
