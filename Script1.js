// 状態管理オブジェクト：アプリの現在地（編集状態、選択フォルダ、データ全体）を保持
const state = {
    isEditMode: false,
    currentEditingBtn: null,
    currentFolderId: localStorage.getItem('currentFolderId') || "",
    currentEditingFolderId: null,
    folders: JSON.parse(localStorage.getItem('folders')) || [],
    memos: JSON.parse(localStorage.getItem('memos')) || []
};

// 初期化：DOMの読み込み完了を待ってアプリを起動
document.addEventListener('DOMContentLoaded', () => {
    initApp();
});

// アプリのライフサイクル管理
function initApp() {
    renderFolders();    // フォルダタブの描画
    renderMemos();      // メモ要素の描画
    initResizeHandle(); // リサイズ機能の有効化
    setupEventListeners(); // ユーザー操作の紐付け
}

// ボタンやUIのクリックイベントを定義
function setupEventListeners() {
    // 編集モード切替や新規作成等の全体UI
    document.getElementById('edit-mode-btn').addEventListener('click', toggleEditMode);
    document.getElementById('open-create-modal-btn').addEventListener('click', openCreateModal);
    document.getElementById('open-folder-modal-btn').addEventListener('click', openFolderModal);
    document.getElementById('quick-settings-close-btn').addEventListener('click', closeQuickSettings);

    // モーダル（入力フォーム）関連
    document.getElementById('create-cancel-btn').addEventListener('click', closeCreateModal);
    document.getElementById('create-submit-btn').addEventListener('click', createNewMemo);

    // メモ編集・削除
    document.getElementById('edit-delete-btn').addEventListener('click', deleteSelected);
    document.getElementById('edit-cancel-btn').addEventListener('click', closeEditModal);
    document.getElementById('edit-save-btn').addEventListener('click', saveModal);

    // フォルダ操作
    document.getElementById('folder-cancel-btn').addEventListener('click', closeFolderModal);
    document.getElementById('folder-submit-btn').addEventListener('click', createNewFolder);
    document.getElementById('folder-edit-delete-btn').addEventListener('click', deleteFolder);
    document.getElementById('folder-edit-cancel-btn').addEventListener('click', closeFolderEditModal);
    document.getElementById('folder-edit-save-btn').addEventListener('click', saveFolderEdit);
}

// サイドバーのフォルダタブを再描画する処理
function renderFolders() {
    const tabsContainer = document.getElementById('folder-tabs');
    tabsContainer.innerHTML = '';

    if (state.folders.length === 0) {
        state.currentFolderId = "";
        localStorage.setItem('currentFolderId', "");
        return;
    }

    if (!state.currentFolderId || !state.folders.some(f => f.id === state.currentFolderId)) {
        state.currentFolderId = state.folders[0].id;
        localStorage.setItem('currentFolderId', state.currentFolderId);
    }

    state.folders.forEach(folder => {
        const tab = document.createElement('div');
        tab.className = `tab ${folder.color} ${folder.id === state.currentFolderId ? 'active' : ''}`;
        tab.innerText = folder.title || "無題";

        // タブ切替処理
        tab.addEventListener('click', () => {
            state.currentFolderId = folder.id;
            localStorage.setItem('currentFolderId', state.currentFolderId);
            renderFolders();
            renderMemos();
            closeQuickSettings();
        });

        // 編集モードでのダブルクリック：名前変更用モーダル表示
        tab.addEventListener('dblclick', (e) => {
            e.stopPropagation();
            if (state.isEditMode) {
                openFolderEditModal(folder.id);
            }
        });

        tabsContainer.appendChild(tab);
    });
}

// 選択中のフォルダに属するメモだけを描画する処理
function renderMemos() {
    const dashboard = document.getElementById('dashboard');
    // 古いメモを一度クリア
    dashboard.querySelectorAll('.memo-button').forEach(el => el.remove());

    if (!state.currentFolderId) {
        document.getElementById('resize-handle').style.display = 'none';
        return;
    }

    // 現在のフォルダのメモをフィルタリングして表示
    const currentMemos = state.memos.filter(m => m.folderId === state.currentFolderId);
    currentMemos.forEach(data => createMemoElement(data));

    document.getElementById('resize-handle').style.display = 'none';
}

