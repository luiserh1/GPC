/**
*	Práctica GPC #4. Interacción
*	La articulación, ¡que emoción!
*/
"use strict"; // Ayuda a hacer un poco más estricto el tipado de las variables

const pi = 3.1415926535;
var materialDebug = new THREE.MeshBasicMaterial({color:'white', wireframe:true}); 

////////////////////////
// VARIABLES GLOBALES //
////////////////////////
// Imprescindibles
var renderer, scene, camera;
// Controladores de
// la cámara
var cameraController;
// los efectos
var effectController;
// los controles
var domEvents, keyboard;

// Giros Flags
var giroBaseFlag, giroBrazoFlag, giroAntebrazoYFlag, giroAntebrazoZFlag, giroPinzaFlag, aperturaPinzaFlag;

// Minicámara y sus atributos
var miniCam;
var r = 200; // ODIO JS. TOP YA ES ALGO Y NO AVISA DE NINGUNA FORMA. AHORA HE RENOMBRADO TODO
var t = 200;
var l = -r;
var b = -t;
var n = -200, f = 800;
// El robot a manejar
var robot;

function degreesToRadians(degrees) { return degrees * (pi/180); }

/*
* Forma manual de crear y devolver la geometría de un plano. Existe ya la opción de generar geometrías de planos
* en la biblioteca, pero es una buena forma de romper mano
*/
function planeMesh(lado, material)
{
    // Geometría vaciía
    var geo = new THREE.Geometry();
    var semilado = lado / 2;
    // Distribuyendo las coordenadas de esta forma el pivote quedará en el centro
    var coordenadas =
        [semilado, 0, semilado,
        -semilado, 0, semilado,
        -semilado, 0, -semilado,
        semilado, 0, -semilado];
    // Vértices que conformarán los triángulos de las caras de la geometría, expresados en tripletas de coordenadas
    var indices =
    [
        3,2,1, 3,0,1
    ];

    // Registramos los vértices
    for (var i = 0; i < coordenadas.length; i += 3)
    {
        var ver = new THREE.Vector3(coordenadas[i], coordenadas[i+1], coordenadas[i+2]);
        geo.vertices.push(ver);
    }

    // Registramos las caras
    for (var i = 0; i < indices.length; i += 3)
    {
        var triangulo = new THREE.Face3(indices[i], indices[i+1], indices[i+2]);
        // for (var j = 0; j < 3; j++) { }
        geo.faces.push(triangulo);
    }

    // Creamos la malla del objeto
    var plano = new THREE.Mesh(geo, material);
    return plano;
}

/*
* Devuelve la geometría de una pinza. Solo requiere el largo, pues el resto de medidas son proporcionales a esta.
*/
function pinzaGeometry(length)
{
    var seg = length / 38;
    var geo = new THREE.Geometry();
    var coordenadas =
    [
        0*seg,0*seg,0*seg,      0*seg,4*seg,0*seg,          0*seg,4*seg,19*seg,
        0*seg,0*seg,19*seg,     0*seg,1*seg,38*seg,         0*seg,3*seg,38*seg,
        15*seg,3*seg,38*seg,    15*seg,1*seg,38*seg,        20*seg,4*seg,19*seg,
        20*seg,0*seg,19*seg,    20*seg,4*seg,0*seg,         20*seg,0*seg,0*seg
    ];
    // Los triángulos se forman con vértices en sentido horario
    var indices =
    [
        0,1,3,   3,1,2,  3,2,4,  4,2,5,
        2,1,10,  2,10,8, 5,2,8,  5,8,6,
        9,7,6,   9,6,8,  11,9,8, 11,8,10,
        9,7,4,   9,4,3,  11,9,3, 11,3,0,
        7,4,5,   7,5,6,
        0,11,10, 0,10,1
    ];

    // Guardando la suma acumulada por cada coordenada se puede obtener un pivote centrado en la geometría sacando la media
    // Se obtiene la suma a la vez que se registran los vértices
    var vertexSum = [0, 0, 0];
    for (var i = 0; i < coordenadas.length; i += 3)
    {
        var ver = new THREE.Vector3(coordenadas[i], coordenadas[i+1], coordenadas[i+2]);
        geo.vertices.push(ver);
        vertexSum[0] += coordenadas[i];
        vertexSum[1] += coordenadas[i+1];
        vertexSum[2] += coordenadas[i+2];
    }
    // Se registran las caras. Leyendo de atrás hacia delante se generan los triángulos con los vértices en sentido antihorario
    for (var i = indices.length-1; i > 0; i -= 3)
    {
        var triangulo = new THREE.Face3(indices[i], indices[i-1], indices[i-2]);
        // for (var j = 0; j < 3; j++) { }
        geo.faces.push(triangulo);
    }
    // Cálculo del pivote
    var numVertex = coordenadas.length / 3;
    var pivotX, pivotY, pivotZ;
    pivotX = vertexSum[0] / numVertex;
    pivotY = vertexSum[1] / numVertex;
    pivotZ = vertexSum[2] / numVertex;
    // Finalmente, se centra el pivote moviendo la geometría de forma que este quede en (0,0,0)
    geo.applyMatrix( new THREE.Matrix4().makeTranslation( -pivotX, -pivotY, -pivotZ ) );
    //console.log("Pivote de pinza: (" + pivotX + ", " + pivotY + ", "+ pivotZ + ")");

    return geo;
}

