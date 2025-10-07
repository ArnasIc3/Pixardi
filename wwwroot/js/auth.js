// Robust password visibility toggle — avoids interference and works even if other scripts are present.
document.addEventListener('DOMContentLoaded', function () {
    try {
        console.log('[auth.js] loaded');

        // Debug: log form submissions without preventing them
        document.querySelectorAll('.auth-form form').forEach(form => {
            form.addEventListener('submit', () => {
                console.log('[auth.js] submitting form to', form.getAttribute('action') || window.location.pathname);
            });
        });

        // Password visibility toggle (if toggle buttons exist in the markup)
        document.querySelectorAll('.password-toggle').forEach(btn => {
            btn.addEventListener('click', (ev) => {
                ev.preventDefault();
                ev.stopPropagation();
                const targetSelector = btn.getAttribute('data-target');
                const input = document.querySelector(targetSelector);
                if (!input) return;
                const currentType = input.getAttribute('type') || 'text';
                if (currentType === 'password') {
                    input.setAttribute('type', 'text');
                    btn.setAttribute('aria-pressed', 'true');
                } else {
                    input.setAttribute('type', 'password');
                    btn.setAttribute('aria-pressed', 'false');
                }
                try { input.focus(); } catch { /* no-op */ }
            }, { passive: false });
        });
    } catch (e) {
        console.error('[auth.js] error during init', e);
    }
});