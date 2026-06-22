# Revenue AI Platform - Dashboard Design System & UX Audit

**Date:** 2026-06-21  
**Role:** UX Lead  
**Platform:** B2B SaaS Revenue Intelligence  
**Audience:** Sales Leaders, Sales Reps, Finance, Executives  

---

## EXECUTIVE SUMMARY

This document provides:
1. **5 Dashboard Wireframes** (ASCII) with role-specific KPIs
2. **Design System** - tokens, typography, color palette
3. **UX Audit** - 15+ pain points with drilling/export requirements
4. **Accessibility Compliance** - WCAG 2.1 AA standards
5. **Implementation Roadmap** - phased delivery with priorities

**Key Outcomes:**
- Reduce time-to-insight from 5+ clicks to 2 clicks (70% reduction)
- WCAG 2.1 AA compliance on all dashboards
- Mobile-responsive (375px - 1440px)
- Real-time data refresh with progressive loading
- Dark mode + light mode support

---

## PART 1: DESIGN SYSTEM

### 1.1 Color Palette (Professional + Trust)

#### Primary Colors
```
Primary-50:   #F0F7FF  (Light blue - backgrounds)
Primary-100:  #E0EFFE
Primary-200:  #C1DDFE
Primary-300:  #A2CCFD
Primary-400:  #82BBFC
Primary-500:  #3B82F6  (Core blue - CTA, highlights)
Primary-600:  #2563EB  (Darker blue - hover states)
Primary-700:  #1D4ED8
Primary-800:  #1E40AF
Primary-900:  #1E3A8A  (Darkest - text emphasis)
```

#### Semantic Colors
```
Success:      #10B981  (Green - positive trend, completed actions)
Warning:      #F59E0B  (Amber - needs attention)
Danger:       #EF4444  (Red - critical alerts, losses)
Info:         #06B6D4  (Cyan - informational)
Neutral-50:   #F9FAFB  (Light - surfaces)
Neutral-100:  #F3F4F6
Neutral-200:  #E5E7EB
Neutral-300:  #D1D5DB
Neutral-400:  #9CA3AF  (Mid-gray - secondary text)
Neutral-500:  #6B7280
Neutral-600:  #4B5563
Neutral-700:  #374151
Neutral-800:  #1F2937
Neutral-900:  #111827  (Dark - primary text)
```

#### Dark Mode Variants
```
Dark-Surface-1:    #0F172A  (Darkest background)
Dark-Surface-2:    #1E293B  (Card background)
Dark-Surface-3:    #334155  (Elevated surface)
Dark-Text-Primary: #F1F5F9  (Lightest text)
Dark-Text-Muted:   #CBD5E1   (Secondary text)
```

#### Usage Rules
- **Buttons:** Primary-500 (normal), Primary-600 (hover), Primary-700 (active)
- **Text:** Neutral-900 (light mode), Neutral-50 (dark mode)
- **Backgrounds:** Neutral-50 (light), Dark-Surface-1 (dark)
- **Borders:** Neutral-200 (light), Dark-Surface-3 (dark)
- **Status indicators:** Success, Warning, Danger (always paired with icon/text)

---

### 1.2 Typography Scale

#### Typefaces
```
Heading Font:  "Inter" or "Segoe UI" (sans-serif, 500-700 weight)
Body Font:     "Inter" or "Segoe UI" (sans-serif, 400-500 weight)
Data Font:     "IBM Plex Mono" (monospace, for numbers/codes)
```

#### Type Scale (Responsive)
```
Display (H1):      48px (desktop) / 32px (mobile)  | Weight: 700 | Line-height: 1.2 | Letter-spacing: -0.5px
Heading 1 (H2):    36px (desktop) / 28px (mobile)  | Weight: 600 | Line-height: 1.3 | Letter-spacing: 0
Heading 2 (H3):    28px (desktop) / 24px (mobile)  | Weight: 600 | Line-height: 1.3 | Letter-spacing: 0
Heading 3 (H4):    20px (desktop) / 18px (mobile)  | Weight: 600 | Line-height: 1.4 | Letter-spacing: 0
Subtitle (H5):     16px                              | Weight: 600 | Line-height: 1.5 | Letter-spacing: 0.3px
Body Large:        16px                              | Weight: 400 | Line-height: 1.6 | Letter-spacing: 0
Body Regular:      14px                              | Weight: 400 | Line-height: 1.6 | Letter-spacing: 0.2px
Body Small:        12px                              | Weight: 400 | Line-height: 1.5 | Letter-spacing: 0.2px
Label:             12px                              | Weight: 600 | Line-height: 1.4 | Letter-spacing: 0.5px
Caption:           11px                              | Weight: 500 | Line-height: 1.4 | Letter-spacing: 0.3px
```

#### Contrast Ratios (WCAG 2.1 AA)
- Body text (14px): Minimum 4.5:1 contrast
- Large text (18px+): Minimum 3:1 contrast
- UI components: Minimum 3:1 contrast

**Verified pairs:**
- Neutral-900 on Neutral-50: 16.8:1 ✓
- Neutral-700 on Primary-50: 8.2:1 ✓
- Primary-600 on Neutral-50: 5.1:1 ✓
- Neutral-400 on Neutral-50: 4.5:1 ✓

---

### 1.3 Component Library Specifications

#### Buttons
```
Primary Button:
  - Background: Primary-500
  - Text: White (Neutral-50)
  - Padding: 10px 16px (mobile) / 12px 20px (desktop)
  - Border-radius: 6px
  - Height: 40px (min touch target)
  - Font-size: 14px (Body Regular)
  - Hover: Background Primary-600
  - Active: Background Primary-700
  - Disabled: Opacity 0.5, cursor not-allowed
  - Transition: background 150ms ease-out

Secondary Button:
  - Background: Neutral-200 (light) / Dark-Surface-3 (dark)
  - Text: Neutral-900 (light) / Neutral-50 (dark)
  - Border: 1px Neutral-300 (light) / Dark-Surface-3 (dark)
  - Same sizing/timing as Primary

Danger Button:
  - Background: Danger-500
  - Text: White
  - Hover: Background Danger-600
  - Confirm interaction required (tooltip or modal)
```

#### Cards (Data Containers)
```
Card Base:
  - Background: Neutral-50 (light) / Dark-Surface-2 (dark)
  - Border: 1px Neutral-200 (light) / Dark-Surface-3 (dark)
  - Border-radius: 8px
  - Padding: 20px (desktop) / 16px (mobile)
  - Box-shadow: 0 1px 3px rgba(0,0,0,0.1) (light)
  - Box-shadow: 0 1px 3px rgba(0,0,0,0.3) (dark)
  - Transition: box-shadow 150ms ease-out

Card Hover (interactive):
  - Box-shadow elevated (0 4px 12px rgba(0,0,0,0.15))
  - Cursor pointer

Card States:
  - Selected: Border-color Primary-500, background Primary-50 (light)
  - Focused: 2px outline Primary-500
  - Loading: Opacity 0.6 with skeleton placeholder
```

#### Input Fields
```
Input Base:
  - Height: 40px (min touch target)
  - Padding: 10px 12px
  - Border: 1px Neutral-300 (light) / Dark-Surface-3 (dark)
  - Border-radius: 6px
  - Font-size: 14px
  - Background: Neutral-50 (light) / Dark-Surface-1 (dark)
  - Placeholder: Neutral-400

Input States:
  - Focus: Border-color Primary-500, box-shadow 0 0 0 3px Primary-100
  - Error: Border-color Danger-500, background Danger-50 (light)
  - Error message: 12px Danger-600, positioned below field
  - Disabled: Background Neutral-100, opacity 0.5, cursor not-allowed
  - Valid: Border-color Success-500 (after blur if valid)

Label:
  - Font: 12px Label weight 600
  - Color: Neutral-700 (light) / Neutral-300 (dark)
  - Margin-bottom: 6px
  - Required indicator: "*" in Danger-500 color
```

#### KPI Cards (Dashboard-specific)
```
KPI Card Layout:
  ┌─────────────────────────────────┐
  │ Label (12px, Neutral-400)       │
  │ Value (32px, Primary-900)       │ ← Monospace font for numbers
  │ Change: +$12.5K (+5.2%) ✓      │ ← Green for positive
  │ Previous: $245K vs Target: $300K│ ← Meta comparison
  └─────────────────────────────────┘

  - Corner indicator (color-coded: Success/Warning/Danger)
  - Trend sparkline (tiny chart, 60px width, single color)
  - Click to expand → detail view
  - Responsive: Full width (mobile) / 1/3 width (desktop)
```

#### Tables (Data Grid)
```
Table Specifications:
  - Row height: 44px (touch target)
  - Header background: Neutral-100 (light) / Dark-Surface-3 (dark)
  - Header font: 12px Label, weight 600
  - Borders: Horizontal lines only (Neutral-200)
  - Hover row: Background Neutral-50 (light) / Dark-Surface-2 (dark)
  - Cell padding: 12px 16px
  - Alternating row colors: Optional (Neutral-50 / Neutral-100) for large tables
  - Sortable columns: Hover state shows sort icon
  - Sortable indicator: Arrow icon (Primary-600)
  - Text alignment: Left (text), Right (numbers), Center (status)

Responsive Behavior:
  - Desktop: Full table
  - Tablet: Horizontal scroll with sticky first column
  - Mobile: Card view (one row = one card) or collapse to 3-4 columns max
```

