View.register('inventory.main', function(worldId, characterId) {
    const plugin = PluginSystem.get('inventory');
    const items = plugin?.getItems(worldId, characterId) || [];
    const char = Data.getCharacter(worldId, characterId);
    
    return `
        <div class="inventory-header">
            <button class="btn btn-secondary" onclick="ViewCallbacks.inventory.showAdd('${characterId}')">+ 添加物品</button>
            <button class="btn btn-secondary" onclick="ViewCallbacks.inventory.showLibrary()">📚 物品库</button>
        </div>
        ${items.length === 0 ? '<div class="empty">暂无物品</div>' : items.map(item => `
            <div class="item-card">
                <span class="item-icon">${item.icon || '📦'}</span>
                <div class="item-info">
                    <div class="item-name">${item.name}</div>
                    <div class="item-desc">${item.description || item.type}</div>
                    ${item.effects ? `<div class="item-effects">${JSON.stringify(item.effects)}</div>` : ''}
                </div>
                <button class="btn btn-secondary btn-sm" onclick="ViewCallbacks.inventory.use('${worldId}', '${characterId}', '${item.id}')">使用</button>
            </div>
        `).join('')}
    `;
});

View.register('inventory.library', function() {
    const plugin = PluginSystem.get('inventory');
    const library = plugin?.getItemLibrary() || [];
    
    return `
        <div class="inventory-header">
            <button class="btn" onclick="ViewCallbacks.inventory.showAddToLibrary()">+ 添加物品</button>
            <button class="btn btn-secondary" onclick="ViewCallbacks.inventory.importFromPreset()">📥 从预设导入</button>
        </div>
        ${library.length === 0 ? '<div class="empty">物品库为空，请添加物品或从预设导入</div>' : library.map(item => `
            <div class="item-card">
                <span class="item-icon">${item.icon || '📦'}</span>
                <div class="item-info">
                    <div class="item-name">${item.name}</div>
                    <div class="item-desc">${item.description || item.type}</div>
                    ${item.effects ? `<div class="item-effects">${JSON.stringify(item.effects)}</div>` : ''}
                </div>
                <button class="btn btn-secondary btn-sm" onclick="ViewCallbacks.inventory.editLibraryItem('${item.id}')">编辑</button>
                <button class="btn btn-secondary btn-sm" onclick="ViewCallbacks.inventory.deleteLibraryItem('${item.id}')" style="color: var(--danger);">删除</button>
            </div>
        `).join('')}
    `;
});

View.register('inventory.add', function(characterId) {
    const plugin = PluginSystem.get('inventory');
    const library = plugin?.getItemLibrary() || [];
    
    return `
        <div class="form-group">
            <label>物品名称</label>
            <input type="text" id="itemName" placeholder="例如：魔法药水">
        </div>
        <div class="form-group">
            <label>物品类型</label>
            <select id="itemType">
                <option value="misc">杂物</option>
                <option value="food">食物</option>
                <option value="potion">药水</option>
                <option value="weapon">武器</option>
                <option value="tool">工具</option>
                <option value="adult">成人物品</option>
            </select>
        </div>
        <div class="form-group">
            <label>效果（JSON格式）</label>
            <input type="text" id="itemEffects" placeholder='{"health": 20, "energy": 10}'>
        </div>
        <button class="btn" onclick="ViewCallbacks.inventory.add('${characterId}')">添加</button>
    `;
});

