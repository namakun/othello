/**
 * src/utils/cpu/AlphaBetaCPU.js
 * α-β剪定アルゴリズムを使用した CPU AI
 * ─ フェーズ別永続キャッシュ (LRU) ＋ 角罠対策・X/C 深掘り ─
 */
import { BaseCPU } from "./BaseCPU";

export class AlphaBetaCPU extends BaseCPU {
  /*───────────────────────────────────────────────*
   *  探索パラメータ                               *
   *───────────────────────────────────────────────*/
  static BASE_DEPTH          = 5;   // 通常の読み深さを5に増加
  static ENDGAME_DEPTH_BONUS = 3;   // 終盤ボーナスを3に増加
  static TIME_LIMIT_MS       = 1000; // 思考時間制限（ミリ秒）

  // 盤上座標ごとの追加深さ（プライ数）
  static DEPTH_ADJUSTMENTS = {
    CORNER   : 2,
    EDGE     : 0.5,
    X_SQUARE : 2,   // X マスを必ず +2 深掘り
    C_SQUARE : 2    // C マスも +2 深掘り
  };

  /*───────────────────────────────────────────────*
   *  評価関数の重み                               *
   *───────────────────────────────────────────────*/
  // 駒差重み（進行度依存）
  static PIECE_DIFF_W = { EARLY: 1, MID: 3, LATE_MID: 10, LATE: 50 };

  // 固定重み
  static W = {
    CORNER              : 100,
    CORNER_OPPORTUNITY  : 40,
    X_TRAP              : -120,  // X罠の評価をさらに低く
    CB_TRAP             : -80,   // C/B罠の評価も低く
    MOBILITY            : 2,
    STABILITY           : 5,
    FRONTIER            : -3,
    POTENTIAL_MOBILITY  : 1.5
  };

  /*───────────────────────────────────────────────*
   *  永続キャッシュ (LRU方式)                     *
   *───────────────────────────────────────────────*/
  static evalCache      = new Map(); // key → val
  static MAX_CACHE_SIZE = 500_000;   // エントリ上限

  // ヒストリーヒューリスティック用テーブル
  static historyTable   = new Map(); // "row,col" → score

  /*───────────────────────────────────────────────*
   *  メイン: 手の選択                              *
   *───────────────────────────────────────────────*/
  selectMove() {
    const moves = this.getValidMoves();
    if (!moves.length) return null;

    /*── キャッシュサイズの確認 ──*/
    const totalPieces = this.bitBoard.score().black + this.bitBoard.score().white;

    // キャッシュサイズが上限に近づいたら、一部のエントリを削除
    if (AlphaBetaCPU.evalCache.size > AlphaBetaCPU.MAX_CACHE_SIZE * 0.95) {
      this.pruneCache(Math.floor(AlphaBetaCPU.MAX_CACHE_SIZE * 0.2)); // 20%のエントリを削除
    }

    /*── 序盤ランダム性（初手・2手目）──*/
    if (totalPieces <= 2) {
      return moves[Math.floor(Math.random() * moves.length)];
    }

    /*── 動的探索深さ ──*/
    let maxDepth = AlphaBetaCPU.BASE_DEPTH;
    if (totalPieces >= 50) maxDepth += AlphaBetaCPU.ENDGAME_DEPTH_BONUS;
    if (moves.length <= 6) maxDepth += 1;      // 合法手が少ない局面はさらに深掘り

    // 終盤（残り10手以内）は完全解析
    const emptyCount = 64 - totalPieces;
    if (emptyCount <= 10) {
      maxDepth = emptyCount;
    }

    /*── 反復深化 ──*/
    const startTime = Date.now();
    let bestMove = moves[0];
    let bestScore = -Infinity;

    // 初期並べ替え（静的評価）
    moves.sort((a, b) => this.getMoveSortKey(b) - this.getMoveSortKey(a));

    // 反復深化（深さ1から順に探索）
    for (let depth = 1; depth <= maxDepth; depth++) {
      let currentBestScore = -Infinity;
      let currentBestMove = null;

      // 前回の反復で最善だった手を最初に探索
      if (bestMove) {
        const idx = moves.findIndex(m => m.row === bestMove.row && m.col === bestMove.col);
        if (idx > 0) {
          const temp = moves[0];
          moves[0] = moves[idx];
          moves[idx] = temp;
        }
      }

      // 各手を評価
      for (const mv of moves) {
        const bd = this.cloneBoard();
        bd.applyMove(mv.row, mv.col, this.color);

        // 個別深さ調整
        const d = Math.max(1, Math.floor(depth + this.getDepthAdjustment(mv)));

        // Principal Variation Search
        let sc;
        if (currentBestMove === null) {
          // 最初の手は通常のα-β探索
          sc = this.alphaBeta(bd, d, -Infinity, Infinity, false);
        } else {
          // それ以外はNull Window Search
          sc = this.alphaBeta(bd, d, currentBestScore, currentBestScore + 1, false);
          if (sc > currentBestScore && sc < Infinity) {
            // 再探索
            sc = this.alphaBeta(bd, d, -Infinity, Infinity, false);
          }
        }

        if (sc > currentBestScore) {
          currentBestScore = sc;
          currentBestMove = mv;

          // ヒストリーテーブル更新
          const key = `${mv.row},${mv.col}`;
          const historyScore = AlphaBetaCPU.historyTable.get(key) || 0;
          AlphaBetaCPU.historyTable.set(key, historyScore + (1 << depth));
        }

        // 時間制限チェック
        if (Date.now() - startTime > AlphaBetaCPU.TIME_LIMIT_MS) {
          break;
        }
      }

      // この深さでの探索結果を保存
      if (currentBestMove) {
        bestMove = currentBestMove;
        bestScore = currentBestScore;
      }

      // 時間制限チェック
      if (Date.now() - startTime > AlphaBetaCPU.TIME_LIMIT_MS) {
        break;
      }

      // 必勝手が見つかった場合は探索終了
      if (bestScore >= 1000000) {
        break;
      }
    }

    return bestMove;
  }

