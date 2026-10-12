> **Cómo usar este prompt:** pégalo completo en tu asistente de IA o herramienta de desarrollo. Incluye todas las especificaciones de diseño (secciones 2 a 19) y las de implementación, calidad y entrega (secciones 20 a 25).

---


# PROMPT MAESTRO — REDISEÑO COMPLETO DE ARQUILA
## Plataforma profesional de arquitectura, modelado 3D, planos 2D y visualización arquitectónica

### 1. ROL Y OBJETIVO PRINCIPAL

Actúa como un equipo multidisciplinario de alto nivel compuesto por:

- Diseñador UI/UX senior especializado en software profesional.
- Desarrollador frontend senior experto en React, TypeScript y Vite.
- Especialista en diseño de interfaces para aplicaciones CAD y BIM.
- Especialista en visualización arquitectónica 3D y renderizado fotorrealista.
- Experto en accesibilidad, diseño responsive, rendimiento y arquitectura de software.

Tu misión es analizar, mejorar y rediseñar integralmente el proyecto existente **ARQUILA**, convirtiéndolo en una plataforma moderna, elegante, intuitiva y profesional para diseñar, organizar, modelar y visualizar proyectos arquitectónicos.

No quiero una página web genérica, un dashboard administrativo convencional ni una simple colección de tarjetas. Quiero una aplicación que transmita la calidad de un software arquitectónico comercial, con una identidad visual propia y herramientas organizadas para un flujo de trabajo real.

**Regla principal:** trabaja directamente sobre el código fuente del proyecto existente. Primero analiza su estructura, componentes, rutas, dependencias, API y funcionalidades. Después implementa las mejoras conservando todo lo que ya funcione correctamente.

No te limites a generar imágenes, prototipos estáticos o pantallas decorativas. Implementa interfaces reales, controles funcionales e integraciones coherentes con la arquitectura existente.

---

### 2. IDENTIDAD VISUAL DE ARQUILA

Diseña una identidad visual premium basada en arquitectura contemporánea, minimalismo funcional y visualización arquitectónica de alta calidad.

#### Paleta principal

- Verde bosque profundo: `#0B211A`.
- Verde oscuro secundario: `#12382A`.
- Verde de interacción: `#236B42`.
- Verde lima de acento: `#B8F36B`.
- Fondo claro: `#F4F6F2`.
- Superficie blanca: `#FFFFFF`.
- Texto principal: `#17211B`.
- Texto secundario: `#68736B`.
- Bordes: `#DFE5DE`.
- Estados de éxito, advertencia y error con colores accesibles y claramente diferenciados.

Usa el verde lima exclusivamente para destacar acciones importantes, selecciones, indicadores de progreso y estados activos. Evita saturar todas las pantallas con elementos verdes.

#### Tipografía

Utiliza una familia tipográfica moderna y legible, como Inter, Manrope o una alternativa ya instalada en el proyecto.

Establece una jerarquía tipográfica consistente para títulos, subtítulos, texto general, etiquetas, datos técnicos y controles.

No uses textos diminutos para ahorrar espacio. La interfaz debe ser legible a una distancia normal de trabajo.

#### Lenguaje visual

- Diseño minimalista, técnico y elegante.
- Espaciado consistente.
- Alineación precisa.
- Bordes discretos.
- Radios moderados.
- Sombras suaves y funcionales.
- Iconos vectoriales coherentes.
- Estados hover, focus, active, disabled y loading.
- Transiciones rápidas y naturales.
- Fotografía y renders arquitectónicos de calidad.
- Interfaces limpias, sin elementos decorativos innecesarios.

Evita el exceso de efectos glassmorphism, gradientes llamativos, sombras exageradas, animaciones lentas y tarjetas que compitan entre sí.

---

### 3. SISTEMA DE DISEÑO GLOBAL

Crea un sistema de diseño reutilizable para toda la aplicación.

Define variables de color, tipografía, espaciado, bordes, sombras, radios, tamaños de controles y velocidades de transición.

