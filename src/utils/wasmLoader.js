// src/utils/wasmLoader.js
// WASM モジュールを非同期で読み込み、export を公開するユーティリティ
export let wasm = null;

/** 読み込み完了を待つ Promise */
export const wasmReady = (async () => {
  const res   = await fetch("/wasm/reversi.wasm");
  const bytes = await res.arrayBuffer();
  const { instance } = await WebAssembly.instantiate(bytes, {});
  wasm = instance.exports;
  return wasm;
})();
