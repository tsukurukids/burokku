// ========================================
// メイン処理・インタラクション
// ========================================

// DOM要素
let mainCanvas, ctx, pieceSelection;

/**
 * ドラッグ開始
 * @param {Event} e - イベントオブジェクト
 * @param {number} idx - ピースのインデックス
 */
function startDrag(e, idx) {
    if (isGameOver || !currentPieces[idx]) return;
    e.preventDefault();
    initAudio();
    playSound(440, 0.05, 'triangle');

    selectedPieceIndex = idx;
    const clX = e.clientX || e.touches[0].clientX;
    const clY = e.clientY || e.touches[0].clientY;
    const p = currentPieces[idx];
    isDragging = true;

    // フローティングキャンバスを作成
    const c = document.createElement('canvas');
    c.width = p.matrix[0].length * BLOCK_SIZE;
    c.height = p.matrix.length * BLOCK_SIZE;
    c.style.position = 'fixed';
    c.style.pointerEvents = 'none';
    c.style.zIndex = '1500';
    c.style.opacity = '0.9';

    const pctx = c.getContext('2d');
    p.matrix.forEach((row, y) => {
        row.forEach((v, x) => {
            if (v !== 0) drawBlock(pctx, x, y, p.color, BLOCK_SIZE);
        });
    });

    floatingPieceElement = c;
    document.body.appendChild(c);

    // カーソル位置からブロックの中心までのオフセットを計算
    dragStartOffset.x = c.width / 2;
    dragStartOffset.y = c.height / 2;

    drawSelection();
    document.addEventListener('mousemove', dragMove);
    document.addEventListener('mouseup', dragEnd);
    document.addEventListener('touchmove', dragMove, { passive: false });
    document.addEventListener('touchend', dragEnd);
}

/**
 * ドラッグ中
 * @param {Event} e - イベントオブジェクト
 */
function dragMove(e) {
    if (!isDragging) return;
    e.preventDefault();

    const clX = e.clientX || e.touches[0].clientX;
    const clY = e.clientY || e.touches[0].clientY;

    floatingPieceElement.style.left = `${clX - dragStartOffset.x}px`;
    floatingPieceElement.style.top = `${clY - dragStartOffset.y}px`;

    const rect = mainCanvas.getBoundingClientRect();
    ghostPosition.x = Math.floor((clX - rect.left) / BLOCK_SIZE);
    ghostPosition.y = Math.floor((clY - rect.top) / BLOCK_SIZE);

    if (clX < rect.left || clX > rect.right || clY < rect.top || clY > rect.bottom) {
        ghostPosition.x = -1;
        ghostPosition.y = -1;
    }

    drawMain();
}

/**
 * ドラッグ終了
 */
function dragEnd() {
    if (!isDragging) return;
    isDragging = false;
    floatingPieceElement.remove();

    document.removeEventListener('mousemove', dragMove);
    document.removeEventListener('mouseup', dragEnd);
    document.removeEventListener('touchmove', dragMove);
    document.removeEventListener('touchend', dragEnd);

    if (ghostPosition.x !== -1 && isValid(currentPieces[selectedPieceIndex].matrix, ghostPosition.x, ghostPosition.y)) {
        placePiece();
        playSound(880, 0.05, 'square');
    } else {
        playSound(110, 0.1, 'sawtooth');
    }

    if (currentPieces.every(p => p === null)) {
        currentPieces = [createPiece(), createPiece(), createPiece()];
        playSound(660, 0.1);
    }

    selectedPieceIndex = -1;
    ghostPosition = { x: -1, y: -1 };
    drawSelection();
    drawMain();
    checkGameOver();
}

/**
 * ゲームを開始
 * @param {string} mode - ゲームモード（'ADVENTURE' または 'SOLO'）
 */
