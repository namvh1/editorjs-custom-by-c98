/**
 * Contains keyboard and mouse events bound on each Block by Block Manager
 */
import Module from "../__module";
import * as _ from "../utils";
import SelectionUtils from "../selection";
import Flipper from "../flipper";

export const DEFAULT_TYPE_ACCEPT = [
  "paragraph",
  "list",
  "header",
  "header01",
  "header02",
  "header03",
];
/**
 *
 */
export default class BlockEvents extends Module {
  /**
   * All keydowns on Block
   *
   * @param {KeyboardEvent} event - keydown
   */
  public keydown(event: KeyboardEvent): void {
    /**
     * Run common method for all keydown events
     */
    this.beforeKeydownProcessing(event);

    /**
     * Fire keydown processor by event.keyCode
     */
    switch (event.keyCode) {
      case _.keyCodes.BACKSPACE:
        this.backspace(event);
        break;

      case _.keyCodes.ENTER:
        this.enter(event);
        break;

      case _.keyCodes.DOWN:
        if (event.shiftKey && event.metaKey) {
          const currentBlockIndex =
            this.Editor.BlocksAPI.getCurrentBlockIndex();
          const currentBlock =
            this.Editor.BlocksAPI.getBlockByIndex(currentBlockIndex);
          if (currentBlock.name === "image") {
            const nextBlock = this.Editor.BlocksAPI.getBlockByIndex(
              currentBlockIndex + 1
            );

            // If Block is last do nothing
            if (!nextBlock) {
              throw new Error(
                "Unable to move Block down since it is already the last"
              );
            }

            const nextBlockElement = nextBlock.holder;
            const nextBlockCoords = nextBlockElement.getBoundingClientRect();

            let scrollOffset = Math.abs(
              window.innerHeight - nextBlockElement.offsetHeight
            );

            /**
             * Next block ends on screen.
             * Increment scroll by next block's height to save element onscreen-position
             */
            if (nextBlockCoords.top < window.innerHeight) {
              scrollOffset = window.scrollY + nextBlockElement.offsetHeight;
            }

            window.scrollTo(0, scrollOffset);

            /** Change blocks positions */
            this.Editor.BlocksAPI.move(currentBlockIndex + 1);
          }
        }
      case _.keyCodes.RIGHT:
        this.arrowRightAndDown(event);
        break;

      case _.keyCodes.UP:
        if (event.shiftKey && event.metaKey) {
          const currentBlockIndex =
            this.Editor.BlocksAPI.getCurrentBlockIndex();
          const currentBlock =
            this.Editor.BlocksAPI.getBlockByIndex(currentBlockIndex);
          if (currentBlock.name === "image") {
            const previousBlock = this.Editor.BlocksAPI.getBlockByIndex(
              currentBlockIndex - 1
            );

            if (currentBlockIndex === 0 || !currentBlock || !previousBlock) {
              throw new Error(
                "Unable to move Block up since it is already the first"
              );
            }

            const currentBlockElement = currentBlock.holder;
            const previousBlockElement = previousBlock.holder;

            /**
             * Here is two cases:
             *  - when previous block has negative offset and part of it is visible on window, then we scroll
             *  by window's height and add offset which is mathematically difference between two blocks
             *
             *  - when previous block is visible and has offset from the window,
             *      than we scroll window to the difference between this offsets.
             */
            const currentBlockCoords =
                currentBlockElement.getBoundingClientRect(),
              previousBlockCoords =
                previousBlockElement.getBoundingClientRect();

            let scrollUpOffset;

            if (previousBlockCoords.top > 0) {
              scrollUpOffset =
                Math.abs(currentBlockCoords.top) -
                Math.abs(previousBlockCoords.top);
            } else {
              scrollUpOffset =
                Math.abs(currentBlockCoords.top) + previousBlockCoords.height;
            }

            window.scrollBy(0, -1 * scrollUpOffset);

            /** Change blocks positions */
            this.Editor.BlocksAPI.move(currentBlockIndex - 1);
          }
        }
      case _.keyCodes.LEFT:
        this.arrowLeftAndUp(event);
        break;

      case _.keyCodes.TAB:
        this.tabPressed(event);
        break;
    }
  }

