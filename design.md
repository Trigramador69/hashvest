# Krellix Dashboard — Strict Design Specification

> **Status:** source of truth para implementar interfaces tipo dashboard con el lenguaje visual de Krellix.  
> **Referencia visual principal:** dashboard oscuro generado a partir del análisis de `krellixlabs.com/en/solutions`.  
> **Objetivo:** que cualquier diseñador, desarrollador o agente de código reproduzca la misma dirección visual sin reinterpretarla como un SaaS genérico.  
> **Regla de autoridad:** si una decisión visual no está explícitamente permitida en este documento, **no debe inventarse**. Usar el token o patrón más cercano ya definido aquí.

---

# 0. Contrato de implementación

Este archivo no es una guía inspiracional. Es una **especificación prescriptiva**.

Las palabras siguientes son normativas:

- **MUST / DEBE** = obligatorio.
- **MUST NOT / NO DEBE** = prohibido.
- **SHOULD / DEBERÍA** = recomendado salvo restricción técnica real.
- **MAY / PUEDE** = opcional, siempre que no rompa las reglas obligatorias.

## 0.1. Orden de prioridad

Cuando haya conflicto entre decisiones, resolver en este orden:

1. **Estructura y composición** del dashboard.
2. **Paleta y contraste**.
3. **Tipografía**.
4. **Bordes, radios y espaciado**.
5. **Gráficos / data-art**.
6. **Microinteracciones**.
7. Decoración.

Nunca sacrificar estructura, tipografía o contraste para añadir decoración.

## 0.2. Principio rector

La interfaz debe sentirse como una mezcla de:

- herramienta interna sofisticada,
- producto de IA serio,
- terminal editorial,
- visualización de datos minimalista,
- sistema oscuro con jerarquía construida mediante espacio, líneas y tipografía.

**No debe parecer:**

- plantilla de dashboard de Tailwind genérica,
- dashboard financiero azul corporativo,
- “AI SaaS” con gradientes púrpura/neón,
- glassmorphism,
- app móvil ampliada,
- interfaz gaming/cyberpunk.

---

# 1. Dirección visual obligatoria

## 1.1. Identidad visual

La interfaz debe usar:

- fondo casi negro;
- superficies oscuras apenas diferenciadas;
- líneas de 1px;
- tipografía monoespaciada como rasgo de identidad;
- blanco cálido para información principal;
- verde como color de estado y marca;
- **azul cobalto apagado como acento secundario**;
- naranja solo para warning / riesgo / dato excepcional;
- gráficos formados por puntos, líneas finas y data-art;
- alta densidad informativa, pero con jerarquía y aire.

## 1.2. Cambio obligatorio de color secundario

El morado queda eliminado del sistema.

**PROHIBIDO:**

```text
#7A3B77
violet
purple
magenta
fuchsia
```

El reemplazo oficial es:

```css
--accent-blue: #4d6ad9;
```

Se eligió azul cobalto porque:

- contrasta con el verde sin competir con él;
- conecta mejor con el data-art azul visto en el lenguaje original de Krellix;
- mantiene una estética tecnológica sobria;
- evita el cliché visual de “AI = purple gradient”.

---

# 2. Paleta oficial

## 2.1. Neutrales

```css
:root {
  --canvas: #070808;
  --canvas-deep: #020202;
  --surface-1: #0b0c0c;
  --surface-2: #101111;
  --surface-3: #151616;
  --surface-hover: #181a1a;

  --text-primary: #f5f5f1;
  --text-secondary: #a2a39f;
  --text-muted: #747672;
  --text-disabled: #50524f;

  --border-soft: rgba(245, 245, 241, 0.06);
  --border-default: rgba(245, 245, 241, 0.1);
  --border-strong: rgba(245, 245, 241, 0.16);
}
```

### Reglas

- `--canvas` es el fondo dominante del producto.
- `--surface-1` se usa para cards y paneles.
- `--surface-2` solo para controles o subpaneles internos.
- El contraste entre superficies debe ser **sutil**. No crear “cajas flotantes” con fondos muy distintos.
- No usar `#000000` puro como único color de toda la aplicación.

## 2.2. Acentos

