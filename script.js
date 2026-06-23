const API_URL = "http://localhost:3000";
let proyectoActivoId = null;
let tareaActivaId = null;

document.addEventListener("DOMContentLoaded", () => {
    verificarServidor();
    obtenerProyectos();
    // Eventos de formularios
    document.getElementById("form-proyecto").addEventListener("submit", crearProyecto);
    document.getElementById("form-tarea").addEventListener("submit", crearTarea);
    document.getElementById("form-comentario").addEventListener("submit", crearComentario);
    document.getElementById("volver-proyectos").addEventListener("click", volverAProyectos);
});

// Avisa de forma visible si json-server no está corriendo,
// en vez de fallar en silencio en cada botón
async function verificarServidor() {
    try {
        await axios.get(`${API_URL}/proyectos`);
    } catch (error) {
        mostrarAviso(
            "No se pudo conectar con el servidor. Iniciá json-server con: json-server --watch db.json",
            "error"
        );
    }
}

// Muestra un mensaje flotante arriba de la pantalla (éxito o error)
function mostrarAviso(mensaje, tipo = "error") {
    const existente = document.querySelector(".aviso");
    if (existente) existente.remove();

    const aviso = document.createElement("div");
    aviso.className = `aviso aviso-${tipo}`;
    aviso.textContent = mensaje;
    document.body.appendChild(aviso);

    setTimeout(() => aviso.remove(), 5000);
}



async function obtenerProyectos() {
    try {
        // Método GET - tal como lo pide la consigna
        const respuesta = await axios.get(`${API_URL}/proyectos`);
        const proyectos = respuesta.data; // Leemos siempre response.data

        // Renderizamos con bucle forEach (requisito obligatorio)
        const contenedor = document.getElementById("lista-proyectos");
        contenedor.innerHTML = "";

        if (proyectos.length === 0) {
            contenedor.innerHTML = `<p class="vacio">Todavía no creaste ningún proyecto. Usá el formulario de arriba para empezar.</p>`;
            return;
        }

        proyectos.forEach(proyecto => {
            // Contamos tareas para cada proyecto
            contarTareasDeProyecto(proyecto.id).then(({ total, completadas }) => {
                const porcentaje = total > 0 ? Math.round((completadas / total) * 100) : 0;
                const tarjeta = document.createElement("div");
                tarjeta.className = "tarjeta";
                tarjeta.innerHTML = `
                    <h3>${escaparHtml(proyecto.nombre)}</h3>
                    <p>${escaparHtml(proyecto.descripcion)}</p>
                    <p><strong>Límite:</strong> ${proyecto.fechaLimite}</p>
                    <div class="barra-progreso">
                        <div class="barra-progreso-relleno" style="width: ${porcentaje}%"></div>
                    </div>
                    <p class="texto-progreso">${completadas} de ${total} tareas completadas</p>
                    <div class="acciones">
                        <button onclick="verTareas('${proyecto.id}')">Ver tareas</button>
                        <button onclick="abrirEditarProyecto('${proyecto.id}')">Editar</button>
                        <button onclick="eliminarProyecto('${proyecto.id}')">Eliminar</button>
                    </div>
                `;
                contenedor.appendChild(tarjeta);
            });
        });

    } catch (error) {
        console.error("Error al obtener proyectos:", error);
        mostrarAviso("No se pudieron cargar los proyectos. Revisá que el servidor esté corriendo.");
    }
}


async function crearProyecto(e) {
    e.preventDefault();
    const nombre = document.getElementById("nombre-proyecto").value;
    const descripcion = document.getElementById("descripcion-proyecto").value;
    const fecha = document.getElementById("fecha-proyecto").value;

    try {

        await axios.post(`${API_URL}/proyectos`, {
            nombre: nombre,
            descripcion: descripcion,
            fechaLimite: fecha
        });
        // Actualizamos vista SIN recargar
        obtenerProyectos();
        // Limpiamos formulario
        e.target.reset();
        mostrarAviso("Proyecto creado", "exito");
    } catch (error) {
        console.error("Error al crear proyecto:", error);
        mostrarAviso("No se pudo crear el proyecto.");
    }
}


