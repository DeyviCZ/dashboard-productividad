/* ==========================
   REFERENCIAS DOM
========================== */
const btnModoOscuro = document.getElementById("btn-modo-oscuro");
const btnAgregarTarea = document.getElementById("btn-agregar-tarea");
const btnIniciar = document.getElementById("btn-iniciar");
const btnPausar = document.getElementById("btn-pausar");
const btnReiniciar = document.getElementById("btn-reiniciar");
const tiempoRestanteEl = document.getElementById("tiempo-restante");

const modal = document.getElementById("modal-tarea");
const btnCerrarModal = document.getElementById("btn-cerrar-modal");
const btnCancelar = document.getElementById("btn-cancelar");
const formulario = document.querySelector(".formulario-tarea");

const tituloTarea = document.getElementById("titulo-tarea");
const descripcionTarea = document.getElementById("descripcion-tarea");
const prioridadTarea = document.getElementById("prioridad-tarea");
const fechaLimite = document.getElementById("fecha-limite");

const listaTareas = document.getElementById("lista-tareas");

/* ==========================
   CLASE PRINCIPAL
========================== */
class DashboardProductividad {
  constructor() {
    this.tareas = this.cargarTareas();
    this.sesionesCompletadas =
      Number(localStorage.getItem("sesionesCompletadas")) || 0;
    this.tiempoEnfocado = Number(localStorage.getItem("tiempoEnfocado")) || 0;
    this.modoOscuro = localStorage.getItem("modoOscuro") === "true";

    this.rachaActual = Number(localStorage.getItem("rachaActual")) || 0;
    this.ultimaSesionFecha = localStorage.getItem("ultimaSesionFecha");

    this.temporizador = {
      activo: false,
      tiempoRestante: 25 * 60,
      modo: "trabajo",
      intervalo: null,
    };

    this.progresoSemanal = JSON.parse(
      localStorage.getItem("progresoSemanal")
    ) || {
      Lun: 0,
      Mar: 0,
      Mie: 0,
      Jue: 0,
      Vie: 0,
      Sab: 0,
      Dom: 0,
    };

    this.inicializar();
  }

  inicializar() {
    this.configurarEventos();
    this.actualizarInterfaz();
    this.aplicarModoOscuro();
    this.actualizarDisplayTemporizador();
  }

  /* ======================
     EVENTOS
  ====================== */
  configurarEventos() {
    btnModoOscuro.addEventListener("click", () => this.toggleModoOscuro());

    btnAgregarTarea.addEventListener("click", () =>
      modal.classList.add("visible")
    );

    [btnCerrarModal, btnCancelar].forEach((btn) => {
      btn.addEventListener("click", () => this.cerrarModal());
    });

    modal.addEventListener("click", (e) => {
      if (e.target === modal) this.cerrarModal();
    });

    formulario.addEventListener("submit", (e) => {
      e.preventDefault();
      if (!tituloTarea.value.trim()) return;

      this.agregarTarea({
        titulo: tituloTarea.value.trim(),
        descripcion: descripcionTarea.value.trim(),
        prioridad: prioridadTarea.value,
        fechaLimite: fechaLimite.value || null,
      });

      this.cerrarModal();
    });

    document.querySelectorAll(".filtros-tareas button").forEach((btn) => {
      btn.addEventListener("click", () => {
        document
          .querySelectorAll(".filtros-tareas button")
          .forEach((b) => b.classList.remove("filtro-activo"));

        btn.classList.add("filtro-activo");
        this.actualizarListaTareas(btn.dataset.filtro);
      });
    });

    btnIniciar.addEventListener("click", () => this.iniciarTemporizador());
    btnPausar.addEventListener("click", () => this.pausarTemporizador());
    btnReiniciar.addEventListener("click", () => this.reiniciarTemporizador());

    document.querySelectorAll("[data-modo]").forEach((btn) => {
      btn.addEventListener("click", () =>
        this.cambiarModoTemporizador(btn.dataset.modo)
      );
    });
  }

  cerrarModal() {
    modal.classList.remove("visible");
    formulario.reset();
  }