```css
:root {
  --accent-green: #57d98b;
  --accent-green-brand: #058a45;
  --accent-green-deep: #0a5c35;
  --accent-green-soft: rgba(87, 217, 139, 0.12);

  --accent-blue: #4d6ad9;
  --accent-blue-soft: rgba(77, 106, 217, 0.12);

  --accent-orange: #e9832d;
  --accent-orange-soft: rgba(233, 131, 45, 0.12);

  --accent-white: #e8e8e3;
}
```

## 2.3. Distribución de color

En un viewport desktop promedio:

- 78–84%: canvas / negros.
- 10–15%: superficies oscuras.
- 5–8%: blanco / gris.
- 1–3%: verde.
- <1.5%: azul cobalto.
- <0.5%: naranja.

El azul y naranja **no son decorativos**. Deben representar series, categorías o estados.

---

# 3. Tipografía

## 3.1. Familias

```css
--font-mono:
  "Geist Mono", "IBM Plex Mono", "SFMono-Regular", Consolas, monospace;
--font-sans: "Geist", "Inter", "Helvetica Neue", Arial, sans-serif;
```

Si `Geist` no está disponible:

- usar `IBM Plex Mono` para mono;
- usar `Inter` para sans.

No sustituir por fuentes display futuristas, condensadas o geométricas decorativas.

## 3.2. Uso obligatorio

### Mono

Debe usarse para:

- logo textual si no hay asset;
- navegación principal;
- breadcrumb / eyebrow;
- H1 y H2 principales;
- números KPI;
- títulos de panel;
- labels de charts;
- tablas densas;
- fechas y metadata técnica;
- botones del sistema.

### Sans

Debe usarse para:

- descripciones largas;
- subtítulos explicativos;
- textos de ayuda;
- párrafos de marketing;
- texto secundario que necesite máxima legibilidad.

## 3.3. Escala tipográfica desktop

```css
--fs-10: 10px;
--fs-11: 11px;
--fs-12: 12px;
--fs-13: 13px;
--fs-14: 14px;
--fs-16: 16px;
--fs-18: 18px;
--fs-22: 22px;
--fs-28: 28px;
--fs-42: 42px;
--fs-56: 56px;
```

### H1 del dashboard

```css
font-family: var(--font-mono);
font-size: clamp(42px, 4.1vw, 60px);
font-weight: 400;
line-height: 0.98;
letter-spacing: -0.045em;
```

### H2 / título de sección

```css
font-family: var(--font-mono);
font-size: 22px;
font-weight: 400;
line-height: 1.15;
letter-spacing: -0.02em;
```

### Título de card

```css
font-family: var(--font-mono);
font-size: 15px;
font-weight: 500;
line-height: 1.25;
```

### KPI

```css
font-family: var(--font-mono);
font-size: 28px;
font-weight: 500;
line-height: 1;
letter-spacing: -0.03em;
font-variant-numeric: tabular-nums;
```

### Body UI

```css
font-family: var(--font-sans);
font-size: 12px;
line-height: 1.45;
color: var(--text-secondary);
```

## 3.4. Reglas tipográficas estrictas

- NO usar `font-weight: 800` o `900`.
- NO usar H1 sans-serif bold.
- NO usar uppercase extensivo excepto micro-labels.
- H1 debe tener mucho aire y peso regular.
- Números siempre con `tabular-nums`.
- En tablas, tamaños 11–13px.
- No usar más de dos familias tipográficas.

---

# 4. App Shell — estructura obligatoria

Para dashboards, la estructura base debe ser:

```text
┌──────────────────────────────────────────────────────────────────────┐
│ Sidebar  │ Topbar                                                    │
│          ├───────────────────────────────────────────────────────────┤
│          │ Main                                                      │
│          │  ├─ Hero / context                                       │
│          │  ├─ KPI row                                               │
│          │  ├─ Analytics grid                                        │
│          │  ├─ Projects / Performance                                │
│          │  └─ Activity / promo / secondary panels                   │
└──────────────────────────────────────────────────────────────────────┘
```

## 4.1. Sidebar

Desktop:

```css
--sidebar-width: 192px;
```

### Apariencia

```css
.sidebar {
  width: 192px;
  background: #070808;
  border-right: 1px solid var(--border-soft);
}
```

### Padding

```css
padding: 20px 10px;
```

### Logo

- posición superior;
- 26–32px de alto;
- margen inferior: 38–48px;
- blanco;
- sin bloque de color detrás.

