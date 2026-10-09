# Backlog — Agente de soporte con Agentforce + Data 360

Oct 9, 2026 · @Mati

## Resumen

25 historias en 7 épicas, repartidas en 7 sprints (80 puntos en total). Lo marcado como Must alcanza para una demo completa; Should y Could suman si te sobra tiempo.

El escenario es un e-commerce de electrónica ficticio. Su agente responde consultas, informa pedidos, gestiona devoluciones y garantías, y escala a un humano. Todo corre en una Developer Edition con Agentforce y Data 360, versionado en GitHub con Salesforce DX.

- **Prioridad:** Must = sin esto no hay demo · Should = suma mucho al portfolio · Could = si sobra tiempo
- **Puntos:** escala Fibonacci (1, 2, 3, 5, 8) según complejidad relativa, no horas
- **Estado:** el progreso se sigue en Jira, proyecto KAN (épicas KAN-4 a KAN-10, historias KAN-11 a KAN-35); los desplegables de este doc quedan como referencia

## Épica 1 — Setup y modelo de datos

La base: org, repositorio y datos de prueba reproducibles. 8 puntos.

| ID    | Historia                                                                                                                                  | Criterios de aceptación                                                                                                                                                                  | Prioridad | Pts | Estado    |
| ----- | ----------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------- | --- | --------- |
| HU-01 | Como dev, quiero una Developer Edition con Agentforce y Data 360 conectada a un proyecto DX en GitHub, para versionar todo desde el día 1 | Org creada y autenticada con la CLI · repo con sfdx-project.json, .gitignore y README inicial · rama main protegida                                                                      | Must      | 2   | Pendiente |
| HU-02 | Como dev, quiero el modelo de datos del e-commerce, para soportar pedidos, devoluciones y garantías                                       | Order y OrderItem estándar + campos custom (fecha de entrega, meses de garantía, línea de producto) · permission set para el agente y los representantes · todo deployado desde el repo  | Must      | 3   | Pendiente |
| HU-03 | Como dev, quiero un script de datos de prueba reproducible, para que la demo dé siempre el mismo resultado                                | Un solo comando carga unas 20 cuentas y 50 pedidos · incluye pedidos de menos y más de 30 días, garantía vigente y vencida, montos sobre y bajo el umbral · se puede recargar desde cero | Must      | 3   | Pendiente |

## Épica 2 — Acciones en Apex

Las acciones que el agente invoca; acá está tu fuerte. 11 puntos.

| ID    | Historia                                                                                          | Criterios de aceptación                                                                                                                                                                                                                                                            | Prioridad | Pts | Estado    |
| ----- | ------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------- | --- | --------- |
| HU-04 | Como cliente, quiero consultar el estado de mi pedido con su número, para saber cuándo llega      | Acción @InvocableMethod GetOrderStatus · devuelve estado y fecha estimada · si el pedido no existe o no es del contacto, responde sin exponer datos · corre en user mode · cobertura mayor a 90%                                                                                   | Must      | 3   | Pendiente |
| HU-05 | Como cliente, quiero saber si mi compra entra en devolución o garantía, para conocer mis opciones | Acción CheckReturnEligibility devuelve devolución, garantía o no elegible, con el motivo · hasta 30 días = devolución; más de 30 con garantía vigente = garantía; monto sobre el umbral = requiere humano · plazo y umbral en Custom Metadata, no hardcodeados · un test por regla | Must      | 5   | Pendiente |
| HU-06 | Como cliente, quiero que mi reclamo quede registrado, para poder seguirlo                         | Acción CreateServiceCase crea el Case vinculado al contacto y al pedido, con origen "Agente IA" · acción UpdateCase agrega notas y cambia el estado · bulkificadas y con tests                                                                                                     | Must      | 3   | Pendiente |

## Épica 3 — Conocimiento con Data 360 (RAG)

El contenido que el agente consulta y cómo lo encuentra. 11 puntos.