// 編集モードON/OFF切り替えとUI制御
function toggleEditMode() {
    state.isEditMode = !state.isEditMode;
    const btn = document.getElementById('edit-mode-btn');
    btn.innerText = state.isEditMode ? "編集モード：ON" : "編集モード：OFF";
    btn.className = state.isEditMode ? "btn-edit active" : "btn-edit";

    const guideText = document.getElementById('edit-guide-text');
    if (guideText) {
        guideText.innerText = state.isEditMode ? "ダブルタップで編集" : "";
    }

    if (!state.isEditMode) {
        document.getElementById('resize-handle').style.display = 'none';
        closeQuickSettings();
        document.querySelectorAll('.memo-button').forEach(b => b.classList.remove('selected'));
    } else if (state.currentEditingBtn) {
        updateResizeHandlePosition(state.currentEditingBtn);
    }
}

// モーダル表示・非表示の簡易ラッパー関数群
function openCreateModal() { document.getElementById('create-modal').style.display = 'flex'; }
function closeCreateModal() { document.getElementById('create-modal').style.display = 'none'; }
function openEditModal() { document.getElementById('edit-modal').style.display = 'flex'; }
function closeEditModal() { document.getElementById('edit-modal').style.display = 'none'; }
function openFolderModal() { document.getElementById('folder-modal').style.display = 'flex'; }
function closeFolderModal() { document.getElementById('folder-modal').style.display = 'none'; }
function closeQuickSettings() { document.getElementById('quick-settings').style.display = 'none'; }

// フォルダ編集用モーダル：対象フォルダのデータをフォームにセット
function openFolderEditModal(id) {
    state.currentEditingFolderId = id;
    const folder = state.folders.find(f => f.id === id);
    if (!folder) return;

    document.getElementById('folder-edit-title').value = folder.title || "";
    document.getElementById('folder-edit-color').value = folder.color || "tab-purple";
    document.getElementById('folder-edit-modal').style.display = 'flex';
}

function closeFolderEditModal() {
    document.getElementById('folder-edit-modal').style.display = 'none';
}

// 【数学的判定】2つの矩形が重なっているかを判定（AABB衝突判定アルゴリズム）
function isOverlapping(rect1, rect2) {
    return (
        rect1.left < rect2.left + rect2.width &&
        rect1.left + rect1.width > rect2.left &&
        rect1.top < rect2.top + rect2.height &&
        rect1.top + rect1.height > rect2.top
    );
}

// メモが重ならない位置を自動検索する処理
function findEmptyPosition(width, height) {
    let left = 80;
    let top = 80;
    const currentMemos = state.memos.filter(m => m.folderId === state.currentFolderId);

    let foundCollision = true;
    while (foundCollision) {
        foundCollision = false;
        const newRect = { left: left, top: top, width: width, height: height };

        for (let memo of currentMemos) {
            const memoRect = {
                left: parseFloat(memo.left),
                top: parseFloat(memo.top),
                width: parseFloat(memo.width),
                height: parseFloat(memo.height)
            };

            // 衝突したら位置をずらして再試行
            if (isOverlapping(newRect, memoRect)) {
                left += 30;
                if (left > window.innerWidth - 250) {
                    left = 80;
                    top += 30;
                }
                foundCollision = true;
                break;
            }
        }
    }
    return { left: left + 'px', top: top + 'px' };
}

// 衝突判定：移動中のメモが他のメモと重なった場合の制御
function resolveCollisions(movedMemoId) {
    const currentMemos = state.memos.filter(m => m.folderId === state.currentFolderId);
    const movedMemo = currentMemos.find(m => m.id === movedMemoId);
    if (!movedMemo) return;

    const movedRect = {
        left: parseFloat(movedMemo.left),
        top: parseFloat(movedMemo.top),
        width: parseFloat(movedMemo.width),
        height: parseFloat(movedMemo.height)
    };

    for (let otherMemo of currentMemos) {
        if (otherMemo.id === movedMemoId) continue;

        const otherRect = {
            left: parseFloat(otherMemo.left),
            top: parseFloat(otherMemo.top),
            width: parseFloat(otherMemo.width),
            height: parseFloat(otherMemo.height)
        };

        if (isOverlapping(movedRect, otherRect)) {
            console.log("衝突検知：移動無効");
            return;
        }
    }
}

