class ModalManager {
    constructor() {
        this.overlay = document.getElementById('modalOverlay');
        this.initEventListeners();
    }

    initEventListeners() {
        // Close modal when clicking overlay
        this.overlay?.addEventListener('click', (e) => {
            if (e.target === this.overlay) {
                this.closeAll();
            }
        });

        // Close modal when clicking X button
        document.querySelectorAll('.modal-close').forEach(btn => {
            btn.addEventListener('click', () => this.closeAll());
        });

        // ESC key to close modals
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.closeAll();
            }
        });
    }

    show(modalId) {
        this.closeAll();
        const modal = document.getElementById(modalId);
        if (modal && this.overlay) {
            this.overlay.classList.add('active');
            modal.classList.add('active');
            
            // Focus first input if available
            const firstInput = modal.querySelector('input[type="text"]');
            if (firstInput) {
                setTimeout(() => firstInput.focus(), 100);
            }
        }
    }

    closeAll() {
        this.overlay?.classList.remove('active');
        document.querySelectorAll('.modal').forEach(modal => {
            modal.classList.remove('active');
        });
        this.clearMessages();
    }

    showMessage(modalId, message, type = 'info') {
        const messageEl = document.querySelector(`#${modalId} .modal-message`);
        if (messageEl) {
            messageEl.textContent = message;
            messageEl.className = `modal-message ${type}`;
        }
    }

    clearMessages() {
        document.querySelectorAll('.modal-message').forEach(msg => {
            msg.className = 'modal-message';
            msg.textContent = '';
        });
    }
}

// Export singleton instance
export const modalManager = new ModalManager();

// Save Project Modal
export function showSaveModal() {
    return new Promise((resolve) => {
        modalManager.show('saveModal');
        
        const nameInput = document.getElementById('projectName');
        const confirmBtn = document.getElementById('saveConfirmBtn');
        const cancelBtn = document.getElementById('saveCancelBtn');
        
        // Clear previous value
        if (nameInput) nameInput.value = '';
        
        const handleConfirm = () => {
            const name = nameInput?.value.trim();
            if (name) {
                cleanup();
                resolve(name);
            } else {
                modalManager.showMessage('saveModal', 'Please enter a project name', 'error');
            }
        };
        
        const handleCancel = () => {
            cleanup();
            resolve(null);
        };
        
        const cleanup = () => {
            confirmBtn?.removeEventListener('click', handleConfirm);
            cancelBtn?.removeEventListener('click', handleCancel);
            nameInput?.removeEventListener('keydown', handleKeydown);
            modalManager.closeAll();
        };
        
        const handleKeydown = (e) => {
            if (e.key === 'Enter') {
                handleConfirm();
            }
        };
        
        confirmBtn?.addEventListener('click', handleConfirm);
        cancelBtn?.addEventListener('click', handleCancel);
        nameInput?.addEventListener('keydown', handleKeydown);
    });
}

// Load Project Modal
export function showLoadModal(projects) {
    return new Promise((resolve) => {
        modalManager.show('loadModal');
        
        const projectsList = document.getElementById('projectsList');
        const confirmBtn = document.getElementById('loadConfirmBtn');
        const cancelBtn = document.getElementById('loadCancelBtn');
        let selectedProject = null;
        
        // Populate projects list
        if (projectsList) {
            if (projects.length === 0) {
                projectsList.innerHTML = '<div class="loading">No saved projects found</div>';
            } else {
                projectsList.innerHTML = projects.map(project => `
                    <div class="project-item" data-name="${project.name}">
                        <div class="project-name">${project.name}</div>
                        <div class="project-details">
                            ${project.width}×${project.height} • 
                            ${new Date(project.updatedAt).toLocaleDateString()}
                        </div>
                    </div>
                `).join('');
                
                // Add click handlers to project items
                projectsList.querySelectorAll('.project-item').forEach(item => {
                    item.addEventListener('click', () => {
                        // Remove previous selection
                        projectsList.querySelectorAll('.project-item').forEach(i => 
                            i.classList.remove('selected'));
                        // Select current
                        item.classList.add('selected');
                        selectedProject = projects.find(p => p.name === item.dataset.name);
                        
                        // Enable confirm button
                        if (confirmBtn) confirmBtn.disabled = false;
                    });

                // Double-click to load immediately
                    item.addEventListener('dblclick', () => {
                        selectedProject = projects.find(p => p.name === item.dataset.name);
                        if (selectedProject) {
                            cleanup();
                            modalManager.closeAll(); // Close modal before loading
                            resolve(selectedProject);
                        }
                    });
                });
            }
        }
        
        const handleConfirm = () => {
            if (selectedProject) {
                cleanup();
                modalManager.closeAll(); // Close modal before loading
                resolve(selectedProject);
            }
        };
        
        const handleCancel = () => {
            cleanup();
            resolve(null);
        };
        
        const cleanup = () => {
            confirmBtn?.removeEventListener('click', handleConfirm);
            cancelBtn?.removeEventListener('click', handleCancel);
        };
        
        confirmBtn?.addEventListener('click', handleConfirm);
        cancelBtn?.addEventListener('click', handleCancel);
        
        // Disable confirm button initially
        if (confirmBtn) confirmBtn.disabled = true;
    });
}

// Download Modal
export function showDownloadModal(canvasSize) {
    return new Promise((resolve) => {
        modalManager.show('downloadModal');
        
        const fileNameInput = document.getElementById('fileName');
        const scaleSlider = document.getElementById('scaleSlider');
        const scaleValue = document.getElementById('scaleValue');
        const canvasInfo = document.getElementById('canvasInfo');
        const outputInfo = document.getElementById('outputInfo');
        const confirmBtn = document.getElementById('downloadConfirmBtn');
        const cancelBtn = document.getElementById('downloadCancelBtn');
        
        // Set default filename
        if (fileNameInput) fileNameInput.value = 'pixardi-art';
        
        // Update canvas info
        if (canvasInfo) canvasInfo.textContent = `${canvasSize.width}×${canvasSize.height}px`;
        
        const updateScale = () => {
            const scale = parseInt(scaleSlider?.value || '20');
            if (scaleValue) scaleValue.textContent = `${scale}x`;
            if (outputInfo) {
                const outputWidth = canvasSize.width * scale;
                const outputHeight = canvasSize.height * scale;
                outputInfo.textContent = `${outputWidth}×${outputHeight}px`;
            }
        };
        
        // Initial update
        updateScale();
        
        const handleConfirm = () => {
            const fileName = fileNameInput?.value.trim() || 'pixardi-art';
            const scale = parseInt(scaleSlider?.value || '20');
            cleanup();
            resolve({ fileName, scale });
        };
        
        const handleCancel = () => {
            cleanup();
            resolve(null);
        };
        
        const cleanup = () => {
            confirmBtn?.removeEventListener('click', handleConfirm);
            cancelBtn?.removeEventListener('click', handleCancel);
            scaleSlider?.removeEventListener('input', updateScale);
            modalManager.closeAll();
        };
        
        confirmBtn?.addEventListener('click', handleConfirm);
        cancelBtn?.addEventListener('click', handleCancel);
        scaleSlider?.addEventListener('input', updateScale);
    });
}