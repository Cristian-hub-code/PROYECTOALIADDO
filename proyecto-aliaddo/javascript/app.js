// Correos permitidos para el login
const correosPermitidos = [
  "ruacristian68@gmail.com",
  "cruar@aliaddo.com",
  "sapo"
];

// Cursos disponibles por grupo
const cursosPorGrupo = {
  erp: [
    { titulo: "Curso 1: Parametrización inicial - Sesión 1", video: "uU85OOa83JI" },
    { titulo: "Curso 2: Parametrización inicial - Sesión 2", video: "0toYR619JJk" },
    { titulo: "Curso 3: Parametrización inicial - Sesión 3", video: "7gt43kHfb7g" },
    { titulo: "Curso 4: Documentos electrónicos", video: "9cvVY00SfCA" },
    { titulo: "Curso 5: Contabilidad", video: "4tdiqtW3Ekc" },
    { titulo: "Curso 6: Inventarios", video: "sS0F2b3u3iU" }
  ],
  nomina: [
    { titulo: "Curso 1: Nómina automática", video: "GmYPkNnDDqY" },
    { titulo: "Curso 2: Contrato", video: "pGEH-c1uQE4" },
    { titulo: "Curso 3: Novedades", video: "ABCD1234xyz" },
    { titulo: "Curso 4: Seguridad social", video: "QWER9876lkj" }
  ]
};

let grupoSeleccionado = null;
let players = [];
let youTubeAPICargada = false;

// Iniciar sesión
function iniciarSesion() {
  const email = document.getElementById("email").value.trim().toLowerCase();
  const error = document.getElementById("error");

  if (correosPermitidos.includes(email)) {
    localStorage.setItem("usuarioAliaddo", email);
    document.getElementById("login-section").style.display = "none";
    document.getElementById("selector-principal").style.display = "block";
    document.getElementById("cerrar-sesion-superior").style.display = "block";
    error.textContent = "";
  } else {
    error.textContent = "Correo no autorizado. Debe estar registrado en Aliaddo.";
  }
}

function cerrarSesion() {
  localStorage.removeItem("usuarioAliaddo");
  location.reload();
}

// Mostrar secciones
function mostrarSeccion(seccion) {
  document.getElementById("selector-principal").style.display = "none";
  document.getElementById("inicio-section").style.display = "none";
  document.getElementById("cursos-section").style.display = "none";
  document.getElementById("articulos-section").style.display = "none";

  document.getElementById("boton-volver-principal").style.display = "block";

  if (seccion === "inicio") {
    document.getElementById("inicio-section").style.display = "block";
  } else if (seccion === "cursos") {
    document.getElementById("cursos-section").style.display = "block";
    document.getElementById("selector-grupo").style.display = "block";
    document.getElementById("lista-cursos").innerHTML = "";
    document.getElementById("boton-cambiar-grupo").style.display = "none";
  } else if (seccion === "articulos") {
    document.getElementById("articulos-section").style.display = "block";
    // ✅ Cambio 1: validar existencia del selector antes de usar style
    const _selArt = document.getElementById("selector-articulo"); if (_selArt) _selArt.style.display = "block";
    document.getElementById("contenido-articulo").innerHTML = "";
    document.getElementById("boton-volver-articulos").style.display = "none";
  }
}

// ---------- PROGRESO + VIDEOS ----------
async function seleccionarGrupo(grupo) {
  grupoSeleccionado = grupo;
  document.getElementById("selector-grupo").style.display = "none";
  await mostrarCursos();
}

