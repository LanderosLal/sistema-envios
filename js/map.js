// CONFIGURACIÓN DEL MAPA
var map = L.map('map').setView([25.6866, -100.3161], 12);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '© OpenStreetMap' }).addTo(map);

let marcadorOrigen = null;
let marcadorDestino = null;

document.addEventListener('DOMContentLoaded', cargarHistorial);

// 2. BÚSQUEDA (PHOTON API)
async function buscarDireccion(tipo) {
    const inputId = (tipo === 'origen') ? 'txtOrigen' : 'txtDestino';
    const busqueda = document.getElementById(inputId).value;
    if (!busqueda) return alert("⚠️ Escribe una dirección primero.");

    const query = encodeURIComponent(busqueda);
    const url = `https://photon.komoot.io/api/?q=${query}&limit=1`;

    try {
        const respuesta = await fetch(url);
        const datos = await respuesta.json();
        if (datos.features && datos.features.length > 0) {
            const coords = datos.features[0].geometry.coordinates;
            const latlng = [coords[1], coords[0]]; 
            map.setView(latlng, 15);
            colocarMarcador(latlng, tipo);
        } else {
            alert("❌ No encontramos esa dirección.");
        }
    } catch (error) {
        alert("Error de conexión al buscar.");
    }
}

// 3. EVENTOS DEL MAPA
map.on('click', function(e) {
    if (!marcadorOrigen) {
        colocarMarcador(e.latlng, 'origen');
        document.getElementById('txtOrigen').value = `${e.latlng.lat.toFixed(4)}, ${e.latlng.lng.toFixed(4)}`;
    } else if (!marcadorDestino) {
        colocarMarcador(e.latlng, 'destino');
        document.getElementById('txtDestino').value = `${e.latlng.lat.toFixed(4)}, ${e.latlng.lng.toFixed(4)}`;
    } else {
        reiniciarMapa();
        colocarMarcador(e.latlng, 'origen');
        document.getElementById('txtOrigen').value = `${e.latlng.lat.toFixed(4)}, ${e.latlng.lng.toFixed(4)}`;
    }
});

function colocarMarcador(latlng, tipo) {
    if (tipo === 'origen') {
        if (marcadorOrigen) map.removeLayer(marcadorOrigen);
        marcadorOrigen = L.marker(latlng).addTo(map).bindPopup("📍 Origen").openPopup();
    } else {
        if (marcadorDestino) map.removeLayer(marcadorDestino);
        marcadorDestino = L.marker(latlng, {icon: iconoRojo()}).addTo(map).bindPopup("🏁 Destino").openPopup();
        calcularTarifa();
    }
}

function reiniciarMapa() {
    map.eachLayer((layer) => { if (layer instanceof L.Marker || layer instanceof L.Polyline) map.removeLayer(layer); });
    marcadorOrigen = null;
    marcadorDestino = null;
    document.getElementById('lblDistancia').innerText = "0 km";
    document.getElementById('lblCostoTotal').innerText = "$0";
    document.getElementById('txtDistancia').value = "";
    document.getElementById('txtCosto').value = "";
}

// 4. LÓGICA DE TARIFAS
function calcularTarifa() {
    if (marcadorOrigen && marcadorDestino) {
        const distMetros = marcadorOrigen.getLatLng().distanceTo(marcadorDestino.getLatLng());
        const distKm = parseFloat((distMetros / 1000).toFixed(2));
        
        let costoDistancia = 0;
        if (distKm <= 2.0) costoDistancia = 70;
        else if (distKm <= 10.0) costoDistancia = 100;
        else if (distKm <= 50.0) costoDistancia = 100 + ((distKm - 2) * (100 / 48));
        else costoDistancia = 200 + ((distKm - 50) * 15);

        const peso = document.getElementById('selPeso').value;
        let costoPeso = 0;
        if (peso === 'mediano') costoPeso = 30;
        if (peso === 'grande') costoPeso = 70;
        if (peso === 'extragrande') costoPeso = 120;

        const costoTotal = Math.round(costoDistancia + costoPeso);

        document.getElementById('lblDistancia').innerText = distKm + " km";
        document.getElementById('lblCostoTotal').innerText = "$" + costoTotal;
        document.getElementById('txtDistancia').value = distKm;
        document.getElementById('txtCosto').value = costoTotal;
        
        L.polyline([marcadorOrigen.getLatLng(), marcadorDestino.getLatLng()], {color: '#111', weight: 3}).addTo(map);
    }
}

