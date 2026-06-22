// ======================
// VARIABLES GLOBALES
// ======================
const API_URL = "http://localhost:3000";
let proyectoActivoId = null;
let tareaActivaId = null;

// ======================
// CARGA INICIAL
// ======================
document.addEventListener("DOMContentLoaded", () => {
    obtenerProyectos();
    // Eventos de formularios
    document.getElementById("form-proyecto").addEventListener("submit", crearProyecto);
    document.getElementById("form-tarea").addEventListener("submit", crearTarea);
    document.getElementById("form-comentario").addEventListener("submit", crearComentario);
    document.getElementById("volver-proyectos").addEventListener("click", volverAProyectos);
});

// ==================================
// ✅ CRUD 1: PROYECTOS
// ==================================

// 🔵 LEER: Obtener todos los proyectos
async function obtenerProyectos() {
    try {
        // Método GET - tal como lo pide la consigna
        const respuesta = await axios.get(`${API_URL}/proyectos`);
        const proyectos = respuesta.data; // Leemos siempre response.data

        // Renderizamos con bucle forEach (requisito obligatorio)
        const contenedor = document.getElementById("lista-proyectos");
        contenedor.innerHTML = "";

        proyectos.forEach(proyecto => {
            // Contamos tareas para cada proyecto
            contarTareasDeProyecto(proyecto.id).then(cantidad => {
                const tarjeta = document.createElement("div");
                tarjeta.className = "tarjeta";
                tarjeta.innerHTML = `
                    <h3>${proyecto.nombre}</h3>
                    <p>${proyecto.descripcion}</p>
                    <p><strong>Límite:</strong> ${proyecto.fechaLimite}</p>
                    <p><strong>Tareas:</strong> ${cantidad}</p>
                    <div class="acciones">
                        <button onclick="verTareas(${proyecto.id})">Ver Tareas</button>
                        <button onclick="abrirEditarProyecto(${proyecto.id}, '${proyecto.nombre}', '${proyecto.descripcion}', '${proyecto.fechaLimite}')">Editar</button>
                        <button onclick="eliminarProyecto(${proyecto.id})">Eliminar</button>
                    </div>
                `;
                contenedor.appendChild(tarjeta);
            });
        });

    } catch (error) {
        console.error("Error al obtener proyectos:", error);
    }
}

// ➕ CREAR: Nuevo proyecto
async function crearProyecto(e) {
    e.preventDefault();
    const nombre = document.getElementById("nombre-proyecto").value;
    const descripcion = document.getElementById("descripcion-proyecto").value;
    const fecha = document.getElementById("fecha-proyecto").value;

    try {
        // Método POST
        await axios.post(`${API_URL}/proyectos`, {
            nombre: nombre,
            descripcion: descripcion,
            fechaLimite: fecha
        });
        // Actualizamos vista SIN recargar
        obtenerProyectos();
        // Limpiamos formulario
        e.target.reset();
    } catch (error) {
        console.error("Error al crear proyecto:", error);
    }
}

// ✏️ ACTUALIZAR: Editar proyecto
async function editarProyecto(id, nuevosDatos) {
    try {
        // Método PUT (reemplaza todo) o PATCH (solo cambios)
        await axios.put(`${API_URL}/proyectos/${id}`, nuevosDatos);
        obtenerProyectos();
    } catch (error) {
        console.error("Error al editar proyecto:", error);
    }
}

// 🗑️ ELIMINAR: Proyecto + tareas + comentarios (en cascada)
async function eliminarProyecto(id) {
    if (!confirm("¿Eliminar este proyecto y todo su contenido?")) return;

    try {
        // 1. Obtener tareas del proyecto
        const tareas = await axios.get(`${API_URL}/tareas?proyectoId=${id}`);
        // 2. Para cada tarea, eliminar comentarios y luego la tarea
        for (const tarea of tareas.data) {
            const comentarios = await axios.get(`${API_URL}/comentarios?tareaId=${tarea.id}`);
            for (const comentario of comentarios.data) {
                await axios.delete(`${API_URL}/comentarios/${comentario.id}`);
            }
            await axios.delete(`${API_URL}/tareas/${tarea.id}`);
        }
        // 3. Eliminar el proyecto
        await axios.delete(`${API_URL}/proyectos/${id}`);
        obtenerProyectos();
    } catch (error) {
        console.error("Error al eliminar proyecto:", error);
    }
}

