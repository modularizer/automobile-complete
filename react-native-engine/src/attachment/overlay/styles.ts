/**
 * Default styles for autocomplete overlay.
 */

/**
 * Get default CSS styles for autocomplete
 */
export function getDefaultStyles(customStyles?: string): string {
  return `
    .autocomplete-wrapper {
      position: relative;
      display: inline-block;
      width: 100%;
    }
    
    .autocomplete-overlay {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      pointer-events: none;
      white-space: nowrap;
      word-wrap: normal;
      overflow: hidden;
      z-index: 1;
    }
    
    .autocomplete-wrapper textarea + .autocomplete-overlay,
    .autocomplete-wrapper [contenteditable="true"] + .autocomplete-overlay {
      white-space: pre-wrap;
      word-wrap: break-word;
    }
    
    .autocomplete-suggestion {
      color: #999;
    }
    
    .autocomplete-wrapper input,
    .autocomplete-wrapper textarea,
    .autocomplete-wrapper [contenteditable="true"] {
      position: relative;
      z-index: 2;
      /* Don't set background: transparent - preserve original background */
    }
    
    ${customStyles || ''}
  `;
}

/**
 * Inject default styles into the document if not already present
 */
export function injectStyles(customStyles?: string): void {
  if (!document.getElementById('autocomplete-styles')) {
    const styleSheet = document.createElement('style');
    styleSheet.id = 'autocomplete-styles';
    styleSheet.textContent = getDefaultStyles(customStyles);
    document.head.appendChild(styleSheet);
  }
}

