# Integración de GitHub Issues para Resolución Automática

Cuando el usuario pida resolver un ticket o bug por su número/ID (por ejemplo: "Resuelve el issue #42", "Mira el ticket #5" o similar):

1. **Obtener el Repositorio**:
   - Ejecuta `git remote -v` en el directorio de trabajo para identificar el usuario/organización y el nombre del repositorio de GitHub (ej. `xruedev/momentum-v3`).

2. **Consultar los Detalles en GitHub**:
   - Utiliza una petición HTTP (mediante PowerShell `Invoke-RestMethod` o Python) a la API de GitHub para recuperar los datos:
     ```
     GET https://api.github.com/repos/{owner}/{repo}/issues/{issue_number}
     ```
   - Si el repositorio es privado, usa la variable de entorno `$env:GITHUB_TOKEN` en la cabecera `Authorization: token $env:GITHUB_TOKEN`.
   - Recupera el título (`title`), descripción (`body`) y opcionalmente los comentarios (`comments_url`).

3. **Ejecutar la Tarea**:
   - Lee con detalle los requisitos o descripción del bug expuestos en el issue.
   - Crea un plan de acción para modificar los archivos relevantes del repositorio.
   - Aplica los cambios necesarios y verifica su correcto funcionamiento (correr tests, compilación, etc.).

4. **Documentar y Actualizar**:
   - Una vez resuelto, informa al usuario detalladamente de qué cambios se realizaron y cómo se validó.
   - Pregunta al usuario si desea que añadas un comentario al issue de GitHub o que lo cierres de forma automática mediante la API.