| ID    | Historia                                                                                                             | Criterios de aceptación                                                                                                                                                        | Prioridad | Pts | Estado    |
| ----- | -------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------- | --- | --------- |
| HU-07 | Como dev, quiero contenido de conocimiento propio, para que el agente tenga qué consultar                            | Entre 8 y 10 artículos de Knowledge (envíos, pagos, cambios, garantía) · 2 o 3 PDFs (manual de un producto, política de devoluciones) · todo escrito por vos, sin datos reales | Must      | 3   | Pendiente |
| HU-08 | Como dev, quiero un Agentforce Data Library con search index y retriever, para que el agente busque en ese contenido | Chunking e índice completos · retriever con filtro por línea de producto y los campos que recibe el agente · probado con 5 preguntas                                           | Must      | 5   | Pendiente |
| HU-09 | Como cliente, quiero respuestas basadas en la información oficial, para confiar en lo que me dicen                   | Las 5 preguntas de prueba se responden bien · si no hay información, el agente lo dice y no inventa · la respuesta indica el artículo de origen                                | Should    | 3   | Pendiente |

## Épica 4 — Agente en Agent Script

El agente con sus 4 subagentes; HU-13 es la que más luce en la demo. 15 puntos.

| ID    | Historia                                                                                                                 | Criterios de aceptación                                                                                                                                                                                   | Prioridad | Pts | Estado    |
| ----- | ------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------- | --- | --------- |
| HU-10 | Como dev, quiero crear el agente desde DX y versionarlo en Git, para trabajar con el mismo flujo que el resto del código | Authoring bundle con el archivo .agent en el repo · deploy y retrieve funcionan · preview desde VS Code                                                                                                   | Must      | 3   | Pendiente |
| HU-11 | Como cliente, quiero hacer preguntas generales y recibir respuesta al instante                                           | Subagente Preguntas frecuentes usa el retriever de HU-08 · si la consulta es sobre un pedido, deriva al subagente que corresponde                                                                         | Must      | 2   | Pendiente |
| HU-12 | Como cliente, quiero consultar mi pedido conversando con el agente                                                       | Subagente Estado de pedido pide el número si falta · verifica la identidad del contacto antes de llamar a GetOrderStatus                                                                                  | Must      | 3   | Pendiente |
| HU-13 | Como cliente, quiero gestionar una devolución o garantía con reglas claras                                               | Subagente Devoluciones y garantía llama siempre a CheckReturnEligibility antes de responder · nunca ofrece una devolución que la acción rechazó, aunque el cliente insista · si corresponde, crea el Case | Must      | 5   | Pendiente |
| HU-14 | Como empresa, quiero límites globales para el agente, para que sea seguro y consistente                                  | Responde en español con un tono definido · no comparte datos de otros clientes · ante consultas fuera de alcance, redirige con amabilidad                                                                 | Must      | 2   | Pendiente |

## Épica 5 — Escalamiento, canal y consola

Cómo llega el cliente al agente y cómo pasa a una persona. 13 puntos.

| ID    | Historia                                                                                      | Criterios de aceptación                                                                                                                                                                                  | Prioridad | Pts | Estado    |
| ----- | --------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------- | --- | --------- |
| HU-15 | Como cliente, quiero hablar con una persona cuando el agente no puede resolver                | Escalamiento por Omni-Channel a la cola "Soporte nivel 2" · se dispara si el cliente lo pide, si el monto supera el umbral o tras 2 intentos fallidos · el representante recibe la conversación completa | Must      | 5   | Pendiente |
| HU-16 | Como cliente, quiero chatear con el agente desde la web de la tienda                          | Agente publicado en un sitio de Experience Cloud con Messaging for In-App and Web · funciona en desktop y mobile                                                                                         | Should    | 3   | Pendiente |
| HU-17 | Como representante, quiero ver qué hizo el agente antes de tomar el caso, para no repreguntar | LWC en la consola de Service con resumen, acciones ejecutadas y motivo de escalamiento · tests en Jest                                                                                                   | Should    | 5   | Pendiente |

## Épica 6 — Testing y CI/CD

El pipeline arranca en el sprint 1 y los tests del agente se suman cuando el agente existe. 13 puntos.

