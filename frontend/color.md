---
name: Velvet Aurum
colors:
  surface: '#121316'
  surface-dim: '#121316'
  surface-bright: '#38393d'
  surface-container-lowest: '#0d0e11'
  surface-container-low: '#1b1b1f'
  surface-container: '#1f1f23'
  surface-container-high: '#292a2d'
  surface-container-highest: '#343538'
  on-surface: '#e3e2e6'
  on-surface-variant: '#d0c5b4'
  inverse-surface: '#e3e2e6'
  inverse-on-surface: '#2f3034'
  outline: '#999080'
  outline-variant: '#4d4639'
  surface-tint: '#e4c277'
  primary: '#ffe09d'
  on-primary: '#3f2e00'
  primary-container: '#e5c378'
  on-primary-container: '#684f0f'
  inverse-primary: '#745b1a'
  secondary: '#e9c349'
  on-secondary: '#3c2f00'
  secondary-container: '#af8d11'
  on-secondary-container: '#342800'
  tertiary: '#d8e4f6'
  on-tertiary: '#26313f'
  tertiary-container: '#bcc8da'
  on-tertiary-container: '#485463'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#ffdf9b'
  primary-fixed-dim: '#e4c277'
  on-primary-fixed: '#251a00'
  on-primary-fixed-variant: '#5a4302'
  secondary-fixed: '#ffe088'
  secondary-fixed-dim: '#e9c349'
  on-secondary-fixed: '#241a00'
  on-secondary-fixed-variant: '#574500'
  tertiary-fixed: '#d7e3f6'
  tertiary-fixed-dim: '#bbc7d9'
  on-tertiary-fixed: '#101c29'
  on-tertiary-fixed-variant: '#3c4856'
  background: '#121316'
  on-background: '#e3e2e6'
  surface-variant: '#343538'
typography:
  display-lg:
    fontFamily: Inter
    fontSize: 48px
    fontWeight: '300'
    lineHeight: 56px
    letterSpacing: -0.025em
  display-md:
    fontFamily: Inter
    fontSize: 36px
    fontWeight: '400'
    lineHeight: 44px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Inter
    fontSize: 28px
    fontWeight: '400'
    lineHeight: 36px
    letterSpacing: -0.015em
  headline-md:
    fontFamily: Inter
    fontSize: 22px
    fontWeight: '500'
    lineHeight: 30px
    letterSpacing: -0.01em
  headline-sm:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '500'
    lineHeight: 26px
    letterSpacing: -0.005em
  body-lg:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
    letterSpacing: 0em
  body-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 22px
    letterSpacing: 0em
  body-sm:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '400'
    lineHeight: 18px
    letterSpacing: 0.01em
  label-lg:
    fontFamily: Inter
    fontSize: 13px
    fontWeight: '500'
    lineHeight: 18px
    letterSpacing: 0.02em
  label-md:
    fontFamily: Inter
    fontSize: 11px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.06em
  label-caps:
    fontFamily: Inter
    fontSize: 10px
    fontWeight: '600'
    lineHeight: 14px
    letterSpacing: 0.12em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  gutter: 1.5rem
  gutter-tablet: 1rem
  margin: 3rem
  margin-tablet: 1.5rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 1rem
  space-lg: 1.5rem
  space-xl: 2.5rem
---

## Brand & Style

This design system targets high-net-worth individuals, wealth managers, and discerning connoisseurs who operate in elite fintech, private asset stewardship, and haute-horlogerie digital spaces. The aesthetic communicates poise, precision, and sovereign calm. It avoids gratuitous ornament, relying instead on optical depth, pristine micro-details, and expansive breathing room to project silent authority.

The core visual style is an architectural fusion of **Minimalism** and **Refined Glassmorphism**. Elements appear suspended in deep void space over obsidian depths, rendered with optical micro-textures, ultra-subtle champagne refraction, and delicate hairline edges that catch light like diamond-cut sapphire crystal. Every interaction prioritizes effortless scanning, fluid transitions, and visual serenity.

## Colors

