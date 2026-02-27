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
                const targetY = ghostPosition.y + y;
                const targetX = ghostPosition.x + x;
                board[targetY][targetX] = p.color;

                // 【修正】置いた場所にワクがあれば「埋まった状態(filled)」にする
                if (currentMode === 'ADVENTURE') {
                    targetPattern.forEach(t => {
                        if (t.r === targetY && t.c === targetX) {
                            t.filled = true;
                        }
                    });
                }
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

        // アドベンチャーモードの処理：filled（埋まった）状態かつ列が消えたらcollectedにする
        if (currentMode === 'ADVENTURE') {
            let anyNew = false;
            targetPattern.forEach(t => {
                if (!t.collected && t.filled && (cr.includes(t.r) || cc.includes(t.c))) {
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
                    // ステージクリア画面を表示
                    isGameOver = true;

                    // 10ステージごとに画像を切り替える
                    const images = [
                        "funny_celebration_cat_1772186007455.png", // 1-10
                        "funny_dog_party_1772186227397.png",       // 11-20
                        "dancing_hamster_disco_1772186239197.png",  // 21-30
                        "cool_pigeon_vibe_check_pigeon_wearing_sunglasses_and_a_gold_chain_standing_on_a_skateboard_looking_very_proud_and_funny_urban_meme_style_1772186251852.png", // 31-40
                        "surprised_llama_hat_1772186267350.png",    // 41-50
                        "shiba_inu_winner_1772186281146.png",       // 51-60
                        "banana_duck_walk_1772186293461.png",       // 61-70
                        "buff_penguin_weights_1772186310745.png"      // 71-80 (以降ループ)
                    ];

                    const imgIdx = Math.min(Math.floor((adventureProgress - 1) / 10), images.length - 1);
                    document.getElementById('clearImage').src = images[imgIdx];

                    document.getElementById('stageClearOverlay').style.display = 'flex';
                    playSound(1000, 0.5, 'triangle');
                    playSound(1500, 0.3, 'sine');
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
    targetPattern = temp.map(c => ({ r: c[0], c: c[1], filled: false, collected: false }));
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
