/*
*	Trabajo Final GPC. Luis Serrano Hernández
*	El juegarral
*/
"use strict"; // Ayuda a hacer un poco más estricto el tipado de las variables

const pi = Math.PI;
function degreesToRadians(degrees) { return degrees * (pi/180); }

////////////////////////
// VARIABLES GLOBALES //
////////////////////////
// Imprescindibles
var renderer, scene, camera;
// Controlador de la cámara
var cameraController;
// Controladores de la entrada por teclado y ratón
var domEvents, keyboard;
// Controlador de la configuración y efectos del mapa
var mapController;
// Controlador del rendimiento
var stats;
// El mapa general
var map;

// Incremental loading
// Percentage of loaded scene
var loadPercent;
// Objective scene
var sceneObj;
// Variables to speedUp process
var allObjs, superGeo
// And to store it
var protoMesh, protoRoot;


// Materiales
var materialDefault, materialTile, materialBorder, materialDebug, materialPlano, materialHabitacion, materialBase, materialEje,
    materialEsparrago, materialRotula, materialDisco, materialNervio, materialPalma, materialPinza;

// Luces
var luzAmbiente, luzPuntual, luzDireccional, luzFocal;

//////////////////////////////////////
// FUNCIONES DE GEOMETRÍAS Y MALLAS //
//////////////////////////////////////
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

function tileGeometry(radius, heigth) { return new THREE.CylinderGeometry( radius, radius, heigth, 6 ); }

function tileBorderGeometry(RM, heigth)
{
    var geo = new THREE.Geometry();

    var rm = 0.9 * RM;
    var sh = heigth / 2;
    var coordenadas = [];
    var currentAngle = 0;
    // Se construyen una línea por cada prisma hexagonal (externo e interno) por cada iteración (4 vértices en total) en el siguiente orden:
    //      Extterno    Intterno
    //      2           4
    //      |           |
    //      |           |
    //      |           |
    //      1           3
    for (var i = 0; i < 6; i++)
    {
        var xM, xm, zM, zm;
        xM = RM * Math.sin(currentAngle);
        zM = RM * Math.cos(currentAngle);
        xm = rm * Math.sin(currentAngle);
        zm = rm * Math.cos(currentAngle);
        coordenadas.push(xM); coordenadas.push(-sh); coordenadas.push(zM); // 1
        coordenadas.push(xM); coordenadas.push(sh); coordenadas.push(zM); // 2
        coordenadas.push(xm); coordenadas.push(-sh); coordenadas.push(zm); // 3
        coordenadas.push(xm); coordenadas.push(sh); coordenadas.push(zm); // 4
        currentAngle += pi / 3;
    }

    // Tras haber seguido el esquema anterior ahora podemos indeicar el orden de los vértices para generar los triángulos
    // Se generan 8 triángulos por iteración:
    // -> 2 cara frontal    -> 2 cara externa superior
    // -> 2 cara interior   -> 2 cara inferior
    var indices = [];
    for (var i = 0; i < coordenadas.length + 4; i += 4)
    {
        // Guardamos todos los índices de los 8 vértices con los que vamos a trabajar por iteración
        var x, x1, x2, x3, x4, x5, x6, x7;
        x = i;          x1 = i + 1;
        x2 = i + 2;     x3 = i + 3;

        // La última arista cierra con la primera
        var j = i;
        if (i / 4 == 5) j = -4;
        x4 = j + 4;     x5 = j + 5;
        x6 = j + 6;     x7 = j + 7;
        // Los vértices de los triángulos se introducen en orden horario, vara generarlos en orden antihorario es suficiente con
        // recorrer el array de índices en orden reverso
        // Triángulos cara frontal
        indices.push(x);    indices.push(x1);   indices.push(x4);
        indices.push(x4);   indices.push(x1);   indices.push(x5);
        // Triángulos cara trasera
        indices.push(x1);   indices.push(x3);   indices.push(x5);
        indices.push(x5);   indices.push(x3);   indices.push(x7);
        // Triángulos cara superior
        indices.push(x2);   indices.push(x);    indices.push(x4);
        indices.push(x6);   indices.push(x2);   indices.push(x4);
        // Triángulos cara inferior
        indices.push(x3);   indices.push(x2);   indices.push(x6);
        indices.push(x7);   indices.push(x3);   indices.push(x6);
    }

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

    // Cálculo del pivote (desactivado por ser el origen por defecto gracias a la forma en la que se construye)
    /*var numVertex = coordenadas.length / 3;
    var pivotX, pivotY, pivotZ;
    pivotX = vertexSum[0] / numVertex;
    pivotY = vertexSum[1] / numVertex;
    pivotZ = vertexSum[2] / numVertex;
    // Finalmente, se centra el pivote moviendo la geometría de forma que este quede en (0,0,0)
    geo.applyMatrix( new THREE.Matrix4().makeTranslation( -pivotX, -pivotY, -pivotZ ) );*/

    return geo;
}

