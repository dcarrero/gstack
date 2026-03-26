# Origen del Proyecto

Este proyecto es un fork adaptado al castellano de **gstack**, creado por [Garry Tan](https://x.com/garrytan) (Presidente y CEO de [Y Combinator](https://www.ycombinator.com/)).

## Repositorio original

- **GitHub:** [garrytan/gstack](https://github.com/garrytan/gstack)
- **Licencia:** MIT
- **Versión base del fork:** 0.11.19.0

## Sincronización con upstream

Este fork mantiene el remote `upstream` apuntando al repositorio original para poder incorporar actualizaciones:

```bash
# Ver estado respecto al original
git fetch upstream
git log upstream/main --oneline -10

# Incorporar actualizaciones del original
git fetch upstream
git merge upstream/main
# Resolver conflictos de traducción si los hay
```

## Qué se ha adaptado

- **Documentación:** README, ETHOS y arquitectura traducidos al castellano
- **Skills:** Instrucciones y mensajes al usuario en castellano
- **Nombres de skills:** Se mantienen los nombres originales (son comandos slash)
- **Código:** El código TypeScript/Bash NO se traduce (es infraestructura)

## Filosofía de la adaptación

- Los nombres de los skills (`/review`, `/qa`, `/ship`) se mantienen en inglés porque son comandos
- Los mensajes que el agente muestra al usuario se traducen al castellano
- Los comentarios técnicos en el código se mantienen en inglés
- Se respeta la estructura original para facilitar merges con upstream
- Se pueden añadir skills propios en directorios adicionales

## Créditos

Todo el mérito del concepto, arquitectura y código original corresponde a **Garry Tan** y los contribuidores de [garrytan/gstack](https://github.com/garrytan/gstack). Esta adaptación se distribuye bajo la misma licencia MIT.