async function editarProyecto(id, nuevosDatos) {
    try {
        // Método PUT (reemplaza todo) o PATCH (solo cambios)
        await axios.put(`${API_URL}/proyectos/${id}`, nuevosDatos);
        obtenerProyectos();
    } catch (error) {
        console.error("Error al editar proyecto:", error);
    }
}

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


async function contarTareasDeProyecto(proyectoId) {
    const res = await axios.get(`${API_URL}/tareas?proyectoId=${proyectoId}`);
    const total = res.data.length;
    const completadas = res.data.filter(t => t.estado === "Completada").length;
    return { total, completadas };
}


async function abrirEditarProyecto(id) {
    try {
        const respuesta = await axios.get(`${API_URL}/proyectos/${id}`);
        const proyecto = respuesta.data;

        const nuevoNombre = prompt("Nuevo nombre:", proyecto.nombre);
        if (nuevoNombre === null) return;
        const nuevaDesc = prompt("Nueva descripción:", proyecto.descripcion);
        if (nuevaDesc === null) return;
        const nuevaFecha = prompt("Nueva fecha (AAAA-MM-DD):", proyecto.fechaLimite);
        if (nuevaFecha === null) return;

        if (nuevoNombre && nuevaDesc && nuevaFecha) {
            editarProyecto(id, {
                nombre: nuevoNombre,
                descripcion: nuevaDesc,
                fechaLimite: nuevaFecha
            });
        }
    } catch (error) {
        console.error("Error al cargar proyecto para editar:", error);
    }
}


function escaparHtml(texto) {
    const div = document.createElement("div");
    div.textContent = texto ?? "";
    return div.innerHTML;
}


async function obtenerTareas(proyectoId) {
    proyectoActivoId = proyectoId;
    try {
        // Filtramos por proyectoId
        const respuesta = await axios.get(`${API_URL}/tareas?proyectoId=${proyectoId}`);
        const tareas = respuesta.data;

        document.getElementById("lista-tareas").innerHTML = "";

        if (tareas.length === 0) {
            document.getElementById("lista-tareas").innerHTML = `<p class="vacio">Este proyecto todavía no tiene tareas.</p>`;
            return;
        }

        tareas.forEach(tarea => {
            const tarjeta = document.createElement("div");
            tarjeta.className = `tarjeta ${tarea.estado.toLowerCase().replace(" ", "-")}`;
            tarjeta.innerHTML = `
                <h4>${escaparHtml(tarea.nombre)}</h4>
                <p>Responsable: ${escaparHtml(tarea.responsable)}</p>
                <p>Estado: <span class="badge-estado">${tarea.estado}</span></p>
                <div class="acciones">
                    <button onclick="verComentarios('${tarea.id}')">Ver comentarios</button>
                    <button onclick="cambiarEstadoTarea('${tarea.id}', '${tarea.estado}')">Cambiar estado</button>
                    <button onclick="editarTareaPrompt('${tarea.id}')">Editar</button>
                    <button onclick="eliminarTarea('${tarea.id}')">Eliminar</button>
                </div>
            `;
            document.getElementById("lista-tareas").appendChild(tarjeta);
        });

    } catch (error) {
        console.error("Error al obtener tareas:", error);
    }
}

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
        await axios.patch(`${API_URL}/tareas/${id}`, datos);
        obtenerTareas(proyectoActivoId);
    } catch (error) {
        console.error("Error al editar tarea:", error);
    }
}


async function cambiarEstadoTarea(id, estadoActual) {
    const estados = ["Pendiente", "En progreso", "Completada"];
    const indice = estados.indexOf(estadoActual);
    const nuevoEstado = estados[(indice + 1) % 3];
    await editarTarea(id, { estado: nuevoEstado });
}


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


