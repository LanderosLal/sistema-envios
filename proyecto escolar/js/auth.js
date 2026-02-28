document.getElementById('loginForm').addEventListener('submit', function(e) {
    e.preventDefault();
    
    const user = document.getElementById('usuario').value;
    const pass = document.getElementById('password').value;
    const errorMsg = document.getElementById('errorMsg');

    // USUARIOS 
    if ((user === 'admin' && pass === '123') || (user === 'cliente' && pass === '123')) {
        //guardadr
        localStorage.setItem('sesionActiva', user);
        // inicio
        window.location.href = 'panel.html';
    } else {
        errorMsg.textContent = "Usuario o contraseña incorrectos.";
        errorMsg.style.display = "block";
    }
});