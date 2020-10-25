/**
*	Práctica GPC #5. Iluminación y Materiales
*	Arrojando luz sobre nuestra material existencia
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
// La configuración
var settingsController;
// los controles
var domEvents, keyboard;
// El rendimiento
var stats;
// El tiempo
var clock;

// Giros Flags
var giroBaseFlag, giroBrazoFlag, giroAntebrazoYFlag, giroAntebrazoZFlag, giroPinzaFlag, aperturaPinzaFlag;

// Minicámara y sus atributos
var miniCam;
var r = 200; 
var t = 200;
var l = -r;
var b = -t;
var n = -200, f = 800;

// El robot a manejar
var robot;

// Variable para depurar
var rotaAux = 1.0;

// Luces
var luzAmbiente, luzPuntual, luzDireccional, luzFocal;

// Materiales
var materialDefault, materialDebug, materialPlano, materialHabitacion, materialBase, materialEje,
    materialEsparrago, materialRotula, materialDisco, materialNervio, materialPalma, materialPinza;

///////////////
// FUNCIONES //
///////////////
function degreesToRadians(degrees) { return degrees * (pi/180); }

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
        0*seg,0*seg,19*seg,     5*seg,1*seg,38*seg,         5*seg,3*seg,38*seg,
        15*seg,3*seg,38*seg,    15*seg,1*seg,38*seg,        20*seg,4*seg,19*seg,
        20*seg,0*seg,19*seg,    20*seg,4*seg,0*seg,         20*seg,0*seg,0*seg
    ];
    // Los triángulos se forman con vértices en sentido horario
    var indices =
    [
        0,1,3,   3,1,2,  3,2,4,  4,2,5,
        2,1,10,  2,10,8, 5,2,8,  5,8,6,
        9,7,6,   9,6,8,  11,9,8, 11,8,10,
        9,4,7,   9,3,4,  11,3,9, 11,0,3,
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
    // Todo el proceso anterior relativo al picote podría realizarse con .normalize, a costo de las dimensiones de escala ya calculadas

    geo.computeFaceNormals()

    return geo;
}

/*
* Devuelve una malla de robot de tamaño estándar con el material proporcionado.
*/
function robotMesh(materialBase, materialEje, materialEsparrago, materialRotula, materialDisco, materialNervio, materialPalma,
    materialPinza)
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
    var base = new THREE.Mesh(geoCilindro.clone(), materialBase);
    base.geometry.scale(50, 15, 50);

    // Las partes de súperpiezas como el brazo, antebrazo, mano etc. se definen con origen en (0,0,0) y después
    // son las súperpiezas en conjunto las que son transladas a sus respectivas posiciones en el robot
    // BRAZO
    var brazo = new THREE.Object3D();
    var eje, esparrago, rotula;
    eje = new THREE.Mesh(geoCilindro.clone(), materialEje);
    eje.geometry.scale(20, 18, 20);
    eje.geometry.rotateX(pi/2);
    esparrago = new THREE.Mesh(geoCubo.clone(), materialEsparrago);
    esparrago.geometry.scale(18, 120, 12);
    esparrago.geometry.translate(0, 60, 0);
    rotula = new THREE.Mesh(geoesfera, materialRotula);
    rotula.geometry.scale(20, 20, 20);
    rotula.geometry.translate(0, 120, 0);

    // ANTEBRAZO
    var antebrazo = new THREE.Object3D();
    var disco, nervios;
    disco = new THREE.Mesh(geoCilindro.clone(), materialDisco);
    disco.geometry.scale(22, 6, 22);
    nervios = [];
    for (var i = 0; i < 4; i++)
    {
        nervios.push(new THREE.Mesh(geoCubo.clone(), materialNervio));
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
    palma = new THREE.Mesh(geoCilindro.clone(), materialPalma);
    palma.geometry.scale(15, 40, 15);
    palma.geometry.rotateX(pi/2);
    pinzaIz = new THREE.Mesh(geoPinza.clone(), materialPinza);
    pinzaIz.geometry.rotateZ(pi/2);
    pinzaIz.geometry.rotateY(pi/2);
    pinzaIz.geometry.translate(15, 1.5, 15);
    pinzaDer = new THREE.Mesh(geoPinza.clone(), materialPinza);
    pinzaDer.geometry.rotateZ(pi/2);
    pinzaDer.geometry.rotateY(pi/2);
    pinzaDer.geometry.translate(15, 1.5, -15);
    robot.add(base);                        //console.log(base.id);
    base.add(brazo);                        //console.log(brazo.id);
    base.rotateY(-pi/2);
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

    esparrago.castShadow = true;
    esparrago.receiveShadow = true;
    eje.castShadow = true;
    eje.receiveShadow = true;
    rotula.castShadow = true;
    rotula.receiveShadow = true;
    disco.castShadow = true;
    disco.receiveShadow = true;
    for (var i = 0; i < 4; i++ ){
        nervios[i].castShadow = true;
        nervios[i].receiveShadow = true;
    }
    palma.castShadow = true;
    palma.receiveShadow = true;
    pinzaIz.castShadow = true;
    pinzaIz.receiveShadow = true;
    pinzaDer.castShadow = true;
    pinzaDer.receiveShadow = true;

    return robot;
}