Construye componentes compartidos para:

- Botones primarios, secundarios, terciarios y destructivos.
- Campos de texto y formularios.
- Selectores y menús desplegables.
- Tarjetas de proyectos.
- Diálogos y ventanas modales.
- Paneles laterales.
- Tooltips.
- Notificaciones.
- Barras de progreso.
- Estados vacíos.
- Indicadores de carga.
- Confirmaciones de acciones.
- Tablas y filtros.
- Pestañas.
- Menús contextuales.
- Controles de cámara.
- Paneles de propiedades.
- Selectores de materiales.

Todos los componentes deben mantener la misma identidad visual, tanto en el modo claro como en el oscuro.

---

### 4. ESTRUCTURA PRINCIPAL DE NAVEGACIÓN

Implementa una navegación lateral elegante, compacta y organizada.

Módulos principales:

1. Inicio.
2. Proyectos.
3. Terrenos.
4. Biblioteca de materiales.
5. Planos 2D.
6. Editor y modelos 3D.
7. Iluminación y clima.
8. Recorridos virtuales.
9. Renderizado.
10. Gestión de tareas.
11. Configuración.

La navegación debe incluir:

- Logotipo ARQUILA.
- Iconos consistentes.
- Etiquetas legibles.
- Estado activo claramente identificado.
- Tooltips cuando la barra esté contraída.
- Posibilidad de contraer y expandir la barra.
- Navegación mediante teclado.
- Adaptación a pantallas pequeñas.
- Perfil de usuario y cierre de sesión.
- Indicadores discretos para notificaciones cuando existan.

No crees rutas ficticias que muestren pantallas vacías. Cada módulo debe conectarse a su pantalla real o presentar un estado vacío útil mientras se desarrolla.

---

### 5. DASHBOARD PRINCIPAL PREMIUM

Rediseña la pantalla de inicio para convertirla en una portada arquitectónica impactante.

#### Encabezado

Incluye:

- Saludo personalizado.
- Nombre y avatar del usuario.
- Buscador global.
- Notificaciones.
- Selector de tema.
- Acceso al perfil.
- Acción principal para crear un proyecto.

#### Hero arquitectónico

Crea un bloque visual protagonista con un render de arquitectura contemporánea: vivienda moderna, materiales naturales, vegetación, grandes ventanales e iluminación realista.

Sobre el render muestra un título breve, una descripción y botones para crear un proyecto o explorar los existentes.

La imagen debe funcionar como parte del diseño, no como fondo que dificulte la lectura.

#### Indicadores principales

Muestra información real cuando esté disponible:

- Total de proyectos.
- Proyectos en progreso.
- Proyectos completados.
- Terrenos disponibles.
- Materiales guardados.
- Planos creados.

Los indicadores deben obtenerse de la API o de la fuente de datos existente. No inventes estadísticas como si fueran reales.

#### Proyectos recientes

Diseña tarjetas con:

- Imagen de portada.
- Nombre.
- Tipo de proyecto.
- Fecha de actualización.
- Estado.
- Porcentaje de progreso cuando exista.
- Menú contextual.
- Acciones para abrir, editar, duplicar o eliminar, según los permisos disponibles.

Incluye vistas de cuadrícula y lista, búsqueda, filtros y ordenamiento.

#### Accesos rápidos

Incluye acciones para:

- Crear proyecto.
- Abrir el editor 3D.
- Crear o abrir planos.
- Explorar materiales.
- Gestionar terrenos.
- Crear recorridos.
- Generar renders.

El dashboard debe priorizar el trabajo real del usuario, evitando bloques decorativos que no aporten información.

---

### 6. INICIO DE SESIÓN Y AUTENTICACIÓN

Crea una pantalla de autenticación con estética arquitectónica premium.

#### Composición visual

Divide la pantalla en dos áreas:

- Panel visual con un render arquitectónico de alta calidad.
- Panel de autenticación limpio y centrado.

En escritorio, usa una composición equilibrada. En dispositivos móviles, reorganiza el contenido para priorizar el formulario.

