<template>
  <div class="app">
    <h1>オセロゲーム</h1>
    <div class="game-container">
      <ModeSelection v-if="currentScreen === 'mode-selection'" @mode-selected="handleModeSelected" />
      <GameBoard v-else :gameMode="gameConfig.mode" :playerColor="gameConfig.playerColor" @return-to-menu="returnToModeSelection" />
    </div>
  </div>
</template>

<script>
import GameBoard from "./components/GameBoard.vue";
import ModeSelection from "./components/ModeSelection.vue";

export default {
  name: "App",
  components: {
    GameBoard,
    ModeSelection,
  },
  data() {
    return {
      currentScreen: "mode-selection", // 'mode-selection' または 'game'
      gameConfig: {
        mode: null, // 選択されたゲームモード
        playerColor: null, // プレイヤーの選択した色（CPUモード時のみ使用）
      },
    };
  },
  methods: {
    /**
     * モード選択時の処理
     * @param {Object} config - 選択されたモード設定
     */
    handleModeSelected(config) {
      if (typeof config === "string") {
        // 以前の形式に対するフォールバック
        this.gameConfig = {
          mode: config,
          playerColor: null,
        };
      } else {
        // 新しい形式
        this.gameConfig = {
          mode: config.mode,
          playerColor: config.playerColor,
        };
      }
      this.currentScreen = "game";
    },

    /**
     * メニューに戻る処理
     */
    returnToModeSelection() {
      this.currentScreen = "mode-selection";
    },
  },
};
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
