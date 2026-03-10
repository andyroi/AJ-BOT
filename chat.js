const chatBox = document.getElementById('chat-box');
const inputBox = document.getElementById('input-box');
const sendBtn = document.getElementById('send-btn');
const typingIndicator = document.getElementById('typing');
const welcome = document.getElementById('welcome');
const conversationList = document.getElementById('conversation-list');
const newChatBtn = document.getElementById('new-chat-btn');
const sidebarToggle = document.getElementById('sidebar-toggle');
const sidebar = document.getElementById('sidebar');
const collapseBtn = document.getElementById('collapse-btn');

// ── Multi-conversation state ─────────────────────────────────
let currentConversationId = null;

// ── Detect "who/what is AJ Bot" type queries ─────────────────
function isAboutAJBotQuery(message) {
    const lower = message.toLowerCase().replace(/[?!.,]/g, '');
    const patterns = [
        /who\s+is\s+aj\s*bot/,
        /what\s+is\s+aj\s*bot/,
        /who\s+(made|created|built|developed)\s+aj\s*bot/,
        /tell\s+me\s+about\s+aj\s*bot/,
        /about\s+aj\s*bot/,
        /who\s+are\s+you.*aj/,
        /what\s+are\s+you.*aj/,
    ];
    return patterns.some(p => p.test(lower));
}

// ── Inject "learn more" link below the AI bubble ─────────────
function addAboutLink() {
    const card = document.createElement('div');
    card.className = 'about-link-card';
    card.innerHTML = `
        <span>Want to know who created AJ Bot?</span>
        <a href="about.html" class="about-link-btn" target="_blank" rel="noopener">
            Click here to find out
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <line x1="5" y1="12" x2="19" y2="12"></line>
                <polyline points="12 5 19 12 12 19"></polyline>
            </svg>
        </a>
    `;
    chatBox.appendChild(card);
    chatBox.scrollTop = chatBox.scrollHeight;
}

// ── Helper: create a chat bubble ─────────────────────────────
function addMessage(text, type) {
    const bubble = document.createElement('div');
    bubble.classList.add('message', type);

    if (type === 'ai') {
        bubble.innerHTML = marked.parse(text);
    } else {
        bubble.textContent = text;
    }

    chatBox.appendChild(bubble);
    chatBox.scrollTop = chatBox.scrollHeight;
}

// ── Render conversation list in sidebar ──────────────────────
function renderConversationList(conversations) {
    conversationList.innerHTML = '';
    conversations.forEach(conv => {
        const tab = document.createElement('button');
        tab.className = 'conversation-tab' + (conv.id === currentConversationId ? ' active' : '');
        tab.dataset.id = conv.id;

        const title = document.createElement('span');
        title.className = 'tab-title';
        title.textContent = conv.title || 'New Chat';
        tab.appendChild(title);

        // 3-dot kebab menu button
        const kebab = document.createElement('button');
        kebab.className = 'tab-kebab';
        kebab.title = 'Options';
        kebab.innerHTML = '<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><circle cx="12" cy="5" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="12" cy="19" r="1.5"/></svg>';
        kebab.addEventListener('click', (e) => {
            e.stopPropagation();
            showTabMenu(kebab, conv.id, conv.title || 'New Chat');
        });
        tab.appendChild(kebab);

        tab.addEventListener('click', () => switchConversation(conv.id));
        conversationList.appendChild(tab);
    });
}

// ── Context menu for conversation tabs ───────────────────────
let activeMenu = null;

function closeTabMenu() {
    if (activeMenu) {
        activeMenu.remove();
        activeMenu = null;
    }
}

