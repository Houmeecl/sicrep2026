/**
 * Los valores de prueba (secretos por defecto, correos impresos en consola) solo se aceptan si el
 * proceso se declaró explícitamente en desarrollo o pruebas. Sin NODE_ENV, o con cualquier otro
 * valor, el sistema falla cerrado: un despliegue que olvida NODE_ENV nunca firma con un secreto público.
 *
 * Se toma el valor al ARRANCAR: el servidor de desarrollo de Vite escribe NODE_ENV=development en
 * process.env cuando no está definido, y eso no debe abrir los valores de prueba en producción.
 */
const NODE_ENV_AL_INICIO = process.env.NODE_ENV;

export function isDevMode(): boolean {
  return NODE_ENV_AL_INICIO === "development" || NODE_ENV_AL_INICIO === "test";
}
