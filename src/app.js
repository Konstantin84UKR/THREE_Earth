import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { RGBELoader } from 'three/examples/jsm/loaders/RGBELoader.js';

import { Earth } from '/Earth.js';
import { Timer } from 'three/addons/misc/Timer.js';

import { FontLoader } from 'three/addons/loaders/FontLoader.js';
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

import studioGLTF from './assets/models/studio.glb?url'

function main(assets) {
    
    // Canvas
    const canvas = document.querySelector('canvas.webgl')

    /**
     * Sizes
     */
    const sizes = {
        width: window.innerWidth, // 800
        height: window.innerHeight // 600
    }

    /**
     * Renderer
     */
    const renderer = new THREE.WebGLRenderer({
        canvas: canvas
    })

    renderer.setSize(sizes.width, sizes.height)
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.0;

    // Scene
    const scene = new THREE.Scene()
    const timer = new Timer();
    /**
     * Camera
     */
    const camera = new THREE.PerspectiveCamera(75, sizes.width / sizes.height)
    camera.position.z = 10
    camera.position.y = 1
    camera.position.x = -5
    scene.add(camera)

    const controls = new OrbitControls(camera, canvas);
    controls.enableDamping = true;
    controls.enableRotate = false; 


    /** 
    * Ligth 
    */
    new RGBELoader()
        .setPath('./assets/textures/hdri/')
        .load('basic.hdr', function (texture) {

            texture.mapping = THREE.EquirectangularReflectionMapping;

            scene.background = texture;
            scene.environment = texture;
        });

    // White directional light at half intensity shining from the top.
    const targetObject = new THREE.Object3D(); 
    targetObject.position.set(1, 0, -0);
    scene.add(targetObject);
 

    const directionalLight = new THREE.DirectionalLight(0xffffff, 3.0);
    directionalLight.position.set(0, 4, 3);
    directionalLight.target = targetObject; 
    directionalLight.castShadow = true;

    scene.add(directionalLight);

    //Set up shadow properties for the light
    directionalLight.shadow.mapSize.width = 512; // default
    directionalLight.shadow.mapSize.height = 512; // default
    directionalLight.shadow.camera.near = 0.5; // default
    directionalLight.shadow.camera.far = 15; // default
    directionalLight.shadow.camera.left = -10; // default
    directionalLight.shadow.camera.right  = 10; // default
    directionalLight.shadow.camera.top  = 10; // default
    directionalLight.shadow.camera.bottom  = -10; // default
    directionalLight.shadow.bias = - 0.0001;

    const dirLightHelper = new THREE.DirectionalLightHelper(directionalLight, 10);
    //scene.add(dirLightHelper);

    //scene.add(new THREE.CameraHelper(directionalLight.shadow.camera));

    /**
     * Object
     */
    const geometryBox = new THREE.BoxGeometry(1, 1, 1)
    geometryBox.translate(2, 1, 0)
    const materialBox = new THREE.MeshStandardMaterial({
        color: 0xff8800,
        envMap: scene.environment,
        envMapIntensity: 1.0
    })
    materialBox.depthTest = true;

    const meshBox = new THREE.Mesh(geometryBox, materialBox)
    meshBox.castShadow = true; //default is false
    meshBox.receiveShadow = true; //default  
    
   // scene.add(meshBox)

    const geometrySphere = new THREE.SphereGeometry(0.5, 20, 20)
    geometrySphere.translate(1, 1, 0)
    const materialSphere = new THREE.MeshStandardMaterial({
        color: 0x0088ff,
        envMap: scene.environment,
        envMapIntensity: 1.0
    })
    materialSphere.depthTest = true;

    const meshSphere = new THREE.Mesh(geometrySphere, materialSphere)
    meshSphere.castShadow = true; //default is false
    meshSphere.receiveShadow = true; //default  
   
    //scene.add(meshSphere)

    // const loader = new FontLoader();

    // loader.load( '/res/fonts/optimer_regular.typeface.json', function ( font ) {
    
    //     const geometryText = new TextGeometry( `  Make peace 
    // not war!`, {
    //         font: font,
    //         size: 80,
    //         depth: 1,
    //         curveSegments: 12,
    //         bevelEnabled: true,
    //         bevelThickness: 1,
    //         bevelSize: 4,
    //         bevelOffset: 0,
    //         bevelSegments: 5
    //     } );

    //     const textmaterial = new THREE.MeshStandardMaterial({
    //         color: 0x8888ff,
    //         envMap: scene.environment,
    //         envMapIntensity: 1.0
    //     })

    //     geometryText.scale(0.01, 0.01, 0.01) 
    //     geometryText.translate(-3.5,1,0)

	// 	const textMesh = new THREE.Mesh( geometryText, textmaterial );
    //     //scene.add(textMesh)
    // } );
   
    //--------------------------
    const geometryPlane = new THREE.PlaneGeometry(15, 15, 15)
    geometryPlane.rotateX(Math.PI * -0.5)
    geometryPlane.translate(0,-4,0);
    const materialPlane = new THREE.MeshStandardMaterial({
        color: 0x555555,
        envMap: scene.environment,
        envMapIntensity: 1.0,
        opacity: 0.2,
        transparent : false
    })
    materialPlane.depthTest = true;

    const plane = new THREE.Mesh(geometryPlane, materialPlane)
    plane.castShadow = true; //default is false
    plane.receiveShadow = true; //default 
   
    //scene.add(plane)

    const studioModel = assets.studioModel.scene.children[0];
    studioModel.geometry.scale(15,25,25);
    studioModel.geometry.translate(10,-5,0)
    studioModel.castShadow = true; //default is false
    studioModel.receiveShadow = true; //default 
    studioModel.material = materialPlane
    scene.add(studioModel)

 
    const earth = new Earth(scene,renderer,camera, canvas,assets);  

    const renderLoop = () => {

        renderer.setAnimationLoop((ts) => {

            // timestamp is optional
            timer.update( ts );
        	const dt = timer.getDelta();

            earth.renderSimTexture(dt);
            // Render
            //renderer.render(scene, camera);
        })
    };

    renderLoop();

}
//main();

async function assetLoader(){
    let assets = {};
    const ufonts = './assets/fonts/optimer_regular.typeface.json';
    const urldiffuse = './assets/textures/earth/diffuse.png';
    const ubump = './assets/textures/earth/bump.png';
    const uspecular = './assets/textures/earth/specular.png';
    const uStudio = studioGLTF;
    const [font,diffuse,bump,specular,studio] = await Promise.all([
        new Promise(res => new FontLoader().load(ufonts, res)),
        new Promise(res => new THREE.TextureLoader().load(urldiffuse, res)),
        new Promise(res => new THREE.TextureLoader().load(ubump, res)),
        new Promise(res => new THREE.TextureLoader().load(uspecular, res)),
        new Promise(res => new GLTFLoader().load(uStudio, res)),
        // ...
      ])
       
      assets.font = font;
      assets.studioModel = studio;
      assets.diffuse = diffuse;
      assets.bump = bump;
      assets.specular = specular;
      
   main(assets);   
} 

assetLoader()