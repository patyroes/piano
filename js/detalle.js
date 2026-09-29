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

  // Esperar un poco para asegurar que el DOM está listo
  setTimeout(async () => {
    await cargarPieza();
    await cargarSesiones();
    await cargarDatosInforme();
    configurarEventos();
  }, 100);
});

async function cargarPieza() {
  try {
    const pieza = await obtenerPiezaDB(idPiezaActual);
    
    if (!pieza) {
      console.error('Pieza no encontrada:', idPiezaActual);
      return;
    }

    console.log('Pieza cargada:', pieza);

    // Llenar formulario con los datos de la pieza
    const pTitulo = document.getElementById('pTitulo');
    const pCompositor = document.getElementById('pCompositor');
    const pTonalidad = document.getElementById('pTonalidad');
    const pCompas = document.getElementById('pCompas');
    const pExtension = document.getElementById('pExtension');
    const pFechaInicio = document.getElementById('pFechaInicio');
    const pEstructura = document.getElementById('pEstructura');
    const pPuntosDificiles = document.getElementById('pPuntosDificiles');
    const pAcompanamiento = document.getElementById('pAcompanamiento');

    if (pTitulo) pTitulo.value = pieza.titulo || '';
    if (pCompositor) pCompositor.value = pieza.compositor || '';
    if (pTonalidad) pTonalidad.value = pieza.tonalidad || '';
    if (pCompas) pCompas.value = pieza.compas || '';
    if (pExtension) pExtension.value = pieza.extension || '';
    if (pFechaInicio) pFechaInicio.value = pieza.fechaInicio || '';
    if (pEstructura) pEstructura.value = pieza.estructura || '';
    if (pPuntosDificiles) pPuntosDificiles.value = pieza.puntosDificiles || '';
    if (pAcompanamiento) pAcompanamiento.value = pieza.acompanamiento || '';

    // Actualizar título de la página
    const tituloPieza = document.getElementById('tituloPieza');
    if (tituloPieza) {
      tituloPieza.textContent = pieza.titulo || 'Sin título';
    }

    // Mostrar tiempo total
    const tiempoTotal = await calcularTiempoTotal(idPiezaActual);
    const tiempoTotalPieza = document.getElementById('tiempoTotalPieza');
    if (tiempoTotalPieza) {
      tiempoTotalPieza.textContent = formatearTiempo(tiempoTotal);
    }

    // Cargar fragmentos
    await cargarFragmentos(pieza.fragmentos || []);
    
    // Cargar fragmentos en el select
    await cargarFragmentosEnSelect(pieza.fragmentos || []);

  } catch (error) {
    console.error('Error al cargar pieza:', error);
  }
}

async function cargarFragmentos(fragmentos) {
  const lista = document.getElementById('listaFragmentos');
  
  if (!lista) {
    console.error('No se encontró elemento listaFragmentos');
    return;
  }

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
      e.preventDefault();
      const index = parseInt(e.target.dataset.index);
      await eliminarFragmento(index);
    });
  });
}

async function cargarFragmentosEnSelect(fragmentos) {
  const selectFragmento = document.getElementById('sFragmento');
  
  if (!selectFragmento) {
    console.error('No se encontró elemento sFragmento');
    return;
  }

  // Limpiar opciones (excepto la primera)
  while (selectFragmento.options.length > 1) {
    selectFragmento.remove(1);
  }

  // Agregar fragmentos
  if (fragmentos && fragmentos.length > 0) {
    fragmentos.forEach(frag => {
      const option = document.createElement('option');
      option.value = frag.nombre;
      option.textContent = `${frag.nombre} (${frag.compases})`;
      selectFragmento.appendChild(option);
    });
  }
}