### Nav item

```css
.nav-item {
  min-height: 42px;
  padding: 0 16px;
  border-radius: 6px;
  color: var(--text-secondary);
}
```

Activo:

```css
background: rgba(87, 217, 139, 0.1);
color: var(--accent-green);
```

**NO usar:** pills grandes, sombras, gradientes o iconos rellenos multicolor.

## 4.2. Topbar

```css
--topbar-height: 84px;
```

```css
.topbar {
  height: 84px;
  border-bottom: 1px solid var(--border-soft);
  background: rgba(7, 8, 8, 0.96);
}
```

Debe contener como máximo:

- búsqueda;
- notificaciones;
- avatar / cuenta;
- 1 acción contextual opcional.

No llenar el topbar con filtros, tabs y CTAs simultáneamente.

## 4.3. Main

```css
.main {
  padding: 20px 20px 40px;
}
```

Ancho máximo:

```css
max-width: 1440px;
margin-inline: auto;
```

---

# 5. Grid principal

## 5.1. Desktop

Usar grid de 12 columnas.

```css
.dashboard-grid {
  display: grid;
  grid-template-columns: repeat(12, minmax(0, 1fr));
  gap: 12px;
}
```

### Gap obligatorio

- desktop: `12px`;
- tablet: `10px`;
- mobile: `8px`.

No usar gaps de 24–32px dentro del dashboard denso.

## 5.2. Composición de referencia

### Hero

```text
8 columnas: copy
4 columnas: data-art / ambient graphic
```

### KPI row

```text
4 cards x 3 columnas
```

### Analytics middle row

```text
Project Activity   = 5 columnas
Data Sources       = 3 columnas
Promo / Insight    = 4 columnas
```

### Lower row

```text
Top Projects       = 5 columnas
Model Performance  = 4 columnas
Recent Activity    = 3 columnas
```

Se admite una variación de ±1 columna si el contenido lo exige, pero debe mantenerse el ritmo 5/4/3 o 5/3/4.

---

# 6. Hero del dashboard

## 6.1. Altura

```css
min-height: 195px;
```

No convertir el hero en una card encerrada. Debe integrarse con el canvas.

## 6.2. Composición

Izquierda:

```text
DASHBOARD
Work smarter
Turn data into action. Track progress, collaborate and build what's next with AI.
```

Derecha:

- data-art / point cloud;
- malla abstracta de puntos;
- sin fotografía;
- sin ilustración 3D;
- máximo 40% del ancho.

## 6.3. Eyebrow

```css
font: 500 10px/1 var(--font-mono);
letter-spacing: 0.06em;
text-transform: uppercase;
color: var(--accent-green);
```

## 6.4. Descripción

```css
max-width: 560px;
margin-top: 14px;
font-size: 13px;
line-height: 1.6;
color: var(--text-secondary);
```

---

# 7. Cards y paneles

## 7.1. Card base

```css
.card {
  background: var(--surface-1);
  border: 1px solid var(--border-default);
  border-radius: 8px;
  box-shadow: none;
}
```

### Padding

- KPI: `20px`;
- chart: `18px 20px`;
- table: `18px`;
- compact activity: `16px`.

## 7.2. Prohibiciones

- NO sombras elevadas tipo Material.
- NO radius 16–32px.
- NO blur de fondo.
- NO border blanco brillante.
- NO background claro.
- NO iconos dentro de cuadrados pastel.

## 7.3. Hover

```css
.card.interactive:hover {
  border-color: var(--border-strong);
  background: #0d0e0e;
}
```

Movimiento máximo:

```css
transform: translateY(-1px);
```

Nunca usar `scale()` en cards del dashboard.

---

# 8. KPI cards

Cada KPI debe tener:

```text
[value]
[label]
[trend] [comparison]
[data-art icon]
```

## 8.1. Números

```css
font: 500 28px/1 var(--font-mono);
color: var(--text-primary);
```

## 8.2. Label

```css
font: 400 11px/1.4 var(--font-mono);
color: var(--text-secondary);
```

## 8.3. Trend

Positivo:

```css
color: var(--accent-green);
```

Negativo / riesgo:

```css
color: var(--accent-orange);
```

Neutral:

```css
color: var(--text-muted);
```

