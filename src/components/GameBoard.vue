<!-- File: src/components/GameBoard.vue -->
<template>
  <div class="game-board">
    <div v-if="gameState" class="game-board">
      <div v-if="showColorSelection && gameState.isCpuMode()" class="color-selection-overlay">
        <ColorSelection
          :selected-color="playerColorInGame"
          @color-selected="onColorSelected"
        />
      </div>

      <div class="player-info opponent">
        <div class="player-piece" :class="{ active: isCpuTurn }">
          <div class="piece" :class="pieceClasses(opponentColor)"></div>
        </div>
        <div class="player-score">{{ colorLabel(opponentColor) }}: {{ opponentScore }}</div>
      </div>

      <div class="board">
        <div v-for="row in 8" :key="row - 1" class="board-row">
          <div
            v-for="col in 8"
            :key="col - 1"
            class="board-cell"
            :class="getCellClasses(row - 1, col - 1)"
            @click="handleCellClick({ row: row - 1, col: col - 1 })"
          >
            <div
              v-if="hasPiece({ row: row - 1, col: col - 1 })"
              class="piece"
              :class="cellPieceClasses({ row: row - 1, col: col - 1 })"
            ></div>
            <div
              v-if="isValidMove(row - 1, col - 1)"
              class="valid-move-indicator"
            ></div>
          </div>
        </div>
      </div>

      <div class="player-info current-player">
        <div class="player-piece" :class="{ active: isPlayerTurn }">
          <div class="piece" :class="pieceClasses(playerColorInGame)"></div>
        </div>
        <div class="player-score">{{ colorLabel(playerColorInGame) }}: {{ playerScore }}</div>
      </div>

      <div class="game-info">
        <div class="status-message" :class="{ 'status-pass': gameState?.showPassMessage }">
          <div v-if="gameState?.showPassMessage" class="pass-message">
            {{ currentPlayerLabel }}の手番をスキップします
          </div>
          <div v-else-if="gameState?.isGameOver" class="game-over">
            ゲーム終了！ 勝者: {{ winnerLabel }}
          </div>
          <div v-else class="current-player">
            現在の手番: {{ currentPlayerLabel }}
            <span v-if="gameState?.isCpuThinking">(CPU思考中...)</span>
          </div>
        </div>
        <div class="button-container">
          <button class="restart-button" @click="handleRestart">ゲームをリセット</button>
          <button class="menu-button" @click="returnToMenu">メニューに戻る</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { onMounted, toRef } from "vue";
import { useGameBoard } from "@/composables/useGameBoard";
import ColorSelection from "@/components/ColorSelection.vue";

const props = defineProps({
  gameMode: { type: String, default: "offline" },
  playerColor: { type: String, default: null },
});
const emit = defineEmits(["update:playerColor", "return-to-menu"]);

const {
  gameState,
  showColorSelection,
  playerColorInGame,
  opponentColor,
  isCpuTurn,
  isPlayerTurn,
  currentPlayerLabel,
  winnerLabel,
  playerScore,
  opponentScore,
  initializeGame,
  handleRestart,
  handleColorSelected,
  isValidMove,
  handleCellClick,
  hasPiece,
  pieceClasses,
  cellPieceClasses,
  colorLabel,
  getCellClasses
} = useGameBoard(
  props.gameMode,
  toRef(props, "playerColor")
);

function onColorSelected(color) {
  handleColorSelected(color);
  emit("update:playerColor", color);
}
function returnToMenu() {
  emit("return-to-menu");
}

onMounted(initializeGame);
</script>

<style scoped>
@import "../assets/styles/GameBoard.css";

/* 反転アニメーションキー */
@keyframes flip {
  0%   { transform: rotateY(0deg); }
  49%  { transform: rotateY(90deg); background-color: var(--from); }
  50%  { background-color: var(--to); }
  100% { transform: rotateY(180deg); background-color: var(--to); }
}

.piece.flipping-to-black,
.piece.flipping-to-white {
  transform-style: preserve-3d;
  backface-visibility: hidden;
  animation: flip 500ms linear forwards;
}

.piece.flipping-to-black {
  --from: #fff;
  --to:   #000;
}

.piece.flipping-to-white {
  --from: #000;
  --to:   #fff;
}
</style>