View.register('inventory.addToLibrary', function() {
    return `
        <div class="form-group">
            <label>物品名称 *</label>
            <input type="text" id="libItemName" placeholder="例如：魔法药水">
        </div>
        <div class="form-group">
            <label>图标</label>
            <select id="libItemIcon">
                <option value="📦">📦 盒子</option>
                <option value="🧪">🧪 药水</option>
                <option value="🍎">🍎 食物</option>
                <option value="⚔️">⚔️ 武器</option>
                <option value="🔧">🔧 工具</option>
                <option value="💎">💎 宝石</option>
                <option value="📜">📜 卷轴</option>
                <option value="🔮">🔮 法器</option>
                <option value="🍷">🍷 饮料</option>
                <option value="💊">💊 药丸</option>
            </select>
        </div>
        <div class="form-group">
            <label>物品类型</label>
            <select id="libItemType">
                <option value="misc">杂物</option>
                <option value="food">食物</option>
                <option value="potion">药水</option>
                <option value="weapon">武器</option>
                <option value="tool">工具</option>
            </select>
        </div>
        <div class="form-group">
            <label>描述</label>
            <input type="text" id="libItemDesc" placeholder="物品描述">
        </div>
        <div class="form-group">
            <label>效果（JSON格式）</label>
            <input type="text" id="libItemEffects" placeholder='{"health": 20, "energy": 10}'>
        </div>
        <button class="btn" onclick="ViewCallbacks.inventory.addLibrary()">添加到物品库</button>
    `;
});

View.register('inventory.editLibrary', function(itemId) {
    const plugin = PluginSystem.get('inventory');
    const library = plugin?.getItemLibrary() || [];
    const item = library.find(i => i.id === itemId) || {};
    
    return `
        <div class="form-group">
            <label>物品名称 *</label>
            <input type="text" id="editLibItemName" value="${item.name || ''}">
        </div>
        <div class="form-group">
            <label>图标</label>
            <select id="editLibItemIcon">
                <option value="📦" ${item.icon === '📦' ? 'selected' : ''}>📦 盒子</option>
                <option value="🧪" ${item.icon === '🧪' ? 'selected' : ''}>🧪 药水</option>
                <option value="🍎" ${item.icon === '🍎' ? 'selected' : ''}>🍎 食物</option>
                <option value="⚔️" ${item.icon === '⚔️' ? 'selected' : ''}>⚔️ 武器</option>
                <option value="🔧" ${item.icon === '🔧' ? 'selected' : ''}>🔧 工具</option>
                <option value="💎" ${item.icon === '💎' ? 'selected' : ''}>💎 宝石</option>
                <option value="📜" ${item.icon === '📜' ? 'selected' : ''}>📜 卷轴</option>
                <option value="🔮" ${item.icon === '🔮' ? 'selected' : ''}>🔮 法器</option>
                <option value="🍷" ${item.icon === '🍷' ? 'selected' : ''}>🍷 饮料</option>
                <option value="💊" ${item.icon === '💊' ? 'selected' : ''}>💊 药丸</option>
            </select>
        </div>
        <div class="form-group">
            <label>物品类型</label>
            <select id="editLibItemType">
                <option value="misc" ${item.type === 'misc' ? 'selected' : ''}>杂物</option>
                <option value="food" ${item.type === 'food' ? 'selected' : ''}>食物</option>
                <option value="potion" ${item.type === 'potion' ? 'selected' : ''}>药水</option>
                <option value="weapon" ${item.type === 'weapon' ? 'selected' : ''}>武器</option>
                <option value="tool" ${item.type === 'tool' ? 'selected' : ''}>工具</option>
            </select>
        </div>
        <div class="form-group">
            <label>描述</label>
            <input type="text" id="editLibItemDesc" value="${item.description || ''}">
        </div>
        <div class="form-group">
            <label>效果（JSON格式）</label>
            <input type="text" id="editLibItemEffects" value='${JSON.stringify(item.effects || {})}'>
        </div>
        <button class="btn" onclick="ViewCallbacks.inventory.saveLibraryItem('${itemId}')">保存</button>
    `;
});

View.register('inventory.libraryPicker', function(characterId) {
    const plugin = PluginSystem.get('inventory');
    const library = plugin?.getItemLibrary() || [];
    
    if (library.length === 0) {
        return `<div class="empty">物品库为空，请在物品库中添加物品</div>`;
    }
    
    return `
        <div style="max-height: 400px; overflow-y: auto;">
            ${library.map(item => `
                <div class="item-card" style="cursor: pointer;" onclick="ViewCallbacks.inventory.addFromLibrary('${characterId}', '${item.id}')">
                    <span class="item-icon">${item.icon || '📦'}</span>
                    <div class="item-info">
                        <div class="item-name">${item.name}</div>
                        <div class="item-desc">${item.description || item.type}</div>
                        ${item.effects ? `<div class="item-effects" style="font-size: 0.7rem; color: var(--accent);">${JSON.stringify(item.effects)}</div>` : ''}
                    </div>
                    <span style="color: var(--accent);">+ 添加</span>
                </div>
            `).join('')}
        </div>
    `;
});

