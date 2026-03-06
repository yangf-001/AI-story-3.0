PluginSystem.register('task', {
    description: '任务系统',
    features: ['任务管理', '任务进度', '任务追踪'],
    
    init() {
        console.log('Task plugin loaded');
    },
    
    addTask(worldId, data) {
        const key = `tasks_${worldId}`;
        let tasks = JSON.parse(localStorage.getItem(key) || '[]');
        
        const task = {
            id: 'task_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
            title: data.title,
            description: data.description || '',
            progress: 0,
            maxProgress: data.maxProgress || 1,
            status: 'active',
            created: new Date().toISOString()
        };
        
        tasks.push(task);
        localStorage.setItem(key, JSON.stringify(tasks));
        
        return task;
    },
    
    getTasks(worldId) {
        const key = `tasks_${worldId}`;
        return JSON.parse(localStorage.getItem(key) || '[]');
    },
    
    updateTaskProgress(worldId, taskId, progress) {
        const key = `tasks_${worldId}`;
        let tasks = JSON.parse(localStorage.getItem(key) || '[]');
        
        const task = tasks.find(t => t.id === taskId);
        if (task) {
            task.progress = Math.min(task.maxProgress, progress);
            if (task.progress >= task.maxProgress) {
                task.status = 'completed';
            }
            localStorage.setItem(key, JSON.stringify(tasks));
        }
    },
    
    completeTask(worldId, taskId) {
        this.updateTaskProgress(worldId, taskId, Infinity);
    },
    
    deleteTask(worldId, taskId) {
        const key = `tasks_${worldId}`;
        let tasks = JSON.parse(localStorage.getItem(key) || '[]');
        tasks = tasks.filter(t => t.id !== taskId);
        localStorage.setItem(key, JSON.stringify(tasks));
    }
});
