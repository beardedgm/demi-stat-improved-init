# Changelog

## v2.0 - 2025-01-08

### Breaking Changes
**Demiplane migrated their site architecture** from server-side rendering to client-side rendering, which completely broke the original extraction method.

### Major Changes
- **Complete rewrite of extraction logic** - No longer relies on `__NEXT_DATA__` JSON
- **Async/await architecture** - Now waits for page content to fully render
- **New DOM selectors** - Updated to target Demiplane's current CSS class structure
- **Auto-retry mechanism** - Polls for content with 40 attempts at 250ms intervals (10 second timeout)

### Technical Details

#### Old Method (v1.0)
```javascript
// Looked for embedded JSON in page source
const nextDataScript = document.getElementById('__NEXT_DATA__');
const pageData = JSON.parse(nextDataScript.textContent);
```

#### New Method (v2.0)
```javascript
// Waits for client-side rendering, then parses DOM
await waitForContent(); // Polls for .page-inner-holder
const statParagraphs = document.querySelectorAll('.Stat-Body, .Stat-Body-secondary');
```

### New Selectors
| Element | Old Selector | New Selector |
|---------|-------------|--------------|
| Name | From JSON `monsterData.name` | `.elem-disp-header-name-page h1` |
| Level | From JSON `monsterData.level` | `.element-display-header-tag-creature` |
| Traits | From JSON `monsterData.traits` | `.trait-tag button` |
| Stats | From JSON `element_display` HTML | `.Stat-Body, .Stat-Body-secondary` |
| Actions | Icon classes in parsed HTML | `.one-action-icon`, `.two-action-icon`, etc. |

### What Stayed The Same
- ✅ Output JSON format (still Improved Initiative compatible)
- ✅ All helper functions (modifierToScore, parseNameModifier, etc.)
- ✅ Complete stat extraction (HP, AC, abilities, saves, etc.)
- ✅ Action cost parsing logic
- ✅ User interface (popup.html, popup.js)

### Migration Notes
If you're updating from v1.0:
1. Replace `content.js` with the new version
2. Update `manifest.json` version to "2.0"
3. Reload the extension in Chrome (`chrome://extensions/`)
4. Test on any Demiplane creature page

### Known Issues
- Page must be fully loaded (extension waits up to 10 seconds)
- Very slow connections might timeout - just retry the extraction
- Some edge-case stat block formats may need manual JSON editing

### Future Improvements
- Consider adding user-configurable timeout
- Add support for hazards and other stat block types
- Implement better error messages for specific failure modes
- Add visual loading indicator during the wait period
