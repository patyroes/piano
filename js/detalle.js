// detalle.js - Lógica de la ficha de pieza individual

let idPiezaActual = null;
let timerInterval = null;
let tiempoTranscurrido = 0;

document.addEventListener('DOMContentLoaded', async () => {
  const params = new URLSearchParams(window.location.search);
  idPiezaActual = params.get('id');

  if (!idPiezaActual) {
    console.error('No se encontró ID de pieza');
    return;
  }

  await cargarPieza();
  await cargarSesiones();
  await cargarDatosInforme();
  configurarEventos();
  verificarAnalisisCompleto();
});

async function cargarPieza() {
  try {
    const pieza = await obtenerPiezaDB(idPiezaActual);
    if (!pieza) {
      console.error('Pieza no encontrada');
      return;
    }

    // Llenar formulario
    document.getElementById('pTitulo').value = pieza.titulo || '';
    document.getElementById('pCompositor').value = pieza.compositor || '';
    document.getElementById('pTonalidad').value = pieza.tonalidad || '';
    document.getElementById('pCompas').value = pieza.compas || '';
    document.getElementById('pExtension').value = pieza.extension || '';
    document.getElementById('pFechaInicio').value = pieza.fechaInicio || '';
    document.getElementById('pEstructura').value = pieza.estructura || '';
    document.getElementById('pPuntosDificiles').value = pieza.puntosDificiles || '';
    document.getElementById('pAcompanamiento').value = pieza.acompanamiento || '';

    // Mostrar tiempo total
    const tiempoTotal = await calcularTiempoTotal(idPiezaActual);
    document.getElementById('tiempoTotalPieza').textContent = formatearTiempo(tiempoTotal);

    // Cargar fragmentos
    await cargarFragmentos(pieza.fragmentos || []);

  } catch (error) {
    console.error('Error al cargar pieza:', error);
  }
}

function verificarAnalisisCompleto() {
  const titulo = document.getElementById('pTitulo').value.trim();
  const botonesVista = document.querySelectorAll('.btn-vista');

  botonesVista.forEach(btn => {
    if (btn.dataset.vista === 'analisis') {
      btn.disabled = false;
    } else {
      // Bloquear si no hay título
      btn.disabled = !titulo;
    }
  });

  // Escuchar cambios en el título
  document.getElementById('pTitulo').addEventListener('input', verificarAnalisisCompleto);
}

async function cargarFragmentos(fragmentos) {
  const lista = document.getElementById('listaFragmentos');
  lista.innerHTML = '';

  if (fragmentos.length === 0) {
    lista.innerHTML = '<p style="color: #999;">Sin fragmentos aún.</p>';
    return;
  }

  fragmentos.forEach((frag, index) => {
    const div = document.createElement('div');
    div.className = 'fragmento-item';
    div.innerHTML = `
      <div class="fragmento-header">
        <strong>${frag.nombre}</strong>
        <span class="fragmento-compases">${frag.compases || '?'}</span>
      </div>
      <button type="button" class="btn-eliminar-fragmento" data-index="${index}">Eliminar</button>
    `;
    lista.appendChild(div);
  });

  document.querySelectorAll('.btn-eliminar-fragmento').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const index = parseInt(e.target.dataset.index);
      await eliminarFragmento(index);
    });
  });
}

async function agregarFragmento() {
  const nombre = document.getElementById('sFNombre').value.trim();
  const compases = document.getElementById('sFCompases').value.trim();

  if (!nombre || !compases) {
    alert('Por favor rellena nombre y compases del fragmento');
    return;
  }

  try {
    const pieza = await obtenerPiezaDB(idPiezaActual);
    if (!pieza.fragmentos) pieza.fragmentos = [];

    pieza.fragmentos.push({ nombre, compases });
    await guardarPiezaDB(pieza);

    document.getElementById('sFNombre').value = '';
    document.getElementById('sFCompases').value = '';

    await cargarFragmentos(pieza.fragmentos);
  } catch (error) {
    console.error('Error al agregar fragmento:', error);
  }
}

async function eliminarFragmento(index) {
  if (!confirm('¿Eliminar este fragmento?')) return;

  try {
    const pieza = await obtenerPiezaDB(idPiezaActual);
    pieza.fragmentos.splice(index, 1);
    await guardarPiezaDB(pieza);
    await cargarFragmentos(pieza.fragmentos);
  } catch (error) {
    console.error('Error al eliminar fragmento:', error);
  }
}

