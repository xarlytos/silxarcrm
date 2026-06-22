# Revenue AI Dashboard - Implementation Checklist & Mobile-First Guide

**Date:** 2026-06-21  
**Status:** Ready for Phase 1 Development  
**Target:** Week 1 Sprint Kickoff

---

## QUICK START: PHASE 1 (Weeks 1-4)

### Week 1: Foundation Setup

- [ ] **Design System Implementation**
  - [ ] Create CSS custom properties file (design tokens)
  - [ ] Set up Tailwind config with custom colors + spacing scale
  - [ ] Define typography scale (responsive: 375px vs 1440px)
  - [ ] Test contrast ratios (all text/backgrounds WCAG 2.1 AA)
  - [ ] Create component library base:
    - [ ] Button (primary, secondary, danger)
    - [ ] Card (base, KPI, data)
    - [ ] Input (text, select, date)
    - [ ] Badge (status indicators)
    - [ ] Loading skeleton
    - [ ] Empty state

- [ ] **Project Setup**
  - [ ] Create branch: `feature/dashboard-redesign`
  - [ ] Set up React component folder structure:
    ```
    src/
    ├── components/
    │   ├── dashboard/
    │   │   ├── KPICard.tsx
    │   │   ├── PipelineWaterfall.tsx
    │   │   ├── DealTable.tsx
    │   │   ├── ...
    │   ├── shared/
    │   │   ├── Button.tsx
    │   │   ├── Card.tsx
    │   │   ├── ...
    │   └── charts/
    │       ├── LineChart.tsx
    │       ├── BarChart.tsx
    │       └── ...
    ├── styles/
    │   ├── tokens.css
    │   ├── variables.css
    │   └── globals.css
    ├── hooks/
    │   ├── useDashboard.ts
    │   └── useFilters.ts
    └── types/
        └── dashboard.ts
    ```
  - [ ] Install dependencies:
    - [ ] `recharts` (charting library, accessible)
    - [ ] `react-hook-form` (forms + validation)
    - [ ] `zustand` (state management)
    - [ ] `@headlessui/react` (accessible components)
    - [ ] `clsx` (conditional classnames)

- [ ] **Testing Infrastructure**
  - [ ] Set up accessibility testing:
    - [ ] `@testing-library/jest-dom`
    - [ ] `axe-core` (automated a11y testing)
    - [ ] `jest-axe` (a11y assertions)
  - [ ] Create test template for a11y:
    ```tsx
    // components/__tests__/KPICard.a11y.test.tsx
    describe('KPICard Accessibility', () => {
      it('should have proper ARIA labels', () => {
        const { container } = render(
          <KPICard label="ARR" value="$2.4M" ... />
        );
        expect(screen.getByRole('button')).toHaveAttribute(
          'aria-label',
          expect.stringContaining('ARR')
        );
      });
      
      it('should pass axe accessibility checks', async () => {
        const { container } = render(<KPICard ... />);
        const results = await axe(container);
        expect(results).toHaveNoViolations();
      });
    });
    ```

---

### Week 2: Sales Manager Dashboard

**Goal:** Core dashboard with KPI cards + pipeline waterfall + deal table

- [ ] **KPI Cards Component**
  - [ ] Responsive layout (4 cols desktop / 2 cols tablet / 1 col mobile)
  - [ ] Hover state: show sparkline trend
  - [ ] Click handler: open detail modal
  - [ ] Status indicators: good/warning/critical with proper colors
  - [ ] Accessibility:
    - [ ] aria-label with full context (e.g., "ARR: 2.4M, up 180K (8%)")
    - [ ] Focus visible outline (2px Primary-500)
    - [ ] Keyboard navigation (Tab + Enter to open)
  - [ ] Performance: Use `React.memo()` to prevent re-renders

- [ ] **Pipeline Waterfall Chart**
  - [ ] Recharts integration with custom styling
  - [ ] Stages: Qualify → Propose → Negotiate → Close → Won
  - [ ] On hover: show tooltip with (deal count, avg size, days in stage)
  - [ ] On click: filter main table to show only deals in that stage
  - [ ] Responsive: Vertical (desktop) / Horizontal (mobile)
  - [ ] Accessibility:
    - [ ] aria-label describing overall pipeline value
    - [ ] Keyboard navigation: Left/right arrows to select stage
    - [ ] Screen reader: "Stage: Qualify, $2.1M, 5 deals, 0 days avg"

