/**
*	Seminario GPC #2. Grafo de Escena
*	El robete majete
*
*/

// Variables imprescindibles
var renderer, scene, camera;

// Variables globales
var r = t = 4;
var l = b = -r;
var cameraController;

// Acciones
init();
loadScene();
render();

/*
* Construimos la cámara
*/
function setCameras(ar)
{
    var origen = new THREE.Vector3(0,0,0);

    // Perspectiva
    camera = new THREE.PerspectiveCamera( 50, ar, 0.1, 100 );
	camera.position.set(0.5,3,9);
    camera.lookAt(new THREE.Vector3(0,0,0));

    scene.add(camera);
}

/*
* Crear el motor, la escena y la camara
*/
function init() {
	// Motor de render
	renderer = new THREE.WebGLRenderer();
	renderer.setSize(window.innerWidth,window.innerHeight);
    renderer.setClearColor( new THREE.Color(0x0000AA) );
    // Esta opción requiere "Cleans" naturales
    renderer.autoClear = false;
	document.getElementById('container').appendChild(renderer.domElement);

	// Escena
	scene = new THREE.Scene();

	// Camara
	var ar = window.innerWidth / window.innerHeight;
 
    setCameras(ar);

    // Controlador de camara
    cameraController = new THREE.OrbitControls( camera, renderer.domElement );
    cameraController.target.set(0,0,0);
    cameraController.enableKeys = false;
    
    // Eventos
    window.addEventListener('resize',updateAspectRatio);
    //renderer.domElement.addEventListener('dblclick',rotate);
}

/*
* Cargar la escena con objetos
*/
function loadScene() {
	// Materiales
	var material = new THREE.MeshBasicMaterial({color:'yellow',wireframe:true});


}

function updateAspectRatio() {
    renderer.setSize(window.innerWidth,window.innerHeight);
    var ar = window.innerWidth/window.innerHeight;
    camera.aspect = ar;
    // Se ha variado el volumen de la vista
    camera.updateProjectionMatrix();
}

function update() {
	// Cambios entre frames


}

function render() {
	// Dibujar cada frame 
	requestAnimationFrame(render);

    update();
    
    renderer.clear();

    renderer.render( scene, camera );
    
}