async function agregarFragmento() {
  const sFNombre = document.getElementById('sFNombre');
  const sFCompases = document.getElementById('sFCompases');
  
  const nombre = sFNombre ? sFNombre.value.trim() : '';
  const compases = sFCompases ? sFCompases.value.trim() : '';

  if (!nombre || !compases) {
    alert('Por favor rellena nombre y compases del fragmento');
    return;
  }

  try {
    const pieza = await obtenerPiezaDB(idPiezaActual);
    if (!pieza.fragmentos) pieza.fragmentos = [];

    pieza.fragmentos.push({ nombre, compases });
    await guardarPiezaDB(pieza);

    if (sFNombre) sFNombre.value = '';
    if (sFCompases) sFCompases.value = '';

    await cargarFragmentos(pieza.fragmentos);
    await cargarFragmentosEnSelect(pieza.fragmentos);
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
    await cargarFragmentosEnSelect(pieza.fragmentos);
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
    
    if (!lista) {
      console.error('No se encontró elemento listaSesiones');
      return;
    }

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
        e.preventDefault();
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
    const tiempoTotalPieza = document.getElementById('tiempoTotalPieza');
    if (tiempoTotalPieza) {
      tiempoTotalPieza.textContent = formatearTiempo(tiempoTotal);
    }
  } catch (error) {
    console.error('Error al eliminar sesión:', error);
  }
}

async function guardarPieza() {
  const pTitulo = document.getElementById('pTitulo');
  const titulo = pTitulo ? pTitulo.value.trim() : '';
  
  if (!titulo) {
    alert('Por favor ingresa un título');
    return;
  }

  try {
    const pieza = await obtenerPiezaDB(idPiezaActual);
    
    if (!pieza) {
      alert('Pieza no encontrada');
      return;
    }

    pieza.titulo = titulo;
    pieza.compositor = document.getElementById('pCompositor')?.value || '';
    pieza.tonalidad = document.getElementById('pTonalidad')?.value || '';
    pieza.compas = document.getElementById('pCompas')?.value || '';
    pieza.extension = document.getElementById('pExtension')?.value || '';
    pieza.fechaInicio = document.getElementById('pFechaInicio')?.value || '';
    pieza.estructura = document.getElementById('pEstructura')?.value || '';
    pieza.puntosDificiles = document.getElementById('pPuntosDificiles')?.value || '';
    pieza.acompanamiento = document.getElementById('pAcompanamiento')?.value || '';

    await guardarPiezaDB(pieza);
    
    // Actualizar título de la página
    const tituloPieza = document.getElementById('tituloPieza');
    if (tituloPieza) {
      tituloPieza.textContent = pieza.titulo;
    }
    
    alert('Cambios guardados correctamente');

  } catch (error) {
    console.error('Error al guardar pieza:', error);
    alert('Error al guardar pieza');
  }
}

