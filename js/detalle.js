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

  const listaSesiones = document.getElementById('listaSesiones');
  if (listaSesiones) {
    listaSesiones.innerHTML = '<p>No hay sesiones registradas</p>';
  }

  // Establecer fecha actual
  const sFecha = document.getElementById('sFecha');
  if (sFecha) {
    sFecha.valueAsDate = new Date();
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

    // Establecer fecha actual en sesión
    const sFecha = document.getElementById('sFecha');
    if (sFecha) {
      sFecha.valueAsDate = new Date();
    }

    // Configurar eventos
    configurarEventos();

  } catch (error) {
    console.error('Error al cargar pieza:', error);
    alert('Error al cargar la pieza');
  }
}

// ===== CONFIGURAR EVENTOS =====
function configurarEventos() {
  // Configurar evento guardar pieza
  const btnGuardarPieza = document.getElementById('btnGuardarPieza');
  if (btnGuardarPieza) {
    btnGuardarPieza.removeEventListener('click', guardarPieza);
    btnGuardarPieza.addEventListener('click', guardarPieza);
  }

  // Configurar evento agregar fragmento
  const btnAgregarFragmento = document.querySelector('[data-accion="agregar-fragmento"]');
  if (btnAgregarFragmento) {
    btnAgregarFragmento.removeEventListener('click', agregarFragmento);
    btnAgregarFragmento.addEventListener('click', agregarFragmento);
  }

  // Configurar eventos temporizador
  const btnIniciar = document.querySelector('[data-accion="iniciar-temporizador"]');
  const btnPausar = document.querySelector('[data-accion="pausar-temporizador"]');
  const btnDetener = document.querySelector('[data-accion="detener-temporizador"]');

  if (btnIniciar) {
    btnIniciar.removeEventListener('click', iniciarTemporizador);
    btnIniciar.addEventListener('click', iniciarTemporizador);
  }
  if (btnPausar) {
    btnPausar.removeEventListener('click', pausarTemporizador);
    btnPausar.addEventListener('click', pausarTemporizador);
  }
  if (btnDetener) {
    btnDetener.removeEventListener('click', detenerTemporizador);
    btnDetener.addEventListener('click', detenerTemporizador);
  }

  // Configurar evento guardar sesión
  const btnGuardarSesion = document.querySelector('[data-accion="guardar-sesion"]');
  if (btnGuardarSesion) {
    btnGuardarSesion.removeEventListener('click', guardarSesion);
    btnGuardarSesion.addEventListener('click', guardarSesion);
  }

  // Configurar eventos bolas de progreso
  document.querySelectorAll('.btn-progreso').forEach(btn => {
    btn.removeEventListener('click', seleccionarProgreso);
    btn.addEventListener('click', seleccionarProgreso);
  });

  // Configurar metrónomo
  const btnMetronomo = document.getElementById('btnMetronomo');
  if (btnMetronomo) {
    btnMetronomo.removeEventListener('click', toggleMetronomo);
    btnMetronomo.addEventListener('click', toggleMetronomo);
  }

  const bpmInput = document.getElementById('sMetronomoBPM');
  if (bpmInput) {
    bpmInput.removeEventListener('change', actualizarMetronomo);
    bpmInput.addEventListener('change', actualizarMetronomo);
  }

  const compasSelect = document.getElementById('sMetronomorCompas');
  if (compasSelect) {
    compasSelect.removeEventListener('change', actualizarMetronomo);
    compasSelect.addEventListener('change', actualizarMetronomo);
  }

  // Configurar grabador de sesión
  const btnGrabar = document.getElementById('btnGrabarSesion');
  if (btnGrabar) {
    btnGrabar.removeEventListener('click', toggleGrabacionSesion);
    btnGrabar.addEventListener('click', toggleGrabacionSesion);
  }

  const btnReproducir = document.getElementById('btnReproducirGrabacion');
  if (btnReproducir) {
    btnReproducir.removeEventListener('click', reproducirGrabacion);
    btnReproducir.addEventListener('click', reproducirGrabacion);
  }

  // Inicializar indicador visual del metrónomo
  actualizarIndicadorPulsos();
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

// ===== TEMPORIZADOR =====
let intervalo = null;
let tiempoSegundos = 0;

function iniciarTemporizador() {
  if (intervalo) return; // Ya está corriendo

  intervalo = setInterval(() => {
    tiempoSegundos++;
    actualizarDisplayTiempo();
  }, 1000);
}

function pausarTemporizador() {
  if (intervalo) {
    clearInterval(intervalo);
    intervalo = null;
  }
}

function detenerTemporizador() {
  pausarTemporizador();
  tiempoSegundos = 0;
  actualizarDisplayTiempo();
}

function actualizarDisplayTiempo() {
  const horas = Math.floor(tiempoSegundos / 3600);
  const minutos = Math.floor((tiempoSegundos % 3600) / 60);
  const segundos = tiempoSegundos % 60;

  const displayTiempo = document.getElementById('tiempoDisplay');
  if (displayTiempo) {
    displayTiempo.textContent = `${String(horas).padStart(2, '0')}:${String(minutos).padStart(2, '0')}:${String(segundos).padStart(2, '0')}`;
  }
}

// ===== METRÓNOMO =====
let metronomeInterval = null;
let metronomeActive = false;
let metronomoPulsoActual = 0;
const audioContext = new (window.AudioContext || window.webkitAudioContext)();

function reproducirSonidoMetronomo(esFuerte = false) {
  const now = audioContext.currentTime;
  const osc = audioContext.createOscillator();
  const env = audioContext.createGain();

  osc.connect(env);
  env.connect(audioContext.destination);

  if (esFuerte) {
    osc.frequency.value = 1200; // Frecuencia más alta para pulso fuerte
    env.gain.setValueAtTime(0.4, now);
  } else {
    osc.frequency.value = 800; // Frecuencia más baja para pulso débil
    env.gain.setValueAtTime(0.2, now);
  }

  env.gain.exponentialRampToValueAtTime(0.01, now + 0.1);

  osc.start(now);
  osc.stop(now + 0.1);
}

function actualizarIndicadorPulsos() {
  const compas = parseInt(document.getElementById('sMetronomorCompas').value);
  const container = document.getElementById('metronomoPulsos');

  if (!container) return;

  container.innerHTML = '';

  for (let i = 0; i < compas; i++) {
    const pulso = document.createElement('div');
    pulso.className = 'pulso';
    if (i === metronomoPulsoActual) {
      pulso.classList.add('activo');
    }
    if (i === 0) {
      pulso.classList.add('fuerte');
    }
    container.appendChild(pulso);
  }
}

function toggleMetronomo() {
  const btnMetronomo = document.getElementById('btnMetronomo');
  const bpmInput = document.getElementById('sMetronomoBPM');
  const compasSelect = document.getElementById('sMetronomorCompas');
  const bpm = parseInt(bpmInput.value);
  const compas = parseInt(compasSelect.value);

  if (bpm < 30 || bpm > 300) {
    alert('BPM debe estar entre 30 y 300');
    return;
  }

  if (metronomeActive) {
    // Detener metrónomo
    clearInterval(metronomeInterval);
    metronomeActive = false;
    metronomoPulsoActual = 0;
    btnMetronomo.classList.remove('activo');
    btnMetronomo.textContent = 'Metrónomo';
    actualizarIndicadorPulsos();
  } else {
    // Iniciar metrónomo
    metronomeActive = true;
    metronomoPulsoActual = 0;
    btnMetronomo.classList.add('activo');
    btnMetronomo.textContent = 'Metrónomo (activo)';

    const intervalo = (60 / bpm) * 1000; // Convertir BPM a milisegundos

    metronomeInterval = setInterval(() => {
      const esFuerte = metronomoPulsoActual === 0;
      reproducirSonidoMetronomo(esFuerte);
      actualizarIndicadorPulsos();

      metronomoPulsoActual++;
      if (metronomoPulsoActual >= compas) {
        metronomoPulsoActual = 0;
      }
    }, intervalo);

    actualizarIndicadorPulsos();
  }
}

function actualizarMetronomo() {
  if (metronomeActive) {
    clearInterval(metronomeInterval);
    const bpm = parseInt(document.getElementById('sMetronomoBPM').value);
    const compas = parseInt(document.getElementById('sMetronomorCompas').value);
    const intervalo = (60 / bpm) * 1000;
    
    metronomoPulsoActual = 0;
    metronomeInterval = setInterval(() => {
      const esFuerte = metronomoPulsoActual === 0;
      reproducirSonidoMetronomo(esFuerte);
      actualizarIndicadorPulsos();

      metronomoPulsoActual++;
      if (metronomoPulsoActual >= compas) {
        metronomoPulsoActual = 0;
      }
    }, intervalo);
  } else {
    metronomoPulsoActual = 0;
    actualizarIndicadorPulsos();
  }
}

// ===== GRABADOR DE SESIÓN =====
let mediaRecorder = null;
let audioChunks = [];
let isRecording = false;
let grabacionActual = null;

async function iniciarGrabacionSesion() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    mediaRecorder = new MediaRecorder(stream);
    audioChunks = [];
    isRecording = true;

    const btnGrabar = document.getElementById('btnGrabarSesion');
    btnGrabar.classList.add('grabando');
    btnGrabar.title = 'Detener grabación';

    mediaRecorder.ondataavailable = (event) => {
      audioChunks.push(event.data);
    };

    mediaRecorder.onstop = () => {
      const audioBlob = new Blob(audioChunks, { type: 'audio/wav' });
      grabacionActual = audioBlob;
      
      const audioUrl = URL.createObjectURL(audioBlob);
      const audioElement = document.getElementById('audioGrabacion');
      audioElement.src = audioUrl;

      // Mostrar botón de reproducir
      const btnReproducir = document.getElementById('btnReproducirGrabacion');
      btnReproducir.style.display = 'inline-block';

      isRecording = false;
      const btnGrabar = document.getElementById('btnGrabarSesion');
      btnGrabar.classList.remove('grabando');
      btnGrabar.title = 'Grabar sesión';

      // Marcar que se grabó
      document.getElementById('sGrabado').checked = true;

      alert('Grabación completada');
    };

    mediaRecorder.start();

  } catch (error) {
    console.error('Error al acceder al micrófono:', error);
    alert('No se pudo acceder al micrófono. Verifica los permisos.');
  }
}

