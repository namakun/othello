/**
 * src/utils/cpu/AlphaBetaCPU.js
 * α-β剪定アルゴリズムを使用した CPU AI
 */
import { BaseCPU } from "./BaseCPU";

export class AlphaBetaCPU extends BaseCPU {
/*──────────────── 探索パラメータ ────────────────*/
static BASE_DEPTH          = 5;
static ENDGAME_DEPTH_BONUS = 3;
static TIME_LIMIT_MS       = 1800;      // 1.8 秒
static DEPTH_ADJUSTMENTS = {
  CORNER   : 2,
  EDGE     : 1,   // ← 0.5ply を整数に
  X_SQUARE : 2,
  C_SQUARE : 2
};

/*──────────────── 評価重み ─────────────────────*/
static PIECE_DIFF_W = { EARLY: 1, MID: 3, LATE_MID: 8, LATE: 30 };
static W = {
  CORNER              : 100,
  CORNER_OPPORTUNITY  : 40,
  X_TRAP              : -120,
  CB_TRAP             : -80,
  MOBILITY            : 12,   // 中盤の可動力を重視
  STABILITY           : 5,
  FRONTIER            : -3,
  POTENTIAL_MOBILITY  : 1.5,
  PARITY              : 25     // 追加
};

/*──────────────── TT & History ────────────────*/
static evalCache = new Map(); // key → {depth, flag, val, age}
/* flag: 0=EXACT, 1=LOWER (α cut), 2=UPPER (β cut) */
static MAX_CACHE_SIZE = 400_000;
static historyTable = new Map();
static MAX_HISTORY = 4096;  // エントリ上限

/*──────────────── Zobrist 初期化 ───────────────*/
static initZobrist() {
  if (this.ZOBRIST) return;
  const r = () => Math.floor(Math.random()*2**32)>>>0;
  this.ZOBRIST = {
    piece: Array.from({length:2},()=>Array.from({length:64},()=>r())),
    turn : r()
  };
}
static hashBoard(bd, turnBlack) {
  this.initZobrist();
  let h = 0;
  for (let i=0;i<64;i++){
    const mask = 1n<<BigInt(i);
    if (bd.blackBoard & mask)      h ^= this.ZOBRIST.piece[0][i];
    else if (bd.whiteBoard & mask) h ^= this.ZOBRIST.piece[1][i];
  }
  if (!turnBlack) h ^= this.ZOBRIST.turn;
  return h>>>0;
}

/** Zobrist ハッシュ (64bit) でキャッシュキーを生成 */
getCacheKey(b, d, m) {
  const h = (b.zobrist ^ (m ? 0n : 1n)) ^ BigInt(d);
  return h;               // Map のキーに BigInt を直接使用
}

/*──────────────── 手の選択 ─────────────────────*/
selectMove() {
  const moves = this.getValidMoves();
  if (!moves.length) return null;

  const total = this.bitBoard.score().black + this.bitBoard.score().white;
  const empt  = 64 - total;

  // 初手のみランダム
  if (total === 0) return moves[Math.random()*moves.length|0];

  let baseDepth = AlphaBetaCPU.BASE_DEPTH;
  if (total>=50) baseDepth+=AlphaBetaCPU.ENDGAME_DEPTH_BONUS;
  if (moves.length<=6) baseDepth+=1;
  if (empt<=10) baseDepth = empt;

  // 静的並べ替え
  moves.sort((a,b)=>this.getMoveSortKey(b,this.bitBoard)-this.getMoveSortKey(a,this.bitBoard));

  const start = Date.now();
  let bestMove = moves[0], bestScore=-Infinity;

  let depth = 1;
  while (true) {
    if (Date.now() - start > AlphaBetaCPU.TIME_LIMIT_MS) break;
    if (depth > baseDepth) break;
    let curBest=-Infinity, curMove=null;

    // PV move を先頭へ
    if (bestMove){
      const idx = moves.findIndex(m=>m.row===bestMove.row&&m.col===bestMove.col);
      if (idx>0)[moves[0],moves[idx]]=[moves[idx],moves[0]];
    }

    for (const mv of moves){
      const bd = this.cloneBoard(this.bitBoard);
      bd.applyMove(mv.row,mv.col,this.color);

      const d = Math.max(1, depth + Math.round(this.getDepthAdjustment(mv)));
      let sc;
      if (curMove===null){
        sc = this.alphaBeta(bd,d-1,-Infinity,Infinity,false);
      }else{
        sc = this.alphaBeta(bd,d-1,-curBest,-curBest-1,false); // null-window
        if (sc>curBest) sc = this.alphaBeta(bd,d-1,-Infinity,Infinity,false);
      }

      if (sc>curBest){curBest=sc;curMove=mv;}
      if (Date.now()-start>=AlphaBetaCPU.TIME_LIMIT_MS) break;
    }

    if (curMove){bestMove=curMove;bestScore=curBest;}
    if (bestScore>=1_000_000) break;
    depth++;
  }
  return bestMove;
}

/*──────────────── α-β + TT ─────────────────────*/
alphaBeta(board, depth, alpha, beta, maximizing) {
  const hash = AlphaBetaCPU.hashBoard(board, maximizing ? this.color==="black" : this.color!=="black");
  const entry = AlphaBetaCPU.evalCache.get(hash);
  if (entry && entry.depth>=depth){
    if (entry.flag===0) return entry.val;
    if (entry.flag===1 && entry.val<=alpha) return entry.val;
    if (entry.flag===2 && entry.val>=beta ) return entry.val;
  }

  if (depth===0 || this.isGameOver(board)){
    const v = this.evaluateBoard(board);
    this.cachePut(hash, { depth, flag:0, val:v });
    return v;
  }

  const clr   = maximizing?this.color:this.oppColor;
  const moves = this.getValidMoves(board,clr);

  // パス処理
  if (!moves.length) {
    /* depth は減らさず手番だけ交代（偶奇合わせ） */
    const v = this.alphaBeta(board, depth, alpha, beta, !maximizing);
    this.cachePut(hash, { depth, flag:0, val:v });
    return v;
  }

  moves.sort((a,b)=>{
    const aKey = `${a.row},${a.col}`;
    const bKey = `${b.row},${b.col}`;
    const ah = AlphaBetaCPU.historyTable.get(aKey) || 0;
    const bh = AlphaBetaCPU.historyTable.get(bKey) || 0;
    return (bh-ah)+(this.getMoveSortKey(b, board)-this.getMoveSortKey(a, board));
  });

  let bestVal = maximizing ? -Infinity : Infinity;
  const alphaOrig = alpha, betaOrig = beta;
  for (const mv of moves){
    const nxt = this.cloneBoard(board);
    nxt.applyMove(mv.row,mv.col,clr);
    const v = this.alphaBeta(nxt,depth-1,alpha,beta,!maximizing);

    if (maximizing){
      if (v>bestVal) bestVal=v;
      if (v>alpha)   alpha=v;
    }else{
      if (v<bestVal) bestVal=v;
      if (v<beta)    beta=v;
    }
    if (beta<=alpha){
      const key = `${mv.row},${mv.col}`;
      const historyScore = AlphaBetaCPU.historyTable.get(key) || 0;
      AlphaBetaCPU.historyTable.set(key, Math.min(historyScore + (1 << depth), 1<<15));
      if (AlphaBetaCPU.historyTable.size > AlphaBetaCPU.MAX_HISTORY) {
        AlphaBetaCPU.historyTable.delete(AlphaBetaCPU.historyTable.keys().next().value);
      }
      break;
    }
  }

  const flag = bestVal<=alphaOrig ? 1 : bestVal>=betaOrig ? 2 : 0;
  this.cachePut(hash, { depth, flag, val:bestVal });
  return bestVal;
}

cachePut(hash, entry){
  const tt = AlphaBetaCPU.evalCache;
  tt.set(hash, entry);
  if (tt.size>AlphaBetaCPU.MAX_CACHE_SIZE){
    tt.delete(tt.keys().next().value); // FIFO
  }
}

/*──────────────── 評価関数 (変更箇所あり) ─────*/
evaluateBoard(bd){
  const {black,white}=bd.score();
  const my=this.color==="black"?black:white;
  const op=this.color==="black"?white:black;
  const tot=my+op;

  if (this.isGameOver(bd))
    return my>op?1_000_000:my<op?-1_000_000:0;

  let s=0;
  if (tot<30)           s+=this.evaluateEarlyGame(bd)*3;
  else if (tot<40){
    const t=(tot-30)/10;
    s+=this.evaluateEarlyGame(bd)*3*(1-t);
  }

  s+=(my-op)*this.getPieceWeight(tot);
  const cW = tot<30?AlphaBetaCPU.W.CORNER*0.5
                   :tot<40?AlphaBetaCPU.W.CORNER*(0.2+0.8*(tot-30)/10)
                   :AlphaBetaCPU.W.CORNER;
  s+=this.evaluateCorners(bd)*cW;
  s+=this.evaluateCornerOpportunity(bd)*AlphaBetaCPU.W.CORNER_OPPORTUNITY;
  s+=this.evaluateXTrap(bd)*AlphaBetaCPU.W.X_TRAP;
  s+=this.evaluateCBTrap(bd)*AlphaBetaCPU.W.CB_TRAP;
  if (tot<50) s+=this.evaluateMobility(bd)*AlphaBetaCPU.W.MOBILITY;
  s+=this.evaluateStability(bd)*AlphaBetaCPU.W.STABILITY;
  s+=this.evaluateFrontier(bd)*AlphaBetaCPU.W.FRONTIER;
  s+=this.evaluatePotentialMobility(bd)*AlphaBetaCPU.W.POTENTIAL_MOBILITY;

  /* 6. 最終偶奇パリティ (残り手数が偶=＋, 奇=－) */
  if (64 - tot <= 12) {
    const parity = (64 - tot) & 1 ? -1 : 1;
    s += parity * 30;
  }

  // 注: 偶奇パリティは上記の「最終偶奇パリティ」で処理済み

  if (tot >= 56) {                      // 残り 8 手以下のみ強化
      s = s * 0.3 + (my - op) * 10;
    }
  return s;
}
  /**
   * 序盤専用の評価関数
   * @param {BitBoard} bd ビットボード
   * @returns {number} 評価値
   */
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

