const App = {
    state: {
        books: [],
        currentView: 'dashboard',
        searchQuery: '',
        apiKey: localStorage.getItem('bookpath_apikey') || ''
    },

    init() {
        this.loadData();
        // Check for API key
        if (!this.state.apiKey) {
            setTimeout(() => {
                this.showToast('⚠️ 請先設定 Gemini API Key 才能使用 AI 功能');
            }, 1000);
        }
        // Initial route
        this.navigateTo('dashboard');
    },

    // --- Settings ---
    openSettingsModal() {
        const content = document.getElementById('book-detail-content');
        content.innerHTML = `
            <h2>設定</h2>
            <form onsubmit="App.saveSettings(event)">
                <div class="form-group">
                    <label>Gemini API Key</label>
                    <input type="password" name="apiKey" value="${this.state.apiKey}" placeholder="貼上您的 API Key" required>
                    <p style="font-size:0.8rem; color:#64748b; margin-top:0.5rem;">
                        您的 Key 只會儲存在此裝置上，不會上傳到伺服器。<br>
                        <a href="https://aistudio.google.com/app/apikey" target="_blank" style="color:#38bdf8;">👉 點此申請免費 Key</a>
                    </p>
                </div>
                <button type="submit" class="btn-primary">儲存設定</button>
            </form>
            <div style="margin-top: 2rem; border-top: 1px solid #334155; padding-top: 1rem;">
                <button onclick="App.exportBackup()" class="btn-secondary" style="width:100%; padding:1rem; margin-bottom:1rem; background:rgba(255,255,255,0.05); color:white; border:none; border-radius:12px;">
                    <i class="fa-solid fa-download"></i> 下載完整備份
                </button>
                <div style="text-align:center; font-size:0.8rem; color:#475569;">version 2.2</div>
            </div>
        `;
        this.openModal('viewBookModal');
    },

    saveSettings(event) {
        event.preventDefault();
        const form = event.target;
        const newKey = form.apiKey.value.trim();

        if (newKey) {
            this.state.apiKey = newKey;
            localStorage.setItem('bookpath_apikey', newKey);
            this.showToast('✅ 設定已儲存');
            this.closeModal('viewBookModal');
        }
    },

    loadData() {
        const storedBooks = localStorage.getItem('bookpath_books');
        if (storedBooks) {
            this.state.books = JSON.parse(storedBooks);
        } else {
            this.state.books = [];
        }
    },







    // --- Backup & Restore ---

    exportBackup() {
        const dataStr = JSON.stringify(this.state.books, null, 2);
        const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);

        const exportFileDefaultName = `bookpath_backup_${new Date().toISOString().split('T')[0]}.json`;

        const linkElement = document.createElement('a');
        linkElement.setAttribute('href', dataUri);
        linkElement.setAttribute('download', exportFileDefaultName);
        linkElement.click();
    },

    openImportModal() {
        const modalContent = document.getElementById('book-detail-content');
        if (!modalContent) return;

        modalContent.innerHTML = `
            <h2>匯入備份</h2>
            <div style="margin-top:1rem;">
                <p style="color:#cbd5e1; margin-bottom:1.5rem;">請選擇您的 .json 備份檔案 (將合併至現有資料)：</p>
                
                <div style="background:rgba(255,255,255,0.05); padding:2rem; border-radius:16px; text-align:center; border: 2px dashed rgba(255,255,255,0.1);">
                    <i class="fa-solid fa-cloud-arrow-up" style="font-size: 3rem; color: #38bdf8; margin-bottom: 1rem;"></i>
                    <button class="btn-primary" style="width:100%; padding: 1rem;" onclick="document.getElementById('import-file').click()">
                        選擇檔案匯入
                    </button>
                    <p style="font-size:0.8rem; color:#64748b; margin-top:1rem;">支援電腦與手機備份檔</p>
                </div>
            </div>
        `;
        this.openModal('viewBookModal');
    },

    handleFileImport(event) {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const importedBooks = JSON.parse(e.target.result);
                this.processImportData(importedBooks);
            } catch (err) {
                console.error(err);
                alert('無法讀取檔案，請確認是正確的 JSON 備份檔');
            }
        };
        reader.readAsText(file);
        event.target.value = ''; // Reset input
    },

    processImportData(importedBooks) {
        if (!Array.isArray(importedBooks)) {
            alert('匯入的資料格式錯誤 (必須是陣列)');
            return;
        }

        if (confirm(`準備匯入 ${importedBooks.length} 本書。\n目前有 ${this.state.books.length} 本書。\n\n點擊「確定」將合併這些書籍。`)) {
            // Merge and deduplicate by ID
            const existingIds = new Set(this.state.books.map(b => b.id));
            let addedCount = 0;

            importedBooks.forEach(b => {
                if (!existingIds.has(b.id)) {
                    this.state.books.push(b);
                    existingIds.add(b.id);
                    addedCount++;
                }
            });

            this.saveData();
            this.closeModal('viewBookModal');
            this.showToast(`✅ 匯入成功！新增了 ${addedCount} 本書`);

            // Refresh view
            if (this.state.currentView === 'library') this.renderLibrary(document.getElementById('view-container'));
            else this.navigateTo('library');
        }
    },

    saveData() {

        localStorage.setItem('bookpath_books', JSON.stringify(this.state.books));
    },

    navigateTo(viewId) {
        this.state.currentView = viewId;

        // 1. Update Navigation UI (Sidebar & Bottom Nav)
        document.querySelectorAll('.nav-links li').forEach(el => el.classList.remove('active'));
        const activeLink = document.querySelector(`.nav-links li[onclick="App.navigateTo('${viewId}')"]`);
        if (activeLink) activeLink.classList.add('active');

        document.querySelectorAll('.bottom-nav .nav-item').forEach(el => el.classList.remove('active'));
        const activeNav = document.querySelector(`.bottom-nav .nav-item[onclick="App.navigateTo('${viewId}')"]`);
        if (activeNav) activeNav.classList.add('active');

        // 2. Render Page Content
        const container = document.getElementById('view-container');
        const title = document.getElementById('page-title');

        // Force Clear Container
        container.innerHTML = '';
        container.style.opacity = '0';

        // Title Map
        const titles = {
            'dashboard': '儀表板',
            'library': '我的書庫',
            'topics': '主題彙整'
        };
        title.innerText = titles[viewId] || 'BookPath';

        // Render specific view
        setTimeout(() => {
            if (viewId === 'dashboard') this.renderDashboard(container);
            else if (viewId === 'library') this.renderLibrary(container);
            else if (viewId === 'topics') this.renderTopics(container);

            container.style.opacity = '1';
        }, 50);
    },

    refreshCurrentView() {
        // Just re-navigate to the current view to trigger full re-render
        this.navigateTo(this.state.currentView);
    },

    handleSearch(event) {
        const query = event.target.value;
        this.state.searchQuery = query;

        // If user types, we likely want to see the filtered list in library
        // If query is cleared, we stay in Library but show all
        if (this.state.currentView !== 'library') {
            this.navigateTo('library');
        } else {
            // Optimization: Just re-render library part without full navigate overhead
            const container = document.getElementById('view-container');
            if (container) this.renderLibrary(container);
        }
    },

    // --- Core Actions ---

    async handleAddBook(event) {
        event.preventDefault();
        const form = event.target;
        const title = form.title.value;
        const review = form.review.value;

        let btn = form.querySelector('button[type="submit"]');
        let originalBtnText = "";

        if (btn) {
            originalBtnText = btn.innerHTML;
            btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> AI 正在分析中...';
            btn.disabled = true;
        }

        let generatedTags = [];
        let summary = "";

        try {
            if (this.state.apiKey) {
                try {
                    // Collect existing tags from state
                    const existingTags = [...new Set(this.state.books.flatMap(b => b.tags))];

                    // Standard AI Call with existing tags context
                    const result = await this.callGemini(title, review, "gemini-2.5-flash", existingTags);
                    generatedTags = result.tags;
                    summary = result.summary;
                } catch (geminiError) {
                    console.error("Gemini Error:", geminiError);
                    if (geminiError.message.includes('403') || geminiError.message.includes('key')) {
                        if (confirm('API Key 可能已失效或未設定。是否現在去設定？')) {
                            this.openSettingsModal();
                            return; // Stop saving, let user fix key first
                        }
                    }
                    // Fallback: Proceed to save without AI
                    if (!confirm('AI 分析失敗，是否仍要儲存書籍 (將不包含標籤與摘要)？')) return;
                }
            } else {
                if (confirm("尚未設定 AI API Key。要去設定嗎？\n(取消將僅儲存文字，無 AI 分析)")) {
                    this.openSettingsModal();
                    return;
                }
            }

            const newBook = {
                id: Date.now(),
                title: title,
                // author removed
                tags: generatedTags.length > 0 ? generatedTags : ["未分類"],
                summary: summary,
                review: review,
                date: new Date().toISOString().split('T')[0]
            };

            // Add to state
            this.state.books.unshift(newBook);
            this.saveData();

            // UI Feedback
            this.closeModal('addBookModal');
            form.reset();
            this.showToast(`✨ 已儲存！標籤：${newBook.tags.join(', ')}`);

            // Critical: Force Navigation to Library
            setTimeout(() => {
                this.navigateTo('library');
            }, 100);

        } catch (error) {
            console.error("Critical Error:", error);
            this.showToast('❌ 儲存失敗：' + error.message);
        } finally {
            if (btn) {
                btn.innerHTML = originalBtnText;
                btn.disabled = false;
            }
        }
    },

    async callGemini(title, review, model = "gemini-2.0-flash", existingTags = []) {
        const CORE_TAGS = ["經濟", "社會", "思維", "趨勢", "歷史", "政治", "制度", "傳記", "商業", "管理", "談判", "心理", "財富", "哲學", "自我成長", "人類學", "教育", "思考", "投資", "職場", "科技"];

        // Combine core tags with user's specific tags, removing duplicates
        const allTags = [...new Set([...CORE_TAGS, ...existingTags])];
        const tagsString = allTags.join(', ');

        const prompt = `
            你是一個專業的書籍分類與摘要助手。請閱讀以下書籍心得，並回傳 JSON 格式的資料。
            
            書籍：${title}
            心得：${review}

            目前已有的標籤庫：[${tagsString}]
            
            需求：
            1. tags: 請給出 3-5 個最精準的分類標籤。
               - **優先策略**：請優先從上述「目前已有的標籤庫」中選擇適合的標籤。
               - **例外狀況**：只有當書籍內容非常獨特，現有標籤完全無法涵蓋時，才建立新的標籤。請保持標籤精簡（例如用「經濟」而不是「政治經濟學」）。
            2. summary: 請根據心得內容，總結出一句 "50 字以內"的「濃縮金句」或「核心觀點」。不要只是複製第一句話，要真的概括重點。不要說"這本書指出甚麼"這種廢話，直接說他的重點。
            
            請只回傳純 JSON 字串，不要有 markdown 符號，格式如下：
            {
                "tags": ["標籤1", "標籤2"],
                "summary": "這本書的核心觀點..."
            }
        `;


        // Use the detected model, ensure no 'models/' prefix duplication if passed
        const modelName = model.replace('models/', '');
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${this.state.apiKey}`;

        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }]
            })
        });

        if (!response.ok) {
            const errorBody = await response.text();
            throw new Error(`API Error: ${response.status} - ${errorBody}`);
        }

        const data = await response.json();
        // Check if candidates exists
        if (!data.candidates || data.candidates.length === 0) {
            throw new Error('No candidates returned from Gemini');
        }

        let text = data.candidates[0].content.parts[0].text;
        text = text.replace(/```json/g, '').replace(/```/g, '').trim();

        return JSON.parse(text);
    },

    deleteBook(id) {
        if (!confirm('確定要刪除這本書的紀錄嗎？此動作無法復原。')) return;

        // 1. Close Modal FIRST
        this.closeModal('viewBookModal');

        // 2. Update State
        // Ensure ID type safety (though it should be number)
        const targetId = Number(id);
        this.state.books = this.state.books.filter(b => b.id !== targetId);
        this.saveData();

        // 3. Show Feedback
        this.showToast('🗑️ 書籍已刪除');

        // 4. Force Re-render immediately
        // If we are in library, re-render it. If dashboard, re-render it.
        const container = document.getElementById('view-container');
        container.innerHTML = ''; // NUCLEAR CLEAR

        setTimeout(() => {
            if (this.state.currentView === 'library') {
                this.renderLibrary(container);
                container.style.opacity = '1'; // Ensure visible
            } else {
                this.refreshCurrentView();
            }
        }, 10);
    },

    // --- Renderers ---

    renderDashboard(container) {
        const totalBooks = this.state.books.length;
        const totalTags = new Set(this.state.books.flatMap(b => b.tags)).size;

        container.innerHTML = `
            <div class="dashboard-grid" style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 2rem;">
                <!-- Stat Card: Books -->
                <div class="stat-card glass-panel fade-in" style="padding: 1.2rem; border-radius: 16px; background: rgba(30, 41, 59, 0.6); display: flex; flex-direction: column; align-items: start;">
                    <div style="font-size: 0.9rem; color: #94a3b8; margin-bottom: 0.5rem;">書籍收藏</div>
                    <div style="font-size: 2.2rem; font-weight: 700; color: #38bdf8; line-height: 1;">${totalBooks}</div>
                </div>

                <!-- Stat Card: Topics -->
                <div class="stat-card glass-panel fade-in" style="padding: 1.2rem; border-radius: 16px; background: rgba(30, 41, 59, 0.6); display: flex; flex-direction: column; align-items: start;">
                    <div style="font-size: 0.9rem; color: #94a3b8; margin-bottom: 0.5rem;">主題領域</div>
                    <div style="font-size: 2.2rem; font-weight: 700; color: #818cf8; line-height: 1;">${totalTags}</div>
                </div>
            </div>

            <div class="dashboard-charts" style="display: grid; grid-template-columns: 1fr; gap: 1.5rem; margin-bottom: 2rem;">
                <div class="chart-container glass-panel" style="padding: 1.5rem; border-radius: 16px; height: 350px; position: relative; display: flex; flex-direction: column; align-items: center; justify-content: center;">
                    <h3 style="margin-bottom: 1rem; align-self: flex-start;">閱讀偏好</h3>
                    <div id="wordcloud-container" style="width: 100%; height: 100%; position: relative;">
                         <!-- Explicit width/height to solve 0 size issue -->
                         <canvas id="wordCloudCanvas" width="1000" height="500" style="width: 100%; height: 100%;"></canvas>
                    </div>
                </div>
            </div>

            <div class="section-header"><h2>最近新增</h2></div>
            <div class="book-grid">
                ${this.state.books.slice(0, 3).map(book => this.createBookCard(book)).join('')}
            </div>
        `;

        // Wait to ensure DOM is painted
        setTimeout(() => {
            this.renderTagsChart();
        }, 500);
    },

    renderTagsChart() {
        const canvas = document.getElementById('wordCloudCanvas');
        if (!canvas) return;

        // Calculate Tag Stats
        const tagCounts = {};
        this.state.books.forEach(b => {
            // Handle potential missing tags
            (b.tags || []).forEach(t => {
                if (t) tagCounts[t] = (tagCounts[t] || 0) + 1;
            });
        });

        // Convert to list with Balanced Sizes
        const list = Object.entries(tagCounts).map(([tag, count]) => {
            // Formula for size: Base 24px + 12px per occurrence
            return [tag, 24 + (count * 12)];
        });

        // Fallback for empty list
        if (list.length === 0) return;

        WordCloud(canvas, {
            list: list,
            gridSize: 15, // Medium density spacing
            weightFactor: 1,
            fontFamily: "'Outfit', 'Noto Sans TC', 'Microsoft JhengHei', sans-serif",
            fontWeight: '600', // Bold for modern look
            color: () => {
                // Mature, Muted, Sophisticated Palette
                const colors = [
                    '#94a3b8', // Slate (Neutral)
                    '#60a5fa', // Blue (Calm)
                    '#818cf8', // Indigo (Deep)
                    '#c084fc', // Purple (Mystery)
                    '#2dd4bf', // Teal (Fresh)
                    '#fbbf24', // Amber (Warmth)
                    '#f87171'  // Red (Focus) - muted
                ];
                return colors[Math.floor(Math.random() * colors.length)];
            },
            backgroundColor: 'transparent', // Clean glass look
            rotateRatio: 0,
            shrinkToFit: true,
            drawOutOfBound: false,
            minSize: 16
        });
    },

    renderLibrary(container) {
        let books = this.state.books;

        // Sort logic
        if (this.state.sort === 'oldest') {
            books = [...books].sort((a, b) => a.id - b.id);
        } else {
            // Default newest
            books = [...books].sort((a, b) => b.id - a.id);
        }

        if (this.state.searchQuery) {
            const q = this.state.searchQuery.toLowerCase();
            books = books.filter(b =>
                b.title.toLowerCase().includes(q) ||
                b.tags.some(t => t.toLowerCase().includes(q))
            );
        }

        const headerHtml = `
            <div class="library-header fade-in" style="display: flex; flex-direction: column; gap: 1rem; margin-bottom: 1.5rem;">
                <h2 style="margin: 0;">所有書籍 (${books.length})</h2>
                <div class="library-actions" style="display: flex; gap: 0.5rem; width: 100%;">
                    <button class="btn-secondary" onclick="App.exportBackup()" title="匯出備份" style="flex: 1; padding: 0.8rem; background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.2); color: white; border-radius: 12px; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 0.5rem;">
                        <i class="fa-solid fa-download"></i> 匯出
                    </button>
                    <button class="btn-secondary" onclick="App.openImportModal()" title="匯入備份" style="flex: 1; padding: 0.8rem; background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.2); color: white; border-radius: 12px; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 0.5rem;">
                        <i class="fa-solid fa-upload"></i> 匯入
                    </button>
                </div>
            </div>
        `;

        if (books.length === 0) {
            container.innerHTML = headerHtml + '<div style="text-align:center; color:#64748b; margin-top:3rem;">沒有找到書籍</div>';
            return;
        }

        container.innerHTML = headerHtml + `
            <div class="book-grid">
                ${books.map(book => this.createBookCard(book)).join('')}
            </div>
        `;
    },

    renderTopics(container) {
        // ... (Topic rendering logic remains same if not touched, but need to respect ReplacmentContent boundaries) ...
        const tagMap = {};
        this.state.books.forEach(book => {
            book.tags.forEach(tag => {
                if (!tagMap[tag]) tagMap[tag] = [];
                tagMap[tag].push(book);
            });
        });

        const sortedTags = Object.keys(tagMap).sort((a, b) => tagMap[b].length - tagMap[a].length);

        container.innerHTML = sortedTags.map(tag => `
            <div class="topic-card">
                <div class="topic-header">
                    <div class="topic-icon"><i class="fa-solid fa-tag"></i></div>
                    <h3>${tag} (${tagMap[tag].length})</h3>
                </div>
                ${tagMap[tag].map(b => `<div style="padding:0.5rem 0; border-bottom:1px solid #ffffff10;">${b.title}</div>`).join('')}
            </div>
        `).join('');
    },

    createBookCard(book) {
        return `
            <div class="book-card" onclick="App.viewBook(${book.id})">
                <div class="book-title">${book.title}</div>
                <div class="book-tags">
                    ${book.tags.map(tag => `<span class="tag">#${tag}</span>`).join('')}
                </div>
                <!-- Line clamp removed for full text display -->
                <p style="font-size: 0.9rem; color: #cbd5e1; margin-top: 1rem; line-height: 1.6;">
                    ${book.summary}
                </p>
            </div>
        `;
    },

    // --- Detail Modal ---

    viewBook(id) {
        const book = this.state.books.find(b => b.id === id);
        if (!book) return;

        const content = document.getElementById('book-detail-content');
        content.innerHTML = `
            <h2>${book.title}</h2>
            
            <div class="review-content" style="background:#ffffff05; padding:1.5rem; border-radius:12px; margin-bottom:1.5rem; line-height:1.6; margin-top: 1.5rem;">
                ${book.review}
            </div>

            <div style="display: flex; gap: 0.5rem; margin-bottom: 2rem;">
                ${book.tags.map(tag => `<span class="tag">#${tag}</span>`).join('')}
            </div>

            <div style="display:flex; gap:1rem;">
                 <button onclick="App.deleteBook(${book.id})" style="flex:1; padding:1rem; background:#ef444420; color:#ef4444; border:1px solid #ef4444; border-radius:12px; cursor:pointer;">刪除</button>
                 <button onclick="App.enableEditMode(${book.id})" style="flex:1; padding:1rem; background:#38bdf820; color:#38bdf8; border:1px solid #38bdf8; border-radius:12px; cursor:pointer;">編輯</button>
            </div>
        `;
        this.openModal('viewBookModal');
    },

    enableEditMode(id) {
        const book = this.state.books.find(b => b.id === id);
        if (!book) return;

        const content = document.getElementById('book-detail-content');
        content.innerHTML = `
            <h2>編輯模式</h2>
            <form onsubmit="App.handleEditSubmit(event, ${id})">
                <div class="form-group">
                    <label>書名</label>
                    <input type="text" name="title" value="${book.title}" required>
                </div>
                <div class="form-group">
                    <label>心得</label>
                    <textarea name="review" rows="10" required>${book.review}</textarea>
                </div>
                <button type="submit" class="btn-primary">儲存變更</button>
            </form>
        `;
    },

    handleEditSubmit(event, id) {
        event.preventDefault();
        const book = this.state.books.find(b => b.id === id);
        if (!book) return;

        const form = event.target;
        book.title = form.title.value;
        book.review = form.review.value;

        // Note: We don't re-run AI on edit to avoid overwriting paid/correct tags
        // But we could add a button "Re-analyze" later if needed

        this.saveData();
        this.closeModal('viewBookModal');
        this.showToast('✏️ 修改成功');

        // Return to library view
        this.navigateTo('library');
    },

    // --- Helpers ---

    openModal(id) { document.getElementById(id).classList.add('show'); },
    closeModal(id) { document.getElementById(id).classList.remove('show'); },

    showToast(msg) {
        const t = document.createElement('div');
        t.className = 'toast show';
        t.innerText = msg;
        document.body.appendChild(t);
        setTimeout(() => t.remove(), 3000);
    },
};

document.addEventListener('DOMContentLoaded', () => App.init());
