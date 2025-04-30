/**
 * src/composables/useGameBoard.js
 * 画面全体を束ねるオーケストレーター
 */
import { ref, watch, computed } from "vue";
import { wasmReady } from "@/utils/wasmLoader";
import { useGameCore } from "@/composables/useGameCore";
import { useGameUI } from "@/composables/useGameUI";

/**
 * ゲームボード全体を管理するコンポジション関数
 * - 初期化 / リスタート
 * - カラー選択ダイアログ制御
 * - UI / Core を 1 つにまとめてエクスポート
 *
 * @param {"local"|"cpu-weak"|"cpu-normal"|"cpu-strong"} gameMode ゲームモード
 * @param {import("vue").Ref<"black"|"white">} initialPlayerColor 初期プレイヤー色
 * @returns {Object} ゲームボード関連の状態と操作メソッド
 */
export function useGameBoard(gameMode, initialPlayerColor) {
  /**
   * 外部入力の監視
   */
  const currentPlayerColor = ref(initialPlayerColor.value);
  watch(initialPlayerColor, (v) => (currentPlayerColor.value = v));

  /**
   * ヒント表示とダイアログ制御
   */
  const showHints = ref(true);
  const showColorSelection = ref(false);

  /**
   * コアとUIの初期化
   */
  const core = useGameCore(gameMode, currentPlayerColor);
  const ui = useGameUI(core, showHints);

  /**
   * ゲームの初期化
   */
  async function initializeGame() {
    await wasmReady.catch(() => {});
    showHints.value = true;

    /**
     * CPUモードで、かつプレイヤーの色が設定されていない場合のみ色選択ダイアログを表示
     */
    showColorSelection.value = gameMode.startsWith("cpu-") && !currentPlayerColor.value;
    await core.init();
  }

  /**
   * セルクリック時の処理
   * @param {{row: number, col: number}} 座標
   */
  async function handleCellClick({ row, col }) {
    if (!ui.isValidMove(row, col)) return;

    showHints.value = false;
    await core.playerMove(row, col);

    /**
     * プレイヤー手番に戻ったらヒント再表示
     */
    if (!core.isCpuThinking.value && !core.core.value.showPassMessage) {
      showHints.value = true;
    }
  }

  /**
   * プレイヤーの色とスコアの派生値
   */
  const playerColorInGame = computed(() => {
    if (!core.core.value) return null;
    return core.core.value.isCpuMode() ? currentPlayerColor.value || "black" : core.activePlayer.value;
  });

  const opponentColor = computed(() => (
    playerColorInGame.value === "black" ? "white" : "black"
  ));

  const playerScore = computed(() => (
    playerColorInGame.value === "black" ? ui.blackScore.value : ui.whiteScore.value
  ));

  const opponentScore = computed(() => (
    playerColorInGame.value === "black" ? ui.whiteScore.value : ui.blackScore.value
  ));

  /**
   * ゲームのリスタート処理
   */
  async function handleRestart() {
    if (core.core.value.isCpuMode()) {
      showColorSelection.value = true;
    } else {
      await core.restart();
      showHints.value = true;
    }
  }

  /**
   * 色選択ダイアログでの色選択時の処理
   * @param {string} color 選択された色
   */
  async function handleColorSelected(color) {
    currentPlayerColor.value = color;
    showColorSelection.value = false;

    /**
     * restart関数は非同期関数なので、awaitを使用
     * restart関数内でCPUの自動着手も行われる
     */
    await core.restart(color);
    showHints.value = true;
  }

  /**
   * 追加のリアクティブ値
   */
  const showPassMessage = computed(() => core.core.value?.showPassMessage ?? false);
  const isGameOver = computed(() => core.core.value?.isGameOver ?? false);
  const winnerLabel = computed(() => ui.winnerLabel);
  const passPlayer = computed(() => core.core.value?.passPlayer);
  const passPlayerLabel = computed(() => {
    if (!passPlayer.value) return "";
    return ui.colorLabel(passPlayer.value);
  });
  const isResetting = computed(() => core.core.value?.isResetting ?? false);

  /**
   * 公開するプロパティとメソッド
   */
  return {
    // 状態
    ...ui,
    activePlayer: core.activePlayer,
    isCpuThinking: core.isCpuThinking,
    playerColorInGame,
    opponentColor,
    playerScore,
    opponentScore,
    showPassMessage,
    isGameOver,
    passPlayer,
    passPlayerLabel,
    isResetting,
    showColorSelection,
    showHints,

    // アクション
    initializeGame,
    handleCellClick,
    handleRestart,
    handleColorSelected,
  };
}