async function verTareas(id) {
    proyectoActivoId = id;
    document.getElementById("seccion-proyectos").style.display = "none";
    document.getElementById("seccion-tareas").style.display = "block";
    try {
        const respuesta = await axios.get(`${API_URL}/proyectos/${id}`);
        document.getElementById("nombre-proyecto-activo").textContent = respuesta.data.nombre;
    } catch (error) {
        console.error("Error al cargar nombre del proyecto:", error);
    }
    obtenerTareas(id);
}

function volverAProyectos() {
    document.getElementById("seccion-proyectos").style.display = "block";
    document.getElementById("seccion-tareas").style.display = "none";
    proyectoActivoId = null;
    tareaActivaId = null;
    document.getElementById("seccion-comentarios").style.display = "none";
}

async function editarTareaPrompt(id) {
    try {
        const respuesta = await axios.get(`${API_URL}/tareas/${id}`);
        const tarea = respuesta.data;
        const nuevoNombre = prompt("Nuevo nombre:", tarea.nombre);
        if (nuevoNombre === null) return;
        const nuevoResp = prompt("Nuevo responsable:", tarea.responsable);
        if (nuevoResp === null) return;
        if (nuevoNombre && nuevoResp) {
            editarTarea(id, { nombre: nuevoNombre, responsable: nuevoResp });
        }
    } catch (error) {
        console.error("Error al cargar tarea para editar:", error);
    }
}


async function obtenerComentarios(tareaId) {
    tareaActivaId = tareaId;
    try {
        // Ordenamos por fecha descendente
        const respuesta = await axios.get(`${API_URL}/comentarios?tareaId=${tareaId}&_sort=fecha&_order=desc`);
        const comentarios = respuesta.data;

        const contenedor = document.getElementById("lista-comentarios");
        contenedor.innerHTML = "";

        if (comentarios.length === 0) {
            contenedor.innerHTML = `<p class="vacio">Todavía no hay comentarios en esta tarea.</p>`;
            return;
        }

        comentarios.forEach(com => {
            const div = document.createElement("div");
            div.style.padding = "8px";
            div.style.borderBottom = "1px solid #eee";
            div.innerHTML = `
                <p><strong>${com.fecha}</strong>: ${escaparHtml(com.texto)}</p>
                <div class="acciones">
                    <button onclick="editarComentarioPrompt('${com.id}')">Editar</button>
                    <button onclick="eliminarComentario('${com.id}')">Eliminar</button>
                </div>
            `;
            contenedor.appendChild(div);
        });

    } catch (error) {
        console.error("Error al obtener comentarios:", error);
    }
}


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

async function editarComentario(id, nuevoTexto) {
    try {
        await axios.patch(`${API_URL}/comentarios/${id}`, { texto: nuevoTexto });
        obtenerComentarios(tareaActivaId);
    } catch (error) {
        console.error("Error al editar comentario:", error);
    }
}

async function eliminarComentario(id) {
    if (!confirm("¿Eliminar este comentario?")) return;
    try {
        await axios.delete(`${API_URL}/comentarios/${id}`);
        obtenerComentarios(tareaActivaId);
    } catch (error) {
        console.error("Error al eliminar comentario:", error);
    }
}

function verComentarios(tareaId) {
    tareaActivaId = tareaId;
    document.getElementById("seccion-comentarios").style.display = "block";
    obtenerComentarios(tareaId);
}

async function editarComentarioPrompt(id) {
    try {
        const respuesta = await axios.get(`${API_URL}/comentarios/${id}`);
        const nuevoTexto = prompt("Editar comentario:", respuesta.data.texto);
        if (nuevoTexto) editarComentario(id, nuevoTexto);
    } catch (error) {
        console.error("Error al cargar comentario para editar:", error);
    }
}