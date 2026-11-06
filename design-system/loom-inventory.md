# Loom Design System: quick inventory

Quick reference for agents. It was built read-only through the Figma MCP (create_session, get_libraries, get_metadata, search_design_system) on 2026-11-05. It is a hint, not the source of truth: always confirm with `search_design_system` before building, because the library updates.

- File: https://www.figma.com/design/mDz2h34YO140uGbhVl27kA/Loom-Design-System
- fileKey: `mDz2h34YO140uGbhVl27kA` (READ ONLY. Never modify.)
- Library name: Loom Design System. Library key (for `includeLibraryKeys`):
  `lk-8ce8cc97958457ade8950d9955b0c0f39a6dd52cf8fa86a1476c72a3b28d75ca18421e3795c336530a4534dac23dddfbe955806681846d5af2e430c395af9600`
- Components follow shadcn (Nova preset) and Blade conventions. Icons are Remix icons, published as components named `icon/<name>`.
- The Loom file also subscribes to community libraries (Material 3, iOS, etc.). Do NOT use them. Scope searches to the Loom library key.

Coverage note: pages and component names below are complete (from get_metadata). Variable lists come from targeted searches (each search returns about 14 hits), so the numeric scales are the values seen, not a guaranteed full dump. Re-run `search_design_system` if you need a specific token.

## Pages in the Loom file

Cover, Index, then Foundations: Typography, Colors, Icons, Layout, Object Styles, Motion, Tokens, Naming Convention, Utilities. Then one page per component (below), a `Demo` page, and a legacy page `Input (legacy, content moved, safe to delete)`. Ignore the legacy page and the legacy `Input` component; use `Text Input`.

## Components (one page each)

Names are the component or component-set names to search for. Properties are from the component descriptions.

| Area | Component | Key properties / notes |
|---|---|---|
| Actions | **Button** | variant Primary / Secondary / Tertiary / Ghost / Link; color Primary / White / Positive / Negative; state; isDisabled; isLoading; size XSmall 28 / Small 32 / Medium 36 / Large 48; isFullWidth; iconOnly. Filled buttons use effect `button/raised`. |
| | **Button Group** | variant primary / secondary / tertiary; size small / medium / large; buttons 2 or 3. |
| | **Link** | variant anchor / button; color primary / neutral; optional leading and trailing icon. |
| | Action List, Action List Item | Dark inverted menu content and its rows. |
| Navigation | **Top Nav**, Top Nav Item | screenSize desktop / mobile; item state default / hover / active / focus. |
| | **Side Nav**, Side Nav Item, Side Nav Sub Item | state expanded 256px / collapsed 48px rail; item state default / hover / active / focus. |
| | **Bottom Nav** | items 4 or 5, mobile. |
| | **Tabs**, Tab Item | variant filled / bordered / borderless; size; orientation. |
| | **Breadcrumb**, **Pagination**, Pagination Item, **Stepper** | Pagination: Numbers / Compact / With details. |
| | **Menu**, **Drawer** (+ Drawer Header), **Bottom Sheet** (+ header, grab handle) | Bottom Sheet replaces Modal and Dropdown on mobile. |
| Containers | **Card** | shadcn Card: header (title, description, action), content, optional footer. Card spacing 16px (sm 12px). |
| | **KPI Card**, Stat Card | KPI Card: Label, Value, Change badge, Trend Up / Down. |
| | **Accordion**, **Collapsible**, **Modal**, **Popover**, **Spotlight Popover**, **Tooltip**, **Carousel** | Modal sizes small 400 / medium 560 / large 760. |
| | **Divider** | orientation; variant normal / subtle; thickness thin / thick; style solid / dashed. |
| | **List**, **Info Group**, **Empty State** | Empty State: Default / Compact / Dashed. |
| Data | **Table**, Table Row, Table Header Row | Toolbar, header row, body rows, optional summary and pagination footer; screenSize Desktop / Mobile (list view on mobile). |
| | **Charts** (Chart Legend Item, Chart Tooltip), **Amount**, **Counter**, **Progress Bar**, **Indicator** | Chart colors use `chart/*` variables. |
| Status | **Badge** (two sets exist: the Blade one with color x emphasis x size, and a shadcn one, variant outline / secondary), **Tag** (removable), **Chip**, **Alert**, **Toast**, **Spinner**, **Skeleton Loader**, Skeleton Pattern, **Avatar** | Alert: color Neutral / Negative / Positive / Notice / Information x emphasis Subtle / Intense. Badge is read-only status; Tag and Chip are interactive. |
| Forms | **Text Input**, **Password Input**, **OTP Input**, **Textarea**, **Select**, **Combobox**, **Search Input**, **Phone Number Input**, **Date Picker** (+ Calendar), **File Upload** | Sizes Small 32 / Medium 36 / Large 48. Border 1px `line/border`, hover `line/input`, focus 1.5px `action/primary`, error 1.5px `feedback/negative/foreground`. |
| | **Checkbox** (two sets exist; prefer the one with label and help text), **Radio**, **Switch** | size x checked x state. |
| Icons | `icon/<name>` | Remix line icons, for example `icon/more`, `icon/alert`, `icon/robot`. |

Gaps worth knowing: there is no dedicated page header, stat strip, filter bar or wizard component. Compose these from Card, Tabs, Button Group, Tag, Chip, Stepper and Divider, and report it as a "Library gap" in the rationale.

## Variable collections

