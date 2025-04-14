<template>
  <div class="color-selection">
    <h3>プレイヤーの色を選択</h3>
    <div class="color-options">
      <div
        class="color-option"
        :class="{ selected: selectedColor === 'black' }"
        @click="$emit('color-selected', 'black')"
      >
        <div class="color-piece black"></div>
        <div class="color-label">黒（先攻）</div>
      </div>
      <div
        class="color-option"
        :class="{ selected: selectedColor === 'white' }"
        @click="$emit('color-selected', 'white')"
      >
        <div class="color-piece white"></div>
        <div class="color-label">白（後攻）</div>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: "ColorSelection",
  props: {
    selectedColor: {
      type: String,
      required: true,
      validator: value => ["black", "white", null].includes(value)
    }
  }
};
</script>

<style scoped>
@import '../assets/styles/ColorSelection.css';
</style>