function detenerGrabacionSesion() {
  if (mediaRecorder && isRecording) {
    mediaRecorder.stop();
    mediaRecorder.stream.getTracks().forEach(track => track.stop());
  }
}

function toggleGrabacionSesion() {
  if (isRecording) {
    detenerGrabacionSesion();
  } else {
    iniciarGrabacionSesion();
  }
}

function reproducirGrabacion() {
  const audioElement = document.getElementById('audioGrabacion');
  if (audioElement.src) {
    audioElement.play();
  }
}

// ===== SELECCIONAR PROGRESO =====
function seleccionarProgreso() {
  // Desactivar todos los botones
  document.querySelectorAll('.btn-progreso').forEach(b => {
    b.classList.remove('activo');
  });

  // Activar el botón clickeado
  this.classList.add('activo');

  // Guardar el valor en el input hidden
  const progreso = this.getAttribute('data-progreso');
  document.getElementById('sProgreso').value = progreso;
}

// ===== GUARDAR SESIÓN =====
async function guardarSesion() {
  try {
    const piezaId = window.piezaIdActual;
    const fragmentoId = document.getElementById('sFragmento').value;
    const progresoInput = document.getElementById('sProgreso').value;
    const sFecha = document.getElementById('sFecha').value;

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

    if (!sFecha) {
      alert('Selecciona una fecha');
      return;
    }

    // Recopilar sentimientos seleccionados
    const sentimientos = [];
    document.querySelectorAll('input[name="sentimientos"]:checked').forEach(cb => {
      sentimientos.push(cb.value);
    });

    const notas = document.getElementById('sNotas').value || '';
    const grabado = document.getElementById('sGrabado').checked ? 'Sí' : 'No';

    const sesion = {
      id: Date.now().toString(),
      piezaId: piezaId,
      fragmentoId: fragmentoId,
      fecha: sFecha,
      progreso: progresoInput,
      sentimientos: sentimientos.join(', '),
      notas: notas,
      grabado: grabado,
      segundos: tiempoSegundos
    };

    const db = await abrirDB();
    const tx = db.transaction('sesiones', 'readwrite');
    await tx.objectStore('sesiones').add(sesion);
    await tx.done;

    // Limpiar campos de sesión
    document.getElementById('sFragmento').value = '';
    document.getElementById('sNotas').value = '';
    document.getElementById('sProgreso').value = '';
    document.getElementById('sGrabado').checked = false;
    document.querySelectorAll('input[name="sentimientos"]').forEach(cb => {
      cb.checked = false;
    });
    
    // Resetear bolas de progreso
    document.querySelectorAll('.btn-progreso').forEach(btn => {
      btn.classList.remove('activo');
    });

    // Resetear temporizador
    detenerTemporizador();

    // Resetear grabador
    const btnGrabar = document.getElementById('btnGrabarSesion');
    const btnReproducir = document.getElementById('btnReproducirGrabacion');
    btnGrabar.classList.remove('grabando');
    btnReproducir.style.display = 'none';
    grabacionActual = null;
    isRecording = false;

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
    const listaSesionesDiv = document.getElementById('listaSesiones');

    if (!listaSesionesDiv) return;

    if (sesionesFiltradasPorPieza.length === 0) {
      listaSesionesDiv.innerHTML = '<p>No hay sesiones registradas</p>';
      return;
    }

    let html = '';

    sesionesFiltradasPorPieza.forEach(sesion => {
      const fecha = new Date(sesion.fecha).toLocaleDateString('es-ES');
      const tiempo = formatearTiempo(sesion.segundos);
      const fragmentoNombre = obtenerNombreFragmentoSync(db, sesion.fragmentoId);

      html += `
        <div class="sesion-item">
          <div class="sesion-header">
            <div>
              <strong>${fecha}</strong> - ${fragmentoNombre || 'Sin nombre'}
            </div>
            <div class="sesion-tiempo">${tiempo}</div>
          </div>
          <div class="sesion-detalle">
            <p><strong>Estado:</strong> ${sesion.progreso || '-'}</p>
            ${sesion.sentimientos ? `<p><strong>Sentimientos:</strong> ${sesion.sentimientos}</p>` : ''}
            ${sesion.notas ? `<p><strong>Notas:</strong> ${sesion.notas}</p>` : ''}
            <p><strong>¿Grabado?</strong> ${sesion.grabado || '-'}</p>
            <button onclick="borrarSesion('${sesion.id}', '${piezaId}')" class="btn-eliminar">Borrar</button>
          </div>
        </div>
      `;
    });

    listaSesionesDiv.innerHTML = html;

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

function obtenerNombreFragmentoSync(db, fragmentoId) {
  const tx = db.transaction('fragmentos', 'readonly');
  const request = tx.objectStore('fragmentos').get(fragmentoId);
  let fragmentoNombre = 'Sin nombre';

  request.onsuccess = () => {
    const fragmento = request.result;
    if (fragmento) {
      fragmentoNombre = fragmento.nombre;
    }
  };

  return fragmentoNombre;
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
}
