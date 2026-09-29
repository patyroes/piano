'use strict';

(function() {
  if (Util.vista() !== 'detalle') return;

  const el = function(id) { return document.getElementById(id); };
  el('vistaDetalle').classList.remove('oculto');

  const CAMPOS = ['titulo', 'compositor', 'tonalidad', 'compas', 'extension', 'inicio', 'estructura', 'dificiles', 'acompanamiento'];
  const PROGRESO = { proceso: '🔴 En proceso', mejor: '🟡 Sale mejor', dominado: '🟢 Dominado' };

  const idPieza = Util.parametro('id');
  let pieza = null;
  let fragmentos = [];

  function formatearTiempo(segundos) {
    const horas = Math.floor(segundos / 3600);
    const minutos = Math.floor((segundos % 3600) / 60);
    const segs = segundos % 60;
    return horas + 'h ' + minutos + 'm ' + segs + 's';
  }

  function pintarFragmentos() {
    el('sinFragmentos').classList.toggle('oculto', fragmentos.length > 0);
    let html = '';
    for (let i = 0; i < fragmentos.length; i++) {
      const f = fragmentos[i];
      html += '<li class="fragmento"><span class="fragmento__compases">' + Util.escapar(f.compases || '—') + '</span><span class="fragmento__nombre">' + Util.escapar(f.nombre) + '</span><button type="button" class="btn btn--mini btn--peligro" data-quitar="' + Util.escapar(f.id) + '">Quitar</button></li>';
    }
    el('listaFragmentos').innerHTML = html;
  }

  function anadirFragmento() {
    const compases = el('nuevoCompases').value.trim();
    const nombre = el('nuevoNombre').value.trim();
    if (!compases && !nombre) {
      el('nuevoCompases').focus();
      return;
    }
    fragmentos.push({ id: Store.uid(), compases: compases, nombre: nombre });
    el('nuevoCompases').value = '';
    el('nuevoNombre').value = '';
    el('nuevoCompases').focus();
    pintarFragmentos();
  }

  el('btnAnadirFragmento').addEventListener('click', anadirFragmento);

  el('nuevoCompases').addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
      e.preventDefault();
      anadirFragmento();
    }
  });

  el('nuevoNombre').addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
      e.preventDefault();
      anadirFragmento();
    }
  });

  el('listaFragmentos').addEventListener('click', function(e) {
    const btn = e.target.closest('[data-quitar]');
    if (!btn) return;
    const id = btn.getAttribute('data-quitar');
    const nuevos = [];
    for (let i = 0; i < fragmentos.length; i++) {
      if (fragmentos[i].id !== id) {
        nuevos.push(fragmentos[i]);
      }
    }
    fragmentos = nuevos;
    pintarFragmentos();
  });

  function cargarPieza() {
    return (async function() {
      try {
        if (idPieza) {
          pieza = await Store.obtener(idPieza);
        }
      } catch (err) {
        console.error(err);
        alert('Error al abrir la base de datos');
        return;
      }

      if (idPieza && !pieza) {
        alert('Esa pieza ya no existe');
        location.replace('index.html');
        return;
      }

      if (pieza) {
        fragmentos = pieza.fragmentos ? pieza.fragmentos.slice() : [];
        document.title = Util.escapar(pieza.titulo || 'Sin título') + ' · Guía de práctica';
        for (let i = 0; i < CAMPOS.length; i++) {
          const input = el(CAMPOS[i]);
          if (input && pieza[CAMPOS[i]]) {
            input.value = pieza[CAMPOS[i]];
          }
        }
        pintarFragmentos();
        el('btnBorrarPieza').classList.remove('oculto');
        el('sesionesBloqueadas').classList.add('oculto');
        el('zonaSesiones').classList.remove('oculto');
      } else {
        document.title = 'Nueva pieza · Guía de práctica';
        el('inicio').value = Util.hoy();
        el('sesionesBloqueadas').classList.remove('oculto');
        el('zonaSesiones').classList.add('oculto');
      }

      inicializarTemporizador();
      await mostrarTiempoTotal();
      await mostrarHistorial();
    })();
  }

  let tiempoSesionActual = 0;
  let intervalo = null;

  function actualizarDisplay() {
    el('tiempoDisplay').textContent = formatearTiempo(tiempoSesionActual);
  }

  function inicializarTemporizador() {
    el('btnIniciar').addEventListener('click', function() {
      if (intervalo) return;
      el('btnIniciar').classList.add('oculto');
      el('btnPausar').classList.remove('oculto');
      el('btnDetener').classList.remove('oculto');
      intervalo = setInterval(function() {
        tiempoSesionActual++;
        actualizarDisplay();
      }, 1000);
    });

    el('btnPausar').addEventListener('click', function() {
      if (intervalo) {
        clearInterval(intervalo);
        intervalo = null;
      }
      el('btnPausar').classList.add('oculto');
      el('btnIniciar').classList.remove('oculto');
    });

    el('btnDetener').addEventListener('click', function() {
      if (intervalo) {
        clearInterval(intervalo);
        intervalo = null;
      }
      el('btnDetener').classList.add('oculto');
      el('btnIniciar').classList.remove('oculto');
      el('btnPausar').classList.add('oculto');
    });

    actualizarDisplay();
  }

  async function mostrarTiempoTotal() {
    if (!pieza) {
      el('cuadroTiempo').classList.add('oculto');
      return;
    }
    try {
      const sesiones = await Sesiones.dePieza(pieza.id);
      let tiempoTotal = 0;
      for (let i = 0; i < sesiones.length; i++) {
        tiempoTotal += sesiones[i].tiempo || 0;
      }
      el('tiempoTotalPieza').textContent = formatearTiempo(tiempoTotal);
      el('cuadroTiempo').classList.remove('oculto');
    } catch (err) {
      el('cuadroTiempo').classList.add('oculto');
    }
  }

  async function mostrarHistorial() {
    if (!pieza) return;
    try {
      const sesiones = await Sesiones.dePieza(pieza.id);
      if (sesiones.length === 0) {
        el('sinSesiones').classList.remove('oculto');
        el('listaSesiones').innerHTML = '';
        return;
      }
      el('sinSesiones').classList.add('oculto');
      let html = '';
      for (let i = 0; i < sesiones.length; i++) {
        const s = sesiones[i];
        let frag = null;
        for (let j = 0; j < fragmentos.length; j++) {
          if (fragmentos[j].id === s.fragmentoId) {
            frag = fragmentos[j];
            break;
          }
        }
        const nombreFragmento = frag ? Util.escapar(frag.nombre || frag.compases) : 'Fragmento eliminado';
        const progreso = PROGRESO[s.progreso] || '?';
        const tiempoSesion = formatearTiempo(s.tiempo || 0);
        html += '<li class="sesion"><div class="sesion__cabecera"><strong>' + Util.escapar(s.fecha || '?') + '</strong> — ' + nombreFragmento + '</div><div class="sesion__detalles"><span>' + progreso + '</span><span>Enfoque: ' + Util.escapar(s.enfoque || '—') + '</span><span>Sentimiento: ' + Util.escapar(s.sentimiento || '—') + '</span><span>Tiempo: ' + tiempoSesion + '</span>' + (s.grabacion ? '<span>Grabado</span>' : '') + (s.notas ? '<span>Notas: ' + Util.escapar(s.notas) + '</span>' : '') + '</div><button type="button" class="btn btn--mini btn--peligro" data-borrar-sesion="' + Util.escapar(s.id) + '">Borrar sesión</button></li>';
      }
      el('listaSesiones').innerHTML = html;
      
      el('listaSesiones').addEventListener('click', function(e) {
        const btn = e.target.closest('[data-borrar-sesion]');
        if (!btn) return;
        const sesionId = btn.getAttribute('data-borrar-sesion');
        if (!confirm('¿Borrar esta sesión?')) return;
        (async function() {
          try {
            await Sesiones.borrar(sesionId);
            Util.aviso('Sesión borrada');
            await mostrarHistorial();
            await mostrarTiempoTotal();
          } catch (err) {
            console.error(err);
            Util.aviso('No se ha podido borrar la sesión', 'error');
          }
        })();
      });
    } catch (err) {
      console.error(err);
    }
  }

  const form = el('formPieza');
  const btnGuardar = form.querySelector('button[type="submit"]');

  btnGuardar.addEventListener('click', function(e) {
    e.preventDefault();
    (async function() {
      try {
        const datos = { fragmentos: fragmentos };
        for (let i = 0; i < CAMPOS.length; i++) {
          const input = el(CAMPOS[i]);
          if (input) {
            datos[CAMPOS[i]] = input.value.trim();
          }
        }
        if (!datos.titulo) {
          alert('Debes poner un título');
          el('titulo').focus();
          return;
        }
        if (pieza) {
          datos.id = pieza.id;
        }
        pieza = await Store.guardar(datos);
        el('btnBorrarPieza').classList.remove('oculto');
        el('sesionesBloqueadas').classList.add('oculto');
        el('zonaSesiones').classList.remove('oculto');
        await mostrarTiempoTotal();
        Util.aviso('Pieza guardada');
      } catch (err) {
        console.error(err);
        Util.aviso('No se ha podido guardar', 'error');
      }
    })();
  });

  el('btnBorrarPieza').addEventListener('click', function(e) {
    e.preventDefault();
    if (!pieza) {
      alert('No hay pieza que borrar');
      return;
    }
    if (!confirm('¿Borrar esta pieza?')) {
      return;
    }
    (async function() {
      try {
        await Store.borrar(pieza.id);
        Util.aviso('Pieza borrada');
        setTimeout(function() {
          location.replace('index.html');
        }, 1500);
      } catch (err) {
        console.error(err);
        Util.aviso('No se ha podido borrar', 'error');
      }
    })();
  });

  const formSesion = el('formSesion');

  el('btnNuevaSesion').addEventListener('click', function() {
    formSesion.classList.remove('oculto');
    el('sFecha').value = Util.hoy();
    let html = '<option value="">— Elige fragmento —</option>';
    for (let i = 0; i < fragmentos.length; i++) {
      const f = fragmentos[i];
      html += '<option value="' + Util.escapar(f.id) + '">' + Util.escapar(f.nombre || f.compases || 'Sin nombre') + '</option>';
    }
    el('sFragmento').innerHTML = html;
  });

  el('btnCancelarSesion').addEventListener('click', function() {
    formSesion.classList.add('oculto');
    formSesion.reset();
    tiempoSesionActual = 0;
    actualizarDisplay();
  });

  el('sEnfoque').addEventListener('change', function() {
    el('campoEnfoqueOtro').classList.toggle('oculto', this.value !== 'otro');
  });

  const btnGuardarSesion = formSesion.querySelector('button[type="submit"]');

  btnGuardarSesion.addEventListener('click', function(e) {
    e.preventDefault();
    (async function() {
      if (!pieza) {
        alert('Guarda la pieza primero');
        return;
      }
      const fragmentoId = el('sFragmento').value;
      if (!fragmentoId) {
        alert('Elige un fragmento');
        return;
      }
      try {
        const progreso = document.querySelector('input[name="sProgreso"]:checked').value;
        const sentimientos = [];
        const checkboxes = document.querySelectorAll('input[name="sSentir"]:checked');
        for (let i = 0; i < checkboxes.length; i++) {
          sentimientos.push(checkboxes[i].value);
        }
        let enfoque = el('sEnfoque').value;
        if (enfoque === 'otro') {
          enfoque = el('sEnfoqueOtro').value.trim();
        }
        const sesion = {
          piezaId: pieza.id,
          fragmentoId: fragmentoId,
          fecha: el('sFecha').value || Util.hoy(),
          progreso: progreso,
          enfoque: enfoque,
          sentimiento: sentimientos.join(', '),
          grabacion: el('sGrabado').checked,
          notas: el('sNotas').value.trim(),
          tiempo: tiempoSesionActual
        };
        await Sesiones.guardar(sesion);
        formSesion.classList.add('oculto');
        formSesion.reset();
        el('sFecha').value = Util.hoy();
        tiempoSesionActual = 0;
        actualizarDisplay();
        el('btnIniciar').classList.remove('oculto');
        el('btnPausar').classList.add('oculto');
        el('btnDetener').classList.add('oculto');
        await mostrarHistorial();
        await mostrarTiempoTotal();
        Util.aviso('Sesión guardada');
      } catch (err) {
        console.error(err);
        Util.aviso('No se ha podido guardar la sesión', 'error');
      }
    })();
  });

  cargarPieza();
})();
