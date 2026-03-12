# Changelog - KitDigital.ar

Este archivo registra cambios importantes en las specs, decisiones de arquitectura y actualizaciones del proyecto.

## Formato

```
## [Fecha] - [Tipo de cambio]
- **Archivo afectado**: `ruta/al/archivo.md`
- **Descripción**: Breve descripción del cambio
- **Razón**: Por qué se hizo este cambio
```

## Tipos de cambio

- `ADD`: Nueva spec o documento agregado
- `UPDATE`: Spec o documento actualizado
- `FIX`: Corrección de error en spec
- `ARCHITECTURE`: Cambio de arquitectura o decisión importante

---

## [Marzo 2026] - Inicial

### ADD - Estructura base de ai-instructions/
- **Archivos creados**:
  - `00-skills.md`: Reglas globales y constitución de la IA
  - `01-master-document.md`: Documento técnico fundamental
  - `02-schema.sql`: Esquema SQL completo
  - `03-references.md`: Mapa de referencias cruzadas
  - `04-implementation-order.md`: Orden de implementación estricto
  - `05-project-structure.md`: Estructura de carpetas oficial
- **Razón**: Establecer base sólida para desarrollo con IA, evitar alucinaciones y mantener consistencia

### ADD - Estructura de docs/
- **Archivos creados**:
  - `docs/Documento-Tecnico-Fundamental.md`: Versión legible para humanos
  - `docs/schema.sql`: Versión legible para humanos
- **Razón**: Separar documentación para humanos de instrucciones para IA

### FIX - Trigger de límite de productos
- **Archivo afectado**: `02-schema.sql` (sección 8)
- **Descripción**: Corregido trigger `enforce_product_limit()` que contaba productos incorrectamente
- **Razón**: El trigger fallaba al activar el primer producto o pasar el límite. Ahora cuenta correctamente considerando INSERT/UPDATE en curso.

---

## Notas

- Este changelog se actualiza cuando hay cambios significativos en specs o arquitectura.
- Cambios menores (typos, mejoras de redacción) no se registran aquí.
- Siempre incluir razón del cambio para contexto futuro.

