export class KeyboardShortcuts {
  constructor(handlers) {
    this.handlers = handlers;
    this.handleKeyDown = this.handleKeyDown.bind(this);
  }

  enable() {
    document.addEventListener('keydown', this.handleKeyDown);
  }

  disable() {
    document.removeEventListener('keydown', this.handleKeyDown);
  }

  handleKeyDown(e) {
    const { ctrlKey, shiftKey, altKey, key } = e;
    const isCtrl = ctrlKey || e.metaKey; // Support both Ctrl and Cmd (Mac)

    // Prevent default for our shortcuts
    const shouldPreventDefault = () => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.isContentEditable) {
        return false; // Don't intercept when typing in input fields
      }
      return true;
    };

    // File operations
    if (isCtrl && key === 'n' && !shiftKey) {
      if (shouldPreventDefault()) {
        e.preventDefault();
        this.handlers.onNew?.();
      }
    } else if (isCtrl && key === 'o' && !shiftKey) {
      if (shouldPreventDefault()) {
        e.preventDefault();
        this.handlers.onOpen?.();
      }
    } else if (isCtrl && key === 's' && !shiftKey) {
      if (shouldPreventDefault()) {
        e.preventDefault();
        this.handlers.onSave?.();
      }
    } else if (isCtrl && shiftKey && key === 'S') {
      if (shouldPreventDefault()) {
        e.preventDefault();
        this.handlers.onSaveAs?.();
      }
    } else if (isCtrl && key === 'w') {
      if (shouldPreventDefault()) {
        e.preventDefault();
        this.handlers.onClose?.();
      }
    }

    // Edit operations
    else if (isCtrl && key === 'z' && !shiftKey) {
      if (shouldPreventDefault()) {
        e.preventDefault();
        this.handlers.onUndo?.();
      }
    } else if ((isCtrl && shiftKey && key === 'Z') || (isCtrl && key === 'y')) {
      if (shouldPreventDefault()) {
        e.preventDefault();
        this.handlers.onRedo?.();
      }
    } else if (isCtrl && key === 'c') {
      if (shouldPreventDefault() && !e.target.isContentEditable) {
        e.preventDefault();
        this.handlers.onCopy?.();
      }
    } else if (isCtrl && key === 'x') {
      if (shouldPreventDefault() && !e.target.isContentEditable) {
        e.preventDefault();
        this.handlers.onCut?.();
      }
    } else if (isCtrl && key === 'v') {
      if (shouldPreventDefault() && !e.target.isContentEditable) {
        e.preventDefault();
        this.handlers.onPaste?.();
      }
    } else if (isCtrl && key === 'a') {
      if (shouldPreventDefault()) {
        e.preventDefault();
        this.handlers.onSelectAll?.();
      }
    } else if (isCtrl && key === 'd') {
      if (shouldPreventDefault()) {
        e.preventDefault();
        this.handlers.onDeselect?.();
      }
    } else if ((key === 'Delete' || key === 'Backspace') && !e.target.isContentEditable) {
      if (shouldPreventDefault()) {
        e.preventDefault();
        this.handlers.onDelete?.();
      }
    } else if (isCtrl && key === 'j') {
      if (shouldPreventDefault()) {
        e.preventDefault();
        this.handlers.onDuplicate?.();
      }
    }

    // Layer operations
    else if (isCtrl && key === 'g' && !shiftKey) {
      if (shouldPreventDefault()) {
        e.preventDefault();
        this.handlers.onGroup?.();
      }
    } else if (isCtrl && shiftKey && key === 'G') {
      if (shouldPreventDefault()) {
        e.preventDefault();
        this.handlers.onUngroup?.();
      }
    } else if (isCtrl && key === 'e') {
      if (shouldPreventDefault()) {
        e.preventDefault();
        this.handlers.onMergeDown?.();
      }
    } else if (isCtrl && shiftKey && key === 'E') {
      if (shouldPreventDefault()) {
        e.preventDefault();
        this.handlers.onFlattenImage?.();
      }
    }

    // Transform operations
    else if (isCtrl && key === 't') {
      if (shouldPreventDefault()) {
        e.preventDefault();
        this.handlers.onTransform?.();
      }
    }

    // View operations
    else if (isCtrl && key === '0') {
      if (shouldPreventDefault()) {
        e.preventDefault();
        this.handlers.onFitScreen?.();
      }
    } else if (isCtrl && key === '1') {
      if (shouldPreventDefault()) {
        e.preventDefault();
        this.handlers.onZoomReset?.();
      }
    } else if (isCtrl && key === '+' || isCtrl && key === '=') {
      if (shouldPreventDefault()) {
        e.preventDefault();
        this.handlers.onZoomIn?.();
      }
    } else if (isCtrl && key === '-') {
      if (shouldPreventDefault()) {
        e.preventDefault();
        this.handlers.onZoomOut?.();
      }
    } else if (isCtrl && key === 'r') {
      if (shouldPreventDefault()) {
        e.preventDefault();
        this.handlers.onToggleRulers?.();
      }
    }

    // Tool shortcuts (single keys)
    else if (!isCtrl && !shiftKey && !altKey) {
      if (shouldPreventDefault()) {
        switch (key.toLowerCase()) {
          case 'v':
            e.preventDefault();
            this.handlers.onSelectTool?.('select');
            break;
          case 'm':
            e.preventDefault();
            this.handlers.onSelectTool?.('marquee');
            break;
          case 'l':
            e.preventDefault();
            this.handlers.onSelectTool?.('lasso');
            break;
          case 'w':
            e.preventDefault();
            this.handlers.onSelectTool?.('wand');
            break;
          case 'c':
            e.preventDefault();
            this.handlers.onSelectTool?.('crop');
            break;
          case 'b':
            e.preventDefault();
            this.handlers.onSelectTool?.('brush');
            break;
          case 'e':
            e.preventDefault();
            this.handlers.onSelectTool?.('eraser');
            break;
          case 'g':
            e.preventDefault();
            this.handlers.onSelectTool?.('gradient');
            break;
          case 't':
            e.preventDefault();
            this.handlers.onSelectTool?.('text');
            break;
          case 'h':
            e.preventDefault();
            this.handlers.onSelectTool?.('hand');
            break;
          case 'z':
            e.preventDefault();
            this.handlers.onSelectTool?.('zoom');
            break;
        }
      }
    }

    // Adjustment shortcuts
    else if (isCtrl && key === 'l') {
      if (shouldPreventDefault()) {
        e.preventDefault();
        this.handlers.onLevels?.();
      }
    } else if (isCtrl && key === 'm') {
      if (shouldPreventDefault()) {
        e.preventDefault();
        this.handlers.onCurves?.();
      }
    } else if (isCtrl && key === 'u') {
      if (shouldPreventDefault()) {
        e.preventDefault();
        this.handlers.onHueSaturation?.();
      }
    } else if (isCtrl && key === 'b') {
      if (shouldPreventDefault()) {
        e.preventDefault();
        this.handlers.onColorBalance?.();
      }
    } else if (isCtrl && key === 'i') {
      if (shouldPreventDefault()) {
        e.preventDefault();
        this.handlers.onInvert?.();
      }
    } else if (isCtrl && shiftKey && key === 'U') {
      if (shouldPreventDefault()) {
        e.preventDefault();
        this.handlers.onDesaturate?.();
      }
    }

    // Spacebar for pan (handled separately with mouse events)
    else if (key === ' ' && !isCtrl) {
      if (shouldPreventDefault()) {
        e.preventDefault();
        this.handlers.onSpaceDown?.();
      }
    }
  }
}