/*
* Devuelve una malla de robot de tamaño estándar con el material proporcionado.
*/
function robotMesh(material)
{   
    // Objeto raíz del que colgaran los componentes
    var robot = new THREE.Object3D();

    // Se definen geometrías bases que son clonadas para cada pieza que las necesite. Si no fuesen clonadas la
    // modificación de una de ellas afectaría al resto
    var geoCilindro = new THREE.CylinderGeometry(1, 1, 1, 32);
    var geoCubo = new THREE.BoxGeometry(1, 1, 1);
    var geoesfera = new THREE.SphereGeometry(1, 32, 32);
    var geoPinza = pinzaGeometry(38);

    // El elemento más sencillo que cuelga del robot es la base
    var base = new THREE.Mesh(geoCilindro.clone(), material);
    base.geometry.scale(50, 15, 50);

    // Las partes de súperpiezas como el brazo, antebrazo, mano etc. se definen con origen en (0,0,0) y después
    // son las súperpiezas en conjunto las que son transladas a sus respectivas posiciones en el robot
    // BRAZO
    var brazo = new THREE.Object3D();
    var eje, esparrago, rotula;
    eje = new THREE.Mesh(geoCilindro.clone(), material);
    eje.geometry.scale(20, 18, 20);
    eje.geometry.rotateX(pi/2);
    esparrago = new THREE.Mesh(geoCubo.clone(), material);
    esparrago.geometry.scale(18, 120, 12);
    esparrago.geometry.translate(0, 60, 0);
    rotula = new THREE.Mesh(geoesfera, material);
    rotula.geometry.scale(20, 20, 20);
    rotula.geometry.translate(0, 120, 0);

    // ANTEBRAZO
    var antebrazo = new THREE.Object3D();
    var disco, nervios;
    disco = new THREE.Mesh(geoCilindro.clone(), material);
    disco.geometry.scale(22, 6, 22);
    nervios = [];
    for (var i = 0; i < 4; i++)
    {
        nervios.push(new THREE.Mesh(geoCubo.clone(), material));
        nervios[i].geometry.scale(4, 80, 4);
        var despX = 10 * (i < 2 ? 1 : -1);
        var despY = 46;
        var despZ = 10 * ((i % 3) != 0 ? 1 : -1);
        //console.log("i: " + i + " -> despX=" + despX + ", despY=" + despY + ", despZ=" + despZ);
        nervios[i].geometry.translate(despX, despY, despZ);
    }

    // MANO 
    var mano = new THREE.Object3D();
    var palma, pinzaIz, pinzaDer;
    palma = new THREE.Mesh(geoCilindro.clone(), material);
    palma.geometry.scale(15, 40, 15);
    palma.geometry.rotateX(pi/2);
    pinzaIz = new THREE.Mesh(geoPinza.clone(), material);
    pinzaIz.geometry.rotateZ(pi/2);
    pinzaIz.geometry.rotateY(pi/2);
    pinzaIz.geometry.translate(15, 1.5, 15);
    pinzaDer = new THREE.Mesh(geoPinza.clone(), material);
    pinzaDer.geometry.rotateZ(pi/2);
    pinzaDer.geometry.rotateY(pi/2);
    pinzaDer.geometry.translate(15, 1.5, -15);

    robot.add(base);                        //console.log(base.id);
    base.add(brazo);                        //console.log(brazo.id);
    brazo.add(eje);                         //console.log(eje.id);
    brazo.add(esparrago);                   //console.log(esparrago.id);
    brazo.add(rotula);                      //console.log(rotula.id);
    brazo.translateY(20);
    brazo.add(antebrazo);                   //console.log(antebrazo.id);
    antebrazo.add(disco);                   //console.log(disco.id);
    for (var i = 0; i < 4; i++ )
    {
        antebrazo.add(nervios[i]);          //console.log(nervios[i].id);
    }
    antebrazo.translateY(120);
    antebrazo.add(mano);                    //console.log("->"+mano.id);
    mano.add(palma);                        //console.log(palma.id);
    mano.add(pinzaIz);                      //console.log(pinzaIz.id);
    mano.add(pinzaDer);                     //console.log(pinzaDer.id);
    mano.translateY(86);

    return robot;
}