////////////
// CLASES //
////////////
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
*   A map represents all the tiles, the units and the stats of the game
*/
class Map
{
    constructor(radius, centerNode)
    {
        this.radius = radius;
        this.centerNode = centerNode;
    }
}

/*
*   A tile is a piece of the terrain where units and buildings can be placed
*/
class HexaTile
{
    constructor(meshGroup, x, y)
    {
        this.meshGroup = meshGroup;
        this.x = x;
        this.y = y;
        this.unit = undefined;
        this.building = undefined;
    }
}

/*
* Auxiliar structure to keep all the tiles conected
*/
class HexaNode
{
    constructor(hexaTile, upLeft, upRight, centerRight, bottomRight, bottomLeft, centerLeft)
    {
        this.hexaTile = hexaTile;
        this.upLeft = upLeft;
        this.upRight = upRight;
        this.centerRight = centerRight;
        this.bottomRight = bottomRight;
        this.bottomLeft = bottomLeft;
        this.centerLeft = centerLeft;
    }
}

/*
*   An unit is a piece in the game that can be moved and has special properties
*/
class Unit
{
    constructor(x, y)
    {
        this.x = x;
        this.y = y;
    }
}

/*
*   A buolding is a piece in the game that cannot be moved and has special properties
*/
class Building
{
    constructor(x, y)
    {
        this.x = x;
        this.y = y;
    }
}

//////////////////////////
// FUNCIONES AUXILIARES //
//////////////////////////

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

function setUpGUI()
{
    // Definicion de los controles
    mapController =
    {
		radius: 15,     // Valores iniciales
		reset: false
	};

	// Creacion interfaz
	var gui = new dat.GUI();

    // CONSTRUCCIÓN DEL MENÚ
    // Añadir subcarpeta
    var h = gui.addFolder("Configuración Mapa");
    // Configurar opciones
    // Variable que almacena la opción              Nombre dict    Nombre en dict        Min   Max    Delta   Nombre Visible
    var radiusLS =                            h.add(mapController, "radius",             10,   30,    1).name("Radio");
    var resetLS = h.add(mapController, "reset").name("Reconstruir");
    // Almacenar la opción en una variable permite configurar un <<listener>>
    // Lo cuál es imprescindible, pues necesitamos devolver el foco al canvas una vez terminada la configuración
    // Esto se logra con <<renderer.domElement.focus()>>
    radiusLS.onChange(function (nuevoValor)
    {
        renderer.domElement.focus();
    });
    resetLS.onChange(function (nuevoValor)
    {
        renderer.domElement.focus();
    });
}

