# Universal Autocomplete - Works with ANY Input

This library provides a controller that works with **any input element** - HTML inputs, React Native TextInput, Vue, Angular, vanilla JS, etc. The key is using the **standard CSS overlay pattern** to show gray suggestion text.

## The Standard CSS Pattern

The standard way to show gray suggestion text beyond the cursor is:

1. **Wrap your input in a container** with `position: relative`
2. **Create an overlay div** with `position: absolute` that matches the input's position
3. **Style the overlay** to match the input's font, padding, border, etc.
4. **Make overlay transparent to clicks** with `pointer-events: none`
5. **Show typed text + gray suggestion** in the overlay
6. **Keep input on top** with `z-index: 2`, overlay at `z-index: 1`

### Standard CSS

```css
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
  white-space: pre-wrap;
  word-wrap: break-word;
  overflow: hidden;
  color: transparent;
  z-index: 1;
  /* Match input styles */
  padding: inherit;
  border: inherit;
  font-size: inherit;
  font-family: inherit;
  line-height: inherit;
}

.autocomplete-suggestion {
  color: #999; /* Gray suggestion text */
}

.autocomplete-wrapper input,
.autocomplete-wrapper textarea {
  position: relative;
  background: transparent;
  z-index: 2;
}
```

## Usage Examples

### 1. Vanilla JavaScript (Easiest - Auto-attach)

```html
<!DOCTYPE html>
<html>
<head>
  <script type="module">
    import { AutocompleteTextController, attachAutocomplete } from './engine/index.js';
    
    const completionList = "hello\nworld\nhi there";
    const controller = new AutocompleteTextController(completionList);
    
    const input = document.getElementById('myInput');
    attachAutocomplete(input, controller);
    // That's it! The overlay is created automatically.
  </script>
</head>
<body>
  <input id="myInput" type="text" />
</body>
</html>
```

The `attachAutocomplete` function automatically:
- Wraps your input in a container
- Creates the overlay
- Attaches event handlers
- Injects the CSS

### 2. Vanilla JavaScript (Manual - Full Control)

```html
<!DOCTYPE html>
<html>
<head>
  <style>
    /* Include the standard CSS from above */
    .autocomplete-wrapper { position: relative; }
    .autocomplete-overlay { position: absolute; /* ... */ }
    /* ... */
  </style>
  <script type="module">
    import { AutocompleteTextController } from './engine/index.js';
    
    const completionList = "hello\nworld\nhi there";
    const controller = new AutocompleteTextController(completionList);
    
    const input = document.getElementById('myInput');
    const overlay = document.getElementById('overlay');
    
    // Set ref
    controller.setInputRef({ current: input });
    
    // Update overlay
    const updateOverlay = () => {
      overlay.innerHTML = `
        <span>${controller.text}</span>
        ${controller.suggestion ? `<span class="autocomplete-suggestion">${controller.suggestion}</span>` : ''}
      `;
    };
    
    // Subscribe to changes
    controller.subscribe(updateOverlay);
    
    // Attach handlers
    input.addEventListener('input', (e) => {
      controller.handleTextChange(e.target.value);
      updateOverlay();
    });
    
    input.addEventListener('keydown', (e) => {
      controller.handleKeyPress(e);
      updateOverlay();
    });
  </script>
</head>
<body>
  <div class="autocomplete-wrapper">
    <input id="myInput" type="text" />
    <div id="overlay" class="autocomplete-overlay"></div>
  </div>
</body>
</html>
```

### 3. React (Web - Standard HTML Inputs)

```tsx
import { useAutocompleteWeb } from './engine/useAutocompleteWeb';

function MyComponent() {
  const completionList = "hello\nworld\nhi there";
  const autocomplete = useAutocompleteWeb(completionList);
  
  return (
    <div className="autocomplete-wrapper">
      <input
        ref={autocomplete.inputRef}
        value={autocomplete.text}
        onChange={autocomplete.handleChange}
        onKeyDown={autocomplete.handleKeyDown}
      />
      <div className="autocomplete-overlay">
        {autocomplete.text}
        {autocomplete.suggestion && (
          <span className="autocomplete-suggestion">
            {autocomplete.suggestion}
          </span>
        )}
      </div>
    </div>
  );
}
```

