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
let particles = []; // 💥 飛びちるキラキラを保存するリスト

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

        if (tot === 1) taunt("LINES_1");
        else if (tot === 2) taunt("LINES_2");
        else if (tot >= 3) taunt("LINES_MULTI");

        if (currentCombo >= 15) taunt("COMBO_GOD");
        else if (currentCombo >= 10) taunt("COMBO_HIGH");
        else if (currentCombo >= 5) taunt("COMBO_MID");
        else if (currentCombo >= 3) taunt("COMBO_START");

        // アドベンチャーモードの処理（白いブロックが消えたかどうか）
        if (currentMode === 'ADVENTURE') {
            let anyNew = false;
            targetPattern.forEach(t => {
                // まだ消えていなくて、その行か列が消えるなら「消えた」ことにするよ
                if (!t.collected && (cr.includes(t.r) || cc.includes(t.c))) {
                    t.collected = true;
                    anyNew = true;
                }
            });

            if (anyNew) taunt("ADVENTURE_COLLECT", 1000);

            // すべての白いブロックが消えたら、次のステージへ！
            if (targetPattern.every(t => t.collected)) {
                adventureProgress++;

                // 🎆 進めば進むほど、どんどん盛大にお祝いするよ！
                const overlay = document.getElementById('stageClearOverlay');
                const content = overlay.querySelector('.stage-clear-content');

                // ステージ数に合わせて、星の数を増やすよ（1ステージ1個）
                const stars = "🌟".repeat(Math.min(adventureProgress, 20)); // 最大20個まで
                const fire = "🔥".repeat(Math.floor(adventureProgress / 5)); // 5ステージごとに炎も出るよｗ

                content.innerHTML = `
                    <div class="star-burst" style="font-size: ${2.5 + adventureProgress * 0.1}rem;">${stars}</div>
                    <h1 style="color:#ffffff; font-size: 2.5rem; text-shadow: 4px 4px 0 #ffaa00;">STAGE ${adventureProgress} CLEAR!</h1>
                    <p style="color:#ffffff; font-size: 1.5rem; font-weight: bold;">おめでとう！すごすぎる！ｗ</p>
                    <div class="star-burst" style="font-size: ${2.5 + adventureProgress * 0.1}rem;">${stars}${fire}</div>
                `;

                overlay.style.display = 'flex';
                playSound(880 + adventureProgress * 10, 0.1, 'sawtooth'); // ステージが進むと音も高くなるよ！

                // だんだんお祝いの時間もちょっとだけ長くするね
                setTimeout(() => {
                    overlay.style.display = 'none';

                    if (adventureProgress >= ADVENTURE_GOAL) {
                        isGameOver = true;
                        document.getElementById('victoryOverlay').style.display = 'flex';
                    } else {
                        // 次のステージのために白いブロックを新しく置くよ
                        generateAdventureShape();
                        updateUI();
                    }
                }, 1500 + Math.min(adventureProgress * 50, 2000));
            }
        } else {
            // 普通のモード（クラシック）のとき
            if (board.flat().every(cell => cell === 0)) {
                taunt("ALL_CLEAR", 3000);
            }
        }

        // 行と列をクリア
        cr.forEach(y => {
            for (let x = 0; x < COLS; x++) {
                if (board[y][x] !== 0) {
                    spawnParticles(x, y, board[y][x]); // 消える瞬間にキラキラを出すよ！
                    board[y][x] = 0;
                }
            }
        });
        cc.forEach(x => {
            for (let y = 0; y < ROWS; y++) {
                if (board[y][x] !== 0) {
                    spawnParticles(x, y, board[y][x]); // 消える瞬間にキラキラを出すよ！
                    board[y][x] = 0;
                }
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

        // 🏆 モードに合わせて、結果のメッセージを日本語で作るよ
        let resultText = "";
        if (currentMode === 'ADVENTURE') {
            resultText = `あつめたステージ数: ${adventureProgress}<br>点数: ${score}`;
        } else {
            resultText = `点数: ${score}`;
        }

        const scoreDiv = document.getElementById('finalScoreText');
        scoreDiv.innerHTML = resultText;

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
        document.getElementById('modeInfoDisplay').textContent = `あつめた形: ${adventureProgress} / ${ADVENTURE_GOAL}`;
    } else {
        // 💡 コンボの表示を空（から）にするね！
        document.getElementById('modeInfoDisplay').innerHTML = '';
    }
}

/**
 * アドベンチャーモードの「集めるターゲット（白いブロック）」を
 * 毎回バラバラな場所に新しく作るよ！
 */
function generateAdventureShape() {
    // ステージが変わるときは、一度盤面をきれいにするね
    if (typeof board !== 'undefined' && board.length > 0) {
        board = Array.from({ length: ROWS }, () => Array(COLS).fill(0));
    }

    // 白いブロックを置く場所を適当に決めるよ（5個から12個くらい）
    const count = 5 + Math.floor(Math.random() * 8);
    const points = [];
    const used = new Set();

    while (points.length < count) {
        const r = Math.floor(Math.random() * ROWS);
        const c = Math.floor(Math.random() * COLS);
        const key = `${r}-${c}`;
        if (!used.has(key)) {
            used.add(key);
            points.push({ r, c, collected: false });
        }
    }

    // ターゲットのリストを更新するよ
    targetPattern = points;
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

/**
 * 消えたブロックの場所にキラキラ（エフェクト）を作るよ！
 * @param {number} x - ブロックのX座標
 * @param {number} y - ブロックのY座標
 * @param {string} color - ブロックの色
 */
function spawnParticles(x, y, color) {
    const px = (x + 0.5) * BLOCK_SIZE;
    const py = (y + 0.5) * BLOCK_SIZE;

    // 1つのブロックから何個の破片（はへん）を飛ばすか決めるね（10個くらい！）
    for (let i = 0; i < 10; i++) {
        particles.push({
            x: px,
            y: py,
            vx: (Math.random() - 0.5) * 15, // 飛び散る速さ
            vy: (Math.random() - 0.5) * 15,
            life: 1.0, // 生きている時間
            color: color,
            size: Math.random() * 6 + 3 // 大きさ
        });
    }
}
