const NavSystem = {
    generateNav(activePage, showBackButton = false, backUrl = '../../../index.html?page=plugins') {
        return `
            <div class="sidebar">
                <h1>✨ AI故事</h1>
                <nav>
                    ${showBackButton ? `<button class="nav-btn" onclick="window.location.href='${backUrl}'">⬅️ 返回</button>` : ''}
                    <button class="nav-btn ${activePage === 'home' ? 'active' : ''}" onclick="window.location.href='../../../index.html'">🏠 首页</button>
                    <button class="nav-btn ${activePage === 'worlds' ? 'active' : ''}" onclick="window.location.href='../../../index.html?page=worlds'">🌍 世界</button>
                    <button class="nav-btn ${activePage === 'characters' ? 'active' : ''}" onclick="window.location.href='../../../index.html?page=characters'">👤 角色</button>
                    <button class="nav-btn ${activePage === 'character-editor' ? 'active' : ''}" onclick="window.location.href='../character-editor/index.html'">🧩 角色插件</button>
                    <button class="nav-btn ${activePage === 'story' ? 'active' : ''}" onclick="window.location.href='../../../index.html?page=story'">📖 故事</button>
                    <button class="nav-btn ${activePage === 'settings' ? 'active' : ''}" onclick="window.location.href='../../../index.html?page=settings'">⚙️ 设置</button>
                    <button class="nav-btn ${activePage === 'plugins' ? 'active' : ''}" onclick="window.location.href='../../../index.html?page=plugins'">🔌 插件</button>
                </nav>
            </div>
        `;
    },
    
    navigate(page) {
        window.location.href = `../../../index.html?page=${page}`;
    }
};
