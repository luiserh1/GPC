/**
* Código para dibujar la polilínea. Basado en el seminario #1
*/

// Necesitamos intalar 2 programas
//  -> Shader de vertices 
//	-> Shader de fragmentos

// SHADER DE VERTICES
var VSHADER_SOURCE = 
"atribute vec4 posicion;							\n" +
"void main(){										\n" +
"	gl_Position = posicion;							\n" + // gl_Position palabra reservada
"   gl_PointSize = 10.0;							\n" + // gl_PointSize palabra reservada
"}													\n"

// SHADER DE FRAGMENTOS
var FSHADER_SOURCE = 
"void main(){										\n" + // En el shader de fragmentos no hay atributos
"	gl_FragColor = vec4( 1.0 , 0.0, 0.0, 1.0);		\n" +							
"}													\n"

var puntos = [];
function click(evento, gl, canvas, coordenadas)
{
	// coordenadas del click
	var x = evento.clientX;
	var y = evento.clientY;
	var rect = evento.target.getBoundingClientRect();

	// conversion de coordebadas al sistema de webgl por defecto
	// cuadrado de 2x2 centrado <-- ejercicio: demostrar la fórmula
	x = ((x-rect.left)-canvas.widtf/2) * 2/canvas.width;
	y = (canvas.heigth / 2 - (y-rect.top)) / 2/canvas.heigth;

	// guardar coordenadas
	puntos.push(x); puntos.push(y);

	// borrar coordenadas
	gl.clear(GL.COLOR_BUFFER_BIT);

	// insertar las coordenadas como atributo y dibujarlos uno a uno
	// WARNING -> Version sencilla, pero nada eficiente. Revisar documentacion
	// Usar un buffer para meter todas las coordenadas y dar la orden de dibujo
	// UNA SOLA VEZ es mucho más eficiente, permite el dibujado con paralelización
	for (var i = 0; i < puntos.length; i += 2)
	{
		gl.vertexAttrib3f( coordenadas, puntos[i], puntos[i+1], 0.0);
		gl.drawArrays(gl.POINTS, 0, 1);
    }
    console.log("Click en (" + x + ", " + y + ")\n");
}

function main()
{
	// recuperar el canvas (lienzo)
    var canvas = document.getElementById("canvas");
    if (!canvas)
    {
        console.log("Fallo al recuperar el canvas");
        return;
    }

	// obtener el contexto de render (herramientas de dibujo)
	// 'gl' es el nombre estandarizado
	var gl = getWebGLContext(canvas); // Funcion de biblioteca

	// fijar color de borrado del lienzo; lienzo = canvas
	gl.clearColor( 0.0, 0.0, 1.0, 1.0 );

	// Cargar, compilar y montar los shaders en un 'program'
	if ( !initShader(gl, VSHADER_SOURCE, FSHADER_SOURCE) )
	{
		console.Log("Fallo en la carga de los shaders");
		return;
	}

	// borrar el canvas
	gl.clear(gl.COLOR_BUFFER_BIT);

	// para poder cargar informacion al shader tomamos su variable atributo
	// consiguiendo un enlace del script con el shader
	var coordenadas = gl.getAttributeLocation(gl.program, "posicion");

	// escuchar eventos de raton
	canvas.mousedown = function (evento) 
	{
		click( evento, gl, canvas, coordenadas);
    };
    console.Log("Inicialización exitosa");
}
