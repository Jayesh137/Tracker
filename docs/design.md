# Hyperliquid Tracker - UI/UX Design System

## Design Philosophy

A clean, gamified trading tracker inspired by Discord's activity style and modern dark-mode social apps. Information-dense but not cluttered, with subtle animations and satisfying feedback for wins.

---

## Visual Style

### Color Palette

```
Background layers:
--bg-primary:    #0f172a    /* Deep navy - main background */
--bg-secondary:  #1e293b    /* Slate - cards, elevated surfaces */
--bg-tertiary:   #334155    /* Lighter slate - hover states, borders */

Text:
--text-primary:   #f1f5f9   /* Near white - headings, important */
--text-secondary: #94a3b8   /* Muted - labels, timestamps */
--text-tertiary:  #64748b   /* Dimmed - hints, placeholders */

Accents:
--accent-blue:    #3b82f6   /* Primary actions, links */
--accent-cyan:    #22d3ee   /* Highlights, focus rings */

Status colors:
--profit:         #4ade80   /* Green - gains, long positions */
--profit-bg:      #166534   /* Dark green background */
--loss:           #f87171   /* Red - losses, short positions */
--loss-bg:        #991b1b   /* Dark red background */
--neutral:        #fbbf24   /* Yellow - warnings, pending */

Gamification:
--streak-fire:    #f97316   /* Orange - win streaks */
--celebration:    #a855f7   /* Purple - achievements */
```

### Typography

```css
/* System font stack for performance */
font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;

/* Scale */
--text-xs:   0.75rem;   /* 12px - timestamps, badges */
--text-sm:   0.875rem;  /* 14px - body, trades */
--text-base: 1rem;      /* 16px - headings */
--text-lg:   1.25rem;   /* 20px - wallet name, PnL */
--text-xl:   1.5rem;    /* 24px - big numbers */

/* Weights */
--font-normal:   400;
--font-medium:   500;
--font-semibold: 600;
--font-bold:     700;
```

### Spacing

```css
--space-1: 0.25rem;  /* 4px */
--space-2: 0.5rem;   /* 8px */
--space-3: 0.75rem;  /* 12px */
--space-4: 1rem;     /* 16px */
--space-5: 1.25rem;  /* 20px */
--space-6: 1.5rem;   /* 24px */
```

### Borders & Radius

```css
--radius-sm: 0.375rem;  /* 6px - buttons, inputs */
--radius-md: 0.5rem;    /* 8px - cards */
--radius-lg: 0.75rem;   /* 12px - modals */
--radius-full: 9999px;  /* pills, avatars */

--border-default: 1px solid var(--bg-tertiary);
```

---

## Layout Structure

### Mobile-First (iPhone 8: 375×667)

```
┌─────────────────────────────────────┐
│ HEADER                         44px │
│ [Wallet Selector ▼]        [⚙️]    │
├─────────────────────────────────────┤
│ STATS BAR                      60px │
│ Win Rate │ Avg Gain │ Streak       │
│   72%    │  +$342   │  🔥 5        │
├─────────────────────────────────────┤
│ POSITIONS                    ~200px │
│ ┌─────────────────────────────────┐ │
│ │ ETH-PERP          LONG  +12.4% │ │
│ │ 2.5 @ $3,421      +$125.50     │ │
│ └─────────────────────────────────┘ │
│ ┌─────────────────────────────────┐ │
│ │ BTC-PERP         SHORT  -2.1%  │ │
│ │ 0.15 @ $97,200    -$48.20      │ │
│ └─────────────────────────────────┘ │
├─────────────────────────────────────┤
│ ACTIVITY FEED              scrolls │
│ ┌─────────────────────────────────┐ │
│ │ 🟢 Opened LONG ETH      2:04pm │ │
│ │ 🔴 Closed SHORT BTC    +$1,240 │ │
│ │ 🟢 Opened LONG SOL      1:30pm │ │
│ │ ⚪ Reduced LONG ARB       -50% │ │
│ └─────────────────────────────────┘ │
└─────────────────────────────────────┘
```

---

## Components

### 1. Header

```
┌─────────────────────────────────────┐
│ HL Tracker              [⚙️]       │
│ ┌───────────────────┐               │
│ │ 0x0ddf...a902  ▼ │               │
│ └───────────────────┘               │
└─────────────────────────────────────┘
```

- App title left-aligned, subtle
- Wallet selector: pill-shaped dropdown
- Settings gear icon with subtle hover

### 2. Stats Bar (Gamification)

```
┌───────────┬───────────┬───────────┐
│  WIN RATE │ AVG GAIN  │  STREAK   │
│    72%    │  +$342    │   🔥 5    │
│  ████░░   │   ▲ 12%   │  wins     │
└───────────┴───────────┴───────────┘
```

- Three equal columns
- Win rate with mini progress bar
- Avg gain with trend arrow
- Streak with fire emoji when active
- Subtle dividers between stats

### 3. Position Card

```
┌─────────────────────────────────────┐
│ ETH-PERP                            │
│ ┌──────┐                            │
│ │ LONG │  2.5 ETH @ $3,421         │
│ └──────┘  10x leverage              │
│                                     │
│                    +$125.50  +12.4% │
│                    ▔▔▔▔▔▔▔▔  green  │
└─────────────────────────────────────┘
```

- Coin name prominent
- Side badge: green bg for LONG, red bg for SHORT
- Size, entry price, leverage in secondary text
- PnL right-aligned, large, color-coded
- Subtle bottom accent line in profit/loss color

### 4. Activity Feed Item

```
┌─────────────────────────────────────┐
│ 🟢  Opened LONG ETH                 │
│     2.5 @ $3,421           2:04 PM  │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│ 🔴  Closed SHORT BTC       +$1,240  │
│     0.15 @ $97,200         1:58 PM  │
└─────────────────────────────────────┘
```

