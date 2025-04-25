リファクタリング計画
0. 全体概要
Rust API 整理（WASM 開発体験向上）

CPU → WebWorker 化（UI フリーズ対策として最優先）

ロジック／UI 層切り分け（テスト・保守性向上）

各ステップは独立して進められますが、1→2→3 の順で行うことで工数を平滑化しつつ、優先度の高い「UI フリーズ問題」から解消できます。

1. Rust API 整理（WASM 開発体験向上）
1.1 目的
JS 側から呼びやすい、明確なエクスポート API を提供

冗長な関数・重複コードを整理

将来的な探索ロジック（best_move）追加に備える

1.2 手順
Cargo.toml に wasm-bindgen などのバージョン固定とメタデータ追記

toml
コピーする
編集する
[package]
name = "reversi_wasm"
version = "0.1.0"
authors = ["あなたの名前 <email@example.com>"]
edition = "2021"

[lib]
crate-type = ["cdylib"]

[dependencies]
wasm-bindgen = "0.2.100"
console_error_panic_hook = "0.1"

[package.metadata.wasm-pack.profile.release]
wasm-opt = true
lib.rs の共通化・API 拡張

compute_flips_dir → kogge_stone_flips にリネーム

gen_flip_bitboards・apply_move_* の内部で同じ処理を呼ぶよう共通化

新関数 best_move(p:u64,o:u64,depth:u32)->u32 を追加

rust
コピーする
編集する
#[wasm_bindgen]
pub fn best_move(p: u64, o: u64, depth: u32) -> u32 {
    // 簡易 αβ or MCTS を内部で呼び出し、0–63 の pos を返す
    alpha_beta_search(p, o, depth).pos as u32
}
コード例：共通化イメージ

rust
コピーする
編集する
fn kogge_stone_flips(m: u64, p: u64, o: u64, idx: usize) -> u64 { /* … */ }

#[wasm_bindgen]
pub fn gen_flip_bitboards(p: u64, o: u64, pos: u32) -> Vec<u64> {
  let m = 1u64 << pos;
  DIRS.iter().enumerate()
      .map(|(i,_)| kogge_stone_flips(m,p,o,i))
      .collect()
}

#[wasm_bindgen]
pub fn apply_move_p(p: u64, o: u64, pos: u32) -> u64 {
  let flips = gen_flip_bitboards(p,o,pos).iter().copied().fold(0, |a,b|a|b);
  p | (1<<pos) | flips
}
1.3 テスト
wasm-pack test --headless --firefox などでユニットテスト

JS 側から wasm.best_move を呼び出して正しい pos が返るか確認

2. CPU → WebWorker 化（UI フリーズ対策）
2.1 目的
メインスレッドで走っている αβ／強化学習探索を WebWorker に移し、UI スレッドのブロックを防ぐ

2.2 手順
src/workers/cpuWorker.js を作成

js
コピーする
編集する
// cpuWorker.js
importScripts("/wasm/reversi_wasm.js");
wasm_bindgen().then(() => {
  self.onmessage = ({ data: { P, O, depth, mode } }) => {
    let pos;
    if (mode === "cpu-weak") {
      // RandomCPU ロジック（JS で軽量）
      pos = random_move(P, O);
    } else {
      // WASM 側 best_move を呼ぶ
      pos = wasm.best_move(P, O, depth);
    }
    postMessage({ pos });
  };
});
CPUManager.js を修正

js
コピーする
編集する
export class CPUManager {
  constructor(bitBoard, gameMode, playerColor) {
    this.bitBoard = bitBoard;
    this.gameMode  = gameMode;
    this.playerColor = playerColor;
    this.worker = new Worker(new URL('../workers/cpuWorker.js', import.meta.url));
  }
  async selectMove() {
    const P = this.bitBoard.blackBoard;
    const O = this.bitBoard.whiteBoard;
    const depth = this.gameMode === 'cpu-strong' ? 6 : 4;
    return new Promise(resolve => {
      this.worker.onmessage = ({ data: { pos } }) => {
        resolve({ row: pos >> 3, col: pos & 7 });
      };
      this.worker.postMessage({ P, O, depth, mode: this.gameMode });
    });
  }
}
ビルド設定

Vue CLI は worker-loader が同梱されているので特別な設定不要

2.3 動作確認
"cpu-normal"／"cpu-strong" モードで UI 操作→CPU 思考中もスムーズに操作可能

DevTools の Performance で Main thread に αβ 呼び出しが残らないことを確認

3. ロジック／UI 層切り分け（テスト・保守性向上）
3.1 目的
GameState：純粋にゲーム状態とルールだけを担当

UI 層（useGameBoard / AnimationManager）：レンダリング・アニメーション・ユーザー入力だけを担当

3.2 手順
GameState.placePiece を返り値付きへ変更

js
コピーする
編集する
// before: GameState.placePiece は nothing を返す
// after:
async placePiece(row, col) {
  if (!this.bitBoard.isValidMove(row,col,this.activePlayer)) return [];
  // 1) ビットボード更新
  this.bitBoard.applyMove(row,col);
  // 2) 反転グループだけ取得して返却
  return this.bitBoard.getFlipsByDirection(row,col,this.activePlayer);
}
useGameBoard.js を調整

js
コピーする
編集する
async function handleCellClick({row,col}) {
  if (!isValidMove(row,col)) return;
  // GameState から flipGroups を受け取る
  const flips = await gameState.value.placePiece(row,col);
  // AnimationManager に渡してアニメ開始
  animationManager.startFlippingAnimation(flips, /*…*/);
}
AnimationManager はそのまま使えるので変更不要

3.3 メリット
GameState は副作用なしの純粋関数群に近づき、単体テストが容易に

UI 層はアニメーションと Vue 再描画のみ

将来 React／Svelte 化しても GameState 部分はそのまま再利用可能

まとめ
Rust API 整理 で WASM 側をクリーンかつ拡張しやすく

WebWorker 化 で UI フリーズを即時解消

ロジック/UI 分離 で責務を切り分け、テストと保守性を大きく向上

この手順に沿って進めることで、パフォーマンス・開発体験・保守性のすべてをバランス良く強化できます。
まずは 1→2→3 の順に、各ステップを順次マージ＆動作確認していきましょう。
