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

    // Generate pixel art previews
    generatePreviews() {
        console.log('Generating previews...');
        const previews = document.querySelectorAll('.pixel-canvas-preview');
        console.log(`Found ${previews.length} previews to generate`);
        
        previews.forEach(preview => {
            try {
                const canvasDataRaw = preview.dataset.canvas || '{}';
                console.log('Canvas data raw:', canvasDataRaw);
                
                const canvasData = JSON.parse(canvasDataRaw);
                const width = parseInt(preview.dataset.width) || 16;
                const height = parseInt(preview.dataset.height) || 16;
                
                console.log(`Generating preview ${width}x${height}`, canvasData);
                this.generatePreview(preview, canvasData, width, height);
            } catch (error) {
                console.error('Error parsing canvas data:', error);
                this.showPreviewError(preview);
            }
        });
    }

    generatePreview(container, canvasData, width, height) {
        try {
            // Clear any existing content
            container.innerHTML = '';

            // Calculate optimal size for preview - make it fit the container
            const containerRect = container.getBoundingClientRect();
            const maxWidth = containerRect.width || 200;
            const maxHeight = containerRect.height || 200;
            
            const pixelSize = Math.max(1, Math.min(
                Math.floor(maxWidth / width),
                Math.floor(maxHeight / height)
            ));
            
            const previewWidth = width * pixelSize;
            const previewHeight = height * pixelSize;

            // Set container size and display
            container.style.width = '100%';
            container.style.height = '100%';
            container.style.display = 'flex';
            container.style.alignItems = 'center';
            container.style.justifyContent = 'center';
            container.style.imageRendering = 'pixelated';

            // Create preview grid
            const previewGrid = document.createElement('div');
            previewGrid.style.display = 'grid';
            previewGrid.style.gridTemplateColumns = `repeat(${width}, ${pixelSize}px)`;
            previewGrid.style.gridTemplateRows = `repeat(${height}, ${pixelSize}px)`;
            previewGrid.style.gap = '0';
            previewGrid.style.width = previewWidth + 'px';
            previewGrid.style.height = previewHeight + 'px';

            // Check if canvasData is empty or null
            if (!canvasData || Object.keys(canvasData).length === 0) {
                this.showPreviewError(container, 'No canvas data');
                return;
            }

            // Generate pixels
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
            console.log(`Preview generated successfully: ${width}x${height}`);
            
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

    // Attach event listeners
    attachEventListeners() {
        console.log('Attaching gallery event listeners...');
        
        // Close modal when clicking outside
        document.addEventListener('click', (e) => {
            if (e.target.id === 'commentModal') {
                this.closeCommentModal();
            }
        });

        // Escape key to close modals
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.closeCommentModal();
            }
        });

        // Add click handlers to like buttons
        document.querySelectorAll('.like-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                const projectId = btn.getAttribute('data-project-id');
                if (projectId) {
                    console.log('Like button clicked for project:', projectId);
                    this.toggleLike(projectId, btn);
                }
            });
        });

        console.log('Gallery event listeners attached');
    }

    // View project details
    viewProject(id) {
        // Use the URL base and append the ID
        const detailsUrl = (window.galleryUrls?.details || '/Gallery/Details/') + id;
        window.location.href = detailsUrl;
    }

    // Like functionality
    async toggleLike(projectId, buttonElement) {
        try {
            console.log('Toggling like for project:', projectId);
            const likeUrl = (window.galleryUrls?.like || '/Gallery/Like/') + projectId;
            console.log('Like URL:', likeUrl);
            
            const response = await fetch(likeUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'RequestVerificationToken': this.getAntiForgeryToken()
                }
            });

            console.log('Like response status:', response.status);
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const result = await response.json();
            console.log('Like result:', result);

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
                
                console.log('Like updated successfully');
            } else {
                console.error('Like failed:', result.message);
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

    // Helper methods
    getAntiForgeryToken() {
        const token = document.querySelector('input[name="__RequestVerificationToken"]')?.value;
        console.log('CSRF Token found:', token ? 'Yes' : 'No');
        return token || '';
    }

    showMessage(message, type = 'info') {
        console.log(`${type.toUpperCase()}: ${message}`);
        // You can replace this with a toast notification system later
        alert(message);
    }
}

// Initialize gallery
const gallery = new Gallery();

// Global functions for onclick handlers (needed for inline event handlers)
window.viewProject = (id) => gallery.viewProject(id);
window.toggleLike = (projectId, buttonElement) => gallery.toggleLike(projectId, buttonElement);
window.showCommentModal = (projectId, projectName) => gallery.showCommentModal(projectId, projectName);
window.closeCommentModal = () => gallery.closeCommentModal();
window.submitComment = () => gallery.submitComment();

console.log('Gallery initialized');