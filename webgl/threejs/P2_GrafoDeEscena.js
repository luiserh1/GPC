/**
*	Seminario GPC #2. Grafo de Escena
*	El robete majete
*
*/
const pi = 3.1415926535;

// Variables imprescindibles
var renderer, scene, camera;

// Acciones
init();
loadScene();
render();

/*
* Construimos la cámara
*/
function setCameras(ar)
{
    var puntoInteres = new THREE.Vector3(0, 125, 0);

    // Perspectiva
    camera = new THREE.PerspectiveCamera( 50, ar, 0.1, 1500);
	camera.position.set(200, 250, 175);
    camera.lookAt(puntoInteres);

    scene.add(camera);
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
    
    // Eventos
    window.addEventListener('resize', updateAspectRatio);
}

/*
* Cargar la escena con objetos
*/
function loadScene() {
    // Materiales
    // General
    var materialDefault = new THREE.MeshBasicMaterial({color:'red', wireframe:true}); // Material general
    // Usado para ver mejor ciertas partes, no aparece en la versión final
    var materialDebug = new THREE.MeshBasicMaterial({color:'white', wireframe:true}); 

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
            3,2,1, 0,3,1
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
        plano = new THREE.Mesh(geo, material);
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
        // Se registran las caras
        for (var i = 0; i < indices.length; i += 3)
        {
            var triangulo = new THREE.Face3(indices[i], indices[i+1], indices[i+2]);
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
        rotula = new THREE.Mesh(geoCilindro.clone(), material);
        rotula.geometry.scale(20, 18, 20);
        rotula.geometry.rotateZ(pi/2);
        esparrago = new THREE.Mesh(geoCubo.clone(), material);
        esparrago.geometry.scale(18, 120, 12);
        esparrago.geometry.translate(0, 60, 0);
        eje = new THREE.Mesh(geoesfera, material);
        eje.geometry.scale(20, 20, 20);
        eje.geometry.translate(0, 120, 0);

        brazo.add(eje);
        brazo.add(esparrago);
        brazo.add(rotula);
        brazo.translateY(20);

        // ANTEBRAZO
        var antebrazo = new THREE.Object3D();
        var disco, nervios, mano;
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
        mano = new THREE.Mesh(geoCilindro.clone(), material);
        mano.geometry.scale(15, 40, 15);
        mano.geometry.rotateX(pi/2);
        mano.geometry.translate(0, 86, 0);

        // MANO (no es necesario crear un Object3D vacío, ya tenemos la mano)
        var pinzaIz, pinzaDer;
        pinzaIz = new THREE.Mesh(geoPinza.clone(), material);
        pinzaIz.geometry.rotateZ(pi/2);
        pinzaIz.geometry.rotateY(pi/2);
        pinzaIz.geometry.translate(15, 87.5, 10);
        pinzaDer = new THREE.Mesh(geoPinza.clone(), material);
        pinzaDer.geometry.rotateZ(pi/2);
        pinzaDer.geometry.rotateY(pi/2);
        pinzaDer.geometry.translate(15, 87.5, -10);

        mano.add(pinzaIz);
        mano.add(pinzaDer);

        antebrazo.add(disco);
        for (var i = 0; i < 4; i++ ) antebrazo.add(nervios[i]);
        antebrazo.add(mano);
        antebrazo.translateY(120);

        // Ensamblado final
        brazo.add(antebrazo);
        base.add(brazo);
        robot.add(base);

        return robot;
    }


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

    var robot = robotMesh(materialDefault);
    // Para centrarlo sobre los vértices del plano de forma similar a la imagen de muestra
    robot.translateZ(-50);
    robot.translateX(-50);

    scene.add(robot);
    scene.add(superplano);
    //scene.add( new THREE.AxesHelper(450) );

    /*
    // Pequeño Test
    var robot2 = robotMesh(materialDebug);
    robot2.translateZ(-250);
    robot2.translateX(-150);
    scene.add(robot2);
    */
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
function update() {

}

/*
 * Función a cargo de dibujar cada frame
 */
function render() {
	requestAnimationFrame(render);

    update();
    
    renderer.clear();

    renderer.render( scene, camera );
}