## 8.4. Iconografía KPI

Preferir data-art de puntos / wireframe de 32–56px.

Ejemplos:

- carpeta punteada;
- base de datos por anillos;
- diamond / mesh;
- figura humana compuesta por puntos.

NO usar iconos duotone grandes ni ilustraciones glossy.

---

# 9. Lenguaje de gráficos

Los gráficos son una parte central de la identidad.

## 9.1. Regla general

Un chart compatible con este sistema debe verse como una extensión de una terminal de datos, no como una librería BI genérica.

### Debe usar

- líneas de 1–1.5px;
- puntos pequeños;
- gridlines punteadas;
- labels pequeños monoespaciados;
- axis sin bordes pesados;
- tooltips oscuros;
- leyendas compactas;
- máximo 4 colores de serie.

### No debe usar

- áreas rellenas grandes;
- degradados rainbow;
- barras con border-radius exagerado;
- sombras;
- glow;
- purple;
- ejes gruesos;
- títulos enormes dentro del gráfico.

## 9.2. Series oficiales

Orden recomendado:

```css
--chart-series-1: #57d98b; /* primary green */
--chart-series-2: #4d6ad9; /* cobalt blue */
--chart-series-3: #d8d9d5; /* neutral light */
--chart-series-4: #e9832d; /* warning/orange */
--chart-series-muted: #5a5d59;
```

Purple está prohibido en cualquier serie.

## 9.3. Line chart

```css
stroke-width: 1.5px;
point-radius: 2px;
```

Usar 3 series máximo de forma predeterminada.

Ejemplo:

- Accuracy = verde.
- Precision = azul cobalto.
- Recall = blanco/gris.

Naranja solo si hay una cuarta serie semánticamente excepcional.

## 9.4. Bar chart

Preferencia visual: **columnas de puntos / segmentos discretos**.

Si se usa barra sólida:

- ancho estrecho;
- radius 0–2px;
- opacidad 0.8;
- sin gradiente.

## 9.5. Donut chart

- grosor: 10–14px.
- centro vacío oscuro.
- valor principal centrado en mono.
- leyenda a la derecha.
- máximo 5 segmentos.

Color recomendado:

```text
verde → azul → gris claro → gris medio → naranja
```

## 9.6. Gridline

```css
stroke: rgba(245, 245, 241, 0.07);
stroke-dasharray: 2 3;
```

## 9.7. Tooltip

```css
background: #0a0b0b;
border: 1px solid rgba(245, 245, 241, 0.12);
border-radius: 6px;
font: 10px/1.4 var(--font-mono);
box-shadow: none;
```

---

# 10. Data-art / gráficos abstractos

Esta categoría reemplaza decoraciones de marketing genéricas.

## 10.1. Permitido

- nubes de puntos;
- matrices de puntos;
- contornos formados por caracteres;
- mallas de datos;
- pseudo-ASCII;
- wireframes puntillistas;
- diagramas de nodos muy sutiles;
- formas abstractas derivadas de datasets.

## 10.2. Tratamiento

- fondo transparente o negro;
- 1–2 colores máximo;
- densidad irregular;
- opacidad 35–100%;
- zonas de desaparición / fade;
- bordes no perfectos;
- preferir verde + blanco o azul + blanco.

## 10.3. Uso obligatorio

Debe existir al menos **un elemento de data-art significativo** en cada pantalla principal del dashboard, por ejemplo:

- hero;
- promo insight card;
- KPI iconografía;
- empty state.

## 10.4. No confundir con partículas decorativas

No se permiten partículas flotando por todo el fondo.

Las partículas solo son válidas si construyen una forma, chart, malla o visual de datos dentro de una zona controlada.

---

# 11. Tabla de proyectos

## 11.1. Estructura

```text
Project | Status | Progress | Last updated
```

Máximo 5–7 filas visibles en desktop antes de scroll/paginación.

## 11.2. Row

```css
min-height: 38px;
border-top: 1px solid var(--border-soft);
```

## 11.3. Status

No usar badges grandes.

Usar:

```text
● On track
● At risk
● Completed
```

Colores:

- On track → green.
- At risk → orange.
- Completed → blue.
- Neutral → gray.

## 11.4. Progress bar

```css
height: 6px;
background: #2a2c2b;
border-radius: 99px;
```

