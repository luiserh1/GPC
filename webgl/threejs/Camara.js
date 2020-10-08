/**
* Seminario GPC #2. FormaBasica
* Dibujar formas básicas con animación
*/

// Variables imprescindibles (nomenclatura consensuada)
var renderer,	// Para dibujar
	scene,		// Estructura de datos que almacena lo que se va a dibujar
	camera;		// Objeto que marca desde donde se va a dibujar

// Vamos a usar tres cámaras más
var alzado, planta, perfil;

// Variables globales
var esferaCubo, cubo, angulo = 0;

var r = t = 4;			// Def. de right y top
var l = b = -r;	// Def. de left y bottom

// Necesitaremos un controlador de cámara para poder moverla, orbitarla etc.
var cameraController;

// Acciones
init();
loadScene();
render();

/*
* Construye las 4 cámaras partiendo del ratio de aspecto
*/
function setCameras(ar)
{
	var origen = new THREE.Vector3(0, 0, 0)
	var camOrtografica;
	// Ortográficas -> Parámetros: izq., der., arriba, abajo, cerca, lejos
	// Para evitar deformaciones...
	if (ar>1)
	{
		// Mantenemos bottom y top para que encajen con el marco, estiramos left y right
		camOrtografica = new THREE.OrthographicCamera(l*ar, r*ar, t, b, -20, 20);
	}
	else
	{
		// En este caso hacemos todo lo contrario
		camOrtografica = new THREE.OrthographicCamera(l, r, t/ar, b/ar, -20, 20);
	}

	alzado = camOrtografica.clone();
	alzado.position.set(0, 0, 4);
	alzado.lookAt(origen);

	perfil = camOrtografica.clone();
	perfil.position.set(4, 0, 0);
	perfil.lookAt(origen);

	planta = camOrtografica.clone();
	planta.position.set(0, 4, 0);
	planta.lookAt(origen);
	// En el caso de la planta el vector up no puede ser el vector y
	// No podemos escoger el por defecto entonces, le indicamos otro
	planta.up = new THREE.Vector3(0, 0, -1);

	// Perspectiva -> Parámetros: Ángulo de la lente, relación de aspecto, cerca y lejos
	camera = new THREE.PerspectiveCamera(50, ar, 0.1, 100);
	camera.position.set(0.5, 3, 9); // Modificamos la posición de la cámara
	camera.lookAt(new THREE.Vector3(0,0,0)); // Y le pasamos el pinto al que mirar
	
	scene.add(alzado);
	scene.add(planta);
	scene.add(camera);
	scene.add(perfil);
}

/*
* Crear el motor, la escena, la cámara...
*/
function init()
{
	// Motor de render
	renderer = new THREE.WebGLRenderer();
	renderer.setSize(window.innerWidth, window.innerHeigth);
	renderer.setClearColor(new THREE.Color(0x0000AA)); // R (0) G (0) B (AA)
	// Esto evita que un render pise a otro, pero obliga a limpiar manualmente
	render.autoClear = false; 
	// domElement es el canvas (lienzo)
	document.getElementById('container').appendChild(renderer.domElement);

	// Escena
	scene = new THREE.Scene();

	// Cámara
	// Si la relación de aspecto no se correspomde con la ventana del navegador
	// pueden producirse deformaciones no deseadas
	var ar = window.innerWidth / window.innerHeigth;
	setCameras(ar);
	
	// Controlador de cámara. Le indicamos ek punto de interés, es decir,
	// dónde tiene que mirar (sobre que orbitar)
	cameraController = new THREE.OrbitControls( camera, renderer.domElement );
	cameraController.target.set(0, 0, 0);
	cameraController.enableKeys = false;

	// Eventos
	// Capturamos el evento 'resize' para que cada vez que cambie el tamaño de
	// la ventana se llame a la función que hemos definido updateAspectRatio
	window.addEventListener('resize', updateAspectRatio);
	renderer.domElement.addEventListener("dblclick", rotate);

}

/*
*  Carga la escena con objetos
*/
function loadScene()
{
	// Materiales
	var material = new THREE.MeshBasicMaterial({color:'yellow', wireframe:true});

	// Geometrías
	var geocubo = new THREE.BoxGeometry(2, 2, 2);
	var geoesfera = new THREE.SphereGeometry(1, 30, 30);

	// Objetos
	cubo = new THREE.Mesh(geocubo, material);
	cubo.position.x = -1; // Cambiamos la posición del cubo con respecto al origen

	var esfera = new THREE.Mesh(geoesfera, material);
	esfera.position.x = 1;

	esferaCubo = new THREE.Object3D(); // Ahora es transformable, pero no dibujable
	esferaCubo.position.y = 1;
	// esferaCubo.rotation.y = Math.PI / 4; // Radianes para la rotación

	// Modelo importado
	var loader = new THREE.ObjectLoader();
	loader.load('models/soldado/soldado.json', function(obj) {
		obj.position.y = 1;
		cubo.add(obj);
	});

	// Construir la escena
	esferaCubo.add(cubo);
	esferaCubo.add(esfera);
	scene.add(esferaCubo);

	// Dibujamos los ejes para ayudar a depurar
	cubo.add(new THREE.AxesHelper(1));
	scene.add(new THREE.AxesHelper(3));
}

