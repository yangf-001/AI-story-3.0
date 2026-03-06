// 统一用户反馈系统
const FeedbackSystem = {
    // 显示消息提示
    showMessage(message, type = 'info', duration = 3000) {
        const existingToast = document.getElementById('feedback-toast');
        if (existingToast) {
            existingToast.remove();
        }
        
        const toast = document.createElement('div');
        toast.id = 'feedback-toast';
        toast.className = `toast toast-${type}`;
        toast.innerHTML = message;
        
        toast.style.position = 'fixed';
        toast.style.top = '20px';
        toast.style.right = '20px';
        toast.style.padding = '12px 20px';
        toast.style.borderRadius = '8px';
        toast.style.color = '#fff';
        toast.style.fontSize = '14px';
        toast.style.fontWeight = '500';
        toast.style.zIndex = '10000';
        toast.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.15)';
        toast.style.animation = 'slideInRight 0.3s ease-out';
        
        // 根据类型设置背景颜色
        switch(type) {
            case 'success':
                toast.style.backgroundColor = '#10b981';
                break;
            case 'error':
                toast.style.backgroundColor = '#ef4444';
                break;
            case 'warning':
                toast.style.backgroundColor = '#f59e0b';
                break;
            default:
                toast.style.backgroundColor = '#3b82f6';
        }
        
        document.body.appendChild(toast);
        
        setTimeout(() => {
            toast.style.animation = 'slideOutRight 0.3s ease-in';
            setTimeout(() => {
                toast.remove();
            }, 300);
        }, duration);
    },
    
    // 显示成功消息
    success(message, duration) {
        this.showMessage(message, 'success', duration);
    },
    
    // 显示错误消息
    error(message, duration) {
        this.showMessage(message, 'error', duration);
    },
    
    // 显示警告消息
    warning(message, duration) {
        this.showMessage(message, 'warning', duration);
    },
    
    // 显示信息消息
    info(message, duration) {
        this.showMessage(message, 'info', duration);
    },
    
    // 显示确认对话框
    confirm(message, onConfirm, onCancel) {
        const existingModal = document.getElementById('confirm-modal');
        if (existingModal) {
            existingModal.remove();
        }
        
        const modal = document.createElement('div');
        modal.id = 'confirm-modal';
        modal.className = 'modal';
        modal.style.display = 'flex';
        modal.style.alignItems = 'center';
        modal.style.justifyContent = 'center';
        modal.style.position = 'fixed';
        modal.style.top = '0';
        modal.style.left = '0';
        modal.style.width = '100%';
        modal.style.height = '100%';
        modal.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
        modal.style.zIndex = '10000';
        
        modal.innerHTML = `
            <div class="modal-content" style="background: white; border-radius: 8px; padding: 24px; width: 90%; max-width: 400px; box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);">
                <div class="modal-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
                    <h3 style="margin: 0; font-size: 18px; font-weight: 600;">确认操作</h3>
                    <button class="modal-close" onclick="FeedbackSystem.closeConfirm()" style="background: none; border: none; font-size: 20px; cursor: pointer;">×</button>
                </div>
                <div class="modal-body" style="margin-bottom: 20px;">
                    <p>${message}</p>
                </div>
                <div class="modal-footer" style="display: flex; justify-content: flex-end; gap: 12px;">
                    <button class="btn btn-secondary" onclick="FeedbackSystem.closeConfirm()" style="padding: 8px 16px; border: 1px solid #e5e7eb; border-radius: 6px; background: white; cursor: pointer;">取消</button>
                    <button class="btn" onclick="FeedbackSystem.confirmAction()" style="padding: 8px 16px; border: none; border-radius: 6px; background: #3b82f6; color: white; cursor: pointer;">确认</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // 保存回调函数
        window.__confirmCallbacks = {
            onConfirm,
            onCancel
        };
    },
    
    // 关闭确认对话框
    closeConfirm() {
        const modal = document.getElementById('confirm-modal');
        if (modal) {
            modal.remove();
        }
        
        if (window.__confirmCallbacks?.onCancel) {
            window.__confirmCallbacks.onCancel();
        }
        
        window.__confirmCallbacks = null;
    },
    
    // 确认操作
    confirmAction() {
        if (window.__confirmCallbacks?.onConfirm) {
            window.__confirmCallbacks.onConfirm();
        }
        this.closeConfirm();
    }
};

// 添加动画样式
const style = document.createElement('style');
style.textContent = `
    @keyframes slideInRight {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    
    @keyframes slideOutRight {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(100%);
            opacity: 0;
        }
    }
`;
document.head.appendChild(style);

window.FeedbackSystem = FeedbackSystem;