  /**
   * Fires on keydown before event processing
   *
   * @param {KeyboardEvent} event - keydown
   */
  public beforeKeydownProcessing(event: KeyboardEvent): void {
    /**
     * Do not close Toolbox on Tabs or on Enter with opened Toolbox
     */
    if (!this.needToolbarClosing(event)) {
      return;
    }

    /**
     * When user type something:
     *  - close Toolbar
     *  - close Conversion Toolbar
     *  - clear block highlighting
     */
    if (_.isPrintableKey(event.keyCode)) {
      this.Editor.Toolbar.close();
      this.Editor.ConversionToolbar.close();

      /**
       * Allow to use shortcuts with selected blocks
       *
       * @type {boolean}
       */
      const isShortcut =
        event.ctrlKey || event.metaKey || event.altKey || event.shiftKey;

      if (!isShortcut) {
        this.Editor.BlockManager.clearFocused();
        this.Editor.BlockSelection.clearSelection(event);
      }
    }
  }

  /**
   * Key up on Block:
   * - shows Inline Toolbar if something selected
   * - shows conversion toolbar with 85% of block selection
   *
   * @param {KeyboardEvent} event - keyup event
   */
  public keyup(event: KeyboardEvent): void {
    /**
     * If shift key was pressed some special shortcut is used (eg. cross block selection via shift + arrows)
     */
    if (event.shiftKey) {
      return;
    }

    /**
     * Check if editor is empty on each keyup and add special css class to wrapper
     */
    this.Editor.UI.checkEmptiness();
  }

  /**
   * Open Toolbox to leaf Tools
   *
   * @param {KeyboardEvent} event - tab keydown event
   */
  public tabPressed(event): void {
    /**
     * Clear blocks selection by tab
     */
    event.preventDefault();
    this.Editor.BlockSelection.clearSelection(event);

    const { BlockManager, InlineToolbar, ConversionToolbar } = this.Editor;
    const currentBlock = BlockManager.currentBlock;

    if (!currentBlock) {
      return;
    }

    const isEmptyBlock = currentBlock.isEmpty;
    const canOpenToolbox = currentBlock.tool.isDefault && isEmptyBlock;
    const conversionToolbarOpened = !isEmptyBlock && ConversionToolbar.opened;
    const inlineToolbarOpened =
      !isEmptyBlock && !SelectionUtils.isCollapsed && InlineToolbar.opened;
    const canOpenBlockTunes = !conversionToolbarOpened && !inlineToolbarOpened;

    /**
     * For empty Blocks we show Plus button via Toolbox only for default Blocks
     */
    if (canOpenToolbox) {
      this.activateToolbox();
    } else if (canOpenBlockTunes) {
      this.activateBlockSettings();
    }
  }

  /**
   * Add drop target styles
   *
   * @param {DragEvent} event - drag over event
   */
  public dragOver(event: DragEvent): void {
    const block = this.Editor.BlockManager.getBlockByChildNode(
      event.target as Node
    );

    block.dropTarget = true;
  }

  /**
   * Remove drop target style
   *
   * @param {DragEvent} event - drag leave event
   */
  public dragLeave(event: DragEvent): void {
    const block = this.Editor.BlockManager.getBlockByChildNode(
      event.target as Node
    );

    block.dropTarget = false;
  }

  /**
   * Copying selected blocks
   * Before putting to the clipboard we sanitize all blocks and then copy to the clipboard
   *
   * @param {ClipboardEvent} event - clipboard event
   */
  public handleCommandC(event: ClipboardEvent): void {
    const { BlockSelection } = this.Editor;

    if (!BlockSelection.anyBlockSelected) {
      return;
    }

    // Copy Selected Blocks
    BlockSelection.copySelectedBlocks(event);
  }

  /**
   * Copy and Delete selected Blocks
   *
   * @param {ClipboardEvent} event - clipboard event
   */
  public handleCommandX(event: ClipboardEvent): void {
    const { BlockSelection, BlockManager, Caret } = this.Editor;

    if (!BlockSelection.anyBlockSelected) {
      return;
    }

    BlockSelection.copySelectedBlocks(event).then(() => {
      const selectionPositionIndex = BlockManager.removeSelectedBlocks();

      /**
       * Insert default block in place of removed ones
       */
      const insertedBlock = BlockManager.insertDefaultBlockAtIndex(
        selectionPositionIndex,
        true
      );

      Caret.setToBlock(insertedBlock, Caret.positions.START);

      /** Clear selection */
      BlockSelection.clearSelection(event);
    });
  }