async function guardarSesion() {
  const sFecha = document.getElementById('sFecha');
  const sFragmento = document.getElementById('sFragmento');
  
  const fecha = sFecha ? sFecha.value : '';
  const fragmento = sFragmento ? sFragmento.value : '';
  
  const progreso = document.getElementById('sProgreso')?.value || '';
  const enfoque = document.getElementById('sEnfoque')?.value || '';
  const otroEnfoque = document.getElementById('sOtroEnfoque')?.value || '';
  const sentimientos = Array.from(document.querySelectorAll('input[name="sentimientos"]:checked'))
    .map(cb => cb.value);
  const grabado = document.getElementById('sGrabado')?.checked || false;
  const notas = document.getElementById('sNotas')?.value || '';

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
    
    const tiempoDisplay = document.getElementById('tiempoDisplay');
    if (tiempoDisplay) tiempoDisplay.textContent = '0h 0m 0s';

    // Limpiar formulario
    if (sFecha) sFecha.value = new Date().toISOString().split('T')[0];
    if (sFragmento) sFragmento.value = '';
    document.getElementById('sProgreso').value = '';
    
    // Desactivar botones de progreso
    document.querySelectorAll('.btn-progreso').forEach(btn => {
      btn.classList.remove('activo');
    });
    
    document.getElementById('sEnfoque').value = '';
    document.getElementById('sOtroEnfoque').value = '';
    document.getElementById('sGrabado').checked = false;
    document.getElementById('sNotas').value = '';
    document.querySelectorAll('input[name="sentimientos"]').forEach(cb => cb.checked = false);

    await cargarSesiones();
    await cargarDatosInforme();

    const tiempoTotal = await calcularTiempoTotal(idPiezaActual);
    const tiempoTotalPieza = document.getElementById('tiempoTotalPieza');
    if (tiempoTotalPieza) {
      tiempoTotalPieza.textContent = formatearTiempo(tiempoTotal);
    }

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
    const tiempoDisplay = document.getElementById('tiempoDisplay');
    if (tiempoDisplay) {
      tiempoDisplay.textContent = formatearTiempo(tiempoTranscurrido);
    }
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
  const tiempoDisplay = document.getElementById('tiempoDisplay');
  if (tiempoDisplay) {
    tiempoDisplay.textContent = '0h 0m 0s';
  }
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

function configurarEventos() {
  // Botón guardar pieza
  const btnGuardarPieza = document.getElementById('btnGuardarPieza');
  if (btnGuardarPieza) {
    btnGuardarPieza.onclick = guardarPieza;
  }

  // Botón agregar fragmento
  const btnAgregarFragmento = document.querySelector('[data-accion="agregar-fragmento"]');
  if (btnAgregarFragmento) {
    btnAgregarFragmento.addEventListener('click', (e) => {
      e.preventDefault();
      agregarFragmento();
    });
  }

  // Botones temporizador
  const btnIniciar = document.querySelector('[data-accion="iniciar-temporizador"]');
  const btnPausar = document.querySelector('[data-accion="pausar-temporizador"]');
  const btnDetener = document.querySelector('[data-accion="detener-temporizador"]');
  const btnGuardarSesion = document.querySelector('[data-accion="guardar-sesion"]');
  const btnDescargarPDF = document.querySelector('[data-accion="descargar-pdf"]');

  if (btnIniciar) btnIniciar.addEventListener('click', iniciarTemporizador);
  if (btnPausar) btnPausar.addEventListener('click', pausarTemporizador);
  if (btnDetener) btnDetener.addEventListener('click', detenerTemporizador);
  if (btnGuardarSesion) {
    btnGuardarSesion.addEventListener('click', (e) => {
      e.preventDefault();
      guardarSesion();
    });
  }
  if (btnDescargarPDF) {
    btnDescargarPDF.addEventListener('click', () => {
      const pTitulo = document.getElementById('pTitulo');
      const nombrePieza = pTitulo ? pTitulo.value : 'Pieza';
      descargarPDFInforme(nombrePieza);
    });
  }

  // Botón vista informe
  const btnVistaInforme = document.querySelector('[data-vista="informe"]');
  if (btnVistaInforme) {
    btnVistaInforme.addEventListener('click', () => {
      const vistaInforme = document.getElementById('vistaInforme');
      if (vistaInforme) {
        vistaInforme.style.display = 'block';
      }
      btnVistaInforme.classList.add('activo');
    });
  }

  // Fecha automática
  const inputFecha = document.getElementById('sFecha');
  if (inputFecha && !inputFecha.value) {
    inputFecha.value = new Date().toISOString().split('T')[0];
  }

  // Cambiar campo de enfoque
  const selectEnfoque = document.getElementById('sEnfoque');
  const otroEnfoqueDiv = document.getElementById('otroEnfoqueDiv');
  if (selectEnfoque && otroEnfoqueDiv) {
    selectEnfoque.addEventListener('change', () => {
      otroEnfoqueDiv.style.display = selectEnfoque.value === 'Otro' ? 'block' : 'none';
    });
  }

  // Botones de progreso
  const botonesProgreso = document.querySelectorAll('.btn-progreso');
  const inputProgreso = document.getElementById('sProgreso');
  
  botonesProgreso.forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      // Desactivar todos
      botonesProgreso.forEach(b => b.classList.remove('activo'));
      // Activar el clickeado
      btn.classList.add('activo');
      // Guardar valor
      if (inputProgreso) {
        inputProgreso.value = btn.dataset.progreso;
      }
    });
  });
}
