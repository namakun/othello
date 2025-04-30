<!--
  src/components/GameBoard.vue
  オセロゲームのメインボード画面コンポーネント
-->
<template>
  <div class="game-board">
    <!-- CPU 色選択ダイアログ -->
    <div v-if="showColorSelection" class="color-selection-overlay">
      <ColorSelection :selected-color="playerColorInGame" @color-selected="onColorSelected" />
    </div>

    <!-- 相手プレイヤー情報 -->
    <div class="player-info opponent">
      <div class="player-piece" :class="{ active: isCpuThinking }">
        <div class="piece" :class="pieceClasses(opponentColor)" />
      </div>
      <div class="player-score">
        <span class="score-label">{{ colorLabel(opponentColor) }}：</span>
        <span class="score-value">{{ opponentScore }}</span>
      </div>
    </div>

    <!-- 盤面（8x8のグリッド） -->
    <div class="board">
      <div v-for="row in 8" :key="row" class="board-row">
        <div v-for="col in 8"
             :key="col"
             class="board-cell"
             :class="getCellClasses(row - 1, col - 1)"
             @click="handleCellClick({ row: row - 1, col: col - 1 })">
          <!-- 駒（2層構造で反転アニメーションを実現） -->
          <div v-if="hasPiece({ row: row - 1, col: col - 1 })"
               class="piece-container"
               :class="getPieceContainerClasses({ row: row - 1, col: col - 1 })">
            <div class="piece front" :class="getFrontPieceClasses({ row: row - 1, col: col - 1 })"></div>
            <div class="piece back" :class="getBackPieceClasses({ row: row - 1, col: col - 1 })"></div>
          </div>
          <!-- 合法手インジケータ（ヒント表示） -->
          <div v-if="isValidMove(row - 1, col - 1) && showHints" class="valid-move-indicator" />
        </div>
      </div>
    </div>

    <!-- 自分プレイヤー情報 -->
    <div class="player-info current-player">
      <div class="player-piece" :class="{ active: !isCpuThinking }">
        <div class="piece" :class="pieceClasses(playerColorInGame)" />
      </div>
      <div class="player-score">
        <span class="score-label">{{ colorLabel(playerColorInGame) }}：</span>
        <span class="score-value">{{ playerScore }}</span>
      </div>
    </div>

    <!-- ゲーム状態表示とボタン -->
    <div class="game-info">
      <!-- ステータスメッセージ -->
      <div class="status-message" :class="{ 'status-pass': showPassMessage, 'status-reset': isResetting }">
        <template v-if="isResetting">
          <span class="reset-message">リセット中...</span>
        </template>
        <template v-else-if="showPassMessage"> {{ passPlayerLabel }} の手番をスキップします </template>
        <template v-else-if="isGameOver">
          <span class="game-over">ゲーム終了！ 勝者: {{ winnerLabel }}</span>
        </template>
        <template v-else>
          現在の手番: {{ currentPlayerLabel }}
          <span v-if="isCpuThinking">(CPU思考中…)</span>
        </template>
      </div>

      <!-- 操作ボタン -->
      <div class="button-container">
        <button class="restart-button" @click="handleRestart">ゲームをリセット</button>
        <button class="menu-button" @click="returnToMenu">メニューに戻る</button>
      </div>
    </div>
  </div>
</template>

<script setup>
/**
 * オセロゲームのメインボード画面コンポーネント
 * 盤面表示、駒の配置、ゲーム状態の表示を担当
 */
import { onMounted, toRef } from "vue";
import { useGameBoard } from "@/composables/useGameBoard";
import ColorSelection from "@/components/ColorSelection.vue";

/**
 * プロパティ定義
 */
const props = defineProps({
  /**
   * ゲームモード
   * @type {string}
   */
  gameMode: {
    type: String,
    default: "local"
  },

  /**
   * プレイヤーの色
   * @type {string|null}
   */
  playerColor: {
    type: String,
    default: null
  },
});

/**
 * イベント定義
 */
const emit = defineEmits(["update:playerColor", "return-to-menu"]);

/**
 * useGameBoardコンポジションから状態と操作を取得
 */
const {
  // 状態
  showHints,
  showColorSelection,
  playerColorInGame,
  opponentColor,
  currentPlayerLabel,
  winnerLabel,
  playerScore,
  opponentScore,
  isCpuThinking,
  isGameOver,
  showPassMessage,
  passPlayerLabel,
  isResetting,

  // ヘルパー関数
  isValidMove,
  hasPiece,
  pieceClasses,
  colorLabel,
  getCellClasses,
  getPieceContainerClasses,
  getFrontPieceClasses,
  getBackPieceClasses,

  // アクション
  initializeGame,
  handleCellClick,
  handleRestart,
  handleColorSelected,
} = useGameBoard(props.gameMode, toRef(props, "playerColor"));

/**
 * 色選択時の処理
 * @param {string} color 選択された色
 */
async function onColorSelected(color) {
  await handleColorSelected(color);
  emit("update:playerColor", color);
}

/**
 * メニューに戻る処理
 */
function returnToMenu() {
  emit("return-to-menu");
}

/**
 * コンポーネントマウント時の初期化
 */
onMounted(initializeGame);
</script>

<!-- スタイルは外部ファイルに集約 -->
<style src="../assets/styles/GameBoard.css"></style>
