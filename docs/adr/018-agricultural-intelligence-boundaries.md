# ADR 018 — Límites de inteligencia agrícola

- **Estado**: Accepted.
- **Fecha**: julio 2026.

## Contexto

AGROSBO integrará capacidades de IA para evaluación visual de cultivos y
escenarios de riego. Es necesario definir límites claros para evitar que el
sistema se presente como fuente de diagnóstico definitivo, recomendación de
agroquímicos o automatización financiera.

## Decisión

### Evaluación visual preliminar

- Tecnología: Amazon Bedrock con modelo multimodal.
- Produce: síntomas visibles, causas posibles, información faltante,
  inspecciones recomendadas, urgencia, confianza, aviso de seguridad.
- Es evaluación preliminar; nunca diagnóstico definitivo.
- No se entrena modelo custom en P0.
- Amazon Rekognition no es el motor principal (puede complementar en el futuro).
- No se emite recomendación automática de pesticidas ni agroquímicos.
- Cada evaluación incluye aviso explícito de que es preliminar.
- El usuario puede crear observación o tarea a partir de la evaluación (con
  confirmación estándar).

### Motor determinista de escenarios

- El primer motor es IrrigationDelayScenario.
- Es un módulo determinista separado del irrigation advisor actual (puede
  reutilizar sus datos y reglas).
- Produce: baseline, mejor caso, caso esperado, peor caso, rango, supuestos,
  datos utilizados, información faltante, confianza.
- Los cálculos son reproducibles y deterministas.
- El LLM explica, resume y presenta incertidumbre, pero no realiza el cálculo
  principal.
- El LLM no garantiza resultados.

### Límites de recomendaciones

- No recomendar pesticidas, fungicidas ni agroquímicos específicos.
- Diagnóstico definitivo está fuera de la competencia y alcance del producto;
  requiere evidencia, validación profesional y controles que P0 no ofrece.
- AGROSBO no debe presentarse como sustituto de asesoría profesional.
- No realizar automatización financiera o contractual.
- No presentar proyecciones como certezas.
- Todo escenario incluye supuestos, rango y nivel de confianza.
- Toda evaluación visual incluye aviso de seguridad.

## Alternativas consideradas

1. **Amazon Rekognition como motor principal de visión**: menos flexible para
   prompts agrícolas; no soporta tool calling ni explicación contextual;
   descartado como motor principal.
2. **Modelo custom entrenado en P0**: costo y tiempo prohibitivos para un
   hackathon; sin dataset agrícola etiquetado disponible; descartado.
3. **LLM realiza los cálculos directamente**: no reproducible; no auditable;
   propenso a alucinaciones numéricas; descartado.
4. **Diagnóstico definitivo**: fuera de la competencia del producto; requiere
   validación profesional; descartado categóricamente.

## Consecuencias positivas

- Responsabilidad clara: el sistema es herramienta de apoyo, no autoridad.
- Usuarios informados: avisos de seguridad y niveles de confianza visibles.
- Reproducibilidad: escenarios deterministas verificables.
- Auditoría: cada evaluación registrada con su resultado.

## Consecuencias negativas

- Usuarios pueden percibir la evaluación visual como menos útil si esperaban
  diagnóstico definitivo.
- El motor de escenarios requiere datos de entrada que pueden no estar
  disponibles (información faltante explícita en la salida).

## Riesgos

- Usuarios interpretan evaluación preliminar como diagnóstico a pesar del aviso.
- La disponibilidad del modelo, región, acceso y costos de Bedrock debe
  verificarse en critical-cloud-spikes (Spec 17) antes de implementar.
- Calidad de la evaluación visual depende del modelo y del prompt; requiere
  iteración.

## Referencias

- [`../product/product-scope-v2.md`](../product/product-scope-v2.md) §12, §13.
- [`./015-agent-action-and-confirmation-model.md`](./015-agent-action-and-confirmation-model.md).
