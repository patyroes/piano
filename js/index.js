'use strict';

(function() {
  if (Util.vista() !== 'lista') return;

  const el = function(id) { return document.getElementById(id); };
  el('vistaLista').classList.remove('oculto');
  document.title = 'Mis piezas · Guía de práctica';

  const ESTADOS = {
    proceso:  { texto: 'En proceso', clase: 'badge--proceso'  },
    mejor:    { texto: 'Sale mejor', clase: 'badge--mejor'    },
    dominado: { texto: 'Dominado',   clase: 'badge--dominado' }
  };

  function formatearTiempo(segundos) {
    const horas = Math.floor(segundos / 3600);
    const minutos = Math.floor((segundos % 3600) / 60);
    const segs = segundos % 60;
    return horas + 'h ' + minutos + 'm ' + segs + 's';
  }

  (async function() {
    let piezas, sesionesPorPieza;
    try {
      piezas = await Store.todas();
      const promesas = [];
      for (let i = 0; i < piezas.length; i++) {
        promesas.push(Sesiones.dePieza(piezas[i].id));
      }
      sesionesPorPieza = await Promise.all(promesas);
    } catch (err) {
      console.error(err);
      alert('No se ha podido abrir la base de datos');
      return;
    }

    const n = piezas.length;
    el('contador').textContent = n === 0 ? '' : n + ' pieza' + (n === 1 ? '' : 's') + ' en estudio';

    if (n === 0) {
      el('mensajeVacio').classList.remove('oculto');
      return;
    }

    // Crear array con piezas y sus sesiones para ordenar
    const piezasConSesiones = [];
    for (let i = 0; i < piezas.length; i++) {
      piezasConSesiones.push({
        pieza: piezas[i],
        sesiones: sesionesPorPieza[i]
      });
    }

    // Ordenar por fecha de última sesión (más recientes primero)
    piezasConSesiones.sort(function(a, b) {
      const fechaA = a.sesiones[0] ? a.sesiones[0].fecha : '';
      const fechaB = b.sesiones[0] ? b.sesiones[0].fecha : '';
      return fechaB.localeCompare(fechaA);
    });

    let html = '';
    for (let i = 0; i < piezasConSesiones.length; i++) {
      const p = piezasConSesiones[i].pieza;
      const sesiones = piezasConSesiones[i].sesiones;
      const ultima = sesiones[0];
      const estado = ultima && ESTADOS[ultima.progreso];

      let tiempoPieza = 0;
      for (let j = 0; j < sesiones.length; j++) {
        tiempoPieza += sesiones[j].tiempo || 0;
      }

      const etiqueta = estado
        ? '<span class="badge ' + estado.clase + '">' + estado.texto + '</span>'
        : '<span class="badge badge--neutro">Sin sesiones</span>';

      const numFrag = (p.fragmentos || []).length;
      const meta = [
        p.tonalidad,
        p.compas,
        numFrag ? numFrag + ' fragmento' + (numFrag === 1 ? '' : 's') : '',
        sesiones.length + ' sesion' + (sesiones.length === 1 ? '' : 'es'),
        'Tiempo: ' + formatearTiempo(tiempoPieza)
      ];

      let metaHtml = '';
      for (let j = 0; j < meta.length; j++) {
        if (meta[j]) {
          metaHtml += '<span>' + Util.escapar(meta[j]) + '</span>';
        }
      }

      html += '<li class="pieza">' +
        '<div class="pieza__info">' +
          '<h2 class="pieza__titulo">' + Util.escapar(p.titulo || 'Sin título') + '</h2>' +
          (p.compositor ? '<p class="pieza__compositor">' + Util.escapar(p.compositor) + '</p>' : '') +
          '<p class="pieza__meta">' + metaHtml + '</p>' +
        '</div>' +
        '<div class="pieza__estado">' +
          etiqueta +
          '<a class="btn btn--mini" href="index.html?id=' + encodeURIComponent(p.id) + '">Abrir</a>' +
        '</div>' +
      '</li>';
    }

    el('listaPiezas').innerHTML = html;

    el('btnExportar').addEventListener('click', function() {
      (async function() {
        try {
          const piezas = await Store.todas();
          let todasLasSesiones = [];
          for (let i = 0; i < piezas.length; i++) {
            const sesiones = await Sesiones.dePieza(piezas[i].id);
            todasLasSesiones = todasLasSesiones.concat(sesiones);
          }
          const datos = {
            exportado: new Date().toISOString(),
            piezas: piezas,
            sesiones: todasLasSesiones
          };
          const contenido = JSON.stringify(datos, null, 2);
          const blob = new Blob([contenido], { type: 'application/json' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = 'piano-backup-' + new Date().toISOString().slice(0, 10) + '.json';
          document.body.appendChild(a);
          a.click();
          a.remove();
          URL.revokeObjectURL(url);
          Util.aviso('Datos exportados');
        } catch (err) {
          console.error(err);
          Util.aviso('No se ha podido exportar', 'error');
        }
      })();
    });

    el('btnImportar').addEventListener('change', function(e) {
      const fichero = e.target.files[0];
      if (!fichero) return;
      (async function() {
        try {
          const texto = await fichero.text();
          const datos = JSON.parse(texto);
          if (!Array.isArray(datos.piezas) || !Array.isArray(datos.sesiones)) {
            throw new Error('Formato incorrecto');
          }
          for (let i = 0; i < datos.piezas.length; i++) {
            const pieza = datos.piezas[i];
            delete pieza.creado;
            delete pieza.actualizado;
            await Store.guardar(pieza);
          }
          for (let i = 0; i < datos.sesiones.length; i++) {
            const sesion = datos.sesiones[i];
            delete sesion.actualizado;
            await Sesiones.guardar(sesion);
          }
          Util.aviso('Importado');
          setTimeout(function() { location.reload(); }, 1500);
        } catch (err) {
          console.error(err);
          Util.aviso('Error al importar', 'error');
        }
        e.target.value = '';
      })();
    });
  })();
})();
