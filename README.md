# SILVER

A dark, monochrome theme for [Obsidian](https://obsidian.md).

Graphite chassis, silver hairlines, bright-silver interaction points. Every
corner is square. There is no hue anywhere in the interface — emphasis comes
from brightness, weight, and 1px rules, like an instrument panel.

> Status: **0.1.0 — design draft.** Dark mode only.

## Design language

- **Monochrome silver.** A twelve-step neutral scale from `#131313` (editor
  background) to `#e8e8e8` (bright silver). The accent is brighter silver,
  never a color. Text on accent is near-black `#141414`.
- **Sharp geometry.** All radii are `0px` — tabs, tags, callouts, checkboxes,
  toggles, modals, scrollbars. Icons use square stroke caps.
- **Hairlines.** Borders and dividers are 1px translucent white (8–18%),
  so layering reads as brushed metal rather than boxes.
- **Signature details.**
  - Bright-silver 2px indicator on the active tab (top) and active file (left).
  - Silver highlighter: `==highlights==` invert to solid silver with dark ink.
  - Brushed-metal gradient on primary (CTA) buttons.
  - Uppercase, letter-spaced vault name and callout titles.
  - Neon negative-space H1: dark cut-out glyphs inside a stacked silver
    halo (ported from Cyber Glow's header glow), centered; faint silver
    echo on H2–H6. Square list bullets.
  - Monochrome syntax highlighting: keywords bold-bright, strings and
    comments italic-dim, functions pure white.
  - Inverted silver tooltips and notices; tabular numerals in the status bar.

## Palette

| Role            | Value                          |
| --------------- | ------------------------------ |
| Editor bg       | `#131313`                      |
| Sidebar bg      | `#171717`                      |
| Chrome bg       | `#101010` (titlebar, ribbon, status bar) |
| Text            | `#c6c6c6`                      |
| Muted / faint   | `#8f8f8f` / `#616161`          |
| Accent (silver) | `#e6e6e6`, hover `#f2f2f2`     |
| On-accent ink   | `#141414`                      |
| Hairline        | `rgb(255 255 255 / 10%)`       |

## Preview in this vault

This repository lives inside the vault at `.obsidian/themes/SILVER`, so
Obsidian picks it up directly:

1. Settings → Appearance → Themes → select **SILVER**.
2. Make sure the base mode is **Dark** (SILVER is dark-only).
3. Leave the accent color unset so the theme's silver accent applies.

If Obsidian was open while the files changed, reload with `Ctrl+R`
(`Cmd+R` on macOS).

## Development

All styles live in `theme.css`, organized in commented sections: geometry,
palette, text & accent, typography, editor, code, tags/tasks/callouts/tables,
workspace chrome, components, graph & canvas, signature details.

The theme is built against Obsidian's CSS variable system (verified against
the app's own `app.css`), so it tracks app updates instead of fighting them.
No `!important`, no external assets, no `:has()`.

```bash
npm install     # once
npm run lint    # stylelint with stylelint-config-obsidianmd (the community review rules)
```

## Releasing

Pushing a tag that matches `manifest.json`'s version triggers the GitHub
Actions release workflow, which drafts a release with `manifest.json` and
`theme.css` attached. Keep `versions.json` in sync (theme version → minimum
Obsidian version). A `screenshots/screenshot.png` (16:9, 512×288 recommended)
is required before community-directory submission.

See the official [Build a theme](https://docs.obsidian.md/Themes/App+themes/Build+a+theme)
and [Submit your theme](https://docs.obsidian.md/Themes/App+themes/Submit+your+theme) guides.

## License

ISC — see [LICENSE](LICENSE).
