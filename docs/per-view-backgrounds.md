# Per-view persistent backgrounds — research & design (no implementation yet)

Goal: user picks a background for a **view (pane/leaf)**, not a file. The
choice stays with that pane when the file changes, when the pane is
docked/split/dragged, and across restarts. Selection = 5 neon rainbow
presets + the current cat image as default + two signature colors
(#FA9C1C primary, #33D3AD secondary).

## 1. Can it be done with CSS alone? No.

| CSS-only approach        | Why it fails the requirement                    |
| ------------------------ | ----------------------------------------------- |
| `.workspace-leaf.mod-active` | Styles only the *focused* pane; follows focus, not the view |
| `:nth-child()` selectors | Position-keyed; breaks on split/drag/reorder; no UI |
| `cssclasses` frontmatter | File-keyed — background follows the *file*, opposite of the spec |
| Style Settings plugin    | Global/theme-level variables, no per-leaf state |

CSS has no storage, no selection UI, and no event hooks. A persistent
per-view choice needs state + UI + lifecycle handling → JavaScript.

## 2. JavaScript in Obsidian = a plugin (the only sanctioned route)

- Obsidian is Electron; user JS runs exclusively through the Community
  Plugins mechanism. CSS snippets cannot run JS. DevTools-console
  injection is ephemeral (lost on reload) and unsupported.
- A plugin can be **plain JavaScript** — `main.js` (CommonJS,
  `require('obsidian')`), no TypeScript/build step needed for v1.
  Estimate: ~200–300 lines.
- Recommended shape: a small **companion plugin** ("SILVER Views") next
  to the theme. Theme stays pure CSS (community-directory compliant);
  plugin owns state/UI, theme owns appearance via CSS hooks.

## 3. Verified API facts (docs.obsidian.md + obsidian-typings + local vault)

- `WorkspaceLeaf.id` — stable unique identifier (inherited from
  WorkspaceItem). **Verified in this vault's workspace.json**: the layout
  tree serializes split/tabs/leaf ids, and `active` references a leaf id.
  → ids survive restarts; keying settings by leaf id is sound.
- `WorkspaceLeaf.containerEl` (HTMLDivElement) — the pane's DOM node.
  Styling it (class + inline CSS variable) automatically survives file
  swaps: the view is replaced *inside* the leaf; the leaf node persists.
- `leaf.tabHeaderEl`, `tabHeaderInnerTitleEl` — available if we want a
  colored tab indicator per pane.
- `Workspace.iterateAllLeaves(cb)`, `getLeafById(id)`, `onLayoutReady(cb)`.
- Events: `workspace.on('layout-change')` (splits/drags/close),
  `'active-leaf-change'`, `'file-open'`, `'window-open'` (popouts).
  `leaf.on('history-change')` fires on in-leaf navigation (not needed
  for persistence, useful for debugging).
- `View.onPaneMenu(menu, source)` — hook into the pane's right-click /
  more-options menu (`source: 'more-options' | 'tab-header'`). Natural
  home for "Set view background…".
- `SuggestModal` / `FuzzySuggestModal`, `Modal`, `ColorComponent`
  (native color picker), `Menu`, `Notice` — all the UI pieces exist.
- `Plugin.loadData()/saveData()` — JSON persistence in the plugin folder.
- Edge cases: popout windows (`WorkspaceWindow`, `'window-open'`;
  inline styles travel with the element, theme CSS is injected into
  popouts by Obsidian); deferred leaves (`loadIfDeferred`, 1.7.2+ —
  containerEl may not exist until loaded; re-apply on layout-change).

## 4. Prior art (none matches the spec exactly)

- **Background** (community directory, archived): per-*region* wallpapers
  (editor/left/right/terminal) + per-tab opacity sliders. Region-keyed,
  not leaf-keyed; archived.
- **xp-anderson/obsidian-background** (archived Apr 2026): per-*note*
  background image — file-keyed, fails the persistence requirement.
- **shmolf/obsidian-editor-background**: global image + opacity +
  contrast backdrop; whole-window or per-pane copies of one image.
- **Wallvia**: vault image as global workspace background, glass blur,
  adaptive dim. Global.
- **Dynamic Wallpapers**: per-note via frontmatter. File-keyed.
- **Longform**: attaches `.longform-leaf` class to project panes —
  validates the plugin-sets-class-on-leaf pattern we'd use.
- Forum consensus ("Give different panes different colors"): only
  active-pane CSS, cssclasses, or nth-selector hacks exist → gap confirmed.

## 5. Proposed architecture — "SILVER Views" companion plugin

### State & persistence
```
data.json: { "version": 1, "leaves": { "<leafId>": "<presetKey>" } }
```
- Apply = `leaf.containerEl.classList.add('silver-view-tinted')` +
  `containerEl.style.setProperty('--silver-view-hue', '<hex>')`.
- Re-apply to all leaves on `onLayoutReady` and `layout-change`
  (covers restart, split, drag, new/closed panes).
- New leaves → default. Orphaned ids (closed panes) pruned on
  layout-change (or kept harmlessly).
- File changes: nothing to do — the leaf node persists, the tint stays.

### Presets (8)
| Key              | Value     | Source                    |
| ---------------- | --------- | ------------------------- |
| `default`        | —         | cat image shows through (no override) |
| `neon-violet`    | `#b366ff` | existing `--neon-violet`  |
| `neon-blue`      | `#4da6ff` | existing `--neon-blue`    |
| `neon-green`     | `#3dff9e` | existing `--neon-green`   |
| `neon-yellow`    | `#ffd93d` | existing `--neon-yellow`  |
| `neon-red`       | `#ff4d4d` | existing `--neon-red`     |
| `silver-primary` | `#FA9C1C` | new signature token       |
| `silver-secondary`| `#33D3AD`| new signature token (old Cyber Glow accent) |

### Selection UI
- Pane menu (right-click tab header / ⋯ menu): "Set view background…"
  → SuggestModal with 8 swatch rows.
- Command palette: "SILVER Views: Set background for active view".
- Command: "SILVER Views: Reset all view backgrounds".
- Later (v2): custom ColorComponent picker, per-leaf image picker,
  per-leaf intensity slider.

### Theme CSS hook (one new section in theme.css)
```
body.theme-dark .app-container .workspace .workspace-leaf.silver-view-tinted {
    background-color: color-mix(in srgb, var(--silver-view-hue) 12%, transparent);
    box-shadow: inset 0 0 60px color-mix(in srgb, var(--silver-view-hue) 18%, transparent);
}
```
- Specificity (0,6,1) beats the per-zone transparency rule (0,5,1).
- Same visual language as the neon heading plates: tinted panel + inset
  bloom, sharp corners, silver text stays readable.
- `default` = no class → global cat background shows through unchanged.
- Optional: tint the pane's tab header underline with the same hue so
  stacked tabs are identifiable (plugin sets `--silver-view-hue` on
  `tabHeaderEl` too; theme rule for the indicator).

### Scope (v1)
- Main display zone only (root-split leaves): check
  `leaf.getRoot()` container / `containerEl.closest('.mod-root')`.
  Sidebars keep the global background, per the current design.
- Desktop first; mobile drawers differ (note for v2).

### Installation & distribution
- Personal use: `.obsidian/plugins/silver-views/` with `manifest.json`,
  `main.js` (+ optional `styles.css`). Enable in Community Plugins.
- Repo layout: `plugin/` subfolder (or separate repo) alongside the
  theme; theme directory submission stays CSS-only. BRAT install path
  possible later.

## 6. Design decisions (confirmed by user)

1. **Preset intensity**: subtle tint + edge bloom — readable, matches
   the neon heading plates (12% tint, inset 60px bloom at 18%).
2. **Tab indicator**: YES — tint the pane's tab header with the chosen
   hue so tinted panes stay identifiable in stacked tabs.
3. **v1 surface**: presets only (8 choices). Custom color picker and
   per-leaf image picker deferred to v2.
4. **Scope**: main display zone only (root-split leaves). Sidebars keep
   the global cat background.

## 7. Risks & mitigations

- Obsidian API drift: stick to long-stable surface (leaf id/containerEl
  since 0.9.7; layout-change since 0.9.20). Avoid undocumented internals.
- Deferred leaves: re-apply on layout-change + active-leaf-change;
  optionally `loadIfDeferred` before styling.
- Popouts: covered by iterateAllLeaves + window-open; verify visually.
- Plugin disabled/uninstalled: tints vanish (inline vars remain but no
  class re-application) — theme alone still renders the default look.
- Performance: styling happens only on layout events, not per keystroke;
  no MutationObserver needed.