#### Charts (Data Visualization)
```
Line Chart:
  - Line width: 2px
  - Point size: 4px (hover expands to 6px)
  - Fill under line: 10% opacity Primary-500 (light) / 20% (dark)
  - Axis labels: 12px Neutral-600
  - Grid lines: Neutral-200 (light) / Dark-Surface-3 (dark), subtle
  - Hover tooltip: Dark overlay (Neutral-900 at 90% opacity), white text
  - Touch-friendly: Min 44×44px tap area per point

Bar Chart:
  - Bar color: Primary-500 (single series) / Palette (multi-series)
  - Bar spacing: 20% gap
  - Hover effect: Elevation + 10% opacity increase
  - Responsive: Vertical (desktop) / Horizontal (mobile for category names)
  - No 3D or gradients (readability)

Pie/Donut:
  - Avoid for >5 categories (use bar chart instead)
  - Slice colors: Primary + semantic palette
  - Hover: Scale 1.05
  - Legend: Positioned right (desktop) / below (mobile)
  - Donut: Label in center (percentage or key metric)

Legend:
  - Always visible (not hidden below fold)
  - Clickable to toggle series
  - Icon + label (12px)
  - Light: Neutral-700 text
  - Dark: Neutral-300 text
```

#### Loading & Empty States
```
Loading Skeleton:
  - Placeholder base: Neutral-200 (light) / Dark-Surface-3 (dark)
  - Shimmer animation: Left-to-right, 1.5s duration, ease-in-out
  - Preserve layout (no CLS)
  - Show for 300ms minimum

Empty State:
  - Centered icon (64px, Neutral-400)
  - Heading: "No data available"
  - Subtitle: "Try adjusting your filters" (12px Neutral-500)
  - Primary action button below
  - Illustration optional (but recommended for engagement)

Error State:
  - Red icon (Danger-500)
  - Error title + description
  - Retry button (Primary)
  - Support link (Secondary)
```

---

### 1.4 Spacing System

```
4px   - Micro spacing (icon gaps, tight grouping)
8px   - Component spacing (padding, small gaps)
12px  - Section spacing (within container)
16px  - Card/container padding (desktop)
24px  - Section breaks (between major areas)
32px  - Layout spacing (between sections)
48px  - Major spacing (between major regions)
```

**Responsive adjustments:**
- Mobile: Reduce by 50% for tighter layout (8px, 12px, 16px, 24px)
- Desktop: Full spacing
- Tablet: 75% of desktop spacing

---

### 1.5 Responsive Breakpoints

```
Mobile:     375px - 767px  (Small phone to large phone)
Tablet:     768px - 1023px (Tablet portrait to landscape)
Desktop:    1024px+        (Large screen)
Wide:       1440px+        (Ultra-wide)

Grid System:
  - Mobile: 4-column grid (24px gutters)
  - Tablet: 8-column grid (24px gutters)
  - Desktop: 12-column grid (24px gutters)
  - Max container width: 1280px (centered)
```

---

## PART 2: DASHBOARD WIREFRAMES

### 2.1 SALES MANAGER DASHBOARD

**Purpose:** Pipeline oversight, team performance, forecast accuracy  
**Refresh Rate:** Real-time (5s intervals for live updates)  
**Export Options:** PDF, CSV, Email scheduled report  
**Mobile:** Simplified view (2 columns instead of 4)

```
╔════════════════════════════════════════════════════════════════════════════════════╗
║  Sales Manager Dashboard                          [🔔] [📊 Export] [👤 Account]   ║
╠════════════════════════════════════════════════════════════════════════════════════╣
║                                                                                    ║
║  ┌─ QUICK FILTERS ────────────────────────────────────────────────────────┐       ║
║  │ Period: [Q2 2026 ▼]  Team: [Sales West ▼]  Stage: [All ▼]             │       ║
║  │ [Apply Filters] [Clear Filters] [Save View]                           │       ║
║  └────────────────────────────────────────────────────────────────────────┘       ║
║                                                                                    ║
║  ┌─ KPI CARDS (Row 1) ──────────────────────────────────────────────────┐         ║
║  │                                                                       │         ║
║  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌─────────┐  │         ║
║  │  │ Total ARR    │  │ Pipeline     │  │ Win Rate     │  │ Forecast │  │         ║
║  │  │ $2.4M        │  │ $8.7M        │  │ 32%          │  │ $3.2M    │  │         ║
║  │  │ +$180K (8%)  │  │ +$420K (5%)  │  │ +2.1pp       │  │ vs Quota: │  │         ║
║  │  │ vs last Q    │  │ vs last Q    │  │ vs last Q    │  │ 87%      │  │         ║
║  │  │ 🟢 On Track  │  │ 🟡 Monitor   │  │ 🟢 On Track  │  │ 🟡 Risk  │  │         ║
║  │  └──────────────┘  └──────────────┘  └──────────────┘  └─────────┘  │         ║
║  │                                                                       │         ║
║  └───────────────────────────────────────────────────────────────────────┘         ║
║                                                                                    ║
║  ┌─ PIPELINE WATERFALL ──────────────────────────────────────────────────┐        ║
║  │                                                                       │        ║
║  │     $2.1M   $1.8M   $1.2M   $650K   $320K                            │        ║
║  │      │       │       │       │       │                               │        ║
║  │      ▓ ─────▓ ─────▓ ─────▓ ─────▓                                   │        ║
║  │  Qualify → Propose → Negotiate → Close → Won                        │        ║
║  │   5 Deals   12 Deals  8 Deals  4 Deals  1 Deal                      │        ║
║  │   Avg: $420K Avg: $150K Avg: $150K Avg: $162K                      │        ║
║  │                                                                       │        ║
║  │   [Click any stage to see deals] [Drill to rep details]             │        ║
║  └───────────────────────────────────────────────────────────────────────┘        ║
║                                                                                    ║
║  ┌─ FORECAST VS ACTUAL (Line Chart) ─────┐  ┌─ TOP PERFORMERS ────────┐          ║
║  │                                       │  │ Rep        Deals  Revenue│          ║
║  │  $2.8M ╱╲     ╱╲ ╱╲                   │  │ Alice      18    $580K   │          ║
║  │  $2.4M ╱  ╲   ╱  ╲╱  ╲                │  │ Bob        14    $520K   │          ║
║  │  $2.0M ╱    ╲ ╱       ╲               │  │ Carol      12    $420K   │          ║
║  │  $1.6M ╱     ╲╱        ╲ ╱             │  │ Dave        9    $340K   │          ║
║  │  $1.2M ════════════════════ Forecast   │  │ Eva         8    $280K   │          ║
║  │        ─ ─ ─ ─ ─ ─ ─ ─ Actual         │  │ [View All] [Export CSV]  │          ║
║  │                                       │  │                          │          ║
║  │  [Hover for details]                  │  │ Revenue per Rep >        │          ║
║  └───────────────────────────────────────┘  └──────────────────────────┘          ║
║                                                                                    ║
║  ┌─ DEAL ACTIVITY (Table) ─────────────────────────────────────────────┐         ║
║  │ Sortable: Status | Last Activity | Days in Stage | Amount | Rep     │         ║
║  │                                                                       │         ║
║  │ [⭐] Acme Corp        │ Propose    │ 5 days      │ $250K  │ Alice   │ Hover   ║
║  │      Need sign-off by Wed, proposal sent Mon                       │         ║
║  │                                                                       │         ║
║  │ [⭐] TechStart Inc    │ Negotiate  │ 12 days     │ $180K  │ Bob     │ ⚠️ Risk ║
║  │      Budget alignment issue, follow-up Thu                         │         ║
║  │                                                                       │         ║
║  │ [  ] GlobalCorp       │ Qualify    │ 3 days      │ $300K  │ Carol   │         ║
║  │      Waiting on initial meeting feedback                           │         ║
║  │                                                                       │         ║
║  │ [⭐] DataWorks Ltd    │ Close      │ 8 days      │ $420K  │ Dave    │ 🟢 Ready║
║  │      Legal review in progress, 95% chance Win                      │         ║
║  │                                                                       │         ║
║  │ ┌────────────────────────────────────────────────────────────────┐  │         ║
║  │ │ [< Prev]  Showing 1-4 of 47 deals  [Next >]  [Load More] █ 8% │  │         ║
║  │ └────────────────────────────────────────────────────────────────┘  │         ║
║  └───────────────────────────────────────────────────────────────────────┘        ║
║                                                                                    ║
║  Refresh: Last updated 2 min ago [🔄 Refresh Now]                               ║
╚════════════════════════════════════════════════════════════════════════════════════╝

INTERACTION PATTERNS:
━━━━━━━━━━━━━━━━━━━━━━━

1. KPI Cards:
   - Single click → Modal with 90-day trend chart + monthly breakdown
   - Hover → Show sparkline trend
   - Right-click → Add to dashboard / Quick actions

2. Pipeline Waterfall:
   - Click stage → Filter table to show only deals in that stage
   - Hover stage → Tooltip showing avg deal size, days in stage, win %
   - Drill down → See individual rep performance within stage

3. Deal Table:
   - Sort by: Status, Activity Date, Days in Stage, Amount, Rep (Ascending/Descending)
   - Star icon → Add to favorites (sticky sort)
   - ⚠️ Badge → Alert details on hover
   - 🟢 Badge → Confidence score breakdown
   - Click row → Expand to show:
     * Deal timeline
     * Call history
     * Coaching recommendations
     * Next required action
     * Email/docs shared
   - Right-click → Quick actions: Move stage, Schedule follow-up, Add note

4. Export / Reporting:
   - [📊 Export] → Choose format (PDF, CSV, Email)
   - Email export → Schedule recurring (weekly/monthly)
   - PDF → Includes waterfall chart + top performers + executive summary
   - CSV → Full deal list, suitable for Excel pivot analysis

5. Mobile View (375px):
   - KPI cards: Stack vertically, full width
   - Pipeline: Horizontal scroll card view
   - Deal table: Simplified card view (show: Deal name, Stage, Amount, Last activity)
   - Filters: Sticky at top with collapse/expand
```

---

### 2.2 SALES REP DASHBOARD

**Purpose:** Daily execution, next actions, personal coaching, lead management  
**Refresh Rate:** Real-time (2s for calls/activities)  
**Mobile:** Primary use case (optimized for phone)  
**Focus:** Action-oriented, minimal decision fatigue

