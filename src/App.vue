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
  padding: 15px;
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
  align-items: flex-start; /* 上部揃えに変更 */
  margin-top: 15px;
  flex: 1;
  width: 100%;
  overflow: hidden;
}

h1 {
  color: #333;
  margin: 0 0 15px 0;
  font-size: 2em;
}

/* ページ全体のリセット */
body {
  margin: 0;
  padding: 0;
  width: 100%;
}

html {
  height: 100%;
}

/* PC版ではスクロールを無効化、スマホ版では有効化 */
@media (min-width: 701px) {
  body, html {
    overflow: hidden;
    height: 100%;
  }
}

/* スマホ版ではスクロールを有効化 */
@media (max-width: 700px) {
  body, html {
    overflow-x: hidden;
    overflow-y: auto;
    min-height: 100%;
  }

  .app {
    min-height: 100vh;
  }
}
</style>
