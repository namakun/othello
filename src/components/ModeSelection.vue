<!--
  src/components/ModeSelection.vue
  ゲームモード選択画面コンポーネント
-->
<template>
  <div class="mode-selection">
    <h2>ゲームモード選択</h2>
    <!-- ゲームモード一覧 -->
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

    <!-- CPU対戦時のみ色選択を表示 -->
    <ColorSelection
      v-if="isCpuMode"
      :selected-color="playerColor"
      @color-selected="selectColor"
    />

    <!-- ゲーム開始ボタン -->
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
/**
 * ゲームモード選択画面コンポーネント
 * ゲーム開始前にモードと色を選択する
 */
import { ref, computed } from 'vue'
import { GAME_MODES } from '@/constants/gameConfig'
import ColorSelection from './ColorSelection.vue'

/**
 * イベント定義
 * mode-selected: モードが選択されてゲームが開始されるときに発火
 */
const emit = defineEmits(['mode-selected'])

/**
 * 選択されたゲームモード
 * @type {import('vue').Ref<string|null>}
 */
const selectedMode = ref(null)

/**
 * 選択されたプレイヤーの色
 * @type {import('vue').Ref<string|null>}
 */
const playerColor = ref(null)

/**
 * CPU対戦モードかどうか
 * @type {import('vue').ComputedRef<boolean>}
 */
const isCpuMode = computed(() => selectedMode.value?.startsWith('cpu-'))

/**
 * 有効な選択がされているかどうか
 * モードが選択されていて、CPU対戦の場合は色も選択されている必要がある
 * @type {import('vue').ComputedRef<boolean>}
 */
const isValidSelection = computed(() =>
  selectedMode.value && (!isCpuMode.value || playerColor.value)
)

/**
 * モード選択時の処理
 * @param {string} modeId 選択されたモードID
 */
function selectMode(modeId) {
  selectedMode.value = modeId
  if (modeId === 'offline') playerColor.value = null
  else if (!playerColor.value) playerColor.value = 'black'
}

/**
 * 色選択時の処理
 * @param {string} color 選択された色
 */
function selectColor(color) {
  playerColor.value = color
}

/**
 * ゲーム開始時の処理
 * 選択されたモードと色を親コンポーネントに通知
 */
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
