'use strict';

const DB = (function() {
  const NOMBRE = 'pianoDB';
  const VERSION = 1;
  let conexion = null;

  function abrir() {
    if (conexion) return conexion;
    conexion = new Promise(function(resolve, reject) {
      const peticion = indexedDB.open(NOMBRE, VERSION);
      peticion.onupgradeneeded = function() {
        const db = peticion.result;
        if (!db.objectStoreNames.contains('piezas')) {
          const piezas = db.createObjectStore('piezas', { keyPath: 'id' });
          piezas.createIndex('titulo', 'titulo');
        }
        if (!db.objectStoreNames.contains('sesiones')) {
          const sesiones = db.createObjectStore('sesiones', { keyPath: 'id' });
          sesiones.createIndex('piezaId', 'piezaId');
        }
      };
      peticion.onsuccess = function() { resolve(peticion.result); };
      peticion.onerror = function() { reject(peticion.error); };
    });
    return conexion;
  }

  function pedir(peticion) {
    return new Promise(function(resolve, reject) {
      peticion.onsuccess = function() { resolve(peticion.result); };
      peticion.onerror = function() { reject(peticion.error); };
    });
  }

  function terminar(t) {
    return new Promise(function(resolve, reject) {
      t.oncomplete = function() { resolve(); };
      t.onerror = function() { reject(t.error); };
    });
  }

  function uid() {
    return Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 7);
  }

  return { abrir: abrir, pedir: pedir, terminar: terminar, uid: uid };
})();

const Store = {
  uid: DB.uid,

  todas: function() {
    return (async function() {
      const db = await DB.abrir();
      const piezas = await DB.pedir(db.transaction('piezas').objectStore('piezas').getAll());
      return piezas.sort(function(a, b) {
        return (a.titulo || '').localeCompare(b.titulo || '', 'es');
      });
    })();
  },

  obtener: function(id) {
    return (async function() {
      const db = await DB.abrir();
      const pieza = await DB.pedir(db.transaction('piezas').objectStore('piezas').get(id));
      return pieza || null;
    })();
  },

  guardar: function(pieza) {
    return (async function() {
      const db = await DB.abrir();
      const t = db.transaction('piezas', 'readwrite');
      const almacen = t.objectStore('piezas');
      const ahora = new Date().toISOString();
      let guardada;
      if (pieza.id) {
        const previa = await DB.pedir(almacen.get(pieza.id));
        guardada = previa ? Object.assign({}, previa, pieza, { actualizado: ahora }) : Object.assign({}, pieza, { creado: ahora, actualizado: ahora });
      } else {
        guardada = Object.assign({}, pieza, { id: DB.uid(), creado: ahora, actualizado: ahora });
      }
      almacen.put(guardada);
      await DB.terminar(t);
      return guardada;
    })();
  },

  borrar: function(id) {
    return (async function() {
      const db = await DB.abrir();
      const t = db.transaction(['piezas', 'sesiones'], 'readwrite');
      t.objectStore('piezas').delete(id);
      const sesiones = t.objectStore('sesiones');
      const cursor = sesiones.index('piezaId').openKeyCursor(IDBKeyRange.only(id));
      cursor.onsuccess = function() {
        const c = cursor.result;
        if (c) { sesiones.delete(c.primaryKey); c.continue(); }
      };
      await DB.terminar(t);
      return true;
    })();
  }
};

const Sesiones = {
  dePieza: function(piezaId) {
    return (async function() {
      const db = await DB.abrir();
      const lista = await DB.pedir(db.transaction('sesiones').objectStore('sesiones').index('piezaId').getAll(IDBKeyRange.only(piezaId)));
      return lista.sort(function(a, b) { return (b.fecha || '').localeCompare(a.fecha || ''); });
    })();
  },

  guardar: function(sesion) {
    return (async function() {
      const db = await DB.abrir();
      const registro = Object.assign({}, sesion, { id: sesion.id || DB.uid(), actualizado: new Date().toISOString() });
      const t = db.transaction('sesiones', 'readwrite');
      t.objectStore('sesiones').put(registro);
      await DB.terminar(t);
      return registro;
    })();
  },

  borrar: function(id) {
    return (async function() {
      const db = await DB.abrir();
      const t = db.transaction('sesiones', 'readwrite');
      t.objectStore('sesiones').delete(id);
      await DB.terminar(t);
      return true;
    })();
  }
};

const Util = {
  parametro: function(nombre) {
    return new URLSearchParams(location.search).get(nombre);
  },

  vista: function() {
    const p = new URLSearchParams(location.search);
    return (p.has('id') || p.has('nueva')) ? 'detalle' : 'lista';
  },

  hoy: function() {
    const d = new Date();
    return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
  },

  escapar: function(v) {
    const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
    return String(v || '').replace(/[&<>"']/g, function(c) { return map[c]; });
  },

  aviso: function(texto, tipo) {
    const el = document.createElement('div');
    el.className = 'aviso' + (tipo === 'error' ? ' aviso--error' : '');
    el.textContent = texto;
    document.body.appendChild(el);
    setTimeout(function() { el.remove(); }, 2800);
  }
};