  /*───────────────────────────────────────────────*
   *  α-β探索（LRU キャッシュ付き）                *
   *───────────────────────────────────────────────*/
  alphaBeta(board, depth, alpha, beta, maximizing) {
    const key = this.getCacheKey(board, depth, maximizing);

    // キャッシュヒット
    const hit = AlphaBetaCPU.evalCache.get(key);
    if (hit !== undefined) {
      // LRU 更新
      AlphaBetaCPU.evalCache.delete(key);
      AlphaBetaCPU.evalCache.set(key, hit);
      return hit;
    }

    // 終端条件
    if (depth === 0 || this.isGameOver(board)) {
      const v = this.evaluateBoard(board);
      this.cachePut(key, v);
      return v;
    }

    // 子ノード生成
    const clr = maximizing ? this.color : this.oppColor;
    const moves = this.getValidMoves(board, clr);

    // パス処理
    if (!moves.length) {
      const v = this.alphaBeta(board, depth - 1, alpha, beta, !maximizing);
      this.cachePut(key, v);
      return v;
    }

    // 探索順ソート（ヒストリーヒューリスティック + 静的評価）
    moves.sort((a, b) => {
      // ヒストリースコア
      const aKey = `${a.row},${a.col}`;
      const bKey = `${b.row},${b.col}`;
      const aHistory = AlphaBetaCPU.historyTable.get(aKey) || 0;
      const bHistory = AlphaBetaCPU.historyTable.get(bKey) || 0;

      // 静的評価
      const aStatic = this.getMoveSortKey(a);
      const bStatic = this.getMoveSortKey(b);

      // 組み合わせた評価（ヒストリー + 静的評価）
      return (bHistory * 10 + bStatic) - (aHistory * 10 + aStatic);
    });

    let best = maximizing ? -Infinity : Infinity;

    for (const mv of moves) {
      const nxt = this.cloneBoard(board);
      nxt.applyMove(mv.row, mv.col, clr);

      const v = this.alphaBeta(nxt, depth - 1, alpha, beta, !maximizing);

      // 良い手を見つけたらヒストリーテーブルを更新
      if ((maximizing && v > best) || (!maximizing && v < best)) {
        const key = `${mv.row},${mv.col}`;
        const historyScore = AlphaBetaCPU.historyTable.get(key) || 0;
        AlphaBetaCPU.historyTable.set(key, historyScore + (1 << depth));
      }

      if (maximizing) {
        best  = Math.max(best, v);
        alpha = Math.max(alpha, v);
      } else {
        best  = Math.min(best, v);
        beta  = Math.min(beta, v);
      }
      if (beta <= alpha) {
        // βカット時もヒストリーテーブルを更新（良い手）
        const key = `${mv.row},${mv.col}`;
        const historyScore = AlphaBetaCPU.historyTable.get(key) || 0;
        AlphaBetaCPU.historyTable.set(key, historyScore + (1 << depth));
        break;
      }
    }

    this.cachePut(key, best);
    return best;
  }