async function mostrarCursos() {
  const usuario = localStorage.getItem("usuarioAliaddo");
  if (!usuario || !grupoSeleccionado) return;

  const cursos = cursosPorGrupo[grupoSeleccionado] || [];
  const contenedor = document.getElementById("lista-cursos");
  contenedor.innerHTML = "";

  const progresoKey = `progreso_${usuario}_${grupoSeleccionado}`;
  let progreso = parseInt(localStorage.getItem(progresoKey) || "0", 10);
  if (Number.isNaN(progreso) || progreso < 0) progreso = 0;

  for (let index = 0; index < cursos.length; index++) {
    const curso = cursos[index];
    const estaCompletado = index < progreso;
    const esDesbloqueado = index === progreso;
    const estaBloqueado = index > progreso;

    let clasesCurso = 'curso';
    let etiqueta = '';
    let contenidoCurso = '';

    if (estaCompletado) {
      clasesCurso += ' completado';
      etiqueta = '<span class="etiqueta-terminado">Curso terminado</span>';
      contenidoCurso = `<div id="player${index}"></div>`;
    } else if (esDesbloqueado) {
      contenidoCurso = `
        <div id="player${index}"></div>
        <div id="boton-completar-${index}"></div>
      `;
    } else if (estaBloqueado) {
      clasesCurso += ' bloqueado';
      contenidoCurso = `<p style="color: #888;">Debes completar el curso anterior para desbloquear este contenido.</p>`;
    }

    contenedor.innerHTML += `
      <div class="${clasesCurso}" id="curso-${index}">
        <h2>${curso.titulo} ${etiqueta}</h2>
        ${contenidoCurso}
      </div>
    `;
  }

  await cargarYouTubeAPI();
  await inicializarReproductoresYouTube();

  function mostrarBoton(index) {
    const div = document.getElementById(`boton-completar-${index}`);
    if (div) {
      div.innerHTML = `
        <button onclick="completarCurso(${index})" style="margin-top:10px; padding:10px 14px; background-color:#4b0082; color:white; border:none; border-radius:5px;">
          Marcar como completado
        </button>
      `;
    }
  }

  async function inicializarReproductoresYouTube() {
    const cursos = cursosPorGrupo[grupoSeleccionado] || [];
    const usuario = localStorage.getItem("usuarioAliaddo");
    const progresoKey = `progreso_${usuario}_${grupoSeleccionado}`;
    let progreso = parseInt(localStorage.getItem(progresoKey) || "0", 10);

    if (!window.YT || !YT.Player) {
      // Fallback: iframes directos
      mostrarVideosConIframes();
      return;
    }

    players = [];

    for (let index = 0; index < cursos.length; index++) {
      const curso = cursos[index];
      const contenedor = document.getElementById(`player${index}`);
      if (!contenedor) continue;

      const esDesbloqueado = index === progreso;
      const estaCompletado = index < progreso;

      if (estaCompletado || esDesbloqueado) {
        try {
          const player = new YT.Player(`player${index}`, {
            height: '315',
            width: '100%',
            videoId: curso.video,
            playerVars: {
              rel: 0,
              modestbranding: 1,
              origin: window.location.origin
            },
            events: {
              'onReady': (event) => {
                if (index === progreso) {
                  event.target.playVideo();
                }
              },
              'onStateChange': (event) => {
                if (event.data === YT.PlayerState.ENDED && index === progreso) {
                  mostrarBoton(index);
                }
              }
            }
          });
          players.push(player);

          // Si no hay API por cualquier razón, usa iframe directo
        } catch (error) {
          console.error('Error creando reproductor para curso', index, ':', error);
          contenedor.innerHTML = `
            <iframe 
              width="100%" height="315"
            src="https://www.youtube.com/embed/${curso.video}"
              title="YouTube video player"
              frameborder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
              allowfullscreen
              style="border-radius: 8px;">
            </iframe>
          `;

          if (index === progreso) {
            setTimeout(() => mostrarBoton(index), 2000);
          }
        }
      }
    }
  }

  function mostrarVideosConIframes() {
    const usuario = localStorage.getItem("usuarioAliaddo");
    const progresoKey = `progreso_${usuario}_${grupoSeleccionado}`;
    let progreso = parseInt(localStorage.getItem(progresoKey) || "0", 10);
    const cursos = cursosPorGrupo[grupoSeleccionado] || [];

    for (let index = 0; index < cursos.length; index++) {
      const esDesbloqueado = index === progreso;
      const estaCompletado = index < progreso;
      const contenedor = document.getElementById(`player${index}`);
      if (!contenedor) continue;

      if (estaCompletado || esDesbloqueado) {
        contenedor.innerHTML = `
          <iframe 
            width="100%" height="315"
            src="https://www.youtube.com/embed/${cursos[index].video}"
            title="YouTube video player"
            frameborder="0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowfullscreen
            style="border-radius: 8px;">
          </iframe>
        `;

        // Para el curso actual, agregar botón de completado después de un tiempo
        if (index === progreso) {
          setTimeout(() => {
            mostrarBoton(index);
          }, 2000);
        }

      } else {
        // bloqueado → no se renderiza reproductor
      }
    }
  }
}

function completarCurso(index) {
  const usuario = localStorage.getItem("usuarioAliaddo");
  const progresoKey = `progreso_${usuario}_${grupoSeleccionado}`;
  let progreso = parseInt(localStorage.getItem(progresoKey) || "0", 10);

  if (index === progreso) {
    progreso = progreso + 1;
    localStorage.setItem(progresoKey, String(progreso));
    mostrarCursos();
  }
}

