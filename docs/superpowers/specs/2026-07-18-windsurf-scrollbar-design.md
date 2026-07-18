# Windsurf Scrollbar Visibility Design

## Goal
Improve the visibility of always-on scrollbars in the Windsurf sidebar and editor while retaining the current `Everforest Night Light Soft` theme.

## Scope
Update the global Windsurf user settings at `C:\Users\User\AppData\Roaming\Windsurf\User\settings.json`.

## Configuration
- Preserve `editor.scrollbar.vertical` and `editor.scrollbar.horizontal` as `visible`.
- Add `workbench.colorCustomizations` entries for the default, hover, and active scrollbar slider states.
- Use progressively lighter neutral gray opacity values so the thumb is visible on the current light UI while keeping hover and drag states distinct.

## Error Handling
The settings file remains valid JSON. No project source files, theme selection, or extension settings are changed.

## Verification
Read the settings file after the edit and confirm the two visibility settings and three scrollbar color values are present.
