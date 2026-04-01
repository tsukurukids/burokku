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

    if (THEME.style === 'PUFFY') {
        // --- 【修正版】超・ぷっくりスタイル ---
        const r = size * 0.35; 
        const m = 3; 

        // 角丸の四角形を描く命令（古いブラウザでも動くようにするね）
        function drawRoundedRect(ctx, x, y, width, height, radius) {
            ctx.beginPath();
            ctx.moveTo(x + radius, y);
            ctx.lineTo(x + width - radius, y);
            ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
            ctx.lineTo(x + width, y + height - radius);
            ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
            ctx.lineTo(x + radius, y + height);
            ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
            ctx.lineTo(x, y + radius);
            ctx.quadraticCurveTo(x, y, x + radius, y);
            ctx.closePath();
        }

        // 1. 深い影
        cxt.fillStyle = 'rgba(0,0,0,0.4)';
        drawRoundedRect(cxt, px + m, py + m + 4, size - m*2, size - m*2, r);
        cxt.fill();

        // 2. メインのクッション
        cxt.fillStyle = color;
        drawRoundedRect(cxt, px + m, py + m, size - m*2, size - m*2, r);
        cxt.fill();

        // 3. 上側のハイライト
        cxt.fillStyle = 'rgba(255,255,255,0.3)';
        drawRoundedRect(cxt, px + m + 4, py + m + 4, size - m*2 - 8, (size - m*2) * 0.4, r*0.8);
        cxt.fill();

        // 4. キラーン光
        cxt.fillStyle = 'white';
        cxt.globalAlpha = 0.5;
        cxt.beginPath();
        cxt.arc(px + size * 0.35, py + size * 0.35, size * 0.12, 0, Math.PI * 2);
        cxt.fill();
        cxt.globalAlpha = 1.0;

    } else if (THEME.style === 'GEM') {
        // --- 【NEW】もっとリアルな宝石スタイル ---
        // 1. ベースの色（少し暗め）
        cxt.fillStyle = color;
        cxt.fillRect(px, py, size, size);

        const inset = size * 0.2;

        // 2. 宝石の「カット（面）」を描くよ
        // 上の面
        cxt.fillStyle = getBrighter(color, 60);
        cxt.beginPath();
        cxt.moveTo(px, py);
        cxt.lineTo(px + size, py);
        cxt.lineTo(px + size - inset, py + inset);
        cxt.lineTo(px + inset, py + inset);
        cxt.fill();

        // 左の面
        cxt.fillStyle = getBrighter(color, 30);
        cxt.beginPath();
        cxt.moveTo(px, py);
        cxt.lineTo(px + inset, py + inset);
        cxt.lineTo(px + inset, py + size - inset);
        cxt.lineTo(px, py + size);
        cxt.fill();

        // 右の面（暗め）
        cxt.fillStyle = 'rgba(0,0,0,0.2)';
        cxt.beginPath();
        cxt.moveTo(px + size, py);
        cxt.lineTo(px + size, py + size);
        cxt.lineTo(px + size - inset, py + size - inset);
        cxt.lineTo(px + size - inset, py + inset);
        cxt.fill();

        // 下の面（一番暗め）
        cxt.fillStyle = 'rgba(0,0,0,0.4)';
        cxt.beginPath();
        cxt.moveTo(px, py + size);
        cxt.lineTo(px + size, py + size);
        cxt.lineTo(px + size - inset, py + size - inset);
        cxt.lineTo(px + inset, py + size - inset);
        cxt.fill();

        // 3. 真ん中の「コア（中心）」を明るく光らせるよ
        cxt.fillStyle = getBrighter(color, 120);
        cxt.fillRect(px + inset, py + inset, size - inset * 2, size - inset * 2);

        // 4. キラーン！という白い光の反射
        cxt.fillStyle = 'white';
        cxt.beginPath();
        cxt.arc(px + inset * 1.5, py + inset * 1.5, size * 0.08, 0, Math.PI * 2);
        cxt.fill();

        // 全体のワク線（細め）
        cxt.strokeStyle = 'black';
        cxt.lineWidth = 0.5;
        cxt.strokeRect(px, py, size, size);

    } else if (THEME.style === 'SIMPLE') {
        // --- シンプル ---
        cxt.fillStyle = color;
        cxt.fillRect(px + 1, py + 1, size - 2, size - 2);
        cxt.strokeStyle = '#fff';
        cxt.lineWidth = 1;
        cxt.strokeRect(px + 1, py + 1, size - 2, size - 2);

    } else if (THEME.style === 'NEON') {
        // --- ❌ 【NEW】ネオン ---
        cxt.fillStyle = '#000'; // 中は黒
        cxt.fillRect(px, py, size, size);
        cxt.strokeStyle = color; // 外側の枠が光るよ
        cxt.lineWidth = 4;
        cxt.shadowBlur = 10;
        cxt.shadowColor = color;
        cxt.strokeRect(px + 2, py + 2, size - 4, size - 4);
        cxt.shadowBlur = 0; // 他の描画に影響しないように戻すね

    } else if (THEME.style === 'LEGO') {
        // --- 【修正版】超・レゴ風スタイル ---
        // 1. ブロック本体
        cxt.fillStyle = color;
        cxt.fillRect(px, py, size, size);

        // 2. 本体の右下（濃いカゲ）と左上（明るい反射）
        cxt.fillStyle = 'rgba(0,0,0,0.3)';
        cxt.fillRect(px, py + size - 4, size, 4); // 下のカゲ
        cxt.fillRect(px + size - 4, py, 4, size); // 右のカゲ
        cxt.fillStyle = 'rgba(255,255,255,0.4)';
        cxt.fillRect(px, py, size, 4); // 上の光
        cxt.fillRect(px, py, 4, size); // 左の光

        // 3. 真ん中のポッチ（飛び出している部分）
        const cx = px + size / 2;
        const cy = py + size / 2;
        const r = size * 0.3;

        // ポッチのカゲ
        cxt.fillStyle = 'rgba(0,0,0,0.5)';
        cxt.beginPath();
        cxt.arc(cx + 2, cy + 2, r, 0, Math.PI * 2);
        cxt.fill();

        // ポッチの本体
        cxt.fillStyle = color;
        cxt.beginPath();
        cxt.arc(cx, cy, r, 0, Math.PI * 2);
        cxt.fill();

        // ポッチの上のハイライト（つやつや感）
        cxt.fillStyle = 'rgba(255,255,255,0.5)';
        cxt.beginPath();
        cxt.arc(cx - 2, cy - 2, r * 0.7, 0, Math.PI * 2);
        cxt.fill();

        // ポッチの輪郭（りんかく）
        cxt.strokeStyle = 'rgba(0,0,0,0.2)';
        cxt.lineWidth = 1;
        cxt.beginPath();
        cxt.arc(cx, cy, r, 0, Math.PI * 2);
        cxt.stroke();

    } else if (THEME.style === 'CHOCO') {
        // --- 【修正版】トロ〜リ・リッチチョコスタイル ---
        const chocoColor = '#4d2b1a'; // チョコの基本の色
        cxt.fillStyle = chocoColor;
        cxt.fillRect(px, py, size, size);

        // 1. 厚み（立体感）を出すためのふち
        cxt.fillStyle = 'rgba(255,255,255,0.1)';
        cxt.fillRect(px, py, size, 2); // 上の明るいふち
        cxt.fillRect(px, py, 2, size); // 左の明るいふち
        cxt.fillStyle = 'rgba(0,0,0,0.3)';
        cxt.fillRect(px, py + size - 3, size, 3); // 下の暗いふち
        cxt.fillRect(px + size - 3, py, 3, size); // 右の暗いふち

        // 2. トロ〜リ垂れているエフェクトを描くよ
        cxt.fillStyle = chocoColor;
        // 左側のしずく
        cxt.beginPath();
        cxt.arc(px + size * 0.25, py + size * 0.8, size * 0.2, 0, Math.PI * 2);
        cxt.fill();
        cxt.beginPath();
        cxt.arc(px + size * 0.25, py + size * 1.0, size * 0.15, 0, Math.PI * 2);
        cxt.fill();
        
        // 右側のしずく
        cxt.beginPath();
        cxt.arc(px + size * 0.75, py + size * 0.9, size * 0.15, 0, Math.PI * 2);
        cxt.fill();

        // 3. しずくの立体感（ハイライト）
        cxt.fillStyle = 'rgba(255,255,255,0.15)';
        cxt.beginPath();
        cxt.arc(px + size * 0.2, py + size * 0.95, size * 0.05, 0, Math.PI * 2);
        cxt.fill();

        // 4. 板チョコ風の「くぼみ」をうっすら入れるよ
        cxt.strokeStyle = 'rgba(0,0,0,0.2)';
        cxt.lineWidth = 1;
        cxt.strokeRect(px + 4, py + 4, size - 8, size - 8);

    } else if (THEME.style === 'STAR') {
        // --- ❌ 【NEW】スター ---
        cxt.fillStyle = color;
        cxt.fillRect(px, py, size, size);
        // 真ん中の星！
        cxt.fillStyle = 'yellow';
        const cx = px + size / 2;
        const cy = py + size / 2;
        const spikes = 5;
        const outerRadius = size * 0.35;
        const innerRadius = size * 0.15;
        let rot = Math.PI / 2 * 3;
        const step = Math.PI / spikes;

        cxt.beginPath();
        cxt.moveTo(cx, cy - outerRadius);
        for (let i = 0; i < spikes; i++) {
            cxt.lineTo(cx + Math.cos(rot) * outerRadius, cy + Math.sin(rot) * outerRadius);
            rot += step;
            cxt.lineTo(cx + Math.cos(rot) * innerRadius, cy + Math.sin(rot) * innerRadius);
            rot += step;
        }
        cxt.lineTo(cx, cy - outerRadius);
        cxt.closePath();
        cxt.fill();

    } else {
        // --- ふつうスタイル (DEFAULT) ---
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
    }

    // 全体の枠線
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

    // ボード上のブロック（下に描くよ）
    board.forEach((row, y) => {
        row.forEach((v, x) => {
            if (v !== 0) drawBlock(ctx, x, y, v, BLOCK_SIZE);
        });
    });

    // アドベンチャーモードの白いブロック（ターゲット）を上に描くよ
    if (currentMode === 'ADVENTURE') {
        targetPattern.forEach(t => {
            // まだ消えていない白いブロックだけを描くよ
            if (!t.collected) {
                const px = t.c * BLOCK_SIZE;
                const py = t.r * BLOCK_SIZE;

                // 外枠（線）だけが光るようにするよ
                ctx.save();
                
                const padding = BLOCK_SIZE * 0.15;
                const rectSize = BLOCK_SIZE - padding * 2;

                // 🌈 黄色などの明るいブロックの上でも見えるように、まずは黒い「ふち」を描くよ
                ctx.strokeStyle = '#000000';
                ctx.lineWidth = 4; // 白い線より少し太めにするね
                ctx.strokeRect(px + padding, py + padding, rectSize, rectSize);

                // 💡 次にいつもの「白い光る線」を重ねて描くよ
                ctx.shadowBlur = 10;
                ctx.shadowColor = '#FFFFFF';
                ctx.strokeStyle = '#FFFFFF';
                ctx.lineWidth = 2.5; 
                ctx.strokeRect(px + padding, py + padding, rectSize, rectSize);
                
                // 中はうっすら見える程度に半透明の白を入れるね
                ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
                ctx.fillRect(px + padding, py + padding, rectSize, rectSize);

                ctx.restore();
            }
        });
    }

    // ゴーストプレビュー（次に置く場所のヒント）
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

    // 💥 キラキラを描くよ！
    particles.forEach(p => {
        ctx.globalAlpha = p.life; // 消えそうになると透明にするね
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1.0;
    });
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
