// Robust password visibility toggle — avoids interference and works even if other scripts are present.
document.addEventListener('DOMContentLoaded', function () {
    document.querySelectorAll('.password-toggle').forEach(btn => {
        btn.addEventListener('click', (ev) => {
            ev.preventDefault();
            ev.stopPropagation();
            const targetSelector = btn.getAttribute('data-target');
            const input = document.querySelector(targetSelector);
            if (!input) return;
            // ensure correct type toggling
            const currentType = input.getAttribute('type') || 'text';
            if (currentType === 'password') {
                input.setAttribute('type', 'text');
                btn.setAttribute('aria-pressed', 'true');
            } else {
                input.setAttribute('type', 'password');
                btn.setAttribute('aria-pressed', 'false');
            }
            // keep focus on input after toggle
            try { input.focus(); } catch (e) { /* ignore */ }
        }, { passive: false });
    });
});