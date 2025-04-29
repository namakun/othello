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
    // プレイヤーが白を選択した場合、CPUは黒で先手になる
    if (coreRef.value.isCpuTurn()) {
      // CPUの手番が正しく設定されていることを確認
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

    // ViewBoardから表示用データを取得
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const cellState = coreRef.value.animationManager.getCellState(r, c);
        board[r][c] = cellState.owner;
      }
    }

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
  async function restart(color = playerColor.value) {
    coreRef.value.reset(color);

    // リセット後、CPUが先手（黒）の場合は自動着手
    // プレイヤーが白を選択した場合、CPUは黒で先手になる
    if (coreRef.value.isCpuTurn()) {
      // CPUの手番が正しく設定されていることを確認
      const move = await coreRef.value.cpuManager.selectMove();
      if (move) await coreRef.value.placePiece(move.row, move.col);
    }
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
