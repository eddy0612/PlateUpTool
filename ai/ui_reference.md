# UI Reference Notes

## Right-hand side-box (palette)
- `.main-grid` uses `flex: 1` and `align-items: stretch` so both columns (left-panel, right-panel) fill the remaining viewport height after the header.
- `.side-box` uses `flex: 1; min-height: 0` to fill the right-panel height minus side-controls and status.
- `.palette` inside `.side-box` is scrollable (`overflow-y: auto`), with `flex: 1 1 auto` and `max-height: 100%`.
- `.viewport-box` uses `height: 100%` to fill the viewport wrapper (`flex: 1`) in left-panel, so its bottom aligns with `.side-box` bottom.
- The right panel no longer has a fixed `70vh` height; it grows to match the left panel.
- Use this as a reference for future panel sizing adjustments.
