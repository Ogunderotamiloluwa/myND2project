// This function handles the mobile menu toggle
const mobileMenuToggle = document.getElementById('mobileMenuToggle');
const mobileNav = document.getElementById('mobileNav');
const body = document.body;

function toggleMobileMenu() {
    mobileMenuToggle.classList.toggle('active');
    mobileNav.classList.toggle('active');
    body.classList.toggle('mobile-menu-open');
}

// Attach the event listener to the toggle button
mobileMenuToggle.addEventListener('click', toggleMobileMenu);

// Function to close the menu, used in the HTML onclick attributes
function closeMobileMenu() {
    mobileMenuToggle.classList.remove('active');
    mobileNav.classList.remove('active');
    body.classList.remove('mobile-menu-open');
}

// Expose the function to the global scope so it can be called from HTML
window.closeMobileMenu = closeMobileMenu;