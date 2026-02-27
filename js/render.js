// ========================================
// 描画ロジック
// ========================================

/**
 * 色を明るくする
 * @param {string} hex - 16進数カラーコード
 * @param {number} amount - 明るくする量
 * @returns {string} 明るくされたカラーコード
 */
function getBrighter(hex, amount) {
    let r = parseInt(hex.substring(1, 3), 16);
    let g = parseInt(hex.substring(3, 5), 16);
    let b = parseInt(hex.substring(5, 7), 16);

    r = Math.min(255, r + amount);
    g = Math.min(255, g + amount);
    b = Math.min(255, b + amount);

    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

/**
 * ブロックを描画
 * @param {CanvasRenderingContext2D} cxt - キャンバスコンテキスト
 * @param {number} x - X座標（グリッド）
 * @param {number} y - Y座標（グリッド）
 * @param {string} color - ブロックの色
 * @param {number} size - ブロックのサイズ
 * @param {boolean} isSil - シルエット表示か
 * @param {boolean} isCol - 収集済みか
 */
function drawBlock(cxt, x, y, color, size, isSil = false, isCol = false) {
    const px = x * size;
    const py = y * size;

    // シルエット表示（未収集）
    if (isSil && !isCol) {
        cxt.strokeStyle = 'rgba(255,255,255,0.4)';
        cxt.lineWidth = 1.5;
        cxt.strokeRect(px + size * 0.15, py + size * 0.15, size * 0.7, size * 0.7);
        return;
    }

    // ブロック本体
    cxt.fillStyle = color;
    cxt.fillRect(px, py, size, size);

    // ハイライト（左上）
    cxt.fillStyle = getBrighter(color, 120);
    cxt.beginPath();
    cxt.moveTo(px, py);
    cxt.lineTo(px + size, py);
    cxt.lineTo(px + size, py + 3);
    cxt.lineTo(px + 3, py + 3);
    cxt.lineTo(px + 3, py + size);
    cxt.lineTo(px, py + size);
    cxt.closePath();
    cxt.fill();

    // シャドウ（右下）
    cxt.fillStyle = 'rgba(0,0,0,0.7)';
    cxt.beginPath();
    cxt.moveTo(px + size, py + size);
    cxt.lineTo(px, py + size);
    cxt.lineTo(px + 3, py + size - 3);
    cxt.lineTo(px + size - 3, py + size - 3);
    cxt.lineTo(px + size - 3, py + 3);
    cxt.lineTo(px + size, py);
    cxt.closePath();
    cxt.fill();

    // 光沢
    cxt.fillStyle = 'rgba(255,255,255,0.4)';
    cxt.fillRect(px + size * 0.15, py + size * 0.15, size * 0.15, size * 0.15);

    // 枠線
    cxt.strokeStyle = '#000';
    cxt.lineWidth = 1;
    cxt.strokeRect(px, py, size, size);
}

/**
 * メインキャンバスを描画
 */
function drawMain() {
    // 背景
    ctx.fillStyle = THEME.bg;
    ctx.fillRect(0, 0, mainCanvas.width, mainCanvas.height);

    // グリッド線
    ctx.strokeStyle = '#444';
    ctx.lineWidth = 1;

    // 縦線
    for (let i = 0; i <= COLS; i++) {
        ctx.beginPath();
        ctx.moveTo(i * BLOCK_SIZE, 0);
        ctx.lineTo(i * BLOCK_SIZE, mainCanvas.height);
        ctx.stroke();
    }

    // 横線
    for (let i = 0; i <= ROWS; i++) {
        ctx.beginPath();
        ctx.moveTo(0, i * BLOCK_SIZE);
        ctx.lineTo(mainCanvas.width, i * BLOCK_SIZE);
        ctx.stroke();
    }

    // ボード上のブロック
    board.forEach((row, y) => {
        row.forEach((v, x) => {
            if (v !== 0) drawBlock(ctx, x, y, v, BLOCK_SIZE);
        });
    });

    // 【修正】ターゲットパターンをブロックの上に描画し、最初から光るエフェクトを追加
    if (currentMode === 'ADVENTURE') {
        targetPattern.forEach(t => {
            if (t.collected) return;

            ctx.save();
            if (t.filled) {
                // ブロックが置かれている場合：より強く白く光る
                ctx.shadowBlur = 15;
                ctx.shadowColor = '#00bfff';
                ctx.strokeStyle = '#ffffff';
                ctx.lineWidth = 3;
            } else {
                // まだ置かれていない場合：最初から水色のネオンのように光る
                ctx.shadowBlur = 8;
                ctx.shadowColor = '#00bfff';
                ctx.strokeStyle = 'rgba(173, 216, 230, 0.9)'; // 薄い水色
                ctx.lineWidth = 2;
            }

            // 外側の枠
            ctx.strokeRect(t.c * BLOCK_SIZE + 2, t.r * BLOCK_SIZE + 2, BLOCK_SIZE - 4, BLOCK_SIZE - 4);

            // 内側の細い光
            ctx.shadowBlur = 0;
            ctx.strokeStyle = '#00bfff';
            ctx.lineWidth = 1;
            ctx.strokeRect(t.c * BLOCK_SIZE + 4, t.r * BLOCK_SIZE + 4, BLOCK_SIZE - 8, BLOCK_SIZE - 8);

            ctx.restore();
        });
    }

    // ゴーストプレビュー（配置予測）
    if (selectedPieceIndex !== -1 && (isDragging || ghostPosition.x !== -1)) {
        const p = currentPieces[selectedPieceIndex];
        const ok = isValid(p.matrix, ghostPosition.x, ghostPosition.y);

        p.matrix.forEach((row, y) => {
            row.forEach((v, x) => {
                if (v !== 0) {
                    const bx = ghostPosition.x + x;
                    const by = ghostPosition.y + y;

                    if (bx >= 0 && bx < COLS && by >= 0 && by < ROWS && board[by][bx] === 0) {
                        ctx.fillStyle = ok ? 'rgba(0, 255, 0, 0.3)' : 'rgba(255, 0, 0, 0.3)';
                        ctx.fillRect(bx * BLOCK_SIZE, by * BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE);
                    }
                }
            });
        });
    }
}

/**
 * ピース選択エリアを描画
 */
function drawSelection() {
    const scBS = BLOCK_SIZE * PIECE_SCALE_FACTOR;
    const slotS = scBS * PIECE_SLOT_MAX_GRID;

    pieceSelection.innerHTML = '';

    currentPieces.forEach((p, i) => {
        const slot = document.createElement('div');
        slot.className = `piece-slot ${p ? '' : 'empty'}`;

        if (p) {
            slot.addEventListener('mousedown', (e) => startDrag(e, i));
            slot.addEventListener('touchstart', (e) => startDrag(e, i));
        }

        const cv = document.createElement('canvas');
        cv.width = slotS;
        cv.height = slotS;
        slot.appendChild(cv);
        pieceSelection.appendChild(slot);

        if (p) {
            const pc = cv.getContext('2d');
            pc.fillStyle = '#2c2c54';
            pc.fillRect(0, 0, slotS, slotS);

            const ox = (slotS - p.matrix[0].length * scBS) / 2 / scBS;
            const oy = (slotS - p.matrix.length * scBS) / 2 / scBS;

            p.matrix.forEach((row, y) => {
                row.forEach((v, x) => {
                    if (v !== 0) drawBlock(pc, x + ox, y + oy, p.color, scBS);
                });
            });
        }
    });
}
