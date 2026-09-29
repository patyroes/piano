// ===== DETALLE.JS =====
// Lógica para la ficha de detalle de cada pieza

document.addEventListener('DOMContentLoaded', async function() {
  const params = new URLSearchParams(window.location.search);
  const piezaId = params.get('id');
  const vista = params.get('vista');

  // Si es nueva pieza, inicializar
  if (!piezaId) {
    inicializarNuevaPieza();
    return;
  }

  // Cargar pieza existente
  await cargarPieza(piezaId);

  // Si vista es 'informe', mostrar informe
  if (vista === 'informe') {
    mostrarVista('informe');
  }
});

// ===== INICIALIZAR NUEVA PIEZA =====
function inicializarNuevaPieza() {
  const formPieza = document.getElementById('formPieza');
  if (formPieza) {
    formPieza.reset();
  }
  
  const tiempoTotal = document.getElementById('tiempoTotal');
  if (tiempoTotal) {
    tiempoTotal.textContent = 'Tiempo total practicado: 0h 0m';
  }

  // Limpiar fragmentos y sesiones
  const listaFragmentos = document.getElementById('listaFragmentos');
  if (listaFragmentos) {
    listaFragmentos.innerHTML = '<p>No hay fragmentos agregados</p>';
  }

  const historial = document.getElementById('historial');
  if (historial) {
    historial.innerHTML = '<p>No hay sesiones registradas</p>';
  }
}

// ===== CARGAR PIEZA EXISTENTE =====
async function cargarPieza(piezaId) {
  try {
    const db = await abrirDB();
    const pieza = await obtenerPieza(db, piezaId);

    if (!pieza) {
      alert('Pieza no encontrada');
      window.location.href = 'index.html';
      return;
    }

    // Llenar formulario con datos de la pieza (usando IDs correctos)
    document.getElementById('pTitulo').value = pieza.titulo || '';
    document.getElementById('pCompositor').value = pieza.compositor || '';
    document.getElementById('pTonalidad').value = pieza.tonalidad || '';
    document.getElementById('pCompas').value = pieza.compas || '';
    document.getElementById('pExtension').value = pieza.extension || '';
    document.getElementById('pFechaInicio').value = pieza.fecha || '';
    document.getElementById('pEstructura').value = pieza.estructura || '';
    document.getElementById('pPuntosDificiles').value = pieza.puntosDificiles || '';
    document.getElementById('pAcompanamiento').value = pieza.acompanamiento || '';

    // Guardar piezaId en variable global para usar en otras funciones
    window.piezaIdActual = piezaId;

    // Cargar fragmentos en el desplegable y lista
    cargarFragmentosEnSelect(db, piezaId);
    mostrarListaFragmentos(db, piezaId);

    // Mostrar tiempo total
    actualizarTiempoTotal(db, piezaId);

    // Cargar historial de sesiones
    mostrarHistorial(piezaId);

    // Configurar evento guardar pieza
    const btnGuardarPieza = document.getElementById('btnGuardarPieza');
    if (btnGuardarPieza) {
      btnGuardarPieza.addEventListener('click', guardarPieza);
    }

    // Configurar evento agregar fragmento
    const btnAgregarFragmento = document.querySelector('[data-accion="agregar-fragmento"]');
    if (btnAgregarFragmento) {
      btnAgregarFragmento.addEventListener('click', agregarFragmento);
    }

  } catch (error) {
    console.error('Error al cargar pieza:', error);
    alert('Error al cargar la pieza');
  }
}

// ===== CARGAR FRAGMENTOS EN SELECT =====
async function cargarFragmentosEnSelect(db, piezaId) {
  try {
    const fragmentos = await obtenerFragmentos(db, piezaId);
    const select = document.getElementById('sFragmento');
    
    if (!select) return;

    // Limpiar opciones previas (excepto la primera)
    while (select.options.length > 1) {
      select.remove(1);
    }

    // Agregar fragmentos
    fragmentos.forEach(fragmento => {
      const option = document.createElement('option');
      option.value = fragmento.id;
      option.textContent = `${fragmento.nombre} (cc. ${fragmento.compases})`;
      select.appendChild(option);
    });

  } catch (error) {
    console.error('Error al cargar fragmentos:', error);
  }
}

// ===== MOSTRAR LISTA DE FRAGMENTOS =====
async function mostrarListaFragmentos(db, piezaId) {
  try {
    const fragmentos = await obtenerFragmentos(db, piezaId);
    const listaDiv = document.getElementById('listaFragmentos');

    if (!listaDiv) return;

    if (fragmentos.length === 0) {
      listaDiv.innerHTML = '<p>No hay fragmentos agregados</p>';
      return;
    }

    let html = '<ul>';
    fragmentos.forEach(fragmento => {
      html += `
        <li>
          <strong>${fragmento.nombre}</strong> (cc. ${fragmento.compases})
          <button onclick="borrarFragmento('${fragmento.id}', '${piezaId}')" class="btn-eliminar">Borrar</button>
        </li>
      `;
    });
    html += '</ul>';

    listaDiv.innerHTML = html;

  } catch (error) {
    console.error('Error al mostrar lista de fragmentos:', error);
  }
}