async function cargarSesiones() {
  try {
    const sesiones = await obtenerSesionesDB();
    const sesionesFiltradasOrdenadas = sesiones
      .filter(s => s.pieceId === idPiezaActual)
      .sort((a, b) => new Date(b.fecha) - new Date(a.fecha));

    const lista = document.getElementById('listaSesiones');
    lista.innerHTML = '';

    if (sesionesFiltradasOrdenadas.length === 0) {
      lista.innerHTML = '<p style="color: #999;">Sin sesiones aún.</p>';
      return;
    }

    sesionesFiltradasOrdenadas.forEach((sesion, index) => {
      const fecha = new Date(sesion.fecha).toLocaleDateString('es-ES');
      const tiempo = formatearTiempo(sesion.tiempo);
      const sentimientos = (sesion.sentimientos && sesion.sentimientos.length > 0)
        ? sesion.sentimientos.join(', ')
        : 'Sin sentimientos';

      const div = document.createElement('div');
      div.className = 'sesion-item';
      div.innerHTML = `
        <div class="sesion-header">
          <strong>${fecha}</strong>
          <span class="sesion-tiempo">${tiempo}</span>
        </div>
        <div class="sesion-detalle">
          <p><strong>Fragmento:</strong> ${sesion.fragmento}</p>
          <p><strong>Progreso:</strong> ${sesion.progreso || '-'}</p>
          <p><strong>Enfoque:</strong> ${sesion.enfoque || '-'}</p>
          <p><strong>Sentimientos:</strong> ${sentimientos}</p>
          <p><strong>Grabación:</strong> ${sesion.grabado ? 'Sí' : 'No'}</p>
          ${sesion.notas ? `<p><strong>Notas:</strong> ${sesion.notas}</p>` : ''}
        </div>
        <button type="button" class="btn-eliminar-sesion" data-index="${index}">Eliminar sesión</button>
      `;
      lista.appendChild(div);
    });

    document.querySelectorAll('.btn-eliminar-sesion').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const index = parseInt(e.target.dataset.index);
        await eliminarSesion(sesionesFiltradasOrdenadas[index].id);
      });
    });

  } catch (error) {
    console.error('Error al cargar sesiones:', error);
  }
}

async function eliminarSesion(sesionId) {
  if (!confirm('¿Eliminar esta sesión?')) return;

  try {
    await eliminarSesionDB(sesionId);
    await cargarSesiones();
    
    const tiempoTotal = await calcularTiempoTotal(idPiezaActual);
    document.getElementById('tiempoTotalPieza').textContent = formatearTiempo(tiempoTotal);
  } catch (error) {
    console.error('Error al eliminar sesión:', error);
  }
}

async function guardarSesion() {
  const fecha = document.getElementById('sFecha').value;
  const fragmento = document.getElementById('sFragmento').value;
  const progreso = document.getElementById('sProgreso').value;
  const enfoque = document.getElementById('sEnfoque').value;
  const otroEnfoque = document.getElementById('sOtroEnfoque').value;
  const sentimientos = Array.from(document.querySelectorAll('input[name="sentimientos"]:checked'))
    .map(cb => cb.value);
  const grabado = document.getElementById('sGrabado').checked;
  const notas = document.getElementById('sNotas').value;

  if (!fecha || !fragmento) {
    alert('Por favor rellena fecha y fragmento');
    return;
  }

  const enfoqueGuardar = enfoque === 'Otro' ? otroEnfoque : enfoque;

  try {
    const sesion = {
      id: Date.now().toString(),
      pieceId: idPiezaActual,
      fecha,
      fragmento,
      progreso,
      enfoque: enfoqueGuardar,
      sentimientos,
      grabado,
      notas,
      tiempo: tiempoTranscurrido
    };

    await guardarSesionDB(sesion);

    detenerTemporizador();
    tiempoTranscurrido = 0;
    document.getElementById('tiempoDisplay').textContent = '0h 0m 0s';

    document.getElementById('sFecha').value = new Date().toISOString().split('T')[0];
    document.getElementById('sFragmento').value = '';
    document.getElementById('sProgreso').value = '';
    document.getElementById('sEnfoque').value = '';
    document.getElementById('sOtroEnfoque').value = '';
    document.getElementById('sGrabado').checked = false;
    document.getElementById('sNotas').value = '';
    document.querySelectorAll('input[name="sentimientos"]').forEach(cb => cb.checked = false);

    await cargarSesiones();
    await cargarDatosInforme();

    const tiempoTotal = await calcularTiempoTotal(idPiezaActual);
    document.getElementById('tiempoTotalPieza').textContent = formatearTiempo(tiempoTotal);

    alert('Sesión guardada correctamente');

  } catch (error) {
    console.error('Error al guardar sesión:', error);
    alert('Error al guardar sesión');
  }
}

