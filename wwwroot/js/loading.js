class LoadingScreen {
    constructor() {
        this.element = document.getElementById('loadingScreen');
        this.textElement = document.getElementById('loadingText');
        this.isVisible = false;
        this.minDuration = 1500; // Total duration is now 2.5 seconds
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
            this.element.classList.remove('fade-background', 'fade-content');

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

        // Start the layered fade-out process with exact timing
        this.startFadeOut();
    }

    startFadeOut() {
        // Ensure element stays black for first 2 seconds
        // Step 1: Fade background at exactly 2 seconds
        setTimeout(() => {
            if (this.element && this.element.classList.contains('active')) {
                this.element.classList.add('fade-background');
            }
        }, 2000);

        // Step 2: Fade content at exactly 2.5 seconds
        setTimeout(() => {
            if (this.element && this.element.classList.contains('active')) {
                this.element.classList.add('fade-content');
            }
        }, 2500);

        // Step 3: Completely hide at 3 seconds
        setTimeout(() => {
            if (this.element) {
                this.element.classList.remove('active', 'fade-background', 'fade-content');
                
                // Remove variant classes
                this.element.classList.remove('auth');
                
                // Reset text
                if (this.textElement) {
                    this.textElement.textContent = 'Loading...';
                }

                this.isVisible = false;
            }
        }, 3000);
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