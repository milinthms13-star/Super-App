/**
 * Diff Utility for Diary Entries
 * Calculates and formats differences between two versions
 * 
 * Phase 4.6: Version comparison feature
 */

/**
 * Simple line-by-line diff algorithm (similar to unified diff)
 * Compares two text blocks and identifies additions/deletions/changes
 */
const calculateLineDiff = (oldText, newText) => {
  const oldLines = (oldText || '').split('\n');
  const newLines = (newText || '').split('\n');
  
  const diff = [];
  const maxLines = Math.max(oldLines.length, newLines.length);
  
  for (let i = 0; i < maxLines; i++) {
    const oldLine = oldLines[i];
    const newLine = newLines[i];
    
    if (oldLine === newLine) {
      diff.push({ type: 'equal', content: oldLine, lineNum: i + 1 });
    } else if (oldLine === undefined) {
      diff.push({ type: 'add', content: newLine, lineNum: i + 1 });
    } else if (newLine === undefined) {
      diff.push({ type: 'remove', content: oldLine, lineNum: i + 1 });
    } else {
      diff.push({ type: 'remove', content: oldLine, lineNum: i + 1 });
      diff.push({ type: 'add', content: newLine, lineNum: i + 1 });
    }
  }
  
  return diff;
};

/**
 * Character-level diff within a line (for highlighting specific changes)
 * Shows exactly which characters changed in similar lines
 */
const calculateCharDiff = (oldText, newText) => {
  const result = { removed: [], added: [], equal: [] };
  
  let oldIndex = 0;
  let newIndex = 0;
  
  // Simple character-by-character comparison
  // This is a basic implementation; for production, use a library like 'diff-match-patch'
  while (oldIndex < oldText.length || newIndex < newText.length) {
    const oldChar = oldText[oldIndex];
    const newChar = newText[newIndex];
    
    if (oldChar === newChar) {
      result.equal.push(oldChar);
      oldIndex++;
      newIndex++;
    } else if (oldIndex < oldText.length && newIndex < newText.length) {
      // Try to find common suffix
      const oldRest = oldText.slice(oldIndex);
      const newRest = newText.slice(newIndex);
      
      // Simplified: just mark as removed/added
      result.removed.push(oldChar);
      oldIndex++;
    } else if (oldIndex < oldText.length) {
      result.removed.push(oldChar);
      oldIndex++;
    } else {
      result.added.push(newChar);
      newIndex++;
    }
  }
  
  return result;
};

/**
 * Calculate structured diff between two diary entry versions
 * @param {Object} oldVersion - Previous version
 * @param {Object} newVersion - Current version
 * @returns {Object} - Structured diff with all field changes
 */
const calculateEntryDiff = (oldVersion, newVersion) => {
  const diff = {
    timestamp: new Date(),
    oldVersionId: oldVersion?._id,
    newVersionId: newVersion?._id,
    changes: {},
    summary: {
      fieldsChanged: 0,
      linesAdded: 0,
      linesRemoved: 0,
      wordsAdded: 0,
      wordsRemoved: 0,
      totalChange: 0
    }
  };

  // Compare fields
  const fieldsToCompare = ['title', 'content', 'mood', 'category', 'tags', 'isPrivate'];

  fieldsToCompare.forEach(field => {
    const oldValue = oldVersion?.[field];
    const newValue = newVersion?.[field];

    if (JSON.stringify(oldValue) !== JSON.stringify(newValue)) {
      diff.changes[field] = {
        old: oldValue,
        new: newValue,
        type: 'changed'
      };

      diff.summary.fieldsChanged += 1;

      // Additional analysis for content field
      if (field === 'content') {
        const lineDiff = calculateLineDiff(oldValue, newValue);
        
        let added = 0, removed = 0;
        lineDiff.forEach(line => {
          if (line.type === 'add' && line.content) added += 1;
          if (line.type === 'remove' && line.content) removed += 1;
        });

        diff.changes[field].lineDiff = lineDiff;
        diff.changes[field].linesAdded = added;
        diff.changes[field].linesRemoved = removed;
        diff.summary.linesAdded += added;
        diff.summary.linesRemoved += removed;

        // Word count changes
        const oldWords = (oldValue || '').split(/\s+/).filter(w => w).length;
        const newWords = (newValue || '').split(/\s+/).filter(w => w).length;
        const wordDelta = newWords - oldWords;

        diff.changes[field].wordCountOld = oldWords;
        diff.changes[field].wordCountNew = newWords;
        diff.changes[field].wordDelta = wordDelta;

        diff.summary.wordsAdded += Math.max(0, wordDelta);
        diff.summary.wordsRemoved += Math.max(0, -wordDelta);
      }

      // Analyze tags
      if (field === 'tags') {
        const oldTags = oldValue || [];
        const newTags = newValue || [];
        
        const added = newTags.filter(t => !oldTags.includes(t));
        const removed = oldTags.filter(t => !newTags.includes(t));
        
        diff.changes[field].tagsAdded = added;
        diff.changes[field].tagsRemoved = removed;
      }
    }
  });

  diff.summary.totalChange = 
    diff.summary.linesAdded + diff.summary.linesRemoved + 
    diff.summary.wordsAdded + diff.summary.wordsRemoved;

  return diff;
};

