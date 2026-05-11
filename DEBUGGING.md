# Debugging

## iPad debugging

The temporary touch debug panel is hidden from the normal UI.

To enable it on an iPad, open the app URL with either of these query parameters appended:

- `?touchDebug=1`
- `?debugTouch=1`

Example:

```text
https://your-host.example.com/?touchDebug=1
```

When enabled, an on-screen debug panel appears over the grid and records touch and palette drag events. This is useful on older iPads where the browser console is not easy to access.

The panel includes:

- `Copy` to copy the current debug log to the clipboard
- `Clear` to clear the current debug log

The debug panel only stays enabled for that URL. It is no longer persisted through local storage.