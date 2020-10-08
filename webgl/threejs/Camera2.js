/**
*	Seminario GPC #3. Camara
*	Manejo de camaras, marcos y seleccion (picking)
*
*/

// Variables imprescindibles
var renderer, scene, camera;

// Variables globales
var esferacubo, cubo, angulo = 0;
var r = t = 4;
var l = b = -r;
var cameraController;
var alzado, planta, perfil;

// Acciones
init();
loadScene();
render();

function setCameras(ar){
    // Construir las cuatro camaras

    var origen = new THREE.Vector3(0,0,0);

    // Ortograficas
    var camOrtografica;
    if(ar>1){
        camOrtografica = new THREE.OrthographicCamera( l*ar, r*ar, t, b, -20, 20 );
    }
    else{
        camOrtografica = new THREE.OrthographicCamera( l, r, t/ar, b/ar, -20, 20 );       
    }

    alzado = camOrtografica.clone();
    alzado.position.set(0,0,4);
    alzado.lookAt(origen);
    perfil = camOrtografica.clone();
    perfil.position.set(4,0,0);
    perfil.lookAt(origen);
    planta = camOrtografica.clone();
    planta.position.set(0,4,0);
    planta.lookAt(origen);
    planta.up = new THREE.Vector3(0,0,-1);

    // Perspectiva
    camera = new THREE.PerspectiveCamera( 50, ar, 0.1, 100 );
	camera.position.set(0.5,3,9);
    camera.lookAt(new THREE.Vector3(0,0,0));

    scene.add(alzado);
    scene.add(perfil);
    scene.add(planta);
    scene.add(camera);
}

function init() {
	// Crear el motor, la escena y la camara

	// Motor de render
	renderer = new THREE.WebGLRenderer();
	renderer.setSize(window.innerWidth,window.innerHeight);
    renderer.setClearColor( new THREE.Color(0x0000AA) );
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
    cameraController.noKeys = true;
    
    // Eventos
    window.addEventListener('resize',updateAspectRatio);
    renderer.domElement.addEventListener('dblclick',rotate);
}

function loadScene() {
	// Cargar la escena con objetos

	// Materiales
	var material = new THREE.MeshBasicMaterial({color:'yellow',wireframe:true});

	// Geometrias
	var geocubo = new THREE.BoxGeometry(2,2,2);
	var geoesfera = new THREE.SphereGeometry(1, 30, 30);

	// Objetos
	cubo = new THREE.Mesh( geocubo, material );
	cubo.position.x = -1;

	var esfera = new THREE.Mesh( geoesfera, material );
	esfera.position.x = 1;

	esferacubo = new THREE.Object3D();
	esferacubo.position.y = 1;

	// Modelo importado
	var loader = new THREE.ObjectLoader();
	loader.load( 'models/soldado/soldado.json' , 
		         function(obj){
		         	obj.position.y = 1;
		         	cubo.add(obj);
		         });

	// Construir la escena
	esferacubo.add(cubo);
	esferacubo.add(esfera);
	scene.add(esferacubo);
	cubo.add(new THREE.AxisHelper(1));
	scene.add( new THREE.AxisHelper(3) );

}

function rotate(event){
    // Localiza el objeto seleccionado y lo gira 45 grados

    var x = event.clientX;
    var y = event.clientY;

    var derecha = abajo = false;
    var cam = null;

    // Conocer el cuadrante de la seleccion
    if(x>window.innerWidth/2){
        x -= window.innerWidth/2;
        derecha = true;
    };
    if(y>window.innerHeight/2){
        y -= window.innerHeight/2;
        abajo = true;
    };

    if(derecha)
        if(abajo) cam = camera;
        else cam = perfil;
    else
        if(abajo) cam = planta;
        else cam = alzado;


    // Convertir al cuadrado canonico (2x2)
    x = ( 2*x/window.innerWidth ) * 2 - 1;
    y = -( 2*y/window.innerHeight ) * 2 + 1;

    // Construccion del rayo e interseccion con a escena
    var rayo = new THREE.Raycaster();
    rayo.setFromCamera( new THREE.Vector2(x,y), cam );

    var interseccion = rayo.intersectObjects( scene.children, true );

    if(interseccion.length>0)
        interseccion[0].object.rotation.y += Math.PI / 4;
} 

function updateAspectRatio() {
    // Indicarle al motor las nuevas dimensiones del canvas
    renderer.setSize(window.innerWidth,window.innerHeight);

    var ar = window.innerWidth/window.innerHeight;

    if(ar>1){
        alzado.left = perfil.left = planta.left = l * ar;
        alzado.right = perfil.right = planta.right = r * ar;
        alzado.top = perfil.top = planta.top = t;
        alzado.bottom = perfil.bottom = planta.bottom = b;
     }
    else{
        alzado.left = perfil.left = planta.left = l;
        alzado.right = perfil.right = planta.right = r;
        alzado.top = perfil.top = planta.top = t/ar;
        alzado.bottom = perfil.bottom = planta.bottom = b/ar;    
    }

    camera.aspect = ar;

    // Se ha variado el volumen de la vista
    
    camera.updateProjectionMatrix();
    alzado.updateProjectionMatrix();
    planta.updateProjectionMatrix();
    perfil.updateProjectionMatrix();
}

function update() {
	// Cambios entre frames


}

function render() {
	// Dibujar cada frame 
	requestAnimationFrame(render);

    update();
    
    renderer.clear();

    renderer.setViewport(0,window.innerHeight/2, 
                         window.innerWidth/2,window.innerHeight/2);
    renderer.render( scene, planta );

    renderer.setViewport(window.innerWidth/2,0, 
        window.innerWidth/2,window.innerHeight/2);   
    renderer.render( scene, perfil );

    renderer.setViewport(0,0, 
        window.innerWidth/2,window.innerHeight/2); 
    renderer.render( scene, alzado );

    renderer.setViewport(window.innerWidth/2,window.innerHeight/2, 
        window.innerWidth/2,window.innerHeight/2); 
    renderer.render( scene, camera );
    
}