function iniciarTemporizador() {
  if (timerInterval) return;

  timerInterval = setInterval(() => {
    tiempoTranscurrido++;
    document.getElementById('tiempoDisplay').textContent = formatearTiempo(tiempoTranscurrido);
  }, 1000);
}

function pausarTemporizador() {
  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
  }
}

function detenerTemporizador() {
  pausarTemporizador();
  tiempoTranscurrido = 0;
  document.getElementById('tiempoDisplay').textContent = '0h 0m 0s';
}

function formatearTiempo(segundos) {
  if (!segundos || segundos === 0) return '0h 0m 0s';
  
  const horas = Math.floor(segundos / 3600);
  const minutos = Math.floor((segundos % 3600) / 60);
  const segs = segundos % 60;
  
  return `${horas}h ${minutos}m ${segs}s`;
}

async function calcularTiempoTotal(pieceId) {
  const sesiones = await obtenerSesionesDB();
  const sesionesFiltradasOrdenadas = sesiones.filter(s => s.pieceId === pieceId);
  return sesionesFiltradasOrdenadas.reduce((sum, s) => sum + (s.tiempo || 0), 0);
}

function cambiarVista(vista) {
  document.getElementById('vistaAnalisis').style.display = 'none';
  document.getElementById('vistaFragmentos').style.display = 'none';
  document.getElementById('vistaSesiones').style.display = 'none';
  document.getElementById('vistaInforme').style.display = 'none';

  document.querySelectorAll('.btn-vista').forEach(btn => btn.classList.remove('activo'));

  if (vista === 'analisis') {
    document.getElementById('vistaAnalisis').style.display = 'block';
    document.querySelector('[data-vista="analisis"]').classList.add('activo');
  } else if (vista === 'fragmentos') {
    document.getElementById('vistaFragmentos').style.display = 'block';
    document.querySelector('[data-vista="fragmentos"]').classList.add('activo');
  } else if (vista === 'sesiones') {
    document.getElementById('vistaSesiones').style.display = 'block';
    document.querySelector('[data-vista="sesiones"]').classList.add('activo');
  } else if (vista === 'informe') {
    document.getElementById('vistaInforme').style.display = 'block';
    document.querySelector('[data-vista="informe"]').classList.add('activo');
  }
}

function configurarEventos() {
  document.querySelectorAll('.btn-vista').forEach(btn => {
    btn.addEventListener('click', () => {
      if (!btn.disabled) {
        const vista = btn.dataset.vista;
        cambiarVista(vista);
      }
    });
  });

  const btnAgregarFragmento = document.querySelector('[data-accion="agregar-fragmento"]');
  if (btnAgregarFragmento) {
    btnAgregarFragmento.addEventListener('click', agregarFragmento);
  }

  const btnIniciar = document.querySelector('[data-accion="iniciar-temporizador"]');
  const btnPausar = document.querySelector('[data-accion="pausar-temporizador"]');
  const btnDetener = document.querySelector('[data-accion="detener-temporizador"]');
  const btnGuardarSesion = document.querySelector('[data-accion="guardar-sesion"]');
  const btnDescargarPDF = document.querySelector('[data-accion="descargar-pdf"]');

  if (btnIniciar) btnIniciar.addEventListener('click', iniciarTemporizador);
  if (btnPausar) btnPausar.addEventListener('click', pausarTemporizador);
  if (btnDetener) btnDetener.addEventListener('click', detenerTemporizador);
  if (btnGuardarSesion) btnGuardarSesion.addEventListener('click', guardarSesion);
  if (btnDescargarPDF) btnDescargarPDF.addEventListener('click', () => {
    const nombrePieza = document.getElementById('pTitulo').value || 'Pieza';
    descargarPDFInforme(nombrePieza);
  });

  const inputFecha = document.getElementById('sFecha');
  if (inputFecha && !inputFecha.value) {
    inputFecha.value = new Date().toISOString().split('T')[0];
  }

  const selectEnfoque = document.getElementById('sEnfoque');
  const otroEnfoqueDiv = document.getElementById('otroEnfoqueDiv');
  if (selectEnfoque && otroEnfoqueDiv) {
    selectEnfoque.addEventListener('change', () => {
      otroEnfoqueDiv.style.display = selectEnfoque.value === 'Otro' ? 'block' : 'none';
    });
  }
}