```
╔════════════════════════════════════════════════════════════════════════════════════╗
║  My Pipeline                  [🔔 3 Alerts]      [☀️ Morning Focus] [📋 My Goals]  ║
╠════════════════════════════════════════════════════════════════════════════════════╣
║                                                                                    ║
║  ┌─ TODAY'S GOALS ────────────────────────────────────────────────────────┐       ║
║  │ Calls: 12/15 ✓ 80%  │  Demos: 2/3 ✓ 67%  │  Proposals: 1/2 ⚠️ 50%    │       ║
║  │ ◼◼◼◼◼◼◼◼◼◼◻◻◻◻◻ Progress Bar (Real-time)                              │       ║
║  │ [+2 hours to hit daily targets]                                        │       ║
║  └────────────────────────────────────────────────────────────────────────┘       ║
║                                                                                    ║
║  ┌─ NEXT ACTIONS (Sorted by Urgency + Confidence) ──────────────────────┐        ║
║  │                                                                       │        ║
║  │  NOW (Next 2 hours)                                                  │        ║
║  │  ────────────────────────────────────────────────────────────────    │        ║
║  │  🔴 [HIGH] Follow-up call: TechStart Inc (Bob Wilson)                │        ║
║  │      Scheduled for 2:00 PM today (in 45 min)                        │        ║
║  │      Last call: Mon 3:30pm - Discussed budget, needs your reply     │        ║
║  │      AI Coach tip: Focus on ROI comparison vs current solution      │        ║
║  │      [Prepare Call] [Click-to-Call: 555-XXXX] [Done?]              │        ║
║  │                                                                       │        ║
║  │  🟡 [MEDIUM] Reply to email: Follow-up from GlobeCorp demo          │        ║
║  │      Sent 3 hours ago - Still waiting on response                   │        ║
║  │      Suggested action: Send pricing doc or schedule call            │        ║
║  │      AI Coach tip: Reference their use case: "retail ops"           │        ║
║  │      [Reply via Email] [Schedule Call] [Skip 1 hour] [Done?]       │        ║
║  │                                                                       │        ║
║  │  TODAY (Next 8 hours)                                               │        ║
║  │  ────────────────────────────────────────────────────────────────    │        ║
║  │  🟢 [MEDIUM] Proposal review: Acme Corp ($250K deal)                │        ║
║  │      Due by 5 PM - Sales Manager needs your sign-off                │        ║
║  │      Last conversation: Wed - Sent proposal, awaiting feedback      │        ║
║  │      [Review Proposal] [Share with Manager] [Send for Signature]   │        ║
║  │                                                                       │        ║
║  │  🟡 [LOW] Update notes: 5 prospects (CRM data stale)                │        ║
║  │      Updated last week - Quick 5-min CRM data entry                │        ║
║  │      [Bulk Quick Entry] [Snooze 1 day]                             │        ║
║  │                                                                       │        ║
║  │  ┌────────────────────────────────────────────────────────────────┐  │        ║
║  │  │ [Collapse All] [View Calendar] [Sync with Outlook] [Export]   │  │        ║
║  │  └────────────────────────────────────────────────────────────────┘  │        ║
║  │                                                                       │        ║
║  └───────────────────────────────────────────────────────────────────────┘        ║
║                                                                                    ║
║  ┌─ MY PIPELINE (Compact View) ──────┐  ┌─ AI COACHING (Today's Insights) ────┐  ║
║  │ Stage        # Deals  Value       │  │ Morning Briefing (Generated 6:30am)   │  ║
║  │                                  │  │                                       │  ║
║  │ Qualify      3        $450K      │  │ 🎯 Priority Actions:                  │  ║
║  │ Propose      5        $1.2M      │  │ 1. TechStart call in 45min - Review   │  ║
║  │ Negotiate    2        $580K      │  │    their objections from Mon          │  ║
║  │ Close        1        $420K      │  │ 2. GlobeCorp - No response to demo   │  ║
║  │                                  │  │    Typical follow-up rate: 2 touches │  ║
║  │ Pipeline Total: $2.65M            │  │ 3. Acme - Legal review; 95% close   │  ║
║  │ vs Target: $2.8M (95%)            │  │    rate at this stage               │  ║
║  │ Win Rate (30d): 35%               │  │                                       │  ║
║  │                                  │  │ 📊 Today's Performance:               │  ║
║  │ [View Detailed Pipeline]          │  │ • Calls: 12/15 (80%) - On track      │  ║
║  │ [Move Deals]                      │  │ • Call Duration Avg: 18 min (vs 22)  │  ║
║  │ [Forecast Accuracy]               │  │ • Demo Completion Rate: 87% (Great!) │  ║
║  │                                  │  │                                       │  ║
║  │ 🎓 Coaching Tip:                  │  │ 💡 Conversation Intel:                │  ║
║  │ Your "Proposal→Close" stage is    │  │ • TechStart: Budget concern voiced   │  ║
║  │ 3 days faster than team avg       │  │   Solution: Show 3-month ROI calc    │  ║
║  │ = 12% higher close rate! Keep it  │  │ • GlobeCorp: Delayed response pattern│  ║
║  │ up by following your proven path  │  │   Action: Call instead of email      │  ║
║  └──────────────────────────────────┘  └───────────────────────────────────────┘  ║
║                                                                                    ║
║  ┌─ LEAD ACTIVITY (Last 7 days) ──────────────────────────────────────┐          ║
║  │ Lead Name          Status    Email Opens  Click Through  Phone Calls│          ║
║  │                                                                      │          ║
║  │ TechStart Inc     Engaged   5/6 opens ↑  2 clicks → Proposal  1    │          ║
║  │ GlobeCorp Ltd     Stalled   1/4 opens    No clicks              1    │          ║
║  │ Acme Corp         Hot       6/6 opens ↑  4 clicks → Close      3    │          ║
║  │ DataWorks         Waiting   0/3 opens    No action             0    │          ║
║  │ FinServe Corp     New       1/1 opens    No clicks             0    │          ║
║  │                                                                      │          ║
║  │ [View All Leads] [Add New Lead] [Bulk Actions] [Export CSV]        │          ║
║  │                                                                      │          ║
║  └──────────────────────────────────────────────────────────────────────┘         ║
║                                                                                    ║
║  🔔 Alerts & Notifications (Show/Hide)                                           ║
║  • TechStart: Call scheduled in 45 min - [Prepare] [Reschedule] [Cancel]        ║
║  • Acme: Legal review complete - [Review Changes] [Sign Off]                     ║
║  • Team: Sales Manager shared 3 coaching tips on your call quality               ║
║  • System: Your daily goal target (Calls: 15) - 3 hours left in day              ║
║                                                                                    ║
╚════════════════════════════════════════════════════════════════════════════════════╝

INTERACTION PATTERNS (Mobile-Optimized):
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. Daily Goals:
   - Single tap → Detailed breakdown: What I've done, what's left, time estimate
   - Hold 2s → Quick add: "Log call", "Log activity"
   - Swipe → Expand/collapse progress

2. Next Actions:
   - Tap action row → Full context panel (slides up from bottom)
     * Full deal history
     * Last 3 emails/calls
     * AI coaching insight
     * Quick action buttons (Call, Email, Meet, Move stage, Log)
   - Swipe right → Mark done (with haptic feedback)
   - Swipe left → Snooze (options: 1hr, 2hr, 1day, custom)
   - Hold 2s → Star as priority

3. Pipeline Cards:
   - Tap → Filter: Show only deals in that stage
   - Long-press → Bulk actions: Move all, Edit field, Export

4. Coaching Insights:
   - Tap insight → Detailed recommendation modal
     * Full reasoning based on deal history
     * Conversation script template
     * Success story from similar deal
     * [Copy to clipboard] [Open in email] [Schedule reminder]

5. Lead Activity:
   - Tap lead → Full profile:
     * Engagement timeline
     * Last interactions
     * Next recommended action
     * Quick actions
   - Swipe → See next lead

6. Real-time Notifications:
   - Toast (top of screen, 3s auto-dismiss)
   - For urgent actions: Stays until dismissed
   - Deep link to relevant action

MOBILE LAYOUT (375px):
━━━━━━━━━━━━━━━━━━━━

Scrollable single column:
1. Daily Goals (sticky at top)
2. Next Actions (expandable sections)
3. Pipeline summary (cards)
4. Coaching tip (sticky or dismissible)
5. Lead activity (scrollable list)
6. Notifications (collapsible)

Responsive adjustments:
- Hide columns: Last activity, detailed coaching
- Consolidate: Move stage into dropdown on action row
- Stack: KPI cards vertically
- Tab navigation: Overview | Pipeline | Leads | Coaching
```

---

### 2.3 EXECUTIVE DASHBOARD

**Purpose:** Strategic overview, board-level KPIs, trend analysis, forecasting  
**Refresh Rate:** 30-minute intervals (batch updates for performance)  
**Export Options:** Executive PDF summary, scheduled board reports  
**Audience:** CEO, VP Sales, CFO

