// Supabase y EmailJS
const supabaseUrl = 'https://hrmbdbahdeejyeeabhqf.supabase.co';
const supabaseKey = 'sb_publishable_MHeGOyNENDR0b9zTMK4mdg_KHOShFE6';
const supabaseApp = window.supabase.createClient(supabaseUrl, supabaseKey);

emailjs.init("wXGyAegA4Po2L9AIA");

document.getElementById('register-btn').addEventListener('click', async () => {
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const msg = document.getElementById('auth-message');

    if(!email || !password) return msg.innerText = "Llena todos los campos";

    const { data, error } = await supabaseApp.auth.signUp({ email, password });
    
    if (error) {
        msg.innerText = error.message;
    } else {
        msg.style.color = "green";
        msg.innerText = "Cuenta creada. Revisa tu correo.";
        // Enviar correo de confirmación con EmailJS
        emailjs.send("service_va4obtv", "template_9fnc3fc", {
            to_email: email,
        message: "Gracias por registrarte en nuestra plataforma de envíos."
        });
    }
});

document.getElementById('auth-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const msg = document.getElementById('auth-message');

    const { data, error } = await supabaseApp.auth.signInWithPassword({ email, password });

    if (error) {
        msg.innerText = "Error: " + error.message;
    } else {
        window.location.href = "principal.html"; // Redirigir a la app
    }
});