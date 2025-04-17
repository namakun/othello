<template>
  <div class="game-board">
    <div v-if="gameState" class="game-board">
      <div class="game-header">
        <div class="mode-info">
          <span class="mode-label">モード:</span>
          <span class="mode-value">{{ gameState.getModeName() }}</span>
        </div>
      </div>

      <!-- 色選択ダイアログ -->
      <div v-if="showColorSelection && gameState.isCpuMode()" class="color-selection-overlay">
        <ColorSelection :selected-color="playerColorInGame" @color-selected="onColorSelected" />
      </div>

      <!-- プレイヤー情報 -->
      <!-- 上部プレイヤー情報（オフラインモード：常に白、CPUモード：対戦相手） -->
      <div class="player-info opponent">
        <div class="player-piece" :class="{ active: isCpuTurn }">
          <div class="piece" :class="pieceClasses(opponentColor)"></div>
        </div>
        <div class="player-score">{{ colorLabel(opponentColor) }}: {{ opponentScore }}</div>
      </div>

      <!-- ゲームボード -->
      <div class="board">
        <div v-for="row in 8" :key="row - 1" class="board-row">
          <div v-for="col in 8" :key="col - 1" class="board-cell" :class="getCellClasses(row - 1, col - 1)" @click="handleCellClick({ row: row - 1, col: col - 1 })">
            <div v-if="hasPiece({ row: row - 1, col: col - 1 })" class="piece" :class="cellPieceClasses({ row: row - 1, col: col - 1 })" :style="getPieceStyle(row - 1, col - 1)"></div>
            <div v-if="isValidMove(row - 1, col - 1)" class="valid-move-indicator"></div>
          </div>
        </div>
      </div>

      <!-- プレイヤー情報 -->
      <!-- 下部プレイヤー情報（オフラインモード：常に黒、CPUモード：プレイヤー） -->
      <div class="player-info current-player">
        <div class="player-piece" :class="{ active: isPlayerTurn }">
          <div class="piece" :class="pieceClasses(playerColorInGame)"></div>
        </div>
        <div class="player-score">{{ colorLabel(playerColorInGame) }}: {{ playerScore }}</div>
      </div>

      <!-- ゲーム情報 -->
      <div class="game-info">
        <div class="status-message" :class="{ 'status-pass': gameState?.showPassMessage }">
          <div v-if="gameState?.showPassMessage" class="pass-message">{{ currentPlayerLabel }}の手番をスキップします</div>
          <div v-else-if="gameState?.isGameOver" class="game-over">ゲーム終了！ 勝者: {{ winnerLabel }}</div>
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

const { gameState, showColorSelection, playerColorInGame, opponentColor, isCpuTurn, isPlayerTurn, currentPlayerLabel, winnerLabel, playerScore, opponentScore, initializeGame, handleRestart, handleColorSelected, isValidMove, handleCellClick, hasPiece, pieceClasses, cellPieceClasses, colorLabel, getCellClasses, getPieceStyle } = useGameBoard(
  props.gameMode,
  toRef(props, "playerColor")
);

// 色選択時のラッパー関数
function onColorSelected(color) {
  handleColorSelected(color);
  emit("update:playerColor", color);
}

// メニューに戻るラッパー関数
function returnToMenu() {
  emit("return-to-menu");
}

onMounted(initializeGame);
</script>

<style scoped>
@import "../assets/styles/GameBoard.css";
</style>