  /**
   * ENTER pressed on block
   *
   * @param {KeyboardEvent} event - keydown
   */
  private enter(event: KeyboardEvent): void {
    const { BlockManager, UI } = this.Editor;
    const currentBlock = BlockManager.currentBlock;

    /**
     * Don't handle Enter keydowns when Tool sets enableLineBreaks to true.
     * Uses for Tools like <code> where line breaks should be handled by default behaviour.
     */
    if (currentBlock.tool.isLineBreaksEnabled) {
      return;
    }

    /**
     * Opened Toolbars uses Flipper with own Enter handling
     * Allow split block when no one button in Flipper is focused
     */
    if (UI.someToolbarOpened && UI.someFlipperButtonFocused) {
      return;
    }

    /**
     * Allow to create line breaks by Shift+Enter
     */
    if (event.shiftKey) {
      return;
    }

    let newCurrent = this.Editor.BlockManager.currentBlock;

    /**
     * If enter has been pressed at the start of the text, just insert paragraph Block above
     */
    if (
      this.Editor.Caret.isAtStart &&
      !this.Editor.BlockManager.currentBlock.hasMedia
    ) {
      if (this.Editor.BlockManager.currentBlock.name === "list") {
        newCurrent = this.Editor.BlockManager.insertDefaultBlockAtIndex(
          this.Editor.BlockManager.currentBlockIndex,
          false,
          this.config.defaultBlock
        );
      } else {
        this.Editor.BlockManager.insertDefaultBlockAtIndex(
          this.Editor.BlockManager.currentBlockIndex
        );
      }

      /**
       * If caret is at very end of the block, just append the new block without splitting
       * to prevent unnecessary dom mutation observing
       */
    } else if (this.Editor.Caret.isAtEnd) {
      if (this.Editor.BlockManager.currentBlock.name === "list") {
        newCurrent = this.Editor.BlockManager.insertDefaultBlockAtIndex(
          this.Editor.BlockManager.currentBlockIndex + 1,
          false,
          "list"
        );
      } else {
        newCurrent = this.Editor.BlockManager.insertDefaultBlockAtIndex(
          this.Editor.BlockManager.currentBlockIndex + 1
        );
      }
    } else {
      /**
       * Split the Current Block into two blocks
       * Renew local current node after split
       */
      const newBlockType =
        BlockManager.blocks[BlockManager.currentBlockIndex].name;

      newCurrent = this.Editor.BlockManager.split(
        DEFAULT_TYPE_ACCEPT.includes(newBlockType) ? newBlockType : "paragraph"
      );
    }

    this.Editor.Caret.setToBlock(newCurrent);

    /**
     * Show Toolbar
     */
    this.Editor.Toolbar.moveAndOpen(newCurrent);

    event.preventDefault();
  }

  /**
   * Handle backspace keydown on Block
   *
   * @param {KeyboardEvent} event - keydown
   */
  private backspace(event: KeyboardEvent): void {
    const { BlockManager, BlockSelection, Caret } = this.Editor;
    const currentBlock = BlockManager.currentBlock;
    const tool = currentBlock.tool;

    /**
     * Check if Block should be removed by current Backspace keydown
     */
    if (
      currentBlock.selected ||
      (currentBlock.isEmpty &&
        currentBlock.currentInput === currentBlock.firstInput)
    ) {
      event.preventDefault();

      const index = BlockManager.currentBlockIndex;

      if (
        BlockManager.previousBlock &&
        BlockManager.previousBlock.inputs.length === 0 &&
        (BlockManager.previousBlock.name === "image" ||
          BlockManager.previousBlock.name === "gallery")
      ) {
        /** If previous block doesn't contain inputs, remove it */
        BlockManager.removeBlock(index - 1);
      } else {
        /** If block is empty, just remove it */
        BlockManager.removeBlock();
      }

      Caret.setToBlock(
        BlockManager.currentBlock,
        index ? Caret.positions.END : Caret.positions.START
      );

      /** Close Toolbar */
      this.Editor.Toolbar.close();

      /** Clear selection */
      BlockSelection.clearSelection(event);

      return;
    }

    /**
     * Don't handle Backspaces when Tool sets enableLineBreaks to true.
     * Uses for Tools like <code> where line breaks should be handled by default behaviour.
     *
     * But if caret is at start of the block, we allow to remove it by backspaces
     */
    if (tool.isLineBreaksEnabled && !Caret.isAtStart) {
      return;
    }

    const isFirstBlock = BlockManager.currentBlockIndex === 0;
    const canMergeBlocks =
      Caret.isAtStart &&
      SelectionUtils.isCollapsed &&
      currentBlock.currentInput === currentBlock.firstInput &&
      !isFirstBlock;

    if (canMergeBlocks) {
      /**
       * preventing browser default behaviour
       */
      event.preventDefault();

      /**
       * Merge Blocks
       */
      this.mergeBlocks();
    }
  }