- [ ] **Deal Table Component**
  - [ ] Columns: Deal name, Stage, Amount, Rep, Last activity, Status
  - [ ] Sortable by: Status, Activity date, Days in stage, Amount, Rep
  - [ ] Hover effects:
    - [ ] Row highlight (Neutral-50 background)
    - [ ] Show ⚠️ badge tooltip on hover
    - [ ] Show 🟢 badge (confidence score) tooltip
  - [ ] Click row: Expand inline to show deal details
    - [ ] Timeline view (calls, emails, stage changes)
    - [ ] AI coaching insights
    - [ ] Next required action
    - [ ] Quick action buttons (Move stage, Schedule follow-up, Log call)
  - [ ] Pagination: 4 rows initially, [Load More] button (virtual scroll on desktop)
  - [ ] Accessibility:
    - [ ] aria-label for each column header
    - [ ] Sortable: aria-sort="ascending" / "descending" / "none"
    - [ ] Keyboard: Tab to navigate, Enter/Space to expand row
    - [ ] Screen reader announces row as "Card, Deal name, Stage, Amount, Rep"

- [ ] **Filters Component**
  - [ ] Period (Q1 2026, Q2 2026, YTD, Custom date range)
  - [ ] Team (All teams, Sales East, Sales West, etc.)
  - [ ] Stage (All, Qualify, Propose, Negotiate, Close, Won)
  - [ ] Rep (All, individual rep names)
  - [ ] Amount range ($0-$1M, $1M-$5M, $5M+, custom)
  - [ ] Status (All, On track, At risk, Overdue)
  - [ ] Sticky at top on mobile, collapsible header
  - [ ] "Save View" button → Store as named filter preset
  - [ ] "Clear Filters" → Reset to defaults
  - [ ] Accessibility:
    - [ ] Fieldset + legend for filter group
    - [ ] Labels on all inputs (not placeholder-only)
    - [ ] aria-label on filter toggles

- [ ] **Export Functionality**
  - [ ] [📊 Export] dropdown menu:
    - [ ] PDF (formatted dashboard snapshot)
    - [ ] CSV (raw deal data for Excel)
    - [ ] Email report (choose frequency: weekly/monthly)
  - [ ] PDF generation:
    - [ ] Use `jspdf` + `html2canvas`
    - [ ] Include: KPI summary, waterfall chart, top performers, deal count by stage
    - [ ] Brand header with date/time
  - [ ] CSV export: All visible columns + hidden columns toggle
  - [ ] Accessibility: Confirm dialogs with clear descriptions

- [ ] **Performance Optimization**
  - [ ] Lazy load chart library (`recharts`) on first render
  - [ ] Virtualize table (show 4 visible rows + buffer)
  - [ ] Memo components to prevent unnecessary re-renders
  - [ ] Debounce filter changes (300ms)
  - [ ] Target: FCP <1.5s, TTI <3s, CLS <0.1

- [ ] **Testing**
  - [ ] Unit tests for each component (render, interactions, a11y)
  - [ ] Integration tests (filter → table update, click stage → table filter)
  - [ ] Visual regression tests (screenshot on desktop + mobile)
  - [ ] Performance audit (Lighthouse)

---

### Week 3: Executive Dashboard

**Goal:** Strategic KPIs + forecast + team performance scorecard

- [ ] **Strategic KPI Cards**
  - [ ] ARR Growth, Pipeline Health, Win Rate, Forecast vs Quota
  - [ ] Display: Value, Trend (+/- %), comparison to target
  - [ ] Status badges: 🟢 On pace, 🟡 Watch, 🔴 At risk
  - [ ] Same as Sales Manager KPI cards (reuse component)

