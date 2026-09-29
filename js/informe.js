// informe.js - Generador de informes de sesiones

async function cargarDatosInforme() {
  const pieceId = new URLSearchParams(window.location.search).get('id');
  
  if (!pieceId) {
    console.error('No se encontró ID de pieza');
    return;
  }

  try {
    // Obtener pieza
    const pieza = await obtenerPiezaDB(pieceId);
    if (!pieza) {
      console.error('Pieza no encontrada');
      return;
    }

    // Obtener sesiones de esta pieza
    const sesiones = await obtenerSesionesDB();
    const sesionesFiltradasOrdenadas = sesiones
      .filter(s => s.pieceId === pieceId)
      .sort((a, b) => new Date(b.fecha) - new Date(a.fecha));

    // Generar informe
    generarTablaInforme(sesionesFiltradasOrdenadas, pieza);
    generarResumenInforme(sesionesFiltradasOrdenadas, pieza);
    generarGraficosInforme(sesionesFiltradasOrdenadas);

  } catch (error) {
    console.error('Error al cargar informe:', error);
  }
}

function generarTablaInforme(sesiones, pieza) {
  const contenedor = document.getElementById('tablaInforme');
  
  if (!contenedor) {
    console.error('No se encontró elemento tablaInforme');
    return;
  }

  if (sesiones.length === 0) {
    contenedor.innerHTML = '<p style="text-align: center; color: #999;">No hay sesiones registradas.</p>';
    return;
  }

  let html = `
    <table class="tabla-informe">
      <thead>
        <tr>
          <th>Fecha</th>
          <th>Fragmento</th>
          <th>Tiempo</th>
          <th>Progreso</th>
          <th>Enfoque</th>
          <th>Sentimientos</th>
          <th>Grabación</th>
          <th>Notas</th>
        </tr>
      </thead>
      <tbody>
  `;

  sesiones.forEach(sesion => {
    const fecha = new Date(sesion.fecha).toLocaleDateString('es-ES');
    const tiempo = formatearTiempo(sesion.tiempo);
    const progreso = sesion.progreso || '-';
    const enfoque = sesion.enfoque || '-';
    const sentimientos = (sesion.sentimientos && sesion.sentimientos.length > 0) 
      ? sesion.sentimientos.join(', ') 
      : '-';
    const grabacion = sesion.grabado ? 'Sí' : 'No';
    const notas = sesion.notas || '-';

    html += `
      <tr>
        <td>${fecha}</td>
        <td>${sesion.fragmento}</td>
        <td>${tiempo}</td>
        <td>${progreso}</td>
        <td>${enfoque}</td>
        <td>${sentimientos}</td>
        <td>${grabacion}</td>
        <td class="celda-notas">${notas}</td>
      </tr>
    `;
  });

  html += `
      </tbody>
    </table>
  `;

  contenedor.innerHTML = html;
}

function generarResumenInforme(sesiones, pieza) {
  const contenedor = document.getElementById('resumenInforme');
  
  if (!contenedor) {
    console.error('No se encontró elemento resumenInforme');
    return;
  }

  if (sesiones.length === 0) {
    contenedor.innerHTML = '';
    return;
  }

  // Calcular totales
  const totalSesiones = sesiones.length;
  const totalTiempo = sesiones.reduce((sum, s) => sum + (s.tiempo || 0), 0);
  const tiempoPromedio = Math.round(totalTiempo / totalSesiones);
  const sesionesConGrabacion = sesiones.filter(s => s.grabado).length;
  const porcentajeGrabacion = Math.round((sesionesConGrabacion / totalSesiones) * 100);

  // Contar sentimientos
  const conteoSentimientos = {};
  sesiones.forEach(sesion => {
    if (sesion.sentimientos && Array.isArray(sesion.sentimientos)) {
      sesion.sentimientos.forEach(sentimiento => {
        conteoSentimientos[sentimiento] = (conteoSentimientos[sentimiento] || 0) + 1;
      });
    }
  });

  // Contar enfoques
  const conteoEnfoques = {};
  sesiones.forEach(sesion => {
    if (sesion.enfoque) {
      conteoEnfoques[sesion.enfoque] = (conteoEnfoques[sesion.enfoque] || 0) + 1;
    }
  });

  // Fecha primera y última sesión
  const fechaPrimera = new Date(sesiones[sesiones.length - 1].fecha).toLocaleDateString('es-ES');
  const fechaUltima = new Date(sesiones[0].fecha).toLocaleDateString('es-ES');

  let html = `
    <div class="resumen-informe">
      <h3>Resumen de práctica</h3>
      
      <div class="resumen-grid">
        <div class="resumen-item">
          <span class="resumen-label">Total de sesiones</span>
          <span class="resumen-valor">${totalSesiones}</span>
        </div>
        
        <div class="resumen-item">
          <span class="resumen-label">Tiempo total</span>
          <span class="resumen-valor">${formatearTiempo(totalTiempo)}</span>
        </div>
        
        <div class="resumen-item">
          <span class="resumen-label">Tiempo promedio</span>
          <span class="resumen-valor">${formatearTiempo(tiempoPromedio)}</span>
        </div>
        
        <div class="resumen-item">
          <span class="resumen-label">Sesiones grabadas</span>
          <span class="resumen-valor">${sesionesConGrabacion} (${porcentajeGrabacion}%)</span>
        </div>
        
        <div class="resumen-item">
          <span class="resumen-label">Primera sesión</span>
          <span class="resumen-valor">${fechaPrimera}</span>
        </div>
        
        <div class="resumen-item">
          <span class="resumen-label">Última sesión</span>
          <span class="resumen-valor">${fechaUltima}</span>
        </div>
      </div>
  `;

  // Sentimientos más frecuentes
  if (Object.keys(conteoSentimientos).length > 0) {
    html += `
      <div class="resumen-seccion">
        <h4>Sentimientos durante la práctica</h4>
        <div class="resumen-lista">
    `;
    Object.entries(conteoSentimientos)
      .sort((a, b) => b[1] - a[1])
      .forEach(([sentimiento, count]) => {
        html += `<span class="badge">${sentimiento} (${count})</span>`;
      });
    html += `
        </div>
      </div>
    `;
  }

  // Enfoques principales
  if (Object.keys(conteoEnfoques).length > 0) {
    html += `
      <div class="resumen-seccion">
        <h4>Enfoques principales</h4>
        <div class="resumen-lista">
    `;
    Object.entries(conteoEnfoques)
      .sort((a, b) => b[1] - a[1])
      .forEach(([enfoque, count]) => {
        html += `<span class="badge">${enfoque} (${count})</span>`;
      });
    html += `
        </div>
      </div>
    `;
  }

  html += `</div>`;

  contenedor.innerHTML = html;
}

