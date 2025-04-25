// File: src/composables/useGameCore.js
import { ref, computed, watchEffect } from "vue";
import { wasmReady } from "@/utils/wasmLoader";
import { GameCore } from "@/utils/game/GameCore";

/**
 * Reactive wrapper for GameCore
 * @param {string} mode
 * @param {string|Function} initialColor
 */
export function useGameCore(mode, initialColor) {
  const coreRef = ref(null);
  const playerColor = ref(typeof initialColor === "function" ? initialColor() : initialColor);

  /** 初期化 */
  async function init() {
    await wasmReady.catch(() => {});
    coreRef.value = new GameCore(mode, playerColor.value);

    // CPU が先手なら自動着手（必要に応じ実装を置き換え）
    if (coreRef.value.isCpuTurn()) {
      const move = await coreRef.value.cpuManager.selectMove();
      if (move) await coreRef.value.placePiece(move.row, move.col);
    }
  }

  /** 表示用ボード生成 */
  const displayBoard = computed(() => {
    if (!coreRef.value) {
      return Array.from({ length: 8 }, () => Array(8).fill(null));
    }
    const board = Array.from({ length: 8 }, () => Array(8).fill(null));

    // (1) 確定石
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        board[r][c] = coreRef.value.pieceAt(r, c);
      }
    }
    // (2) アニメ中の石
    coreRef.value.animationManager.flippingPieces.forEach(({ row, col, fromColor }) => {
      board[row][col] = fromColor;
    });
    // (3) 直近置石ハイライト（実色で上書き）
    const last = coreRef.value.animationManager.lastPlacedPiece;
    if (last) board[last.row][last.col] = coreRef.value.pieceAt(last.row, last.col);
    return board;
  });

  const activePlayer = computed(() => coreRef.value?.activePlayer);
  const isCpuThinking = ref(false);

  watchEffect(() => {
    if (!coreRef.value) return;
    isCpuThinking.value = coreRef.value.isCpuTurn();
  });

  /** プレイヤー着手 */
  async function playerMove(row, col) {
    if (!coreRef.value?.isValidMove(row, col)) return;
    await coreRef.value.placePiece(row, col);
  }
  /** 再スタート */
  function restart(color = playerColor.value) {
    coreRef.value.reset(color);
  }

  return {
    core: coreRef,
    displayBoard,
    activePlayer,
    isCpuThinking,

    init,
    playerMove,
    restart,
  };
}
