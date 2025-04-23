// src/utils/wasmLoader.js
// wasm-pack が生成する ESModule (reversi_wasm.js) を動的 import
export let wasm = null;

export const wasmReady = (async () => {
  // wasm-pack の --target web は JS + wasm が同梱された ESModule を出力する
  const mod = await import("../../public/wasm/reversi_wasm.js");
  await mod.default();           // init() を実行（fetch & instantiation）
  wasm = mod;
  return wasm;
})();