/*
" "Clase" Robot con los ángulos y valores de las distintas articulaciones
*/
class Robot
{
    constructor(material)
    {
        this.malla = robotMesh(material);
        this.baseID = this.malla.id + 1;
        this.desp = new THREE.Vector2(0, 0);
        this.giroBase = this.giroBrazo = this.giroAntebrazoY = this.giroAntebrazoZ = this.giroPinza = this.cierrePinzas = 0;

        this.despeLim = new THREE.Vector2(500, 500);
        this.giroBaseLim = new THREE.Vector2(-pi, pi);
        this.giroBrazoLim = new THREE.Vector2(-pi/4, pi/4);
        this.giroAntebrazoYLim = new THREE.Vector2(-pi, pi);
        this.giroAntebrazoZLim = new THREE.Vector2(-pi/2, pi/2);
        this.giroPinzaLim = new THREE.Vector2(-2*pi/9, 11*pi/9);
        this.cierrePinzasLim = new THREE.Vector2(0, pi/12);
    }

    translate(x, y, z)
    {
        this.malla.translateX(x);
        this.malla.translateY(y);
        this.malla.translateZ(z);
    }

    andar(desp)
    {
        this.malla.translateX(desp.x);
        this.malla.translateZ(desp.y);
        this.desp += desp;
    }

    rotarBase(angulo)
    {
        var base = this.malla.getObjectById(this.baseID); // La base es el primer y único hijo del robot
        var nuevoAngulo = angulo + this.giroBase;
        if (nuevoAngulo < this.giroBaseLim.x || nuevoAngulo > this.giroBaseLim.y) 
        {
            console.warn("La rotación no se ha efectuado porque sobrepasa límite de rotación de la base");
            return;
        }
        else
        {
            console.info("Base rotada " + angulo + " radianes. Nuevo ángulo: " + nuevoAngulo);
            this.giroBase = nuevoAngulo;
            base.rotateY(angulo);
        }
    }

    rotarBrazo(angulo)
    {
        var brazo = this.malla.getObjectById(this.baseID + 1); // El brazo es el primer y único hijo de la base
        var nuevoAngulo = angulo + this.giroBrazo;
        if (nuevoAngulo < this.giroBrazoLim.x || nuevoAngulo > this.giroBrazoLim.y) 
        {
            console.warn("La rotación no se ha efectuado porque sobrepasa límite de rotación del brazo");
            return;
        }
        else
        {
            console.info("Brazo rotado " + angulo + " radianes. Nuevo ángulo: " + nuevoAngulo);
            this.giroBrazo = nuevoAngulo;
            var eje = brazo.getObjectById(brazo.id + 1);
            var pivotAxes = new THREE.Vector3(0,0,0);
            eje.getWorldDirection(pivotAxes);
            brazo.rotateOnWorldAxis(pivotAxes, angulo);
        }
    }

