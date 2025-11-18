// Gallery functionality
class Gallery {
    constructor() {
        this.currentProjectId = null;
        this.init();
    }

    init() {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                this.generatePreviews();
                this.attachEventListeners();
            });
        } else {
            // DOM is already loaded
            this.generatePreviews();
            this.attachEventListeners();
        }
    }

    generatePreviews() {
        const previews = document.querySelectorAll('.pixel-canvas-preview');
        
        previews.forEach(preview => {
            try {
                const canvasDataRaw = preview.dataset.canvas || '{}';
                const canvasData = JSON.parse(canvasDataRaw);
                const width = parseInt(preview.dataset.width) || 16;
                const height = parseInt(preview.dataset.height) || 16;
                
                this.generatePreview(preview, canvasData, width, height);
            } catch (error) {
                console.error('Error parsing canvas data:', error);
                this.showPreviewError(preview);
            }
        });
    }

    generatePreview(container, canvasData, width, height) {
        try {
            container.innerHTML = '';

            const containerRect = container.getBoundingClientRect();
            const maxWidth = containerRect.width || 200;
            const maxHeight = containerRect.height || 200;
            
            const pixelSize = Math.max(1, Math.min(
                Math.floor(maxWidth / width),
                Math.floor(maxHeight / height)
            ));
            
            const previewWidth = width * pixelSize;
            const previewHeight = height * pixelSize;

            container.style.width = '100%';
            container.style.height = '100%';
            container.style.display = 'flex';
            container.style.alignItems = 'center';
            container.style.justifyContent = 'center';
            container.style.imageRendering = 'pixelated';

            const previewGrid = document.createElement('div');
            previewGrid.style.display = 'grid';
            previewGrid.style.gridTemplateColumns = `repeat(${width}, ${pixelSize}px)`;
            previewGrid.style.gridTemplateRows = `repeat(${height}, ${pixelSize}px)`;
            previewGrid.style.gap = '0';
            previewGrid.style.width = previewWidth + 'px';
            previewGrid.style.height = previewHeight + 'px';

            if (!canvasData || Object.keys(canvasData).length === 0) {
                this.showPreviewError(container, 'No canvas data');
                return;
            }

            for (let y = 0; y < height; y++) {
                for (let x = 0; x < width; x++) {
                    const pixel = document.createElement('div');
                    const key = `${x},${y}`;
                    const color = canvasData[key] || 'transparent';

                    pixel.style.backgroundColor = color;
                    pixel.style.width = pixelSize + 'px';
                    pixel.style.height = pixelSize + 'px';
                    pixel.style.border = 'none';
                    pixel.style.margin = '0';
                    pixel.style.padding = '0';

                    previewGrid.appendChild(pixel);
                }
            }

            container.appendChild(previewGrid);
        } catch (error) {
            console.error('Error generating preview:', error);
            this.showPreviewError(container, error.message);
        }
    }

    showPreviewError(container, message = 'Preview Error') {
        container.innerHTML = `<div style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; color: var(--primary-300, #888); font-size: 12px;">
            <div style="font-size: 24px; margin-bottom: 8px;">🎨</div>
            <div>${message}</div>
        </div>`;
    }

    attachEventListeners() {
        document.addEventListener('click', (e) => {
            if (e.target.id === 'commentModal') {
                this.closeCommentModal();
            }
        });

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.closeCommentModal();
            }
        });

        document.querySelectorAll('.like-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                const projectId = btn.getAttribute('data-project-id');
                if (projectId) {
                    this.toggleLike(projectId, btn);
                }
            });
        });
    }

    // View project details
    viewProject(id) {
        // Use the URL base and append the ID
        const detailsUrl = (window.galleryUrls?.details || '/Gallery/Details/') + id;
        window.location.href = detailsUrl;
    }

    async toggleLike(projectId, buttonElement) {
        try {
            const likeUrl = (window.galleryUrls?.like || '/Gallery/Like/') + projectId;
            
            const response = await fetch(likeUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'RequestVerificationToken': this.getAntiForgeryToken()
                }
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const result = await response.json();

            if (result.success) {
                const likeCountSpan = buttonElement.querySelector('.like-count');
                const heartPath = buttonElement.querySelector('svg path');

                if (likeCountSpan) {
                    likeCountSpan.textContent = result.count || result.likeCount || result.likesCount || 0;
                }

                if (result.liked) {
                    buttonElement.classList.add('liked');
                    if (heartPath) heartPath.setAttribute('fill', 'currentColor');
                } else {
                    buttonElement.classList.remove('liked');
                    if (heartPath) heartPath.setAttribute('fill', 'none');
                }
            } else {
                this.showMessage('Error: ' + (result.message || 'Unknown error'), 'error');
            }
        } catch (error) {
            console.error('Like error:', error);
            this.showMessage('Failed to like project: ' + error.message, 'error');
        }
    }

    // Comment functionality
    showCommentModal(projectId, projectName) {
        this.currentProjectId = projectId;
        document.getElementById('commentModalTitle').textContent = `Comment on "${projectName}"`;
        document.getElementById('commentText').value = '';
        document.getElementById('commentMessage').innerHTML = '';
        document.getElementById('commentModal').style.display = 'flex';
    }

    closeCommentModal() {
        document.getElementById('commentModal').style.display = 'none';
        this.currentProjectId = null;
    }

    async submitComment() {
        if (!this.currentProjectId) return;

        const commentText = document.getElementById('commentText').value.trim();
        const messageDiv = document.getElementById('commentMessage');

        if (!commentText) {
            messageDiv.innerHTML = '<div style="color: #ef4444;">Please enter a comment</div>';
            return;
        }

        try {
            const addCommentUrl = window.galleryUrls?.addComment || '/Gallery/AddComment';
            
            const response = await fetch(addCommentUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'RequestVerificationToken': this.getAntiForgeryToken()
                },
                body: `projectId=${this.currentProjectId}&content=${encodeURIComponent(commentText)}`
            });

            const result = await response.json();

            if (result.success) {
                messageDiv.innerHTML = '<div style="color: #22c55e;">Comment added successfully!</div>';
                setTimeout(() => {
                    this.closeCommentModal();
                    location.reload(); // Refresh to show new comment count
                }, 1000);
            } else {
                messageDiv.innerHTML = `<div style="color: #ef4444;">Error: ${result.message}</div>`;
            }
        } catch (error) {
            console.error('Comment error:', error);
            messageDiv.innerHTML = '<div style="color: #ef4444;">Failed to add comment</div>';
        }
    }

    getAntiForgeryToken() {
        return document.querySelector('input[name="__RequestVerificationToken"]')?.value || '';
    }

    showMessage(message, type = 'info') {
        alert(message);
    }
}

const gallery = new Gallery();

// Global functions for onclick handlers
window.viewProject = (id) => gallery.viewProject(id);
window.toggleLike = (projectId, buttonElement) => gallery.toggleLike(projectId, buttonElement);
window.showCommentModal = (projectId, projectName) => gallery.showCommentModal(projectId, projectName);
window.closeCommentModal = () => gallery.closeCommentModal();
window.submitComment = () => gallery.submitComment();