Fill:

- normal → green;
- risk → orange;
- completed → blue o green según contexto.

NO usar gradientes.

---

# 12. Recent Activity

Actividad en columna compacta.

Cada item:

```text
[small status icon] [title]      [time]
                    [subtitle]
```

### Altura

`58–66px` por item.

### Icono

- 28–32px;
- círculo dark tinted;
- color semántico en glyph;
- no pastel.

### Separador

```css
border-top: 1px solid var(--border-soft);
```

---

# 13. Promo / What’s New card

Solo se permite **una card promocional dominante por viewport**.

Debe ser oscura, no brillante.

## 13.1. Background

Permitido:

```css
background:
  radial-gradient(circle at 100% 0%, rgba(87, 217, 139, 0.13), transparent 48%),
  #07110c;
```

Este es uno de los pocos casos donde un gradiente está permitido.

## 13.2. Contenido

- eyebrow verde;
- headline mono 18–24px;
- body breve;
- arrow button circular o link;
- data-art recortado en esquina.

## 13.3. Prohibido

- purple/blue gradients;
- glow;
- ilustración 3D;
- CTA primario enorme;
- fotografía.

---

# 14. Inputs y búsqueda

## 14.1. Search

```css
.search {
  height: 40px;
  max-width: 440px;
  background: #090a0a;
  border: 1px solid var(--border-default);
  border-radius: 7px;
  color: var(--text-primary);
}
```

Placeholder:

```css
color: var(--text-muted);
```

Focus:

```css
border-color: var(--border-strong);
box-shadow: 0 0 0 2px rgba(245, 245, 241, 0.03);
```

NO glow verde.

## 14.2. Buttons

### Primary light

```css
background: var(--text-primary);
color: var(--canvas-deep);
border-radius: 6px;
```

### Ghost dark

```css
background: transparent;
border: 1px solid var(--border-default);
color: var(--text-primary);
```

### Accent

Verde solo cuando la acción representa:

- continuar / aprobar;
- crear;
- estado positivo;
- acción principal única.

No usar botones verdes por toda la pantalla.

---

# 15. Iconografía

Usar solo una familia:

- Lucide, o
- Phosphor Regular, o
- Radix Icons.

## 15.1. Especificación

```css
size: 14px | 16px | 18px;
stroke-width: 1.25px;
```

## 15.2. Estado

- default → `#8A8C88`;
- hover → `#F5F5F1`;
- active → `#57D98B`;
- warning → `#E9832D`;
- completed / secondary category → `#4D6AD9`.

No usar icon packs mezclados.

---

# 16. Radios, bordes y profundidad

## 16.1. Radios

```css
--radius-control: 6px;
--radius-card: 8px;
--radius-large: 10px;
--radius-pill: 999px;
```

**Límite:** una card de dashboard normal nunca debe superar `10px` de radius.

## 16.2. Bordes

Base:

```css
1px solid rgba(245,245,241,0.10)
```

Sutil:

```css
1px solid rgba(245,245,241,0.06)
```

## 16.3. Sombras

Por defecto:

```css
box-shadow: none;
```

Solo menús flotantes / tooltip:

```css
box-shadow: 0 10px 28px rgba(0, 0, 0, 0.28);
```

---

# 17. Spacing

Escala oficial:

```css
--sp-1: 4px;
--sp-2: 8px;
--sp-3: 12px;
--sp-4: 16px;
--sp-5: 20px;
--sp-6: 24px;
--sp-8: 32px;
--sp-10: 40px;
--sp-12: 48px;
--sp-16: 64px;
```

No inventar valores como 17px, 19px, 23px salvo requisitos de geometría de iconos.

---

# 18. Motion

```css
--motion-fast: 120ms;
--motion-base: 180ms;
--motion-slow: 280ms;
--ease-standard: cubic-bezier(0.2, 0.8, 0.2, 1);
```

Permitido:

- color fade;
- border fade;
- opacity;
- translateY de 1–4px;
- line draw / chart reveal discreto;
- data points fade-in.

Prohibido:

- bounce;
- spring overshoot;
- parallax grande;
- cursor custom;
- glow pulsante;
- background particles en loop.

---

# 19. Responsive

## 19.1. Breakpoints

```css
--bp-mobile: 640px;
--bp-tablet: 900px;
--bp-desktop: 1200px;
```

