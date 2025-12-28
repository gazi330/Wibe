document.addEventListener('DOMContentLoaded', () => {
    // 1. Initial Load: Check localStorage
    // Default is LIGHT mode if nothing is saved.
    const savedTheme = localStorage.getItem('theme');

    if (savedTheme === 'dark') {
        document.documentElement.setAttribute('data-theme', 'dark');
    } else {
        // Explicitly set to light or just leave attribute empty (if CSS handles default)
        document.documentElement.setAttribute('data-theme', 'light');
    }

    // 2. Logic for Dashboard Sidebar Toggle
    const sidebarToggleBtn = document.getElementById('sidebarThemeToggle');
    if (sidebarToggleBtn) {
        updateSidebarButtonIcon(sidebarToggleBtn);

        sidebarToggleBtn.addEventListener('click', (e) => {
            e.preventDefault(); // Prevent link behavior if it's an <a> tag

            const currentTheme = document.documentElement.getAttribute('data-theme');
            let newTheme = 'light';

            if (currentTheme !== 'dark') {
                newTheme = 'dark';
            }

            document.documentElement.setAttribute('data-theme', newTheme);
            localStorage.setItem('theme', newTheme);

            updateSidebarButtonIcon(sidebarToggleBtn);
        });
    }

    function updateSidebarButtonIcon(btn) {
        const iconInfo = btn.querySelector('.theme-text');
        const icon = btn.querySelector('i');
        const isDark = document.documentElement.getAttribute('data-theme') === 'dark';

        if (icon) {
            icon.className = isDark ? 'fas fa-sun' : 'fas fa-moon';
        }

        if (iconInfo) {
            iconInfo.textContent = isDark ? 'Gündüz Modu' : 'Gece Modu';
        }
    }
});