- [ ] **Revenue Waterfall Chart**
  - [ ] Stacked visualization: Jan-May revenue
  - [ ] Segments: Last period ARR → New Business → Churn → Expansion → Net → Current ARR
  - [ ] Hover: Show $ amount + % contribution
  - [ ] Click segment: Drill to breakdown by product/region/rep
  - [ ] Mobile: Horizontal scroll

- [ ] **12-Month Forecast Line Chart**
  - [ ] X-axis: Months (J F M A M J J A S O N D)
  - [ ] Y-axis: Revenue ($10M - $14M range)
  - [ ] Lines: Actual (solid), Forecast (dashed), Optimistic (+15%), Pessimistic (-10%)
  - [ ] Confidence interval shading (70%, 80%, 90%)
  - [ ] Hover: Show exact $ + confidence %
  - [ ] Click forecast → Open sensitivity analysis modal:
    - [ ] Sliders for deal velocity, conversion rate, churn rate
    - [ ] Real-time forecast recalculation
  - [ ] Accessibility: aria-label "Forecast: 12-month revenue trend..."

- [ ] **Team Performance Scorecard (Table)**
  - [ ] Columns: Rank, Region/Team, ARR Target, Current, % of Goal, Status
  - [ ] Sortable by any column
  - [ ] Status colors: 🟢 (>95%), 🟡 (85-95%), 🔴 (<85%)
  - [ ] Click row: Expand to show:
    - [ ] Individual rep breakdown
    - [ ] Top 3 deals in that team
    - [ ] Key risks/opportunities
  - [ ] Accessibility: aria-sort on headers, aria-label on status cells

- [ ] **Pipeline Stage Chart**
  - [ ] Stacked bar showing $ by stage (Qualify, Propose, Negotiate, Close, Won)
  - [ ] Show total + % of goal
  - [ ] Click stage → Filter to full deal list (drill-down)
  - [ ] Hover bar → Show avg deal size, days in stage, conversion rate

- [ ] **Regional Breakdown (Map + Table)**
  - [ ] Visual map highlighting regions (EMEA, AMER, APAC)
  - [ ] Click region → Expand to show:
    - [ ] Regional summary KPIs
    - [ ] Team members in that region
    - [ ] Top 3 deals
    - [ ] Risk factors (at-risk deals, churn threats)

- [ ] **Board-Level Alerts Section**
  - [ ] Critical alerts (red): Forecast miss risk, major deal delay
  - [ ] Warning alerts (yellow): Churn rate up, region lagging
  - [ ] Good news (green): Pipeline growth, new bookings
  - [ ] Each alert includes: Root cause + recommended action + escalation path
  - [ ] Click alert → Deep dive panel with historical trend
  - [ ] Dismiss option (30-day snooze or permanent)

---

### Week 4: Polish + QA

- [ ] **Dark Mode Implementation**
  - [ ] Add `prefers-color-scheme: dark` CSS rules
  - [ ] Define dark color tokens (Dark-Surface-1, Dark-Surface-2, etc.)
  - [ ] Test all components in dark mode:
    - [ ] Contrast ratios still 4.5:1 for body text
    - [ ] Borders/separators visible
    - [ ] Interaction states distinguishable
  - [ ] Charts: Adjust line colors for dark background

- [ ] **Mobile Responsiveness**
  - [ ] Test on 375px (iPhone 12 mini), 768px (iPad), 1024px (iPad Pro)
  - [ ] Verify no horizontal scroll
  - [ ] KPI cards: Stack vertically, full width
  - [ ] Charts: Responsive width, maintain aspect ratio
  - [ ] Table: Convert to card view on mobile (show 4 key columns)
  - [ ] Filters: Collapsible header with toggle button
  - [ ] Safe area: Respect status bar, navigation bar clearance

- [ ] **Accessibility Comprehensive Audit**
  - [ ] Automated testing: `axe-core` (should have 0 violations)
  - [ ] Manual testing:
    - [ ] Keyboard navigation (Tab through all elements)
    - [ ] Screen reader testing (NVDA on Windows, JAWS recommended)
    - [ ] Focus indicators (2px outline on all interactive elements)
    - [ ] Contrast checker (all text/backgrounds ≥4.5:1)
    - [ ] Color only: Check no info conveyed by color alone
    - [ ] Reduced motion: Disable animations for `prefers-reduced-motion`
  - [ ] Forms: All inputs have associated labels
  - [ ] Charts: Alt text / aria-label for chart descriptions
  - [ ] Buttons: Icon + text labels (not icon-only)
  - [ ] Links: Underlined, clear purpose
  - [ ] Error messages: Clear, actionable, positioned near field