### 4. React (Auto-attach with attachAutocomplete)

```tsx
import { useEffect, useRef } from 'react';
import { AutocompleteTextController, attachAutocomplete } from './engine/index';

function MyComponent() {
  const inputRef = useRef<HTMLInputElement>(null);
  const controllerRef = useRef<AutocompleteTextController | null>(null);
  
  useEffect(() => {
    if (inputRef.current && !controllerRef.current) {
      const completionList = "hello\nworld\nhi there";
      const controller = new AutocompleteTextController(completionList);
      controllerRef.current = controller;
      
      const cleanup = attachAutocomplete(inputRef.current, controller);
      return cleanup;
    }
  }, []);
  
  return <input ref={inputRef} type="text" />;
}
```

### 5. Vue 3

```vue
<template>
  <div class="autocomplete-wrapper">
    <input
      ref="inputRef"
      :value="text"
      @input="handleInput"
      @keydown="handleKeyDown"
    />
    <div class="autocomplete-overlay">
      {{ text }}<span class="autocomplete-suggestion">{{ suggestion }}</span>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue';
import { AutocompleteTextController } from './engine/index';

const completionList = "hello\nworld\nhi there";
const controller = new AutocompleteTextController(completionList);
const inputRef = ref(null);
const text = ref('');
const suggestion = ref('');

const updateState = () => {
  text.value = controller.text;
  suggestion.value = controller.suggestion;
};

onMounted(() => {
  controller.setInputRef(inputRef);
  const unsubscribe = controller.subscribe(updateState);
  
  const handleInput = (e) => {
    controller.handleTextChange(e.target.value);
    updateState();
  };
  
  const handleKeyDown = (e) => {
    controller.handleKeyPress(e);
    updateState();
  };
  
  inputRef.value.addEventListener('input', handleInput);
  inputRef.value.addEventListener('keydown', handleKeyDown);
  
  onUnmounted(() => {
    unsubscribe();
    inputRef.value?.removeEventListener('input', handleInput);
    inputRef.value?.removeEventListener('keydown', handleKeyDown);
  });
});
</script>
```

### 6. React Native (Existing Pattern)

For React Native, use the existing `AutocompleteInput` component or create your own overlay using the same pattern with `View` and `Text` components positioned absolutely.

## Key Points

1. **The controller is framework-agnostic** - it's just a JavaScript class
2. **The CSS pattern is standard** - works everywhere HTML/CSS works
3. **You can use `attachAutocomplete()`** for zero-configuration setup
4. **Or build it manually** for full control over styling and behavior
5. **The overlay must match input styles** - font, padding, border, etc.
6. **Input must be `background: transparent`** so overlay shows through
7. **Overlay must be `pointer-events: none`** so clicks pass through

## API Reference

### `attachAutocomplete(inputElement, controller, options?)`

Automatically attaches autocomplete to any HTML input/textarea.

- **inputElement**: `HTMLInputElement | HTMLTextAreaElement`
- **controller**: `AutocompleteTextController`
- **options**: Optional configuration
  - `wrapperClass`: CSS class for wrapper (default: `'autocomplete-wrapper'`)
  - `overlayClass`: CSS class for overlay (default: `'autocomplete-overlay'`)
  - `suggestionClass`: CSS class for suggestion text (default: `'autocomplete-suggestion'`)
  - `customStyles`: Additional CSS to inject

Returns a cleanup function to detach.

### `useAutocompleteWeb(completionList, options?)`

React hook for standard HTML inputs. Returns handlers and state you can use with any input element.