Naming formula: `category/variant/property` inside a collection that sets scope and modes. Rules from the Naming Convention page: bind semantic tokens, never primitives; mirror Tailwind or shadcn names; `_` stands for a decimal point (`spacing/2_5`); every fill has a `-foreground` partner; kebab-case with slash groups.

| Collection | Modes | Count | Published | Purpose |
|---|---|---|---|---|
| `global-tokens` | Value | 114 | Hidden | Raw colours and sizes. Never bind these in designs. |
| `theme` | Light, Dark | 59 | Yes | Semantic colours. Set Light or Dark per frame. |
| `foundation` | Value | 86 | Yes | Spacing, radius, stroke, opacity, icon size, typography, motion, containers. |
| `size` | Desktop, Mobile | 26 | Yes | Control dimensions by density (height, padding, gap, radius, font size). |
| `layout` | Mobile, Tablet, Desktop | 5 | Yes | Breakpoints, frame widths, grid columns, gutters, margins. |
| `_docs` | Value | 9 | Hidden | Documentation-only colours. Ignore. |

Chain: `global-tokens` -> `theme`, `foundation` -> `size`, `layout` -> components.

### theme (colour, Light / Dark)

- `surface/background`, `surface/foreground`, `surface/card`, `surface/card-foreground`, `surface/popover`, `surface/popover-foreground`, `surface/popover-translucent`
- `action/primary`, `action/primary-foreground`, `action/primary-hover`, `action/primary-subtle`, `action/secondary`, `action/secondary-hover`, `action/accent`, `action/accent-foreground`, `action/destructive`, `action/destructive-subtle`, `action/link`, `action/white`, `action/white-foreground`, `action/white-subtle`, `action/white-border`
- `content/muted`, `content/muted-subtle`, `content/muted-foreground`
- `line/border`, `line/input`, `line/ring`, `line/ring-focus`
- `feedback/<intent>/<property>` where intent is `positive`, `negative`, `notice`, `information` or `neutral`, and property is `background-subtle`, `background-intense`, `foreground`, `foreground-intense` or `border`. Example: `feedback/negative/background-subtle`.
- `chart/1` to `chart/5`, and `chart/categorical/{red,blue,gold,green,purple}`
- `sidebar/{background,foreground,primary,primary-foreground,accent,accent-foreground,border,ring}`

### foundation (Value)

- Spacing (scope GAP): `spacing/0`, `0_5`, `1` to `9`, `2_5`, `12`, `14`, `16` (maps to Tailwind: `spacing/4` = 16px, `p-4`)
- Radius: `radius/none`, `sm`, `md`, `lg`, `xl`, `2xl`, `3xl`, `4xl`, `full`
- Font family: `font/sans`, `font/mono`, `font/heading`
- Font size: `font-size/xs`, `sm`, `base`, `lg`, `xl`, `2xl`, `3xl`, `4xl`
- Font weight: `font-weight/normal`, `medium`, `semibold`, `bold`
- Line height: `line-height/4` to `line-height/10`
- Border width: `border-width/0`, `1`, `1-5`, `2`, `4`; focus ring `ring-width/focus`
- Icon size: `icon-size/xs`, `sm`, `md`, `lg`, `xl`
- Containers: `container/default`, `narrow`, `sidebar`, `inset-gap`; grid gaps: `grid-gap/default`, `spacious`, `condensed`
- Motion: `motion/easing/*` (for example `linear`) and `motion` durations

### size (Desktop / Mobile)

- `control/{xs,sm,md,lg}/{height,gap,icon-size,radius,font-size}`
- `button/{xs,sm,md,lg}/{height,gap,radius,font-size,line-height}` (Button heights 28 / 32 / 36 / 48)
- `input/{sm,md,lg}/{height,gap,radius,font-size}` (Input heights 32 / 36 / 48)

### layout

`frame/width`, `breakpoint/min-width`, plus grid columns, gutter and margin. Use the mode (Mobile / Tablet / Desktop) that matches the frame.

## Text styles

- Headings: `heading/h1` (text-4xl), `heading/h2` (3xl), `heading/h3` (2xl), `heading/h4` (xl), `heading/card-title`, `heading/card-title-sm`
- Body: `body/lead` (xl), `body/large` (lg semibold), `body/base` (long-form), `body/base-medium` (page titles in headers), `body/sm` (default UI text), `body/sm-medium`, `body/xs` (captions, helper text)
- UI: `ui/label`, `ui/button-xs`, `ui/button-sm`, `ui/button-md`

## Effect styles

`elevation/low` (inputs, outline buttons), `elevation/low-raised` (cards, tabs), `elevation/mid-raised` (dropdowns, popovers), `elevation/high-raised` (dialogs, sheets, toasts), `elevation/overlay` (command palette), `elevation/max` (hero, marketing), `elevation/inset` (pressed wells). Buttons carry their own `button/raised` and `button/outline` styles.

## Quick rules for variants

1. Page chrome: Top Nav or Side Nav instance; content in Cards on `surface/background`.
2. Primary action: one `Button` (variant Primary, color Primary) per view region.
3. Status: `Badge` or `Alert` with feedback colours; never raw red or green.
4. Spacing between regions from `grid-gap/*` or `spacing/*`; padding from `spacing/*`; never a bare number.
5. Pair every fill with its foreground (`action/primary` with `action/primary-foreground`, `surface/card` with `surface/card-foreground`).