    rotarAntebrzoY(angulo)
    {
        var brazo = this.malla.getObjectById(this.baseID + 1);
        var nuevoAngulo = angulo + this.giroAntebrazoY;
        if (nuevoAngulo < this.giroAntebrazoYLim.x || nuevoAngulo > this.giroAntebrazoYLim.y) 
        {
            console.warn("La rotación no se ha efectuado porque sobrepasa límite de rotación del antebrazoY");
            return;
        }
        else
        {
            console.info("AntebrazoY rotado " + angulo + " radianes. Nuevo ángulo: " + nuevoAngulo);
            this.giroAntebrazoY = nuevoAngulo;
            var rotula = brazo.getObjectById(brazo.id + 3);
            var antebrazo = brazo.getObjectById(brazo.id + 4);

            var rotZ = new THREE.Vector3(0,0,0);
            var rotY = new THREE.Vector3(0,0,0);
            var rotX = new THREE.Vector3(0,0,0);
            var rotMatrix = new THREE.Matrix4();
            rotMatrix.extractRotation( rotula.matrix );
            rotMatrix.extractBasis(rotX, rotY, rotZ);

            antebrazo.rotateOnWorldAxis(rotY, angulo);
        }
    }

    rotarAntebrzoZ(angulo)
    {
        var brazo = this.malla.getObjectById(this.baseID + 1);
        var nuevoAngulo = angulo + this.giroAntebrazoZ;
        if (nuevoAngulo < this.giroAntebrazoZLim.x || nuevoAngulo > this.giroAntebrazoZLim.y) 
        {
            console.warn("La rotación no se ha efectuado porque sobrepasa límite de rotación del antebrazoZ");
            return;
        }
        else
        {
            console.info("AntebrazoZ rotado " + angulo + " radianes. Nuevo ángulo: " + nuevoAngulo);
            this.giroAntebrazoZ = nuevoAngulo;
            var rotula = brazo.getObjectById(brazo.id + 3);
            var antebrazo = brazo.getObjectById(brazo.id + 4);
            var pivotAxes = new THREE.Vector3(0,0,0);
            // World direction nos devuelve el ejeZ
            rotula.getWorldDirection(pivotAxes);
            antebrazo.rotateOnWorldAxis(pivotAxes, angulo);
        }
    }

    rotarPinza(angulo)
    {
        var nuevoAngulo = angulo + this.giroPinza;
        if (nuevoAngulo < this.giroPinzaLim.x || nuevoAngulo > this.giroPinzaLim.y) 
        {
            console.warn("La rotación no se ha efectuado porque sobrepasa límite de rotación de la pinza");
            return;
        }
        else
        {
            var mano = this.malla.getObjectById(this.baseID + 11);
            console.info("Pinza rotada " + angulo + " radianes. Nuevo ángulo: " + nuevoAngulo);
            this.giroPinza = nuevoAngulo;
            var palma = mano.getObjectById(mano.id + 1);
            var pivotAxes = new THREE.Vector3(0,0,0);
            palma.getWorldDirection(pivotAxes);
            mano.rotateOnWorldAxis(pivotAxes, angulo);
        }
    }

    regularPinza(angulo)
    {
        var nuevoAngulo = angulo + this.cierrePinzas;
        if (nuevoAngulo < this.cierrePinzasLim.x || nuevoAngulo > this.cierrePinzasLim.y) 
        {
            console.warn("La rotación no se ha efectuado porque sobrepasa límite de rotación de la pinza");
            return;
        }
        else
        {
            var mano = this.malla.getObjectById(this.baseID + 11);
            console.info("Pinzas ajustadas en " + angulo + " radianes de apertura. Nuevo ángulo: " + nuevoAngulo);
            this.cierrePinzas = nuevoAngulo;
            var palma = mano.getObjectById(mano.id + 1);
            var pinzaIzq = mano.getObjectById(mano.id + 2);
            var pinzaDer = mano.getObjectById(mano.id + 3);

            var rotZ = new THREE.Vector3(0,0,0);
            var rotY = new THREE.Vector3(0,0,0);
            var rotX = new THREE.Vector3(0,0,0);
            var rotMatrix = new THREE.Matrix4();
            rotMatrix.extractRotation( palma.matrix );
            rotMatrix.extractBasis(rotX, rotY, rotZ);

            pinzaIzq.rotateOnWorldAxis(rotY, angulo);
            pinzaDer.rotateOnWorldAxis(rotY, -angulo);
        }
    }
}