  /*───────────────────────────────────────────────*
   *  LRU キャッシュ補助関数                       *
   *───────────────────────────────────────────────*/
  cachePut(key, val) {
    const c = AlphaBetaCPU.evalCache;
    c.set(key, val);
    if (c.size > AlphaBetaCPU.MAX_CACHE_SIZE) {
      // 最古エントリを削除 (Map は挿入順)
      const oldestKey = c.keys().next().value;
      c.delete(oldestKey);
    }
  }

  /**
   * キャッシュから指定数のエントリを削除
   * @param {number} count 削除するエントリ数
   */
  pruneCache(count) {
    const c = AlphaBetaCPU.evalCache;
    const keys = Array.from(c.keys());
    const deleteCount = Math.min(count, keys.length);

    // 最も古いエントリから削除
    for (let i = 0; i < deleteCount; i++) {
      c.delete(keys[i]);
    }
  }

  getCacheKey(b, d, m) {
    return `${b.blackBoard.toString()},${b.whiteBoard.toString()},${d},${m}`;
  }

  /*───────────────────────────────────────────────*
   *  評価関数                                     *
   *───────────────────────────────────────────────*/
  evaluateBoard(bd) {
    const { black, white } = bd.score();
    const my  = this.color === "black" ? black : white;
    const opp = this.color === "black" ? white : black;
    const tot = my + opp;
    let s = 0;

    // 終局時は実際のスコアを返す（完全解析）
    if (this.isGameOver(bd)) {
      return my > opp ? 1000000 : my < opp ? -1000000 : 0;
    }

    // 序盤（30手未満）は中央配置を重視
    if (tot < 30) {
      s += this.evaluateEarlyGame(bd) * 3; // 序盤評価の重みを増加
    }
    // 移行期（30-40手）は徐々に通常評価に移行
    else if (tot < 40) {
      const transitionFactor = (tot - 30) / 10; // 0.0～1.0
      s += this.evaluateEarlyGame(bd) * 3 * (1 - transitionFactor);
    }

    /* 1. 駒差 */
    s += (my - opp) * this.getPieceWeight(tot);

    /* 2. 角関連 */
    const cornerWeight = tot < 30 ?
                        AlphaBetaCPU.W.CORNER * 0.2 : // 序盤は角の重みを下げる
                        tot < 40 ?
                        AlphaBetaCPU.W.CORNER * (0.2 + 0.8 * (tot - 30) / 10) : // 移行期は徐々に上げる
                        AlphaBetaCPU.W.CORNER;

    s += this.evaluateCorners(bd) * cornerWeight;
    s += this.evaluateCornerOpportunity(bd) * AlphaBetaCPU.W.CORNER_OPPORTUNITY;

    /* 3. 罠 (X / C/B) */
    s += this.evaluateXTrap(bd)             * AlphaBetaCPU.W.X_TRAP;
    s += this.evaluateCBTrap(bd)            * AlphaBetaCPU.W.CB_TRAP;

    /* 4. モビリティ（終盤は無視） */
    if (tot < 50) {
      s += this.evaluateMobility(bd)        * AlphaBetaCPU.W.MOBILITY;
    }

    /* 5. 安定石 + フロンティア + 潜在モビリティ */
    s += this.evaluateStability(bd)         * AlphaBetaCPU.W.STABILITY;
    s += this.evaluateFrontier(bd)          * AlphaBetaCPU.W.FRONTIER;
    s += this.evaluatePotentialMobility(bd) * AlphaBetaCPU.W.POTENTIAL_MOBILITY;

    // 終盤に近づくほど駒差を重視
    if (tot >= 50) {
      s = s * 0.2 + (my - opp) * 5 * (tot - 49);
    }

    return s;
  }