// Función auxiliar: contar tareas
async function contarTareasDeProyecto(proyectoId) {
    const res = await axios.get(`${API_URL}/tareas?proyectoId=${proyectoId}`);
    return res.data.length;
}

// Función auxiliar: abrir formulario de edición
function abrirEditarProyecto(id, nombre, descripcion, fecha) {
    const nuevoNombre = prompt("Nuevo nombre:", nombre);
    const nuevaDesc = prompt("Nueva descripción:", descripcion);
    const nuevaFecha = prompt("Nueva fecha (AAAA-MM-DD):", fecha);
    if (nuevoNombre && nuevaDesc && nuevaFecha) {
        editarProyecto(id, {
            nombre: nuevoNombre,
            descripcion: nuevaDesc,
            fechaLimite: nuevaFecha
        });
    }
}

// ==================================
// ✅ CRUD 2: TAREAS
// ==================================

// 🔵 LEER: Tareas de un proyecto específico
async function obtenerTareas(proyectoId) {
    proyectoActivoId = proyectoId;
    try {
        // Filtramos por proyectoId
        const respuesta = await axios.get(`${API_URL}/tareas?proyectoId=${proyectoId}`);
        const tareas = respuesta.data;

        document.getElementById("lista-tareas").innerHTML = "";

        tareas.forEach(tarea => {
            const tarjeta = document.createElement("div");
            tarjeta.className = `tarjeta ${tarea.estado.toLowerCase().replace(" ", "-")}`;
            tarjeta.innerHTML = `
                <h4>${tarea.nombre}</h4>
                <p>Responsable: ${tarea.responsable}</p>
                <p>Estado: ${tarea.estado}</p>
                <div class="acciones">
                    <button onclick="verComentarios(${tarea.id})">Ver Comentarios</button>
                    <button onclick="cambiarEstadoTarea(${tarea.id}, '${tarea.estado}')">Cambiar Estado</button>
                    <button onclick="editarTareaPrompt(${tarea.id}, '${tarea.nombre}', '${tarea.responsable}')">Editar</button>
                    <button onclick="eliminarTarea(${tarea.id})">Eliminar</button>
                </div>
            `;
            document.getElementById("lista-tareas").appendChild(tarjeta);
        });

    } catch (error) {
        console.error("Error al obtener tareas:", error);
    }
}

// ➕ CREAR: Nueva tarea
async function crearTarea(e) {
    e.preventDefault();
    const nombre = document.getElementById("nombre-tarea").value;
    const responsable = document.getElementById("responsable-tarea").value;
    const estado = document.getElementById("estado-tarea").value;

    try {
        await axios.post(`${API_URL}/tareas`, {
            proyectoId: proyectoActivoId,
            nombre: nombre,
            responsable: responsable,
            estado: estado
        });
        obtenerTareas(proyectoActivoId);
        e.target.reset();
    } catch (error) {
        console.error("Error al crear tarea:", error);
    }
}

// ✏️ ACTUALIZAR: Editar tarea
async function editarTarea(id, datos) {
    try {
        // Usamos PATCH (solo actualiza campos enviados)
        await axios.patch(`${API_URL}/tareas/${id}`, datos);
        obtenerTareas(proyectoActivoId);
    } catch (error) {
        console.error("Error al editar tarea:", error);
    }
}

// ✏️ ACTUALIZAR: Cambiar estado
async function cambiarEstadoTarea(id, estadoActual) {
    const estados = ["Pendiente", "En progreso", "Completada"];
    const indice = estados.indexOf(estadoActual);
    const nuevoEstado = estados[(indice + 1) % 3]; // Ciclo entre estados
    await editarTarea(id, { estado: nuevoEstado });
}