// Acciones: Desde init se arranca todo
init();

/*
* Construimos la cámara
*/
function setCameras(ar)
{
    var puntoInteres = new THREE.Vector3(-50, 125, -50);

    // Perspectiva
    camera = new THREE.PerspectiveCamera( 50, ar, 0.1, 1500);
	camera.position.set(200, 250, 175);

    // El controlador de la cámara recibe como parámetros la propia cámara y el canvas
    cameraController = new THREE.OrbitControls(camera, render.domElement);
    camera.lookAt(puntoInteres); // Debe ir después de la inicialización de los controladores para evitar reseteos
    cameraController.target.set(puntoInteres.x, puntoInteres.y, puntoInteres.z);
    cameraController.enableKeys = false;

    // Ortográfica cenital (minicámara)
    miniCam = new THREE.OrthographicCamera(l, r, t, b, n, f);
    miniCam.position.set(-50, 300, -50);
    miniCam.lookAt(puntoInteres);
    miniCam.up = new THREE.Vector3(0, 0, -1);

    scene.add(camera);
    scene.add(miniCam);

    /*var helper = new THREE.CameraHelper( miniCam );
    scene.add( helper );*/
}

/*
* Inicialización de la interfaz
*/
function setUpGui()
{
    // Definicion de los controles
	effectController = {
		giroBase: 0, // Valores iniciales
		giroBrazo: 0,
		giroAntebrazoY: 0,
		giroAntebrazoZ: 0,
		giroPinza: 0,
		aperturaPinza: 0
	};

	// Creacion interfaz
	var gui = new dat.GUI();

	// Construccion del menu
    var h = gui.addFolder("Control Robot");
    //                      Nombre en el dict       Min     Max     Delta   Nombre Visible
    var giroBaseLS = h.add(effectController, "giroBase",             -180,   180,    1).name("Giro Base");
	var giroBrazoLS = h.add(effectController, "giroBrazo", -45, 45, 0.5).name("Giro Brazo");
	var giroAntebrazoYLS = h.add(effectController, "giroAntebrazoY", -180, 180, 1).name("Giro AntebrazoY");
	var giroAntebrazoZLS = h.add(effectController, "giroAntebrazoZ", -90, 90, 1).name("Giro AntebrazoZ");
	var giroPinzaLS = h.add(effectController, "giroPinza", -40, 220, 1).name("Giro Pinzas");
    var aperturaPinzaLS = h.add(effectController, "aperturaPinza", 0, 15, 0.1).name("Apertura Pinzas");
    
    giroBaseLS.onChange(function (angulo) { giroBaseFlag = degreesToRadians(angulo); });
    giroBrazoLS.onChange(function (angulo) { giroBrazoFlag = degreesToRadians(angulo); });
    giroAntebrazoYLS.onChange(function (angulo) { giroAntebrazoYFlag = degreesToRadians(angulo); });
    giroAntebrazoZLS.onChange(function (angulo) { giroAntebrazoZFlag = degreesToRadians(angulo); });
    giroPinzaLS.onChange(function (angulo) { giroPinzaFlag = degreesToRadians(angulo); });
    aperturaPinzaLS.onChange(function (angulo) { aperturaPinzaFlag = degreesToRadians(angulo); });
}

/*
* Crear el motor, la escena y la camara
*/
function init() {
    // Motor de render
    renderer = new THREE.WebGLRenderer();
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setClearColor( new THREE.Color(0x0000AA) );
    // Esta opción requiere "Cleans" manuales
    renderer.autoClear = false;
    // El canvas pasa a estar asociado al contenedor definido en el documento HTML
    document.getElementById('container').appendChild(renderer.domElement);

    // Escena
    scene = new THREE.Scene();

    // Camara
    var ar = window.innerWidth / window.innerHeight;
    setCameras(ar);

    // Interfaz Gráfica de Usuario
    setUpGui();

    // Controles
    domEvents = new THREEx.DomEvents(camera, renderer.domElement);
    keyboard = new THREEx.KeyboardState(renderer.domElement);

    // Eventos
    window.addEventListener('resize', updateAspectRatio);

    // Carga de la escena
    loadScene();

    // Inicio del ciclo de renderizado
    render();
}