  /** 序盤専用の評価関数 */
  evaluateEarlyGame(bd) {
    let score = 0;

    // 中央配置ボーナス
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const p = bd.getPiece(r, c);
        if (!p) continue;

        // 中央エリア（1-6, 1-6）
        const isCentralArea = r >= 1 && r <= 6 && c >= 1 && c <= 6;

        // 内側エリア（2-5, 2-5）
        const isInnerArea = r >= 2 && r <= 5 && c >= 2 && c <= 5;

        // 辺や角付近
        const isEdgeArea = r === 0 || r === 7 || c === 0 || c === 7;

        if (p === this.color) {
          if (isInnerArea) score += 15;
          else if (isCentralArea) score += 8;
          else if (isEdgeArea) score -= 20;
        } else {
          if (isInnerArea) score -= 15;
          else if (isCentralArea) score -= 8;
          else if (isEdgeArea) score += 20;
        }
      }
    }

    return score;
  }

  /*───────────────────────────────────────────────*
   *  評価関数：各項目                             *
   *───────────────────────────────────────────────*/
  /** 駒差重み */
  getPieceWeight(t) {
    const w = AlphaBetaCPU.PIECE_DIFF_W;
    return t >= 54 ? w.LATE : t >= 40 ? w.LATE_MID : t >= 20 ? w.MID : w.EARLY;
  }

  /** 角保有数（自 +1 / 相手 -2）*/
  evaluateCorners(b) {
    const cs = [[0,0],[0,7],[7,0],[7,7]];
    let v = 0;
    for (const [r,c] of cs) {
      const p = b.getPiece(r,c);
      if (p === this.color)        v += 1;
      else if (p === this.oppColor) v -= 2;
    }
    return v;
  }

  /** 角を「次に取れる手」数差 */
  evaluateCornerOpportunity(b) {
    return this.cornerCnt(b,this.color) - this.cornerCnt(b,this.oppColor);
  }

  cornerCnt(b, clr) {
    return this.getValidMoves(b,clr)
      .filter(({row,col}) => (row===0||row===7) && (col===0||col===7))
      .length;
  }

  /** X マス罠（角が空→自分の X →減点）*/
  evaluateXTrap(b) {
    const xs = [[1,1],[1,6],[6,1],[6,6]];
    let r = 0;
    for (const [y,x] of xs) {
      const p = b.getPiece(y,x);
      if (!p) continue;
      const cy = y === 1 ? 0 : 7;
      const cx = x === 1 ? 0 : 7;
      if (b.getPiece(cy,cx) !== null) continue; // 角埋まっていれば安全
      if (p === this.color)        r += 1;
      else if (p === this.oppColor) r -= 1;
    }
    return r; // W.X_TRAP が負なので自分の X は大減点
  }

  /** C/B マス罠 */
  evaluateCBTrap(b) {
    const danger = [
      /* C */ [0,1],[1,0],[0,6],[1,7],[6,0],[7,1],[6,7],[7,6],
      /* B */ [0,2],[2,0],[0,5],[5,0],[7,2],[5,7],[7,5],[2,7]
    ];
    let r = 0;
    for (const [y,x] of danger) {
      const p = b.getPiece(y,x);
      if (!p) continue;
      const cy = y <= 1 ? 0 : 7;
      const cx = x <= 1 ? 0 : 7;
      if (b.getPiece(cy,cx) !== null) continue; // 角埋まっていれば OK
      if (p === this.color)        r += 1;
      else if (p === this.oppColor) r -= 1;
    }
    return r; // W.CB_TRAP が負
  }

  /** モビリティ差 */
  evaluateMobility(b) {
    return this.getValidMoves(b,this.color).length -
           this.getValidMoves(b,this.oppColor).length;
  }

  /** 安定石評価（改良版）*/
  evaluateStability(b) {
    // 角の安定石
    const cs = [[0,0],[0,7],[7,0],[7,7]];
    let my = 0, op = 0;

    // 角の安定石（角 + その隣接マス）
    for (const [r,c] of cs) {
      const own = b.getPiece(r,c);
      if (!own) continue;

      // 角自体
      if (own === this.color) my += 3;
      else op += 3;

      // 隣接マス
      const adj = [[0,1],[1,0],[1,1]]
        .map(([dy,dx]) => [r+dy*(r===7?-1:1), c+dx*(c===7?-1:1)]);

      for (const [y,x] of adj) {
        const p = b.getPiece(y,x);
        if (p === this.color && own === this.color) my++;
        else if (p === this.oppColor && own === this.oppColor) op++;
      }
    }

    // 辺の安定石
    const edges = [
      // 上辺
      [[0,1],[0,2],[0,3],[0,4],[0,5],[0,6]],
      // 下辺
      [[7,1],[7,2],[7,3],[7,4],[7,5],[7,6]],
      // 左辺
      [[1,0],[2,0],[3,0],[4,0],[5,0],[6,0]],
      // 右辺
      [[1,7],[2,7],[3,7],[4,7],[5,7],[6,7]]
    ];

    for (const edge of edges) {
      let filled = true;
      let myCount = 0, opCount = 0;

      // 辺が全て埋まっているか確認
      for (const [y,x] of edge) {
        const p = b.getPiece(y,x);
        if (!p) {
          filled = false;
          break;
        }
        if (p === this.color) myCount++;
        else opCount++;
      }

      // 辺が全て埋まっている場合、安定石としてカウント
      if (filled) {
        my += myCount;
        op += opCount;
      }
    }

    return my - op;
  }

  /** フロンティア石差 */
  evaluateFrontier(b) {
    const d = [[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]];
    let myF = 0, opF = 0;
    for (let y = 0; y < 8; y++) {
      for (let x = 0; x < 8; x++) {
        const p = b.getPiece(y,x);
        if (!p) continue;
        for (const [dy,dx] of d) {
          const ny = y + dy, nx = x + dx;
          if (ny < 0 || ny > 7 || nx < 0 || nx > 7) continue;
          if (b.getPiece(ny,nx) === null) {
            p === this.color ? myF++ : opF++;
            break;
          }
        }
      }
    }
    return myF - opF;
  }

  /** 潜在モビリティ差 */
  evaluatePotentialMobility(b) {
    const d = [[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]];
    let my = 0, op = 0;
    for (let y = 0; y < 8; y++) {
      for (let x = 0; x < 8; x++) {
        if (b.getPiece(y,x) !== null) continue;
        let adjMy = false, adjOp = false;
        for (const [dy,dx] of d) {
          const ny = y + dy, nx = x + dx;
          if (ny < 0 || ny > 7 || nx < 0 || nx > 7) continue;
          const p = b.getPiece(ny,nx);
          if (p === this.color)       adjMy = true;
          else if (p === this.oppColor) adjOp = true;
        }
        if (adjOp) my++;
        if (adjMy) op++;
      }
    }
    return my - op;
  }

  /*───────────────────────────────────────────────*
   *  手順並べ替え & 深さ調整                      *
   *───────────────────────────────────────────────*/
  getMoveSortKey(mv) {
    // 総石数を取得（ゲームフェーズ判定用）
    const totalPieces = this.bitBoard.score().black + this.bitBoard.score().white;

    // ゲームフェーズの判定（序盤、移行期、中盤以降）
    const isEarlyGame = totalPieces < 30;  // 序盤を30手未満に拡張
    const isTransitionPhase = totalPieces >= 30 && totalPieces < 40; // 30-40手は移行期

    // 角の評価（フェーズに応じて調整）
    const corner = (mv.row===0||mv.row===7)&&(mv.col===0||mv.col===7);
    if (corner) {
      if (isEarlyGame) return -5000;  // 序盤は角を避ける
      if (isTransitionPhase) {
        // 移行期は徐々に角の評価を上げる
        const transitionFactor = (totalPieces - 30) / 10; // 0.0～1.0
        return transitionFactor * 10000 - 5000;
      }
      return 10000; // 中盤以降は角を最優先
    }

    // ヒストリーヒューリスティックを活用
    const key = `${mv.row},${mv.col}`;
    const historyScore = AlphaBetaCPU.historyTable.get(key) || 0;

    // 静的評価と組み合わせる
    return historyScore * 10 + this.getMoveValue(mv, totalPieces);
  }

  getMoveValue({ row:r, col:c }, totalPieces) {
    // ゲームフェーズの判定
    const isEarlyGame = totalPieces < 30;
    const isTransitionPhase = totalPieces >= 30 && totalPieces < 40;
    const transitionFactor = isTransitionPhase ? (totalPieces - 30) / 10 : 0; // 0.0～1.0

    // 位置の特性判定
    const isCorner = (r===0||r===7) && (c===0||c===7);
    const isX = (r===1&&c===1)||(r===1&&c===6)||(r===6&&c===1)||(r===6&&c===6);
    const isC = (r===0&&c===1)||(r===1&&c===0)||(r===0&&c===6)||(r===1&&c===7)||
                (r===7&&c===1)||(r===6&&c===0)||(r===7&&c===6)||(r===6&&c===7);
    const isB = (r===0&&c===2)||(r===2&&c===0)||(r===0&&c===5)||(r===5&&c===0)||
                (r===7&&c===2)||(r===5&&c===7)||(r===7&&c===5)||(r===2&&c===7);
    const isEdge = r === 0 || r === 7 || c === 0 || c === 7;
    const isCentralArea = r >= 1 && r <= 6 && c >= 1 && c <= 6;
    const isInnerArea = r >= 2 && r <= 5 && c >= 2 && c <= 5;

    // 序盤（30手未満）
    if (isEarlyGame) {
      if (isInnerArea) return 300;  // 中央の内側を最優先
      if (isCentralArea) return 200; // 中央エリアを優先
      if (isEdge) return -300;      // 辺を避ける
      if (isX) return -500;         // Xマスを強く避ける
      if (isC) return -400;         // Cマスを強く避ける
      if (isB) return -350;         // Bマスを避ける
      return 0;
    }

    // 移行期（30-40手）
    if (isTransitionPhase) {
      // 序盤と中盤の評価を徐々に混合
      if (isCorner) {
        return transitionFactor * 1000; // 徐々に角を評価
      }
      if (isInnerArea) {
        return 300 * (1 - transitionFactor) + 50 * transitionFactor;
      }
      if (isCentralArea) {
        return 200 * (1 - transitionFactor) + 30 * transitionFactor;
      }
      if (isX) {
        return -500 * (1 - transitionFactor) + (-150) * transitionFactor;
      }
      if (isC) {
        return -400 * (1 - transitionFactor) + (-120) * transitionFactor;
      }
      if (isB) {
        return -350 * (1 - transitionFactor) + (-60) * transitionFactor;
      }
      if (isEdge) {
        return -300 * (1 - transitionFactor) + 50 * transitionFactor;
      }
      return 0;
    }

    // 中盤以降（40手以上）は通常の評価
    if (isCorner) return 1000;
    if (isX) return -150;
    if (isC) return -120;
    if (isB) return -60;
    if (isEdge) return 50;
    return 0;
  }

  getDepthAdjustment(mv) {
    const { row:r, col:c } = mv;
    if ((r===0||r===7)&&(c===0||c===7))
      return AlphaBetaCPU.DEPTH_ADJUSTMENTS.CORNER;
    if ((r===1&&c===1)||(r===1&&c===6)||(r===6&&c===1)||(r===6&&c===6))
      return AlphaBetaCPU.DEPTH_ADJUSTMENTS.X_SQUARE;
    if ((r===0&&c===1)||(r===1&&c===0)||(r===0&&c===6)||(r===1&&c===7)||
        (r===7&&c===1)||(r===6&&c===0)||(r===7&&c===6)||(r===6&&c===7))
      return AlphaBetaCPU.DEPTH_ADJUSTMENTS.C_SQUARE;
    if (r===0||r===7||c===0||c===7)
      return AlphaBetaCPU.DEPTH_ADJUSTMENTS.EDGE;
    return 0;
  }
}