// 新規メモ作成：データを構築してstateにプッシュし、保存
function createNewMemo() {
    const title = document.getElementById('new-title').value;
    if (!title) { alert("タイトルを入力してください"); return; }

    const memoWidth = 140;
    const memoHeight = 140;
    const pos = findEmptyPosition(memoWidth, memoHeight);

    const memoData = {
        id: "memo-" + Date.now(),
        folderId: state.currentFolderId,
        title: title,
        content: "",
        color: document.getElementById('new-color').value,
        shape: document.getElementById('new-shape').value,
        isLocked: document.getElementById('new-lock').checked,
        left: pos.left, top: pos.top, width: memoWidth + 'px', height: memoHeight + 'px'
    };

    state.memos.push(memoData);
    saveData();
    renderMemos();

    // フォームのリセット処理
    document.getElementById('new-title').value = "";
    document.getElementById('new-color').value = "tab-purple";
    document.getElementById('new-shape').value = "shape-square";
    document.getElementById('new-lock').checked = false;

    closeCreateModal();
}

// 新規フォルダ作成
function createNewFolder() {
    const title = document.getElementById('folder-title').value;
    if (!title) { alert("フォルダ名を入力してください"); return; }

    const folderData = {
        id: "folder-" + Date.now(),
        title: title,
        color: document.getElementById('folder-color').value
    };

    state.folders.push(folderData);
    state.currentFolderId = folderData.id;
    localStorage.setItem('currentFolderId', state.currentFolderId);
    saveData();
    renderFolders();
    renderMemos();
    closeFolderModal();
}

// フォルダ編集の保存
function saveFolderEdit() {
    if (!state.currentEditingFolderId) return;
    const folder = state.folders.find(f => f.id === state.currentEditingFolderId);
    if (folder) {
        const newTitle = document.getElementById('folder-edit-title').value;
        if (!newTitle) { alert("フォルダ名を入力してください"); return; }
        folder.title = newTitle;
        folder.color = document.getElementById('folder-edit-color').value;
        saveData();
        renderFolders();
    }
    closeFolderEditModal();
}

// フォルダ削除：中のメモも連動してフィルタリング
function deleteFolder() {
    if (!state.currentEditingFolderId) return;
    if (confirm("このフォルダと、中に入っているメモをすべて削除してもよろしいですか？")) {
        state.memos = state.memos.filter(m => m.folderId !== state.currentEditingFolderId);
        state.folders = state.folders.filter(f => f.id !== state.currentEditingFolderId);

        if (state.currentFolderId === state.currentEditingFolderId) {
            state.currentFolderId = state.folders.length > 0 ? state.folders[0].id : "";
            localStorage.setItem('currentFolderId', state.currentFolderId);
        }

        saveData();
        renderFolders();
        renderMemos();
        closeFolderEditModal();
    }
}

// メモ要素をDOMとして生成し、ドラッグイベントをバインド
function createMemoElement(data) {
    const newBtn = document.createElement('div');
    newBtn.className = 'memo-button ' + data.shape;
    newBtn.innerText = data.title;
    newBtn.id = data.id;

    newBtn.style.backgroundColor = data.color;
    newBtn.style.width = data.width;
    newBtn.style.height = data.height;
    newBtn.style.left = data.left;
    newBtn.style.top = data.top;

    // クリック時に選択状態にする
    newBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        selectMemo(newBtn, data.id);
    });

    // ダブルクリック時に内容編集
    newBtn.addEventListener('dblclick', (e) => {
        e.stopPropagation();
        openModal(newBtn, data.id);
    });

    // ドラッグ＆ドロップのロジック
    newBtn.addEventListener('mousedown', (e) => {
        if (!state.isEditMode || data.isLocked || data.isLocked === "true") return;

        selectMemo(newBtn, data.id);
        const dashboard = document.getElementById('dashboard');
        let shiftX = e.clientX - newBtn.getBoundingClientRect().left;
        let shiftY = e.clientY - newBtn.getBoundingClientRect().top;

        function onMouseMove(e) {
            let left = e.clientX - dashboard.getBoundingClientRect().left - shiftX;
            let top = e.clientY - dashboard.getBoundingClientRect().top - shiftY;

            newBtn.style.left = left + 'px';
            newBtn.style.top = top + 'px';

            syncElementToData(newBtn);
            resolveCollisions(data.id); // 移動中の衝突チェック
            updateResizeHandlePosition(newBtn);

            // クイック設定パネルの位置追従
            const quickSettings = document.getElementById('quick-settings');
            if (quickSettings.style.display === 'block') {
                quickSettings.style.left = (newBtn.offsetLeft + newBtn.offsetWidth + 10) + 'px';
                quickSettings.style.top = newBtn.offsetTop + 'px';
            }
        }

        document.addEventListener('mousemove', onMouseMove);

        const GRID_SIZE = 20; // グリッド吸着サイズ
        const onMouseUp = () => {
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);

            // 位置をグリッドにスナップ（吸着）させる
            let left = parseFloat(newBtn.style.left);
            let top = parseFloat(newBtn.style.top);
            newBtn.style.left = (Math.round(left / GRID_SIZE) * GRID_SIZE) + 'px';
            newBtn.style.top = (Math.round(top / GRID_SIZE) * GRID_SIZE) + 'px';

            syncElementToData(newBtn);
            saveData();
        };
        document.addEventListener('mouseup', onMouseUp);
    });

    document.getElementById('dashboard').appendChild(newBtn);
    return newBtn;
}