The palette is rooted in an abyss of warm-tinted obsidian blacks, punctuated by luminous champagne golds that serve strictly as intentional focal points.

- **Canvas & Backdrops:** `#08090C` serves as the primary canvas root, paired with `#0F1115` for subtle planar shifts and base layer divisions.
- **Glass Fill Layers:** Surfaces use translucent white washes ranging from `rgba(255, 255, 255, 0.025)` for base cards up to `rgba(255, 255, 255, 0.07)` for active or interactive overlays.
- **Champagne Accents:** `#E5C378` acts as the primary interactive light source and high-emphasis metric value, while `#D4AF37` grounds secondary accents, subtle glows, and active indicators.
- **Micro-Hairlines:** Structural borders leverage `rgba(255, 255, 255, 0.08)` for neutral containment and `rgba(212, 175, 55, 0.3)` for focused or premium states.
- **Text & Content Hierarchy:** High-emphasis copy utilizes `#F5F6F8` (optical white), mid-level copy uses `#9BA1AB`, and muted metadata rests at `#5A606B`.

## Typography

Typographic execution relies exclusively on **Inter**, tuned to showcase pristine technical balance and neutral elegance.

- **Weight Discipline:** Display titles leverage light (`300`) and regular (`400`) weights to convey airiness and restraint, preventing large text from overwhelming translucent surfaces.
- **Tabular Numerals:** For balances, time-series telemetry, and financial statistics, activate the `tnum` (tabular figures) OpenType feature.
- **Labels & Microcopy:** `label-caps` is reserved for metadata labels, card tags, and status trackers, styled in uppercase with tracking between `+0.06em` and `+0.12em` to guarantee sharp optical delineation at micro scales.

## Layout & Spacing

The layout embraces high-order spatial composition, favoring generous margins and distinct separation over dense packing.

- **Grid Architecture:** Desktop views employ a 12-column fluid grid framed within a maximum container width of `1600px`. Tablet viewports (`768px` to `1024px`) consolidate to an 8-column layout with reduced gutters (`1rem`) and outer canvas margins (`1.5rem`).
- **Vertical Flow:** Section-level spacing requires a minimum of `2.5rem` to `4rem` separation to reinforce the feeling of an exclusive gallery.
- **Micro Rhythm:** All spatial gaps between nested content items adhere strictly to a `4px` base step: `space-xs` (4px), `space-sm` (8px), `space-md` (16px), `space-lg` (24px), and `space-xl` (40px).

## Elevation & Depth

Depth is established through translucent stacking, controlled background diffusion, and chromatic aura glows rather than opaque drop shadows.

- **Atmospheric Aura Backdrops:** Soft, localized radial gradients in deep champagne (`rgba(212, 175, 55, 0.04)`) and pale slate (`rgba(110, 122, 138, 0.03)`) are anchored behind key focal regions with blurs between `80px` and `140px`.
- **Glass Surface Profiles:**
  - *Tier 0 (Base Plate):* Pure `#08090C` with optional micro-mesh grain.
  - *Tier 1 (Persistent Containers & Panels):* Fill `rgba(255, 255, 255, 0.03)`, `backdrop-filter: blur(24px) saturate(180%)`, border `1px solid rgba(255, 255, 255, 0.07)`.
  - *Tier 2 (Floating Modals, Flyouts, Popovers):* Fill `rgba(15, 17, 21, 0.75)`, `backdrop-filter: blur(32px)`, border `1px solid rgba(212, 175, 55, 0.25)`, soft ambient shadow `0 24px 48px -12px rgba(0, 0, 0, 0.65)`.
- **Specular Hairlines:** Interactive elements use an inner light catch: a top inner shadow `inset 0 1px 0 0 rgba(255, 255, 255, 0.12)` paired with a soft perimeter edge.

## Shapes

The design system employs a refined radius scale (`roundedness: 2`), balancing structured geometric precision with organic softness.