function generarGraficosInforme(sesiones) {
  const contenedor = document.getElementById('graficosInforme');
  
  if (!contenedor || sesiones.length === 0) {
    if (contenedor) contenedor.innerHTML = '';
    return;
  }

  // Gráfico 1: Tiempo por sesión (últimas 10)
  const ultimas10 = sesiones.slice(0, 10).reverse();
  const tiemposGrafico1 = ultimas10.map(s => formatearTiempo(s.tiempo));
  const fechasGrafico1 = ultimas10.map(s => new Date(s.fecha).toLocaleDateString('es-ES', { month: 'short', day: 'numeric' }));

  // Gráfico 2: Progreso acumulado
  let tiempoAcumulado = 0;
  const tiemposAcumulados = sesiones.reverse().map(s => {
    tiempoAcumulado += s.tiempo || 0;
    return tiempoAcumulado;
  });
  const fechasAcumuladas = sesiones.map(s => new Date(s.fecha).toLocaleDateString('es-ES', { month: 'short', day: 'numeric' }));

  let html = `
    <div class="graficos-informe">
      <h3>Gráficos de práctica</h3>
      
      <div class="grafico-contenedor">
        <h4>Tiempo por sesión (últimas 10)</h4>
        <canvas id="canvasGrafico1" class="canvas-informe"></canvas>
      </div>
      
      <div class="grafico-contenedor">
        <h4>Tiempo acumulado</h4>
        <canvas id="canvasGrafico2" class="canvas-informe"></canvas>
      </div>
    </div>
  `;

  contenedor.innerHTML = html;

  // Renderizar gráficos con Chart.js (si está disponible)
  // Si no tienes Chart.js, te lo diré en el siguiente paso
  setTimeout(() => {
    if (typeof Chart !== 'undefined') {
      crearGrafico1(fechasGrafico1, tiemposGrafico1);
      crearGrafico2(fechasAcumuladas, tiemposAcumulados);
    }
  }, 100);
}

function crearGrafico1(labels, datos) {
  const ctx = document.getElementById('canvasGrafico1');
  if (!ctx) return;

  new Chart(ctx, {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [{
        label: 'Minutos de práctica',
        data: datos.map(t => parseInt(t.split(' ')[2]) || 0), // Extrae segundos (simplificado)
        backgroundColor: '#6bd4f3',
        borderColor: '#4a9fd8',
        borderWidth: 1
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      scales: {
        y: {
          beginAtZero: true
        }
      }
    }
  });
}

function crearGrafico2(labels, datos) {
  const ctx = document.getElementById('canvasGrafico2');
  if (!ctx) return;

  new Chart(ctx, {
    type: 'line',
    data: {
      labels: labels,
      datasets: [{
        label: 'Tiempo acumulado (segundos)',
        data: datos,
        borderColor: '#6bd4f3',
        backgroundColor: 'rgba(107, 212, 243, 0.1)',
        borderWidth: 2,
        fill: true,
        tension: 0.4
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      scales: {
        y: {
          beginAtZero: true
        }
      }
    }
  });
}

function descargarPDFInforme(nombrePieza) {
  // Esta función usa jsPDF y html2canvas para generar PDF
  // Te lo explicaré en el siguiente paso
  
  const elemento = document.getElementById('contenidoInforme');
  
  if (!elemento) {
    alert('No se encontró el contenido del informe');
    return;
  }

  // Verificar si jsPDF está disponible
  if (typeof html2pdf === 'undefined') {
    alert('No se puede descargar PDF. Falta la librería html2pdf.');
    return;
  }

  const opciones = {
    margin: 10,
    filename: `Informe-${nombrePieza}-${new Date().toISOString().split('T')[0]}.pdf`,
    image: { type: 'jpeg', quality: 0.98 },
    html2canvas: { scale: 2 },
    jsPDF: { orientation: 'portrait', unit: 'mm', format: 'a4' }
  };

  html2pdf().set(opciones).from(elemento).save();
}

function formatearTiempo(segundos) {
  if (!segundos || segundos === 0) return '0h 0m 0s';
  
  const horas = Math.floor(segundos / 3600);
  const minutos = Math.floor((segundos % 3600) / 60);
  const segs = segundos % 60;
  
  return `${horas}h ${minutos}m ${segs}s`;
}