/*
" "Clase" Robot con los ángulos y valores de las distintas articulaciones
*/
class Robot
{
    constructor(materialBase, materialEje, materialEsparrago, materialRotula, materialDisco, materialNervio, materialPalma,
        materialPinza)
    {
        this.malla = robotMesh(materialBase, materialEje, materialEsparrago, materialRotula, materialDisco,
            materialNervio, materialPalma, materialPinza);
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

    andar(desplazamiento)
    {
        this.malla.translateX(desplazamiento.x);
        this.malla.translateZ(desplazamiento.y);
        this.desp += desplazamiento;
    }

    rotarBase(angulo)
    {
        var base = this.malla.getObjectById(this.baseID); // La base es el primer y único hijo del robot
        var nuevoAngulo = angulo + this.giroBase;
        if (nuevoAngulo < this.giroBaseLim.x || nuevoAngulo > this.giroBaseLim.y) 
        {
            console.warn("La rotación no se ha efectuado porque sobrepasa límite de rotación de la base");
            return false;
        }
        else
        {
            console.info("Base rotada " + angulo + " radianes. Nuevo ángulo: " + nuevoAngulo);
            this.giroBase = nuevoAngulo;
            base.rotateY(angulo);
            return true;
        }
    }

    rotarBrazo(angulo)
    {
        var brazo = this.malla.getObjectById(this.baseID + 1); // El brazo es el primer y único hijo de la base
        var nuevoAngulo = angulo + this.giroBrazo;
        if (nuevoAngulo < this.giroBrazoLim.x || nuevoAngulo > this.giroBrazoLim.y) 
        {
            console.warn("La rotación no se ha efectuado porque sobrepasa límite de rotación del brazo");
            return false;
        }
        else
        {
            console.info("Brazo rotado " + angulo + " radianes. Nuevo ángulo: " + nuevoAngulo);
            this.giroBrazo = nuevoAngulo;
            var eje = brazo.getObjectById(brazo.id + 1);
            var pivotAxes = new THREE.Vector3(0,0,0);
            eje.getWorldDirection(pivotAxes);
            brazo.rotateOnWorldAxis(pivotAxes, angulo);
            return true;
        }
    }

    rotarAntebrzoY(angulo)
    {
        var brazo = this.malla.getObjectById(this.baseID + 1);
        var nuevoAngulo = angulo + this.giroAntebrazoY;
        if (nuevoAngulo < this.giroAntebrazoYLim.x || nuevoAngulo > this.giroAntebrazoYLim.y) 
        {
            console.warn("La rotación no se ha efectuado porque sobrepasa límite de rotación del antebrazoY");
            return false;
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
            return true;
        }
    }

    rotarAntebrzoZ(angulo)
    {
        var brazo = this.malla.getObjectById(this.baseID + 1);
        var nuevoAngulo = angulo + this.giroAntebrazoZ;
        if (nuevoAngulo < this.giroAntebrazoZLim.x || nuevoAngulo > this.giroAntebrazoZLim.y) 
        {
            console.warn("La rotación no se ha efectuado porque sobrepasa límite de rotación del antebrazoZ");
            return false;
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
            return true;
        }
    }

    rotarPinza(angulo)
    {
        var nuevoAngulo = angulo + this.giroPinza;
        if (nuevoAngulo < this.giroPinzaLim.x || nuevoAngulo > this.giroPinzaLim.y) 
        {
            console.warn("La rotación no se ha efectuado porque sobrepasa límite de rotación de la pinza");
            return false;
        }
        else
        {
            var mano = this.malla.getObjectById(this.baseID + 11);
            console.info("Pinza rotada " + angulo + " radianes. Nuevo ángulo: " + nuevoAngulo);
            this.giroPinza = nuevoAngulo;
            var palma = mano.getObjectById(mano.id + 1);

            var rotZ = new THREE.Vector3(0,0,0);
            var rotY = new THREE.Vector3(0,0,0);
            var rotX = new THREE.Vector3(0,0,0);
            var rotMatrix = new THREE.Matrix4();
            rotMatrix.extractRotation( palma.matrix );
            rotMatrix.extractBasis(rotX, rotY, rotZ);

            mano.rotateOnWorldAxis(rotZ, angulo);
            return true;
        }
    }

    regularPinza(angulo)
    {
        var nuevoAngulo = angulo + this.cierrePinzas;
        if (nuevoAngulo < this.cierrePinzasLim.x || nuevoAngulo > this.cierrePinzasLim.y) 
        {
            console.warn("La rotación no se ha efectuado porque sobrepasa límite de rotación de la pinza");
            return false;
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
            return true;
        }
    }
}

/*
* Prepara los matetiales
*/
function setUpMaterials()
{
    var texturaPlano, texturaBase, texturaEje, texturaEsparrago, texturaRotula,
        texturaDisco, texturaNervio, texturaPalma;

    var loader = new THREE.TextureLoader();

    // Texturas
	var path = "images/";
	texturaPlano = new loader.load(
        // resource URL
        path+'pisometal_1024x1024.jpg',
        
        // onLoad callback
        function ( texture )
        {
            texture.magFilter = THREE.LinearFilter;
            texture.minFilter = THREE.LinearFilter;
            texture.repeat.set(4, 4);
            texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
        },
        
        // onProgress callback currently not supported
        undefined,
        
        // onError callback
        function ()
        {
            console.error("Ha ocurrido un error cargando la textura del suelo");
        });

    var texturaMetal = loader.load(
        // resource URL
        path+'metal_128x128.jpg',
        
        // onLoad callback -> Se eejcuta cuando se completa la carga
        function ( texture )
        {
            texture.center.set(0.5, 0.5);
            texture.rotation = pi/5;
        },
        
        // onProgress callback currently not supported
        undefined,
        
        // onError callback
        function ()
        {
            console.error("Ha ocurrido un error cargando la textura del metal");
        });

    texturaBase = texturaEje = texturaEsparrago = texturaMetal;

    var urlsHabitacion =    [path + "pond/posx.jpg", path + "pond/negx.jpg"
                            ,path + "pond/posy.jpg", path + "pond/negy.jpg"
                            ,path + "pond/posz.jpg", path + "pond/negz.jpg"]
    var mapaEntorno = new THREE.CubeTextureLoader().load(urlsHabitacion);
    mapaEntorno.format = THREE.RGBFormat;
    
    var texturaMadera = loader.load(
        // resource URL
        path+'wood512.jpg',
        
        // onLoad callback
        function ( texture )
        {
            //texture.center.set(0.5, 0.5);
            //texture.repeat.set(4, 4);
            //texture.rotation = pi/2;
        },
        
        // onProgress callback currently not supported
        undefined,
        
        // onError callback
        function ()
        {
            console.error("Ha ocurrido un error cargando la textura de la madera");
        });

    texturaDisco = texturaNervio = texturaPalma = texturaMadera;    

    // Materiales
    materialDefault = new THREE.MeshBasicMaterial({color:'red', wireframe:true});

    materialDebug = new THREE.MeshBasicMaterial({color:'white', wireframe:true});

    materialPlano = new THREE.MeshPhongMaterial({color:'white', map: texturaPlano,
        specular: 0x222222, shininess: 50});

    materialBase = new THREE.MeshPhongMaterial({color:0xFFFFFF, map: texturaBase,
        specular: 0x222222, shininess: 50});

    materialEje = new THREE.MeshPhongMaterial({color:0xFFFFFF, map: texturaEje, 
        specular: 0x222222, shininess: 50});

    materialEsparrago = new THREE.MeshPhongMaterial({color:0xFFFFFF, map: texturaEsparrago, 
        specular: 0x222222, shininess: 50});
    
    materialRotula = new THREE.MeshPhongMaterial({color:0xFFFFFF, envMap: mapaEntorno, 
        specular: 0x222222, shininess: 50});

    materialDisco = new THREE.MeshLambertMaterial({color:0xFFFFFF, map: texturaDisco});

    materialNervio = new THREE.MeshLambertMaterial({color:0xFFFFFF, map: texturaNervio});

    materialPalma = new THREE.MeshLambertMaterial({color:0xFFFFFF, map: texturaPalma});

    materialPinza = new THREE.MeshLambertMaterial({color:0xAAAAAA});

    // Habitacion
	var shader = THREE.ShaderLib.cube;
	shader.uniforms.tCube.value = mapaEntorno;

	materialHabitacion = new THREE.ShaderMaterial({
		fragmentShader: shader.fragmentShader,
		vertexShader: shader.vertexShader,
		uniforms: shader.uniforms,
        side: THREE.BackSide
    });

}

/*
* Construimos las luces
*/
function setLights()
{ 
    // Luces
    luzAmbiente = new THREE.AmbientLight(0x222222, 0.6);

    luzPuntual = new THREE.PointLight(0xEFA94A,0.2);
    luzPuntual.position.set( 50, 150, 50 );

    //luzDireccional = new THREE.DirectionalLight(0xFFFFFF, 0.5);
    //luzDireccional.position.set(-300, 50, 200 );

    luzFocal = new THREE.SpotLight(0xAAAAAA, 0.3);
    luzFocal.position.set( -350, 700, -475 );
    luzFocal.target.position.set(0,125,0);
    luzFocal.angle = Math.PI/10;
    luzFocal.penumbra = 0.2;
    luzFocal.castShadow = true;
    // Sombras
    luzFocal.shadow.camera.near = 1;
    luzFocal.shadow.camera.far =  2500;
    /*luzFocal.shadow.camera.position.set( 0, 0, 500 );
    luzFocal.shadow.camera.lookAt(new THREE.Vector3(-50, 125, -50));
    scene.add(new THREE.SpotLightHelper(luzFocal));
    scene.add(new THREE.CameraHelper(luzFocal.shadow.camera));*/

    scene.add( luzAmbiente );
    scene.add( luzPuntual );
    scene.add( luzDireccional );
    scene.add( luzFocal );
}

/*
* Construimos la cámara
*/
function setCameras(ar)
{
    var puntoInteres = new THREE.Vector3(-50, 115, -50);

    // Perspectiva
    camera = new THREE.PerspectiveCamera( 50, ar, 0.1, 1500);
	camera.position.set(-275, 125, -250);

    // El controlador de la cámara recibe como parámetros la propia cámara y el canvas
    cameraController = new THREE.OrbitControls(camera, render.domElement);
    camera.lookAt(puntoInteres); // Debe ir después de la inicialización de los controladores para evitar reseteos
    cameraController.target.set(puntoInteres.x, puntoInteres.y, puntoInteres.z);
    cameraController.enableKeys = false;
    cameraController.enableRotate = false;

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
    effectController =
    {
		giroBase: 0, // Valores iniciales
		giroBrazo: 0,
		giroAntebrazoY: 0,
		giroAntebrazoZ: 0,
		giroPinza: 0,
        aperturaPinza: 0,
        velocidad: 50
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
    var velocidadLS = h.add(effectController, "velocidad", 10, 200, 1).name("Velocidad");
    
    giroBaseLS.onChange(function (angulo) 
    { 
        giroBaseFlag = degreesToRadians(angulo);
        renderer.domElement.focus(); // Se requiere para que siga aceptando la entrada del teclado
    });
    giroBrazoLS.onChange(function (angulo) 
    { 
        giroBrazoFlag = degreesToRadians(angulo); 
        renderer.domElement.focus(); 
    });
    giroAntebrazoYLS.onChange(function (angulo) 
    {
        giroAntebrazoYFlag = degreesToRadians(angulo); 
        renderer.domElement.focus(); 
    });
    giroAntebrazoZLS.onChange(function (angulo)
    {
        giroAntebrazoZFlag = degreesToRadians(angulo);
        renderer.domElement.focus(); 
    });
    giroPinzaLS.onChange(function (angulo)
    {
        giroPinzaFlag = degreesToRadians(angulo);
        renderer.domElement.focus(); 
    });
    aperturaPinzaLS.onChange(function (angulo) 
    {
        aperturaPinzaFlag = degreesToRadians(angulo);
        renderer.domElement.focus(); 
    });
    velocidadLS.onChange(function (newVel) { renderer.domElement.focus(); });

    settingsController =
    {
        panEnabled: true,
        zoomEnabled: true,
        orbitEnabled: false,
        showStats: false,
        showTopView: false
    }

    var h2 = gui.addFolder("Opciones Globales");
    var panEnabledLS = h2.add(settingsController, "panEnabled").name("Pan Habilitado");
    var zoomEnabledLS = h2.add(settingsController, "zoomEnabled").name("Zoom Habilitado");
    var orbitEnabledLS = h2.add(settingsController, "orbitEnabled").name("Órbita Habilitada");
    var showStatsLS = h2.add(settingsController, "showStats").name("Mostrar Rendimiento");
    h2.add(settingsController, "showTopView").name("Mostrar Cenital");

    panEnabledLS.onChange(function (habilitado) 
    {
        cameraController.enablePan = habilitado;
        renderer.domElement.focus(); 
    });
    zoomEnabledLS.onChange(function (habilitado) 
    {
        cameraController.enableZoom = habilitado;
        renderer.domElement.focus(); 
    });
    orbitEnabledLS.onChange(function (habilitado) 
    {
        cameraController.enableRotate = habilitado;
        renderer.domElement.focus(); 
    });
    showStatsLS.onChange(function (habilitado) 
    {
        if (habilitado) stats.showPanel(0);
        else stats.showPanel(-1);
        renderer.domElement.focus(); 
    });

}

/*
* Función de arranque
*/
function init() {
    // Motor de render
    renderer = new THREE.WebGLRenderer();
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setClearColor( new THREE.Color(0x0000AA) );
    renderer.shadowMap.enabled = true;
    // Esta opción requiere "Cleans" manuales
    renderer.autoClear = false;
    // El canvas pasa a estar asociado al contenedor definido en el documento HTML
    document.getElementById('container').appendChild(renderer.domElement);

    // Escena
    scene = new THREE.Scene();

    // Camara
    var ar = window.innerWidth / window.innerHeight;
    setCameras(ar);

    // Luces
    setLights();

    // Materiales
    setUpMaterials();

    // Interfaz Gráfica de Usuario
    setUpGui();

    // Controles
    domEvents = new THREEx.DomEvents(camera, renderer.domElement);
    keyboard = new THREEx.KeyboardState(renderer.domElement);
    renderer.domElement.setAttribute("tabIndex", "0");
    renderer.domElement.focus();
    
    // Seguimiento del rendimiento
    stats = new Stats();
    stats.showPanel( -1 ); // 0: fps, 1: ms, 2: mb, 3+: custom 
    document.body.appendChild( stats.dom );

    // Eventos
    window.addEventListener('resize', updateAspectRatio);

    // Controlar el tiempo
    clock = new THREE.Clock(true);

    // Carga de la escena
    loadScene();

    // Inicio del ciclo de renderizado
    render();
}

/*
* Cargar la escena con objetos
*/
function loadScene() {
    // Creando el plano de planos (vertices repetidos = No eficiente; Pero lo suficiente)
    var geoPlano = new THREE.PlaneGeometry(1000, 1000, 10, 10);
    geoPlano.rotateX(-pi/2);
    geoPlano.receiveShadow = true;
    geoPlano.castShadow = true;
    var plano = new THREE.Mesh(geoPlano, materialPlano);
    plano.castShadow = true;
    plano.receiveShadow = true;

    robot = new Robot(materialBase, materialEje, materialEsparrago, materialRotula, materialDisco, 
        materialNervio, materialPalma, materialPinza);
    // Para centrarlo sobre los vértices del plano de forma similar a la imagen de muestra
    //robot.translate(-100, 0, -100);
    //robot.malla.castShadow = true;
    //robot.malla.receiveShadow = true;
    for (var i = 0; i < robot.malla.children.length; i++)
    {
        robot.malla.children[i].castShadow = true;
        robot.malla.children[i].receiveShadow = true;
    }

    // La habitación
    var geoCubo = new THREE.CubeGeometry(1000, 1000, 1000);
    var habitacion = new THREE.Mesh(geoCubo, materialHabitacion);

    // Prueba
    var pruebaMesh = new THREE.Mesh(new THREE.CubeGeometry(100, 100, 100), materialPalma);
    pruebaMesh.castShadow = true;
    pruebaMesh.receiveShadow = true;
    pruebaMesh.geometry.translate(0,50,0);

    scene.add(robot.malla);
    //scene.add(pruebaMesh);
    scene.add(plano);
    scene.add(habitacion);
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
* Cambios entre frames.
*/
function update()
{
    stats.begin();
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

    var delta = clock.getDelta();
    var vel = effectController.velocidad;
    if( keyboard.pressed('left') )
    {
        robot.andar(new THREE.Vector2(vel * delta, 0));
        console.info("Desplazamiento hacia la izquierda");
    }
    else if( keyboard.pressed('right') )
    {
        robot.andar(new THREE.Vector2(-vel * delta, 0));
        console.info("Desplazamiento hacia la derecha");
    }
    if( keyboard.pressed('down') )
    {
        robot.andar(new THREE.Vector2(0, -vel * delta));
        console.info("Desplazamiento hacia abajo");
    }
    else if( keyboard.pressed('up') )
    {
        robot.andar(new THREE.Vector2(0, vel * delta));
        console.info("Desplazamiento hacia arriba");
    }

    /*if (!robot.rotarPinza(1 * rotaAux * delta))
    {
        rotaAux *= -1;
    }*/

    stats.end();
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

    if (settingsController.showTopView)
    {
        // El lado de la minicámara es una cuarta parte del lado más pequeño de la ventana
        var min = Math.min(window.innerHeight, window.innerWidth);
        // La minicámara debe permanecer en la parte superior izquierda de la ventana
        renderer.setViewport(5, 5, min/4, min/4);
        renderer.render( scene, miniCam );
    }
}

//////////////
// ACCIONES //
//////////////
// Desde init se arranca todo
init();

//////////
// TODO //
//////////
// -> Organizar código (sobretodo init() y setUpGui())