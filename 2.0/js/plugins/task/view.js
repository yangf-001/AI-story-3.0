View.register('task.main', function(worldId) {
    const plugin = PluginSystem.get('task');
    const tasks = plugin?.getTasks(worldId) || [];
    
    if (tasks.length === 0) {
        return `
            <div class="task-header">
                <button class="btn btn-secondary" onclick="ViewCallbacks.task.showAdd()">+ 添加任务</button>
            </div>
            <div class="empty">暂无任务</div>
        `;
    }
    
    const active = tasks.filter(t => t.status === 'active');
    const completed = tasks.filter(t => t.status === 'completed');
    
    let html = `
        <div class="task-header">
            <button class="btn btn-secondary" onclick="ViewCallbacks.task.showAdd()">+ 添加任务</button>
        </div>
    `;
    
    if (active.length) {
        html += '<div class="task-section"><h4>进行中</h4>';
        html += active.map(t => {
            const pct = Math.round((t.progress / t.maxProgress) * 100);
            return `
                <div class="task-card">
                    <div class="task-header-row">
                        <span class="task-title">${t.title}</span>
                        <span class="task-percent">${pct}%</span>
                    </div>
                    <div class="task-progress-bar">
                        <div class="task-progress-fill" style="width: ${pct}%"></div>
                    </div>
                    <div class="task-count">${t.progress}/${t.maxProgress}</div>
                </div>
            `;
        }).join('');
        html += '</div>';
    }
    
    if (completed.length) {
        html += '<div class="task-section"><h4>已完成</h4>';
        html += completed.map(t => `
            <div class="task-card completed">
                <span class="task-title">✅ ${t.title}</span>
            </div>
        `).join('');
        html += '</div>';
    }
    
    return html;
});

View.register('task.add', function() {
    return `
        <div class="form-group">
            <label>任务名称</label>
            <input type="text" id="taskTitle" placeholder="例如：找到神秘宝藏">
        </div>
        <div class="form-group">
            <label>任务描述</label>
            <textarea id="taskDesc" rows="2" placeholder="任务详情..."></textarea>
        </div>
        <div class="form-group">
            <label>目标进度</label>
            <input type="number" id="taskMax" value="1" min="1">
        </div>
        <button class="btn" onclick="ViewCallbacks.task.add()">添加</button>
    `;
});

ViewCallbacks.task = {
    showAdd() {
        document.getElementById('modalBody').innerHTML = View.render('task.add');
    },
    
    add() {
        const world = Data.getCurrentWorld();
        const title = document.getElementById('taskTitle').value;
        if (!title) return;
        
        const plugin = PluginSystem.get('task');
        plugin?.addTask(world.id, {
            title,
            description: document.getElementById('taskDesc').value,
            maxProgress: parseInt(document.getElementById('taskMax').value) || 1
        });
        
        showCharTasks();
    }
};

window.ViewCallbacks = window.ViewCallbacks || {};
Object.assign(window.ViewCallbacks, ViewCallbacks);