function showTabMenu(anchor, convId, currentTitle) {
    closeTabMenu();

    const menu = document.createElement('div');
    menu.className = 'tab-context-menu';

    // Rename option
    const renameBtn = document.createElement('button');
    renameBtn.textContent = 'Rename';
    renameBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        closeTabMenu();
        startRename(convId, currentTitle);
    });
    menu.appendChild(renameBtn);

    // Delete option
    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'danger';
    deleteBtn.textContent = 'Delete';
    deleteBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        closeTabMenu();
        deleteConversation(convId);
    });
    menu.appendChild(deleteBtn);

    // Position below the kebab button
    const rect = anchor.getBoundingClientRect();
    const sidebarRect = sidebar.getBoundingClientRect();
    menu.style.top = (rect.bottom - sidebarRect.top + 4) + 'px';
    menu.style.left = (rect.left - sidebarRect.left - 60) + 'px';

    sidebar.appendChild(menu);
    activeMenu = menu;

    // Close on outside click
    setTimeout(() => {
        document.addEventListener('click', closeTabMenu, { once: true });
    }, 0);
}

// ── Rename a conversation ────────────────────────────────────
function startRename(convId, currentTitle) {
    const tab = conversationList.querySelector(`[data-id="${convId}"]`);
    if (!tab) return;

    const titleSpan = tab.querySelector('.tab-title');
    const originalText = titleSpan.textContent;

    // Replace title text with an input field
    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'tab-rename-input';
    input.value = currentTitle;
    input.maxLength = 60;

    titleSpan.textContent = '';
    titleSpan.appendChild(input);
    input.focus();
    input.select();

    async function commitRename() {
        const newTitle = input.value.trim();
        if (newTitle && newTitle !== originalText) {
            await renameConversation(convId, newTitle);
        } else {
            titleSpan.textContent = originalText;
        }
    }

    input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') { e.preventDefault(); input.blur(); }
        if (e.key === 'Escape') { titleSpan.textContent = originalText; }
    });
    input.addEventListener('blur', commitRename, { once: true });
    input.addEventListener('click', (e) => e.stopPropagation());
}

async function renameConversation(convId, newTitle) {
    const token = getAuthToken();
    if (!token) return;

    try {
        await fetch(`http://localhost:5000/conversations/${convId}`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ title: newTitle })
        });
        const conversations = await fetchConversationsList();
        renderConversationList(conversations);
    } catch (err) {
        console.warn('Could not rename conversation:', err);
    }
}

// ── Switch to a different conversation ───────────────────────
async function switchConversation(convId) {
    currentConversationId = convId;

    document.querySelectorAll('.conversation-tab').forEach(t => {
        t.classList.toggle('active', t.dataset.id === convId);
    });

    chatBox.innerHTML = '';
    sidebar.classList.remove('open');

    const token = getAuthToken();
    if (!token) return;

    try {
        const res = await fetch(`http://localhost:5000/conversations/${convId}/history`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();

        if (data.history && data.history.length > 0) {
            let lastUserText = '';
            data.history.forEach(msg => {
                const type = msg.role === 'user' ? 'user' : 'ai';
                addMessage(msg.text, type);
                if (type === 'user') {
                    lastUserText = msg.text;
                } else if (type === 'ai' && isAboutAJBotQuery(lastUserText)) {
                    addAboutLink();
                    lastUserText = '';
                }
            });
        } else {
            chatBox.innerHTML = `
                <div class="welcome" id="welcome">
                    <h2>Hello!</h2>
                    <p>Ask me about finance, gaming, anime, or life advice.</p>
                </div>`;
        }
    } catch (err) {
        console.warn('Could not load conversation history:', err);
    }
}

// ── Create a new chat ────────────────────────────────────────
async function createNewChat() {
    const token = getAuthToken();
    if (!token) return;

    try {
        const res = await fetch('http://localhost:5000/conversations', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            }
        });
        const data = await res.json();
        if (data.id) {
            currentConversationId = data.id;
            await loadConversations();
            await switchConversation(data.id);
        }
    } catch (err) {
        console.warn('Could not create new chat:', err);
    }
}

