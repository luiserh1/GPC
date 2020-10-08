/**
* Seminario GPC #2. FormaBasica
* Dibujar formas básicas con animación
*/

// Variables imprescindibles (nomenclatura consensuada)
var renderer,	// Para dibujar
	scene,		// Estructura de datos que almacena lo que se va a dibujar
	camera;		// Objeto que marca desde donde se va a dibujar

// Variables globales
var esferaCubo, angulo = 0;

// Acciones
init();
loadScene();
render();

/*
* Crear el motor, la escena, la cámara...
*/
function init()
{
	// Motor de render
	renderer = new THREE.WebGLRenderer();
	renderer.setSize(window.innerWidth, window.innerHeigth);
	renderer.setClearColor(new THREE.Color(0x0000AA)); // R (0) G (0) B (AA)
	// domElement es el canvas (lienzo)
	document.getElementById("container").appendChild(rederer.domElement);

	// Escena
	scene = new THREE.scene();

	// Cámara
	// Si la relación de aspecto no se correspomde con la ventana del navegador
	// pueden producirse deformaciones no deseadas
	var ar = window.innerWidth / window.innerHeigth;
	// Parámetros: Ángulo de la lente, relación de aspecto, cerca y lejos
	camera = new THREE.PerspectiveCamera(50, ar, 0.1, 100);
	// La cámara es un objeto más, y como tal se puede añadir a la escena
	// Por defecto se instancia en el origen y mirando a -z
	scene.add(camera);
	camera.position.set(0.5, 3, 9); // Modificamos la posición de la cámara
	camera.lookAt(new THREE.Vector3(0,0,0)); // Y le pasamos el pinto al que mirar
}

/*
*  Carga la escena con objetos
*/
function loadScene()
{
	// Materiales
	var material = new THREE.MeshBasicMaterial(color:'yellow', wireframe:true);

	// Geometrías
	var geocubo = new THREE.BoxGeometry(2, 2, 2);
	var geoesfera = new THREE.SphereGeometry(1, 30, 30);

	// Objetos
	var cubo = new THREE.Mesh(geocubo, material);
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
	cubo.add(new THREE.AxisHelper(1));
	scene.add(new THREE.AxisHelper(3));
}

/*
*  Función llamada desde reder (se ejecuta cada frame previo su dibujado)
*/
function update()
{
	angulo += Maht.PI / 100;
	esferaCubo.rotation.y = angulo;
 	// El cubo gira sobre su punto de referencia, en este caso,
 	// el origen de esferaCubo
	cubo.rotation.x = angulo / 2;
}

/*
*	Dibuja un frame (callback de dibujado)
*/
function render()
{
	requestAnimationFrame();

	update();

	renderer.render(scene, camera);
}