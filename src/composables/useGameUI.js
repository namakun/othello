// File: src/composables/useGameUI.js
import { computed, ref, watch } from "vue";

/**
 * UI だけに必要な派生値・ CSS クラス・ラベルなどをまとめる Composable
 * @param {{
 *   core:          import("./useGameCore").CoreRef,
 *   displayBoard:  import("./useGameCore").DisplayBoardRef,
 *   activePlayer:  import("./useGameCore").ActivePlayerRef,
 *   isCpuThinking: import("./useGameCore").CpuThinkingRef,
 * }} gameCore   - useGameCore が返すオブジェクト
 * @param {import("vue").Ref<boolean>} showHints - ヒント表示フラグ
 */
export function useGameUI(gameCore, showHints) {
  const { core, displayBoard, activePlayer, isCpuThinking } = gameCore;

  /* ────────── スコア ────────── */
  const blackScore = computed(() => core.value?.score().black ?? 2);
  const whiteScore = computed(() => core.value?.score().white ?? 2);

  /* ────────── プレイヤー／ラベル ────────── */
  function colorLabel(color) {
    console.log(color)
    return { black: "黒", white: "白", draw: "引き分け" }[color] ?? "不明";
  }
  const currentPlayerLabel = computed(() => colorLabel(isCpuThinking.value ? (activePlayer.value === "black" ? "white" : "black") : activePlayer.value));
  const winnerLabel = computed(() => {
    const w = core.value?.winner;
    return w ? colorLabel(w) : "";
  });

  /* ────────── 合法手判定 ────────── */
  function isValidMove(row, col) {
    if (!showHints.value || core.value?.isGameOver) return false;
    return core.value?.isValidMove(row, col) ?? false;
  }

  /* ────────── 駒・セル用クラス ────────── */
  function pieceClasses(color) {
    return {
      "piece-black": color === "black",
      "piece-white": color === "white",
    };
  }
  function getCellClasses(row, col) {
    return { "valid-move": isValidMove(row, col) };
  }

  /* ────────── 2層構造駒用クラス ────────── */
  function getPieceContainerClasses({ row, col }) {
    if (!core.value) return {};

    // ViewBoardからセル状態を取得
    const cellState = core.value.animationManager.getCellState(row, col);

    // 反転中ならflippingクラスを追加
    return {
      "flipping": cellState.flipping
    };
  }

  function getFrontPieceClasses({ row, col }) {
    if (!core.value) return {};

    // ViewBoardからセル状態を取得
    const cellState = core.value.animationManager.getCellState(row, col);

    // 表面の色に対応するクラス
    return pieceClasses(cellState.owner);
  }

  function getBackPieceClasses({ row, col }) {
    if (!core.value) return {};

    // ViewBoardからセル状態を取得
    const cellState = core.value.animationManager.getCellState(row, col);

    // 裏面の色（反転後の色）に対応するクラス
    // 反転中でなければ表面と同じ色を使用
    const color = cellState.target || cellState.owner;
    return pieceClasses(color);
  }

  /* ────────── そのセルに駒があるか ────────── */
  function hasPiece({ row, col }) {
    return !!displayBoard.value[row][col];
  }

  return {
    // state 風
    displayBoard,
    blackScore,
    whiteScore,
    currentPlayerLabel,
    winnerLabel,

    // utils
    colorLabel,
    isValidMove,
    pieceClasses,
    getCellClasses,
    getPieceContainerClasses,
    getFrontPieceClasses,
    getBackPieceClasses,
    hasPiece,
  };
}