// Cargar API de YouTube dinámicamente con manejo de CORS
function cargarYouTubeAPI() {
  return new Promise((resolve, reject) => {
    if (youTubeAPICargada) {
      resolve();
      return;
    }

    if (document.querySelector('script[src*="youtube.com/iframe_api"]')) {
      const checkAPI = setInterval(() => {
        if (window.YT && YT.Player) {
          clearInterval(checkAPI);
          youTubeAPICargada = true;
          resolve();
        }
      }, 200);
      setTimeout(() => {
        clearInterval(checkAPI);
        if (!youTubeAPICargada) {
          console.warn('Timeout esperando API de YouTube, uso de iframes directos');
          resolve();
        }
      }, 5000);
      return;
    }

    const tag = document.createElement('script');
    tag.src = "https://www.youtube.com/iframe_api";
    tag.onload = () => {
      const check = setInterval(() => {
        if (window.YT && YT.Player) {
          clearInterval(check);
          youTubeAPICargada = true;
          resolve();
        }
      }, 200);
      setTimeout(() => {
        clearInterval(check);
        if (!youTubeAPICargada) {
          console.warn('Timeout esperando API de YouTube (onload), uso de iframes directos');
          resolve();
        }
      }, 5000);
    };
    tag.onerror = () => {
      console.error('No se pudo cargar la API de YouTube. Se usarán iframes directos.');
      resolve();
    };
    document.head.appendChild(tag);
  });
}

// Esta función es requerida por la API de YouTube
function onYouTubeIframeAPIReady() {
  youTubeAPICargada = true;
  if (grupoSeleccionado) {
    // Si ya hay grupo, reintenta inicializar
    (async () => {
      await mostrarCursos();
    })();
  }
}

// Carrusel de imágenes
const imagenesCarrusel = [
  "https://i.postimg.cc/7Z5dG361/aliaddo-app-movil.webp",
  "https://i.postimg.cc/HL5N3TbV/aliaddo-software.webp",
];
let indiceCarrusel = 0;

setInterval(() => {
  const img = document.getElementById('imagen-carrusel');
  if (!img) return;
  indiceCarrusel = (indiceCarrusel + 1) % imagenesCarrusel.length;
  img.src = imagenesCarrusel[indiceCarrusel];
}, 4000);

// Volver / navegación
function volverASeleccionarGrupo() {
  grupoSeleccionado = null;
  players = [];
  document.getElementById("lista-cursos").innerHTML = "";
  document.getElementById("selector-grupo").style.display = "block";
  document.getElementById("boton-cambiar-grupo").style.display = "none";
}

function seleccionarArticulo(tipo) {
  const selector = document.getElementById("selector-articulo");
  const contenedor = document.getElementById("contenido-articulo");
  const botonVolver = document.getElementById("boton-volver-articulos");

// Articulos de ERP 

  const articulosERP = `
    <h2>Artículos ERP</h2>
    <p>Contenido sobre ERP...</p>
  `;

// Articulos de nomina

  const articulosNomina = `
    <h2>Artículos Nómina</h2>
    <p>En esta seccion realizada para ti, encontraras ariticulos de nomina explicando calculos o funciones que se puede realizar en nomina full</p>

    <div class="button-grid">
  
  <!-- Tarjeta 1: Horas Extras -->
  <div class="big-button" onclick="mostrarCalculadoraHorasExtras()">
    <div class="button-header">
      <div class="button-icon">⏰</div>
      <div class="button-title">Calculadora Horas Extras</div>
      <div class="button-subtitle">Calcula diferentes tipos de horas extras</div>
    </div>
    <div class="button-content">
      <ul class="feature-list">
        <li><i class="fas fa-check-circle"></i> 9 tipos de horas extras</li>
        <li><i class="fas fa-check-circle"></i> Cálculo automático</li>
        <li><i class="fas fa-check-circle"></i> Base legal incluida</li>
      </ul>
    </div>
    <button class="button-action">Abrir calculadora</button>
  </div>
  
  <!-- Tarjeta 2: Prima -->
  <div class="big-button" onclick="mostrarCalculodePrima()">
    <div class="button-header">
      <div class="button-icon">💰</div>
      <div class="button-title">Calculadora de Prima</div>
      <div class="button-subtitle">Calcula prima de servicios</div>
    </div>
    <div class="button-content">
      <ul class="feature-list">
        <li><i class="fas fa-check-circle"></i> Fórmula 8.33%</li>
        <li><i class="fas fa-check-circle"></i> Explicación paso a paso</li>
        <li><i class="fas fa-check-circle"></i> Ejemplos prácticos</li>
      </ul>
    </div>
    <button class="button-action">Abrir calculadora</button>
  </div>
  
  <!-- Tarjeta 3: Cesantías -->
  <div class="big-button" onclick="mostrarCalculodeCesantias()">
    <div class="button-header">
      <div class="button-icon">🏦</div>
      <div class="button-title">Calculadora de Cesantías</div>
      <div class="button-subtitle">Calcula cesantías e intereses</div>
    </div>
    <div class="button-content">
      <ul class="feature-list">
        <li><i class="fas fa-check-circle"></i> Fórmula 8.33%</li>
        <li><i class="fas fa-check-circle"></i> Aprovisionamiento</li>
        <li><i class="fas fa-check-circle"></i> Cálculo mensual</li>
      </ul>
    </div>
    <button class="button-action">Abrir calculadora</button>
  </div>
  
</div>

  `;
    
  if (selector) selector.style.display = "none";
  botonVolver.style.display = "block";

  if (tipo === "erp") {
    contenedor.innerHTML = articulosERP;
  } else if (tipo === "nomina") {
    contenedor.innerHTML = articulosNomina;
  }
}

