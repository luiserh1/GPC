/**
* Código para dibujar la polilínea. Basado en el seminario #1
* @requires three.min_r96.js
* @author Luis Serrano Hernández / luiserh1@inf.upv.es
*/

// Necesitamos intalar 2 programas
//  -> Shader de vertices 
//	-> Shader de fragmentos

// SHADER DE VERTICES
var VSHADER_SOURCE = 
	"attribute vec4 posicion;							\n" + // Los atributos se pueden imponer desde el código fuente de la aplicación
	" 													\n" +
	"varying lowp vec4 vPos;							\n" + //"varying" es la forma de comunicar el shader de vértices con el de fragmentos
	"void main() {										\n" +
	"	gl_Position = posicion;							\n" + // gl_Position palabra reservada
	"   gl_PointSize = 10.0;							\n" + // gl_PointSize palabra reservada
	"   vPos = posicion;								\n" + // gl_PointSize palabra reservada
	"}													\n";

// SHADER DE FRAGMENTOS
var FSHADER_SOURCE = 
	"precision mediump float;								\n" + // Hace falta indicar la precisión de los floats para que funcione
	"varying lowp vec4 vPos;								\n" + // Misma declaración para hacer efectiva la comunicación
	"void main() {											\n" + // En el shader de fragmentos no hay atributos
	"	vec4 absvPos = abs(vPos);							\n" + // Las posiciones pueden ser negativas, loconvertimos a valor absoluto. Ahora van de 0 a 1									
	"	float tone = 1.0 - (absvPos[0] + absvPos[1]) / 2.0;	\n" + // Sumamos la 'x' y la 'y` y normalizamos						
	"	gl_FragColor = vec4( tone , tone, tone, 1.0);		\n" + // Los grises se logran poniendo los mismos valores para rojo, verde y azul							
	"}														\n";

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
	if (!gl)
    {
        console.log("Fallo al recuperar el contexto WebGL");
        return;
	}

	// Cargar, compilar y montar los shaders en un 'program'
	if ( !initShaders(gl, VSHADER_SOURCE, FSHADER_SOURCE) )
	{
		console.log("Fallo en la carga de los shaders");
		return;
	}

	// fijar color de borrado del lienzo; lienzo = canvas
	gl.clearColor( 0.0, 0.0, 0.3, 1.0 );

	// borrar el canvas
	gl.clear(gl.COLOR_BUFFER_BIT);

	// para poder cargar informacion al shader tomamos su variable atributo
	// consiguiendo un enlace del script con el shader
	var coordenadas = gl.getAttribLocation(gl.program, "posicion");

	// Creación del buffer de vertices
	var bufferVertices = gl.createBuffer();
	// Activación del buffer
	gl.bindBuffer(gl.ARRAY_BUFFER, bufferVertices);
	// Enlazado del buffer
	// Posicion
	gl.vertexAttribPointer(coordenadas, 3, gl.FLOAT, false, 0, 0);
	gl.enableVertexAttribArray(coordenadas);
	// Color

	// escuchar eventos de raton
	canvas.onmousedown = function (evento) 
	{
		click( evento, gl, canvas, coordenadas);
    };
    console.log("Inicialización exitosa");
}

var clicks = [];
function click(evento, gl, canvas, coordenadas)
{
	// coordenadas del click
	var x = evento.clientX;
	var y = evento.clientY;
	var rect = evento.target.getBoundingClientRect();
	console.log("Click en (" + x + ", " + y + ")\n");

	// conversion de coordebadas al sistema de webgl por defecto
	// cuadrado de 2x2 centrado <-- ejercicio: demostrar la fórmula
	x = ((x - rect.left) - canvas.width/2) * 2 / canvas.width;
	y = (canvas.height / 2 - (y - rect.top)) * 2 / canvas.height;

	// guardar coordenadas
	clicks.push(x); clicks.push(y); clicks.push(0.0);
	// Los buffers data requieren trabajar con arrays tipados, no vale con el por defecto de JS
	var puntos = new Float32Array(clicks);

	// borrar coordenadas
	gl.clear(gl.COLOR_BUFFER_BIT);

	// Rellena el BO con las coordenadas y lo manda a proceso
	gl.bufferData(gl.ARRAY_BUFFER, puntos, gl.STATIC_DRAW);
	gl.drawArrays(gl.LINE_STRIP, 0, puntos.length/3);
	gl.drawArrays(gl.POINTS, 0, puntos.length/3);
    console.log("Click en (" + x + ", " + y + ") según el cubo canónico\n");
}