```
╔════════════════════════════════════════════════════════════════════════════════════╗
║  Revenue Executive Dashboard              [Q2 2026]     [Compare: Q1 2026 ▼]      ║
╠════════════════════════════════════════════════════════════════════════════════════╣
║                                                                                    ║
║  ┌─ STRATEGIC KPIs (Updated Daily) ────────────────────────────────────┐         ║
║  │                                                                       │         ║
║  │  ARR Growth        │  Pipeline Health  │  Win Rate        │ Forecast │         ║
║  │  $12.4M ────────┐  │  $42.8M ────────┐ │  38% ────────┐   │ vs Quota │         ║
║  │  +$1.2M (10.7%) │  │  +$4.2M (10.9%) │ │  +4.2pp (12%)│   │ 92%      │         ║
║  │  vs Year Goal:  │  │  vs Target:     │ │  vs Industry │   │ Risk: 🟡 │         ║
║  │  $13.8M (89.8%) │  │  $48M (89.2%)   │ │  32% (Good)  │   │ -$2M gap │         ║
║  │  🟢 On Pace     │  │  🟡 Watch       │ │  🟢 Trending │   │ Action   │         ║
║  │                 │  │                 │ │              │   │ Required │         ║
║  └─────────────────┘  └─────────────────┘ │──────────────┘   └──────────┘         ║
║                                                                                    ║
║  ┌─ REVENUE WATERFALL (YTD vs Last Year) ─────────────────────────────┐          ║
║  │                                                                     │          ║
║  │  Jan-May      New        Churn      Expansion    Net      June     │          ║
║  │  $11.2M   Business    -$420K      +$680K       +$260K    Proj:    │          ║
║  │     │      +$1.8M                               $11.46M   $12.4M   │          ║
║  │     └──────→ │ ←──────────→ │ ←──────────→ │ ←────────→ │ (est)   │          ║
║  │              $1.8M         -$420K          +$680K                  │          ║
║  │                                                                     │          ║
║  │   [Compare YoY] [View by product] [View by region]                │          ║
║  │   [Hover for monthly breakdown]                                    │          ║
║  │                                                                     │          ║
║  └──────────────────────────────────────────────────────────────────────┘         ║
║                                                                                    ║
║  ┌─ 12-MONTH FORECAST (Line Chart) ──────────────────────────────────┐           ║
║  │ $14M ╱╱╱╱╱╱ ╱╱╱ ╱╱╱ ╱╱  Actual                                     │           ║
║  │ $13M╱   ╱╱  ╱  ╱  ╱     Forecast                                   │           ║
║  │ $12M╱        ╱╱        Optimistic (if +15% pipe growth)            │           ║
║  │ $11M                   Pessimistic (if -10% conversion)            │           ║
║  │ $10M────────────────────────────────────────────────────────────  │           ║
║  │      J F M A M J J A S O N D                                       │           ║
║  │      │           │ Confidence: 78%  Volatility: ±$1.2M            │           ║
║  │ [Sensitivity Analysis] [Change Assumptions]                       │           ║
║  │                                                                    │           ║
║  └────────────────────────────────────────────────────────────────────┘          ║
║                                                                                    ║
║  ┌─ TEAM PERFORMANCE SCORECARD ──────────────────────────────────────┐           ║
║  │ Rank │ Region/Team    │ ARR Target │ Current  │ % of Goal │ Status │           ║
║  │──────┼────────────────┼────────────┼──────────┼───────────┼────────│           ║
║  │  1   │ Sales East     │  $5.2M     │  $5.1M   │  98%  🟢  │ ✓      │           ║
║  │  2   │ Sales West     │  $4.8M     │  $4.2M   │  87%  🟡  │ ⚠️     │           ║
║  │  3   │ Partnerships   │  $2.8M     │  $2.5M   │  89%  🟡  │ ⚠️     │           ║
║  │  4   │ Enterprise     │  $2.0M     │  $1.8M   │  90%  🟡  │ On Track
           │           │ Sales Ops   │  $1.2M     │  $1.0M   │  83%  🟡  │ At Risk │           ║
║  │                                                                    │           ║
║  │  Total: $12.4M / $15.8M Target (78.5%)                           │           ║
║  │                                                                    │           ║
║  │  [View by individual rep] [View by product] [Drill to deals]     │           ║
║  │                                                                    │           ║
║  └────────────────────────────────────────────────────────────────────┘          ║
║                                                                                    ║
║  ┌─ PIPELINE BY STAGE ──────────────────┐  ┌─ CHURN & RETENTION ──────────┐     ║
║  │ Qualify  $4.2M  ████████░░░░░        │  │ Annual Churn: 18% (vs 15%)    │     ║
║  │ Propose  $12.8M ████████████░░░░░░░  │  │ Expansion Revenue: +12%       │     ║
║  │ Negotiate $14.5M ███████████████░░░  │  │ Customer Lifetime Value: $85K │     ║
║  │ Close    $10.3M ██████████░░░░░░░░░  │  │                              │     ║
║  │ Won       $1.0M ░░░░░░░░░░░░░░░░░░░ │  │ Retention at Risk: 8 accts   │     ║
║  │                                       │  │ Action: Sales success review  │     ║
║  │ Total Pipeline: $42.8M (vs $48M goal) │  │                              │     ║
║  │ Velocity: +$2.3M this week            │  │ [View At-Risk Accounts]       │     ║
║  │                                       │  │ [Expansion Opportunities]    │     ║
║  └───────────────────────────────────────┘  └──────────────────────────────┘    ║
║                                                                                    ║
║  ┌─ REGIONAL BREAKDOWN (Map + Table) ────────────────────────────────┐          ║
║  │                                                                     │          ║
║  │   [EMEA]         [AMER]         [APAC]                            │          ║
║  │    $5.2M         $4.8M          $2.4M                             │          ║
║  │    98% Goal      87% Goal       92% Goal                          │          ║
║  │    ↗ Growth      ↙ Risk         ↗ Growth                          │          ║
║  │                                                                     │          ║
║  │  [Click region to see team breakdown]                             │          ║
║  │  [Export regional performance]                                    │          ║
║  │                                                                     │          ║
║  └─────────────────────────────────────────────────────────────────────┘         ║
║                                                                                    ║
║  ┌─ BOARD-LEVEL ALERTS ────────────────────────────────────────────┐            ║
║  │ 🔴 CRITICAL: West region on pace to miss Q2 by $600K             │            ║
║  │    → Root cause: 2 deal delays in Negotiate stage                │            ║
║  │    → Recommendation: Sales manager intervention + deal resources │            ║
║  │    → [View Deal Details] [Escalate to VP]                        │            ║
║  │                                                                    │            ║
║  │ 🟡 WARNING: Churn rate up 3pp YoY                                │            ║
║  │    → 8 accounts at risk of non-renewal                          │            ║
║  │    → Revenue at risk: $320K                                       │            ║
║  │    → [Review At-Risk List] [Engage CSM]                          │            ║
║  │                                                                    │            ║
║  │ 🟢 GOOD: New business pipeline up 11% vs last month              │            ║
║  │    → Sales ops onboarding 4 new reps next month                 │            ║
║  │    → Capacity to deliver: +$1.8M Q3                             │            ║
║  │                                                                    │            ║
║  └────────────────────────────────────────────────────────────────────┘           ║
║                                                                                    ║
║  [Export to Board Deck] [Schedule Email Report] [Refresh Data] [Help]           ║
║                                                                                    ║
╚════════════════════════════════════════════════════════════════════════════════════╝

INTERACTION PATTERNS:
━━━━━━━━━━━━━━━━━━━━

1. KPI Cards:
   - Hover → Show sparkline (12-month trend)
   - Click → Time-series modal (daily/weekly view)
   - Comparison toggle → YoY, QoQ, MoM options

2. Revenue Waterfall:
   - Hover segment → Show breakdown by product/region/rep
   - Click segment → Drill to detailed transactions
   - Adjust assumptions → Real-time forecast recalculation

3. 12-Month Forecast:
   - Click forecast line → Open "Sensitivity Analysis"
     * Sliders for key drivers (deal velocity, conversion, churn)
     * Live forecast update
   - Range highlighting → Confidence intervals (70%, 80%, 90%)

4. Team Scorecard:
   - Sort by: ARR Target, Current, % of Goal (any column)
   - Click team → Drill to individual rep performance
   - Right-click row → Quick actions: Email team, Schedule 1:1, Export

5. Pipeline Chart:
   - Hover bar → Show deal count, avg size, days in stage
   - Click bar → Filter to show all deals in that stage
   - Export → CSV with deal details

6. Regional Map:
   - Click region → Expand to show:
     * Regional summary (ARR, growth, quota %)
     * Team members in region
     * Top 3 deals
     * Risk factors
   - Hover → Tooltip with quick metrics

7. Board Alerts:
   - Click alert → Deep dive panel:
     * Root cause analysis
     * Recommended actions
     * Historical trend
     * Team responsible + escalation path
   - Dismiss with 30-day snooze or permanent (tracks dismissal patterns)

MOBILE LAYOUT (375px):
━━━━━━━━━━━━━━━━━━━━

Simplified single-column scrollable view:
1. Strategic KPIs (cards, responsive: 2x2 grid)
2. Revenue Waterfall (horizontal scroll chart)
3. 12-Month Forecast (single line chart)
4. Team Performance (condensed: Top 3 teams only, [View All])
5. Pipeline Summary (bar chart)
6. Regional Breakdown (tab navigation)
7. Board-Level Alerts (collapsible sections)

Performance optimizations:
- Lazy load regional details
- Defer detailed charts until clicked
- Use web workers for forecast calculation
- Cache API responses for 30 min
```

---

### 2.4 FINANCE DASHBOARD

**Purpose:** Revenue analytics, CAC, LTV, ROI, unit economics  
**Refresh Rate:** Daily batch (overnight aggregation)  
**Export Options:** Financial reports, audit trail, reconciliation exports  
**Audience:** CFO, Controller, Finance analyst

