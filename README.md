# Demiplane Stat Extractor

A Chrome extension that extracts Pathfinder 2e creature stat blocks from Demiplane pages and converts them to JSON format compatible with Improved Initiative or any other use.

## Recent Updates (v2.0)

**Important:** Demiplane migrated to client-side rendering, which broke the original extraction method. This version has been completely rewritten to work with the new architecture.

### What Changed
- **Old method:** Extracted data from `__NEXT_DATA__` JSON embedded in page source
- **New method:** Waits for page to fully load, then parses the rendered DOM directly
- **Result:** Extension now works with Demiplane's current infrastructure

## Features

- **One-click extraction** of creature stats from Demiplane creature pages
- **Auto-wait for page load** - Handles client-side rendered content automatically
- **Complete stat conversion** including HP, AC, abilities, skills, saves, and more
- **Copy to clipboard** functionality for easy import into Improved Initiative
- **Automatic formatting** converts Pathfinder 2e stats to Improved Initiative JSON structure
- **Action parsing** extracts and categorizes actions, reactions, and traits with proper action costs

## Installation

### From Source (Development)
1. Download or clone this repository
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable "Developer mode" in the top right corner
4. Click "Load unpacked" and select the extension folder
5. The Demiplane Stat Extractor icon should appear in your extensions toolbar

### Required Files
- `manifest.json` - Extension configuration
- `content.js` - Main extraction logic (now with async/await for client-side rendering)
- `popup.html` - Extension popup interface
- `popup.js` - Popup functionality
- Icon files (16x16, 48x48, 128x128 px)

## Usage

1. **Navigate to a creature page** on Demiplane (e.g., https://app.demiplane.com/nexus/pathfinder2e/creatures/shambler)
2. **Wait for the page to fully load** (the extension will automatically wait up to 10 seconds)
3. **Click the extension icon** in your Chrome toolbar
4. **Click "Extract Stats"** in the popup window
5. **Review the extracted JSON** in the output area
6. **Click "Copy JSON"** to copy the formatted stats to your clipboard
7. **Import into Improved Initiative** by pasting the JSON data

### Example Workflow
```
Demiplane Monster Page → Extension → JSON Output → Improved Initiative
```

## How It Works

### Client-Side Rendering Support
The extension now:
1. Injects the content script when you click "Extract Stats"
2. Waits for the `.page-inner-holder` element to appear (up to 10 seconds)
3. Extracts data from the fully-rendered DOM structure
4. Parses text content from specific CSS classes

### DOM Structure
The extension looks for these key elements:
- **Name:** `.elem-disp-header-name-page h1`
- **Level:** `.element-display-header-tag-creature`
- **Traits:** `.trait-tag button`
- **Stats:** `.Stat-Body` and `.Stat-Body-secondary` paragraphs
- **Action Icons:** `.one-action-icon`, `.two-action-icon`, `.reaction-icon`, etc.
- **Image:** `.elem-disp-header-thumb-img-page`

## Supported Data

The extension extracts and converts the following creature data:

### Basic Information
- Name and type classification
- Challenge level/level
- Source attribution

### Combat Stats
- Hit Points (HP) with notes
- Armor Class (AC) with notes
- Initiative modifier
- Speed types and values

### Abilities & Skills
- All six ability scores (Str, Dex, Con, Int, Wis, Cha)
- Skill modifiers and names
- Saving throw bonuses

### Defenses & Resistances
- Damage vulnerabilities (weaknesses)
- Damage resistances
- Damage immunities
- Condition immunities

### Actions & Abilities
- Actions with action costs (1, 2, 3 actions)
- Reactions
- Traits and special abilities
- Attack actions (melee/ranged)

### Additional Features
- Languages
- Senses and perception
- Image URLs when available
- Spell lists (added to description)

## Output Format

The extension generates JSON in the following structure:
```json
{
  "Source": "Pathfinder 2e",
  "Name": "Creature Name",
  "Type": "size type (subtypes)",
  "HP": { "Value": 100, "Notes": "" },
  "AC": { "Value": 20, "Notes": "" },
  "Challenge": "5",
  "Abilities": { "Str": 16, "Dex": 14, "Con": 15, "Int": 12, "Wis": 13, "Cha": 10 },
  "Actions": [
    { "Name": "Attack (1)", "Content": "Attack description" }
  ],
  // ... additional stats
}
```

## Compatibility

- **Chrome Browser** (Manifest V3)
- **Demiplane** creature pages with Pathfinder 2e stat blocks (current architecture)
- **Improved Initiative** JSON import format
- **Pathfinder 2e** stat block structure

## Troubleshooting

### "Content failed to load" Error
- The page took longer than 10 seconds to load - try refreshing and extracting again
- You might be on a slow connection - the extension will wait up to 10 seconds
- Check that you're on a specific creature page, not a category listing

### "No Stat Block Found" Error
- Ensure you're on a specific creature page with a stat block visible
- Make sure the page has fully rendered (you should see the creature stats)
- Try scrolling down to ensure all content has loaded

### Empty or Incomplete Data
- Some creatures may have non-standard stat block formatting
- Check the original Demiplane page for any formatting issues
- Manual editing of the JSON may be required for edge cases

### Extension Not Working
- Verify the extension is enabled in `chrome://extensions/`
- Check that you have the necessary permissions (activeTab, scripting, clipboardWrite)
- Try reloading the extension or restarting Chrome
- Check the browser console (F12) for error messages

## Development

### File Structure
```
demiplane-stat-extractor/
├── manifest.json          # Extension configuration
├── content.js            # Main extraction logic (now async with DOM parsing)
├── popup.html            # Extension popup UI
├── popup.js              # Popup functionality
└── icons/                # Extension icons
    ├── icon16.png
    ├── icon48.png
    └── icon128.png
```

### Key Functions
- `waitForContent()` - Waits for page to fully render (new in v2.0)
- `extractStats()` - Main extraction function (now async)
- `modifierToScore()` - Converts ability modifiers to scores
- `parseNameModifier()` - Parses skill text into structured data
- `getActionCost()` - Extracts action cost from icons

### Architecture Changes (v2.0)
- Switched from synchronous `__NEXT_DATA__` parsing to async DOM parsing
- Added retry logic with 40 attempts at 250ms intervals (10 second timeout)
- Updated all selectors to match new Demiplane DOM structure
- Maintained backward-compatible JSON output format

## Contributing

Feel free to submit issues, feature requests, or pull requests to improve the extension's functionality and compatibility with different creature stat blocks.

## Version History

### v2.0 (Current)
- Complete rewrite for client-side rendered pages
- Added async/await support for page load detection
- Updated all DOM selectors for new Demiplane architecture
- Improved error handling and user feedback

### v1.0 (Legacy)
- Original version using `__NEXT_DATA__` JSON extraction
- Worked with server-side rendered Demiplane pages

## License

This project is open source. Please ensure compliance with Demiplane's terms of service when using this extension.

---

**Note**: This extension is designed specifically for extracting publicly available creature stat blocks from Demiplane for use in virtual tabletop applications. Always respect copyright and terms of service when using extracted content.
