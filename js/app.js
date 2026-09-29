// app.js - Lógica principal de la aplicación

// Registrar Service Worker
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('sw.js').catch(err => {
    console.log('Service Worker no registrado:', err);
  });
}

// Variables globales
let piezas = [];
let sesiones = [];

// IndexedDB
const DB_NAME = 'pianoDB';
const DB_VERSION = 1;
const STORE_PIEZAS = 'piezas';
const STORE_SESIONES = 'sesiones';

let db = null;

// Inicializar IndexedDB
function inicializarDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      db = request.result;
      resolve(db);
    };

    request.onupgradeneeded = (event) => {
      const database = event.target.result;
      if (!database.objectStoreNames.contains(STORE_PIEZAS)) {
        database.createObjectStore(STORE_PIEZAS, { keyPath: 'id' });
      }
      if (!database.objectStoreNames.contains(STORE_SESIONES)) {
        database.createObjectStore(STORE_SESIONES, { keyPath: 'id' });
      }
    };
  });
}

// Funciones de Base de Datos
async function obtenerPiezasDB() {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_PIEZAS], 'readonly');
    const store = transaction.objectStore(STORE_PIEZAS);
    const request = store.getAll();

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
  });
}

async function obtenerPiezaDB(id) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_PIEZAS], 'readonly');
    const store = transaction.objectStore(STORE_PIEZAS);
    const request = store.get(id);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
  });
}

async function guardarPiezaDB(pieza) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_PIEZAS], 'readwrite');
    const store = transaction.objectStore(STORE_PIEZAS);
    const request = store.put(pieza);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
  });
}

async function eliminarPiezaDB(id) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_PIEZAS], 'readwrite');
    const store = transaction.objectStore(STORE_PIEZAS);
    const request = store.delete(id);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
  });
}

async function obtenerSesionesDB() {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_SESIONES], 'readonly');
    const store = transaction.objectStore(STORE_SESIONES);
    const request = store.getAll();

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
  });
}

async function guardarSesionDB(sesion) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_SESIONES], 'readwrite');
    const store = transaction.objectStore(STORE_SESIONES);
    const request = store.put(sesion);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
  });
}

async function eliminarSesionDB(id) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_SESIONES], 'readwrite');
    const store = transaction.objectStore(STORE_SESIONES);
    const request = store.delete(id);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
  });
}