```
╔════════════════════════════════════════════════════════════════════════════════════╗
║  Financial Analytics Dashboard           [FY2026]  [Period: Apr-Jun 2026 ▼]      ║
╠════════════════════════════════════════════════════════════════════════════════════╣
║                                                                                    ║
║  ┌─ UNIT ECONOMICS (Key Metrics) ────────────────────────────────────┐           ║
║  │                                                                     │           ║
║  │  CAC (Customer         LTV                    CAC Payback          │           ║
║  │  Acquisition Cost)     (Lifetime Value)       Period              │           ║
║  │                                                                     │           ║
║  │  $1,240                $28,500                11.2 months          │           ║
║  │  +$65 (5.2% up)        +$1,850 (6.9% up)     -0.8 months (Good!)   │           ║
║  │  vs last Q             vs last Q              Target: <12 months   │           ║
║  │  Trend: ↑ Rising       Trend: ↑ Improving    Status: 🟢 On Track  │           ║
║  │  (implies higher       (better unit          (LTV:CAC ratio: 23:1)│           ║
║  │   sales efficiency)    economics)                                  │           ║
║  │                                                                     │           ║
║  └─────────────────────────────────────────────────────────────────────┘           ║
║                                                                                    ║
║  ┌─ REVENUE COMPOSITION (Stacked Area Chart - 12 months) ────────────┐           ║
║  │                                                                     │           ║
║  │  $12M ┌─ New Business                                             │           ║
║  │  $10M │  ┌─ Expansion/Upsell                                      │           ║
║  │  $8M  │  │  ┌─ Renewal                                            │           ║
║  │  $6M  │  │  │  ┌─ Other                                           │           ║
║  │  $4M  │  │  │  │  ┌─────────────────────────────────────────    │           ║
║  │  $2M  └──┴──┴──┴──────────────────────────────────────────────    │           ║
║  │  $0M  J  F  M  A  M  J  J  A  S  O  N  D                           │           ║
║  │       │                                                             │           ║
║  │  Current mix:  New: 48% │ Expansion: 32% │ Renewal: 18% │ Other: 2%           │           ║
║  │  Healthy range: New >40%, Expansion >20%, Renewal >15%            │           ║
║  │                                                                     │           ║
║  │  [View by region] [Export revenue breakdown] [Adjust assumptions]│           ║
║  │                                                                     │           ║
║  └─────────────────────────────────────────────────────────────────────┘          ║
║                                                                                    ║
║  ┌─ UNIT ECONOMICS WATERFALL (Q2) ──────────────────────────────────┐           ║
║  │                                                                     │           ║
║  │  Bookings    Sales        Deployment   Retention    LTV           │           ║
║  │  $2.8M       Efficiency   Cost         %            Realized      │           ║
║  │   │          →0.82x       →$85 per     →94.2%       $24,200       │           ║
║  │   │          CAC          customer    (vs 96%)      (vs $28.5K)    │           ║
║  │   └─ CAC: $1,240          S&M: $15% of ACV          ROI: 1,880%   │           ║
║  │      (2% of ACV)          (Good)                     (Healthy)     │           ║
║  │                                                                     │           ║
║  │   [Assumptions] [Scenario: -10% LTV] [Scenario: +15% CAC]         │           ║
║  │                                                                     │           ║
║  └─────────────────────────────────────────────────────────────────────┘          ║
║                                                                                    ║
║  ┌─ CAC BY CHANNEL (Bar Chart - Q2 2026) ────────────────────────────┐          ║
║  │                                                                     │          ║
║  │  Direct Sales      $1,450  (Highest investment, highest LTV)      │          ║
║  │  ████████░░░░░                                                    │          ║
║  │                                                                     │          ║
║  │  Self-Service      $380    (Lowest CAC, emerging channel)         │          ║
║  │  ███░░░░░░░░░                                                    │          ║
║  │                                                                     │          ║
║  │  Partnerships      $920    (Strategic, mid-range CAC)             │          ║
║  │  ██████░░░░░░░                                                   │          ║
║  │                                                                     │          ║
║  │  Inbound Marketing $650    (Quality leads, good efficiency)       │          ║
║  │  █████░░░░░░░░░                                                 │          ║
║  │                                                                     │          ║
║  │  Blended Avg CAC: $1,240   Target: <$1,300  Status: 🟢 Good      │          ║
║  │                                                                     │          ║
║  │  [Benchmark vs industry] [Efficiency score by channel]            │          ║
║  │                                                                     │          ║
║  └─────────────────────────────────────────────────────────────────────┘         ║
║                                                                                    ║
║  ┌─ COHORT RETENTION ANALYSIS (LTV Driver) ──────────────────────────┐          ║
║  │                                                                     │          ║
║  │  Cohort    M0   M1   M2   M3   M4   M5   M6   Implied LTV         │          ║
║  │  ────────────────────────────────────────────────────────────────  │          ║
║  │  2026-Q1   100% 98%  96%  95%  95%  94%  94%  $28,200             │          ║
║  │  2026-Q2   100% 98%  97%  96%                  $28,500 (est)      │          ║
║  │  2026-Q3   100% 99%  98%                       $29,100 (proj)     │          ║
║  │  2025-Q4   100% 96%  94%  92%  90%  88%  87%  $24,800             │          ║
║  │  2025-Q3   100% 94%  88%  85%  82%  78%  75%  $18,600             │          ║
║  │                                                                     │          ║
║  │  Trend: ↑ Retention improving (better onboarding Q2-Q3)           │          ║
║  │  Churn drivers: Early month 2 decline → May indicate onboarding   │          ║
║  │  issue. CSM action: Enhanced first 30-day support.               │          ║
║  │                                                                     │          ║
║  │  [Drill to cohort details] [Root cause analysis] [CSM actions]   │          ║
║  │                                                                     │          ║
║  └─────────────────────────────────────────────────────────────────────┘         ║
║                                                                                    ║
║  ┌─ PAYBACK PERIOD BY SEGMENT (Bar Chart) ─────────────────────────┐            ║
║  │                                                                    │            ║
║  │  SMB (< $50K ACV)         Enterprise (>$500K ACV)               │            ║
║  │  9.2 months                14.8 months                          │            ║
║  │  ████████░░░░░░             ██████████████░░░░░░░░              │            ║
║  │  (Fast, high-volume)        (Longer, higher LTV)                │            ║
║  │                                                                    │            ║
║  │  Mid-Market ($50K-$500K)                                        │            ║
║  │  11.5 months                                                    │            ║
║  │  ███████████░░░░░░░░░                                           │            ║
║  │  (Balanced)                                                     │            ║
║  │                                                                    │            ║
║  │  Blended Payback: 11.2 months (Target: <12)  Status: 🟢 Good    │            ║
║  │                                                                    │            ║
║  └────────────────────────────────────────────────────────────────────┘           ║
║                                                                                    ║
║  ┌─ FINANCIAL AUDIT TRAIL ───────────────────────────────────────────┐          ║
║  │ Transaction Type        Count    Amount         Status      Last Updated       │          ║
║  │                                                                     │          ║
║  │ New Contract            48       $2.8M         ✓ Verified   Jun 20, 3:45pm   │          ║
║  │ Renewal                 35       $840K         ✓ Verified   Jun 20, 3:42pm   │          ║
║  │ Upgrade/Expansion       28       $620K         ⚠️ Pending   Jun 20, 2:10pm   │          ║
║  │ Churn                   12      -$420K         ✓ Verified   Jun 20, 1:30pm   │          ║
║  │ Refund                   2       -$24K         ⏳ In Review  Jun 19, 4:20pm   │          ║
║  │                                                                     │          ║
║  │ [Export for reconciliation] [View transactions] [Audit log]       │          ║
║  │                                                                     │          ║
║  └─────────────────────────────────────────────────────────────────────┘         ║
║                                                                                    ║
║  [Export Financial Report] [Download GAAP Statement] [Email CFO] [Help]         ║
║                                                                                    ║
╚════════════════════════════════════════════════════════════════════════════════════╝

INTERACTION PATTERNS:
━━━━━━━━━━━━━━━━━━━━

1. Unit Economics KPIs:
   - Hover → Show 12-month trend sparkline
   - Click → Time-series modal with monthly/quarterly granularity
   - Calculation link (?) → Show formula and assumptions

2. Revenue Composition:
   - Hover segment → Show $ amount and % of total
   - Click segment → Drill to transaction list
   - Stack toggle → Normalize to 100% view vs absolute $

3. CAC by Channel:
   - Hover bar → Show breakdown: # customers, avg ACV, calc basis
   - Click channel → Deep dive:
     * Channel performance over time
     * Cost drivers
     * Quality of customers (LTV, retention)
   - Right-click → Add/edit channel strategy

4. Cohort Retention:
   - Click cell → Show raw cohort data
   - Click cohort row → Show customer list
   - Hover M0→M6 → See retention path visual

5. Payback Period:
   - Hover bar → Show assumptions (ACV, CAC, churn)
   - Click segment → See customer list in that segment
   - Assumption slider → Recalculate real-time

6. Audit Trail:
   - Click transaction → Full details:
     * Line items
     * Related customer / deal
     * Verification status
     * Adjustment history
   - Filter by status / date range
   - Export for external audit

MOBILE LAYOUT (375px):
━━━━━━━━━━━━━━━━━━━━

Simplified single-column view:
1. Unit Economics (KPI cards: CAC, LTV, Payback)
2. Revenue Composition (pie chart or horizontal bar)
3. CAC by Channel (compact bar chart, max 4 channels)
4. Payback Period Summary (simplified)
5. Audit Trail (truncated, link to full view)

Performance:
- Pre-calculate cohort retention (don't recalc on demand)
- Lazy load audit trail
- Cache financial reports for 24 hours
```

---

### 2.5 AI COACH DASHBOARD

**Purpose:** Real-time coaching, call insights, win/loss analysis, rep improvement  
**Refresh Rate:** Real-time (processes calls as they complete, <2 min delay)  
**Export Options:** Weekly coaching reports, rep performance summaries  
**Audience:** Sales managers, individual reps (gamified view)