// 選択状態の管理
function selectMemo(btn, id) {
    document.querySelectorAll('.memo-button').forEach(b => b.classList.remove('selected'));
    btn.classList.add('selected');
    state.currentEditingBtn = btn;

    if (state.isEditMode) {
        updateResizeHandlePosition(btn);
    } else {
        document.getElementById('resize-handle').style.display = 'none';
    }
    closeQuickSettings();
}

// メモ編集モーダル表示処理
function openModal(btn, id) {
    state.currentEditingBtn = btn;
    const memoData = state.memos.find(m => m.id === id);
    if (!memoData) return;

    if (state.isEditMode) {
        const quickSettings = document.getElementById('quick-settings');
        document.getElementById('quick-color').value = rgbToHex(btn.style.backgroundColor);
        document.getElementById('quick-lock').checked = (memoData.isLocked === true || memoData.isLocked === "true");

        quickSettings.style.left = (btn.offsetLeft + btn.offsetWidth + 10) + 'px';
        quickSettings.style.top = btn.offsetTop + 'px';
        quickSettings.style.display = 'block';

        // 簡易編集設定（クイック）
        document.getElementById('quick-color').oninput = (e) => {
            btn.style.backgroundColor = e.target.value;
            memoData.color = e.target.value;
            saveData();
        };
        document.getElementById('quick-lock').onchange = (e) => {
            memoData.isLocked = e.target.checked;
            saveData();
        };
    } else {
        // 通常編集（詳細モーダル）
        document.getElementById('edit-title').value = memoData.title;
        document.getElementById('edit-content').value = memoData.content || "";
        document.getElementById('edit-color').value = rgbToHex(btn.style.backgroundColor);
        openEditModal();
    }
}

// 編集内容の確定保存
function saveModal() {
    if (state.currentEditingBtn) {
        const memoData = state.memos.find(m => m.id === state.currentEditingBtn.id);
        if (memoData) {
            memoData.title = document.getElementById('edit-title').value;
            memoData.content = document.getElementById('edit-content').value;
            memoData.color = document.getElementById('edit-color').value;

            state.currentEditingBtn.innerText = memoData.title;
            state.currentEditingBtn.style.backgroundColor = memoData.color;
        }
    }
    saveData();
    closeEditModal();
    renderMemos();
}

// メモ削除処理
function deleteSelected() {
    if (state.currentEditingBtn) {
        state.memos = state.memos.filter(m => m.id !== state.currentEditingBtn.id);
        state.currentEditingBtn.remove();
        state.currentEditingBtn = null;
        document.getElementById('resize-handle').style.display = 'none';
        closeQuickSettings();
        saveData();
        closeEditModal();
    } else { alert("削除するメモを選択してください"); }
}

// DOMのスタイル変更をStateデータへ同期
function syncElementToData(btn) {
    const memoData = state.memos.find(m => m.id === btn.id);
    if (memoData) {
        memoData.left = btn.style.left;
        memoData.top = btn.style.top;
        memoData.width = btn.style.width;
        memoData.height = btn.style.height;
    }
}