#### Elementos

- Logotipo ARQUILA.
- Título de bienvenida.
- Campo de correo electrónico.
- Campo de contraseña.
- Botón para mostrar u ocultar la contraseña.
- Opción de recordar sesión, si es compatible con la autenticación.
- Recuperación de contraseña.
- Botón principal de inicio de sesión.
- Enlace de registro.
- Mensajes claros de validación.

#### Animaciones

Implementa:

- Aparición suave del formulario.
- Indicador de carga al enviar credenciales.
- Estado visual mientras se procesa la autenticación.
- Animación discreta al cargar una imagen, con fallback si falla.
- Mensajes de éxito o error.

Deshabilita el botón durante el envío para evitar solicitudes duplicadas.

Nunca simules una autenticación exitosa. Respeta el sistema de autenticación existente, la gestión de sesiones y las medidas de seguridad.

---

### 7. GESTIÓN PROFESIONAL DE PROYECTOS

Cada proyecto debe contar con una ficha completa y un espacio de trabajo propio.

#### Información del proyecto

- Nombre.
- Descripción.
- Tipo arquitectónico.
- Ubicación cuando corresponda.
- Fecha de creación.
- Última modificación.
- Responsable.
- Estado.
- Imagen de portada.
- Archivos asociados.
- Versiones.
- Tareas.
- Historial de cambios.

#### Funcionalidades

Implementa, según las capacidades del backend:

- Crear.
- Editar.
- Duplicar.
- Archivar.
- Buscar.
- Filtrar.
- Ordenar.
- Eliminar con confirmación.
- Abrir el espacio de trabajo.
- Consultar versiones anteriores.

Agrega vistas de cuadrícula, lista y, cuando tenga sentido, cronograma.

Incluye una sección de tareas con responsables, fechas, estados y progreso real.

Si no existe soporte para colaboración multiusuario, no simules una sincronización en tiempo real.

---

### 8. EDITOR 3D PROFESIONAL

Esta es una de las áreas más importantes de ARQUILA.

Diseña un entorno de edición inspirado en herramientas profesionales de modelado arquitectónico.

#### Distribución de la interfaz

- Barra superior con nombre del proyecto, estado de guardado, deshacer, rehacer y acciones principales.
- Barra de herramientas vertical.
- Visor 3D central amplio.
- Panel lateral de escenas, capas u objetos.
- Inspector de propiedades.
- Barra inferior de navegación y estado.

Permite ocultar o contraer los paneles para ampliar el área de trabajo.

#### Visor 3D

Implementa, usando la tecnología 3D ya presente o una solución compatible:

- Órbita de cámara.
- Zoom.
- Desplazamiento de cámara.
- Vistas frontal, lateral, superior e isométrica.
- Perspectiva y ortográfica.
- Selección de objetos.
- Resaltado de selección.
- Cuadrícula opcional.
- Ejes de coordenadas.
- Control de visibilidad de elementos.
- Ajuste de encuadre.
- Modo de pantalla completa.

#### Herramientas de transformación

Cuando el motor y el modelo de datos lo permitan, incluye:

- Seleccionar.
- Mover.
- Rotar.
- Escalar.
- Duplicar.
- Eliminar.
- Ajustar a cuadrícula.
- Ajustar a ejes.
- Control numérico de posición.
- Control numérico de rotación.
- Control numérico de escala.

#### Árbol de objetos

Organiza los elementos por categorías:

- Terreno.
- Estructura.
- Muros.
- Suelos.
- Techos.
- Puertas.
- Ventanas.
- Mobiliario.
- Vegetación.
- Iluminación.
- Elementos decorativos.

Cada objeto debe poder seleccionarse desde el árbol, ocultarse y mostrarse cuando estas acciones estén implementadas.

#### Inspector

Muestra las propiedades relevantes del objeto seleccionado:

- Nombre.
- Tipo.
- Transformaciones.
- Material.
- Dimensiones.
- Visibilidad.
- Información específica del elemento.