  /* ======================
     TAREAS
  ====================== */
  agregarTarea(data) {
    this.tareas.push({
      id: Date.now(),
      completada: false,
      fechaCreacion: new Date().toISOString(),
      ...data,
    });

    this.guardarTareas();
    this.actualizarInterfaz();
  }

  completarTarea(id) {
    const tarea = this.tareas.find((t) => t.id === id);
    if (!tarea) return;
    tarea.completada = true;
    this.guardarTareas();
    this.actualizarInterfaz();
  }

  eliminarTarea(id) {
    this.tareas = this.tareas.filter((t) => t.id !== id);
    this.guardarTareas();
    this.actualizarInterfaz();
  }

  /* ======================
     INTERFAZ
  ====================== */
  actualizarInterfaz() {
    this.actualizarEstadisticas();
    this.actualizarListaTareas();
    this.actualizarProgresoSemanal();
  }

  actualizarListaTareas(filtro = "todas") {
    listaTareas.innerHTML = "";

    let tareas = this.tareas;
    if (filtro === "pendientes") tareas = tareas.filter((t) => !t.completada);
    if (filtro === "completadas") tareas = tareas.filter((t) => t.completada);

    if (!tareas.length) {
      listaTareas.innerHTML = `
        <div class="empty-state">
          <p>🎯 No hay tareas en esta categoría.</p>
        </div>`;
      return;
    }

    tareas.forEach((t) => listaTareas.appendChild(crearElementoTarea(t)));
  }

  actualizarEstadisticas() {
    document.getElementById("tareas-completadas").textContent =
      this.tareas.filter((t) => t.completada).length;

    document.getElementById(
      "tiempo-enfocado"
    ).textContent = `${this.tiempoEnfocado}m`;

    document.getElementById("sesiones-hoy").textContent =
      this.sesionesCompletadas;

    document.getElementById("racha-actual").textContent = this.rachaActual;
  }

  actualizarProgresoSemanal() {
    const hoy = ["Dom", "Lun", "Mar", "Mie", "Jue", "Vie", "Sab"][
      new Date().getDay()
    ];

    const max = Math.max(...Object.values(this.progresoSemanal), 1);

    document.querySelectorAll(".barra-dia").forEach((barra) => {
      const dia = barra.dataset.dia;
      barra.classList.toggle("activo", dia === hoy);
      const valor = this.progresoSemanal[dia] || 0;
      const porcentaje = (valor / max) * 100;

      const altura = valor === 0 ? 2 : porcentaje;
      barra.querySelector(".barra-progreso").style.height = `${altura}%`;
    });
  }

  /* ======================
     TEMPORIZADOR
  ====================== */
  iniciarTemporizador() {
    if (this.temporizador.activo) return;

    this.temporizador.activo = true;
    this.actualizarBotonesTemporizador();

    this.temporizador.intervalo = setInterval(() => {
      this.temporizador.tiempoRestante--;
      this.actualizarDisplayTemporizador();

      if (this.temporizador.tiempoRestante <= 0) {
        this.completarSesion();
      }
    }, 1000);
  }

  pausarTemporizador() {
    clearInterval(this.temporizador.intervalo);
    this.temporizador.activo = false;
    this.actualizarBotonesTemporizador();
  }

  reiniciarTemporizador() {
    this.pausarTemporizador();
    this.temporizador.tiempoRestante =
      this.temporizador.modo === "trabajo" ? 25 * 60 : 5 * 60;
    this.actualizarDisplayTemporizador();
  }

  cambiarModoTemporizador(modo) {
    this.temporizador.modo = modo;
    this.reiniciarTemporizador();

    document
      .querySelectorAll("[data-modo]")
      .forEach((btn) =>
        btn.classList.toggle("modo-activo", btn.dataset.modo === modo)
      );
  }