/**
 * Calculate percentage similarity between two strings
 * Useful for version comparison UI
 * @param {string} str1 - First string
 * @param {string} str2 - Second string
 * @returns {number} - Similarity percentage (0-100)
 */
const calculateSimilarity = (str1, str2) => {
  if (!str1 && !str2) return 100;
  if (!str1 || !str2) return 0;

  const len1 = str1.length;
  const len2 = str2.length;
  const maxLen = Math.max(len1, len2);

  // Simple Levenshtein-like distance
  let matches = 0;
  const minLen = Math.min(len1, len2);

  for (let i = 0; i < minLen; i++) {
    if (str1[i] === str2[i]) matches++;
  }

  return Math.round((matches / maxLen) * 100);
};

/**
 * Format diff for inline display (with HTML markers)
 * @param {string} oldText - Original text
 * @param {string} newText - New text
 * @returns {Object} - Formatted with additions and deletions highlighted
 */
const formatDiffForDisplay = (oldText, newText) => {
  const lineDiff = calculateLineDiff(oldText, newText);
  
  return {
    lines: lineDiff.map(line => ({
      type: line.type,
      content: line.content,
      lineNum: line.lineNum,
      className: `diff-${line.type}`
    })),
    stats: {
      total: lineDiff.length,
      added: lineDiff.filter(l => l.type === 'add').length,
      removed: lineDiff.filter(l => l.type === 'remove').length,
      equal: lineDiff.filter(l => l.type === 'equal').length
    }
  };
};

/**
 * Create a summary description of changes
 * @param {Object} diff - Calculated diff from calculateEntryDiff
 * @returns {string} - Human-readable summary
 */
const createDiffSummary = (diff) => {
  const parts = [];

  if (diff.changes.title) {
    parts.push(`📝 Title changed`);
  }

  if (diff.changes.content) {
    const { linesAdded, linesRemoved, wordDelta } = diff.changes.content;
    const wordStr = wordDelta > 0 ? `+${wordDelta} words` : `${wordDelta} words`;
    parts.push(`📄 Content: +${linesAdded} lines, -${linesRemoved} lines (${wordStr})`);
  }

  if (diff.changes.mood) {
    parts.push(`😊 Mood: ${diff.changes.mood.old} → ${diff.changes.mood.new}`);
  }

  if (diff.changes.category) {
    parts.push(`🏷️ Category: ${diff.changes.category.old} → ${diff.changes.category.new}`);
  }

  if (diff.changes.tags?.tagsAdded?.length > 0) {
    parts.push(`✅ Tags added: ${diff.changes.tags.tagsAdded.join(', ')}`);
  }

  if (diff.changes.tags?.tagsRemoved?.length > 0) {
    parts.push(`❌ Tags removed: ${diff.changes.tags.tagsRemoved.join(', ')}`);
  }

  if (diff.changes.isPrivate) {
    const privacy = diff.changes.isPrivate.new ? 'Private' : 'Public';
    parts.push(`🔒 Privacy: Now ${privacy}`);
  }

  return parts.join(' | ') || 'No changes detected';
};

module.exports = {
  calculateLineDiff,
  calculateCharDiff,
  calculateEntryDiff,
  calculateSimilarity,
  formatDiffForDisplay,
  createDiffSummary
};