function volverSeleccionarArticulo() {
  // ✅ Cambio 2: validar existencia del selector antes de usar style
  const _selArt = document.getElementById("selector-articulo"); if (_selArt) _selArt.style.display = "block";
  document.getElementById("contenido-articulo").innerHTML = "";
  document.getElementById("boton-volver-articulos").style.display = "none";
}

// Calculadora de horas extras
function mostrarCalculadoraHorasExtras() {
  const contenedor = document.getElementById("contenido-articulo");

  contenedor.innerHTML = `
    <h2>Calculadora de Horas Extras</h2>
    <label for="salario">Salario mensual:</label>
    <input type="number" id="salario" placeholder="Ej: 1423500" /><br>
    <label for="horasContrato">Horas contratadas al mes:</label>
    <input type="number" id="horasContrato" placeholder="Ej: 230" /><br>
    <label for="horasExtras">Cantidad de horas extras:</label>
    <input type="number" id="horasExtras" placeholder="Ej: 2" /><br>
    <label for="porcentaje-recargo">Porcentaje de recargo (%):</label>
    <input type="number" id="porcentaje-recargo" placeholder="ej: 35" step="0.1" min="0" max="500" style="width: 100%; padding: 10px; margin: 5px 0 15px 0; border: 1px solid #ccc; border-radius: 5px" ><br>
    <button class="boton-grande" onclick="calcularHorasExtras()">Calcular</button>
    <div id="resultado-horas-extras" style="margin-top:20px; padding:15px; background-color:#f0f8ff; border-radius:8px; display:none;">
      <h3>Resultado del cálculo:</h3>
      <p id="detalle-calculo"></p>
      <p id="resultado-final" style="font-weight:bold; font-size:18px;"></p>
    </div>
  `;
}

function calcularHorasExtras() {
  const salario = parseFloat(document.getElementById("salario").value);
  const horasContrato = parseFloat(document.getElementById("horasContrato").value);
  const horasExtras = parseFloat(document.getElementById("horasExtras").value);
  const porcentajeInput = document.getElementById("porcentaje-recargo").value;

  const resultadoDiv = document.getElementById("resultado-horas-extras");
  const detalle = document.getElementById("detalle-calculo");
  const resultadoFinal = document.getElementById("resultado-final");

    // VALIDACIÓN 1: Campos obligatorios

if ([salario, horasContrato, horasExtras].some(v => Number.isNaN(v) || v <= 0)) {
    resultadoFinal.textContent = "Por favor ingresa valores válidos en todos los campos.";
    resultadoDiv.style.display = "block";
    return;
  }

  // VALIDACIÓN 2: Porcentaje
  const porcentaje = parseFloat(porcentajeInput) / 100;
  if (Number.isNaN(porcentaje) || porcentaje <= 0) {
    resultadoFinal.textContent = "Por favor ingresa un porcentaje válido (ej: 35, 75.5, 110)";
    resultadoDiv.style.display = "block";
    return;
  }

  // Cálculos
  const valorHoraNormal = salario / horasContrato;
  const valorHorasExtrasNormales = valorHoraNormal * horasExtras;
  const valorRecargo = valorHorasExtrasNormales * porcentaje;
  const totalExtra = valorHorasExtrasNormales + valorRecargo; // ¡CORREGIDO! Ahora suma hora normal + recargo

  // Mostrar resultados
  detalle.innerHTML = `
    <strong>Detalle del cálculo:</strong><br>
    - Valor hora normal: $${valorHoraNormal.toFixed(2)}<br>
    - Valor ${horasExtras} horas normales: $${valorHorasExtrasNormales.toFixed(2)}<br>
    - Recargo (${(porcentaje * 100).toFixed(1)}%): $${valorRecargo.toFixed(2)}<br>
  `;

  resultadoDiv.style.display = "block";
}