- [ ] **Performance Audit (Lighthouse)**
  - [ ] FCP (First Contentful Paint): <1.5s
  - [ ] LCP (Largest Contentful Paint): <2.5s
  - [ ] CLS (Cumulative Layout Shift): <0.1
  - [ ] TTI (Time to Interactive): <3.5s
  - [ ] Core Web Vitals: All "Good" (Green)

- [ ] **Cross-browser Testing**
  - [ ] Chrome (latest)
  - [ ] Firefox (latest)
  - [ ] Safari (macOS + iOS)
  - [ ] Edge (latest)
  - [ ] Mobile browsers (Chrome Android, Safari iOS)

- [ ] **Internal Testing & Feedback**
  - [ ] Sales team pilot (10 power users)
  - [ ] Collect feedback: 48-hour turnaround
  - [ ] Fix critical issues
  - [ ] Document feature requests for Phase 2

---

## MOBILE-FIRST OPTIMIZATION GUIDE

### Touch Target Sizing
```
Minimum touch target: 44×44px (iOS) / 48×48dp (Android)

KPI Card:
  ✓ Min height: 120px (desktop) / 100px (mobile)
  ✓ Padding: 16px (creates 44px min tap area)

Button:
  ✓ Height: 40px
  ✓ Padding: 10px horizontal
  ✓ Expand hit area with ::before pseudo-element to 44×44px

Icon Buttons:
  ✓ Visual icon: 24px
  ✓ Total tap area: 44×44px (use hitSlop in React)
  ✓ Icon centered with extra padding
```

### Spacing Adjustments (Mobile vs Desktop)

```
Desktop (1024px+):     Tablet (768px-1023px):   Mobile (375px-767px):
────────────────────   ─────────────────────    ─────────────────────
Padding: 20px          Padding: 16px            Padding: 12px
Gap: 24px              Gap: 16px                Gap: 12px
KPI cols: 4            KPI cols: 2              KPI cols: 1
Table cols: 6          Table cols: 4            Table cols: 3 (card view)
```

### Chart Responsiveness

```
Line Chart:
  Desktop: 600px width, 300px height
  Mobile: 100% width, 250px height (aspect ratio 2.4:1)
  
  Axis labels rotate 45° on small screens
  Legend moves below chart on mobile
  
Bar Chart:
  Desktop: Vertical bars, category names below
  Mobile: Horizontal bars, names on left (easier to read)
  
Pie/Donut:
  Mobile: Don't use for >3 categories (switch to bar)
  
Touch points:
  Min 44×44px tap area on chart (data points, bars, slices)
  Tooltip: Large, readable (min 12px font), positioned to fit viewport
```

### Gesture Support

```
Touch Actions:
  1. Tap KPI card → Expand detail modal
  2. Swipe action item left → Mark done / Snooze options
  3. Long press deal → Quick actions menu
  4. Pinch zoom → Supported on charts (don't disable)
  
Avoid:
  ✗ Multi-touch gestures (complex)
  ✗ Long press confusion (use obvious UI affordance instead)
  ✗ Horizontal scroll (harder on mobile, use vertical)
```

### Performance on Mobile (Target: <2.5s initial load)

```
1. Code Splitting:
   - Dashboard shell: Loaded immediately
   - Charts: Lazy loaded on first use
   - Coaching AI: Loaded in background (if present)

2. Image Optimization:
   - Use WebP/AVIF format
   - Set width/height attributes (prevent CLS)
   - Lazy load below-fold images

3. Network Optimization:
   - API calls: Batch multiple KPIs into single request
   - Caching: Cache API responses for 5 min (localStorage)
   - Compression: GZIP all requests + responses

4. Runtime Performance:
   - Virtual scroll for tables (render only visible rows)
   - Debounce filter changes (300ms)
   - Memo expensive components
   - Web Workers for heavy calculations
```