// ===== AGREGAR FRAGMENTO =====
async function agregarFragmento() {
  const nombreFragmento = document.getElementById('sFNombre').value.trim();
  const compasesFragmento = document.getElementById('sFCompases').value.trim();

  if (!nombreFragmento || !compasesFragmento) {
    alert('Por favor completa nombre y compases del fragmento');
    return;
  }

  try {
    const db = await abrirDB();
    const piezaId = window.piezaIdActual;

    if (!piezaId) {
      alert('Debes tener una pieza cargada');
      return;
    }

    const fragmento = {
      id: Date.now().toString(),
      piezaId: piezaId,
      nombre: nombreFragmento,
      compases: compasesFragmento
    };

    const tx = db.transaction('fragmentos', 'readwrite');
    await tx.objectStore('fragmentos').add(fragmento);
    await tx.done;

    // Limpiar inputs
    document.getElementById('sFNombre').value = '';
    document.getElementById('sFCompases').value = '';

    // Recargar select y lista
    cargarFragmentosEnSelect(db, piezaId);
    mostrarListaFragmentos(db, piezaId);

    alert('Fragmento agregado correctamente');

  } catch (error) {
    console.error('Error al agregar fragmento:', error);
    alert('Error al agregar fragmento');
  }
}

// ===== BORRAR FRAGMENTO =====
async function borrarFragmento(fragmentoId, piezaId) {
  if (!confirm('¿Estás seguro de que deseas borrar este fragmento?')) {
    return;
  }

  try {
    const db = await abrirDB();
    const tx = db.transaction('fragmentos', 'readwrite');
    await tx.objectStore('fragmentos').delete(fragmentoId);
    await tx.done;

    cargarFragmentosEnSelect(db, piezaId);
    mostrarListaFragmentos(db, piezaId);

    alert('Fragmento borrado correctamente');

  } catch (error) {
    console.error('Error al borrar fragmento:', error);
    alert('Error al borrar fragmento');
  }
}

// ===== INICIAR TEMPORIZADOR =====
let intervalo = null;
let tiempoSegundos = 0;

function iniciarTemporizador() {
  if (intervalo) return; // Ya está corriendo

  intervalo = setInterval(() => {
    tiempoSegundos++;
    actualizarDisplayTiempo();
  }, 1000);
}

// ===== PAUSAR TEMPORIZADOR =====
function pausarTemporizador() {
  if (intervalo) {
    clearInterval(intervalo);
    intervalo = null;
  }
}

// ===== DETENER TEMPORIZADOR =====
function detenerTemporizador() {
  pausarTemporizador();
  tiempoSegundos = 0;
  actualizarDisplayTiempo();
}

// ===== ACTUALIZAR DISPLAY DE TIEMPO =====
function actualizarDisplayTiempo() {
  const horas = Math.floor(tiempoSegundos / 3600);
  const minutos = Math.floor((tiempoSegundos % 3600) / 60);
  const segundos = tiempoSegundos % 60;

  const displayTiempo = document.getElementById('displayTiempo');
  if (displayTiempo) {
    displayTiempo.textContent = `${String(horas).padStart(2, '0')}:${String(minutos).padStart(2, '0')}:${String(segundos).padStart(2, '0')}`;
  }
}

// ===== GUARDAR SESIÓN =====
async function guardarSesion() {
  try {
    const piezaId = window.piezaIdActual;
    const fragmentoId = document.getElementById('sFragmento').value;
    const progresoInput = document.getElementById('sProgreso').value;

    if (!piezaId) {
      alert('Debes tener una pieza cargada');
      return;
    }

    if (!fragmentoId) {
      alert('Selecciona un fragmento');
      return;
    }

    if (!progresoInput) {
      alert('Selecciona un estado de progreso (bola)');
      return;
    }

    const sentimientos = document.getElementById('sSentimientos').value || '';
    const notas = document.getElementById('sNotas').value || '';
    const grabacion = document.getElementById('sGrabacion').value || '';

    const sesion = {
      id: Date.now().toString(),
      piezaId: piezaId,
      fragmentoId: fragmentoId,
      fecha: new Date().toISOString(),
      progreso: progresoInput,
      sentimientos: sentimientos,
      notas: notas,
      grabacion: grabacion,
      segundos: tiempoSegundos
    };

    const db = await abrirDB();
    const tx = db.transaction('sesiones', 'readwrite');
    await tx.objectStore('sesiones').add(sesion);
    await tx.done;

    // Limpiar campos de sesión
    document.getElementById('sSentimientos').value = '';
    document.getElementById('sNotas').value = '';
    document.getElementById('sGrabacion').value = '';
    document.getElementById('sProgreso').value = '';
    
    // Resetear bolas de progreso
    document.querySelectorAll('.btn-progreso').forEach(btn => {
      btn.classList.remove('activo');
    });

    // Resetear temporizador
    detenerTemporizador();

    // Recargar historial
    mostrarHistorial(piezaId);

    // Actualizar tiempo total
    actualizarTiempoTotal(db, piezaId);

    alert('Sesión guardada correctamente');

  } catch (error) {
    console.error('Error al guardar sesión:', error);
    alert('Error al guardar sesión');
  }
}