// Exportar datos a JSON
async function exportarDatos() {
  try {
    const piezas = await obtenerPiezasDB();
    const sesiones = await obtenerSesionesDB();

    const datos = {
      piezas,
      sesiones,
      fechaExportacion: new Date().toISOString()
    };

    const json = JSON.stringify(datos, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `piano-datos-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);

  } catch (error) {
    console.error('Error al exportar:', error);
    alert('Error al exportar datos');
  }
}

// Importar datos desde JSON
async function importarDatos(event) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = async (e) => {
    try {
      const datos = JSON.parse(e.target.result);

      if (!datos.piezas || !datos.sesiones) {
        alert('Archivo JSON inválido');
        return;
      }

      // Guardar piezas
      for (const pieza of datos.piezas) {
        await guardarPiezaDB(pieza);
      }

      // Guardar sesiones
      for (const sesion of datos.sesiones) {
        await guardarSesionDB(sesion);
      }

      alert('Datos importados correctamente');
      location.reload();

    } catch (error) {
      console.error('Error al importar:', error);
      alert('Error al importar datos');
    }
  };

  reader.readAsText(file);
}

// Inicializar aplicación
document.addEventListener('DOMContentLoaded', async () => {
  try {
    await inicializarDB();
    
    // Detectar si estamos en vista lista o detalle
    const params = new URLSearchParams(window.location.search);
    const vista = params.get('vista');
    const id = params.get('id');

    if (vista === 'nueva') {
      // Mostrar formulario de nueva pieza
      mostrarFormularioNuevaPieza();
    } else if (id) {
      // Mostrar detalle de pieza
      mostrarDetallePieza(id);
    } else {
      // Mostrar listado de piezas
      mostrarListadoPiezas();
    }

    // Configurar botones de exportar/importar
    const btnExportar = document.getElementById('btnExportar');
    const btnImportar = document.getElementById('btnImportar');
    const inputImportar = document.getElementById('inputImportar');

    if (btnExportar) {
      btnExportar.addEventListener('click', exportarDatos);
    }

    if (btnImportar) {
      btnImportar.addEventListener('click', () => {
        inputImportar.click();
      });
    }

    if (inputImportar) {
      inputImportar.addEventListener('change', importarDatos);
    }

  } catch (error) {
    console.error('Error al inicializar:', error);
  }
});

// Mostrar listado de piezas
async function mostrarListadoPiezas() {
  const vistaLista = document.getElementById('vistalista');
  const vistaDetalle = document.getElementById('vistaDetalle');

  if (vistaLista) vistaLista.style.display = 'block';
  if (vistaDetalle) vistaDetalle.style.display = 'none';

  try {
    // Obtener piezas y sesiones frescas de la BD
    piezas = await obtenerPiezasDB();
    const sesiones = await obtenerSesionesDB();
    const listaPiezas = document.getElementById('listaPiezas');
    const mensajeSinPiezas = document.getElementById('mensajeSinPiezas');

    if (!listaPiezas) return;

    // Ordenar por última sesión
    piezas.sort((a, b) => {
      const ultimaSesionA = sesiones
        .filter(s => s.pieceId === a.id)
        .sort((x, y) => new Date(y.fecha) - new Date(x.fecha))[0];
      const ultimaSesionB = sesiones
        .filter(s => s.pieceId === b.id)
        .sort((x, y) => new Date(y.fecha) - new Date(x.fecha))[0];

      const fechaA = ultimaSesionA ? new Date(ultimaSesionA.fecha) : new Date(a.fechaInicio || 0);
      const fechaB = ultimaSesionB ? new Date(ultimaSesionB.fecha) : new Date(b.fechaInicio || 0);

      return fechaB - fechaA;
    });

    // Limpiar listado
    listaPiezas.innerHTML = '';

    if (piezas.length === 0) {
      if (mensajeSinPiezas) mensajeSinPiezas.style.display = 'block';
      return;
    }

    if (mensajeSinPiezas) mensajeSinPiezas.style.display = 'none';

    // Crear tarjetas de piezas
    piezas.forEach(pieza => {
      const tiempoTotal = sesiones
        .filter(s => s.pieceId === pieza.id)
        .reduce((sum, s) => sum + (s.tiempo || 0), 0);

      const tiempoFormato = formatearTiempo(tiempoTotal);

      const card = document.createElement('div');
      card.className = 'pieza-card';
      card.innerHTML = `
        <div class="pieza-info-contenedor">
          <div class="pieza-titulo">${pieza.titulo || 'Sin título'}</div>
          ${pieza.compositor ? `<div class="pieza-compositor">${pieza.compositor}</div>` : ''}
          <div class="pieza-info">
            ${pieza.tonalidad ? `<strong>${pieza.tonalidad}</strong>` : ''}
            ${pieza.tonalidad && pieza.compas ? ' | ' : ''}
            ${pieza.compas ? `${pieza.compas}` : ''}
          </div>
          <div class="pieza-tiempo">Tiempo: ${tiempoFormato}</div>
        </div>
        <div class="pieza-acciones">
          <a href="index.html?id=${pieza.id}" class="btn-abrir">Abrir</a>
          <button class="btn-eliminar" data-id="${pieza.id}">Eliminar</button>
        </div>
      `;
      listaPiezas.appendChild(card);
    });

    // Event listeners para eliminar
    document.querySelectorAll('.btn-eliminar').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.preventDefault();
        const id = e.target.dataset.id;
        if (confirm('¿Eliminar esta pieza?')) {
          await eliminarPiezaDB(id);
          // Recargar el listado después de eliminar
          await mostrarListadoPiezas();
        }
      });
    });

  } catch (error) {
    console.error('Error al mostrar listado:', error);
    alert('Error al cargar el listado de piezas');
  }
}

// Mostrar formulario de nueva pieza
function mostrarFormularioNuevaPieza() {
  const vistaLista = document.getElementById('vistalista');
  const vistaDetalle = document.getElementById('vistaDetalle');

  if (vistaLista) vistaLista.style.display = 'none';
  if (vistaDetalle) vistaDetalle.style.display = 'block';

  // Limpiar formulario
  document.getElementById('pTitulo').value = '';
  document.getElementById('pCompositor').value = '';
  document.getElementById('pTonalidad').value = '';
  document.getElementById('pCompas').value = '';
  document.getElementById('pExtension').value = '';
  document.getElementById('pFechaInicio').value = new Date().toISOString().split('T')[0];
  document.getElementById('pEstructura').value = '';
  document.getElementById('pPuntosDificiles').value = '';
  document.getElementById('pAcompanamiento').value = '';

  // Limpiar otras secciones
  document.getElementById('listaFragmentos').innerHTML = '';
  document.getElementById('listaSesiones').innerHTML = '';
  document.getElementById('tiempoTotalPieza').textContent = '0h 0m 0s';
  document.getElementById('tituloPieza').textContent = 'Nueva pieza';

  // Ocultar informe
  document.getElementById('vistaInforme').style.display = 'none';
  document.querySelector('[data-vista="informe"]').classList.remove('activo');

  // Configurar evento guardar
  const btnGuardar = document.getElementById('btnGuardarPieza');
  if (btnGuardar) {
    btnGuardar.onclick = guardarNuevaPieza;
  }
}

// Guardar nueva pieza
async function guardarNuevaPieza() {
  const titulo = document.getElementById('pTitulo').value.trim();
  if (!titulo) {
    alert('Por favor ingresa un título');
    return;
  }

  try {
    const pieza = {
      id: Date.now().toString(),
      titulo,
      compositor: document.getElementById('pCompositor').value,
      tonalidad: document.getElementById('pTonalidad').value,
      compas: document.getElementById('pCompas').value,
      extension: document.getElementById('pExtension').value,
      fechaInicio: document.getElementById('pFechaInicio').value,
      estructura: document.getElementById('pEstructura').value,
      puntosDificiles: document.getElementById('pPuntosDificiles').value,
      acompanamiento: document.getElementById('pAcompanamiento').value,
      fragmentos: []
    };

    await guardarPiezaDB(pieza);
    alert('Pieza creada correctamente');
    
    // Redirigir a la pieza
    window.location.href = `index.html?id=${pieza.id}`;

  } catch (error) {
    console.error('Error al guardar pieza:', error);
    alert('Error al guardar pieza');
  }
}

// Mostrar detalle de pieza
async function mostrarDetallePieza(id) {
  const vistaLista = document.getElementById('vistalista');
  const vistaDetalle = document.getElementById('vistaDetalle');

  if (vistaLista) vistaLista.style.display = 'none';
  if (vistaDetalle) vistaDetalle.style.display = 'block';

  try {
    const pieza = await obtenerPiezaDB(id);
    if (!pieza) {
      alert('Pieza no encontrada');
      window.location.href = 'index.html';
      return;
    }

    // Los campos se cargarán en detalle.js mediante cargarPieza()
    // Aquí solo necesitamos asegurar que la vista detalle está visible

  } catch (error) {
    console.error('Error al mostrar detalle:', error);
  }
}

// Función auxiliar para formatear tiempo
function formatearTiempo(segundos) {
  if (!segundos || segundos === 0) return '0h 0m 0s';
  
  const horas = Math.floor(segundos / 3600);
  const minutos = Math.floor((segundos % 3600) / 60);
  const segs = segundos % 60;
  
  return `${horas}h ${minutos}m ${segs}s`;
}
