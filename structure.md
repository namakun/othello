```
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
│     └─ WeakestCPU.js        # ── 意図的に弱い AI（角を避け、X打ち・C打ちを優先）
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

```

# 各ファイルの関数と機能

## Rust（lib.rs）
- `init_panic_hook()`: パニック時にブラウザコンソールにエラーを表示するためのフック設定
- `shift(x, d)`: ビットシフト関数（正: 左シフト, 負: 右シフト）
- `kogge_stone_flips(mask, p, o, idx)`: １方向の反転列計算 (Kogge-Stone法)
- `compute_flip_mask(p, o, pos)`: ８方向すべての反転マスクを集計
- `gen_legal_moves(p, o)`: 合法手ビットボード生成
- `gen_flip_groups(p, o, pos)`: 方向別「反転 index 配列」を返す
- `apply_move(p, o, pos)`: 着手適用（反転も含めた次盤面を返す）
- `popcnt64(x)`: 石数 (スコア) を数える
- `has_moves(p, o)`: 合法手が存在するか判定

## Wasm ローダー（wasmLoader.js）
- `wasmReady`: Wasm モジュールをフェッチ＆初期化するためのPromise
- `wasm`: 初期化されたWasmモジュールへの参照

## BitBoard 系

### BitBoardBridge.js
- `constructor()`: ビットボードの初期化
- `_initStartPos()`: 初期配置の設定
- `initialize()`: ビットボードの初期化
- `getPiece(row, col)`: 指定位置の石色を返す
- `legalMovesBitboard(player)`: 合法手をビットボードとして取得
- `legalMoveIndices(player)`: 合法手をインデックス配列として取得
- `flipGroups(row, col, player)`: 反転グループを取得
- `applyMove(row, col, player)`: 着手を適用
- `score()`: 黒白それぞれの石数を返す
- `hasValidMoves(player)`: 合法手があるかどうかを判定

### bitView.js
- `toRowCol(idx)`: ビットボードのインデックスを行列座標に変換
- `indicesToRowCols(idxs)`: インデックス配列を行列座標配列に変換
- `groupsToRowCols(groups)`: 反転グループ配列を行列座標グループ配列に変換

## ゲーム進行／アニメ管理（utils/game）

### GameCore.js
- `constructor(mode, playerColor)`: ゲームコアの初期化
- `isCpuMode()`: CPUモードかどうかを判定
- `isCpuTurn()`: CPUの手番かどうかを判定
- `hasValidMoves(color)`: 指定色の合法手があるかどうかを判定
- `score()`: 現在のスコアを取得
- `isValidMove(r, c)`: 指定位置が合法手かどうかを判定
- `pieceAt(r, c)`: 指定位置の駒色を返す
- `placePiece(row, col)`: 駒を置いてアニメーション→次手
- `_nextTurn()`: ターン遷移処理
- `_finishGame()`: ゲーム終了処理
- `reset(newColor)`: ゲームのリセット

### ViewBoard.js
- `constructor()`: ViewBoardの初期化
- `syncFromBitBoard(bitBoard)`: BitBoardから初期状態を同期
- `startFlipping(row, col, toColor)`: 駒の反転アニメーションを開始
- `completeFlipping(row, col)`: 駒の反転アニメーションを完了
- `placePiece(row, col, color)`: 新しい駒を配置
- `getCell(row, col)`: セルの状態を取得
- `getOwner(row, col)`: セルの表面の色を取得
- `isFlipping(row, col)`: セルが反転中かどうかを判定
- `reset()`: ボードの状態をリセット

### AnimationManager.js
- `constructor()`: アニメーションマネージャーの初期化
- `setLastPlacedPiece(row, col)`: 最後に置かれた駒の位置を設定
- `startFlippingAnimation(flipGroups, fromColor, toColor, callback)`: 反転アニメーションの開始
- `syncViewBoard(bitBoard)`: ViewBoardとビットボードの同期
- `isPieceFlipping(row, col)`: 駒が反転中かどうかを判定
- `getCellState(row, col)`: セルの状態を取得
- `reset()`: アニメーション状態のリセット

### CPUManager.js
- `constructor(bitBoard, gameMode, playerColor)`: CPUマネージャーの初期化
- `createCPU()`: CPUインスタンスの作成
- `selectMove()`: CPUの手を選択
- `updatePlayerColor(playerColor)`: CPUの色を更新
- `updateBitBoard(bitBoard)`: ビットボードを更新

## CPU AI（utils/cpu）

### BaseCPU.js
- `constructor(bitBoard, color)`: 基底CPUクラスの初期化
- `cloneBoard()`: ビットボードのディープコピー
- `getValidMoves(board, clr)`: 合法手配列を返す
- `isGameOver(board)`: 終局判定
- `evaluateBoard(board)`: 基本評価（駒差＋角）

