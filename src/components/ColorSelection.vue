<!--
  src/components/ColorSelection.vue
  プレイヤーの色選択ダイアログコンポーネント
-->
<template>
  <div class="color-selection">
    <h3>プレイヤーの色を選択</h3>
    <div class="color-options">
      <!-- 黒（先攻）選択ボタン -->
      <button
        type="button"
        class="color-option"
        :class="{ selected: props.selectedColor === 'black' }"
        @click="emit('color-selected','black')"
        :aria-pressed="props.selectedColor === 'black'"
      >
        <div class="color-piece black"></div>
        <div class="color-label">黒（先攻）</div>
      </button>

      <!-- 白（後攻）選択ボタン -->
      <button
        type="button"
        class="color-option"
        :class="{ selected: props.selectedColor === 'white' }"
        @click="emit('color-selected','white')"
        :aria-pressed="props.selectedColor === 'white'"
      >
        <div class="color-piece white"></div>
        <div class="color-label">白（後攻）</div>
      </button>
    </div>
  </div>
</template>

<script setup>
/**
 * プレイヤーの色選択ダイアログコンポーネント
 * CPU対戦時に使用する
 */

/**
 * プロパティ定義
 */
const props = defineProps({
  /**
   * 現在選択されている色
   * @type {string|null} 'black'/'white'/null
   */
  selectedColor: {
    type: String,
    default: null,
    validator: v => v === null || ['black','white'].includes(v)
  }
})

/**
 * イベント定義
 * color-selected: 色が選択されたときに発火
 */
const emit = defineEmits(['color-selected'])
</script>

<style scoped>
@import '../assets/styles/ColorSelection.css';
</style>
