Leé y seguí estrictamente el sistema de ejecución del repo.

1) Abrí `dev/START.md` y seguí sus instrucciones sin saltearte pasos.  
2) Leé `dev/ESTADO.md` y determiná **fase/paso actual**, bloqueantes y próximo paso.  
3) Abrí el runbook correspondiente en `dev/fases/` (F0…F6) y ejecutá **solo el paso indicado**.  
4) Antes de implementar, leé los docs de `/system` que el runbook marque como obligatorios. Si algo no está definido en `/system`, **no inventes**.  
5) Implementá usando plantillas de `dev/plantillas/` cuando existan.  
6) No avances al siguiente paso sin pasar el **criterio de aceptación** y el checklist de `dev/agente/verificacion.md`.  
7) Al finalizar la sesión:
   - asegurá `npm run build` y `npx tsc --noEmit` sin errores (si aplica),
   - actualizá `dev/ESTADO.md` (pasos completados, bloqueantes, log de sesión),
   - dejá claro qué sigue exactamente.

Reglas innegociables:
- `/system` es la fuente de verdad.
- Toda escritura de dominio pasa por el **executor**.
- `store_id` se resuelve en servidor (nunca del cliente).
- Sin `any` explícito.

