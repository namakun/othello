/* 盤上 index → {row,col} 変換だけを担当 (View Helper) */

export function toRowCol(idx) {
    return { row: idx >> 3, col: idx & 7 };
  }

  export function indicesToRowCols(idxs) {
    return idxs.map(toRowCol);
  }

  export function groupsToRowCols(groups) {
    return groups.map(g => indicesToRowCols(g));
  }