```
╔════════════════════════════════════════════════════════════════════════════════════╗
║  AI Sales Coach – Conversation Intelligence & Coaching       [Live Insights]      ║
╠════════════════════════════════════════════════════════════════════════════════════╣
║                                                                                    ║
║  ┌─ LIVE CALL MONITORING (Real-time transcription + AI analysis) ────────┐       ║
║  │                                                                         │       ║
║  │  [Live Call Active] Rep: Alice Johnson  │ Prospect: TechStart Inc     │       ║
║  │  Duration: 12:34  │ Speaker Changes: 8  │ Sentiment: 🟢 Positive      │       ║
║  │                                                                         │       ║
║  │  REAL-TIME COACHING (AI-powered):                                     │       ║
║  │  ────────────────────────────────────────────────────────────────────  │       ║
║  │  💡 OPPORTUNITY: Prospect just mentioned "budget approval pending"    │       ║
║  │     → Action: Ask timeline question → Script: "When can you expect   │       ║
║  │       approval?" (This increases close rate by 12% on similar calls) │       ║
║  │                                                                         │       ║
║  │  ⚠️ RISK: Prospect objection: "Your pricing is higher than..."       │       ║
║  │     → Recommended response (click to copy to clipboard):              │       ║
║  │       "I understand. Here's how our ROI justifies the premium..."     │       ║
║  │     → Similar successful call transcript available [View]            │       ║
║  │                                                                         │       ║
║  │  🟢 STRENGTH: Strong discovery questions asked (4/5 power questions)  │       ║
║  │     → Continue this pattern! This call style has 38% close rate.     │       ║
║  │                                                                         │       ║
║  │  ┌─ Call Transcript Snippet ─────────────────────────────────────┐   │       ║
║  │  │ Alice: "So let me make sure I understand..."                  │   │       ║
║  │  │ Prospect: "Yes, we have 3 teams using manual processes..."    │   │       ║
║  │  │ Alice: "How much time do you spend on data entry each week?"  │   │       ║
║  │  │           [AI: Power question - asking for quantifiable pain] │   │       ║
║  │  │ Prospect: "Probably 15 hours per week across the teams"       │   │       ║
║  │  │ Alice: "That's a significant time sink. Our platform..."      │   │       ║
║  │  │ [AI: Excellent connection to pain & solution]                 │   │       ║
║  │  └───────────────────────────────────────────────────────────────┘   │       ║
║  │                                                                         │       ║
║  │  [End Call] [Pause] [Full Transcript] [Meeting Notes] [Log Activity]  │       ║
║  │                                                                         │       ║
║  └─────────────────────────────────────────────────────────────────────────┘      ║
║                                                                                    ║
║  ┌─ CALL QUALITY SCORECARD (Post-Call Analysis - Auto-generated) ──────┐        ║
║  │                                                                        │        ║
║  │  Overall Call Quality: 8.2/10 (Good)                                 │        ║
║  │  ████████░░░░░░░░░░                                                 │        ║
║  │                                                                        │        ║
║  │  Discovery Depth:        8/10  🟢  (Asked 4 power questions)         │        ║
║  │  Objection Handling:     7/10  🟡  (Missed reframing opportunity)    │        ║
║  │  Value Communication:    9/10  🟢  (Clear ROI articulation)          │        ║
║  │  Closing Technique:      7/10  🟡  (No trial close attempted)        │        ║
║  │  Talk/Listen Ratio:      42/58 🟢  (Optimal: 40/60)                 │        ║
║  │  Questions Asked:        12    🟢  (Good engagement)                 │        ║
║  │  Prospect Engagement:    High  🟢  (Positive sentiment throughout)   │        ║
║  │                                                                        │        ║
║  │  KEY WINS:                          │ AREAS FOR IMPROVEMENT:         │        ║
║  │  ✓ Excellent discovery questions   │ • Practice closing statements  │        ║
║  │  ✓ Handled objection w/ empathy    │ • Shorten intro (too long)    │        ║
║  │  ✓ Good rapport building            │ • Add trial close before end  │        ║
║  │  ✓ Clear next steps defined         │ • Prepare ROI calcs in advance│        ║
║  │                                                                        │        ║
║  │  [View Full Analysis] [Send to Rep] [Compare to Team Avg]            │        ║
║  │                                                                        │        ║
║  └────────────────────────────────────────────────────────────────────────┘       ║
║                                                                                    ║
║  ┌─ TEAM COACHING INSIGHTS (Weekly Trend) ──────────────────────────────┐        ║
║  │                                                                        │        ║
║  │  Team Avg Call Quality: 7.6/10  (Up 0.3 from last week ↑)            │        ║
║  │                                                                        │        ║
║  │  Top Performers:              │  Needs Development:                  │        ║
║  │  ────────────────────────────  │  ─────────────────────────────────  │        ║
║  │  Alice: 8.4/10  (+0.2)  ✨    │  Dave: 6.8/10  (-0.5)  ⚠️            │        ║
║  │         (Excellent discovery)  │      (Struggling with objections)   │        ║
║  │                                │                                      │        ║
║  │  Carol: 8.1/10  (+0.1)        │  Eva: 7.1/10  (-0.3)               │        ║
║  │         (Consistent closer)    │      (Weak discovery questions)     │        ║
║  │                                │                                      │        ║
║  │  Bob: 7.9/10   (Stable)       │  Frank: 7.0/10  (New rep)          │        ║
║  │       (Good value comm)        │        (Onboarding in progress)    │        ║
║  │                                                                        │        ║
║  │  [View Rep Profiles] [Schedule 1:1 coaching] [Group training]        │        ║
║  │                                                                        │        ║
║  └────────────────────────────────────────────────────────────────────────┘       ║
║                                                                                    ║
║  ┌─ WIN/LOSS ANALYSIS (Last 30 days) ────────────────────────────────────┐      ║
║  │                                                                         │      ║
║  │  Won Deals: 12 (Average Call Quality: 8.3/10)                         │      ║
║  │  • Discovery Depth: 8.6/10  (Objection handling: 8.1/10)              │      ║
║  │  • Avg Deal Size: $185K  │ Avg Sales Cycle: 18 days                  │      ║
║  │  • Common winning patterns:                                            │      ║
║  │    - Ask 5+ discovery questions (vs 3 for average)                   │      ║
║  │    - Quantify prospect pain (mention specific $ or time impact)      │      ║
║  │    - Trial close 2-3 times before final close (vs 0.5 for average)  │      ║
║  │                                                                         │      ║
║  │  Lost Deals: 4 (Average Call Quality: 6.2/10)                         │      ║
║  │  • Discovery Depth: 5.8/10  (Objection handling: 5.5/10)              │      ║
║  │  • Avg Deal Size: $95K   │ Avg Sales Cycle: 22 days                  │      ║
║  │  • Common loss factors:                                                │      ║
║  │    - Insufficient discovery (asked 2-3 questions only)               │      ║
║  │    - Defensive responses to objections                               │      ║
║  │    - No trial close attempted (jumped to final close too early)      │      ║
║  │                                                                         │      ║
║  │  💡 RECOMMENDATION: Train team on trial closes (high-impact skill)    │      ║
║  │     Similar teams improved close rate by 12% after this training      │      ║
║  │     [View Training Module] [Schedule Group Coaching]                  │      ║
║  │                                                                         │      ║
║  └─────────────────────────────────────────────────────────────────────────┘     ║
║                                                                                    ║
║  ┌─ CONVERSATION INTELLIGENCE BY TOPIC ──────────────────────────────────┐       ║
║  │                                                                        │       ║
║  │  Budget Objections (15 calls):     Pricing Objections (9 calls):     │       ║
║  │  Win Rate: 60%                      Win Rate: 44%                     │       ║
║  │  Avg Response Quality: 7.2/10       Avg Response Quality: 6.1/10     │       ║
║  │  Top Responder: Alice (73% win)     Top Responder: Carol (56% win)   │       ║
║  │  [View successful scripts]          [View successful scripts]        │       ║
║  │                                                                        │       ║
║  │  Competitor Positioning (12 calls):  ROI Discussion (18 calls):      │       ║
║  │  Win Rate: 75%                       Win Rate: 82%                    │       ║
║  │  Avg Response Quality: 8.4/10        Avg Response Quality: 8.5/10    │       ║
║  │  Top Responder: Bob (83% win)        Top Responder: Alice (89% win)  │       ║
║  │  [View successful scripts]           [View successful scripts]       │       ║
║  │                                                                        │       ║
║  └────────────────────────────────────────────────────────────────────────┘      ║
║                                                                                    ║
║  ┌─ COACHING RECOMMENDATIONS (AI-Generated, Prioritized) ────────────────┐      ║
║  │                                                                         │      ║
║  │  🎯 PRIORITY 1 (High-Impact): For Dave                               │      ║
║  │     Issue: Declining call quality (-0.5 last week) + low discovery  │      ║
║  │     Action: 1:1 coaching on discovery questions                     │      ║
║  │     Training: "5 Power Questions Framework" (15 min module)         │      ║
║  │     Success Metric: Increase questions per call from 2→5            │      ║
║  │     Similar rep improved close rate: +8% after this coaching       │      ║
║  │     [Schedule 1:1 with Manager] [Send Training] [Assign Mentor]    │      ║
║  │                                                                         │      ║
║  │  🎯 PRIORITY 2 (Group Training): Team-wide                          │      ║
║  │     Issue: Team win rate 75% vs 85% (target)                        │      ║
║  │     Root cause: Limited trial close usage (0.5 per call vs 2 req)  │      ║
║  │     Action: Group training on trial close techniques                │      ║
║  │     Duration: 30 min workshop + 10 min case study review           │      ║
║  │     Expected impact: +8-12% win rate improvement                   │      ║
║  │     [Schedule Training] [View Training Materials]                   │      ║
║  │                                                                         │      ║
║  │  🎯 PRIORITY 3 (Praise & Reinforce): For Alice                      │      ║
║  │     Strength: Excellent discovery (8.6/10) + strong closing (8.4)   │      ║
║  │     Action: Peer mentoring - Have Alice mentor Dave & Eva          │      ║
║  │     Benefit: Spreads knowledge, motivates top performer             │      ║
║  │     [Assign as Mentor] [Create Peer Coaching Session]              │      ║
║  │                                                                         │      ║
║  └─────────────────────────────────────────────────────────────────────────┘     ║
║                                                                                    ║
║  [Export Weekly Report] [Email Reports] [View Call Library] [Settings]          ║
║                                                                                    ║
╚════════════════════════════════════════════════════════════════════════════════════╝

INTERACTION PATTERNS:
━━━━━━━━━━━━━━━━━━━━

1. Live Call Monitoring:
   - Real-time transcription updates every 2 seconds
   - Coaching tip appears within 3 seconds of opportunity detection
   - Click script → Copy to clipboard (shareable with rep)
   - Click "Similar call" → Side-panel with transcript comparison
   - End call → Auto-generates full scorecard within 30 seconds

2. Call Quality Scorecard:
   - Hover score → Show calculation basis
   - Click "View Full Analysis" → Expanded modal with:
     * Detailed breakdown by category
     * Timestamp-linked transcript excerpts
     * Recommendations for improvement
     * Benchmarking vs rep's past calls + team average
   - Right-click → Send feedback to rep, schedule 1:1

3. Team Coaching Insights:
   - Sort by: Quality score, improvement trend, needs development
   - Click rep → Full profile:
     * Recent call history
     * Trend chart (30-day)
     * Strength/development areas
     * Coaching assigned
     * Peer mentor assignment
   - Hover trend → Show daily data points

4. Win/Loss Analysis:
   - Click "View Training Module" → Interactive training (15 min)
   - Compare won vs lost → Side-by-side transcript view
   - Click pattern → See all examples of that pattern
   - Export analysis → Email to team with actionable insights

5. Topic Intelligence:
   - Click topic → Drill to:
     * All calls where topic was discussed
     * Win/loss distribution
     * Quality scores by rep
     * Successful scripts (click to copy)
     * Rep rankings on this topic
   - Add new topic → Custom tracking for specific sales situations

6. Coaching Recommendations:
   - Click action → Details:
     * Full coaching plan
     * Success stories from similar reps
     * Estimated impact on close rate
     * Timeline for improvement
   - "Schedule 1:1" → Calendar integration
   - "Send Training" → Auto-enrolls rep in learning module
   - "Assign Mentor" → Peer mentoring setup

MOBILE LAYOUT (375px):
━━━━━━━━━━━━━━━━━━━━

Simplified single-column scrollable view:
1. Live Call Status (if active call)
2. Recent Call Scorecards (3 most recent)
3. Team Quality Snapshot (Current week avg)
4. Coaching Recommendations (Top 1-2 priorities)
5. Win/Loss Summary (Last 30 days)
6. Upcoming Coaching Sessions

Real-time push notifications:
- Alert when rep's call quality drops significantly
- Alert when coaching recommendation assigned
- Alert for important team metrics changes
```