/*
* Recibe el evento de clickado, encuentra el elemento seleccionado y lo rota 45º
*/
function rotate(event)
{
	var x = event.clientX;
	var y = event.clientY;

	// Hay que averiguar el cuadrante donde se  produce el click
	var derecha = abajo = false;
	var cam = null;

	// ¿Estoy a la derecha?
	if (x > window.innerWidth/2)
	{
		x -= window.innerWidth/2;
		derecha = true;
	}
	// ¿Estoy abajo?
	if (y > window.innerHeight/2)
	{
		y-= window.innerHeight/2;
		abajo = true;
	}
	if (derecha)
		if (abajo) cam = camera; // Abajo y a la derecha -> La perspectiva
		else cam = perfil; // Arriba y a la derecha -> Perfil
	else
		if (abajo) cam = camera; // Abajo y a la izquierda -> Planta
		else cam = alzado; // Arriba y a la izquierda -> Alzado

	// El sistema de referencia comienza en el píxel superior izquierdo
	// 		-> EJE_Y de arriba a abajo
	// Lo tenemos que convertir al cuadrado canónico (2x2: de -1 a 1 en cada dimensión)
	// Código para una cámara que ocupa todo el lienzo
	//x = ( x / window.innerWidth ) * 2 - 1;
	//y = -( y / window.innerHeigth ) * 2 + 1;
	// Código para las 4 cámaras
	x = x / window.innerWidth - 1;
	y = -( y / window.innerHeigth ) + 1;

	// Construcción del rayo e interacción con la escena
	var rayo = new THREE.Raycaster();
	// El rayo pasa por el punto clickado y parte de la cámara
	rayo.setFromCamera(new THREE.Vector2(x,y), cam);
	// Los parámetros son los hijos de la escena, que son los que van a comprobar y
	// el true con el que indicamos que la búsqueda es recursiva, evitando que no
	// visite a los "nietos" de la escena
	var interseccion = rayo.intersectObjects(scene.children, true);
	// Deviuelve los objetos ordenados por distancia
	if (interseccion.length>0)
		interseccion[0].object.rotation.y += Math.PI / 4
}

/*
* Indica al motor las nuevas dimensiones del lienzo (canvas)
*/
function updateAspectRatio()
{
	renderer.setSize(window.innerWidth, window.innerWidth);
	var ar = window.innerWidth / window.innerHeigth;
	if (ar>1)
	{
		alzado.left = perfil.left = planta.left = l*ar;
		alzado.right = perfil.right = planta.right = r*ar;
		alzado.top = perfil.top = planta.top = t;
		alzado.bottom = perfil.bottom = planta.bottom = b;
	}
	else
	{
		alzado.left = perfil.left = planta.left = l;
		alzado.right = perfil.right = planta.right = r;
		alzado.top = perfil.top = planta.top = t/ar;
		alzado.bottom = perfil.bottom = planta.bottom = b/ar;
	}
	camera.aspect = ar;
	// Se ha variado el volumen de la vista
	// PREGUNTA TEST -> Ha variado la matriz de proyección. Toca recalcular
	camera.updateProjectionMatrix();
	planta.updateProjectionMatrix();
	perfil.updateProjectionMatrix();
	alzado.updateProjectionMatrix();   
}


/*
*  Función llamada desde reder (se ejecuta cada frame previo su dibujado)
*/
function update()
{
	/*angulo += Math.PI / 100;
	esferaCubo.rotation.y = angulo;
 	// El cubo gira sobre su punto de referencia, en este caso,
 	// el origen de esferaCubo
	cubo.rotation.x = angulo / 2;
	*/
}

/*
*	Dibuja un frame (callback de dibujado)
*/
function render()
{
	requestAnimationFrame(render);

	update();

	renderer.clear();

	renderer.setViewport(0, window.innerHeight/2,
		window.innerWidth / 2, window.innerHeigth / 2);
	renderer.render(scene, planta);

	renderer.setViewport(window.innerWidth / 2, 0,
		window.innerWidth / 2, window.innerHeigth / 2);
	renderer.render(scene, perfil);

	renderer.setViewport(0, 0,
		window.innerWidth / 2, window.innerHeigth / 2);
	renderer.render(scene, alzado);

	renderer.setViewport(window.innerWidth, window.innerHeight/2,
		window.innerWidth / 2, window.innerHeigth / 2);
	renderer.render(scene, camera);
}
