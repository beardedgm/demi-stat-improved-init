(function() {
  // --- HELPER FUNCTIONS ---

  // Converts an ability modifier string ('+5') to its score (20)
  const modifierToScore = (mod) => {
    const modValue = parseInt(mod, 10);
    if (isNaN(modValue)) return 0;
    return 10 + (modValue * 2);
  };

  // Parses a string like "Athletics +31" into { Name: "Athletics", Modifier: 31 }
  const parseNameModifier = (text) => {
    const trimmed = text.trim();
    if (!trimmed) {
      return { Name: "", Modifier: 0 };
    }

    const match = trimmed.match(/^(.*?)([+-]\d+)([^+-]*)$/);
    if (!match) {
      return { Name: trimmed, Modifier: 0 };
    }

    const [, namePart, modifierPart, trailingPart] = match;
    const modifier = parseInt(modifierPart, 10) || 0;

    let baseName = namePart.trim();
    let trailing = trailingPart.trim();

    if (trailing) {
      if (/^[([].*/.test(trailing)) {
        baseName = baseName ? `${baseName} ${trailing}`.trim() : trailing;
        trailing = "";
      } else if (baseName.endsWith('(') && trailing.endsWith(')')) {
        baseName = `${baseName}${trailing}`.replace(/\s+/g, ' ').trim();
        trailing = "";
      }
    }

    baseName = baseName.replace(/\s+/g, ' ').trim();

    const result = { Name: baseName, Modifier: modifier };
    if (trailing) {
      result.Notes = trailing;
    }

    return result;
  };
  
  // Gets the action cost icon (1, 2, 3, R, F) from an element
  const getActionCost = (element) => {
    if (element.querySelector('.one-action-icon')) return '(1)';
    if (element.querySelector('.two-action-icon')) return '(2)';
    if (element.querySelector('.three-action-icon')) return '(3)';
    if (element.querySelector('.reaction-icon')) return '(R)';
    if (element.querySelector('.free-action-icon')) return '(Free)';
    return '';
  };

  // --- MAIN EXTRACTION LOGIC ---
  function extractStats() {
    const nextDataScript = document.getElementById('__NEXT_DATA__');
    if (!nextDataScript) return { error: "Could not find page data script." };

    try {
      const pageData = JSON.parse(nextDataScript.textContent).props.pageProps;

      // **IMPROVEMENT**: Check if the required data structure exists before trying to parse it.
      if (!pageData || !pageData.elementDisplayVersion || !pageData.elementDisplayVersion.element_display) {
        return { 
          error: "No Stat Block Found", 
          message: "This page doesn't contain a character or creature stat block in the expected format. Please navigate to a specific creature page and try again." 
        };
      }

      const monsterData = pageData.elementDisplayVersion;
      const displayHtml = monsterData.element_display;
      
      const parser = new DOMParser();
      const doc = parser.parseFromString(displayHtml, "text/html");

      // Initialize the final JSON object
      const finalJson = {
        Source: "Pathfinder 2e",
        Name: monsterData.name || "Unknown",
        Type: "",
        HP: { Value: 0, Notes: "" },
        AC: { Value: 0, Notes: "" },
        InitiativeModifier: 0,
        InitiativeAdvantage: false,
        Speed: [],
        Abilities: { Str: 0, Dex: 0, Con: 0, Int: 0, Wis: 0, Cha: 0 },
        DamageVulnerabilities: [],
        DamageResistances: [],
        DamageImmunities: [],
        ConditionImmunities: [],
        Saves: [],
        Skills: [],
        Senses: [],
        Languages: [],
        Challenge: "0",
        Traits: [],
        Actions: [],
        BonusActions: [],
        Reactions: [],
        LegendaryActions: [],
        MythicActions: [],
        Description: "",
        Player: "",
        Version: "3.13.2",
        ImageURL: monsterData.element_thumbnail ? `https://content.demiplane.com${monsterData.element_thumbnail}` : "",
        LastUpdateMs: Date.now()
      };

      // --- Basic Info ---
      finalJson.Challenge = String(monsterData.level);
      const traits = monsterData.traits.split(',').map(t => t.split('|')[0]);
      const size = traits.find(t => ["Tiny", "Small", "Medium", "Large", "Huge", "Gargantuan"].includes(t)) || "";
      const type = traits.find(t => ["Dragon", "Humanoid", "Aberration", "Construct", "Undead", "Ooze", "Beast", "Fiend", "Elemental"].includes(t)) || "Creature";
      const subtypes = traits.filter(t => ![size, type, "Uncommon", "Rare", "Unique"].includes(t) && !/^[A-Z]{1,2}$/.test(t));
      finalJson.Type = `${size} ${type.toLowerCase()}${subtypes.length > 0 ? ` (${subtypes.map(s => s.toLowerCase()).join(', ')})` : ''}`.trim();
      
      const statParagraphs = doc.querySelectorAll('p[class*="Stat-"]');

      // --- PARSE THE STAT BLOCK ---
      statParagraphs.forEach(p => {
        const strongTag = p.querySelector('strong');
        if (!strongTag) return;

        const key = strongTag.textContent.trim();
        let fullText = p.textContent.trim().replace(/\u00a0/g, ' '); // Replace non-breaking spaces
        let value = fullText.replace(key, '').trim();

        if (value.startsWith(';')) value = value.substring(1).trim();

        // Use a more robust classification method
        let sectionType = key;
        if (key.toLowerCase().startsWith('str')) sectionType = 'Abilities';
        if (p.querySelector('.reaction-icon')) sectionType = 'Reaction';
        else if (p.querySelector('[class*="-action-icon"]')) {
            sectionType = (key === 'Melee' || key === 'Ranged') ? 'Attack' : 'Action';
        }

        switch (sectionType) {
          case 'Perception':
            finalJson.Senses.push(fullText);
            finalJson.InitiativeModifier = parseInt(value.match(/[+-]\d+/)?.[0] || '0', 10);
            break;
          case 'Languages':
            finalJson.Languages = value.split(',').map(s => s.trim());
            break;
          case 'Skills':
            finalJson.Skills = value.split(',').map(parseNameModifier);
            break;
          case 'Abilities':
             fullText.split(',').forEach(modStr => {
                 const parts = modStr.trim().split(' ');
                 const abilityName = parts[0].charAt(0).toUpperCase() + parts[0].slice(1);
                 if (finalJson.Abilities.hasOwnProperty(abilityName)) {
                     finalJson.Abilities[abilityName] = modifierToScore(parts[1]);
                 }
             });
            break;
          case 'AC':
            finalJson.AC.Value = parseInt(fullText.match(/AC\s+(\d+)/)?.[1] || '0', 10);
            const savesMatch = fullText.match(/Fort\s+([+-]\d+),\s+Ref\s+([+-]\d+),\s+Will\s+([+-]\d+)/);
            if(savesMatch) {
                finalJson.Saves.push({Name: "Fort", Modifier: parseInt(savesMatch[1], 10)});
                finalJson.Saves.push({Name: "Ref", Modifier: parseInt(savesMatch[2], 10)});
                finalJson.Saves.push({Name: "Will", Modifier: parseInt(savesMatch[3], 10)});
            }
            const notesMatch = fullText.match(/;\s*(.*)/);
            if (notesMatch) finalJson.AC.Notes = notesMatch[1];
            break;
          case 'HP':
             finalJson.HP.Value = parseInt(fullText.match(/HP\s+(\d+)/)?.[1] || '0', 10);
             const immunitiesMatch = fullText.match(/Immunities\s+([^;]+)/i);
             if (immunitiesMatch) finalJson.DamageImmunities = immunitiesMatch[1].split(',').map(i => i.trim());
             const weaknessesMatch = fullText.match(/Weaknesses\s+([^;]+)/i);
             if (weaknessesMatch) finalJson.DamageVulnerabilities = weaknessesMatch[1].split(',').map(w => w.trim());
             const resistancesMatch = fullText.match(/Resistances\s+([^;]+)/i);
             if (resistancesMatch) finalJson.DamageResistances = resistancesMatch[1].split(',').map(r => r.trim());
            break;
          case 'Speed':
            finalJson.Speed = value.split(',').map(s => s.trim().replace(/feet/g, 'ft.'));
            break;
          case 'Attack':
             const actionCost = getActionCost(p);
             let attackName = 'Attack';
             const innerHTMLParts = p.innerHTML.split('</span>');
             if (innerHTMLParts.length > 1) {
                 const detailsText = innerHTMLParts[1].replace(/<[^>]*>/g, '').trim(); // Strip any remaining tags
                 attackName = detailsText.split(' ')[0];
             }
             const formattedName = attackName.charAt(0).toUpperCase() + attackName.slice(1);
             finalJson.Actions.push({ Name: `${formattedName} ${actionCost}`.trim(), Content: `${key} Strike ${value}` });
            break;
          case 'Reaction':
              finalJson.Reactions.push({ Name: key, Content: value, Usage: "" });
              break;
          case 'Action':
              const regularActionCost = getActionCost(p);
              finalJson.Actions.push({ Name: `${key} ${regularActionCost}`.trim(), Content: value });
              break;
          case 'Primal Innate Spells':
             finalJson.Description += `${key}: ${value.replace(/<[^>]*>/g, ' ')}\n\n`; // Clean HTML tags from spells
             break;
          default:
            finalJson.Traits.push({ Name: key, Content: value });
            break;
        }
      });
      
      return finalJson;

    } catch (e) {
      console.error("Demiplane Extractor Error:", e);
      return { error: "Failed to parse character data.", message: e.message };
    }
  }

  const characterStats = extractStats();
  chrome.runtime.sendMessage({ action: "displayStats", data: characterStats });
})();