// ── Delete a conversation ────────────────────────────────────
async function deleteConversation(convId) {
    const token = getAuthToken();
    if (!token) return;

    try {
        await fetch(`http://localhost:5000/conversations/${convId}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });

        const conversations = await fetchConversationsList();
        renderConversationList(conversations);

        if (convId === currentConversationId) {
            if (conversations.length > 0) {
                await switchConversation(conversations[0].id);
            } else {
                currentConversationId = null;
                chatBox.innerHTML = `
                    <div class="welcome" id="welcome">
                        <h2>Hello!</h2>
                        <p>Start a new chat to begin.</p>
                    </div>`;
            }
        }
    } catch (err) {
        console.warn('Could not delete conversation:', err);
    }
}

// ── Fetch conversations list from API ────────────────────────
async function fetchConversationsList() {
    const token = getAuthToken();
    if (!token) return [];
    try {
        const res = await fetch('http://localhost:5000/conversations', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();
        return data.conversations || [];
    } catch (err) {
        console.warn('Could not fetch conversations:', err);
        return [];
    }
}

// ── Load conversations on login (called by auth.js) ──────────
async function loadConversations() {
    const conversations = await fetchConversationsList();
    renderConversationList(conversations);

    if (conversations.length > 0) {
        await switchConversation(conversations[0].id);
    } else {
        currentConversationId = null;
        chatBox.innerHTML = `
            <div class="welcome" id="welcome">
                <h2>Hello!</h2>
                <p>Start a new chat to begin.</p>
            </div>`;
    }
}

// ── Send a message ───────────────────────────────────────────
async function sendMessage() {
    const message = inputBox.value.trim();
    if (!message) return;

    const token = getAuthToken();
    if (!token) {
        addMessage('You must be logged in to chat.', 'error');
        return;
    }

    // Auto-create conversation if none active
    if (!currentConversationId) {
        try {
            const res = await fetch('http://localhost:5000/conversations', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                }
            });
            const data = await res.json();
            if (data.id) {
                currentConversationId = data.id;
            } else {
                addMessage('Could not create a new conversation.', 'error');
                return;
            }
        } catch (err) {
            addMessage('Could not reach the server.', 'error');
            return;
        }
    }

    const welcomeEl = document.getElementById('welcome');
    if (welcomeEl) welcomeEl.style.display = 'none';

    addMessage(message, 'user');
    inputBox.value = '';

    typingIndicator.classList.add('visible');
    chatBox.scrollTop = chatBox.scrollHeight;

    try {
        const response = await fetch('http://localhost:5000/chat', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ message, conversationId: currentConversationId })
        });

        const data = await response.json();
        typingIndicator.classList.remove('visible');

        if (data.error) {
            addMessage(data.error, 'error');
            return;
        }
        if (data.response) {
            addMessage(data.response, 'ai');
            // Inject "about" link if the user asked who/what AJ Bot is
            if (isAboutAJBotQuery(message)) {
                addAboutLink();
            }
        } else {
            addMessage('No response from server', 'error');
        }

        // If the backend returned an updated title, refresh sidebar
        if (data.title) {
            await loadConversations();
            document.querySelectorAll('.conversation-tab').forEach(t => {
                t.classList.toggle('active', t.dataset.id === currentConversationId);
            });
        }
    } catch (err) {
        typingIndicator.classList.remove('visible');
        addMessage('Could not reach the server. Is it running?', 'error');
    }
}

// ── Event listeners ──────────────────────────────────────────
sendBtn.addEventListener('click', sendMessage);
inputBox.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') sendMessage();
});

newChatBtn.addEventListener('click', createNewChat);

sidebarToggle.addEventListener('click', () => {
    sidebar.classList.toggle('open');
});

// ── Sidebar Collapse / Expand (desktop) ─────────────────
collapseBtn.addEventListener('click', () => {
    sidebar.classList.toggle('collapsed');
    const isCollapsed = sidebar.classList.contains('collapsed');
    collapseBtn.title = isCollapsed ? 'Expand sidebar' : 'Collapse sidebar';
});