#### Historial y guardado

Implementa deshacer y rehacer para las operaciones que realmente admitan historial.

Incluye guardado manual y autoguardado cuando exista persistencia adecuada. Muestra claramente los estados guardando, guardado y error de guardado.

**No simules un editor 3D funcional mediante una imagen estática.** Los controles de cámara, la selección y las transformaciones deben actuar sobre una escena real.

---

### 9. EDITOR DE PLANOS 2D

Diseña una interfaz técnica, precisa y optimizada para dibujo arquitectónico.

#### Área de dibujo

Incluye:

- Cuadrícula configurable.
- Zoom.
- Desplazamiento.
- Rejilla de referencia.
- Reglas.
- Ejes.
- Indicador de escala.
- Ajuste a puntos y líneas.
- Herramientas de medición.
- Selección de elementos.
- Controles para centrar el plano.

#### Herramientas

Prepara herramientas para:

- Seleccionar.
- Dibujar muros.
- Crear habitaciones.
- Insertar puertas.
- Insertar ventanas.
- Dibujar líneas.
- Dibujar cotas.
- Insertar textos.
- Medir distancias.
- Duplicar y eliminar elementos.

Cada herramienta debe tener un comportamiento coherente y mostrar sus opciones cuando esté activa.

#### Gestión de planos

Incluye:

- Planta baja.
- Plantas superiores.
- Cubierta.
- Secciones.
- Fachadas.

Estas categorías deben reflejar planos existentes o permitir crearlos mediante un modelo de datos real.

#### Propiedades

Permite configurar:

- Escala.
- Unidades.
- Formato de página.
- Grosor de línea.
- Capas.
- Visibilidad.
- Cotas.
- Etiquetas.

#### Exportación

Implementa exportación a PDF o formatos compatibles con las capacidades reales de la aplicación.

No presentes un botón como funcional si no genera un archivo válido.

---

### 10. BIBLIOTECA DE MATERIALES

Rediseña la biblioteca como un catálogo visual profesional.

#### Categorías

- Madera.
- Piedra.
- Concreto.
- Metal.
- Vidrio.
- Cerámica.
- Ladrillo.
- Mármol.
- Pinturas.
- Textiles.
- Materiales personalizados.

#### Catálogo

Cada material debe incluir:

- Miniatura de textura.
- Nombre.
- Categoría.
- Etiquetas.
- Favoritos.
- Vista previa ampliada.
- Información técnica cuando esté disponible.

Añade filtros, búsqueda y ordenamiento.

#### Propiedades PBR

Cuando el motor de renderizado lo admita, incorpora controles para:

- Color base.
- Rugosidad.
- Metalicidad.
- Normal map.
- Mapa de relieve.
- Transparencia.
- Escala y repetición de textura.

#### Aplicación

El usuario debe poder seleccionar un material y aplicarlo al objeto elegido en el editor 3D.

La vista previa debe mostrar el material sobre una superficie real cuando exista soporte para ello.

---

### 11. ILUMINACIÓN Y CLIMA

Crea un panel de iluminación visualmente claro y técnicamente útil.

#### Controles

- Hora del día.
- Fecha, cuando afecte al cálculo solar.
- Orientación solar.
- Intensidad de iluminación.
- Temperatura de color.
- Exposición.
- Sombras.
- Cielo.
- Nubes.
- Entorno HDRI cuando esté soportado.

#### Previsualización

Muestra el resultado en el visor 3D.

Los cambios deben actualizar la escena cuando el motor permita controlar esos parámetros.

Distingue entre:

- Iluminación de trabajo.
- Iluminación de presentación.
- Configuración de renderizado.

Evita controles que aparenten modificar la escena sin producir cambios visibles.

---

### 12. RENDERIZADO FOTORREALISTA

Diseña un espacio dedicado a preparar y revisar renders.

#### Parámetros

- Resolución.
- Relación de aspecto.
- Cámara.
- Encuadre.
- Calidad.
- Iluminación.
- Sombras.
- Reflejos.
- Exposición.
- Profundidad de campo, si está soportada.
- Formato de salida.