// ===== MOSTRAR HISTORIAL DE SESIONES =====
async function mostrarHistorial(piezaId) {
  try {
    const db = await abrirDB();
    const tx = db.transaction('sesiones', 'readonly');
    const sesiones = await tx.objectStore('sesiones').getAll();

    const sesionesFiltradasPorPieza = sesiones.filter(s => s.piezaId === piezaId);
    const historialDiv = document.getElementById('historial');

    if (!historialDiv) return;

    if (sesionesFiltradasPorPieza.length === 0) {
      historialDiv.innerHTML = '<p>No hay sesiones registradas</p>';
      return;
    }

    let html = '<h3>Historial de sesiones</h3>';
    html += '<ul>';

    sesionesFiltradasPorPieza.forEach(sesion => {
      const fecha = new Date(sesion.fecha).toLocaleDateString('es-ES');
      const tiempo = formatearTiempo(sesion.segundos);
      const fragmentoNombre = obtenerNombreFragmento(db, sesion.fragmentoId);

      html += `
        <li>
          <p><strong>Fecha:</strong> ${fecha}</p>
          <p><strong>Fragmento:</strong> ${fragmentoNombre || 'Sin nombre'}</p>
          <p><strong>Tiempo:</strong> ${tiempo}</p>
          <p><strong>Estado:</strong> ${sesion.progreso || '-'}</p>
          <p><strong>Sentimientos:</strong> ${sesion.sentimientos || '-'}</p>
          <p><strong>Notas:</strong> ${sesion.notas || '-'}</p>
          <p><strong>Grabación:</strong> ${sesion.grabacion || '-'}</p>
          <button onclick="borrarSesion('${sesion.id}', '${piezaId}')">Borrar</button>
        </li>
      `;
    });

    html += '</ul>';
    historialDiv.innerHTML = html;

  } catch (error) {
    console.error('Error al mostrar historial:', error);
  }
}

// ===== BORRAR SESIÓN =====
async function borrarSesion(sesionId, piezaId) {
  if (!confirm('¿Estás seguro de que deseas borrar esta sesión?')) {
    return;
  }

  try {
    const db = await abrirDB();
    const tx = db.transaction('sesiones', 'readwrite');
    await tx.objectStore('sesiones').delete(sesionId);
    await tx.done;

    mostrarHistorial(piezaId);
    actualizarTiempoTotal(db, piezaId);

    alert('Sesión borrada correctamente');

  } catch (error) {
    console.error('Error al borrar sesión:', error);
    alert('Error al borrar sesión');
  }
}

// ===== GUARDAR PIEZA =====
async function guardarPieza() {
  try {
    const piezaId = window.piezaIdActual;

    if (!piezaId) {
      alert('No hay pieza cargada');
      return;
    }

    const titulo = document.getElementById('pTitulo').value.trim();
    if (!titulo) {
      alert('El título es obligatorio');
      return;
    }

    const pieza = {
      id: piezaId,
      titulo: titulo,
      compositor: document.getElementById('pCompositor').value.trim(),
      tonalidad: document.getElementById('pTonalidad').value.trim(),
      compas: document.getElementById('pCompas').value.trim(),
      extension: document.getElementById('pExtension').value.trim(),
      fecha: document.getElementById('pFechaInicio').value.trim(),
      estructura: document.getElementById('pEstructura').value.trim(),
      puntosDificiles: document.getElementById('pPuntosDificiles').value.trim(),
      acompanamiento: document.getElementById('pAcompanamiento').value.trim()
    };

    const db = await abrirDB();
    const tx = db.transaction('piezas', 'readwrite');
    await tx.objectStore('piezas').put(pieza);
    await tx.done;

    alert('Pieza guardada correctamente');

  } catch (error) {
    console.error('Error al guardar pieza:', error);
    alert('Error al guardar pieza');
  }
}