// LocalStorageへのデータ永続化
function saveData() {
    localStorage.setItem('memos', JSON.stringify(state.memos));
    localStorage.setItem('folders', JSON.stringify(state.folders));
}

// リサイズ用ハンドルの位置調整
function updateResizeHandlePosition(btn) {
    const handle = document.getElementById('resize-handle');
    if (!handle) return;
    handle.style.left = (btn.offsetLeft + btn.offsetWidth - 6) + 'px';
    handle.style.top = (btn.offsetTop + btn.offsetHeight - 6) + 'px';
    handle.style.display = 'block';
}

// リサイズ用ドラッグ処理
function initResizeHandle() {
    const handle = document.getElementById('resize-handle');
    if (!handle) return;

    handle.addEventListener('mousedown', (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (!state.isEditMode || !state.currentEditingBtn) return;

        let startWidth = parseFloat(state.currentEditingBtn.style.width) || state.currentEditingBtn.offsetWidth;
        let startHeight = parseFloat(state.currentEditingBtn.style.height) || state.currentEditingBtn.offsetHeight;
        let startX = e.clientX;
        let startY = e.clientY;

        function onMouseMove(e) {
            let newWidth = startWidth + (e.clientX - startX);
            let newHeight = startHeight + (e.clientY - startY);

            // 最小サイズの制限
            if (newWidth < 50) newWidth = 50;
            if (newHeight < 50) newHeight = 50;

            state.currentEditingBtn.style.width = newWidth + 'px';
            state.currentEditingBtn.style.height = newHeight + 'px';

            syncElementToData(state.currentEditingBtn);
            resolveCollisions(state.currentEditingBtn.id);
            updateResizeHandlePosition(state.currentEditingBtn);

            const quickSettings = document.getElementById('quick-settings');
            if (quickSettings && quickSettings.style.display === 'block') {
                quickSettings.style.left = (state.currentEditingBtn.offsetLeft + state.currentEditingBtn.offsetWidth + 10) + 'px';
                quickSettings.style.top = state.currentEditingBtn.offsetTop + 'px';
            }
        }

        document.addEventListener('mousemove', onMouseMove);

        const onMouseUp = () => {
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);
            syncElementToData(state.currentEditingBtn);
            saveData();
        };
        document.addEventListener('mouseup', onMouseUp);
    });
}

// 色情報のRGBからHEXへの変換ユーティリティ
function rgbToHex(rgb) {
    if (!rgb) return "#ffffff";
    if (rgb.startsWith('#')) return rgb;
    const match = rgb.match(/^rgb\((\d+),\s*(\d+),\s*(\d+)\)$/);
    if (!match) return "#ffffff";
    return "#" + ("0" + parseInt(match[1], 10).toString(16)).slice(-2) +
        ("0" + parseInt(match[2], 10).toString(16)).slice(-2) +
        ("0" + parseInt(match[3], 10).toString(16)).slice(-2);
}

// --- 新規作成画面のカウント処理 ---
const newTitleInput = document.getElementById('new-title');
const charCountSpan = document.getElementById('char-count');

if (newTitleInput && charCountSpan) {
    newTitleInput.addEventListener('input', () => {
        const remaining = 100 - newTitleInput.value.length;
        charCountSpan.innerText = `残り ${remaining} 文字`;
        charCountSpan.style.color = remaining < 10 ? 'red' : '#666';
    });
}


function updateEditCount() {
    const editTitle = document.getElementById('edit-title');
    const editCount = document.getElementById('edit-char-count');
    const editContent = document.getElementById('edit-content');
    const contentCount = document.getElementById('content-char-count');

    // タイトルのカウント
    if (editTitle && editCount) {
        const remTitle = 100 - editTitle.value.length;
        editCount.innerText = `残り ${remTitle} 文字`;
        editCount.style.color = remTitle < 10 ? 'red' : '#666';
    }

    // 本文のカウント
    if (editContent && contentCount) {
        const remContent = 1000 - editContent.value.length;
        contentCount.innerText = `残り ${remContent} 文字`;
        contentCount.style.color = remContent < 50 ? 'red' : '#666';
    }
}

// イベントリスナーも追加
const editContentInput = document.getElementById('edit-content');
if (editContentInput) {
    editContentInput.addEventListener('input', updateEditCount);
}