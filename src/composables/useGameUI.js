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
  /** セルの駒クラス（反転アニメ含む） */
  function cellPieceClasses({ row, col }) {
    // アニメーション中なら優先
    const flip = core.value?.animationManager.getFlippingPiece(row, col);
    if (flip) {
      return {
        [`piece-${flip.fromColor}`]: true,
        [`flipping-to-${flip.toColor}`]: true,
      };
    }
    const color = displayBoard.value[row][col];
    return { [`piece-${color}`]: Boolean(color) };
  }
  function getCellClasses(row, col) {
    return { "valid-move": isValidMove(row, col) };
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
    cellPieceClasses,
    getCellClasses,
    hasPiece,
  };
}
