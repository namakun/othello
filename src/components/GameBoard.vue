<!-- File: src/components/GameBoard.vue -->
<template>
  <div class="game-board">
    <!-- CPU 色選択ダイアログ -->
    <div v-if="showColorSelection" class="color-selection-overlay">
      <ColorSelection :selected-color="playerColorInGame" @color-selected="onColorSelected" />
    </div>

    <!-- 相手プレイヤー -->
    <div class="player-info opponent">
      <div class="player-piece" :class="{ active: isCpuThinking }">
        <div class="piece" :class="pieceClasses(opponentColor)" />
      </div>
      <div class="player-score">{{ colorLabel(opponentColor) }}: {{ opponentScore }}</div>
    </div>

    <!-- 盤面 -->
    <div class="board">
      <div v-for="row in 8" :key="row" class="board-row">
        <div v-for="col in 8" :key="col" class="board-cell" :class="getCellClasses(row - 1, col - 1)" @click="handleCellClick({ row: row - 1, col: col - 1 })">
          <!-- 駒（2層構造） -->
          <div v-if="hasPiece({ row: row - 1, col: col - 1 })" class="piece-container" :class="getPieceContainerClasses({ row: row - 1, col: col - 1 })">
            <div class="piece front" :class="getFrontPieceClasses({ row: row - 1, col: col - 1 })"></div>
            <div class="piece back" :class="getBackPieceClasses({ row: row - 1, col: col - 1 })"></div>
          </div>
          <!-- 合法手インジケータ -->
          <div v-if="isValidMove(row - 1, col - 1) && showHints" class="valid-move-indicator" />
        </div>
      </div>
    </div>

    <!-- 自分プレイヤー -->
    <div class="player-info current-player">
      <div class="player-piece" :class="{ active: !isCpuThinking }">
        <div class="piece" :class="pieceClasses(playerColorInGame)" />
      </div>
      <div class="player-score">{{ colorLabel(playerColorInGame) }}: {{ playerScore }}</div>
    </div>

    <!-- ゲーム情報 -->
    <div class="game-info">
      <div class="status-message" :class="{ 'status-pass': showPassMessage }">
        <template v-if="showPassMessage"> {{ currentPlayerLabel }} の手番をスキップします </template>
        <template v-else-if="isGameOver">
          <span class="game-over">ゲーム終了！ 勝者: {{ winnerLabel }}</span>
        </template>
        <template v-else>
          現在の手番: {{ currentPlayerLabel }}
          <span v-if="isCpuThinking">(CPU思考中…)</span>
        </template>
      </div>

      <div class="button-container">
        <button class="restart-button" @click="handleRestart">ゲームをリセット</button>
        <button class="menu-button" @click="returnToMenu">メニューに戻る</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { onMounted, toRef } from "vue";
import { useGameBoard } from "@/composables/useGameBoard";
import ColorSelection from "@/components/ColorSelection.vue";

/* ────────── props / emits ────────── */
const props = defineProps({
  gameMode: { type: String, default: "local" },
  playerColor: { type: String, default: null },
});
const emit = defineEmits(["update:playerColor", "return-to-menu"]);

/* ────────── useGameBoard から取得 ────────── */
const {
  /* state & UI */
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

  /* helpers */
  isValidMove,
  hasPiece,
  pieceClasses,
  colorLabel,
  getCellClasses,
  getPieceContainerClasses,
  getFrontPieceClasses,
  getBackPieceClasses,

  /* actions */
  initializeGame,
  handleCellClick,
  handleRestart,
  handleColorSelected,
} = useGameBoard(props.gameMode, toRef(props, "playerColor"));

/* ────────── local handlers ────────── */
function onColorSelected(color) {
  handleColorSelected(color);
  emit("update:playerColor", color);
}
function returnToMenu() {
  emit("return-to-menu");
}

/* ────────── lifecycle ────────── */
onMounted(initializeGame);
</script>

<!-- スタイルは外部ファイルに集約 -->
<style src="../assets/styles/GameBoard.css"></style>
