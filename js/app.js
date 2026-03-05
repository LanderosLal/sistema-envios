// Supabase y EmailJS
const supabaseUrl = 'https://hrmbdbahdeejyeeabhqf.supabase.co';
const supabaseKey = 'sb_publishable_MHeGOyNENDR0b9zTMK4mdg_KHOShFE6';
const supabaseApp = window.supabase.createClient(supabaseUrl, supabaseKey);
emailjs.init("wXGyAegA4Po2L9AIA");

// Mapa (Leaflet)
const map = L.map('map').setView([23.6345, -102.5528], 5); // Centrado en México por defecto
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors'
}).addTo(map);

let markers = [];
let routeLine;
let distanciaCalculada = 0;
let totalPagar = 0;

// coordenadas (Geocoding con Nominatim API)
async function getCoordinates(city) {
    const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${city}`);
    const data = await response.json();
    return data.length > 0 ? [parseFloat(data[0].lat), parseFloat(data[0].lon)] : null;
}
// BOTONES

document.getElementById('btn-origen').addEventListener('click', async () => {
    const origen = document.getElementById('origen').value;
    if (!origen) return alert("Por favor, ingresa una dirección de origen primero.");
    
    // Usamos la función que ya teníamos para buscar las coordenadas
    const coord = await getCoordinates(origen);
    
    if (coord) {
        // Hacemos zoom a la ubicación 
        map.setView(coord, 15); 
        // Ponemos un marcador temporal
        L.marker(coord).addTo(map).bindPopup("📍 Origen: " + origen).openPopup();
    } else {
        alert("No encontramos esa ubicación. Intenta agregar la ciudad o el estado.");
    }
});

document.getElementById('btn-destino').addEventListener('click', async () => {
    const destino = document.getElementById('destino').value;
    if (!destino) return alert("Por favor, ingresa una dirección de destino primero.");
    
    const coord = await getCoordinates(destino);
    
    if (coord) {
        map.setView(coord, 15); 
        L.marker(coord).addTo(map).bindPopup("📍 Destino: " + destino).openPopup();
    } else {
        alert("No encontramos esa ubicación. Intenta agregar la ciudad o el estado.");
    }
});
// Calcular Ruta y Precio
document.getElementById('calc-route-btn').addEventListener('click', async () => {
    const origen = document.getElementById('origen').value;
    const destino = document.getElementById('destino').value;

    if(!origen || !destino) return alert("Ingresa origen y destino");

    const coordOrigen = await getCoordinates(origen);
    const coordDestino = await getCoordinates(destino);

    if(coordOrigen && coordDestino) {
        // Limpiar mapa
        markers.forEach(m => map.removeLayer(m));
        if(routeLine) map.removeLayer(routeLine);
        markers = [];

        // Poner marcadores
        markers.push(L.marker(coordOrigen).addTo(map).bindPopup("Origen"));
        markers.push(L.marker(coordDestino).addTo(map).bindPopup("Destino"));

        // Dibujar línea recta
        routeLine = L.polyline([coordOrigen, coordDestino], {color: 'blue'}).addTo(map);
        map.fitBounds(routeLine.getBounds());

        // Calcular distancia aproximada
        const puntoA = L.latLng(coordOrigen);
        const puntoB = L.latLng(coordDestino);
        distanciaCalculada = (puntoA.distanceTo(puntoB) / 1000).toFixed(2); // De metros a km
        
        // Lógica de precio 
        if(distanciaCalculada <= 20) {
            totalPagar = 70;
        } else {
            // 
            let kmExtra = distanciaCalculada - 20;
            totalPagar = 70 + (kmExtra * 2.5); // $2.5 pesos por km extra
        }

        document.getElementById('distancia-txt').innerText = `${distanciaCalculada} km`;
        document.getElementById('total-txt').innerText = `$${totalPagar.toFixed(2)} MXN`;

    } else {
        alert("No se encontraron las ciudades.");
    }
});

//Guardar en Supabase y Enviar Guía
document.getElementById('confirm-envio-btn').addEventListener('click', async () => {
    const destinatario = document.getElementById('destinatario').value;
    const peso = document.getElementById('peso').value;
    const tipo = document.getElementById('tipo-paquete').value;
    const origen = document.getElementById('origen').value;
    const destino = document.getElementById('destino').value;

    if(!destinatario || distanciaCalculada === 0) return alert("Completa los datos y calcula la ruta.");

    // Obtener usuario actual
    const { data: { user } } = await supabaseApp.auth.getUser();

    // Guardar en tabla
    const { data, error } = await supabaseApp

        .from('envios')
        .insert([{ 
            user_id: user.id, 
            destinatario, 
            peso, 
            tipo, 
            ruta: `${origen} -> ${destino}`, 
            distancia: distanciaCalculada, 
            costo: totalPagar 
        }]);

    if (!error) {
        alert("Envío guardado correctamente.");
        
        // Enviar correo de la guía
        emailjs.send("service_rj3o44c", "template_am1l238", {
            to_email: user.email,
            destinatario: destinatario,
            ruta: `${origen} a ${destino}`,
            costo: totalPagar.toFixed(2),
            guia_id: Math.floor(Math.random() * 1000000)
        });

        cargarHistorial(); // Refrescar tabla
    }
});

// HISTORIA
async function cargarHistorial() {
    const { data: { user } } = await supabaseApp.auth.getUser();
    if(!user) return;

    let { data: envios, error } = await supabaseApp.from('envios').select('*').eq('user_id', user.id);
    const tbody = document.getElementById('history-body');
    tbody.innerHTML = '';

    envios.forEach(envio => {
        // Convertimos los datos del envío a texto para pasarlos al botón
        const envioData = encodeURIComponent(JSON.stringify(envio));
        
        tbody.innerHTML += `
            <tr>
                <td>${envio.destinatario}</td>
                <td>${envio.tipo}</td>
                <td>${envio.peso} kg</td>
                <td>${envio.ruta}</td>
                <td>$${envio.costo.toFixed(2)}</td>
                <td>
                    <button class="btn-ver" onclick="abrirGuia('${envioData}')">Ver Guía</button>
                </td>
            </tr>
        `;
    });
}

// QR FALSOOO
const modal = document.getElementById('guia-modal');
const cerrarModalBtn = document.getElementById('cerrar-modal');

window.abrirGuia = function(envioDataString) {
    const envio = JSON.parse(decodeURIComponent(envioDataString));
    
    // Generar un ID de rastreo falso basado en la fecha y el ID
    const trackingId = "LNDS" + new Date(envio.created_at).getTime().toString().slice(-6) + envio.id;

    // Llenar datos en el ticket
    document.getElementById('guia-details').innerHTML = `
        <p><strong>Rastreo:</strong> ${trackingId}</p>
        <p><strong>Destinatario:</strong> ${envio.destinatario}</p>
        <p><strong>Ruta:</strong> ${envio.ruta}</p>
        <p><strong>Distancia:</strong> ${envio.distancia} km</p>
        <p><strong>Paquete:</strong> ${envio.tipo} (${envio.peso} kg)</p>
        <p><strong>Total Pagado:</strong> $${envio.costo.toFixed(2)} MXN</p>
    `;

    // API Gratuita para generar QR aleatorio usando el ID de rastreo
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${trackingId}`;
    document.getElementById('qr-code').src = qrUrl;

    // Mostrar modal
    modal.style.display = "block";
};

cerrarModalBtn.onclick = function() {
    modal.style.display = "none";
};
window.onclick = function(event) {
    if (event.target == modal) {
        modal.style.display = "none";
    }
};

// 8. Generar PDF
document.getElementById('descargar-pdf').addEventListener('click', () => {
    const elemento = document.getElementById('ticket-pdf');
    const opciones = {
        margin:       0.5, // Redujimos el margen para que se vea más centrado
        filename:     'Guia_LandsEnvios.pdf',
        image:        { type: 'jpeg', quality: 0.98 },
        html2canvas:  { 
            scale: 2, 
            scrollY: 0, // ¡Esto elimina el espacio gigante en blanco de arriba!
            useCORS: true // Ayuda a que el código QR siempre cargue bien en el PDF
        },
        jsPDF:        { unit: 'in', format: 'letter', orientation: 'portrait' }
    };

    // Generar y descargar
    html2pdf().set(opciones).from(elemento).save();
});
// Cerrar Sesión
document.getElementById('logout-btn').addEventListener('click', async () => {
    const { error } = await supabaseApp.auth.signOut();
    if (!error) {
        // Redirigir al Login
        window.location.href = 'index.html';
    } else {
        alert("Error al cerrar sesión: " + error.message);
    }
});