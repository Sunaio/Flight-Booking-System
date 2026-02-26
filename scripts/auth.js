// Auth

//Placeholder codes for now
document.addEventListener('DOMContentLoaded', function() {
    const loginBtn = document.querySelector('.auth-login-btn');
    if (loginBtn) {
        loginBtn.addEventListener('click', function(e) {
            e.preventDefault();
            window.location.href = 'dashboard.html'; // Redirect to flight search page after login
        });
    }
});

document.addEventListener('DOMContentLoaded', function() {
    const registerBtn = document.querySelector('.auth-register-btn');
    if (registerBtn) {
        registerBtn.addEventListener('click', function(e) {
            e.preventDefault();
            window.location.href = 'login.html'; // Redirect to login page after registration
        });
    }
});