- **Base Components:** Standard inputs, buttons, chips, and small interactive items carry an `8px` (`0.5rem`) radius.
- **Glass Panels & Cards:** Structural containers adopt a `16px` (`1rem`, `rounded-lg`) corner curvature.
- **Overlays & Dialogs:** Large elevated sheets, modals, and spotlight modules expand to `24px` (`1.5rem`, `rounded-xl`).
- **Continuous Edge Integrity:** Child elements nested against the inner perimeter of a parent card must scale down their radii to match the concentric boundary formula: `R_inner = R_outer - Padding`.

## Components

### Buttons
- **Primary Luxury:** Surface fill of linear gradient (`135deg, #E5C378, #D4AF37`), sharp `#08090C` typography, no border, subtle champagne glow on hover (`0 0 20px rgba(229, 195, 120, 0.35)`).
- **Secondary Glass:** Translucent fill `rgba(255, 255, 255, 0.04)`, hairline border `rgba(255, 255, 255, 0.12)`, text `#F5F6F8`. Hover scales border to `rgba(212, 175, 55, 0.4)` and fill to `rgba(255, 255, 255, 0.08)`.
- **Ghost/Minimal:** Transparent fill, text `#9BA1AB`, transitioning to `#E5C378` on pointer-enter with zero horizontal shift.

### Input Fields
- Dark crystalline trough styling: `rgba(8, 9, 12, 0.6)` inner fill, bordered by `1px solid rgba(255, 255, 255, 0.08)`.
- Focus state: Border transitions to `rgba(212, 175, 55, 0.5)` with an ambient champagne outer halo (`0 0 0 3px rgba(212, 175, 55, 0.1)`). Placeholder copy is muted (`#5A606B`).

### Cards & Panels
- Constructed using Tier 1 frosted glass with an asymmetric top-border highlight (`inset 0 1px 0 0 rgba(255, 255, 255, 0.15)`).
- Hover states on interactive cards smoothly transition the hairline border from neutral white-alpha to `rgba(212, 175, 55, 0.35)`.

### Chips & Badges
- Pill-curved compact markers (`12px` vertical padding, uppercase `label-caps` typography).
- Fill `rgba(255, 255, 255, 0.03)`, hairline border `rgba(255, 255, 255, 0.08)`. Active/Selected chips feature a soft gold wash `rgba(212, 175, 55, 0.1)` with gold hairline border `rgba(212, 175, 55, 0.4)`.

### Checkboxes & Radios
- Box/Circle dimensions: `18px × 18px` with `1px` border in `rgba(255, 255, 255, 0.2)`.
- Selected: Solid champagne background (`#D4AF37`) with obsidian checkmark icon or center dot, accompanied by an ultra-subtle golden radiance blur.

### Lists & Row Items
- Separated by hairline dividers (`1px solid rgba(255, 255, 255, 0.04)`).
- Hover state applies a soft, edge-to-edge ambient glass wash (`rgba(255, 255, 255, 0.02)` to `rgba(255, 255, 255, 0.04)`) with effortless 150ms ease-out timing.

## Light Mode — "Aurum Paper"

A warm-paper companion to the obsidian dark theme, selected via Settings → Appearance → Theme. Same hue families, lightness remapped for ivory surfaces. Implemented as an `html.light` variable flip in `globals.css` (accent presets ship matching light maps in `src/lib/themes.ts`).

- **Canvas & Surfaces:** background `#F4EFE4`, surface `#FAF7EF`, containers stepping `#FFFFFF → #F6F1E5 → #EFE8D6 → #E6DCC4 → #D8CBAE`. Ink: on-surface `#241D10` (deep espresso), variant `#6B5F45`.
- **Accents deepen for contrast:** primary becomes readable bronze `#7A5A08` (on-primary warm white `#FFFDF3`), containers stay champagne washes (`#E8C877` + `#4A3605` ink). Secondary `#8A6A0C`. Tertiary flips to slate blue `#3F5A80` with white ink.
- **Shader backdrops** (dark WebGL canvases) drop to 16% opacity in light mode — a faint texture, never mud.
- **Rule:** every accent token must pass 4.5:1 body-text contrast on its container in BOTH modes; container fills may stay shared, but `primary`/`secondary` text colors must be mode-specific.
