class LoadingScreen {
    constructor() {
        this.element = document.getElementById('loadingScreen');
        this.textElement = document.getElementById('loadingText');
        this.isVisible = false;
        this.minDuration = 2000; // Total duration is now 2.5 seconds
    }

    show(text = 'Loading...', variant = '') {
        return new Promise((resolve) => {
            if (!this.element) {
                resolve();
                return;
            }

            const startTime = Date.now();
            this.isVisible = true;

            // Update text
            if (this.textElement) {
                this.textElement.textContent = text;
            }

            // Add variant class if provided
            if (variant) {
                this.element.classList.add(variant);
            }

            // Show loading screen with pure black background
            this.element.classList.add('active');
            
            // Remove any previous fade classes to ensure black background
            this.element.classList.remove('fade-background', 'fade-content', 'fade-out');

            // Resolve after minimum duration
            const elapsed = Date.now() - startTime;
            const remainingTime = Math.max(0, this.minDuration - elapsed);

            setTimeout(() => {
                this.isVisible = false;
                resolve();
            }, remainingTime);
        });
    }

    hide() {
        if (!this.element) return;

        // Add fade-out class for smooth exit animation
        this.element.classList.add('fade-out');
        
        console.log('Starting fade-out animation');
        
        // Remove the loading screen after animation completes
        setTimeout(() => {
            this.element.classList.remove('active', 'fade-background', 'fade-content', 'fade-out');
            
            // Force hide with inline styles as backup
            this.element.style.opacity = '0';
            this.element.style.visibility = 'hidden';
            this.element.style.display = 'none';
            this.element.style.zIndex = '-1';
            
            // Remove variant classes
            this.element.classList.remove('auth');
            
            // Reset text
            if (this.textElement) {
                this.textElement.textContent = 'Loading...';
            }

            this.isVisible = false;
            
            console.log('Loading screen hidden with fade-out animation');
        }, 600); // Match the CSS transition duration
    }

    // Add a method for immediate hiding without animation (if needed)
    hideImmediately() {
        if (!this.element) return;

        // Immediately hide the loading screen without animation
        this.element.classList.remove('active', 'fade-background', 'fade-content', 'fade-out');
        
        // Force hide with inline styles as backup
        this.element.style.opacity = '0';
        this.element.style.visibility = 'hidden';
        this.element.style.display = 'none';
        this.element.style.zIndex = '-1';
        
        // Remove variant classes
        this.element.classList.remove('auth');
        
        // Reset text
        if (this.textElement) {
            this.textElement.textContent = 'Loading...';
        }

        this.isVisible = false;
        
        console.log('Loading screen hidden immediately');
    }

    showAuth(text = 'Authenticating...') {
        return this.show(text, 'auth');
    }

    showSaving(text = 'Saving project...') {
        return this.show(text);
    }

    showLoading(text = 'Loading project...') {
        return this.show(text);
    }
}

// Create singleton instance
export const loadingScreen = new LoadingScreen();

// Add global functions for backward compatibility
window.showLoading = (text) => loadingScreen.show(text);
window.hideLoading = () => loadingScreen.hide();
window.hideLoadingImmediately = () => loadingScreen.hideImmediately();