// Calculadora de prima de servicios 
function mostrarCalculodePrima() {
  const contenedor = document.getElementById("contenido-articulo");
  
  // Limpia cualquier error previo
  if (!contenedor) {
    console.error("No se encontró el contenedor para la calculadora de prima");
    return;

  }

  contenedor.innerHTML = `
    <h2>Calculadora de Prima de Servicios</h2>

    <div style="background-color: #f8f9fa; border-left: 4px solid #4b0082; padding: 15px; margin-bottom: 20px; border-radius: 4px;">
      <h4 style="margin-top: 0; color: #4b0082;">¿Cómo se calcula la prima en Aliaddo?</h4>
      <p style="margin-bottom: 10px;">En Aliaddo, el cálculo de prima de servicios se realiza de la siguiente manera:</p>
      <p style="background-color: #e9ecef; padding: 10px; border-radius: 4px; font-family: monospace;">
        <strong>Al momento de generar un periodo de nomina bien sea quincena o mensual se genera un aprovisionamiento, para hacer el aprovisionamiento el sistema toma el salario + auxilio de transporte + conceptos que
        esten marcados como base para el calculo de prima</strong></p>


                  <!-- IMAGEN 1 DENTRO del recuadro explicativo -->
    <div style="text-align: center; margin: 15px 0; padding: 10px; background: white; border-radius: 8px;">
            <img src="/img/prima/prima1.png" 
                 alt="Ejemplo de configuración en Aliaddo" 
                 style="max-width: 100%; height: auto; border: 1px solid #ddd; border-radius: 5px;">
            <p style="font-size: 12px; color: #666; margin-top: 8px;">
                Imagen de ejemplo: Al momento de generar el periodo de nomina por ejemplo enero, desde la contabilzacicon puedes validar el aprovisionamiento realizado en este mes, o quincena. 
            </p>
        </div>


                  <!-- IMAGEN 2 DENTRO del recuadro explicativo -->
    
    <div style="text-align: center; margin: 15px 0; padding: 10px; background: white; border-radius: 8px;">
            <img src="/img/prima/prima2.png" 
                 alt="Ejemplo de configuración en Aliaddo" 
                 style="max-width: 100%; height: auto; border: 1px solid #ddd; border-radius: 5px;">
            <p style="font-size: 12px; color: #666; margin-top: 8px;">
                Imagen de ejemplo:  Este es el aprovisionamiento realizado en ese mes para ese trabajador de ejemplo, recuerda que se toma el salario + auxilio de transporte + los conceptos de nominas que este marcados para afectar en el calculo de las cesantias.
            </p>
        </div>


               <!-- IMAGEN 3 DENTRO del recuadro explicativo -->
    
    <div style="text-align: center; margin: 15px 0; padding: 10px; background: white; border-radius: 8px;">
            <img src="/img/prima/prima3.png" 
                 alt="Ejemplo de configuración en Aliaddo" 
                 style="max-width: 100%; height: auto; border: 1px solid #ddd; border-radius: 5px;">
            <p style="font-size: 12px; color: #666; margin-top: 8px;">
                Imagen de ejemplo:  Imagen de ejemplo: Desde el desprendible de ese mismo mes puedes validar a detalle que es lo esta tomando como base para aprovisionamiento en este caso es 1.623.500 * 8.333333333333333% = 135.292, que es el mismo valor que nos da aprovisionamiento en la contabilidad de la nomina.
        </div>


        <!-- IMAGEN 4 DENTRO del recuadro explicativo -->
    
    <div style="text-align: center; margin: 15px 0; padding: 10px; background: white; border-radius: 8px;">
            <img src="/img/prima/prima4.png" 
                 alt="Ejemplo de configuración en Aliaddo" 
                 style="max-width: 100%; height: auto; border: 1px solid #ddd; border-radius: 5px;">
            <p style="font-size: 12px; color: #666; margin-top: 8px;">
                Imagen de ejemplo:  Imagen de ejemplo:  Recuerda que desde el modulo de reporte - nominas liquidadas puedes generar el reporte para validar a detalle estos conceptos de prestaciones sociales.
        </div>


        <!-- IMAGEN 5 DENTRO del recuadro explicativo -->
    
    <div style="text-align: center; margin: 15px 0; padding: 10px; background: white; border-radius: 8px;">
            <img src="/img/prima/prima5.png" 
                 alt="Ejemplo de configuración en Aliaddo" 
                 style="max-width: 100%; height: auto; border: 1px solid #ddd; border-radius: 5px;">
            <p style="font-size: 12px; color: #666; margin-top: 8px;">
                Imagen de ejemplo:  Imagen de ejemplo:  En el reporte de nominas liquidadas podemos visualizar los aprovisionamientos en cada periodo de nomina generado, es muy importante tener en cuenta que se tomar para el aprovisionamiento que es el salario + auxilio de trnsporte + los conceptos que esten marcados para afectar el calculo de la prima.
        </div>



    

      <p style="margin-bottom: 0; font-size: 14px;">
        <strong>Nota:</strong> Ingrese la base para aprovisionamiento y se calculará el valor de la prima.
      </p>
    </div>

    <label for="base-aprovisionamiento">Base para aprovisionamiento de prima:</label>
    <input type="number" id="base-aprovisionamiento" placeholder="Ej: 1623500" /><br><br>
    
    <button class="boton-grande" onclick="calcularPrima()">Calcular Prima</button>
    
    <div id="resultado-prima" style="margin-top:20px; padding:15px; background-color:#f0f8ff; border-radius:8px; display:none;">
      <h3>Resultado del cálculo:</h3>
      <p id="detalle-calculo-prima"></p>
      <p id="resultado-final-prima" style="font-weight:bold; font-size:18px;"></p>
    </div>
  `;
}