  /**
   * Merge current and previous Blocks if they have the same type
   */
  private mergeBlocks(): void {
    const { BlockManager, Caret, Toolbar } = this.Editor;
    const targetBlock = BlockManager.previousBlock;
    const blockToMerge = BlockManager.currentBlock;

    /**
     * Blocks that can be merged:
     * 1) with the same Name
     * 2) Tool has 'merge' method
     *
     * other case will handle as usual ARROW LEFT behaviour
     */
    if (blockToMerge.name !== targetBlock.name || !targetBlock.mergeable) {
      /** If target Block doesn't contain inputs or empty, remove it */
      if (targetBlock.inputs.length === 0 || targetBlock.isEmpty) {
        BlockManager.removeBlock(BlockManager.currentBlockIndex - 1);

        Caret.setToBlock(BlockManager.currentBlock);
        Toolbar.close();

        return;
      }

      if (Caret.navigatePrevious()) {
        Toolbar.close();
      }

      return;
    }

    Caret.createShadow(targetBlock.pluginsContent);
    BlockManager.mergeBlocks(targetBlock, blockToMerge).then(() => {
      /** Restore caret position after merge */
      Caret.restoreCaret(targetBlock.pluginsContent as HTMLElement);
      targetBlock.pluginsContent.normalize();
      Toolbar.close();
    });
  }

  /**
   * Handle right and down keyboard keys
   *
   * @param {KeyboardEvent} event - keyboard event
   */
  private arrowRightAndDown(event: KeyboardEvent): void {
    const isFlipperCombination =
      Flipper.usedKeys.includes(event.keyCode) &&
      (!event.shiftKey || event.keyCode === _.keyCodes.TAB);

    /**
     * Arrows might be handled on toolbars by flipper
     * Check for Flipper.usedKeys to allow navigate by DOWN and disallow by RIGHT
     */
    if (this.Editor.UI.someToolbarOpened && isFlipperCombination) {
      return;
    }

    /**
     * Close Toolbar and highlighting when user moves cursor
     */
    this.Editor.BlockManager.clearFocused();
    this.Editor.Toolbar.close();

    const shouldEnableCBS =
      this.Editor.Caret.isAtEnd || this.Editor.BlockSelection.anyBlockSelected;

    if (
      event.shiftKey &&
      event.keyCode === _.keyCodes.DOWN &&
      shouldEnableCBS
    ) {
      this.Editor.CrossBlockSelection.toggleBlockSelectedState();

      return;
    }

    const navigateNext =
      event.keyCode === _.keyCodes.DOWN ||
      (event.keyCode === _.keyCodes.RIGHT && !this.isRtl);
    const isNavigated = navigateNext
      ? this.Editor.Caret.navigateNext()
      : this.Editor.Caret.navigatePrevious();

    if (isNavigated) {
      /**
       * Default behaviour moves cursor by 1 character, we need to prevent it
       */
      event.preventDefault();
    } else {
      /**
       * After caret is set, update Block input index
       */
      _.delay(() => {
        /** Check currentBlock for case when user moves selection out of Editor */
        if (this.Editor.BlockManager.currentBlock) {
          this.Editor.BlockManager.currentBlock.updateCurrentInput();
        }
        // eslint-disable-next-line @typescript-eslint/no-magic-numbers
      }, 20)();
    }

    /**
     * Clear blocks selection by arrows
     */
    this.Editor.BlockSelection.clearSelection(event);
  }

