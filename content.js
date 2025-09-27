(function () {
  // --- HELPER FUNCTIONS ---

  // Converts an ability modifier string ('+5') to its score (20)
  const modifierToScore = (mod) => {
    const modValue = parseInt(mod, 10);
    if (isNaN(modValue)) return 0;
    return 10 + (modValue * 2);
  };

  // Normalize ability names (full or abbreviated) to PF2e keys
  const abilMap = {
    strength: 'Str', str: 'Str',
    dexterity: 'Dex', dex: 'Dex',
    constitution: 'Con', con: 'Con',
    intelligence: 'Int', int: 'Int',
    wisdom: 'Wis', wis: 'Wis',
    charisma: 'Cha', cha: 'Cha'
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

  // Gets the action cost icon (1, 2, 3, R, F) from an element (with alt-text fallbacks)
  const getActionCost = (element) => {
    const alt = element.querySelector('img[alt]')?.getAttribute('alt')?.toLowerCase() || "";
    if (alt.includes('one')) return '(1)';
    if (alt.includes('two')) return '(2)';
    if (alt.includes('three')) return '(3)';
    if (alt.includes('reaction')) return '(R)';
    if (alt.includes('free')) return '(Free)';

    if (element.querySelector('.one-action-icon')) return '(1)';
    if (element.querySelector('.two-action-icon')) return '(2)';
    if (element.querySelector('.three-action-icon')) return '(3)';
    if (element.querySelector('.reaction-icon')) return '(R)';
    if (element.querySelector('.free-action-icon')) return '(Free)';
    return '';
  };

  // Build Fort/Ref/Will text from saves array
  const buildSavesNote = (saves) => {
    const fort = saves.find(s => s.Name === 'Fort')?.Modifier ?? null;
    const ref = saves.find(s => s.Name === 'Ref')?.Modifier ?? null;
    const will = saves.find(s => s.Name === 'Will')?.Modifier ?? null;
    const fmt = (v) => v == null ? '+0' : `${v >= 0 ? '+' : ''}${v}`;
    return `Fort ${fmt(fort)}, Ref ${fmt(ref)}, Will ${fmt(will)}`;
  };

  // PF2e size & type helpers
  const SIZES = new Set(["Tiny", "Small", "Medium", "Large", "Huge", "Gargantuan"]);
  const PF2_TYPES = new Set([
    "Aberration","Animal","Astral","Beast","Celestial","Construct","Dragon","Elemental",
    "Fey","Fiend","Fungus","Giant","Humanoid","Monitor","Ooze","Plant","Spirit","Undead"
  ]);

  // --- MAIN EXTRACTION LOGIC ---
  function extractStats() {
    const nextDataScript = document.getElementById('__NEXT_DATA__');
    if (!nextDataScript) {
      return { error: "Could not find page data script." };
    }

    try {
      const pageData = JSON.parse(nextDataScript.textContent).props?.pageProps;

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

      // --- Basic Info / Traits -> Type ---
      finalJson.Challenge = String(monsterData.level ?? 0);

      // Traits come in "name|id,name|id,..."
      const rawTraits = (monsterData.traits || '')
        .split(',')
        .map(t => t.split('|')[0].trim())
        .filter(Boolean);

      const size = rawTraits.find(t => SIZES.has(t)) || "";
      // prefer PF2 types (case-insensitive)
      const typeTrait = rawTraits.find(t => PF2_TYPES.has(t.charAt(0).toUpperCase() + t.slice(1).toLowerCase())) || "Creature";
      const typeCanonical = typeTrait.charAt(0).toUpperCase() + typeTrait.slice(1).toLowerCase();

      const subtypes = rawTraits.filter(t =>
        t !== size &&
        t !== typeTrait &&
        t !== "Uncommon" && t !== "Rare" && t !== "Unique" &&
        !/^[A-Z]{1,2}$/.test(t)
      );

      finalJson.Type = `${size ? size + ' ' : ''}${typeCanonical.toLowerCase()}${subtypes.length ? ` (${subtypes.map(s => s.trim().toLowerCase()).join(', ')})` : ''}`.trim();

      // --- Collect candidate stat nodes (broadened selection) ---
      // We look at any <p> or <li> that has a <strong> label, since Demiplane varies markup
      const statNodes = [...doc.querySelectorAll('p, li')].filter(el => el.querySelector('strong'));

      // --- Switch-style parse ---
      statNodes.forEach(p => {
        const strongTag = p.querySelector('strong');
        if (!strongTag) return;

        const key = strongTag.textContent.trim();
        let fullText = p.textContent.trim().replace(/\u00a0/g, ' '); // normalize NBSP
        let value = fullText.replace(key, '').trim();
        if (value.startsWith(';')) value = value.substring(1).trim();

        // classify
        let sectionType = key;

        // abilities line can be labeled or just be STR/DEX etc; treat both full and abbr
        if (/^(str|dex|con|int|wis|cha|strength|dexterity|constitution|intelligence|wisdom|charisma)\b/i.test(key)) {
          sectionType = 'Abilities';
        }

        const hasActionIcon = !!p.querySelector('[class*="-action-icon"]') || !!p.querySelector('img[alt]');
        if (p.querySelector('.reaction-icon') || /reaction/i.test(p.textContent)) sectionType = 'Reaction';
        else if (hasActionIcon) {
          sectionType = (key === 'Melee' || key === 'Ranged') ? 'Attack' : 'Action';
        }

        // common headings that should be recognized explicitly
        if (/^Melee$/i.test(key) || /^Ranged$/i.test(key)) sectionType = 'Attack';

        // parse
        switch (sectionType) {
          case 'Perception': {
            // Keep the WHOLE line in Senses (matches target like "Perception +20; darkvision")
            if (!finalJson.Senses.some(s => s.startsWith('Perception'))) {
              finalJson.Senses.push(fullText);
            }
            finalJson.InitiativeModifier = parseInt(value.match(/[+-]\d+/)?.[0] || '0', 10);
            break;
          }

          case 'Languages': {
            finalJson.Languages = value.split(',').map(s => s.trim()).filter(Boolean);
            break;
          }

          case 'Skills': {
            finalJson.Skills = value.split(',').map(parseNameModifier).filter(s => s.Name);
            break;
          }

          case 'Abilities': {
            // The abilities may be spread across comma/space separated tokens, handle both
            // Example: "Str +8, Dex +2, Con +5, Int +0, Wis +1, Cha +3"
            const chunks = fullText.replace(/[,;]/g, ',').split(',').map(s => s.trim()).filter(Boolean);
            chunks.forEach(chunk => {
              const m = chunk.match(/^([A-Za-z]+)\s*([+-]?\d+)/);
              if (!m) return;
              const keyNorm = abilMap[m[1].toLowerCase()];
              if (!keyNorm) return;
              finalJson.Abilities[keyNorm] = modifierToScore(m[2]);
            });
            break;
          }

          case 'AC': {
            // AC value
            finalJson.AC.Value = parseInt(fullText.match(/AC\s+(\d+)/)?.[1] || '0', 10);

            // Saves possibly on same line
            const savesMatch = fullText.match(/Fort\s*([+-]\d+)[,;]?\s*Ref\s*([+-]\d+)[,;]?\s*Will\s*([+-]\d+)/i);
            if (savesMatch) {
              finalJson.Saves.push({ Name: "Fort", Modifier: parseInt(savesMatch[1], 10) });
              finalJson.Saves.push({ Name: "Ref",  Modifier: parseInt(savesMatch[2], 10) });
              finalJson.Saves.push({ Name: "Will", Modifier: parseInt(savesMatch[3], 10) });
            }

            // Notes after semicolon
            const notesMatch = fullText.match(/;\s*(.*)$/);
            if (notesMatch) finalJson.AC.Notes = notesMatch[1].trim();
            break;
          }

          case 'HP': {
            finalJson.HP.Value = parseInt(fullText.match(/HP\s+(\d+)/)?.[1] || '0', 10);

            // Allow extras like Hardness/Regeneration/Fast Healing to live in HP.Notes
            const hpNotes = [];
            const hardness = fullText.match(/Hardness\s+(\d+)/i);
            if (hardness) hpNotes.push(`Hardness ${hardness[1]}`);
            const regen = fullText.match(/Regeneration\s+([^;]+)/i);
            if (regen) hpNotes.push(`Regeneration ${regen[1].trim()}`);
            const fastHealing = fullText.match(/Fast Healing\s+([^;]+)/i);
            if (fastHealing) hpNotes.push(`Fast Healing ${fastHealing[1].trim()}`);
            if (hpNotes.length) {
              finalJson.HP.Notes = hpNotes.join('; ');
            }

            // Parse defenses if embedded
            const immunitiesMatch = fullText.match(/Immunities\s+([^;]+)/i);
            if (immunitiesMatch) finalJson.DamageImmunities = immunitiesMatch[1].split(',').map(i => i.trim()).filter(Boolean);
            const weaknessesMatch = fullText.match(/Weaknesses\s+([^;]+)/i);
            if (weaknessesMatch) finalJson.DamageVulnerabilities = weaknessesMatch[1].split(',').map(w => w.trim()).filter(Boolean);
            const resistancesMatch = fullText.match(/Resistances\s+([^;]+)/i);
            if (resistancesMatch) finalJson.DamageResistances = resistancesMatch[1].split(',').map(r => r.trim()).filter(Boolean);
            break;
          }

          case 'Immunities': {
            finalJson.DamageImmunities = value.split(',').map(s => s.trim()).filter(Boolean);
            break;
          }
          case 'Weaknesses': {
            finalJson.DamageVulnerabilities = value.split(',').map(s => s.trim()).filter(Boolean);
            break;
          }
          case 'Resistances': {
            finalJson.DamageResistances = value.split(',').map(s => s.trim()).filter(Boolean);
            break;
          }

          case 'Speed': {
            finalJson.Speed = value.split(',').map(s => s.trim().replace(/\bfeet\b/gi, 'ft.')).filter(Boolean);
            break;
          }

          case 'Attack': {
            const actionCost = getActionCost(p);
            // Remove the leading "Melee"/"Ranged"
            const textAfterKey = fullText.replace(/^(Melee|Ranged)\s*/i, '').trim();
            // weapon short name = until first " (" or " +" or ";" or end
            const nameMatch = textAfterKey.match(/^([^(+;]+?)(?:\s*[+;(]|$)/);
            const weaponShort = (nameMatch ? nameMatch[1] : 'Attack').trim();
            const formatted = weaponShort.charAt(0).toUpperCase() + weaponShort.slice(1);
            finalJson.Actions.push({
              Name: `${formatted} ${actionCost}`.trim(),
              Content: `${key} Strike ${value}`
            });
            break;
          }

          case 'Reaction': {
            // e.g., "Attack of Opportunity", "Catch Rock"
            finalJson.Reactions.push({ Name: key, Content: value, Usage: "" });
            break;
          }

          case 'Action': {
            const regularActionCost = getActionCost(p);
            finalJson.Actions.push({ Name: `${key} ${regularActionCost}`.trim(), Content: value });
            break;
          }

          default: {
            // Spell sections & similar
            if (/(arcane|divine|occult|primal).*(spells)|focus spells|rituals|cantrips/i.test(key)) {
              finalJson.Description += `${key}: ${value.replace(/<[^>]*>/g, ' ')}\n\n`;
            } else {
              finalJson.Traits.push({ Name: key, Content: value });
            }
            break;
          }
        }
      });

      // --- Post-processing: fallback for Saves if not found on AC line ---
      if (finalJson.Saves.length === 0) {
        const node = [...doc.querySelectorAll('p, li')].find(el =>
          /Fort\b/i.test(el.textContent) && /Ref\b/i.test(el.textContent) && /Will\b/i.test(el.textContent)
        );
        if (node) {
          const t = node.textContent;
          const mm = t.match(/Fort\s*([+-]\d+)/i);
          const mr = t.match(/Ref\s*([+-]\d+)/i);
          const mw = t.match(/Will\s*([+-]\d+)/i);
          if (mm) finalJson.Saves.push({ Name: 'Fort', Modifier: parseInt(mm[1], 10) });
          if (mr) finalJson.Saves.push({ Name: 'Ref',  Modifier: parseInt(mr[1], 10) });
          if (mw) finalJson.Saves.push({ Name: 'Will', Modifier: parseInt(mw[1], 10) });
        }
      }

      // --- Post-processing: if AC.Notes empty but we have saves, synthesize the "Fort +x, Ref +y, Will +z" note ---
      if (!finalJson.AC.Notes && finalJson.Saves.length >= 2) {
        finalJson.AC.Notes = buildSavesNote(finalJson.Saves);
      }

      return finalJson;

    } catch (e) {
      console.error("Demiplane Extractor Error:", e);
      return { error: "Failed to parse character data.", message: e.message };
    }
  }

  const characterStats = extractStats();
  chrome.runtime.sendMessage({ action: "displayStats", data: characterStats });
})();