  completarSesion() {
    console.log("Modo actual:", this.temporizador.modo);
    this.pausarTemporizador();

    const ahora = new Date();
    const hoy = ahora.toDateString();
    const ayer = new Date(ahora);
    ayer.setDate(ayer.getDate() - 1);

    if (this.temporizador.modo === "trabajo") {
      /* ======================
       SESIONES Y TIEMPO
    ====================== */
      this.sesionesCompletadas++;
      this.tiempoEnfocado += 25;

      /* ======================
       RACHA ACTUAL
    ====================== */
      if (this.ultimaSesionFecha !== hoy) {
        if (
          this.ultimaSesionFecha === ayer.toDateString() ||
          !this.ultimaSesionFecha
        ) {
          this.rachaActual++;
        } else {
          this.rachaActual = 1;
        }
        this.ultimaSesionFecha = hoy;
      }

      /* ======================
       PROGRESO SEMANAL
    ====================== */
      const dias = ["Dom", "Lun", "Mar", "Mie", "Jue", "Vie", "Sab"];
      const diaHoy = dias[ahora.getDay()];

      this.progresoSemanal[diaHoy] = (this.progresoSemanal[diaHoy] || 0) + 1;

      /* ======================
       PERSISTENCIA
    ====================== */
      localStorage.setItem("sesionesCompletadas", this.sesionesCompletadas);
      localStorage.setItem("tiempoEnfocado", this.tiempoEnfocado);
      localStorage.setItem("rachaActual", this.rachaActual);
      localStorage.setItem("ultimaSesionFecha", this.ultimaSesionFecha);
      localStorage.setItem(
        "progresoSemanal",
        JSON.stringify(this.progresoSemanal)
      );

      /* ======================
       FEEDBACK
    ====================== */
      mostrarNotificacion("✅ Sesión de trabajo completada");
      this.cambiarModoTemporizador("descanso");
    } else {
      mostrarNotificacion("☕ Descanso finalizado");
      this.cambiarModoTemporizador("trabajo");
    }

    this.actualizarInterfaz();
  }

  actualizarDisplayTemporizador() {
    const m = Math.floor(this.temporizador.tiempoRestante / 60);
    const s = this.temporizador.tiempoRestante % 60;
    tiempoRestanteEl.textContent = `${String(m).padStart(2, "0")}:${String(
      s
    ).padStart(2, "0")}`;
  }

  actualizarBotonesTemporizador() {
    btnIniciar.disabled = this.temporizador.activo;
    btnPausar.disabled = !this.temporizador.activo;
  }

  /* ======================
     MODO OSCURO
  ====================== */
  toggleModoOscuro() {
    this.modoOscuro = !this.modoOscuro;
    localStorage.setItem("modoOscuro", this.modoOscuro);
    this.aplicarModoOscuro();
  }

  aplicarModoOscuro() {
    document.body.classList.toggle("modo-oscuro", this.modoOscuro);
    btnModoOscuro.textContent = this.modoOscuro ? "☀️" : "🌙";
  }

  /* ======================
     STORAGE
  ====================== */
  cargarTareas() {
    return JSON.parse(localStorage.getItem("tareas")) || [];
  }

  guardarTareas() {
    localStorage.setItem("tareas", JSON.stringify(this.tareas));
  }
}

/* ==========================
   UTILIDADES
========================== */
function crearElementoTarea(tarea) {
  const div = document.createElement("div");
  div.className = `item-tarea ${tarea.completada ? "completada" : ""}`;

  div.innerHTML = `
    <div class="contenido-tarea">
      <input type="checkbox" ${tarea.completada ? "checked" : ""}>
      <div>
        <strong>${tarea.titulo}</strong>
        ${tarea.descripcion ? `<p>${tarea.descripcion}</p>` : ""}
      </div>
    </div>
    <button>🗑️</button>
  `;

  div.querySelector("input").addEventListener("change", () => {
    dashboard.completarTarea(tarea.id);
  });

  div.querySelector("button").addEventListener("click", () => {
    if (confirm("¿Eliminar tarea?")) dashboard.eliminarTarea(tarea.id);
  });

  return div;
}

function mostrarNotificacion(msg) {
  const n = document.createElement("div");
  n.className = "notificacion visible";
  n.textContent = msg;
  document.body.appendChild(n);

  setTimeout(() => {
    n.classList.remove("visible");
    setTimeout(() => n.remove(), 300);
  }, 3000);
}

/* ==========================
   INICIO
========================== */
const dashboard = new DashboardProductividad();