function calcularPrima() {
  const baseAprovisionamiento = parseFloat(document.getElementById("base-aprovisionamiento").value);
  
  const resultadoDiv = document.getElementById("resultado-prima");
  const detalle = document.getElementById("detalle-calculo-prima");
  const resultadoFinal = document.getElementById("resultado-final-prima");

  // Validación
  if (!resultadoDiv || !detalle || !resultadoFinal) {
    console.error("Elementos de resultado no encontrados");
    return;
  }

  if (Number.isNaN(baseAprovisionamiento) || baseAprovisionamiento <= 0) {
    resultadoFinal.textContent = "Por favor ingresa un valor válido para la base de aprovisionamiento.";
    resultadoDiv.style.display = "block";
    return;
  }

  // Cálculo de la prima (MODIFICADO según tu solicitud)
  const valorPrima = baseAprovisionamiento * 0.08333333333;

  // Mostrar resultados (ACTUALIZADO)
  detalle.innerHTML = `
    <strong>Detalle del cálculo:</strong><br>
    - Base para aprovisionamiento: $${baseAprovisionamiento.toFixed(2)}<br>
    - Porcentaje aplicado: 8.333333333%<br>
    - Fórmula: $${baseAprovisionamiento.toFixed(2)} × 0.08333333333
  `;

  resultadoFinal.textContent = `Valor de la prima de servicios: $${valorPrima.toFixed(2)}`;
  resultadoDiv.style.display = "block";
}

//Fin calculadora de prima de servicios

// Calculadora de cesantias