#### Flujo de trabajo

1. Seleccionar cámara.
2. Ajustar iluminación.
3. Configurar calidad.
4. Iniciar renderizado.
5. Mostrar progreso real.
6. Presentar el resultado.
7. Permitir descargar el archivo generado.

Incluye estados de espera, procesamiento, éxito, error y cancelación cuando el sistema lo permita.

Si el proyecto no dispone de un motor de renderizado, prepara una integración compatible o implementa primero una vista de previsualización claramente identificada. No afirmes que existe renderizado fotorrealista real si solamente se muestra una imagen de ejemplo.

---

### 13. RECORRIDOS VIRTUALES

Crea una interfaz inmersiva para explorar proyectos arquitectónicos.

Incluye:

- Vista de navegación.
- Puntos de recorrido.
- Miniaturas de escenas.
- Controles de movimiento.
- Pantalla completa.
- Selección de posición.
- Configuración de velocidad.
- Vista inicial.
- Transiciones entre puntos.

Cuando el motor lo permita, incorpora:

- Cámara en primera persona.
- Navegación orbital.
- Cambio entre estancias.
- Recorrido automático.
- Puntos de interés.
- Controles de reproducción y pausa.

Optimiza el rendimiento y ofrece una alternativa cuando el dispositivo no pueda ejecutar la escena con fluidez.

---

### 14. TERRENOS Y CONTEXTO DEL PROYECTO

Diseña una sección para organizar terrenos y su relación con los proyectos.

Incluye:

- Nombre del terreno.
- Ubicación.
- Área.
- Dimensiones.
- Orientación.
- Pendiente cuando se conozca.
- Imágenes.
- Documentación.
- Proyecto asociado.

Si existen coordenadas y una integración cartográfica compatible, muestra un mapa. No inventes ubicaciones ni información topográfica.

Organiza los datos en una interfaz clara, con fichas, filtros y panel de detalles.

---

### 15. CONFIGURACIÓN Y PERSONALIZACIÓN

Rediseña la configuración mediante secciones bien organizadas.

#### Perfil

- Nombre.
- Avatar.
- Correo.
- Datos editables según permisos.

#### Apariencia

- Modo claro.
- Modo oscuro.
- Modo automático.
- Preferencias de densidad de interfaz cuando sea viable.
- Reducción de movimiento.

#### Preferencias

- Unidades métricas o imperiales.
- Opciones predeterminadas de cámara.
- Calidad de previsualización.
- Preferencias de notificación.
- Atajos de teclado.

#### Seguridad

Respeta los mecanismos existentes para sesión, cambio de contraseña y cierre de sesión.

Las preferencias deben persistir entre sesiones cuando exista un mecanismo de almacenamiento adecuado.

---

### 16. MODO CLARO Y OSCURO

Implementa ambos temas como parte del sistema de diseño, no como una inversión automática de colores.

#### Modo claro

- Fondo gris muy claro.
- Paneles blancos.
- Texto oscuro.
- Bordes suaves.
- Verde lima para acciones destacadas.

#### Modo oscuro

- Fondo verde casi negro.
- Paneles en distintos niveles de verde oscuro.
- Texto claro.
- Bordes discretos.
- Verde lima para acciones y selecciones.

Los dos modos deben conservar:

- Contraste suficiente.
- Estados legibles.
- Iconos consistentes.
- Formularios accesibles.
- Visibilidad clara de la selección.
- Lectura cómoda de información técnica.

Permite cambiar de tema sin recargar la aplicación cuando sea posible.

---

### 17. DISEÑO RESPONSIVE

La plataforma debe funcionar en escritorio, tablet y móvil.

#### Escritorio

Optimiza el espacio para el trabajo técnico, los paneles de propiedades y el visor.

#### Tablet

Adapta las barras laterales, los paneles y los controles sin reducir innecesariamente la legibilidad.

#### Móvil

Prioriza:

- Consulta de proyectos.
- Revisión de planos.
- Visualización de renders.
- Gestión de tareas.
- Recorridos virtuales.
- Acciones básicas del proyecto.

En pantallas pequeñas, utiliza navegación compacta, paneles desplegables y controles táctiles adecuados.

No intentes comprimir toda la interfaz de escritorio en una pantalla móvil. Reorganiza las herramientas según el contexto.

---

### 18. ANIMACIONES Y MICROINTERACCIONES

Implementa animaciones discretas y funcionales.

Incluye:

- Transiciones entre páginas.
- Apertura de paneles.
- Hover de botones.
- Selección de tarjetas.
- Feedback de guardado.
- Indicadores de carga.
- Skeletons para contenido pendiente.
- Confirmaciones de acciones.
- Notificaciones.
- Estados vacíos ilustrados.

Las animaciones deben ser rápidas, coherentes y respetar `prefers-reduced-motion`.

No añadas efectos que retrasen el trabajo ni animaciones permanentes que distraigan.

---

### 19. ACCESIBILIDAD Y USABILIDAD

Aplica buenas prácticas de accesibilidad.

- Navegación completa por teclado.
- Estados de foco visibles.
- Etiquetas asociadas a formularios.
- Contraste adecuado.
- Iconos acompañados de texto cuando sea necesario.
- Mensajes de error comprensibles.
- Alternativas textuales para imágenes relevantes.
- Botones con nombres accesibles.
- Áreas táctiles apropiadas.
- Compatibilidad con lectores de pantalla.
- Respeto a las preferencias de movimiento reducido.

No dependas exclusivamente del color para comunicar estados.

---

### 20. RENDIMIENTO Y CALIDAD TÉCNICA

Analiza y optimiza el proyecto existente antes de introducir nuevas dependencias.

#### Rendimiento

- Carga diferida de módulos pesados.
- Optimización de imágenes.
- División de código.
- Renderizado eficiente de componentes.
- Prevención de renders innecesarios.
- Gestión correcta de recursos 3D.
- Liberación de geometrías, materiales y texturas cuando corresponda.
- Estados de carga para operaciones asíncronas.
- Manejo de errores.

#### Calidad del código

- TypeScript con tipos adecuados.
- Componentes reutilizables.
- Separación de responsabilidades.
- Validación de formularios.
- Manejo consistente de errores.
- Gestión segura de sesiones.
- Variables de entorno correctamente utilizadas.
- Código fácil de mantener.
- Ausencia de secretos en el frontend.

No desactives el tipado, los tests ni las reglas de calidad para ocultar errores.

---

### 21. CONSERVACIÓN DE LA ARQUITECTURA EXISTENTE

Antes de implementar cambios:

1. Examina la estructura de carpetas.
2. Identifica las tecnologías utilizadas.
3. Revisa `package.json`.
4. Examina las rutas.
5. Identifica los componentes existentes.
6. Comprueba la integración con la API.
7. Identifica los sistemas de autenticación.
8. Revisa las dependencias de modelado y renderizado.
9. Identifica las funcionalidades que ya operan.
10. Determina qué pantallas necesitan mejoras y cuáles deben construirse.

Después:

- Conserva las funcionalidades que ya funcionan.
- Reutiliza componentes útiles.
- Respeta los contratos de API.
- Mantén las variables de entorno necesarias.
- No reemplaces el backend por datos inventados.
- No elimines rutas útiles.
- Evita reescribir todo desde cero si no es necesario.
- Añade nuevas dependencias solamente cuando estén justificadas.
- Documenta las decisiones técnicas relevantes.

Si una funcionalidad no está soportada por el backend o el motor 3D, identifica esa limitación y desarrolla una implementación compatible en lugar de simularla.

---

### 22. ESTÁNDARES DE CALIDAD VISUAL

La aplicación final debe cumplir estas condiciones:

- Todas las pantallas comparten la misma identidad visual.
- El dashboard tiene una jerarquía clara.
- Los renders arquitectónicos tienen suficiente protagonismo.
- El editor 3D prioriza el área de trabajo.
- Los planos 2D se leen como herramientas técnicas.
- La biblioteca de materiales es visual y fácil de explorar.
- Los formularios son legibles.
- Los paneles de propiedades están bien organizados.
- Las tablas y listas no se ven saturadas.
- Los botones muestran claramente su función.
- Los estados de carga y error están diseñados.
- Los modos claro y oscuro son consistentes.
- La versión móvil tiene una distribución propia.
- No existen elementos decorativos que aparenten funcionalidades inexistentes.

Busca una calidad visual comparable a una herramienta profesional de arquitectura contemporánea: limpia, precisa, moderna y centrada en el trabajo.

---

### 23. PLAN DE IMPLEMENTACIÓN

Trabaja en este orden:

**Fase 1 — Auditoría**
Analiza el código, las funcionalidades, las dependencias, las rutas y los servicios existentes.

**Fase 2 — Sistema visual**
Define la paleta, tipografía, componentes compartidos, espaciado, navegación y temas.

**Fase 3 — Dashboard y autenticación**
Rediseña la portada, las tarjetas de proyectos, el buscador y el inicio de sesión.

**Fase 4 — Proyectos y materiales**
Implementa las vistas de gestión, búsqueda, filtros, estados y detalles.

**Fase 5 — Herramientas arquitectónicas**
Mejora el editor 3D, los planos 2D, los materiales, la iluminación y los recorridos según las capacidades existentes.

**Fase 6 — Renderizado y exportación**
Conecta las funciones reales de previsualización, generación de archivos y descarga.

**Fase 7 — Responsive y accesibilidad**
Adapta los módulos a distintos tamaños de pantalla y revisa la navegación por teclado.

**Fase 8 — Pruebas y validación**
Ejecuta las comprobaciones disponibles, corrige errores y verifica que las funcionalidades anteriores sigan funcionando.

Prioriza entregar una versión funcional y consistente antes de incorporar herramientas avanzadas que dependan de un motor 3D o backend adicional.

---

### 24. CRITERIOS DE ACEPTACIÓN

Considera terminado el trabajo cuando:

1. El proyecto arranque correctamente.
2. No existan errores de compilación.
3. La navegación principal funcione.
4. El dashboard use datos reales disponibles.
5. El inicio de sesión respete la autenticación existente.
6. Los formularios validen sus datos.
7. Los temas claro y oscuro sean utilizables.
8. Los diseños se adapten a escritorio, tablet y móvil.
9. Las acciones visibles tengan comportamientos reales.
10. Los estados de carga, error y vacío estén implementados.
11. El editor 3D funcione dentro de las capacidades reales del motor.
12. Los planos y las exportaciones generen resultados válidos cuando estén implementados.
13. No se hayan eliminado funcionalidades existentes sin justificación.
14. Las pruebas disponibles se ejecuten y sus resultados se documenten.

No afirmes que las pruebas pasaron si no las ejecutaste.

---

### 25. ENTREGA FINAL

Al terminar:

- Presenta un resumen de las mejoras realizadas.
- Enumera los archivos importantes modificados o creados.
- Explica cómo ejecutar el proyecto.
- Indica las variables de entorno necesarias sin revelar secretos.
- Documenta las funcionalidades completadas.
- Identifica las funcionalidades que requieren backend o motor 3D adicional.
- Informa los resultados reales de compilación y pruebas.
- Proporciona capturas de las principales pantallas si el entorno permite generarlas.

### INSTRUCCIÓN FINAL

Comienza inspeccionando el proyecto existente y continúa con su implementación real.

No te detengas en un plan, una descripción o un mockup. Realiza los cambios directamente en los archivos del proyecto, conserva lo que ya funciona y verifica el resultado.

El objetivo es transformar ARQUILA en una plataforma arquitectónica visualmente premium, técnicamente sólida, accesible, adaptable y preparada para evolucionar hacia una herramienta profesional de diseño, modelado y visualización arquitectónica.