## 19.2. Desktop ≥ 1200

- sidebar fija: 192px;
- 12 columnas;
- 4 KPIs en una fila;
- hero split 8/4;
- tablas y charts lado a lado.

## 19.3. Tablet 900–1199

- sidebar colapsable: 72px;
- 8 columnas;
- KPIs 2×2;
- hero 5/3;
- charts grandes apilados con panel lateral debajo.

## 19.4. Mobile < 900

- sidebar se convierte en drawer;
- topbar 64px;
- main padding 12px;
- todo a 1 columna;
- KPIs 2 columnas hasta 640px, luego 1 columna;
- hero data-art pasa debajo del copy o se oculta si distrae;
- tablas con scroll horizontal;
- gráfico mantiene mínimo 320px de ancho interno.

---

# 20. Accesibilidad

- contraste WCAG AA como mínimo para texto funcional;
- focus visible siempre;
- no comunicar estado solo por color;
- icono + label para status importantes;
- touch target mínimo 44×44px;
- charts deben tener tabla/sumario accesible si contienen información esencial;
- animaciones deben respetar `prefers-reduced-motion`;
- `#50524F` solo para contenido no crítico.

---

# 21. Tokens completos

```css
:root {
  /* Canvas */
  --canvas: #070808;
  --canvas-deep: #020202;
  --surface-1: #0b0c0c;
  --surface-2: #101111;
  --surface-3: #151616;
  --surface-hover: #181a1a;

  /* Text */
  --text-primary: #f5f5f1;
  --text-secondary: #a2a39f;
  --text-muted: #747672;
  --text-disabled: #50524f;

  /* Border */
  --border-soft: rgba(245, 245, 241, 0.06);
  --border-default: rgba(245, 245, 241, 0.1);
  --border-strong: rgba(245, 245, 241, 0.16);

  /* Accent */
  --accent-green: #57d98b;
  --accent-green-brand: #058a45;
  --accent-green-deep: #0a5c35;
  --accent-green-soft: rgba(87, 217, 139, 0.12);

  --accent-blue: #4d6ad9;
  --accent-blue-soft: rgba(77, 106, 217, 0.12);

  --accent-orange: #e9832d;
  --accent-orange-soft: rgba(233, 131, 45, 0.12);

  --chart-series-1: #57d98b;
  --chart-series-2: #4d6ad9;
  --chart-series-3: #d8d9d5;
  --chart-series-4: #e9832d;
  --chart-series-muted: #5a5d59;

  /* Type */
  --font-mono: "Geist Mono", "IBM Plex Mono", monospace;
  --font-sans: "Geist", "Inter", sans-serif;

  /* Geometry */
  --sidebar-width: 192px;
  --topbar-height: 84px;
  --radius-control: 6px;
  --radius-card: 8px;
  --radius-large: 10px;
  --radius-pill: 999px;

  /* Spacing */
  --sp-1: 4px;
  --sp-2: 8px;
  --sp-3: 12px;
  --sp-4: 16px;
  --sp-5: 20px;
  --sp-6: 24px;
  --sp-8: 32px;
  --sp-10: 40px;
  --sp-12: 48px;
  --sp-16: 64px;

  /* Motion */
  --motion-fast: 120ms;
  --motion-base: 180ms;
  --motion-slow: 280ms;
  --ease-standard: cubic-bezier(0.2, 0.8, 0.2, 1);
}
```

---

# 22. Tailwind mapping obligatorio

```js
export default {
  theme: {
    extend: {
      colors: {
        canvas: {
          DEFAULT: "#070808",
          deep: "#020202",
        },
        surface: {
          1: "#0B0C0C",
          2: "#101111",
          3: "#151616",
          hover: "#181A1A",
        },
        ink: {
          DEFAULT: "#F5F5F1",
          secondary: "#A2A39F",
          muted: "#747672",
          disabled: "#50524F",
        },
        accent: {
          green: "#57D98B",
          greenBrand: "#058A45",
          blue: "#4D6AD9",
          orange: "#E9832D",
        },
      },
      fontFamily: {
        mono: ["Geist Mono", "IBM Plex Mono", "monospace"],
        sans: ["Geist", "Inter", "sans-serif"],
      },
      borderRadius: {
        control: "6px",
        card: "8px",
        large: "10px",
      },
      spacing: {
        sidebar: "192px",
        topbar: "84px",
      },
    },
  },
};
```