function mostrarCalculodeCesantias() {
  const contenedor = document.getElementById("contenido-articulo");

  if (!contenedor) {
    console.error("No se encontro el contenedor para la calculadora de cesantias");
    return;
  }

  contenedor.innerHTML = `
    <h2>Calculadora de cesantias</h2>
    
    <div style="background-color: #f8f9fa; border-left: 4px solid #4b0082; padding: 15px; margin-bottom: 20px; border-radius: 4px;">
      <h4 style="margin-top: 0; color: #4b0082;">¿Como se calcula las cesantias en Aliaddo?</h4>
      <p style="margin-bottom: 10px;">En Aliaddo, el calculo de las cesantias se realiza de la siguiente manera:</p>
      <p style="background-color: #e9ecef; padding: 10px; border-radius: 4px; font-family: monospace;">
        <strong>Al momento de generar un periodo de nomina quincenal o mensual se genera un aprovisionamiento, para realizar el aprovisionamiento el sistema toma el salario + auxilio de transporte + conceptos que esten marcados como base para el calculo de prima</strong>
      </p>


             <!-- IMAGEN 1 DENTRO del recuadro explicativo -->
    <div style="text-align: center; margin: 15px 0; padding: 10px; background: white; border-radius: 8px;">
            <img src="/img/cesantias/cesantias1.png" 
                 alt="Ejemplo de configuración en Aliaddo" 
                 style="max-width: 100%; height: auto; border: 1px solid #ddd; border-radius: 5px;">
            <p style="font-size: 12px; color: #666; margin-top: 8px;">
                Imagen de ejemplo: Al momento de generar el periodo de nomina por ejemplo enero, desde la contabilzacicon puedes validar el aprovisionamiento realizado en este mes, o quincena. 
            </p>
        </div>


                  <!-- IMAGEN 2 DENTRO del recuadro explicativo -->
    
    <div style="text-align: center; margin: 15px 0; padding: 10px; background: white; border-radius: 8px;">
            <img src="/img/cesantias/cesantias2.png" 
                 alt="Ejemplo de configuración en Aliaddo" 
                 style="max-width: 100%; height: auto; border: 1px solid #ddd; border-radius: 5px;">
            <p style="font-size: 12px; color: #666; margin-top: 8px;">
                Imagen de ejemplo:  Este es el aprovisionamiento realizado en ese mes para ese trabajador de ejemplo, recuerda que se toma el salario + auxilio de transporte + los conceptos de nominas que este marcados para afectar en el calculo de las cesantias.
            </p>
        </div>


               <!-- IMAGEN 3 DENTRO del recuadro explicativo -->
    
    <div style="text-align: center; margin: 15px 0; padding: 10px; background: white; border-radius: 8px;">
            <img src="/img/cesantias/cesantias3.png" 
                 alt="Ejemplo de configuración en Aliaddo" 
                 style="max-width: 100%; height: auto; border: 1px solid #ddd; border-radius: 5px;">
            <p style="font-size: 12px; color: #666; margin-top: 8px;">
                Imagen de ejemplo:  Imagen de ejemplo: Desde el desprendible de ese mismo mes puedes validar a detalle que es lo esta tomando como base para aprovisionamiento en este caso es 1.623.500 * 8.333333333333333% = 135.292, que es el mismo valor que nos da aprovisionamiento en la contabilidad de la nomina.
        </div>


        <!-- IMAGEN 4 DENTRO del recuadro explicativo -->
    
    <div style="text-align: center; margin: 15px 0; padding: 10px; background: white; border-radius: 8px;">
            <img src="/img/cesantias/cesantias4.png" 
                 alt="Ejemplo de configuración en Aliaddo" 
                 style="max-width: 100%; height: auto; border: 1px solid #ddd; border-radius: 5px;">
            <p style="font-size: 12px; color: #666; margin-top: 8px;">
                Imagen de ejemplo:  Imagen de ejemplo:  Recuerda que desde el modulo de reporte - nominas liquidadas puedes generar el reporte para validar a detalle estos conceptos de prestaciones sociales.
        </div>


        <!-- IMAGEN 5 DENTRO del recuadro explicativo -->
    
    <div style="text-align: center; margin: 15px 0; padding: 10px; background: white; border-radius: 8px;">
            <img src="/img/cesantias/cesantias5.png" 
                 alt="Ejemplo de configuración en Aliaddo" 
                 style="max-width: 100%; height: auto; border: 1px solid #ddd; border-radius: 5px;">
            <p style="font-size: 12px; color: #666; margin-top: 8px;">
                Imagen de ejemplo:  Imagen de ejemplo:  En el reporte de nominas liquidadas podemos visualizar los aprovisionamientos en cada periodo de nomina generado, es muy importante tener en cuenta que se tomar para el aprovisionamiento que es el salario + auxilio de trnsporte + los conceptos que esten marcados para afectar el calculo de la prima.
        </div>


      <p style="margin-bottom: 0; font-size: 14px;">
        <strong>Nota:</strong> Ingrese la base mensual o quincenal para aprovisionamiento y se calculara el valor de aprovisionamiento de cesantias.
      </p>
    </div>

    <label for="base-aprovisionamiento">Base para aprovisionamiento de prima:</label>
    <input type="number" id="base-aprovisionamiento" placeholder="Ej: 1623500" /><br><br>

    <button class="boton-grande" onclick="calcularCesantias()">Calcular Cesantias</button>

    <div id="resultado-cesantias" style="margin-top:20px; padding:15px; background-color:#f0f8ff; border-radius:8px;display:none;">
      <h3>Resultado del calculo:</h3>
      <p id="detalle-calculo-cesantias"></p>
      <p id="resultado-final-cesantias" style="font-weight:bold; font-size:18px;"></p>
    </div>
  `;
}

