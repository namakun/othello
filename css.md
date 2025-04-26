# オセロ駒反転アニメーション  リファクタリング設計書

## 1. 目的
* **UX 向上** : 置石は即時表示、反転は滑らかに 180° 回転し 90° で色が切り替わる。
* **責務分離** : 見た目は CSS、タイミングとゲームロジックは JavaScript/Vue に限定。
* **保守性** : Rust/Wasm 部は変更せず、フロント側を最小限の改修で整理。

## 2. 現状整理
| レイヤ | 担当 | 問題点 |
|---|---|---|
| Rust / Wasm | ビットボード計算 | アニメに無関係。変更不要。 |
| AnimationManager (JS) | 反転対象・タイミング管理 | `setTimeout` 固定 500 ms・置石まで flipping に入る等で Vue の再描画が走る。 |
| Vue (Composition API) | DOM にクラス反映 | クラス競合による keyframe リセット。 |
| CSS | 3D 回転と色変更 | 背景色を途中で上書きしているため途中で途切れる。 |

## 3. 改修方針
* **石 DOM を二面構造** (`.front` `.back`) にし、色は面ごとに定義。
* **CSS**
  * 立体設定: `transform-style: preserve-3d`, `perspective` は親で付与。
  * 回転: `transition: transform .6s ease;` + `.is-flipped { transform: rotateY(180deg); }`
* **AnimationManager**
  * 保持するのは「反転中かどうか」の真偽のみ。
  * 置石は `lastPlacedPiece` でハイライトするが `flippingPieces` へ入れない。
  * 方向グループは距離順にソートし `delay = idx * 100` で `isFlipped = true` を ON。
* **Vue**
  * `:class="{ 'is-flipped': flipping }"` のみでアニメ開始。
  * `@transitionend` で 1 ピース完了を検知 → 全ピース完了後に BitBoard へ commit。

## 4. 実装ステップ
1. **石コンポーネントを作成 / 置換**
   ```html
   <div class="piece" :class="{ 'is-flipped': flipped }">
     <div class="face front" :class="colorClass(fromColor)"></div>
     <div class="face back"  :class="colorClass(toColor)"></div>
   </div>
   ```
2. **CSS 追加**
   ```css
   .piece { position:relative; width:40px; height:40px; border-radius:50%;
            transform-style:preserve-3d; transition:transform .6s ease; }
   .face { position:absolute; inset:0; border-radius:50%; backface-visibility:hidden; }
   .back{ transform:rotateY(180deg); }
   .is-flipped{ transform:rotateY(180deg); }
   .black{ background:#2c3e50; border:2px solid #34495e; }
   .white{ background:#ecf0f1; border:2px solid #bdc3c7; }
   ```
3. **AnimationManager 改修**
   ```js
   startFlippingAnimation(groups, from, to, done){
     const pieces = groups.flat();
     pieces.forEach((p,i)=> setTimeout(()=>{
       this.flippingPieces.push({...p, to});
     }, i*100));
   }
   ```
4. **Vue 側完了検知**
   ```html
   <div @transitionend="onFlipEnd(row,col)"></div>
   ```
5. **BitBoard コミットを遅延** : 全 flip 終了後に `applyMove`。

## 5. 移行プラン
| フェーズ | 内容 | 完了条件 |
|---|---|---|
| 1 | 石 DOM 2 面化 & CSS 基盤 | 旧 UI でレイアウト崩れない |
| 2 | AnimationManager/ Vue クラスバインド差し替え | 置石が即時・滑らかに反転 |
| 3 | `transitionend` 連鎖で BitBoard 遅延 commit | テスト全ケースがパス |
| 4 | 古い `.flipping-to-*` CSS と JS ロジック削除 | dead code 0、bundle size 減 |

## 6. メリット
* **再描画事故ゼロ** : Vue が途中でクラスを張り替えない。
* **宣言的** : CSS にすべての見た目を委ねるため、アニメ調整はスタイルシートだけ。
* **保守性向上** : Rust/Wasm・BitBoard のロジックは untouched。

## 7. 今後の拡張余地
* `prefers-reduced-motion` メディアクエリでアニメ自動オフ。
* 3D シャドウやハイライトを `::before/::after` で追加し質感アップ。
* Flip アニメを GSAP など外部ライブラリに差し替える場合も、DOM 構造はそのまま流用可能。

---
> **担当:** Frontend Team
> **更新履歴:** 2025‑04‑26  初版