- Emoji indicator: 🟢 open long, 🔴 open short/close, ⚪ reduce
- Action text: "Opened LONG", "Closed SHORT", "Reduced"
- Size and price on second line
- Timestamp right-aligned, muted
- PnL shown for closes, color-coded

### 5. Celebration Overlay (for profitable closes)

```
┌─────────────────────────────────────┐
│                                     │
│           ✨ WINNER ✨              │
│                                     │
│            +$1,240                  │
│          BTC SHORT                  │
│                                     │
│     ─────────────────────          │
│     72% win rate • 🔥 6 streak     │
│                                     │
└─────────────────────────────────────┘
```

- Appears briefly (2s) on profitable close > $100
- Subtle glow effect, not distracting
- Shows updated streak if applicable
- Auto-dismisses, tap to dismiss early

### 6. Add Wallet Modal

```
┌─────────────────────────────────────┐
│ Add Wallet                     [✕]  │
├─────────────────────────────────────┤
│                                     │
│ ┌─────────────────────────────────┐ │
│ │ 0x...                           │ │
│ └─────────────────────────────────┘ │
│                                     │
│ Paste a Hyperliquid wallet address  │
│ to start tracking their trades.     │
│                                     │
│ ┌─────────────────────────────────┐ │
│ │          Add Wallet             │ │
│ └─────────────────────────────────┘ │
│                                     │
└─────────────────────────────────────┘
```

---

## Animations (Subtle)

### Transitions

```css
/* Default transition for all interactive elements */
transition: all 150ms ease-out;

/* Specific transitions */
--transition-fast: 100ms ease-out;   /* Hovers, focus */
--transition-base: 150ms ease-out;   /* Most interactions */
--transition-slow: 300ms ease-out;   /* Page transitions, modals */
```

### Activity Feed - New Item

```css
/* New trade slides in from top */
@keyframes slideIn {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.trade-item-new {
  animation: slideIn 200ms ease-out;
}
```

### PnL Number Update

```css
/* Subtle pulse on PnL change */
@keyframes pnlUpdate {
  0% { transform: scale(1); }
  50% { transform: scale(1.05); }
  100% { transform: scale(1); }
}

.pnl-updated {
  animation: pnlUpdate 200ms ease-out;
}
```

### Win Celebration

```css
/* Brief glow effect for wins */
@keyframes celebrateGlow {
  0% { box-shadow: 0 0 0 0 rgba(74, 222, 128, 0.4); }
  50% { box-shadow: 0 0 20px 10px rgba(74, 222, 128, 0.2); }
  100% { box-shadow: 0 0 0 0 rgba(74, 222, 128, 0); }
}

.position-card.win {
  animation: celebrateGlow 600ms ease-out;
}
```

### Loading States

```css
/* Skeleton shimmer */
@keyframes shimmer {
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
}

.skeleton {
  background: linear-gradient(
    90deg,
    var(--bg-secondary) 25%,
    var(--bg-tertiary) 50%,
    var(--bg-secondary) 75%
  );
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
}
```

---

## Gamification Details

### Win Rate Calculation

```
win_rate = (profitable_closes / total_closes) * 100
```

- Displayed as percentage with progress bar
- Green if >= 50%, yellow if 40-50%, red if < 40%

### Average Gain

```
avg_gain = total_pnl / total_closes
```

- Shows trend arrow (▲/▼) comparing to last 7 days
- Always show +/- prefix

### Win Streak

- Counter of consecutive profitable trades
- Fire emoji 🔥 appears at 3+ streak
- Resets to 0 on loss
- Max recorded streak shown in settings

### Celebration Triggers

| Condition | Animation |
|-----------|-----------|
| Close with profit > $100 | Card glow + mini celebration |
| Close with profit > $1000 | Full celebration overlay |
| New streak record | Streak badge pulse |
| Win rate crosses 70% | Stats bar highlight |

---

## Notification Design

### Push Notification Format

```
Title: 🟢 0x0ddf opened LONG
Body:  2.5 ETH @ $3,421

Title: 🔴 0x0ddf closed SHORT
Body:  +$1,240 PnL • BTC
```

- Emoji prefix for quick scanning
- Shortened address
- Key info: size, coin, price, PnL

---

## Empty States

### No Wallets

```
┌─────────────────────────────────────┐
│                                     │
│            📊                       │
│                                     │
│     No wallets tracked yet          │
│                                     │
│  Add a wallet to start copying      │
│  trades from top performers         │
│                                     │
│     ┌─────────────────────┐         │
│     │    Add Wallet       │         │
│     └─────────────────────┘         │
│                                     │
└─────────────────────────────────────┘
```

### No Positions

```
┌─────────────────────────────────────┐
│                                     │
│  No open positions                  │
│  Wallet is flat                     │
│                                     │
└─────────────────────────────────────┘
```

### No Trades

```
┌─────────────────────────────────────┐
│                                     │
│  No recent trades                   │
│  Activity will appear here          │
│                                     │
└─────────────────────────────────────┘
```

---

## Responsive Considerations

### iPhone 8 (375×667) - Primary Target

- Compact header (44px)
- Stats bar always visible
- Positions stack vertically
- Activity feed scrolls

### Larger Phones (414×896+)

- Same layout, more breathing room
- Potentially 2-column positions on landscape

### Tablet/Desktop (if accessed via web)

- Max-width container (480px)
- Centered layout
- Same mobile design, not a different layout

---

## Accessibility

- Color contrast ratio >= 4.5:1 for text
- Touch targets >= 44×44px
- Focus indicators on all interactive elements
- Screen reader labels for icons
- Reduced motion option (respects prefers-reduced-motion)