| ID    | Historia                                                                                  | Criterios de aceptación                                                                                                                                                                           | Prioridad | Pts | Estado    |
| ----- | ----------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------- | --- | --------- |
| HU-18 | Como dev, quiero un pipeline desde el primer sprint, para detectar errores en cada cambio | GitHub Actions en cada PR: valida el deploy y corre los tests de Apex · autenticación por JWT con secretos de GitHub · badge de estado en el README                                               | Must      | 3   | Pendiente |
| HU-19 | Como dev, quiero tests automáticos del agente, para saber que sigue respondiendo bien     | Test spec en YAML con 15 casos o más, que cubren los 4 subagentes y casos negativos · corre con sf agent test run · antes de empezar, comparar el Testing Center nuevo (beta) con el flujo legacy | Must      | 5   | Pendiente |
| HU-20 | Como dev, quiero que el pipeline corra también los tests del agente                       | Paso de tests del agente en GitHub Actions después de los de Apex · resultados guardados como artefacto del workflow                                                                              | Should    | 3   | Pendiente |
| HU-21 | Como dev, quiero análisis estático, para mostrar calidad de código                        | Salesforce Code Analyzer para Apex y ESLint para LWC en el pipeline · el PR falla si hay errores críticos                                                                                         | Could     | 2   | Pendiente |

## Épica 7 — Entregables de portfolio

Lo que ve un reclutador antes de abrir el código. 9 puntos.

| ID    | Historia                                                  | Criterios de aceptación                                                                                                                    | Prioridad | Pts | Estado    |
| ----- | --------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ | --------- | --- | --------- |
| HU-22 | Como reclutador, quiero entender el proyecto en 2 minutos | README en inglés: problema, arquitectura, decisiones técnicas, cómo correrlo y limitaciones (piezas en beta)                               | Must      | 3   | Pendiente |
| HU-23 | Como reclutador, quiero ver la arquitectura de un vistazo | Diagrama con org, Data 360, agente, acciones, Omni-Channel y pipeline · incluido en el README                                              | Must      | 2   | Pendiente |
| HU-24 | Como reclutador, quiero ver el agente funcionando         | Video de 2 minutos con 3 escenarios: pregunta respondida con el manual, devolución rechazada por regla, escalamiento a humano con contexto | Must      | 3   | Pendiente |
| HU-25 | Como profesional, quiero difundir el proyecto             | Post en LinkedIn en inglés con el video y el link al repo                                                                                  | Could     | 1   | Pendiente |

## Plan de sprints

7 sprints de una semana, de 10 a 13 puntos cada uno. Hay dos hitos: al cierre del sprint 4 el agente ya funciona en preview, y al cierre del sprint 7 el proyecto queda publicado.

| Sprint | Objetivo                                                   | Historias                         | Pts |
| ------ | ---------------------------------------------------------- | --------------------------------- | --- |
| 1      | Org, repo, datos de prueba y pipeline básico               | HU-01, HU-02, HU-03, HU-18        | 11  |
| 2      | Acciones en Apex con sus tests                             | HU-04, HU-05, HU-06               | 11  |
| 3      | Conocimiento indexado en Data 360                          | HU-07, HU-08, HU-09               | 11  |
| 4      | Agente con sus subagentes (hito: agente en preview)        | HU-10, HU-11, HU-12, HU-13        | 13  |
| 5      | Límites globales, escalamiento y canal web                 | HU-14, HU-15, HU-16               | 10  |
| 6      | Consola del representante y tests del agente en CI         | HU-17, HU-19, HU-20               | 13  |
| 7      | Calidad de código y entregables (hito: proyecto publicado) | HU-21, HU-22, HU-23, HU-24, HU-25 | 11  |

## Definition of Done

Una historia pasa a Hecho solo si cumple todo esto:

- Código y metadata en el repo, mergeados a main por pull request
- Pipeline en verde
- Cobertura de Apex de 85% o más en las clases nuevas
- Si toca el agente: casos nuevos en el test spec y pasando
- Sin datos reales ni credenciales en el repo
- README actualizado si cambia cómo se usa o se instala
