<template>
  <div class="mode-selection">
    <h2>ゲームモード選択</h2>
    <div class="mode-options">
      <div
        v-for="(mode, index) in gameModes"
        :key="index"
        class="mode-option"
        :class="{ 'selected': selectedMode === mode.id }"
        @click="selectMode(mode.id)"
      >
        <div class="mode-icon">{{ mode.icon }}</div>
        <div class="mode-name">{{ mode.name }}</div>
        <div class="mode-description">{{ mode.description }}</div>
      </div>
    </div>
    <button
      class="start-game-button"
      :disabled="!selectedMode"
      @click="startGame"
    >
      ゲームを開始
    </button>
  </div>
</template>

<script>
export default {
  name: 'ModeSelection',
  data() {
    return {
      selectedMode: null,
      gameModes: [
        {
          id: 'offline',
          name: 'オフラインマッチモード',
          description: 'ローカルの別のプレイヤーと対戦します',
          icon: '👥'
        },
        {
          id: 'cpu-weak',
          name: 'CPU (弱)',
          description: '弱いレベルのCPU対戦相手と対戦します',
          icon: '🤖'
        },
        {
          id: 'cpu-normal',
          name: 'CPU (普通)',
          description: '普通のレベルのCPU対戦相手と対戦します',
          icon: '🤖'
        },
        {
          id: 'cpu-strong',
          name: 'CPU (強)',
          description: '強いレベルのCPU対戦相手と対戦します',
          icon: '🤖'
        }
      ]
    }
  },
  methods: {
    /**
     * モードを選択する
     * @param {string} modeId - 選択されたモードのID
     */
    selectMode(modeId) {
      this.selectedMode = modeId
    },

    /**
     * 選択されたモードでゲームを開始する
     */
    startGame() {
      if (this.selectedMode) {
        this.$emit('mode-selected', this.selectedMode)
      }
    }
  }
}
</script>

<style scoped>
.mode-selection {
  max-width: 800px;
  margin: 0 auto;
  padding: 20px;
  background-color: #2c3e50;
  border-radius: 8px;
  color: #ecf0f1;
}

h2 {
  text-align: center;
  margin-bottom: 30px;
  color: #ecf0f1;
}

.mode-options {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 20px;
  margin-bottom: 30px;
}

.mode-option {
  background-color: rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  padding: 20px;
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
}

.mode-option:hover {
  background-color: rgba(255, 255, 255, 0.2);
  transform: translateY(-5px);
}

.mode-option.selected {
  background-color: #3498db;
  box-shadow: 0 0 15px rgba(52, 152, 219, 0.5);
}

.mode-icon {
  font-size: 2.5em;
  margin-bottom: 10px;
}

.mode-name {
  font-size: 1.2em;
  font-weight: bold;
  margin-bottom: 10px;
}

.mode-description {
  font-size: 0.9em;
  color: rgba(255, 255, 255, 0.8);
}

.start-game-button {
  display: block;
  width: 200px;
  margin: 0 auto;
  padding: 12px 20px;
  background-color: #27ae60;
  color: white;
  border: none;
  border-radius: 4px;
  font-size: 1.1em;
  cursor: pointer;
  transition: background-color 0.3s;
}

.start-game-button:hover:not(:disabled) {
  background-color: #2ecc71;
}

.start-game-button:disabled {
  background-color: #95a5a6;
  cursor: not-allowed;
}
</style>