**No añadir purple/fuchsia/violet al theme.**

---

# 23. Componentes base que deben existir

Implementar estos componentes antes de crear pantallas nuevas:

```text
AppShell
Sidebar
SidebarNavItem
Topbar
GlobalSearch
AccountMenu
PageEyebrow
PageTitle
PageDescription
MetricCard
DataArtIcon
Panel
PanelHeader
ChartLegend
DotBarChart
LineChart
DonutChart
ProjectsTable
StatusDot
ProgressBar
ActivityItem
PromoPanel
GhostButton
PrimaryButton
IconButton
Tooltip
EmptyState
SkeletonPanel
```

## Regla

No crear una card nueva ad hoc si puede resolverse combinando `Panel`, `PanelHeader` y un componente existente.

---

# 24. Anatomía exacta de una pantalla principal

Una pantalla de overview debe aproximarse a esta secuencia:

```text
APP SHELL
│
├── Sidebar
│   ├── Logo
│   ├── Dashboard [active]
│   ├── Projects
│   ├── Data
│   ├── Models
│   ├── Insights
│   ├── Team
│   └── Settings
│
├── Topbar
│   ├── Search
│   ├── Notifications
│   └── Account
│
└── Main
    ├── Hero
    │   ├── Eyebrow
    │   ├── Work smarter
    │   ├── Support copy
    │   └── Data-art
    │
    ├── KPI Row
    │   ├── Active Projects
    │   ├── Data Processed
    │   ├── Model Performance
    │   └── Team Members
    │
    ├── Analytics Row
    │   ├── Project Activity
    │   ├── Data Sources
    │   └── What's New
    │
    └── Detail Row
        ├── Top Projects
        ├── Model Performance
        └── Recent Activity
```

Si la pantalla no necesita uno de estos módulos, se puede retirar. No debe reemplazarse por una composición visual completamente distinta.

---

# 25. Reglas anti-deriva para IA / agentes de código

Este bloque debe tratarse como prompt de control.

## 25.1. Antes de generar UI

El agente debe verificar:

1. ¿El fondo es oscuro casi negro?
2. ¿La jerarquía depende de bordes y spacing, no de sombras?
3. ¿El H1 es mono regular y grande?
4. ¿La navegación activa usa verde discreto?
5. ¿Hay purple? Si sí, eliminarlo.
6. ¿El acento secundario es `#4D6AD9`?
7. ¿Los paneles tienen radius ≤ 10px?
8. ¿Los charts usan líneas/puntos finos?
9. ¿Hay data-art o una visualización abstracta compatible?
10. ¿La pantalla parece una herramienta profesional y no una plantilla genérica?

Si alguna respuesta es “no”, corregir antes de entregar.

## 25.2. Política de tokens

**MUST:**

- usar tokens de este archivo;
- usar colores exactos o alpha variants;
- usar spacing de la escala;
- usar radios oficiales.

**MUST NOT:**

- crear colores hex nuevos sin motivo semántico;
- crear otro verde de marca;
- reintroducir purple;
- usar `rounded-2xl`, `rounded-3xl` o equivalentes en cards;
- usar `shadow-xl` en paneles;
- usar `backdrop-blur` en cards;
- usar gradients decorativos salvo Promo Panel;
- usar glassmorphism;
- usar fondos claros.

## 25.3. Política de librerías UI

Si se usa shadcn/ui, MUI, Chakra, Ant Design u otra librería:

- resetear estilos visuales por defecto;
- no aceptar el radius default si supera 10px;
- no aceptar shadows default;
- no aceptar palettes purple/blue de fábrica;
- adaptar todos los charts a esta especificación.

La librería es infraestructura, no dirección visual.

---

# 26. Qué está explícitamente prohibido

La implementación se considera incorrecta si contiene cualquiera de estos patrones sin justificación funcional:

- morado / violeta / magenta;
- background blanco predominante;
- cards claras;
- gradients purple-blue;
- blobs neon;
- glass panels;
- sombras grandes;
- blur fuerte;
- 24px+ radius;
- botones pill en todas partes;
- iconos multicolor;
- illustrations 3D;
- hero con stock photo;
- headings sans extra-bold;
- chart palettes rainbow;
- sidebars de 260–320px;
- cards con exceso de padding y poco contenido;
- dashboard con cada módulo dentro de una card flotante independiente;
- chips pastel;
- “AI sparkle” repetido por toda la pantalla.