  /**
   * 評価関数：各項目
   */
  /**
   * 駒差重み
   * @param {number} t 総石数
   * @returns {number} 重み
   */
  getPieceWeight(t) {
    const w = AlphaBetaCPU.PIECE_DIFF_W;
    return t >= 54 ? w.LATE : t >= 40 ? w.LATE_MID : t >= 20 ? w.MID : w.EARLY;
  }

  /**
   * 角保有数（自 +1 / 相手 -2）
   * @param {BitBoard} b ビットボード
   * @returns {number} 評価値
   */
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

  /**
   * 角を「次に取れる手」数差
   * @param {BitBoard} b ビットボード
   * @returns {number} 評価値
   */
  evaluateCornerOpportunity(b) {
    return this.cornerCnt(b,this.color) - this.cornerCnt(b,this.oppColor);
  }

  /**
   * 角を取れる手の数を計算
   * @param {BitBoard} b ビットボード
   * @param {string} clr 色
   * @returns {number} 角を取れる手の数
   */
  cornerCnt(b, clr) {
    return this.getValidMoves(b,clr)
      .filter(({row,col}) => (row===0||row===7) && (col===0||col===7))
      .length;
  }

  /**
   * X マス罠（角が空→自分の X →減点）
   * @param {BitBoard} b ビットボード
   * @returns {number} 評価値
   */
  evaluateXTrap(b) {
    const xs = [[1,1],[1,6],[6,1],[6,6]];
    let r = 0;
    for (const [y,x] of xs) {
      const p = b.getPiece(y,x);
      if (!p) continue;
      const cy = y === 1 ? 0 : 7;
      const cx = x === 1 ? 0 : 7;
      if (b.getPiece(cy,cx) !== null) continue; // 角埋まっていれば安全
      if (p === this.color)        r += 3;
      else if (p === this.oppColor) r -= 3;
    }
    return r; // W.X_TRAP が負なので自分の X は大減点
  }