  /**
   * Handle left and up keyboard keys
   *
   * @param {KeyboardEvent} event - keyboard event
   */
  private arrowLeftAndUp(event: KeyboardEvent): void {
    /**
     * Arrows might be handled on toolbars by flipper
     * Check for Flipper.usedKeys to allow navigate by UP and disallow by LEFT
     */
    if (this.Editor.UI.someToolbarOpened) {
      if (
        Flipper.usedKeys.includes(event.keyCode) &&
        (!event.shiftKey || event.keyCode === _.keyCodes.TAB)
      ) {
        return;
      }

      this.Editor.UI.closeAllToolbars();
    }

    /**
     * Close Toolbar and highlighting when user moves cursor
     */
    this.Editor.BlockManager.clearFocused();
    this.Editor.Toolbar.close();

    const shouldEnableCBS =
      this.Editor.Caret.isAtStart ||
      this.Editor.BlockSelection.anyBlockSelected;

    if (event.shiftKey && event.keyCode === _.keyCodes.UP && shouldEnableCBS) {
      this.Editor.CrossBlockSelection.toggleBlockSelectedState(false);

      return;
    }

    const navigatePrevious =
      event.keyCode === _.keyCodes.UP ||
      (event.keyCode === _.keyCodes.LEFT && !this.isRtl);
    const isNavigated = navigatePrevious
      ? this.Editor.Caret.navigatePrevious()
      : this.Editor.Caret.navigateNext();

    if (isNavigated) {
      /**
       * Default behaviour moves cursor by 1 character, we need to prevent it
       */
      event.preventDefault();
    } else {
      /**
       * After caret is set, update Block input index
       */
      _.delay(() => {
        /** Check currentBlock for case when user ends selection out of Editor and then press arrow-key */
        if (this.Editor.BlockManager.currentBlock) {
          this.Editor.BlockManager.currentBlock.updateCurrentInput();
        }
        // eslint-disable-next-line @typescript-eslint/no-magic-numbers
      }, 20)();
    }

    /**
     * Clear blocks selection by arrows
     */
    this.Editor.BlockSelection.clearSelection(event);
  }

  /**
   * Cases when we need to close Toolbar
   *
   * @param {KeyboardEvent} event - keyboard event
   */
  private needToolbarClosing(event: KeyboardEvent): boolean {
    const toolboxItemSelected =
        event.keyCode === _.keyCodes.ENTER &&
        this.Editor.Toolbar.toolbox.opened,
      blockSettingsItemSelected =
        event.keyCode === _.keyCodes.ENTER && this.Editor.BlockSettings.opened,
      inlineToolbarItemSelected =
        event.keyCode === _.keyCodes.ENTER && this.Editor.InlineToolbar.opened,
      conversionToolbarItemSelected =
        event.keyCode === _.keyCodes.ENTER &&
        this.Editor.ConversionToolbar.opened,
      flippingToolbarItems = event.keyCode === _.keyCodes.TAB;

    /**
     * Do not close Toolbar in cases:
     * 1. ShiftKey pressed (or combination with shiftKey)
     * 2. When Toolbar is opened and Tab leafs its Tools
     * 3. When Toolbar's component is opened and some its item selected
     */
    return !(
      event.shiftKey ||
      flippingToolbarItems ||
      toolboxItemSelected ||
      blockSettingsItemSelected ||
      inlineToolbarItemSelected ||
      conversionToolbarItemSelected
    );
  }

  /**
   * If Toolbox is not open, then just open it and show plus button
   */
  private activateToolbox(): void {
    if (!this.Editor.Toolbar.opened) {
      this.Editor.Toolbar.moveAndOpen();
    } // else Flipper will leaf through it

    this.Editor.Toolbar.toolbox.open();
  }

  /**
   * Open Toolbar and show BlockSettings before flipping Tools
   */
  private activateBlockSettings(): void {
    if (!this.Editor.Toolbar.opened) {
      this.Editor.BlockManager.currentBlock.focused = true;
      this.Editor.Toolbar.moveAndOpen();
    }

    /**
     * If BlockSettings is not open, then open BlockSettings
     * Next Tab press will leaf Settings Buttons
     */
    if (!this.Editor.BlockSettings.opened) {
      /**
       * @todo Debug the case when we set caret to some block, hovering another block
       *       — wrong settings will be opened.
       *       To fix it, we should refactor the Block Settings module — make it a standalone class, like the Toolbox
       */
      this.Editor.BlockSettings.open();
    }
  }
}
