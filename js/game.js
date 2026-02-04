// ========================================
// ゲームロジック
// ========================================

// ゲーム状態変数
let board = [];
let score = 0;
let currentCombo = 0;
let missCount = 0;
let currentPieces = [];
let selectedPieceIndex = -1;
let isGameOver = false;
let currentMode = 'SOLO';
let adventureProgress = 0;
let targetPattern = [];
let BLOCK_SIZE = 0;

// ドラッグ関連
let isDragging = false;
let dragStartOffset = { x: 0, y: 0 };
let ghostPosition = { x: -1, y: -1 };
let floatingPieceElement = null;

/**
 * ピースが配置可能かチェック
 * @param {Array} m - ピースのマトリックス
 * @param {number} sx - 開始X座標
 * @param {number} sy - 開始Y座標
 * @returns {boolean} 配置可能ならtrue
 */
function isValid(m, sx, sy) {
    for (let y = 0; y < m.length; y++) {
        for (let x = 0; x < m[y].length; x++) {
            if (m[y][x] !== 0) {
                const bx = sx + x;
                const by = sy + y;

                if (bx < 0 || bx >= COLS || by < 0 || by >= ROWS || board[by][bx] !== 0) {
                    return false;
                }
            }
        }
    }
    return true;
}

/**
 * 煽りメッセージを表示
 * @param {string} category - メッセージカテゴリ
 * @param {number} duration - 表示時間（ミリ秒）
 */
function taunt(category, duration = 1800) {
    const msgs = TAUNTS[category];
    if (!msgs) return;

    const msg = msgs[Math.floor(Math.random() * msgs.length)];
    const tDiv = document.getElementById('tauntMessage');

    tDiv.textContent = msg;
    tDiv.style.opacity = 1;

    let color = "#FF00FF";
    if (category.includes("HIGH") || category.includes("GOD") ||
        category.includes("MULTI") || category.includes("ALL_CLEAR") ||
        category.includes("COMPLETE")) {
        color = "#FFD700";
    }
    if (category.includes("DANGER") || category.includes("RISK") || category.includes("LOSS")) {
        color = "#FF4500";
    }

    tDiv.style.color = color;
    tDiv.style.transform = category.includes("GOD") ? 'scale(1.5) rotate(-3deg)' : 'scale(1.1)';

    if (window.tauntT) clearTimeout(window.tauntT);
    window.tauntT = setTimeout(() => {
        tDiv.style.opacity = 0;
        tDiv.style.transform = 'scale(1.0) rotate(0deg)';
    }, duration);
}

/**
 * ピースを配置
 */
function placePiece() {
    const p = currentPieces[selectedPieceIndex];

    // ボードにピースを配置
    p.matrix.forEach((row, y) => {
        row.forEach((v, x) => {
            if (v !== 0) {
                board[ghostPosition.y + y][ghostPosition.x + x] = p.color;
            }
        });
    });

    currentPieces[selectedPieceIndex] = null;
    score += 10;

    if (p.matrix.length === 3 && p.matrix[0].length === 3) {
        taunt("BIG_BLOCK");
    }

    // 完成した行と列をチェック
    let cr = [], cc = [];

    for (let y = 0; y < ROWS; y++) {
        if (board[y].every(v => v !== 0)) cr.push(y);
    }

    for (let x = 0; x < COLS; x++) {
        let f = true;
        for (let y = 0; y < ROWS; y++) {
            if (board[y][x] === 0) {
                f = false;
                break;
            }
        }
        if (f) cc.push(x);
    }

    const tot = cr.length + cc.length;

    if (tot > 0) {
        currentCombo++;
        missCount = 0;

        let base = tot === 1 ? 100 : (tot === 2 ? 1000 : Math.pow(10, tot + 1));
        score += Math.round(base * (1 + currentCombo * 0.2));
        playSound(1200, 0.15);

        if (tot === 2) taunt("LINES_2");
        else if (tot >= 3) taunt("LINES_MULTI");

        if (currentCombo >= 15) taunt("COMBO_GOD");
        else if (currentCombo >= 10) taunt("COMBO_HIGH");
        else if (currentCombo >= 5) taunt("COMBO_MID");
        else if (currentCombo >= 3) taunt("COMBO_START");

        // アドベンチャーモードの処理
        if (currentMode === 'ADVENTURE') {
            let anyNew = false;
            targetPattern.forEach(t => {
                if (!t.collected && (cr.includes(t.r) || cc.includes(t.c))) {
                    t.collected = true;
                    anyNew = true;
                }
            });

            if (anyNew) taunt("ADVENTURE_COLLECT", 1000);

            if (targetPattern.every(t => t.collected)) {
                adventureProgress++;
                taunt("ADVENTURE_COMPLETE", 2500);

                if (adventureProgress >= ADVENTURE_GOAL) {
                    isGameOver = true;
                    document.getElementById('victoryOverlay').style.display = 'flex';
                } else {
                    generateAdventureShape();
                }
            }
        } else {
            if (board.flat().every(cell => cell === 0)) {
                taunt("ALL_CLEAR", 3000);
            }
        }

        // 行と列をクリア
        cr.forEach(y => board[y].fill(0));
        cc.forEach(x => {
            for (let y = 0; y < ROWS; y++) {
                board[y][x] = 0;
            }
        });
    } else {
        missCount++;
        if (missCount >= 3) {
            if (currentCombo > 0) taunt("COMBO_LOSS");
            currentCombo = 0;
            missCount = 0;
        } else if (missCount === 2) {
            taunt("RISK");
        }
    }

    if (board.flat().filter(v => v !== 0).length / (ROWS * COLS) > 0.75) {
        taunt("DANGER", 1000);
    }

    updateUI();
}

/**
 * ゲームオーバーをチェック
 */
function checkGameOver() {
    const rem = currentPieces.filter(p => p !== null);
    if (rem.length === 0) return;

    let can = false;
    outer: for (const p of rem) {
        for (let r = 0; r < ROWS; r++) {
            for (let c = 0; c < COLS; c++) {
                if (isValid(p.matrix, c, r)) {
                    can = true;
                    break outer;
                }
            }
        }
    }

    if (!can) {
        isGameOver = true;
        document.getElementById('finalScoreText').textContent = `SCORE: ${score}`;
        document.getElementById('gameOverOverlay').style.display = 'flex';
        playSound(100, 0.5, 'square');
        taunt("GAME_OVER", 4000);
    }
}

/**
 * UIを更新
 */
function updateUI() {
    document.getElementById('scoreDisplay').textContent = score;

    if (currentMode === 'ADVENTURE') {
        document.getElementById('modeInfoDisplay').textContent = `SHAPES: ${adventureProgress} / ${ADVENTURE_GOAL}`;
    } else {
        document.getElementById('modeInfoDisplay').innerHTML = `COMBO: ${currentCombo}`;
    }
}

/**
 * アドベンチャーモードの図形を生成
 */
function generateAdventureShape() {
    const temp = ADVENTURE_TEMPLATES[Math.floor(Math.random() * ADVENTURE_TEMPLATES.length)];
    targetPattern = temp.map(c => ({ r: c[0], c: c[1], collected: false }));
}

/**
 * 新しいピースを作成
 * @returns {Object} ピースオブジェクト
 */
function createPiece() {
    const shape = ALL_PIECES[Math.floor(Math.random() * ALL_PIECES.length)];
    return {
        matrix: JSON.parse(JSON.stringify(shape)),
        color: THEME.colors[Math.floor(Math.random() * THEME.colors.length)]
    };
}
