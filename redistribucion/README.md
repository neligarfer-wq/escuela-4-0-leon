# Escuela 4.0 León · Formularios de necesidades y excedentes

Aplicación independiente de Lovable. El sitio está en `redistribucion/index.html`.

## Activación (una sola vez)
1. Crea una hoja de cálculo en Google Sheets, de acceso privado.
2. En **Extensiones → Apps Script**, pega íntegramente el contenido de `GoogleAppsScript.gs`.
3. Sustituye `PEGA_AQUI_EL_ID_DE_TU_HOJA` por el ID del documento: el texto entre `/d/` y `/edit` de la URL.
4. Guarda y usa **Implementar → Nueva implementación → Aplicación web**. Ejecutar como: **Yo**. Quién tiene acceso: **Cualquier persona**. Autoriza el script con tu cuenta.
5. Copia la URL de la implementación terminada en `/exec`.
6. Abre `index.html` en GitHub y sustituye `const endpoint='';` por `const endpoint='TU_URL_EXEC';`. Confirma el cambio.
7. Asegúrate de que GitHub Pages publica la rama que contiene el directorio `redistribucion`. El formulario estará disponible en la ruta `/redistribucion/` de tu dominio Pages.

## Exportar a Excel
Abre la hoja de respuestas (privada) → Archivo → Descargar → Microsoft Excel (.xlsx). Cada código de centro ocupa **una sola fila**, con columnas separadas por material para unidades que necesitan y sobran.

## Consideraciones
- Los centros no necesitan cuenta.
- El acceso a la hoja de resultados lo controla tu cuenta de Google. No compartas la hoja con los centros.
- Las nuevas comunicaciones para un mismo código actualizan los números de los materiales incluidos; no se suman, para evitar duplicidades.
- La interfaz muestra confirmación de carga del iframe, que **no demuestra por sí sola** que la hoja haya guardado la respuesta. Haz un envío de prueba y verifica el dato en la hoja antes de distribuir el enlace.
- No publiques datos reales de centros ni correos electrónicos en GitHub.
- Los catálogos iniciales deben revisarse con las dotaciones efectivamente recibidas.
- Antes de recopilar datos personales, incluye la información sobre responsable, finalidad y conservación conforme a las instrucciones de tu administración.