function setUpMaterials()
{
    materialDefault = new THREE.MeshBasicMaterial({color:'red', wireframe:true});
    materialTile = new THREE.MeshBasicMaterial({color:'green', wireframe:false});
    materialBorder = new THREE.MeshBasicMaterial({color:'orange', wireframe:false});
    materialDebug = new THREE.MeshBasicMaterial({color:'white', wireframe:true});

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
*   Inicializa todos los valores y componentes relativos a la(s) cámara(s)
*/
function setUpCameras(ar)
{
    var puntoInteres = new THREE.Vector3(0, 30, 0);

    // Perspectiva
    camera = new THREE.PerspectiveCamera( 50, ar, 0.1, 2500);
    camera.position.set(-1000, 1000, -1000);

    // El controlador de la cámara recibe como parámetros la propia cámara y el canvas
    cameraController = new THREE.OrbitControls(camera, render.domElement);
    camera.lookAt(puntoInteres); // Debe ir después de la inicialización de los controladores para evitar reseteos
    cameraController.target.set(puntoInteres.x, puntoInteres.y, puntoInteres.z);
    cameraController.enableKeys = false;
    //cameraController.enableRotate = false;    
}

/*
*   Loads the scene with objects. 
*/
function loadHexagonalMapScene(radius)
{
    // Reset
    var targetScene = new THREE.Scene();
    map = new Map(radius, undefined); // TODO enums, primero pos y luego mesh 

    if (radius < 1) return targetScene;

    // Tiles' properties
    var tileRadius = 75;
    var tileHeigth = 25;
    var tileMargin = tileRadius / 10;

    // The geometries are created according to the specified properties
    var tileBorderGeo = tileBorderGeometry(tileRadius * 1.02, tileHeigth * 1.02);
    var tileGeo = tileGeometry(tileRadius, tileHeigth);

    // The central hexaTile
    var hexaMesh = new THREE.Mesh(tileGeo, materialTile);
    var hexaBorderMesh = new THREE.Mesh(tileBorderGeo, materialBorder);
    // The tiles are a group of an hexagonal prism and the hexagonal border
    var tileGroup = new THREE.Group();
    tileGroup.add(hexaMesh);
    tileGroup.add(hexaBorderMesh);
    // The nodes are created to keep all the map connected
    var hexaTile = new HexaTile(tileGroup, 0, 0);
    var node = new HexaNode(hexaTile, undefined, undefined, undefined, undefined, undefined, undefined);
    map.centerNode = node;

    // This variable is made of all the tileGroups of the map
    var mapTilesGroup = new THREE.Group();
    mapTilesGroup.add(tileGroup);

    // if (radius > 1)
    for (var i = 1; i < radius; i++)
    {
        var angle = pi / 6;
        for (var j = 0; j < 6; j++)
        {
            hexaMesh = new THREE.Mesh(tileGeo, materialTile);
            hexaBorderMesh = new THREE.Mesh(tileBorderGeo, materialBorder);
            tileGroup = new THREE.Group();
            tileGroup.add(hexaMesh);
            tileGroup.add(hexaBorderMesh);
            tileGroup.translateX(i * (tileRadius * Math.sqrt(3) + tileMargin) * Math.sin(angle));
            tileGroup.translateZ(i * (tileRadius * Math.sqrt(3) + tileMargin) * Math.cos(angle));

            var nextAngle = angle + pi / 3;
            var nextPos = new THREE.Vector3(i * (tileRadius * Math.sqrt(3) + tileMargin) * Math.sin(nextAngle),
                                            0,
                                            i * (tileRadius * Math.sqrt(3) + tileMargin) * Math.cos(nextAngle));
            var tilePos = new THREE.Vector3();
            tileGroup.getWorldPosition(tilePos);
            for (var k = 1; k < i; k++)
            {
                var interTileGroup = tileGroup.clone(true);
                
                var despX = k * (nextPos.x - tilePos.x) / i;
                var despZ = k * (nextPos.z - tilePos.z) / i;

                interTileGroup.applyMatrix( new THREE.Matrix4().makeTranslation(despX, 0, despZ));

                mapTilesGroup.add(interTileGroup);
            }

            mapTilesGroup.add(tileGroup);

            angle += pi / 3;
        }
    }
    console.info("Hay un total de " + mapTilesGroup.children.length + " tiles");
    
    targetScene.add(mapTilesGroup);

    /// ROBO-TIME ///
    var robot = new Robot(materialBase, materialEje, materialEsparrago, materialRotula, materialDisco, 
        materialNervio, materialPalma, materialPinza);

    robot.translate(0, 25, 0);
    robot.rotarBase(degreesToRadians(30));

    targetScene.add(robot.malla);

    return targetScene;
}

/*
*   Realiza los cálculos y ajustes necesarios para mantener la escena en pantalla pese
*   a los posibles cambos de tamaño del viewport
*/
function updateAspectRatio() {
    renderer.setSize(window.innerWidth, window.innerHeight);
    var ar = window.innerWidth  / window.innerHeight;
    camera.aspect = ar;
    // Se ha variado el volumen de la vista
    camera.updateProjectionMatrix();
}

/*
*   Cambios entre frames.
*/
function update()
{
    // Actualiza interpoladores
	TWEEN.update();
}

// TODO OPTIMIZE A LOT
function incrementalLoad()
{
    if (loadPercent.val > 100)
    {
        scene = sceneObj;
         // Luces
        setLights();
        return 1;
    }

    scene = new THREE.Scene();

    if (loadPercent.val < 0.001)
        return 0;

    if (!(allObjs && !superGeo))
    {
        superGeo = new THREE.Geometry();
        allObjs = [];
    
        var elementsToAnalyze = [sceneObj];
    
        while (elementsToAnalyze.length > 0)
        {
            var element = elementsToAnalyze.pop();
            if (element.type == "Group" || element.type == "Object3D" || element.type == "Scene")
                for (let child of element.children) 
                {
                    elementsToAnalyze.push(child);
                    if (element.type != "Scene")
                    {
                        var newObj = element.clone();
                        allObjs.push(newObj);
                    }
                }
            else
            {
                superGeo.merge(element.geometry, element.parent.matrix); // TODO dejarlo como estaba
            }
        }
        superGeo.mergeVertices();
    }
    
    protoRoot = new THREE.Group();
    if (loadPercent.val < 50)
    {
        var proportion = loadPercent.val / 50.0;

        var renderedFaces = [];
        var renderedFacesNum = Math.ceil( proportion * superGeo.faces.length );
        for (var i = superGeo.faces.length-1; i > superGeo.faces.length - renderedFacesNum; i--)
            renderedFaces.push(superGeo.faces[i]);

        superGeo.faces = renderedFaces;
        protoMesh = new THREE.Mesh(superGeo, materialDefault);
    }
    else if (loadPercent.val < 75)
    {
        protoMesh = new THREE.Mesh(superGeo, materialDebug);
        var proportion = (loadPercent.val-50) / 25.0;
        var numMeshes = Math.ceil( proportion * allObjs.length );
        for (var i = allObjs.length-1; i > allObjs.length-numMeshes; i--)
        {
            protoRoot.add(allObjs[i]);
        }
    }
    else
    {
        var proportion = (loadPercent.val-75) / 25.0;

        var renderedFaces = [];
        var renderedFacesNum = Math.ceil( (1-proportion) * superGeo.faces.length );
        for (var i = superGeo.faces.length-1; i > superGeo.faces.length - renderedFacesNum-1; i--)
            renderedFaces.push(superGeo.faces[i]);

        superGeo.faces = renderedFaces;
        protoMesh = new THREE.Mesh(superGeo, materialDebug);
        for (var i = 0; i < allObjs.length-1; i++)
        {
            protoRoot.add(allObjs[i]);
        }
    }
    

    protoRoot.add(protoMesh);
    scene.add(protoRoot);

    return 0;
}

/*
*   Función a cargo de dibujar, solo comandos básicos
*/
function draw() {
    renderer.clear();

    // La cámara principal ocupa todala ventana
    renderer.setViewport(0, 0, window.innerWidth, window.innerHeight);
    renderer.render( scene, camera );
}

/*
*   Función a cargo de dibujar cada frame
*/
function render() {
    requestAnimationFrame(render);

    update();

    draw();
}

function renderInc()
{
    update();
    if (incrementalLoad())
        requestAnimationFrame(render);
    else
        requestAnimationFrame(renderInc);
    draw();
    console.info(loadPercent);
}

function animateIncrementalRendering()
{
    loadPercent = {val: 0};
    var percentInc = new TWEEN.Tween( loadPercent ).to( {val: [0.0, 99.99, 85, 101]} /*Rango*/, 15000 /*Tiempo en ms*/);
    percentInc.interpolation(TWEEN.Interpolation.Bezier);
    percentInc.easing(TWEEN.Easing.Exponential.InOut);
    percentInc.start();
    renderInc();
}

function init()
{
    // Motor de render
    renderer = new THREE.WebGLRenderer();
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setClearColor( new THREE.Color(0x0000AA) );
    // Esta opción requiere "Cleans" manuales
    renderer.autoClear = false;
    // El canvas pasa a estar asociado al contenedor definido en el documento HTML
    document.getElementById('container').appendChild(renderer.domElement);

    // Camara
    var ar = window.innerWidth / window.innerHeight;
    setUpCameras(ar);

    // Interfaz Gráfica de Usuario
    setUpGUI();

    // Materiales
    setUpMaterials();

    // Controles
    domEvents = new THREEx.DomEvents(camera, renderer.domElement);
    keyboard = new THREEx.KeyboardState(renderer.domElement);
    renderer.domElement.setAttribute("tabIndex", "0");
    renderer.domElement.focus();
    
    // Seguimiento del rendimiento
    stats = new Stats();
    stats.showPanel( -1 ); // 0: fps, 1: ms, 2: mb, 3+: custom 
    document.boullScen
    window.addEventListener('resize', updateAspectRatio);

    // Carga de la escena principal y renderizado
    sceneObj = loadHexagonalMapScene(5);
    animateIncrementalRendering();
}

//////////////
// ARRANQUE //
//////////////
init();

//////////
// TODO //
//////////
// -> Apaañar comentarios