// ===== BORRAR PIEZA =====
async function borrarPieza() {
  if (!confirm('¿Estás seguro de que deseas borrar esta pieza y todas sus sesiones?')) {
    return;
  }

  try {
    const piezaId = window.piezaIdActual;
    const db = await abrirDB();

    // Borrar pieza
    let tx = db.transaction('piezas', 'readwrite');
    await tx.objectStore('piezas').delete(piezaId);
    await tx.done;

    // Borrar fragmentos
    tx = db.transaction('fragmentos', 'readwrite');
    const fragmentos = await tx.objectStore('fragmentos').getAll();
    fragmentos.forEach(f => {
      if (f.piezaId === piezaId) {
        tx.objectStore('fragmentos').delete(f.id);
      }
    });
    await tx.done;

    // Borrar sesiones
    tx = db.transaction('sesiones', 'readwrite');
    const sesiones = await tx.objectStore('sesiones').getAll();
    sesiones.forEach(s => {
      if (s.piezaId === piezaId) {
        tx.objectStore('sesiones').delete(s.id);
      }
    });
    await tx.done;

    alert('Pieza borrada correctamente');
    window.location.href = 'index.html';

  } catch (error) {
    console.error('Error al borrar pieza:', error);
    alert('Error al borrar pieza');
  }
}

// ===== ACTUALIZAR TIEMPO TOTAL =====
async function actualizarTiempoTotal(db, piezaId) {
  try {
    const tx = db.transaction('sesiones', 'readonly');
    const sesiones = await tx.objectStore('sesiones').getAll();

    const sesionesFiltradasPorPieza = sesiones.filter(s => s.piezaId === piezaId);
    const totalSegundos = sesionesFiltradasPorPieza.reduce((sum, s) => sum + (s.segundos || 0), 0);

    const horas = Math.floor(totalSegundos / 3600);
    const minutos = Math.floor((totalSegundos % 3600) / 60);

    const tiempoTotal = document.getElementById('tiempoTotal');
    if (tiempoTotal) {
      tiempoTotal.textContent = `Tiempo total practicado: ${horas}h ${minutos}m`;
    }

  } catch (error) {
    console.error('Error al actualizar tiempo total:', error);
  }
}

// ===== FUNCIONES AUXILIARES DE BD =====

async function abrirDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('pianoDB', 1);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
  });
}

async function obtenerPieza(db, piezaId) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction('piezas', 'readonly');
    const request = tx.objectStore('piezas').get(piezaId);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
  });
}

async function obtenerFragmentos(db, piezaId) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction('fragmentos', 'readonly');
    const request = tx.objectStore('fragmentos').getAll();
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const fragmentos = request.result.filter(f => f.piezaId === piezaId);
      resolve(fragmentos);
    };
  });
}

async function obtenerNombreFragmento(db, fragmentoId) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction('fragmentos', 'readonly');
    const request = tx.objectStore('fragmentos').get(fragmentoId);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const fragmento = request.result;
      resolve(fragmento ? fragmento.nombre : null);
    };
  });
}

// ===== FORMATEAR TIEMPO =====
function formatearTiempo(segundos) {
  const horas = Math.floor(segundos / 3600);
  const minutos = Math.floor((segundos % 3600) / 60);
  const segs = segundos % 60;
  return `${horas}h ${minutos}m ${segs}s`;
}

// ===== CAMBIAR VISTA =====
function mostrarVista(vista) {
  // Ocultar todas las vistas
  document.querySelectorAll('[data-vista]').forEach(el => {
    el.style.display = 'none';
  });

  // Mostrar la vista seleccionada
  const vistaElement = document.querySelector(`[data-vista="${vista}"]`);
  if (vistaElement) {
    vistaElement.style.display = 'block';
  }

  // Actualizar botones activos
  document.querySelectorAll('[data-vista-btn]').forEach(btn => {
    btn.classList.remove('activo');
  });
  const btnActivo = document.querySelector(`[data-vista-btn="${vista}"]`);
  if (btnActivo) {
    btnActivo.classList.add('activo');
  }
}

// ===== MANEJO DE BOLAS DE PROGRESO =====
document.addEventListener('DOMContentLoaded', function() {
  document.querySelectorAll('.btn-progreso').forEach(btn => {
    btn.addEventListener('click', function() {
      // Desactivar todos los botones
      document.querySelectorAll('.btn-progreso').forEach(b => {
        b.classList.remove('activo');
      });

      // Activar el botón clickeado
      this.classList.add('activo');

      // Guardar el valor en el input hidden
      const progreso = this.getAttribute('data-progreso');
      document.getElementById('sProgreso').value = progreso;
    });
  });
});
