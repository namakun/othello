<template>
  <div class="mode-selection">
    <h2>ゲームモード選択</h2>
    <div class="mode-options">
      <button
        v-for="mode in GAME_MODES"
        :key="mode.id"
        type="button"
        class="mode-option"
        :class="{ selected: selectedMode === mode.id }"
        @click="selectMode(mode.id)"
        :aria-pressed="selectedMode === mode.id"
      >
        <div class="mode-icon">{{ mode.icon }}</div>
        <div class="mode-name">{{ mode.name }}</div>
        <div class="mode-description">{{ mode.description }}</div>
      </button>
    </div>

    <ColorSelection
      v-if="isCpuMode"
      :selected-color="playerColor"
      @color-selected="selectColor"
    />

    <button
      class="start-game-button"
      type="button"
      :disabled="!isValidSelection"
      @click="startGame"
    >
      ゲームを開始
    </button>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { GAME_MODES } from '@/constants/gameConfig'
import ColorSelection from './ColorSelection.vue'

const emit = defineEmits(['mode-selected'])
const selectedMode = ref(null)
const playerColor = ref(null)

const isCpuMode = computed(() => selectedMode.value?.startsWith('cpu-'))
const isValidSelection = computed(() =>
  selectedMode.value && (!isCpuMode.value || playerColor.value)
)

function selectMode(modeId) {
  selectedMode.value = modeId
  if (modeId === 'offline') playerColor.value = null
  else if (!playerColor.value) playerColor.value = 'black'
}

function selectColor(color) {
  playerColor.value = color
}

function startGame() {
  if (!isValidSelection.value) return
  emit('mode-selected', {
    mode: selectedMode.value,
    playerColor: isCpuMode.value ? playerColor.value : null
  })
}
</script>

<style scoped>
@import '../assets/styles/ModeSelection.css';
</style>
