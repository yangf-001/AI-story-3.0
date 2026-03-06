const HentaiIntegration = {
    initialized: false,
    pendingAutoTrigger: null,
    
    async init() {
        console.log('🎭 Hentai System Integration Starting...');
        
        if (typeof HentaiUserContent !== 'undefined') {
            await HentaiUserContent.init();
        }
        
        await HentaiPluginHub.init();
        
        HentaiPluginHub.onAutoTriggerConfirm = this.handleAutoTriggerConfirm.bind(this);
        HentaiPluginHub.onRuleTriggerConfirm = this.handleRuleTriggerConfirm.bind(this);
        
        this.initialized = true;
        console.log('🎭 Hentai System Ready!');
        
        return this;
    },
    
    async handleAutoTriggerConfirm(result) {
        return new Promise((resolve) => {
            this.pendingAutoTrigger = result;
            
            const prompt = HentaiPluginHub.buildPrompt(result.scene, result.context);
            
            const modal = document.getElementById('modal');
            const modalTitle = document.getElementById('modalTitle');
            const modalBody = document.getElementById('modalBody');
            
            if (modal && modalTitle && modalBody) {
                modalTitle.textContent = '💕 亲密互动提示';
                modalBody.innerHTML = `
                    <div style="margin-bottom: 16px;">
                        <div style="font-size: 0.85rem; color: var(--text-dim);">触发类型</div>
                        <div style="color: var(--accent);">${result.type}</div>
                    </div>
                    <div style="margin-bottom: 16px;">
                        <div style="font-size: 0.85rem; color: var(--text-dim);">场景元素</div>
                        <pre style="background: var(--border); padding: 12px; border-radius: 8px; font-size: 0.85rem; max-height: 150px; overflow-y: auto;">${JSON.stringify(result.scene, null, 2)}</pre>
                    </div>
                    <div style="margin-bottom: 16px;">
                        <div style="font-size: 0.85rem; color: var(--text-dim);">生成提示</div>
                        <div style="background: linear-gradient(135deg, #fff0f5, #ffe4e9); padding: 12px; border-radius: 8px; border-left: 3px solid var(--accent);">
                            ${prompt}
                        </div>
                    </div>
                    <div style="display: flex; gap: 8px;">
                        <button class="btn" onclick="HentaiIntegration.confirmAutoTrigger(true)" style="flex: 1; background: linear-gradient(135deg, #ff69b4, #ff1493);">💕 进行互动</button>
                        <button class="btn btn-secondary" onclick="HentaiIntegration.confirmAutoTrigger(false)" style="flex: 1;">暂时不要</button>
                    </div>
                `;
                modal.classList.add('active');
                
                this._autoTriggerResolve = resolve;
            } else {
                resolve(true);
            }
        });
    },
    
    confirmAutoTrigger(confirmed) {
        const modal = document.getElementById('modal');
        if (modal) {
            modal.classList.remove('active');
        }
        
        if (this._autoTriggerResolve) {
            this._autoTriggerResolve(confirmed);
            this._autoTriggerResolve = null;
        }
        
        this.pendingAutoTrigger = null;
    },
    
    async handleRuleTriggerConfirm(result) {
        return new Promise((resolve) => {
            this.pendingAutoTrigger = result;
            
            const prompt = HentaiPluginHub.buildPrompt(result.scene, result.context);
            const ruleNames = result.matchedRules.map(r => r.name).join('、');
            
            const modal = document.getElementById('modal');
            const modalTitle = document.getElementById('modalTitle');
            const modalBody = document.getElementById('modalBody');
            
            if (modal && modalTitle && modalBody) {
                modalTitle.textContent = '📋 规则触发：' + ruleNames;
                modalBody.innerHTML = `
                    <div style="margin-bottom: 16px;">
                        <div style="font-size: 0.85rem; color: var(--text-dim);">匹配规则</div>
                        <div style="color: var(--accent);">${ruleNames}</div>
                    </div>
                    <div style="margin-bottom: 16px;">
                        <div style="font-size: 0.85rem; color: var(--text-dim);">场景元素</div>
                        <pre style="background: var(--border); padding: 12px; border-radius: 8px; font-size: 0.85rem; max-height: 150px; overflow-y: auto;">${JSON.stringify(result.scene, null, 2)}</pre>
                    </div>
                    <div style="margin-bottom: 16px;">
                        <div style="font-size: 0.85rem; color: var(--text-dim);">生成提示</div>
                        <div style="background: linear-gradient(135deg, #fff0f5, #ffe4e9); padding: 12px; border-radius: 8px; border-left: 3px solid var(--accent);">
                            ${prompt}
                        </div>
                    </div>
                    <div style="display: flex; gap: 8px;">
                        <button class="btn" onclick="HentaiIntegration.confirmRuleTrigger(true)" style="flex: 1; background: linear-gradient(135deg, #ff69b4, #ff1493);">💕 进行互动</button>
                        <button class="btn btn-secondary" onclick="HentaiIntegration.confirmRuleTrigger(false)" style="flex: 1;">暂时不要</button>
                    </div>
                `;
                modal.classList.add('active');
                
                this._ruleTriggerResolve = resolve;
            } else {
                resolve(true);
            }
        });
    },
    
    confirmRuleTrigger(confirmed) {
        const modal = document.getElementById('modal');
        if (modal) {
            modal.classList.remove('active');
        }
        
        if (this._ruleTriggerResolve) {
            this._ruleTriggerResolve(confirmed);
            this._ruleTriggerResolve = null;
        }
        
        this.pendingAutoTrigger = null;
    },
    
    async trigger(context = {}) {
        if (!this.initialized) {
            await this.init();
        }
        
        const result = await HentaiPluginHub.checkTrigger(context);
        
        if (result && result.cancelled) {
            return { triggered: false, cancelled: true, context };
        }
        
        if (result && result.scene) {
            const prompt = HentaiPluginHub.buildPrompt(result.scene, context);
            return {
                triggered: true,
                type: result.type,
                scene: result.scene,
                prompt,
                context
            };
        }
        
        return { triggered: false, context };
    },
    
    manualTrigger(context = {}) {
        if (!this.initialized) {
            return { triggered: false, error: 'Not initialized' };
        }
        
        const result = HentaiPluginHub.userTrigger(context);
        
        if (result && result.suggestions) {
            return {
                triggered: true,
                type: 'manual',
                suggestions: result.suggestions,
                context
            };
        }
        
        return { triggered: false, context };
    },
    
    async generateScene(context = {}) {
        if (!this.initialized) {
            await this.init();
        }
        
        const scene = await HentaiPluginHub.generateScene(context);
        const prompt = HentaiPluginHub.buildPrompt(scene, context);
        
        return { scene, prompt, context };
    },
    
    setTriggerMode(mode) {
        HentaiPluginHub.setTriggerMode(mode);
    },
    
    getTriggerMode() {
        return HentaiPluginHub.triggerMode;
    },
    
    addRule(rule) {
        HentaiPluginHub.addRule(rule);
    },
    
    removeRule(index) {
        HentaiPluginHub.removeRule(index);
    },
    
    getPlugins() {
        return HentaiPluginHub.getAllPlugins();
    },
    
    getPlugin(name) {
        return HentaiPluginHub.getPlugin(name);
    },
    
    getHistory() {
        return HentaiPluginHub.getHistory();
    },
    
    getStats() {
        return HentaiPluginHub.getStats();
    },
    
    addUserContent(category, item) {
        if (typeof HentaiUserContent !== 'undefined') {
            HentaiUserContent.addItem(category, item);
        }
    },
    
    getUserContent(category) {
        if (typeof HentaiUserContent !== 'undefined') {
            return HentaiUserContent.getItems(category);
        }
        return [];
    },
    
    searchUserContent(query) {
        if (typeof HentaiUserContent !== 'undefined') {
            return HentaiUserContent.searchItems(query);
        }
        return {};
    },
    
    exportTemplate(category) {
        if (typeof HentaiUserContent !== 'undefined') {
            return HentaiUserContent.exportTemplate(category);
        }
        return '';
    },
    
    reloadUserContent() {
        if (typeof HentaiUserContent !== 'undefined') {
            return HentaiUserContent.reload();
        }
    },
    
    getSystemStatus() {
        return {
            initialized: this.initialized,
            triggerMode: this.getTriggerMode(),
            pluginsLoaded: Object.keys(HentaiPluginHub.plugins).length,
            historyLength: HentaiPluginHub.history.length,
            stats: this.getStats(),
            autoTrigger: HentaiPluginHub.config.autoTrigger || {
                enabled: true,
                minAffection: 30,
                minArousal: 20,
                probability: 0.3
            }
        };
    }
};

window.HentaiIntegration = HentaiIntegration;
