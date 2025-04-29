// File: src/composables/useGameBoard.js
import { ref, watch, nextTick, computed } from "vue";
import { wasmReady } from "@/utils/wasmLoader";
import { useGameCore } from "@/composables/useGameCore";
import { useGameUI } from "@/composables/useGameUI";

/**
 * 画面全体を束ねる orchestrator。
 * - 初期化 / リスタート
 * - カラー選択ダイアログ制御
 * - UI / Core を 1 つにまとめてエクスポート
 *
 * @param {"local"|"cpu-weak"|"cpu-normal"|"cpu-strong"} gameMode
 * @param {import("vue").Ref<"black"|"white">} initialPlayerColor
 */
export function useGameBoard(gameMode, initialPlayerColor) {
  /* ────────── 外部入力 watch ────────── */
  const currentPlayerColor = ref(initialPlayerColor.value);
  watch(initialPlayerColor, (v) => (currentPlayerColor.value = v));

  /* ────────── ヒント・ダイアログ ────────── */
  const showHints = ref(true);
  const showColorSelection = ref(false);

  /* ────────── Core 初期化 ────────── */
  const core = useGameCore(gameMode, currentPlayerColor);
  const ui = useGameUI(core, showHints);

  async function initializeGame() {
    await wasmReady.catch(() => {});
    showHints.value = true;
    // CPUモードで、かつプレイヤーの色が設定されていない場合のみ色選択ダイアログを表示
    showColorSelection.value = gameMode.startsWith("cpu-") && !currentPlayerColor.value;
    await core.init();
  }

  /* ────────── Player 操作 ────────── */
  async function handleCellClick({ row, col }) {
    if (!ui.isValidMove(row, col)) return;

    showHints.value = false;
    await core.playerMove(row, col);

    // プレイヤー手番に戻ったらヒント再表示
    if (!core.isCpuThinking.value && !core.core.value.showPassMessage) {
      showHints.value = true;
    }
  }

  /* ────────── 色・スコア 派生値 ────────── */
  const playerColorInGame = computed(() => {
    if (!core.core.value) return null;
    return core.core.value.isCpuMode() ? currentPlayerColor.value || "black" : core.activePlayer.value;
  });
  const opponentColor = computed(() => (playerColorInGame.value === "black" ? "white" : "black"));
  const playerScore = computed(() => (playerColorInGame.value === "black" ? ui.blackScore.value : ui.whiteScore.value));
  const opponentScore = computed(() => (playerColorInGame.value === "black" ? ui.whiteScore.value : ui.blackScore.value));

  /* ────────── 再スタート / 色選択 ────────── */
  async function handleRestart() {
    if (core.core.value.isCpuMode()) {
      showColorSelection.value = true;
    } else {
      await core.restart();
      showHints.value = true;
    }
  }
  async function handleColorSelected(color) {
    currentPlayerColor.value = color;
    showColorSelection.value = false;
    // restart関数は非同期関数なので、awaitを使用する
    // restart関数内でCPUの自動着手も行われるので、ここでは追加の処理は不要
    await core.restart(color);
    showHints.value = true;
  }

  /* ────────── expose ────────── */
  return {
    // state
    ...ui,
    activePlayer: core.activePlayer,
    isCpuThinking: core.isCpuThinking,
    playerColorInGame,
    opponentColor,
    playerScore,
    opponentScore,
    showPassMessage: core.core.value?.showPassMessage,
    isGameOver: core.core.value?.isGameOver,
    showColorSelection,
    showHints,

    // actions
    initializeGame,
    handleCellClick,
    handleRestart,
    handleColorSelected,
  };
}