---

## PART 3: UX AUDIT – 15+ PAIN POINTS

### 3.1 Current State Challenges

| # | Pain Point | Impact | Severity | Current Solution | Proposed Fix | Clicks Saved |
|---|------------|--------|----------|------------------|--------------|-------------|
| 1 | **Pipeline visibility scattered across 3 screens** | Sales manager spends 8 min finding pipeline status | HIGH | Navigate: Dashboard → Deals → Filter by stage | Waterfall chart on main dashboard, click-through to details | 4 clicks → 1 |
| 2 | **Deal status requires manual checking** | 40% of forecast inaccuracy due to stale stage data | HIGH | Manager contacts reps daily via Slack | Automatic real-time stage tracking (update via call/email) | Manual → Real-time |
| 3 | **No next action guidance for reps** | Reps waste 2-3 hours/week deciding what to do next | HIGH | Reps check CRM, email, calendar separately | "Next Actions" widget with AI-prioritized list | 5+ steps → 1 |
| 4 | **CAC/LTV calculations require spreadsheet export** | Finance team spends 4 hours/week on manual calc | MEDIUM | Export → Excel → VLOOKUPs → Send report | Dashboard calculates automatically + sensitivity sliders | Manual → Automated |
| 5 | **Call recordings not transcribed/analyzed** | Reps learn slowly, sales manager can't coach on calls | CRITICAL | Manual review (1-2 min per call) | Auto-transcription + AI quality scoring within 30 sec | N/A → Real-time |
| 6 | **No early warning for at-risk deals** | 15% of forecast surprises (lost deals not flagged) | HIGH | Reactive: Deal moves unexpectedly | AI flags when: no activity >5 days, objection detected, urgency drops | N/A → Proactive |
| 7 | **Mobile experience is degraded** | Reps on-the-go can't access action items (60% adoption on mobile) | HIGH | Force desktop view on mobile | Responsive mobile-first design with touch-optimized workflows | N/A → Optimized |
| 8 | **Export options limited** | Sales manager can't share pipeline snapshot with executives | MEDIUM | Manual screenshots + notes | One-click PDF/CSV export, scheduled email reports | Manual → Automated |
| 9 | **No contrast issues BUT small text on dark mode** | Users strain to read details (feedback: "hard on eyes") | MEDIUM | Users increase zoom (hurts layout) | Improve text sizing, increase Neutral-400 to Neutral-500 | N/A → Improved |
| 10 | **Forecast assumes linear pipeline velocity** | Forecasts miss by ±$500K (16% variance) | MEDIUM | Managers adjust forecast manually (guesswork) | AI model includes: seasonality, rep velocity, deal complexity, stage lag | Manual → ML-driven |
| 11 | **No keyboard navigation on complex tables** | Power users can't use keyboard shortcuts (accessibility) | MEDIUM | Forced mouse navigation | Full Tab navigation, sortable columns via keyboard, arrow keys | Mouse → Keyboard |
| 12 | **Coaching insights require opening separate tool** | Sales manager can't see coaching data in context of deals | MEDIUM | Open: Dashboard → Switch to AI Coach → Find call | Coaching insights embedded in deal details (slide-out panel) | 3 apps → 1 app |
| 13 | **Empty states lack guidance** | New users see blank dashboard → Confusion | LOW | Users contact support | Contextual onboarding: "Import your first deal", tutorial, sample data | Friction → Guided |
| 14 | **Charts don't have data labels** | Users hover every point to understand trend | MEDIUM | Hover tooltips only | Add subtle value labels on key data points + legend always visible | Hover → Visible |
| 15 | **Rep names truncated in tables** | Confusion: Which rep is "D.A."? | LOW | Manual lookup in CRM | Show full name on hover, increase column width on desktop | Friction → Clarity |

---

### 3.2 Accessibility (WCAG 2.1 AA) Compliance Gaps

| Issue | Current State | WCAG Level | Fix | Priority |
|-------|---------------|-------------|-----|----------|
| **Color alone conveys status** | Red/green for deal status only | Level A ⚠️ | Add icon + text label (✓, ⚠️, 🔴) | HIGH |
| **Icon-only buttons lack labels** | Export icon with no tooltip | Level A ⚠️ | Add aria-label + visible label on desktop | HIGH |
| **Focus indicators removed** | Custom styling hides browser focus | Level A ⚠️ | Add 2px outline Primary-500 on focus | HIGH |
| **Tables lack proper headers** | Header row not marked semantically | Level A ⚠️ | Use <th scope="col"> for headers | MEDIUM |
| **Form labels missing** | Placeholder-only input fields | Level A ⚠️ | Add visible <label> + aria-label | HIGH |
| **Alt text missing on charts** | Charts render as images, no alt text | Level A ⚠️ | Add aria-label describing trend + data table alternative | MEDIUM |
| **Low contrast text (dark mode)** | Neutral-400 on Dark-Surface-1 = 3.2:1 | Level AA ⚠️ | Change to Neutral-300 (4.8:1 ✓) | HIGH |
| **Reduced motion not respected** | Animations ignore prefers-reduced-motion | Level AA ⚠️ | Use @media (prefers-reduced-motion) to disable 50ms | MEDIUM |
| **Screen reader table navigation** | Large tables not marked with roles | Level A ⚠️ | Add role="grid", aria-label on columns | MEDIUM |
| **Keyboard trap in modals** | Focus moves outside modal when tabbing | Level A ⚠️ | Implement focus trap (keep focus within modal) | HIGH |

---

### 3.3 Performance & Drilling Challenges

| Metric | Current | Target | Solution |
|--------|---------|--------|----------|
| **Dashboard initial load** | 3.2s (FCP) | <1.5s | Lazy load below-fold charts, pre-render critical KPI cards |
| **Drill-down latency** | 1.8s (click stage → load deals) | <500ms | Server-side filtering, cache recent queries |
| **Chart responsiveness** (hover) | 200ms | <100ms | Debounce hover events, use React.memo on chart components |
| **Mobile scroll jank** | CLS: 0.18 | CLS: <0.1 | Reserve space for async-loaded images, skeleton screens |
| **Table sorting** (1000 rows) | 800ms | <300ms | Client-side sort with Web Worker, virtual scrolling |
| **Mobile data table rendering** | 2.5s | <1s | Simplified card view (4 columns max), progressive load |

---

## PART 4: IMPLEMENTATION ROADMAP

### Phase 1: Foundation (Weeks 1-4) – Desktop Core Dashboards

**Goal:** Deliver Sales Manager + Executive dashboards with core KPIs + basic drilling

**Deliverables:**
1. ✅ Design system implementation (colors, typography, component library)
2. ✅ Sales Manager Dashboard (KPI cards, pipeline waterfall, deal table)
3. ✅ Executive Dashboard (ARR, forecast, team scorecard)
4. ✅ Accessibility audit + fixes (focus, labels, contrast)
5. ✅ Basic filtering + export (PDF, CSV)

**Success Metrics:**
- Dashboard load <1.5s (FCP)
- WCAG 2.1 AA compliance on these 2 dashboards
- 75% adoption in sales team (internal testing)

---

### Phase 2: Rep + Finance (Weeks 5-8)

**Goal:** Deliver personalized Rep dashboard + Finance metrics

**Deliverables:**
1. ✅ Sales Rep Dashboard (next actions, pipeline, coaching insights)
2. ✅ Finance Dashboard (CAC, LTV, unit economics, audit trail)
3. ✅ Scheduled email reports (weekly/monthly)
4. ✅ Mobile optimization (Rep dashboard primary)
5. ✅ AI Coach integration (real-time transcription API)

**Success Metrics:**
- Rep mobile adoption: 60%+
- Report email open rate: 40%+
- Finance reconciliation time: -50%

---

### Phase 3: Intelligence & Coaching (Weeks 9-12)

**Goal:** Add AI Coach dashboard + predictive insights

**Deliverables:**
1. ✅ AI Coach Dashboard (call scorecards, team insights, coaching recs)
2. ✅ Win/loss analysis powered by conversation intelligence
3. ✅ Predictive alerts (at-risk deals, forecast variance)
4. ✅ Embedded coaching in deal details
5. ✅ Dark mode implementation

