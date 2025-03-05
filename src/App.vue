<template>
  <div class="app">
    <h1>オセロゲーム</h1>
    <div class="game-container">
      <ModeSelection
        v-if="currentScreen === 'mode-selection'"
        @mode-selected="handleModeSelected"
      />
      <GameBoard
        v-else
        :gameMode="selectedMode"
        @return-to-menu="returnToModeSelection"
      />
    </div>
  </div>
</template>

<script>
import GameBoard from './components/GameBoard.vue'
import ModeSelection from './components/ModeSelection.vue'

export default {
  name: 'App',
  components: {
    GameBoard,
    ModeSelection
  },
  data() {
    return {
      currentScreen: 'mode-selection', // 'mode-selection' または 'game'
      selectedMode: null // 選択されたゲームモード
    }
  },
  methods: {
    /**
     * モード選択時の処理
     * @param {string} mode - 選択されたモード
     */
    handleModeSelected(mode) {
      this.selectedMode = mode
      this.currentScreen = 'game'
    },

    /**
     * メニューに戻る処理
     */
    returnToModeSelection() {
      this.currentScreen = 'mode-selection'
    }
  }
}
</script>

<style>
.app {
  font-family: Arial, sans-serif;
  text-align: center;
  padding: 20px;
  color: #333;
  min-height: 100vh;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  background-color: #f5f6fa;
}

.game-container {
  display: flex;
  justify-content: center;
  align-items: flex-start;
  margin-top: 20px;
  flex: 1;
}

h1 {
  color: #333;
  margin: 0 0 20px 0;
  font-size: 2.5em;
}

/* ページ全体のリセット */
body {
  margin: 0;
  padding: 0;
}
</style>
