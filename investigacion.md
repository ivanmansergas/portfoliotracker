# Investigación de Mercado: Portfolio Trackers 2026

Este documento resume el análisis de las aplicaciones líderes en el seguimiento de inversiones y propone funcionalidades clave para diferenciar nuestra aplicación de seguimiento de fondos indexados.

## 1. Referentes del Mercado

| Aplicación | Enfoque Principal | Fortaleza Clave |
| :--- | :--- | :--- |
| **Sharesight** | Rendimiento y Fiscalidad | Cálculo exacto de XIRR y tracking de dividendos. |
| **Empower** | Gestión Patrimonial | Visión de Net Worth y calculadoras de jubilación. |
| **Portfolio Performance** | Inversor Avanzado | Código abierto, privacidad y personalización extrema. |
| **Delta / Getquin** | Experiencia de Usuario (UX) | Diseño moderno, enfoque social y multi-activo. |
| **Yahoo/Google Finance** | Monitorización Rápida | Datos en tiempo real y facilidad de uso. |

## 2. Características Comunes (Línea Base)

Para ser competitiva, nuestra aplicación debe incluir estas funciones "estándar":
*   **Importación de Datos:** Soporte para CSV (especialmente MyInvestor) y entrada manual.
*   **Métricas de Rentabilidad:** Visualización de rentabilidad total y anualizada (XIRR).
*   **Asignación de Activos:** Gráficos de distribución (Renta Variable vs Renta Fija).
*   **Evolución Histórica:** Gráficos de línea comparando capital invertido vs valor de mercado.
*   **Actualización Automática:** Precios actualizados vía API (Yahoo Finance).

## 3. Propuestas de Valor Diferencial (Accionables)

Para alinearnos con una estética **Apple-inspired** y un enfoque en **fondos indexados**, proponemos las siguientes funcionalidades adicionales:

### A. Asistente de Rebalanceo Inteligente
*   **Descripción:** Permitir al usuario definir su asignación ideal (ej. 80/20).
*   **Acción:** Mostrar exactamente cuántos euros comprar/vender de cada fondo para volver al objetivo.

### B. Proyección de Independencia Financiera (FIRE)
*   **Descripción:** Conectar el simulador de interés compuesto con objetivos vitales.
*   **Acción:** Calcular el punto "Coast FIRE" y la fecha estimada de libertad financiera basada en gastos actuales.

### C. Visualizador de "Drag" por Comisiones (TER)
*   **Descripción:** Sensibilizar al usuario sobre el impacto de las comisiones bancarias.
*   **Acción:** Gráfico comparativo que muestre la pérdida de ganancias a 30 años debido al TER de los fondos.

### D. Tracking de Dividendos Fantasma
*   **Descripción:** En fondos de acumulación (ACC), los dividendos se reinvierten automáticamente y son "invisibles".
*   **Acción:** Un widget que estime cuánto dinero ha reinvertido el fondo por el usuario, reforzando la psicología de la inversión.

## 4. Estética y Experiencia (Apple Style)

*   **Tipografía:** Uso prioritario de *Inter* o *SF Pro*.
*   **Colores:** Paletas suaves, evitando el rojo/verde agresivo. Uso de degradados sutiles.
*   **Interacciones:** Micro-animaciones al cargar datos y efectos de cristal (glassmorphism) en las tarjetas de información.
*   **Modo Oscuro:** Implementar un "Pure Black" o "Deep Navy" como opción prioritaria.

---
*Documento generado para el proyecto Portfolio Tracker - Mayo 2026*
