/**
 * src/composables/useGameCore.js
 * GameCoreクラスのリアクティブラッパー
 */
import { ref, computed, watchEffect } from "vue";
import { wasmReady } from "@/utils/wasmLoader";
import { GameCore } from "@/utils/game/GameCore";

/**
 * GameCoreクラスをVue3のリアクティブシステムでラップする
 * @param {string} mode ゲームモード
 * @param {string|Function} initialColor 初期プレイヤー色
 * @returns {Object} ゲームコア関連の状態と操作メソッド
 */
export function useGameCore(mode, initialColor) {
  const coreRef = ref(null);
  const playerColor = ref(typeof initialColor === "function" ? initialColor() : initialColor);

  /**
   * ゲームコアの初期化
   * @returns {Promise<void>}
   */
  async function init() {
    await wasmReady.catch(() => {});
    coreRef.value = new GameCore(mode, playerColor.value);

    /**
     * CPU が先手なら自動着手
     * プレイヤーが白を選択した場合、CPUは黒で先手になる
     */
    if (coreRef.value.isCpuTurn()) {
      /**
       * CPUの手番が正しく設定されていることを確認
       */
      const move = await coreRef.value.cpuManager.selectMove();
      if (move) await coreRef.value.placePiece(move.row, move.col);
    }
  }

  /**
   * 表示用ボード配列の生成
   * @type {import('vue').ComputedRef<Array<Array<string|null>>>}
   */
  const displayBoard = computed(() => {
    if (!coreRef.value) {
      return Array.from({ length: 8 }, () => Array(8).fill(null));
    }

    const board = Array.from({ length: 8 }, () => Array(8).fill(null));

    /**
     * ViewBoardから表示用データを取得
     */
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const cellState = coreRef.value.animationManager.getCellState(r, c);
        board[r][c] = cellState.owner;
      }
    }

    return board;
  });

  /**
   * 現在の手番プレイヤー
   */
  const activePlayer = computed(() => coreRef.value?.activePlayer);

  /**
   * CPU思考中フラグ
   */
  const isCpuThinking = ref(false);

  /**
   * CPUの手番を監視して思考中フラグを更新
   */
  watchEffect(() => {
    if (!coreRef.value) return;
    isCpuThinking.value = coreRef.value.isCpuTurn();
  });

  /**
   * プレイヤーの着手を処理
   * @param {number} row 行
   * @param {number} col 列
   * @returns {Promise<void>}
   */
  async function playerMove(row, col) {
    if (!coreRef.value?.isValidMove(row, col)) return;
    await coreRef.value.placePiece(row, col);
  }

  /**
   * ゲームを再スタート
   * @param {string} color プレイヤーの色
   * @returns {Promise<void>}
   */
  async function restart(color = playerColor.value) {
    /**
     * resetメソッドが非同期なのでawaitを使用
     */
    await coreRef.value.reset(color);

    /**
     * リセット後、CPUが先手（黒）の場合は自動着手
     * プレイヤーが白を選択した場合、CPUは黒で先手になる
     */
    if (coreRef.value.isCpuTurn()) {
      /**
       * CPUの手番が正しく設定されていることを確認
       */
      const move = await coreRef.value.cpuManager.selectMove();
      if (move) await coreRef.value.placePiece(move.row, move.col);
    }
  }

  /**
   * 公開するプロパティとメソッド
   */
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