function startGame(mode) {
    currentMode = mode;
    document.getElementById('homeScreen').style.display = 'none';
    document.getElementById('gameArea').style.display = 'flex';
    initAudio();
    initBGM();

    // DOM要素の取得
    mainCanvas = document.getElementById('mainCanvas');
    ctx = mainCanvas.getContext('2d');
    pieceSelection = document.getElementById('pieceSelection');

    const parentW = mainCanvas.clientWidth;
    BLOCK_SIZE = parentW / COLS;
    mainCanvas.width = parentW;
    mainCanvas.height = parentW;

    board = Array.from({ length: ROWS }, () => Array(COLS).fill(0));
    score = 0;
    currentCombo = 0;
    missCount = 0;
    isGameOver = false;
    adventureProgress = 0;

    document.getElementById('victoryOverlay').style.display = 'none';
    document.getElementById('gameOverOverlay').style.display = 'none';
    document.getElementById('settingsModal').style.display = 'none';

    if (mode === 'ADVENTURE') {
        // アドベンチャーモードのルール説明
        alert("【📍 アドベンチャーモードのルール】\n\n・画面にある「白い光る枠」がターゲットだよ！\n・ターゲットがある列（縦か横）を消すと、ターゲットも消えるよ。\n・ターゲットの上には自由にブロックを置けるから安心してね！\n・すべてのターゲットを消せばステージクリア！\n・全部で50ステージあるよ。がんばってね！ｗ");
        
        document.getElementById('gameModeTitle').textContent = "アドベンチャー";
        generateAdventureShape();
    } else {
        document.getElementById('gameModeTitle').textContent = "クラシック";
    }

    currentPieces = [createPiece(), createPiece(), createPiece()];
    drawSelection();
    update();
    taunt("START");
}

/**
 * ゲームループ
 */
function update() {
    if (!isGameOver) {
        // --- 💥 キラキラを動かす処理 ---
        particles.forEach((p, i) => {
            p.x += p.vx;
            p.y += p.vy;
            p.vy += 0.5; // 少しずつ下に落ちるようにするね（重力！）
            p.life -= 0.02; // だんだん消えていくよ
        });
        // 死んだキラキラ（消えたやつ）をお掃除するよ
        particles = particles.filter(p => p.life > 0);

        drawMain();
        updateUI();
        requestAnimationFrame(update);
    }
}

/**
 * 設定モーダルを開く
 */
function openSettingsModal() {
    document.getElementById('settingsModal').style.display = 'flex';
    playSound(500, 0.05, 'square');
}

/**
 * 設定モーダルを閉じる
 */
function closeSettingsModal() {
    document.getElementById('settingsModal').style.display = 'none';
}

/**
 * ホーム画面に戻る
 */
function goToHome() {
    location.reload();
}

/**
 * ゲームを再開
 */
function restartGame() {
    startGame(currentMode);
}

/**
 * ページ読み込み時の初期化
 */
window.onload = () => {
    document.getElementById('homeScreen').style.display = 'flex';
};

/**
 * ブロックの色テーマを変えるよ！
 * @param {string} themeName - テーマの名前（CLASSIC, NEON, PASTEL, CANDY）
 */
function changeTheme(themeName) {
    const oldColors = [...THEME.colors];
    THEME.colors = THEME_OPTIONS[themeName];
    
    // 💡 今ボードに乗っているブロックの色も、新しいテーマの色に塗りかえるよ！
    for (let y = 0; y < ROWS; y++) {
        for (let x = 0; x < COLS; x++) {
            const currentIdx = oldColors.indexOf(board[y][x]);
            if (currentIdx !== -1) {
                // 同じ順番の色（1番目の色は新しいテーマの1番目の色）に置き換えるね
                board[y][x] = THEME.colors[currentIdx % THEME.colors.length];
            }
        }
    }
    
    // 💡 次に置くブロック（ピース）の色も塗りかえるよ！
    currentPieces.forEach(p => {
        if (p) {
            const currentIdx = oldColors.indexOf(p.color);
            if (currentIdx !== -1) {
                p.color = THEME.colors[currentIdx % THEME.colors.length];
            }
        }
    });

    playSound(600, 0.05, 'sine');
    drawMain();
    drawSelection();
}

/**
 * 背景の色を変えるよ！
 * @param {string} color - 選んだ色のコード（#000000 など）
 */
function changeBgColor(color) {
    THEME.bg = color;
    playSound(400, 0.05, 'sine');
    drawMain();
}

/**
 * ブロックの見た目（スタイル）を変えるよ！
 * @param {string} styleName - 見た目の名前（DEFAULT, PUFFY, GEM, SIMPLE, NEON, LEGO, CHOCO, STAR）
 */
function changeStyle(styleName) {
    // 🎨 新しい見た目をセットするよ
    THEME.style = styleName;
    
    // ぴこん！と音を鳴らして、描きなおすよ
    playSound(700, 0.05, 'triangle');
    
    // 画面全体と、次に置くブロックをすぐに描きなおすね
    if (typeof drawMain === 'function') drawMain();
    if (typeof drawSelection === 'function') drawSelection();
}
