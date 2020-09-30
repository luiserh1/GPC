/**
* Seminario GPC #1. Pintar un rectángulo azul
*/

function main()
{
	// recuperar el canvas (lienzo)
	var canvas = document.getElementById("canvas");

	// obtener el contexto de render (herramientas de dibujo)
	// 'gl' es el nombre estandarizado
	var gl = getWebGLContext(canvas); // Funcion de biblioteca

	// fijar color de borrado del lienzo; lienzo = canvas
	gl.clearColor( 0.0, 0.0, 0.0, 1.0 );

	// borrar el canvas
	gl.clear(gl.COLOR_BUFFER_BIT);

}