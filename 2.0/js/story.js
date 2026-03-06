const Story = {
    current: null,
    history: [],
    
    async start(config) {
        const world = Data.getCurrentWorld();
        if (!world) throw new Error('请先选择一个世界');
        
        const characters = Data.getCharacters(world.id);
        if (characters.length === 0) throw new Error('请先添加角色');
        
        const settings = Settings.get(world.id);
        
        const mainChars = characters.filter(c => c.role === '主角' || c.role === '女主');
        const selectedChars = config.characters?.length 
            ? characters.filter(c => config.characters.includes(c.id))
            : mainChars.length > 0 ? mainChars : characters.slice(0, 3);
        
        let playerCharInfo = null;
        if (config.playerChar) {
            if (config.playerChar.startsWith('custom:')) {
                playerCharInfo = { name: config.playerChar.substring(7), isCustom: true };
            } else {
                const char = characters.find(c => c.id === config.playerChar);
                if (char) {
                    playerCharInfo = { id: char.id, name: char.name, profile: char.profile || {}, adultProfile: char.adultProfile || {} };
                }
            }
        }
        
        const prompt = this._buildStartPrompt(selectedChars, config.scene, settings, playerCharInfo);
        
        this._showLoading('正在生成故事开头...');
        
        try {
            const content = await ai.generateStory(prompt, settings);
            
            const cleanContent = this._cleanStoryContent(content);
            
            this.current = {
                id: Data._genId(),
                worldId: world.id,
                startTime: Date.now(),
                characters: selectedChars.map(c => ({
                    id: c.id,
                    name: c.name,
                    profile: c.profile || {},
                    adultProfile: c.adultProfile || {},
                    stats: c.stats || {}
                })),
                playerChar: playerCharInfo,
                scene: config.scene,
                settings: settings,
                scenes: [{ 
                    content: cleanContent, 
                    choice: null,
                    choices: [],
                    timestamp: Date.now() 
                }],
                status: 'ongoing',
                round: 1
            };
            
            const choices = await this._generateChoices(content, selectedChars, settings);
            this.current.scenes[0].choices = choices;
            
            await this._updateCharacterProfiles(cleanContent, world.id);
            
            await this._extractItemsFromStory(cleanContent, world.id);
            
            PluginSystem.triggerPluginEvent('storyStarted', {
                characters: selectedChars.map(c => c.name),
                scene: config.scene
            });
            
            PluginSystem.triggerPluginEvent('sceneGenerated', {
                sceneIndex: 0,
                content: content,
                choice: null
            });
            
            Data.saveStory(world.id, this.current);
            this._hideLoading();
            return this.current;
        } catch (err) {
            this._hideLoading();
            throw err;
        }
    },

    async continue(choice = null) {
        const world = Data.getCurrentWorld();
        if (!world || !this.current) throw new Error('没有进行中的故事');
        if (this.current.status !== 'ongoing') throw new Error('故事已结束，请开始新故事');
        
        const settings = Settings.get(world.id);
        const characters = Data.getCharacters(world.id);
        
        const context = this._buildContext(characters, settings);
        const prompt = choice 
            ? `根据用户的选择继续故事：${choice}\n\n`
            : '继续故事，生成下一段内容：';
        
        this._showLoading('正在生成故事...');
        
        try {
            const content = await ai.call(prompt, { system: context });
            const cleanContent = this._cleanStoryContent(content);
            
            this.current.scenes.push({
                content: cleanContent,
                choice: choice,
                choices: [],
                timestamp: Date.now()
            });
            
            const choices = await this._generateChoices(content, this.current.characters, settings);
            this.current.scenes[this.current.scenes.length - 1].choices = choices;
            
            this.current.round = this.current.scenes.length;
            
            await this._updateCharacterProfiles(cleanContent, world.id);
            
            await this._extractItemsFromStory(cleanContent, world.id);
            
            Data.saveStory(world.id, this.current);
            this._updateArchiveInPlace(world.id);
            this._hideLoading();
            return this.current;
        } catch (err) {
            this._hideLoading();
            throw err;
        }
    },
    
    _updateArchiveInPlace(worldId) {
        const archives = this.getArchives(worldId);
        const idx = archives.findIndex(a => a.id === this.current.id);
        
        if (idx !== -1) {
            archives[idx].sceneCount = this.current.scenes.length;
            archives[idx].scenes = this.current.scenes;
            localStorage.setItem(`story_archives_${worldId}`, JSON.stringify(archives));
            this._checkArchive(worldId, archives);
        }
    },

    async _updateCharacterProfiles(storyContent, worldId) {
        const characters = this.current.characters;
        if (!characters || characters.length === 0) return;
        
        const charNames = characters.map(c => c.name).join('、');
        
        const prompt = `根据以下故事内容，分析角色在剧情中的数值属性变化。

故事内容：
${storyContent.substring(0, 800)}

角色：${charNames}

可用属性列表：
- health (生命 0-200): 角色的生命值
- energy (体力 0-200): 角色的体力
- charm (魅力 0-200): 角色的魅力值
- intelligence (智力 0-200): 角色的智力
- strength (力量 0-200): 角色的力量
- agility (敏捷 0-200): 角色的敏捷
- sexArousal (欲望 0-200): 角色的性欲望
- sexLibido (性欲 0-200): 角色的性欲强度
- sexSensitivity (敏感 0-200): 角色对性刺激的敏感度
- affection (好感 0-200): 对玩家或他人的好感度
- trust (信任 0-200): 对他人信任程度
- intimacy (亲密 0-200): 亲密程度

请分析故事情节，判断每个角色的数值属性应该有什么变化。返回JSON格式：
{
  "角色名": {
    "health": 变化值(正数增加，负数减少，如 +10 或 -5，或不变则不写),
    "energy": 变化值,
    "charm": 变化值,
    "intelligence": 变化值,
    "strength": 变化值,
    "agility": 变化值,
    "sexArousal": 变化值,
    "sexLibido": 变化值,
    "sexSensitivity": 变化值,
    "affection": 变化值,
    "trust": 变化值,
    "intimacy": 变化值
  }
}

注意：
1. 根据剧情合理设置变化值，一般单次变化在-20到+20之间
2. 如果某个属性没有变化，不要在JSON中列出
3. 如果所有属性都没变化，返回空对象 {}
4. 只返回JSON，不要其他内容`;

        try {
            const result = await ai.call(prompt, { 
                system: '你是一个角色属性分析助手，根据故事情节分析角色数值属性的合理变化。',
                temperature: 0.3 
            });
            
            const jsonMatch = result.match(/\{[\s\S]*\}/);
            if (!jsonMatch) return;
            
            const updates = JSON.parse(jsonMatch[0]);
            
            for (const char of characters) {
                const charUpdates = updates[char.name];
                if (!charUpdates || Object.keys(charUpdates).length === 0) continue;
                
                const currentStats = char.stats || {};
                const newStats = { ...currentStats };
                
                for (const [stat, change] of Object.entries(charUpdates)) {
                    if (typeof change === 'number') {
                        const currentValue = newStats[stat] || 0;
                        newStats[stat] = Math.max(0, Math.min(200, currentValue + change));
                    }
                }
                
                char.stats = newStats;
                
                Data.updateCharacter(worldId, char.id, { stats: newStats });
            }
            
            PluginSystem.triggerPluginEvent('characterStatsUpdated', {
                characters: characters.map(c => ({ id: c.id, name: c.name, stats: c.stats }))
            });
            
        } catch (e) {
            console.warn('更新角色属性失败:', e);
        }
    },

    async _generateChoices(content, characters, settings) {
        const charNames = characters.map(c => c.name).join('、');
        
        const prompt = `基于以下故事内容，生成3个让用户选择的剧情分支选项：

故事内容：
${content.substring(0, 500)}

角色：${charNames}

请生成3个符合故事发展、让用户决定剧情走向的选择项。每个选项用一句话描述，格式如下（只需要选项，不要其他内容）：
1. [选项1描述]
2. [选项2描述]
3. [选项3描述]`;

        try {
            const result = await ai.call(prompt, { 
                system: '你是一个故事助手，生成的选择要符合剧情发展。',
                temperature: 0.8 
            });
            
            const choices = result.split('\n')
                .map(line => line.replace(/^\d+[\.、]\s*/, '').trim())
                .filter(line => line.length > 0 && line.length < 100)
                .slice(0, 3);
            
            if (choices.length < 3) {
                return [
                    '继续发展当前情节',
                    '深入探索某个细节',
                    '改变故事方向'
                ];
            }
            
            return choices;
        } catch (e) {
            return [
                '继续发展当前情节',
                '深入探索某个细节',
                '改变故事方向'
            ];
        }
    },
    
    async _extractItemsFromStory(storyContent, worldId) {
        const inventoryPlugin = PluginSystem.get('inventory');
        if (!inventoryPlugin) return;
        
        const library = inventoryPlugin.getItemLibrary();
        if (library.length === 0) return;
        
        const characters = this.current.characters;
        if (!characters || characters.length === 0) return;
        
        const itemNames = library.map(i => i.name).join('、');
        const charNames = characters.map(c => c.name).join('、');
        
        const prompt = `根据以下故事内容，分析是否有出现以下物品（从物品库中匹配），并识别哪个角色获得了物品：

物品库：${itemNames}

角色：${charNames}

故事内容：
${storyContent.substring(0, 1200)}

请分析故事中物品的获得和使用情况，返回JSON格式：
{
  "获得": [
    {"物品": "物品名", "角色": "角色名"},
    {"物品": "物品名2", "角色": "角色名2"}
  ],
  "使用": [
    {"物品": "物品名", "角色": "角色名"}
  ]
}

注意：
1. "获得"指角色获得/拥有的物品，需要指明是哪个角色获得的
2. "使用"指角色使用/消耗的物品
3. 如果物品没有明确指定给哪个角色，默认给第一个角色
4. 只返回与物品库中物品名称匹配的内容
5. 如果没有匹配，返回空数组
6. 只返回JSON，不要其他内容`;

        try {
            const result = await ai.call(prompt, { 
                system: '你是一个物品分析助手，根据故事情节识别物品和获得者。',
                temperature: 0.3 
            });
            
            const jsonMatch = result.match(/\{[\s\S]*\}/);
            if (!jsonMatch) return;
            
            const itemData = JSON.parse(jsonMatch[0]);
            
            const gainedItems = itemData['获得'] || [];
            const usedItems = itemData['使用'] || [];
            
            for (const itemGain of gainedItems) {
                const itemName = itemGain['物品'] || itemGain.item || itemGain.name;
                let charName = itemGain['角色'] || itemGain.character || itemGain.owner;
                
                if (!charName) {
                    charName = characters[0].name;
                }
                
                const char = characters.find(c => c.name === charName);
                if (char) {
                    const libItem = library.find(i => i.name === itemName);
                    if (libItem) {
                        inventoryPlugin.addItem(worldId, char.id, libItem);
                        console.log(`[物品] ${char.name} 获得了 ${libItem.name}`);
                    }
                }
            }
            
            for (const itemUse of usedItems) {
                const itemName = itemUse['物品'] || itemUse.item || itemUse.name;
                let charName = itemUse['角色'] || itemUse.character || itemUse.user;
                
                const char = characters.find(c => c.name === charName);
                if (char) {
                    const used = inventoryPlugin.useItemByName(worldId, char.id, itemName);
                    if (used) {
                        console.log(`[物品] ${char.name} 使用了 ${itemName}`);
                    }
                }
            }
            
            if (gainedItems.length > 0 || usedItems.length > 0) {
                PluginSystem.triggerPluginEvent('itemsInStory', {
                    gained: gainedItems,
                    used: usedItems,
                    storyContent: storyContent.substring(0, 200)
                });
            }
            
        } catch (e) {
            console.warn('提取物品失败:', e);
        }
    },

    _cleanStoryContent(content) {
        if (!content) return content;
        
        let cleaned = content;
        
        const patterns = [
            /[\n\r]*[\*\-—]+\s*接下来可能的发展[：:]*[\n\r]*/gi,
            /[\n\r]*[\*\-—]+\s*请选择剧情走向[：:]*[\n\r]*/gi,
            /[\n\r]*[\*\-—]+\s*后续发展[：:]*[\n\r]*/gi,
            /[\n\r]*[\*\-—]+\s*可能的发展[：:]*[\n\r]*/gi,
            /[\n\r]*[\*\-—]+\s*发展选项[：:]*[\n\r]*/gi,
            /[\n\r]*✏️\s*自定义[\s\S]*?$/gi,
            /[\n\r]*\d+[\.、]\s+[\u4e00-\u9fa5]{2,10}[\s\S]*?$/gm
        ];
        
        for (const pattern of patterns) {
            cleaned = cleaned.replace(pattern, '');
        }
        
        cleaned = cleaned.trim();
        
        return cleaned;
    },

    async end(summary = '') {
        const world = Data.getCurrentWorld();
        if (!world || !this.current) throw new Error('没有进行中的故事');
        
        const summaryPrompt = `用一句话总结这个故事的核心内容（20字以内）：\n\n${this.current.scenes.map(s => s.content).join('\n')}`;
        
        let storySummary = summary;
        try {
            storySummary = await ai.call(summaryPrompt, { maxTokens: 50 });
            storySummary = storySummary.replace(/[""]/g, '').substring(0, 30);
        } catch (e) {
            storySummary = summary || '精彩的故事';
        }
        
        const archives = this.getArchives(world.id);
        const existingIdx = archives.findIndex(a => a.id === this.current.id);
        
        const archive = {
            id: this.current.id,
            worldId: world.id,
            title: storySummary,
            startTime: this.current.startTime,
            endTime: Date.now(),
            characters: this.current.characters,
            sceneCount: this.current.scenes.length,
            settings: this.current.settings,
            summary: storySummary,
            scenes: this.current.scenes,
            scene: this.current.scene,
            status: 'ended'
        };
        
        if (existingIdx !== -1) {
            archives[existingIdx] = archive;
        } else {
            archives.unshift(archive);
            this._checkArchive(world.id, archives);
        }
        
        localStorage.setItem(`story_archives_${world.id}`, JSON.stringify(archives));
        
        this.current.status = 'ended';
        this.current.endTime = Date.now();
        
        Data.saveStory(world.id, null);
        this.current = null;
        
        return archive;
    },

    getArchives(worldId) {
        try {
            return JSON.parse(localStorage.getItem(`story_archives_${worldId}`) || '[]');
        } catch { return []; }
    },
    
    getArchivedStories(worldId) {
        try {
            return JSON.parse(localStorage.getItem(`story_archived_${worldId}`) || '[]');
        } catch { return []; }
    },
    
    deleteArchive(archiveId) {
        const world = Data.getCurrentWorld();
        if (!world) return false;
        
        const archives = this.getArchives(world.id);
        const idx = archives.findIndex(a => a.id === archiveId);
        
        if (idx !== -1) {
            archives.splice(idx, 1);
            localStorage.setItem(`story_archives_${world.id}`, JSON.stringify(archives));
            return true;
        }
        
        return false;
    },
    
    deleteArchivedStory(archiveId) {
        const world = Data.getCurrentWorld();
        if (!world) return false;
        
        const archived = this.getArchivedStories(world.id);
        const idx = archived.findIndex(a => a.id === archiveId);
        
        if (idx !== -1) {
            archived.splice(idx, 1);
            localStorage.setItem(`story_archived_${world.id}`, JSON.stringify(archived));
            return true;
        }
        
        return false;
    },
    
    deleteLevel2Story(archiveId) {
        const world = Data.getCurrentWorld();
        if (!world) return false;
        
        const level2 = this.getLevel2Archives(world.id);
        const idx = level2.findIndex(a => a.id === archiveId);
        
        if (idx !== -1) {
            level2.splice(idx, 1);
            localStorage.setItem(`story_level2_${world.id}`, JSON.stringify(level2));
            return true;
        }
        
        return false;
    },
    
    deleteLevel3Story(archiveId) {
        const world = Data.getCurrentWorld();
        if (!world) return false;
        
        const level3 = this.getLevel3Archives(world.id);
        const idx = level3.findIndex(a => a.id === archiveId);
        
        if (idx !== -1) {
            level3.splice(idx, 1);
            localStorage.setItem(`story_level3_${world.id}`, JSON.stringify(level3));
            return true;
        }
        
        return false;
    },
    
    _checkArchive(worldId, archives) {
        for (let i = 0; i < archives.length; i++) {
            const story = archives[i];
            while (story.scenes && story.scenes.length > 10 && !story.level2Summary) {
                this._createLevel2SummarySync(worldId, story, archives);
                break;
            }
        }
        
        const level2Archives = this.getLevel2Archives(worldId);
        
        while (level2Archives.length > 10) {
            this._createLevel3SummarySync(worldId, level2Archives);
        }
    },
    
    getLevel2Archives(worldId) {
        try {
            return JSON.parse(localStorage.getItem(`story_level2_${worldId}`) || '[]');
        } catch { return []; }
    },
    
    getLevel3Archives(worldId) {
        try {
            return JSON.parse(localStorage.getItem(`story_level3_${worldId}`) || '[]');
        } catch { return []; }
    },
    
    _createLevel2SummarySync(worldId, story, archives) {
        const first10Scenes = story.scenes.slice(0, 10);
        const remainingScenes = story.scenes.slice(10);
        
        const level2Entry = {
            id: story.id + '_' + Date.now(),
            title: story.title + ' (前10幕)',
            originalTitle: story.title,
            startTime: story.startTime,
            endTime: story.endTime,
            characters: story.characters,
            sceneCount: 10,
            summary: '[待生成摘要]',
            archivedAt: Date.now()
        };
        
        const level2Archives = this.getLevel2Archives(worldId);
        level2Archives.unshift(level2Entry);
        
        const idx = archives.findIndex(a => a.id === story.id);
        if (idx !== -1) {
            archives[idx].level2Summary = '[待生成摘要]';
            archives[idx].scenes = remainingScenes;
            archives[idx].sceneCount = remainingScenes.length;
        }
        
        if (level2Archives.length > 20) level2Archives.length = 20;
        
        localStorage.setItem(`story_level2_${worldId}`, JSON.stringify(level2Archives));
        localStorage.setItem(`story_archives_${worldId}`, JSON.stringify(archives));
        
        this._generateLevel2SummaryAsync(worldId, level2Entry.id, first10Scenes, story.title);
    },
    
    async _generateLevel2SummaryAsync(worldId, entryId, scenes, storyTitle) {
        const content = scenes.map(s => s.content).join('\n\n');
        
        const prompt = `请用约1000字总结以下故事内容，要求保留关键剧情、人物和转折点：

${content}`;

        try {
            const summary = await ai.call(prompt, { maxTokens: 2000 });
            
            const level2 = this.getLevel2Archives(worldId);
            const idx = level2.findIndex(e => e.id === entryId);
            if (idx !== -1) {
                level2[idx].summary = summary;
                localStorage.setItem(`story_level2_${worldId}`, JSON.stringify(level2));
            }
            
            const archives = this.getArchives(worldId);
            const archIdx = archives.findIndex(a => a.title === storyTitle || a.title + ' (前10幕)' === level2[idx]?.title);
            if (archIdx !== -1) {
                archives[archIdx].level2Summary = summary;
                localStorage.setItem(`story_archives_${worldId}`, JSON.stringify(archives));
            }
        } catch (e) {
            console.error('生成摘要失败:', e);
        }
    },
    
    _createLevel3SummarySync(worldId, level2Archives) {
        const toSummarize = level2Archives.slice(0, 10);
        
        const level3Entry = {
            id: Data._genId(),
            title: '故事合集',
            stories: toSummarize.map(s => ({
                title: s.originalTitle || s.title,
                summary: s.summary
            })),
            summary: '[待生成综合摘要]',
            archivedAt: Date.now()
        };
        
        const level3Archives = this.getLevel3Archives(worldId);
        level3Archives.unshift(level3Entry);
        
        for (let i = 0; i < 10 && level2Archives.length > 0; i++) {
            level2Archives.shift();
        }
        
        if (level3Archives.length > 20) level3Archives.length = 20;
        
        localStorage.setItem(`story_level3_${worldId}`, JSON.stringify(level3Archives));
        localStorage.setItem(`story_level2_${worldId}`, JSON.stringify(level2Archives));
        
        this._generateLevel3SummaryAsync(worldId, level3Entry.id, toSummarize);
    },
    
    async _generateLevel3SummaryAsync(worldId, entryId, stories) {
        const content = stories.map(s => s.summary).join('\n\n---\n\n');
        
        const prompt = `请用约2000字总结以下10个故事，要求保留每个故事的核心剧情和人物关系：

${content}`;

        try {
            const summary = await ai.call(prompt, { maxTokens: 3000 });
            
            const level3 = this.getLevel3Archives(worldId);
            const idx = level3.findIndex(e => e.id === entryId);
            if (idx !== -1) {
                level3[idx].summary = summary;
                localStorage.setItem(`story_level3_${worldId}`, JSON.stringify(level3));
            }
        } catch (e) {
            console.error('生成综合摘要失败:', e);
        }
    },
    
    async _createLevel3Summary(worldId, level2Archives, level3Archives) {
        const toSummarize = level2Archives.slice(0, 10);
        const content = toSummarize.map(s => s.summary).join('\n\n---\n\n');
        
        const prompt = `请用约2000字总结以下10个故事，要求保留每个故事的核心剧情和人物关系：

${content}`;

        let summary = '';
        try {
            summary = await ai.call(prompt, { maxTokens: 3000 });
        } catch (e) {
            summary = '多个故事的综合摘要';
        }
        
        const level3Entry = {
            id: Data._genId(),
            title: '故事合集',
            stories: toSummarize.map(s => ({
                title: s.originalTitle || s.title,
                summary: s.summary
            })),
            summary: summary,
            archivedAt: Date.now()
        };
        
        level3Archives.unshift(level3Entry);
        
        for (const story of toSummarize) {
            const idx = level2Archives.findIndex(s => s.id === story.id);
            if (idx !== -1) {
                level2Archives.splice(idx, 1);
            }
        }
        
        if (level3Archives.length > 20) level3Archives.length = 20;
        
        localStorage.setItem(`story_level3_${worldId}`, JSON.stringify(level3Archives));
        localStorage.setItem(`story_level2_${worldId}`, JSON.stringify(level2Archives));
    },

    load(archiveId) {
        const world = Data.getCurrentWorld();
        if (!world) return null;
        
        const archives = this.getArchives(world.id);
        const archive = archives.find(a => a.id === archiveId);
        
        if (archive) {
            this.current = Data.getStory(world.id);
            return archive;
        }
        return null;
    },

    load(worldId) {
        this.current = Data.getStory(worldId);
        return this.current;
    },

    resumeArchive(archiveId) {
        const world = Data.getCurrentWorld();
        if (!world) return null;
        
        const archives = this.getArchives(world.id);
        const archive = archives.find(a => a.id === archiveId);
        
        if (!archive || !archive.scenes) return null;
        
        this.current = {
            id: archive.id,
            worldId: world.id,
            startTime: archive.startTime,
            characters: archive.characters,
            scene: archive.scene,
            settings: archive.settings,
            scenes: archive.scenes,
            status: 'ongoing',
            round: archive.scenes.length,
            endTime: null
        };
        
        Data.saveStory(world.id, this.current);
        
        return this.current;
    },

    _buildStartPrompt(characters, scene, settings, playerChar) {
        const charList = characters.map(c => {
            const profile = c.profile || {};
            const adult = c.adultProfile || {};
            return {
                name: c.name,
                gender: c.gender,
                age: c.age,
                appearance: profile.appearance || '',
                personality: profile.personality || '',
                backstory: profile.backstory || '',
                fetish: adult.fetish || [],
                turnOns: adult.turnOns || ''
            };
        });
        
        let playerInfo = '';
        if (playerChar) {
            if (playerChar.isCustom) {
                playerInfo = `\n玩家扮演的角色：${playerChar.name}`;
            } else {
                const profile = playerChar.profile || {};
                const adult = playerChar.adultProfile || {};
                playerInfo = `\n玩家扮演的角色：${playerChar.name}（${profile.personality || ''}，${profile.backstory || ''}）`;
            }
        }
        
        const ctx = Settings.buildPromptContext(settings);
        const world = Data.getCurrentWorld();
        const pluginContext = this._getPluginContext(world?.id);
        
        return `生成一个故事开头：
角色信息：${JSON.stringify(charList)}${playerInfo}
场景设定：${scene || '任意'}
风格要求：${ctx}${pluginContext}

请生成200-500字的故事开头，并自然地引出后续剧情发展的可能性。`;
    },

    _buildContext(characters, settings) {
        const world = Data.getCurrentWorld();
        const charList = this.current.characters;
        
        const allHistory = this._getAllHistory(world.id);
        
        const recentScenes = this.current.scenes.slice(-3);
        const currentHistory = recentScenes.map((s, i) => {
            let text = s.content;
            if (s.choice) {
                text += `\n[用户选择了：${s.choice}]`;
            }
            return text;
        }).join('\n\n---\n\n');
        
        let historySection = '';
        if (allHistory.length > 0) {
            historySection = `\n\n【之前的故事剧情】\n${allHistory.join('\n\n---\n\n')}`;
        }
        
        if (currentHistory) {
            historySection += `\n\n【当前故事最新剧情】\n${currentHistory}`;
        }
        
        const charDesc = charList.map(c => 
            `${c.name}：${c.profile?.personality || '暂无设定'}，${c.profile?.appearance || '暂无描述'}`
        ).join('；');
        
        const ctx = Settings.buildPromptContext(settings);
        
        return `你是故事作家。基于以下设定继续故事：

角色：${charDesc}
背景：${world?.name || '自定义世界'}
设定：${ctx}
${historySection}

请生成下一段故事内容（100-300字），通过故事情节自然呈现，并根据内容提供后续发展的可能性。注意：
1. 响应用户上一次的选择
2. 根据角色设定发展故事
3. 适当埋下后续剧情的伏笔`;
    },
    
    _getAllHistory(worldId) {
        const allScenes = [];
        
        const archives = this.getArchives(worldId);
        for (const archive of archives) {
            if (archive.scenes && archive.scenes.length > 0) {
                const title = `[${archive.title}]`;
                for (const scene of archive.scenes) {
                    let text = scene.content;
                    if (scene.choice) {
                        text += `\n[用户选择了：${scene.choice}]`;
                    }
                    allScenes.push(`${title}\n${text}`);
                }
            }
            if (archive.level2Summary && archive.level2Summary !== '[待生成摘要]') {
                allScenes.push(`[${archive.title} - 前10幕摘要]\n${archive.level2Summary}`);
            }
        }
        
        const level2 = this.getLevel2Archives(worldId);
        for (const story of level2) {
            if (story.summary && story.summary !== '[待生成摘要]') {
                allScenes.push(`[${story.originalTitle || story.title}]\n${story.summary}`);
            }
        }
        
        const level3 = this.getLevel3Archives(worldId);
        for (const collection of level3) {
            if (collection.summary && collection.summary !== '[待生成综合摘要]') {
                allScenes.push(`[${collection.title}]\n${collection.summary}`);
            }
        }
        
        return allScenes;
    },

    _showLoading(text) {
        document.getElementById('modalBody').innerHTML = `
            <div class="loading">
                <div class="spinner"></div>
                <p>${text}</p>
            </div>
        `;
        document.getElementById('modalTitle').textContent = '请稍候';
        document.getElementById('modal').classList.add('active');
    },

    _hideLoading() {
        document.getElementById('modal').classList.remove('active');
    },

    getCurrent() {
        return this.current;
    },

    isOngoing() {
        return this.current && this.current.status === 'ongoing';
    },

    getRound() {
        return this.current ? this.current.round : 0;
    },
    
    exportArchive(archiveId) {
        const world = Data.getCurrentWorld();
        if (!world) return null;
        
        let archive = null;
        
        const archives = this.getArchives(world.id);
        archive = archives.find(a => a.id === archiveId);
        
        if (!archive) {
            const archived = this.getArchivedStories(world.id);
            archive = archived.find(a => a.id === archiveId);
        }
        
        if (!archive) return null;
        
        const exportData = {
            type: 'story_archive',
            version: 1,
            exportTime: Date.now(),
            worldId: world.id,
            isArchived: !this.getArchives(world.id).find(a => a.id === archiveId),
            archive: archive
        };
        
        const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `故事_${archive.title}_${new Date(archive.startTime).toLocaleDateString()}.json`;
        a.click();
        URL.revokeObjectURL(url);
        
        return exportData;
    },
    
    importArchive(jsonString) {
        try {
            const data = JSON.parse(jsonString);
            
            if (!data.archive) {
                throw new Error('无效的故事存档文件');
            }
            
            const world = Data.getCurrentWorld();
            if (!world) throw new Error('请先选择一个世界');
            
            const archive = data.archive;
            archive.worldId = world.id;
            archive.id = Data._genId();
            archive.startTime = Date.now();
            
            const archives = this.getArchives(world.id);
            archives.unshift(archive);
            this._checkArchive(world.id, archives);
            
            return archive;
        } catch (e) {
            throw new Error('导入失败：' + e.message);
        }
    },
    
    getArchivedStoriesList(main) {
        const world = Data.getCurrentWorld();
        if (!world) return;
        
        const archived = this.getArchivedStories(world.id);
        
        if (archived.length === 0) {
            return '<div class="empty">暂无归档故事</div>';
        }
        
        return archived.map(a => `
            <div style="padding: 12px; background: var(--card); border: 1px solid var(--border); border-radius: 8px; margin-bottom: 8px;">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <div style="flex: 1; cursor: pointer;" onclick="viewArchivedStory('${a.id}')">
                        <div style="font-weight: 500;">${a.title}</div>
                        <div style="font-size: 0.75rem; color: var(--text-dim); margin-top: 4px;">
                            ${Array.isArray(a.characters) ? a.characters.map(c => c.name).join('、') : a.characters} · ${a.sceneCount}幕 · ${new Date(a.startTime).toLocaleDateString()}
                        </div>
                    </div>
                    <button class="btn btn-secondary" onclick="exportArchive('${a.id}')" style="font-size: 0.75rem; padding: 6px 10px;" title="导出">📤</button>
                </div>
            </div>
        `).join('');
    },

    _getPluginContext(worldId) {
        const plugins = PluginSystem.getEnabled();
        let context = '';
        
        for (const plugin of plugins) {
            if (plugin.getStoryContext) {
                const pluginCtx = plugin.getStoryContext(worldId);
                if (pluginCtx) {
                    context += '\n' + pluginCtx;
                }
            }
        }
        
        return context;
    }
};

window.Story = Story;