function calcularCesantias () {
  const baseAprovisionamiento = parseFloat(document.getElementById("base-aprovisionamiento").value);

  const resultadoDiv = document.getElementById("resultado-cesantias");
  const detalle = document.getElementById("detalle-calculo-cesantias");
  const resultadoFinal = document.getElementById("resultado-final-cesantias");

  //validacion
  if (!resultadoDiv || !detalle || !resultadoFinal){
    console.error("Elementos de resultado no encontrados");
    return;
  }

  if (Number.isNaN(baseAprovisionamiento) || baseAprovisionamiento <=0) {
    resultadoFinal.textContent = "Porfavor ingresa un valor valido para la base de aprovisionamiento.";
    resultadoDiv.style.display = "block";
    return;
  }

  //Calculo de cesantias 
  
  const valorCesantias = baseAprovisionamiento * 0.08333333333333;

  //Aproximacion sin decimales usando Math.round()
  const valorCesantiasAproximado = Math.round(valorCesantias);

  //Formatear numero sin decimales y con separadores de miles
 const formatoNumero = (numero) => {
    return numero.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  };


   //mostrar resultados (solo cambiaron estas líneas)
  detalle.innerHTML = `
  <strong>Detalle del calculo:</strong><br>
  - Base para aprovisionamiento: $${formatoNumero(Math.round(baseAprovisionamiento))}<br>
  - Porcentaje aplicado: 8.333333333333333%<br>
  - Formula: $${formatoNumero(Math.round(baseAprovisionamiento))} * 0.083333333333333
  `;

  resultadoFinal.textContent = `Valor de las cesantias: $${formatoNumero(valorCesantiasAproximado)}`;
  resultadoDiv.style.display = "block";
}


// ... el resto de tus funciones existentes
function volverASelectorprincipal() {
  document.getElementById("inicio-section").style.display = "none";
  document.getElementById("cursos-section").style.display = "none";
  document.getElementById("articulos-section").style.display = "none";
  document.getElementById("selector-principal").style.display = "block";
  document.getElementById("boton-volver-principal").style.display = "none";
}

// ========== VALIDACIÓN DE NIT PARA HABILITACIÓN (3 INTENTOS) ==========

// Obtener contador de intentos por NIT
function obtenerIntentosNIT() {
  const intentosGuardados = localStorage.getItem('intentos_nits_habilitacion');
  return intentosGuardados ? JSON.parse(intentosGuardados) : {};
}

// Guardar intento de NIT
function guardarIntentoNIT(nit) {
  const intentos = obtenerIntentosNIT();
  if (intentos[nit]) {
    intentos[nit] += 1;
  } else {
    intentos[nit] = 1;
  }
  localStorage.setItem('intentos_nits_habilitacion', JSON.stringify(intentos));
  return intentos[nit];
}

// Mostrar modal para validar NIT
function validarNITAntesDeAgendar() {
  document.getElementById('modal-nit').style.display = 'flex';
  document.getElementById('input-nit').value = '';
  document.getElementById('mensaje-error-nit').style.display = 'none';
}

// Cerrar modal
function cerrarModalNIT() {
  document.getElementById('modal-nit').style.display = 'none';
}

// Verificar NIT y redirigir
function verificarYAgendar() {
  const nit = document.getElementById('input-nit').value.trim();
  const mensajeError = document.getElementById('mensaje-error-nit');
  
  // Validar que no esté vacío
  if (!nit) {
    mensajeError.textContent = 'Por favor ingrese el NIT o número de identificación';
    mensajeError.style.display = 'block';
    return;
  }
  
  // Validar que sea numérico
  if (!/^\d+$/.test(nit)) {
    mensajeError.textContent = 'El NIT debe contener solo números';
    mensajeError.style.display = 'block';
    return;
  }
  
  // Verificar número de intentos
  const intentos = obtenerIntentosNIT();
  const intentosActuales = intentos[nit] || 0;
  
  if (intentosActuales >= 3) {
    mensajeError.innerHTML = '⚠️ <strong>Límite de agendamientos alcanzado</strong><br>Ya tiene 3 agendamientos realizados. Para un cuarto agendamiento, comuníquese con su asesor comercial.';
    mensajeError.style.display = 'block';
    return;
  }
  
  // Mostrar mensaje según el intento
  const nuevoIntento = intentosActuales + 1;
  let mensajeConfirmacion = '';
  
  if (nuevoIntento === 1) {
    mensajeConfirmacion = '✅ Primer agendamiento realizado.';
  } else if (nuevoIntento === 2) {
    mensajeConfirmacion = '✅ Segundo agendamiento realizado.';
  } else if (nuevoIntento === 3) {
    mensajeConfirmacion = '✅ Tercer agendamiento realizado. Recuerde que este es su último agendamiento disponible.';
  }
  
  // Guardar el intento y redirigir
  guardarIntentoNIT(nit);
  cerrarModalNIT();
  
  // Mostrar alerta con el mensaje correspondiente
  alert(mensajeConfirmacion);
  window.open('https://sites.google.com/aliaddo.com/agendadehabilitacion/p%C3%A1gina-principal', '_blank');
}

// ========== HERRAMIENTA ADMINISTRADOR ==========
function administrarIntentosNIT() {
  const intentos = obtenerIntentosNIT();
  console.log("Intentos por NIT:", intentos);
}