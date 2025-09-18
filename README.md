# Demiplane Stat Extractor

A Chrome extension that extracts Pathfinder 2e creature stat blocks from Demiplane pages and converts them to JSON format compatible with Improved Initiative or any other use.

## Features

- **One-click extraction** of creature stats from Demiplane creature pages
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
- `content.js` - Main extraction logic
- `popup.html` - Extension popup interface
- `popup.js` - Popup functionality
- Icon files (16x16, 48x48, 128x128 px)

## Usage

1. **Navigate to a creature page** on Demiplane (e.g., a specific monster or NPC from a Pathfinder 2e source)
2. **Click the extension icon** in your Chrome toolbar
3. **Click "Extract Stats"** in the popup window
4. **Review the extracted JSON** in the output area
5. **Click "Copy JSON"** to copy the formatted stats to your clipboard
6. **Import into Improved Initiative** by pasting the JSON data

### Example Workflow
```
Demiplane Monster Page → Extension → JSON Output → Improved Initiative
```

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
- **Demiplane** creature pages with Pathfinder 2e stat blocks
- **Improved Initiative** JSON import format
- **Pathfinder 2e** stat block structure

## Troubleshooting

### "No Stat Block Found" Error
- Ensure you're on a specific creature page, not a category or search page
- The page must contain a properly formatted Pathfinder 2e stat block
- Try refreshing the page and extracting again

### Empty or Incomplete Data
- Some creatures may have non-standard stat block formatting
- Check the original Demiplane page for any formatting issues
- Manual editing of the JSON may be required for edge cases

### Extension Not Working
- Verify the extension is enabled in `chrome://extensions/`
- Check that you have the necessary permissions (activeTab, scripting, clipboardWrite)
- Try reloading the extension or restarting Chrome

## Development

### File Structure
```
demiplane-stat-extractor/
├── manifest.json          # Extension configuration
├── content.js            # Main extraction logic
├── popup.html            # Extension popup UI
├── popup.js              # Popup functionality
└── icons/                # Extension icons
    ├── icon16.png
    ├── icon48.png
    └── icon128.png
```

### Key Functions
- `extractStats()` - Main extraction function
- `modifierToScore()` - Converts ability modifiers to scores
- `parseNameModifier()` - Parses skill text into structured data
- `getActionCost()` - Extracts action cost icons

## Contributing

Feel free to submit issues, feature requests, or pull requests to improve the extension's functionality and compatibility with different creature stat blocks.

## License

This project is open source. Please ensure compliance with Demiplane's terms of service when using this extension.

---

**Note**: This extension is designed specifically for extracting publicly available creature stat blocks from Demiplane for use in virtual tabletop applications. Always respect copyright and terms of service when using extracted content.