/*
* Cargar la escena con objetos
*/
function loadScene() {
    // Materiales
    // General
    var materialDefault = new THREE.MeshBasicMaterial({color:'red', wireframe:true});
    // Usado para ver mejor ciertas partes, no aparece en la versión final
    var materialDebug = new THREE.MeshBasicMaterial({color:'white', wireframe:true}); 

    // Creando el plano de planos (vertices repetidos = No eficiente; Pero lo suficiente)
    var superplano = new THREE.Object3D();
    for (var i = 0; i < 10; i++)
    {
        for (var j = 0; j < 10; j++)
        {
            var plano = planeMesh(100, materialDefault);
            plano.position.x = i * 100 - 500;
            plano.position.z = j * 100 - 500;
            superplano.add(plano);
        }
    }

    robot = new Robot(materialDefault);
    // Para centrarlo sobre los vértices del plano de forma similar a la imagen de muestra
    robot.translate(-50, 0, -50);
    
    // TESTS
    //robot.rotarBase(-pi/2);
    //robot.rotarBrazo(pi/7);
    //robot.rotarAntebrzoY(pi/6);
    //robot.rotarAntebrzoZ(pi/6);
    //robot.rotarPinza(-pi/4);
    //robot.regularPinza(pi/24);

    scene.add(robot.malla);
    scene.add(superplano);
}

/*
* Realiza los cálculos y ajustes necesarios para mantener la escena en pantalla pese
* a los posibles cambos de tamaño del viewport
*/
function updateAspectRatio() {
    renderer.setSize(window.innerWidth, window.innerHeight);
    var ar = window.innerWidth  / window.innerHeight;
    camera.aspect = ar;
    // Se ha variado el volumen de la vista
    camera.updateProjectionMatrix();
}

/*
* Cambios entre frames. En esta ocasión, al no haber animaciones, no es necesaria
*/
function update()
{
    if (giroBaseFlag)
    {
        robot.rotarBase(giroBaseFlag - robot.giroBase);
        giroBaseFlag = 0;
    }
    if (giroBrazoFlag)
    {
        robot.rotarBrazo(giroBrazoFlag - robot.giroBrazo);
        giroBrazoFlag = 0;
    }
    if (giroAntebrazoYFlag)
    {
        robot.rotarAntebrzoY(giroAntebrazoYFlag - robot.giroAntebrazoY);
        giroAntebrazoYFlag = 0;
    }
    if (giroAntebrazoZFlag)
    {
        robot.rotarAntebrzoZ(giroAntebrazoZFlag - robot.giroAntebrazoZ);
        giroAntebrazoZFlag = 0;
    }
    if (giroPinzaFlag)
    {
        robot.rotarPinza(giroPinzaFlag - robot.giroPinza);
        giroPinzaFlag = 0;
    }
    if (aperturaPinzaFlag)
    {
        robot.regularPinza(aperturaPinzaFlag - robot.cierrePinzas);
        aperturaPinzaFlag = 0;
    }
}

/*
* Función a cargo de dibujar cada frame
*/
function render() {
    requestAnimationFrame(render);

    update();

    renderer.clear();

    // La cámara principal ocupa todala ventana
    renderer.setViewport(0, 0, window.innerWidth, window.innerHeight);
    renderer.render( scene, camera );

    // El lado de la mionicámara es una cuarta parte del lado más pequeño de la ventana
    var min = Math.min(window.innerHeight, window.innerWidth);
    // La minicámara debe permanecer en la parte superior izquierda de la ventana
    renderer.setViewport(5, 5, min/4, min/4);
    renderer.render( scene, miniCam );
}

// TODO
// -> Añadir controles de flechas para mover la base
// -> Añadir botones para desactivar los orbitcontrols y para mostrar los stats
// Revisar rotaciones que causan problemas, como rotarPinzas