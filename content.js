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

  // Gets the action cost icon (1, 2, 3, R, F) from an element
  const getActionCost = (element) => {
    const alt = element.querySelector('span[aria-label]')?.getAttribute('aria-label')?.toLowerCase() || "";
    if (alt.includes('single')) return '(1)';
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

  // Wait for content to load
  function waitForContent(maxAttempts = 40, interval = 250) {
    return new Promise((resolve, reject) => {
      let attempts = 0;
      const check = setInterval(() => {
        const statBlock = document.querySelector('.page-inner-holder');
        const hasName = document.querySelector('.elem-disp-header-name-page h1');
        
        if (statBlock && hasName) {
          clearInterval(check);
          resolve();
        } else if (++attempts >= maxAttempts) {
          clearInterval(check);
          reject(new Error('Content failed to load'));
        }
      }, interval);
    });
  }

  // --- MAIN EXTRACTION LOGIC ---
  async function extractStats() {
    try {
      // Wait for content to load
      await waitForContent();

      // Initialize the final JSON object
      const finalJson = {
        Source: "Pathfinder 2e",
        Name: "Unknown",
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
        ImageURL: "",
        LastUpdateMs: Date.now()
      };

      // Extract Name
      const nameEl = document.querySelector('.elem-disp-header-name-page h1');
      if (nameEl) {
        finalJson.Name = nameEl.textContent.trim();
      }

      // Extract Level/Challenge
      const levelTag = document.querySelector('.element-display-header-tag-creature');
      if (levelTag) {
        const levelMatch = levelTag.textContent.match(/Creature\s+(\d+)/i);
        if (levelMatch) {
          finalJson.Challenge = levelMatch[1];
        }
      }

      // Extract Traits (size, type, alignment)
      const traitButtons = document.querySelectorAll('.trait-tag button');
      const rawTraits = Array.from(traitButtons).map(btn => btn.textContent.trim());
      
      const size = rawTraits.find(t => SIZES.has(t)) || "";
      const typeTrait = rawTraits.find(t => PF2_TYPES.has(t.charAt(0).toUpperCase() + t.slice(1).toLowerCase())) || "Creature";
      const typeCanonical = typeTrait.charAt(0).toUpperCase() + typeTrait.slice(1).toLowerCase();
      
      const subtypes = rawTraits.filter(t =>
        t !== size &&
        t !== typeTrait &&
        !/^[A-Z]{1,2}$/.test(t) // alignment codes
      );

      finalJson.Type = `${size ? size + ' ' : ''}${typeCanonical.toLowerCase()}${subtypes.length ? ` (${subtypes.map(s => s.trim().toLowerCase()).join(', ')})` : ''}`.trim();

      // Extract Image
      const thumbImg = document.querySelector('.elem-disp-header-thumb-img-page');
      if (thumbImg) {
        finalJson.ImageURL = thumbImg.src;
      }

      // --- Parse Stat Block ---
      // Select ALL paragraphs, not just specific classes
      const statParagraphs = document.querySelectorAll('.page-inner-holder p');
      
      statParagraphs.forEach(p => {
        const strongTag = p.querySelector('strong');
        if (!strongTag) return;

        const key = strongTag.textContent.trim();
        // Normalize en-dash (–) to regular minus sign (-)
        let fullText = p.textContent.trim()
          .replace(/\u00a0/g, ' ')  // non-breaking space
          .replace(/\u2013/g, '-')  // en-dash to minus
          .replace(/\u2014/g, '-'); // em-dash to minus
        let value = fullText.replace(key, '').trim();
        if (value.startsWith(';')) value = value.substring(1).trim();

        // Classify the section
        let sectionType = key;

        if (/^(str|dex|con|int|wis|cha|strength|dexterity|constitution|intelligence|wisdom|charisma)\b/i.test(key)) {
          sectionType = 'Abilities';
        }

        const hasActionIcon = !!p.querySelector('[class*="-action-icon"]');
        if (p.querySelector('.reaction-icon') || /reaction/i.test(p.textContent)) {
          sectionType = 'Reaction';
        } else if (hasActionIcon) {
          sectionType = (key === 'Melee' || key === 'Ranged') ? 'Attack' : 'Action';
        }

        if (/^Melee$/i.test(key) || /^Ranged$/i.test(key)) sectionType = 'Attack';

        // Parse based on section type
        switch (sectionType) {
          case 'Perception': {
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
            finalJson.AC.Value = parseInt(fullText.match(/AC\s+(\d+)/)?.[1] || '0', 10);

            const savesMatch = fullText.match(/Fort\s*([+-]\d+)[,;]?\s*Ref\s*([+-]\d+)[,;]?\s*Will\s*([+-]\d+)/i);
            if (savesMatch) {
              finalJson.Saves.push({ Name: "Fort", Modifier: parseInt(savesMatch[1], 10) });
              finalJson.Saves.push({ Name: "Ref",  Modifier: parseInt(savesMatch[2], 10) });
              finalJson.Saves.push({ Name: "Will", Modifier: parseInt(savesMatch[3], 10) });
            }

            const notesMatch = fullText.match(/;\s*(.*)$/);
            if (notesMatch) finalJson.AC.Notes = notesMatch[1].trim();
            break;
          }

          case 'HP': {
            finalJson.HP.Value = parseInt(fullText.match(/HP\s+(\d+)/)?.[1] || '0', 10);

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
            const textAfterKey = fullText.replace(/^(Melee|Ranged)\s*/i, '').trim();
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
            finalJson.Reactions.push({ Name: key, Content: value, Usage: "" });
            break;
          }

          case 'Action': {
            const regularActionCost = getActionCost(p);
            finalJson.Actions.push({ Name: `${key} ${regularActionCost}`.trim(), Content: value });
            break;
          }

          default: {
            if (/(arcane|divine|occult|primal).*(spells)|focus spells|rituals|cantrips/i.test(key)) {
              finalJson.Description += `${key}: ${value.replace(/<[^>]*>/g, ' ')}\n\n`;
            } else {
              finalJson.Traits.push({ Name: key, Content: value });
            }
            break;
          }
        }
      });

      // Post-processing: fallback for Saves
      if (finalJson.Saves.length === 0) {
        const node = [...document.querySelectorAll('.page-inner-holder p')].find(el =>
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

      // Post-processing: Add saves to AC notes if needed
      if (!finalJson.AC.Notes && finalJson.Saves.length >= 2) {
        finalJson.AC.Notes = buildSavesNote(finalJson.Saves);
      }

      return finalJson;

    } catch (e) {
      console.error("Demiplane Extractor Error:", e);
      return { 
        error: "Failed to parse creature data", 
        message: e.message,
        details: "Make sure you're on a creature page and it has fully loaded."
      };
    }
  }

  // Run extraction and send results
  extractStats().then(characterStats => {
    chrome.runtime.sendMessage({ action: "displayStats", data: characterStats });
  }).catch(error => {
    chrome.runtime.sendMessage({ 
      action: "displayStats", 
      data: { 
        error: "Extraction Failed", 
        message: error.message 
      } 
    });
  });
})();