### Navigation Pattern (Mobile)

```
Layout hierarchy on mobile:
1. Sticky header
   - Dashboard title
   - [Filters toggle] [Refresh] [Export] [Settings]

2. Scrollable content area
   - Filters (collapsed by default)
   - KPI cards (stack vertically)
   - Charts (full width, scroll vertically)
   - Data table (scrollable card view)

3. Floating action button (optional)
   - Quick actions: [Log call], [Add deal], [New task]
   - Appears on scroll down, hides on scroll up

4. Bottom tab navigation (if multi-dashboard)
   - [Overview] [Pipeline] [Leads] [Coaching]
   - Max 4-5 tabs, labels + icons
   - 44px height (touch-safe)
```

---

## API INTEGRATION REQUIREMENTS

### Endpoint Structure

```
GET /api/dashboard/sales-manager
  Returns:
    {
      kpis: { arrGrowth, pipeline, winRate, forecast },
      deals: [{ id, name, stage, amount, rep, lastActivity, confidence }],
      waterfall: [{ stage, value, dealCount }],
      topPerformers: [{ rep, deals, revenue }],
      lastUpdated: timestamp
    }

GET /api/dashboard/sales-manager/deals
  Query params: ?stage=propose&team=west&limit=20
  Returns: Paginated deal list with total count

GET /api/dashboard/executive
  Returns strategic KPIs + forecast + regional breakdown

GET /api/dashboard/finance
  Returns CAC, LTV, cohort retention, revenue composition

POST /api/dashboard/filters/save
  Body: { name, filterConfig }
  Creates named filter preset

POST /api/dashboard/export
  Body: { format: 'pdf' | 'csv', dashboardType, filters }
  Returns: S3 signed URL or file download
```

### Real-Time Updates (WebSocket)

```
For live call monitoring (AI Coach dashboard):
  subscribe('live-call', { callId })
  
  Receive updates:
    { type: 'transcription', text, speaker }
    { type: 'coaching-insight', insight, confidence }
    { type: 'call-ended', summary }

For real-time deal updates:
  subscribe('deal-updates', { dealId })
  
  Receive:
    { type: 'stage-changed', oldStage, newStage, timestamp }
    { type: 'activity-logged', activity, timestamp }
```

---

## TESTING CHECKLIST

### Unit Tests (Per Component)

```typescript
// KPICard.test.tsx
describe('KPICard', () => {
  it('renders KPI value correctly', () => {
    render(<KPICard value="$2.4M" ... />);
    expect(screen.getByText('$2.4M')).toBeInTheDocument();
  });
  
  it('shows trend with correct color', () => {
    const { container } = render(
      <KPICard trend={{ direction: 'up', percentage: 8 }} status="good" />
    );
    const trendElement = container.querySelector('.kpi-trend');
    expect(trendElement).toHaveStyle('color: var(--color-success)');
  });
  
  it('expands on click', () => {
    const onClick = jest.fn();
    render(<KPICard onClick={onClick} ... />);
    userEvent.click(screen.getByRole('button'));
    expect(onClick).toHaveBeenCalled();
  });
  
  it('passes accessibility checks', async () => {
    const { container } = render(<KPICard ... />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
  
  it('navigates via keyboard', () => {
    const onClick = jest.fn();
    render(<KPICard onClick={onClick} ... />);
    screen.getByRole('button').focus();
    userEvent.keyboard('{Enter}');
    expect(onClick).toHaveBeenCalled();
  });
});
```

### Integration Tests

```typescript
// Dashboard.integration.test.tsx
describe('Sales Manager Dashboard', () => {
  it('filters deals when clicking pipeline stage', async () => {
    render(<SalesManagerDashboard />);
    
    // Initial table shows all deals
    expect(screen.getAllByRole('row')).toHaveLength(5); // header + 4 deals
    
    // Click Propose stage
    userEvent.click(screen.getByText('Propose'));
    
    // Table filters to show only Propose stage deals
    await waitFor(() => {
      expect(screen.getAllByRole('row')).toHaveLength(3); // header + 2 deals
    });
  });
  
  it('exports to PDF', async () => {
    const { container } = render(<SalesManagerDashboard />);
    
    userEvent.click(screen.getByText('Export'));
    userEvent.click(screen.getByText('PDF'));
    
    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        '/api/dashboard/export',
        expect.objectContaining({ method: 'POST' })
      );
    });
  });
});
```