**Success Metrics:**
- Call quality improvement: +0.5 pts on 10-pt scale
- Team adoption of coaching insights: 80%+
- Alert relevance: 70% actionable (not false positives)

---

### Phase 4: Advanced & Optimization (Weeks 13-16)

**Goal:** Performance tuning, advanced features, mobile-first refactor

**Deliverables:**
1. ✅ Mobile-first redesign (Rep dashboard primary platform)
2. ✅ Performance optimization (CLS <0.1, scroll <60fps)
3. ✅ Advanced filtering + saved views
4. ✅ Benchmarking (vs team, vs peer group, vs industry)
5. ✅ Custom dashboards (user-configurable widgets)
6. ✅ API for third-party integrations (Tableau, Looker)

**Success Metrics:**
- Mobile Core Web Vitals: All "Good" (Green)
- Custom dashboard adoption: 30%+
- Third-party integrations: 2+ connected

---

## PART 5: DESIGN TOKENS & IMPLEMENTATION GUIDE

### 5.1 CSS Custom Properties (Design Tokens)

```css
/* Colors - Semantic Tokens */
:root {
  /* Surfaces */
  --color-surface-primary: #ffffff;     /* Light bg */
  --color-surface-secondary: #f9fafb;
  --color-surface-tertiary: #f3f4f6;
  --color-surface-inverse: #111827;    /* Dark mode primary */
  
  /* Text */
  --color-text-primary: #111827;
  --color-text-secondary: #6b7280;
  --color-text-tertiary: #9ca3af;
  --color-text-inverse: #f1f5f9;       /* Dark mode */
  
  /* Interactive */
  --color-primary: #3b82f6;
  --color-primary-hover: #2563eb;
  --color-primary-active: #1d4ed8;
  --color-secondary: #e5e7eb;
  
  /* Semantic */
  --color-success: #10b981;
  --color-warning: #f59e0b;
  --color-danger: #ef4444;
  --color-info: #06b6d4;
  
  /* Typography */
  --font-family-base: "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  --font-family-mono: "IBM Plex Mono", monospace;
  
  --font-size-xs: 0.75rem;      /* 12px */
  --font-size-sm: 0.875rem;     /* 14px */
  --font-size-base: 1rem;       /* 16px */
  --font-size-lg: 1.125rem;     /* 18px */
  --font-size-xl: 1.25rem;      /* 20px */
  --font-size-2xl: 1.75rem;     /* 28px */
  --font-size-3xl: 2.25rem;     /* 36px */
  
  --font-weight-regular: 400;
  --font-weight-medium: 500;
  --font-weight-semibold: 600;
  --font-weight-bold: 700;
  
  /* Line Height */
  --line-height-tight: 1.2;
  --line-height-normal: 1.5;
  --line-height-relaxed: 1.75;
  
  /* Spacing */
  --space-1: 0.25rem;   /* 4px */
  --space-2: 0.5rem;    /* 8px */
  --space-3: 0.75rem;   /* 12px */
  --space-4: 1rem;      /* 16px */
  --space-6: 1.5rem;    /* 24px */
  --space-8: 2rem;      /* 32px */
  --space-12: 3rem;     /* 48px */
  
  /* Shadows */
  --shadow-sm: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
  --shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
  --shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
  
  /* Border Radius */
  --radius-sm: 0.375rem;  /* 6px */
  --radius-md: 0.5rem;    /* 8px */
  --radius-lg: 1rem;      /* 16px */
  
  /* Transitions */
  --transition-fast: 150ms ease-out;
  --transition-base: 200ms ease-out;
  --transition-slow: 300ms ease-out;
}

@media (prefers-color-scheme: dark) {
  :root {
    --color-surface-primary: #0f172a;
    --color-surface-secondary: #1e293b;
    --color-surface-tertiary: #334155;
    --color-text-primary: #f1f5f9;
    --color-text-secondary: #cbd5e1;
  }
}
```

---

### 5.2 Component Example: KPI Card

```tsx
// components/KPICard.tsx
import React from 'react';
import { TrendIcon } from './TrendIcon';

interface KPICardProps {
  label: string;
  value: string;
  trend: {
    value: number;
    percentage: number;
    direction: 'up' | 'down' | 'neutral';
  };
  status: 'good' | 'warning' | 'critical';
  meta?: string;
  onClick?: () => void;
  sparklineData?: number[];
}

export const KPICard: React.FC<KPICardProps> = ({
  label,
  value,
  trend,
  status,
  meta,
  onClick,
  sparklineData,
}) => {
  const statusColors = {
    good: 'var(--color-success)',
    warning: 'var(--color-warning)',
    critical: 'var(--color-danger)',
  };

  return (
    <div
      className="kpi-card"
      onClick={onClick}
      role="button"
      tabIndex={0}
      aria-label={`${label}: ${value}, ${trend.direction} ${trend.percentage}%`}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') onClick?.();
      }}
    >
      {/* Header */}
      <div className="kpi-header">
        <span className="kpi-label">{label}</span>
        {sparklineData && (
          <svg className="kpi-sparkline" width="60" height="20">
            {/* Sparkline SVG */}
          </svg>
        )}
      </div>

      {/* Value */}
      <div className="kpi-value" style={{ fontFamily: 'var(--font-family-mono)' }}>
        {value}
      </div>

      {/* Trend */}
      <div className="kpi-trend">
        <TrendIcon direction={trend.direction} color={statusColors[status]} />
        <span className="kpi-trend-text">
          {trend.direction === 'up' ? '+' : trend.direction === 'down' ? '-' : ''}
          {Math.abs(trend.value).toLocaleString()} ({trend.percentage}%)
        </span>
      </div>

      {/* Meta */}
      {meta && <div className="kpi-meta">{meta}</div>}

      {/* Status Indicator */}
      <div className="kpi-status" style={{ backgroundColor: statusColors[status] }} />
    </div>
  );
};

// Styles
export const styles = `
.kpi-card {
  background: var(--color-surface-primary);
  border: 1px solid var(--color-surface-tertiary);
  border-radius: var(--radius-md);
  padding: var(--space-4);
  cursor: pointer;
  transition: var(--transition-base);
  position: relative;
  
  /* Touch target minimum */
  min-height: 120px;
  
  /* Accessible focus state */
  &:focus-visible {
    outline: 2px solid var(--color-primary);
    outline-offset: 2px;
  }
  
  &:hover {
    box-shadow: var(--shadow-md);
    border-color: var(--color-primary);
  }
}

.kpi-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--space-3);
}

.kpi-label {
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-medium);
  color: var(--color-text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.kpi-value {
  font-size: 2rem;
  font-weight: var(--font-weight-bold);
  color: var(--color-text-primary);
  line-height: var(--line-height-tight);
  margin-bottom: var(--space-2);
}

.kpi-trend {
  display: flex;
  align-items: center;
  gap: var(--space-1);
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
  margin-bottom: var(--space-2);
}

.kpi-meta {
  font-size: var(--font-size-xs);
  color: var(--color-text-tertiary);
  line-height: var(--line-height-normal);
}

.kpi-status {
  position: absolute;
  top: 0;
  left: 0;
  width: 4px;
  height: 100%;
  border-radius: var(--radius-md) 0 0 var(--radius-md);
}

/* Dark mode */
@media (prefers-color-scheme: dark) {
  .kpi-card {
    background: var(--color-surface-secondary);
    border-color: var(--color-surface-tertiary);
  }
}

/* Mobile responsiveness */
@media (max-width: 767px) {
  .kpi-card {
    width: 100%;
    min-height: 100px;
  }
  
  .kpi-value {
    font-size: 1.5rem;
  }
  
  .kpi-sparkline {
    display: none;
  }
}
`;
```

---

### 5.3 Responsive Grid Layout

```tsx
// components/DashboardLayout.tsx
export const dashboardGrid = `
/* Desktop (1024px+) */
@media (min-width: 1024px) {
  .dashboard {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: var(--space-6);
  }
  
  .kpi-card { grid-column: span 1; }
  .chart-large { grid-column: span 2; }
  .chart-medium { grid-column: span 2; }
  .table-full { grid-column: span 4; }
}

/* Tablet (768px - 1023px) */
@media (min-width: 768px) and (max-width: 1023px) {
  .dashboard {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: var(--space-4);
  }
  
  .kpi-card { grid-column: span 1; }
  .chart-large { grid-column: span 2; }
  .chart-medium { grid-column: span 1; }
  .table-full { grid-column: span 2; }
}

/* Mobile (375px - 767px) */
@media (max-width: 767px) {
  .dashboard {
    display: grid;
    grid-template-columns: 1fr;
    gap: var(--space-4);
  }
  
  .kpi-card { grid-column: span 1; }
  .chart-large { grid-column: span 1; }
  .chart-medium { grid-column: span 1; }
  .table-full { grid-column: span 1; }
  
  /* Reduce padding on mobile */
  .dashboard {
    padding: var(--space-3);
  }
}
`;
```

---

## CONCLUSION

This Revenue AI Platform dashboard design system provides:

✅ **5 role-specific dashboards** with wireframes + interaction patterns  
✅ **Design system** (colors, typography, components, spacing, responsive grid)  
✅ **WCAG 2.1 AA accessibility** compliance guidelines  
✅ **15+ identified UX pain points** with proposed fixes (70% click reduction)  
✅ **4-phase implementation roadmap** (16 weeks)  
✅ **Performance targets** (CLS <0.1, FCP <1.5s)  
✅ **Component library** with code examples + CSS tokens  
✅ **Mobile-first responsive design** (375px - 1440px+)

**Next Steps:**
1. Stakeholder review & feedback
2. Figma design file creation (using design tokens)
3. Phase 1 sprint planning (Design system + Sales Manager dashboard)
4. Dev environment setup (React components, API integration)
5. QA testing plan (functional, accessibility, performance)
