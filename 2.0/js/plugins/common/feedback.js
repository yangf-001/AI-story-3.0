const FeedbackSystem = {
    showMessage(type, message, duration = 3000) {
        const container = document.createElement('div');
        container.className = `feedback ${type}`;
        container.innerHTML = message;
        container.style.position = 'fixed';
        container.style.top = '20px';
        container.style.right = '20px';
        container.style.padding = '12px 20px';
        container.style.borderRadius = '8px';
        container.style.zIndex = '1000';
        container.style.color = 'white';
        container.style.fontWeight = '500';
        container.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
        
        switch(type) {
            case 'success':
                container.style.backgroundColor = '#4CAF50';
                break;
            case 'error':
                container.style.backgroundColor = '#f44336';
                break;
            case 'warning':
                container.style.backgroundColor = '#ff9800';
                break;
            case 'info':
                container.style.backgroundColor = '#2196F3';
                break;
        }
        
        document.body.appendChild(container);
        
        setTimeout(() => {
            container.style.transition = 'opacity 0.3s ease';
            container.style.opacity = '0';
            setTimeout(() => {
                document.body.removeChild(container);
            }, 300);
        }, duration);
    },
    
    success(message) {
        this.showMessage('success', message);
    },
    
    error(message) {
        this.showMessage('error', message);
    },
    
    warning(message) {
        this.showMessage('warning', message);
    },
    
    info(message) {
        this.showMessage('info', message);
    },
    
    confirm(message, callback) {
        if (confirm(message)) {
            callback();
        }
    }
};