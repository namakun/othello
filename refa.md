/crates
└─ reversi
   └─ src
      └─ lib.rs                # ── Rust 製ビットボードロジックの実装 (WASM 出力)
      
/src
├─ utils
│  ├─ wasmLoader.js           # ── Wasm モジュールの動的 import & 初期化
│  │
│  ├─ bitboard                # ── ビットボード操作に関する処理一式
│  │  ├─ BitBoardBridge.js    # ── JS 側ビットボード状態管理 + wasm 関数呼び出しラッパ
│  │  └─ bitView.js           # ── index⇔{row,col} 変換の View ヘルパ
│  │
│  ├─ game                     # ── ゲーム進行＆ UI アニメ管理
│  │  ├─ AnimationManager.js  # ── 駒反転アニメーションの管理
│  │  ├─ GameCore.js          # ── ゲームのターン/勝敗ロジック（BitBoardBridge を利用）
│  │  └─ CPUManager.js        # ── CPU モデルの生成・思考タイミング制御
│  │
│  └─ cpu                      # ── CPU 対戦 AI の実装
│     ├─ BaseCPU.js           # ── 共通評価／合法手取得／クローン機能
│     ├─ RandomCPU.js         # ── ランダム CPU
│     ├─ AlphaBetaCPU.js      # ── α-β 剪定 CPU
│     └─ ReinforcementCPU.js  # ── 強化学習予定 CPU (現状ランダム)
│
├─ constants
│  └─ gameConfig.js           # ── ゲームモード定義（local/cpu-weak/…）
│
├─ composables                # ── Vue3 Composition API で層分離
│  ├─ useGameCore.js          # ── GameCore を reactive にラップ
│  ├─ useGameUI.js            # ── UI 表示用のスコア・クラス・ラベル派生値
│  └─ useGameBoard.js         # ── Core＋UI を束ねてコンポーネントに提供
│
├─ components                 # ── Vue 単一ファイルコンポーネント
│  ├─ ModeSelection.vue       # ── ゲームモード選択画面
│  ├─ ColorSelection.vue      # ── CPU モード時の先手色選択ダイアログ
│  └─ GameBoard.vue           # ── 盤面＋駒描画＋UI 操作のメイン
│
├─ assets
│  └─ styles
│     ├─ ModeSelection.css    # ―― ModeSelection 用スタイル
│     ├─ ColorSelection.css   # ―― ColorSelection 用スタイル
│     └─ GameBoard.css        # ―― GameBoard 用スタイル＋共通変数
│
└─ App.vue                    # ── ルートコンポーネント (ModeSelection ⇔ GameBoard 切替)

各層の責務
Rust（lib.rs）

全方向の合法手計算 (gen_legal_moves),

反転グループ（index 配列）生成 (gen_flip_groups),

着手適用 (apply_move),

ビットカウント (popcnt64)
→ パフォーマンス重視で Rust 側に全ロジックを持たせる

Wasm ローダー（wasmLoader.js）

Wasm モジュールをフェッチ＆初期化し、他モジュールが wasm として利用できるようにする

BitBoard 系

BitBoardBridge.js:

blackBoard/whiteBoard を BigInt で管理

Rust 関数を呼んで合法手・反転グループ取得・着手適用・スコア計算

initialize(), getPiece() など JS から直接必要なメソッドもここに

bitView.js:

ビットインデックスを {row,col} に変換するだけの純粋 View ヘルパ

ゲーム進行／アニメ管理（utils/game）

GameCore.js:

ターン制御（パス・勝敗判定）

BitBoardBridge で駒操作・得点取得

AnimationManager 経由で駒反転アニメ → 内部更新

AnimationManager.js:

反転アニメ用タイミング／エフェクト管理

CPUManager.js:

選択されたモードに応じて適切な BaseCPU 派生を生成

非同期思考時間の演出

CPU AI（utils/cpu）

BaseCPU.js: 合法手取得・盤面評価・ゲーム終了判定

派生クラスで手法を切り替え (Random, AlphaBeta, Reinforcement)

Vue レイヤー

useGameCore.js:

GameCore インスタンスを ref として管理

displayBoard（盤面配列）を算出

playerMove(), restart() などロジック呼び出し

useGameUI.js:

スコア（黒/白）・色ラベル・CSS クラス系を computed で提供

isValidMove() など純粋 UI 判定

useGameBoard.js:

Core＋UI を組み合わせ、色選択ダイアログやヒント制御を追加

コンポーネントに必要な state & action を一括公開

components/*.vue:

ModeSelection.vue, ColorSelection.vue → 選択画面

GameBoard.vue → 盤面表示＆操作／ステータス・ボタン

App.vue → 画面遷移制御（モード選択⇔ゲーム開始）

スタイル

各コンポーネント専用の .css に外部化

全体共通変数は GameBoard.css の :root で定義

この構成により

ビット演算ロジックは全て Rust/Wasm に任せ、

JS/TS 側は呼び出しと状態管理に集中、

View もロジックも完全にレイヤ分離

という要件を満たしています。
