/**
 * src/composables/useGameUI.js
 * UI表示に必要な派生値・CSSクラス・ラベルなどを提供するコンポジション関数
 */
import { computed } from "vue";

/**
 * UI表示に必要な値を提供するコンポジション関数
 * @param {{
 *   core:          import("./useGameCore").CoreRef,
 *   displayBoard:  import("./useGameCore").DisplayBoardRef,
 *   activePlayer:  import("./useGameCore").ActivePlayerRef,
 *   isCpuThinking: import("./useGameCore").CpuThinkingRef,
 * }} gameCore - useGameCoreが返すオブジェクト
 * @param {import("vue").Ref<boolean>} showHints - ヒント表示フラグ
 * @returns {Object} UI関連の状態と操作メソッド
 */
export function useGameUI(gameCore, showHints) {
  const { core, displayBoard, activePlayer, isCpuThinking } = gameCore;

  /**
   * スコア関連の計算値
   */
  const blackScore = computed(() => core.value?.score().black ?? 2);
  const whiteScore = computed(() => core.value?.score().white ?? 2);

  /**
   * 色を日本語ラベルに変換
   * @param {string} color 色（"black"/"white"/"draw"）
   * @returns {string} 日本語ラベル
   */
  function colorLabel(color) {
    return { black: "黒", white: "白", draw: "引き分け" }[color] ?? "不明";
  }

  /**
   * 現在の手番プレイヤーのラベル
   */
  const currentPlayerLabel = computed(() => {
    /**
     * CPUの思考中でも、実際のアクティブプレイヤーの色を表示
     */
    return colorLabel(activePlayer.value);
  });

  /**
   * 勝者のラベル
   */
  const winnerLabel = computed(() => {
    const w = core.value?.winner;
    return w ? colorLabel(w) : "";
  });

  /**
   * 指定位置が合法手かどうかを判定
   * @param {number} row 行
   * @param {number} col 列
   * @returns {boolean} 合法手の場合true
   */
  function isValidMove(row, col) {
    /**
     * CPUの思考中（CPUの手番）の場合は合法手を表示しない
     */
    if (!showHints.value || core.value?.isGameOver || isCpuThinking.value) return false;
    return core.value?.isValidMove(row, col) ?? false;
  }

  /**
   * 駒の色に対応するCSSクラスを返す
   * @param {string} color 色（"black"/"white"）
   * @returns {Object} CSSクラスオブジェクト
   */
  function pieceClasses(color) {
    return {
      "piece-black": color === "black",
      "piece-white": color === "white",
    };
  }

  /**
   * セルのCSSクラスを返す
   * @param {number} row 行
   * @param {number} col 列
   * @returns {Object} CSSクラスオブジェクト
   */
  function getCellClasses(row, col) {
    return { "valid-move": isValidMove(row, col) };
  }

  /**
   * 駒コンテナのCSSクラスを返す
   * @param {{row: number, col: number}} 座標
   * @returns {Object} CSSクラスオブジェクト
   */
  function getPieceContainerClasses({ row, col }) {
    if (!core.value) return {};

    /**
     * ViewBoardからセル状態を取得
     */
    const cellState = core.value.animationManager.getCellState(row, col);

    /**
     * 反転中ならflippingクラスを追加
     */
    return {
      "flipping": cellState.flipping
    };
  }

  /**
   * 表面の駒のCSSクラスを返す
   * @param {{row: number, col: number}} 座標
   * @returns {Object} CSSクラスオブジェクト
   */
  function getFrontPieceClasses({ row, col }) {
    if (!core.value) return {};

    /**
     * ViewBoardからセル状態を取得
     */
    const cellState = core.value.animationManager.getCellState(row, col);

    /**
     * 表面の色に対応するクラス
     */
    return pieceClasses(cellState.owner);
  }

  /**
   * 裏面の駒のCSSクラスを返す
   * @param {{row: number, col: number}} 座標
   * @returns {Object} CSSクラスオブジェクト
   */
  function getBackPieceClasses({ row, col }) {
    if (!core.value) return {};

    /**
     * ViewBoardからセル状態を取得
     */
    const cellState = core.value.animationManager.getCellState(row, col);

    /**
     * 裏面の色（反転後の色）に対応するクラス
     * 反転中でなければ表面と同じ色を使用
     */
    const color = cellState.target || cellState.owner;
    return pieceClasses(color);
  }

  /**
   * 指定位置に駒があるかどうかを判定
   * @param {{row: number, col: number}} 座標
   * @returns {boolean} 駒がある場合true
   */
  function hasPiece({ row, col }) {
    return !!displayBoard.value[row][col];
  }

  /**
   * 公開するプロパティとメソッド
   */
  return {
    // 状態
    displayBoard,
    blackScore,
    whiteScore,
    currentPlayerLabel,
    winnerLabel,

    // ユーティリティ
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