ViewCallbacks.inventory = {
    showAdd(characterId) {
        document.getElementById('modalBody').innerHTML = View.render('inventory.add', characterId);
    },
    
    add(characterId) {
        const world = Data.getCurrentWorld();
        const name = document.getElementById('itemName').value;
        if (!name) return;
        
        let effects = {};
        try {
            effects = JSON.parse(document.getElementById('itemEffects').value || '{}');
        } catch {}
        
        const plugin = PluginSystem.get('inventory');
        plugin?.addItem(world.id, characterId, {
            name,
            type: document.getElementById('itemType').value,
            effects
        });
        
        showCharInventory(characterId);
    },
    
    use(worldId, characterId, itemId) {
        const plugin = PluginSystem.get('inventory');
        const result = plugin?.useItem(worldId, characterId, itemId);
        if (result) {
            showCharInventory(characterId);
        }
    },
    
    showLibrary() {
        const html = View.render('inventory.library');
        document.getElementById('modalTitle').textContent = '物品库管理';
        document.getElementById('modalBody').innerHTML = html;
        document.getElementById('modal').classList.add('active');
    },
    
    showAddToLibrary() {
        document.getElementById('modalBody').innerHTML = View.render('inventory.addToLibrary');
    },
    
    addLibrary() {
        const name = document.getElementById('libItemName').value;
        if (!name) return;
        
        let effects = {};
        try {
            effects = JSON.parse(document.getElementById('libItemEffects').value || '{}');
        } catch {}
        
        const plugin = PluginSystem.get('inventory');
        plugin?.addToLibrary({
            name,
            type: document.getElementById('libItemType').value,
            description: document.getElementById('libItemDesc').value,
            effects,
            icon: document.getElementById('libItemIcon').value
        });
        
        this.showLibrary();
    },
    
    editLibraryItem(itemId) {
        document.getElementById('modalBody').innerHTML = View.render('inventory.editLibrary', itemId);
    },
    
    saveLibraryItem(itemId) {
        const name = document.getElementById('editLibItemName').value;
        if (!name) return;
        
        let effects = {};
        try {
            effects = JSON.parse(document.getElementById('editLibItemEffects').value || '{}');
        } catch {}
        
        const plugin = PluginSystem.get('inventory');
        plugin?.updateLibraryItem(itemId, {
            name,
            type: document.getElementById('editLibItemType').value,
            description: document.getElementById('editLibItemDesc').value,
            effects,
            icon: document.getElementById('editLibItemIcon').value
        });
        
        this.showLibrary();
    },
    
    deleteLibraryItem(itemId) {
        if (!confirm('确定删除该物品吗？')) return;
        
        const plugin = PluginSystem.get('inventory');
        plugin?.removeFromLibrary(itemId);
        
        this.showLibrary();
    },
    
    showLibraryPicker(characterId) {
        document.getElementById('modalTitle').textContent = '从物品库添加';
        document.getElementById('modalBody').innerHTML = View.render('inventory.libraryPicker', characterId);
        document.getElementById('modal').classList.add('active');
    },
    
    addFromLibrary(characterId, itemId) {
        const world = Data.getCurrentWorld();
        const plugin = PluginSystem.get('inventory');
        const library = plugin?.getItemLibrary() || [];
        const item = library.find(i => i.id === itemId);
        
        if (item) {
            plugin?.addItem(world.id, characterId, item);
            showCharInventory(characterId);
            document.getElementById('modal').classList.remove('active');
        }
    }
};

window.ViewCallbacks = window.ViewCallbacks || {};
Object.assign(window.ViewCallbacks, ViewCallbacks);