### Accessibility Tests (Automated + Manual)

```bash
# Automated (run in CI/CD)
npm run test:a11y

# Manual checklist
- [ ] Keyboard navigation: Tab through entire dashboard
- [ ] Screen reader: NVDA/JAWS reads all content correctly
- [ ] Color contrast: All text ≥4.5:1 (use WebAIM checker)
- [ ] Focus indicators: Visible 2px outline on all interactive elements
- [ ] Responsive: Test on 375px, 768px, 1024px widths
- [ ] Reduced motion: Animations disabled when `prefers-reduced-motion` is set
- [ ] Zoom: Test at 200% zoom (no layout breaks)
- [ ] Dark mode: Verify contrast in dark mode separately
```

### Performance Tests

```bash
# Lighthouse CI (run on PR)
npm run lighthouse:ci

# Targets:
# Performance: ≥90
# Accessibility: ≥95
# Best Practices: ≥90
# SEO: ≥90

# Core Web Vitals:
# FCP: <1.5s
# LCP: <2.5s
# CLS: <0.1
# TTI: <3.5s
```

---

## DEPLOYMENT & MONITORING

### Staged Rollout

```
Phase 1: Internal team only (50 users)
  - Monitor: Error rate, load times, user feedback
  - Duration: 3 days
  - Success: <1% error rate, positive NPS
  
Phase 2: Pilot customers (500 users)
  - Monitor: Same + feature usage
  - Duration: 1 week
  - Success: 75%+ adoption, no critical issues
  
Phase 3: Full rollout (all users)
  - Monitor: All metrics
  - Have rollback plan ready (revert to v1)
  - Ongoing: Daily monitoring for 2 weeks
```

### Key Metrics to Monitor

```
Performance:
  - FCP, LCP, CLS (Core Web Vitals)
  - API response time (target: <500ms)
  - Error rate (target: <0.5%)
  - Crash rate (target: <0.1%)

Usage:
  - Dashboard views per user per day (target: >2)
  - Feature adoption rate (filters, export, drill-down)
  - Time on dashboard (should increase vs old dashboard)
  - Mobile vs desktop usage ratio

Business:
  - Forecast accuracy (should improve)
  - Deal velocity (time in stage, should decrease)
  - Rep activity logging (should increase)
```

---

## HANDOFF TO DEV TEAM

**Deliverables from Design:**
1. ✅ Figma file with all 5 dashboard designs (interactive prototype)
2. ✅ Design system (colors, typography, components in Figma)
3. ✅ Wireframes (ASCII in this document)
4. ✅ Interaction specifications (click, hover, keyboard behavior)
5. ✅ Accessibility checklist (WCAG 2.1 AA compliance)
6. ✅ Component specifications (sizing, spacing, responsive breakpoints)

**Dev Implementation:**
1. [ ] Create component library (React)
2. [ ] Wire up API endpoints
3. [ ] Implement real-time updates (WebSocket)
4. [ ] Add authentication/authorization
5. [ ] Set up monitoring & analytics
6. [ ] Performance optimization
7. [ ] QA & testing
8. [ ] Deployment & rollout

**Timeline:**
- Week 1-4: Phase 1 (Sales Manager + Executive dashboards)
- Week 5-8: Phase 2 (Rep + Finance dashboards)
- Week 9-12: Phase 3 (AI Coach + Coaching)
- Week 13-16: Phase 4 (Optimization, mobile-first refactor)

**Success Criteria (End of Phase 1):**
- [ ] 2 dashboards live (Sales Manager, Executive)
- [ ] WCAG 2.1 AA compliance verified
- [ ] Mobile responsive (375px - 1440px)
- [ ] <1.5s FCP, <0.1 CLS
- [ ] 75%+ team adoption
- [ ] <5% error rate
- [ ] All core features functional