  /**
   * C/B マス罠
   * @param {BitBoard} b ビットボード
   * @returns {number} 評価値
   */
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

  /**
   * モビリティ差
   * @param {BitBoard} b ビットボード
   * @returns {number} 評価値
   */
  evaluateMobility(b) {
    return this.getValidMoves(b,this.color).length -
           this.getValidMoves(b,this.oppColor).length;
  }

  /**
   * 安定石評価（改良版）
   * @param {BitBoard} b ビットボード
   * @returns {number} 評価値
   */
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

  /**
   * フロンティア石差
   * @param {BitBoard} b ビットボード
   * @returns {number} 評価値
   */
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

  /**
   * 潜在モビリティ差
   * @param {BitBoard} b ビットボード
   * @returns {number} 評価値
   */
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

  /**
   * 手順並べ替え & 深さ調整
   */
  /**
   * 手の並べ替えキーを取得
   * @param {{row: number, col: number}} mv 手の座標
   * @returns {number} ソートキー
   */
  getMoveSortKey(mv, board = this.bitBoard) {
    // 総石数を取得（ゲームフェーズ判定用）
    const totalPieces = board.score().black + board.score().white;

    // ゲームフェーズの判定（序盤、移行期、中盤以降）
    const isEarlyGame = totalPieces < 30;  // 序盤を30手未満に拡張
    const isTransitionPhase = totalPieces >= 30 && totalPieces < 40; // 30-40手は移行期

    // 角の評価（フェーズに応じて調整）
    const corner = (mv.row===0||mv.row===7)&&(mv.col===0||mv.col===7);
    if (corner) {
      if (isEarlyGame) return 8000; // 序盤でも角は最優先
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

  /**
   * 手の評価値を取得
   * @param {{row: number, col: number}} param0 手の座標
   * @param {number} totalPieces 総石数
   * @returns {number} 評価値
   */
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

  /**
   * 深さ調整値を取得
   * @param {{row: number, col: number}} mv 手の座標
   * @returns {number} 深さ調整値
   */
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