### RandomCPU.js
- `selectMove()`: ランダムに手を選択

### AlphaBetaCPU.js
- `selectMove()`: α-β剪定で最適な手を選択
- `alphaBeta(board, depth, alpha, beta, maximizing)`: α-β剪定アルゴリズム

### WeakestCPU.js
- `constructor(bitBoard, color)`: 最弱CPUの初期化とモデルのロード
- `loadModel()`: 強化学習モデルをロード
- `boardToInput(board)`: 盤面を3チャンネルの入力形式に変換
- `predictPolicy(input)`: モデルを使用して方策を予測
- `selectMove()`: 意図的に弱い手を選択（角を避け、X打ち・C打ちを優先）

## Vue レイヤー

### useGameCore.js
- `init()`: GameCoreの初期化
- `playerMove(row, col)`: プレイヤーの着手
- `restart(color)`: ゲームの再スタート
- `displayBoard`: 表示用盤面配列（computed）
- `activePlayer`: 現在の手番（computed）
- `isCpuThinking`: CPU思考中フラグ（ref）

### useGameUI.js
- `blackScore`, `whiteScore`: 黒白のスコア（computed）
- `colorLabel(color)`: 色のラベル変換
- `currentPlayerLabel`: 現在の手番ラベル（computed）
- `winnerLabel`: 勝者ラベル（computed）
- `isValidMove(row, col)`: 合法手判定
- `pieceClasses(color)`: 駒のCSSクラス
- `getCellClasses(row, col)`: セルのCSSクラス
- `getPieceContainerClasses({row, col})`: 駒コンテナのCSSクラス
- `getFrontPieceClasses({row, col})`: 表面駒のCSSクラス
- `getBackPieceClasses({row, col})`: 裏面駒のCSSクラス
- `hasPiece({row, col})`: 駒の有無判定

### useGameBoard.js
- `initializeGame()`: ゲームの初期化
- `handleCellClick({row, col})`: セルクリック処理
- `handleRestart()`: リスタート処理
- `handleColorSelected(color)`: 色選択処理
- `playerColorInGame`: ゲーム内プレイヤー色（computed）
- `opponentColor`: 相手の色（computed）
- `playerScore`, `opponentScore`: プレイヤーと相手のスコア（computed）
- `showPassMessage`: パスメッセージ表示フラグ（computed）
- `isGameOver`: ゲーム終了フラグ（computed）
- `passPlayerLabel`: パスするプレイヤーのラベル（computed）
- `isResetting`: リセット中フラグ（computed）
- `showColorSelection`: 色選択ダイアログ表示フラグ（ref）
- `showHints`: ヒント表示フラグ（ref）

### components/*.vue

#### GameBoard.vue
- テンプレート: 盤面、プレイヤー情報、ゲーム情報の表示
- `props`: gameMode, playerColor
- `emits`: update:playerColor, return-to-menu
- `onColorSelected(color)`: 色選択ハンドラ
- `returnToMenu()`: メニューに戻るハンドラ
- `initializeGame()`: コンポーネントマウント時の初期化

#### ModeSelection.vue
- テンプレート: ゲームモード選択、色選択、ゲーム開始ボタン
- `emits`: mode-selected
- `selectedMode`: 選択されたゲームモード（ref）
- `playerColor`: 選択されたプレイヤーの色（ref）
- `isCpuMode`: CPU対戦モードかどうか（computed）
- `isValidSelection`: 有効な選択がされているかどうか（computed）
- `selectMode(modeId)`: モード選択時の処理
- `selectColor(color)`: 色選択時の処理
- `startGame()`: ゲーム開始時の処理

#### ColorSelection.vue
- テンプレート: 黒（先攻）と白（後攻）の選択ボタン
- `props`: selectedColor
- `emits`: color-selected

#### App.vue
- ルートコンポーネント
- モード選択とゲーム画面の切り替え制御
- `currentMode`: 現在のモード（ref）
- `selectedGameMode`: 選択されたゲームモード（ref）
- `playerColor`: プレイヤーの色（ref）
- `onModeSelected({mode, playerColor})`: モード選択時の処理
- `returnToModeSelection()`: モード選択画面に戻る処理

### CSS ファイル

#### GameBoard.css
- `:root`: カスタムプロパティ（CSS変数）定義
- レイアウトと共通スタイル
- プレイヤー情報のスタイル
- ボードと駒のスタイル
- 駒の反転アニメーション
- ゲーム情報とボタンのスタイル
- レスポンシブ対応

#### ColorSelection.css
- 色選択ダイアログのスタイル
- 色選択ボタンのスタイル
- 駒の表示スタイル

#### ModeSelection.css
- モード選択画面のスタイル
- モードオプションのスタイル
- ゲーム開始ボタンのスタイル
- レスポンシブ対応