---

# 27. Visual QA — checklist de aceptación

Una pantalla **NO está terminada** hasta cumplir todos los ítems críticos.

## Críticos

- [ ] Canvas `#070808` / `#020202`.
- [ ] Sidebar ≈ 192px en desktop.
- [ ] Topbar ≈ 84px.
- [ ] H1 mono, peso 400.
- [ ] Cards con border 1px y radius 8px.
- [ ] Sin sombras en cards.
- [ ] Verde usado como acento principal, no como fondo dominante.
- [ ] No existe morado.
- [ ] Azul secundario = `#4D6AD9`.
- [ ] Naranja solo para warning/excepción.
- [ ] Charts con gridlines sutiles.
- [ ] Números tabulares.
- [ ] Data-art presente.
- [ ] Layout respeta grid denso 12-col.

## Recomendados

- [ ] Copy corto y técnico.
- [ ] 1 promo card máximo.
- [ ] Iconos 1–1.5px.
- [ ] Nada de glassmorphism.
- [ ] Hover de 1px / cambio de borde, no escalado.
- [ ] Responsive mantiene jerarquía.

### Umbral

- Fallo en cualquier ítem crítico = **rechazar implementación**.
- Menos de 4 fallos en recomendados = aceptable.
- 0–1 fallos en recomendados = alta fidelidad.

---

# 28. Snapshot test visual recomendado

Para evitar deriva durante desarrollo:

1. Renderizar dashboard a `1536×1024`.
2. Comparar estructura con la referencia.
3. Revisar manualmente:
   - sidebar;
   - topbar;
   - hero;
   - proporción de cards;
   - densidad;
   - palette;
   - typography;
   - data-art.
4. Repetir a `1280×800` y `390×844`.

La similitud debe evaluarse por **composición y lenguaje visual**, no por copiar texto o datos concretos.

---

# 29. CSS base recomendado

```css
html {
  color-scheme: dark;
  background: var(--canvas-deep);
}

body {
  margin: 0;
  background: var(--canvas);
  color: var(--text-primary);
  font-family: var(--font-sans);
  -webkit-font-smoothing: antialiased;
}

* {
  box-sizing: border-box;
}

::selection {
  background: rgba(87, 217, 139, 0.25);
  color: var(--text-primary);
}

:focus-visible {
  outline: 1px solid rgba(245, 245, 241, 0.55);
  outline-offset: 2px;
}
```

---

# 30. Prompt corto para generar nuevas pantallas

Usar este bloque cuando se delegue una nueva vista a una IA:

```text
Design this screen using the Krellix Dashboard design system from design.md.
Follow the document as a strict implementation contract, not as inspiration.
Use a near-black canvas, 1px subtle borders, 6–10px radii, monospaced display/UI typography,
restrained green accents, cobalt blue #4D6AD9 as the only secondary cool accent,
and orange only for warnings. Purple is forbidden.
Use dense 12-column dashboard composition, no glassmorphism, no large shadows,
no light cards, no neon gradients, and no generic SaaS styling.
Charts must use thin lines, dots, subtle dotted gridlines and dark tooltips.
Include one controlled data-art / point-cloud visual where appropriate.
Before finishing, validate every critical item in the Visual QA checklist.
```

---

# 31. Resumen de una línea

> **Krellix Dashboard = terminal editorial oscura + UI de producto + data-art + bordes finos + mono + verde controlado + azul cobalto puntual, sin morado, sin glass y sin estética SaaS genérica.**

---

# 32. Referencias originales del análisis

Sitio:

- https://krellixlabs.com/en/solutions
- https://krellixlabs.com/en

Material visual asociado al lenguaje del proyecto:

- https://dribbble.com/shots/27321979-Better-solutions-through-AI-collaboration
- https://dribbble.com/shots/27321965-AI-copilots-that-collaborate-like-a-real-team

La especificación de este archivo adapta ese lenguaje a una **plataforma de dashboards**, tomando como referencia compositiva el dashboard oscuro generado durante esta conversación.
