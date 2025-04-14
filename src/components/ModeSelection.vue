<template>
  <div class="mode-selection">
    <h2>ゲームモード選択</h2>
    <div class="mode-options">
      <div
        v-for="mode in GAME_MODES"
        :key="mode.id"
        class="mode-option"
        :class="{ selected: selectedMode === mode.id }"
        @click="selectMode(mode.id)"
      >
        <div class="mode-icon">{{ mode.icon }}</div>
        <div class="mode-name">{{ mode.name }}</div>
        <div class="mode-description">{{ mode.description }}</div>
      </div>
    </div>

    <ColorSelection
      v-if="isCpuMode"
      :selected-color="playerColor"
      @color-selected="selectColor"
    />

    <button
      class="start-game-button"
      :disabled="!isValidSelection"
      @click="startGame"
    >
      ゲームを開始
    </button>
  </div>
</template>

<script>
import { GAME_MODES } from '@/constants/gameConfig';
import ColorSelection from './ColorSelection.vue';

export default {
  name: "ModeSelection",
  components: {
    ColorSelection
  },
  data() {
    return {
      selectedMode: null,
      playerColor: null,
      GAME_MODES
    };
  },
  computed: {
    /**
     * 選択されたモードがCPUモードかどうか
     * @return {boolean} CPUモードかどうか
     */
    isCpuMode() {
      return this.selectedMode && this.selectedMode.startsWith("cpu-");
    },

    /**
     * 現在の選択が有効かどうか
     * @return {boolean} 選択が有効かどうか
     */
    isValidSelection() {
      return this.selectedMode && (!this.isCpuMode || this.playerColor);
    }
  },
  methods: {
    /**
     * モードを選択する
     * @param {string} modeId - 選択されたモードのID
     */
    selectMode(modeId) {
      this.selectedMode = modeId;
      this.handleModeChange(modeId);
    },

    /**
     * モード変更時の処理
     * @param {string} modeId - 選択されたモードのID
     */
    handleModeChange(modeId) {
      if (modeId === "offline") {
        this.playerColor = null;
      } else if (!this.playerColor) {
        this.playerColor = "black";
      }
    },

    /**
     * プレイヤーの色を選択する
     * @param {string} color - 選択された色（'black'または'white'）
     */
    selectColor(color) {
      this.playerColor = color;
    },

    /**
     * 選択されたモードとプレイヤーの色でゲームを開始する
     */
    startGame() {
      if (this.isValidSelection) {
        this.$emit("mode-selected", {
          mode: this.selectedMode,
          playerColor: this.isCpuMode ? this.playerColor : null,
        });
      }
    },
  },
};
</script>

<style scoped>
@import '../assets/styles/ModeSelection.css';
</style>