// ==========================================
// 5. GENERAR GUÍA Y GUARDAR
// ==========================================
function generarGuia() {
    const nombre = document.getElementById('txtNombre').value;
    const telefono = document.getElementById('txtTelefono').value;
    const correo = document.getElementById('txtCorreo').value;
    const origen = document.getElementById('txtOrigen').value;
    const destino = document.getElementById('txtDestino').value;
    const costo = document.getElementById('txtCosto').value;

    if (!nombre || !telefono || !correo) return alert("⚠️ Llena nombre, teléfono y correo.");
    if (!costo) return alert("⚠️ Cotiza la ruta en el mapa.");

    let contador = localStorage.getItem('contadorGuias') || 0;
    contador = parseInt(contador) + 1;
    localStorage.setItem('contadorGuias', contador);
    const idGuia = String(contador).padStart(3, '0');

    const nuevaGuia = {
        id: idGuia, nombre: nombre, telefono: telefono, correo: correo,
        origen: origen, destino: destino, costo: "$" + costo, fecha: new Date().toLocaleDateString()
    };

    let historial = JSON.parse(localStorage.getItem('misGuias')) || [];
    historial.unshift(nuevaGuia);
    localStorage.setItem('misGuias', JSON.stringify(historial));

    cargarHistorial();
    
    // Le pasamos "true" porque es una guía NUEVA (para que envíe el correo)
    mostrarModalEtiqueta(nuevaGuia, true);
    enviarCorreoElectronico(nuevaGuia);

    document.getElementById('txtNombre').value = "";
    document.getElementById('txtTelefono').value = "";
    document.getElementById('txtCorreo').value = "";
}

// ==========================================
// 6. HISTORIAL Y VISUALIZACIÓN
// ==========================================
function cargarHistorial() {
    const lista = document.getElementById('listaGuias');
    if (!lista) return;
    lista.innerHTML = "";
    const historial = JSON.parse(localStorage.getItem('misGuias')) || [];
    historial.forEach(guia => {
        const nombreCorto = guia.nombre.length > 15 ? guia.nombre.substring(0, 15) + "..." : guia.nombre;
        
        // Aquí agregamos el botón de "Ver"
        lista.innerHTML += `
            <tr>
                <td><strong>#${guia.id}</strong></td>
                <td title="${guia.nombre}">${nombreCorto}</td>
                <td><button class="btn-ver" onclick="verGuia('${guia.id}')">👁️ Ver</button></td>
            </tr>`;
    });
}

function verGuia(id) {
    const historial = JSON.parse(localStorage.getItem('misGuias')) || [];
    const guiaBuscada = historial.find(g => g.id === id);
    if (guiaBuscada) {
        // Le pasamos "false" para que NO intente mandar correo, solo muestre el ticket
        mostrarModalEtiqueta(guiaBuscada, false);
    }
}

// ==========================================
// 7. ETIQUETA MODAL Y EMAILJS
// ==========================================
function mostrarModalEtiqueta(guia, esNueva) {
    document.getElementById('lblGuiaID').innerText = "GUÍA #" + guia.id;
    document.getElementById('lblNombreModal').innerText = guia.nombre.toUpperCase();
    document.getElementById('lblTelModal').innerText = guia.telefono;
    document.getElementById('lblOrigenModal').innerText = guia.origen.substring(0, 20);
    document.getElementById('lblDestinoModal').innerText = guia.destino.substring(0, 20);
    document.getElementById('lblCostoModal').innerText = guia.costo;
    
    const datosQR = `Guia:${guia.id} | Para:${guia.nombre}`;
    document.getElementById('imgQR').src = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(datosQR)}&color=000000`;

    // Si solo la estamos viendo, escondemos el mensaje de correo
    if (!esNueva) {
        document.getElementById('txtMensajeCorreo').innerText = "";
    }

    document.getElementById('miModal').style.display = "flex";
}

function cerrarModal() { document.getElementById('miModal').style.display = "none"; }

function enviarCorreoElectronico(guia) {
    document.getElementById('txtMensajeCorreo').innerText = "⏳ Enviando correo a " + guia.correo + "...";
    document.getElementById('txtMensajeCorreo').style.color = "#d35400";

    const parametros = { to_name: guia.nombre, to_email: guia.correo, guia_id: guia.id, costo: guia.costo, origen: guia.origen, destino: guia.destino };

    emailjs.send("service_rj3o44c", "template_am1l238", parametros)
        .then(function(response) {
            document.getElementById('txtMensajeCorreo').innerText = "✅ ¡Correo enviado exitosamente!";
            document.getElementById('txtMensajeCorreo').style.color = "green";
        }, function(error) {
            document.getElementById('txtMensajeCorreo').innerText = "❌ Error al enviar el correo.";
            document.getElementById('txtMensajeCorreo').style.color = "red";
        });
}

// ==========================================
// 8. BASE DE DATOS LOCAL (EXPORTAR / LIMPIAR)
// ==========================================
function descargarBaseDatos() {
    const historial = localStorage.getItem('misGuias');
    if (!historial || historial === "[]") {
        return alert("⚠️ La base de datos está vacía. Crea una guía primero.");
    }
    
    // Crear un archivo de texto virtual
    const blob = new Blob([historial], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    
    // Crear un enlace invisible y forzar el clic para descargar
    const a = document.createElement("a");
    a.href = url;
    a.download = "base_de_datos_landeros.json";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
}

function borrarBaseDatos() {
    if (confirm("🚨 ¿ESTÁS SEGURO?\nEsto borrará todas las guías de la base de datos local y reiniciará el contador. Esta acción no se puede deshacer.")) {
        localStorage.clear();
        cargarHistorial();
        alert("✅ Base de datos limpiada correctamente.");
    }
}

// Utilidad Mapa
function iconoRojo() {
    return new L.Icon({
        iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
        iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41]
    });
}