// 🗑️ ELIMINAR: Tarea + comentarios
async function eliminarTarea(id) {
    if (!confirm("¿Eliminar esta tarea y sus comentarios?")) return;
    try {
        // Primero borramos comentarios
        const comentarios = await axios.get(`${API_URL}/comentarios?tareaId=${id}`);
        for (const c of comentarios.data) {
            await axios.delete(`${API_URL}/comentarios/${c.id}`);
        }
        // Luego la tarea
        await axios.delete(`${API_URL}/tareas/${id}`);
        obtenerTareas(proyectoActivoId);
    } catch (error) {
        console.error("Error al eliminar tarea:", error);
    }
}

// Auxiliar: ver tareas
function verTareas(id) {
    proyectoActivoId = id;
    document.getElementById("seccion-proyectos").style.display = "none";
    document.getElementById("seccion-tareas").style.display = "block";
    obtenerTareas(id);
}

function volverAProyectos() {
    document.getElementById("seccion-proyectos").style.display = "block";
    document.getElementById("seccion-tareas").style.display = "none";
    proyectoActivoId = null;
    tareaActivaId = null;
    document.getElementById("seccion-comentarios").style.display = "none";
}

function editarTareaPrompt(id, nombre, resp) {
    const nuevoNombre = prompt("Nuevo nombre:", nombre);
    const nuevoResp = prompt("Nuevo responsable:", resp);
    if (nuevoNombre && nuevoResp) {
        editarTarea(id, { nombre: nuevoNombre, responsable: nuevoResp });
    }
}

// ==================================
// ✅ CRUD 3: COMENTARIOS
// ==================================

// 🔵 LEER: Comentarios de una tarea (del más nuevo al viejo)
async function obtenerComentarios(tareaId) {
    tareaActivaId = tareaId;
    try {
        // Ordenamos por fecha descendente
        const respuesta = await axios.get(`${API_URL}/comentarios?tareaId=${tareaId}&_sort=fecha&_order=desc`);
        const comentarios = respuesta.data;

        const contenedor = document.getElementById("lista-comentarios");
        contenedor.innerHTML = "";

        comentarios.forEach(com => {
            const div = document.createElement("div");
            div.style.padding = "8px";
            div.style.borderBottom = "1px solid #eee";
            div.innerHTML = `
                <p><strong>${com.fecha}</strong>: ${com.texto}</p>
                <div class="acciones">
                    <button onclick="editarComentarioPrompt(${com.id}, '${com.texto}')">Editar</button>
                    <button onclick="eliminarComentario(${com.id})">Eliminar</button>
                </div>
            `;
            contenedor.appendChild(div);
        });

    } catch (error) {
        console.error("Error al obtener comentarios:", error);
    }
}

// ➕ CREAR: Comentario con fecha automática
async function crearComentario(e) {
    e.preventDefault();
    const texto = document.getElementById("texto-comentario").value;
    const fecha = new Date().toLocaleDateString(); // Fecha automática

    try {
        await axios.post(`${API_URL}/comentarios`, {
            tareaId: tareaActivaId,
            texto: texto,
            fecha: fecha
        });
        obtenerComentarios(tareaActivaId);
        e.target.reset();
    } catch (error) {
        console.error("Error al crear comentario:", error);
    }
}

// ✏️ ACTUALIZAR: Editar comentario
async function editarComentario(id, nuevoTexto) {
    try {
        await axios.patch(`${API_URL}/comentarios/${id}`, { texto: nuevoTexto });
        obtenerComentarios(tareaActivaId);
    } catch (error) {
        console.error("Error al editar comentario:", error);
    }
}

// 🗑️ ELIMINAR: Comentario
async function eliminarComentario(id) {
    if (!confirm("¿Eliminar este comentario?")) return;
    try {
        await axios.delete(`${API_URL}/comentarios/${id}`);
        obtenerComentarios(tareaActivaId);
    } catch (error) {
        console.error("Error al eliminar comentario:", error);
    }
}

// Auxiliar: ver comentarios
function verComentarios(tareaId) {
    tareaActivaId = tareaId;
    document.getElementById("seccion-comentarios").style.display = "block";
    obtenerComentarios(tareaId);
}

function editarComentarioPrompt(id, textoActual) {
    const nuevoTexto = prompt("Editar comentario:", textoActual);
    if (nuevoTexto) editarComentario(id, nuevoTexto);
}