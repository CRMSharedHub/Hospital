# Windsurf Scrollbar Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make Windsurf sidebar and editor scrollbars persistently visible and easier to see while preserving the selected theme.

**Architecture:** Update the global Windsurf JSON settings file only. Existing scrollbar visibility values remain enabled; a `workbench.colorCustomizations` object supplies distinct default, hover, and active thumb colors.

**Tech Stack:** Windsurf user configuration JSON.

## Global Constraints

- Preserve `workbench.colorTheme` as `Everforest Night Light Soft`.
- Keep `editor.scrollbar.vertical` and `editor.scrollbar.horizontal` set to `visible`.
- Do not modify project source files or extension settings.
- Keep `C:\Users\User\AppData\Roaming\Windsurf\User\settings.json` valid JSON.

---

### Task 1: Configure persistent, high-contrast scrollbars

**Files:**
- Modify: `C:\Users\User\AppData\Roaming\Windsurf\User\settings.json:1-21`
- Test: `C:\Users\User\AppData\Roaming\Windsurf\User\settings.json`

**Interfaces:**
- Consumes: Windsurf `workbench.colorCustomizations` settings.
- Produces: Visible vertical and horizontal scrollbars with distinct idle, hover, and active thumb colors.

- [ ] **Step 1: Confirm the existing visibility settings**

Read `C:\Users\User\AppData\Roaming\Windsurf\User\settings.json` and confirm it contains:

```json
"editor.scrollbar.vertical": "visible",
"editor.scrollbar.horizontal": "visible"
```

Expected: Both values are `visible`.

- [ ] **Step 2: Add scrollbar color customizations**

Insert this top-level property after the horizontal scrollbar setting:

```json
"workbench.colorCustomizations": {
  "scrollbarSlider.background": "#808080B3",
  "scrollbarSlider.hoverBackground": "#A8A8A8CC",
  "scrollbarSlider.activeBackground": "#D0D0D0"
},
```

- [ ] **Step 3: Validate the completed settings**

Read `C:\Users\User\AppData\Roaming\Windsurf\User\settings.json` and confirm it contains the two `visible` settings and all three `scrollbarSlider` properties.

Expected: The file is valid JSON, the theme remains `Everforest Night Light Soft`, and the colors are `#808080B3`, `#A8A8A8CC`, and `#D0D0D0`.

- [ ] **Step 4: Commit project documentation only**

```powershell
git add docs/superpowers/plans/2026-07-18-windsurf-scrollbar.md
git commit -m "docs: add Windsurf scrollbar plan"
```

Expected: Git creates one documentation commit. Do not add the global Windsurf settings file because it is outside this repository.
