import * as THREE from 'three'
import {MeshSurfaceSampler} from "three/examples/jsm/math/MeshSurfaceSampler.js";
import { Material } from "./Material";
import { DepthMaterial } from "./DepthMaterial";

import simVertex from './shaders/simVertex.glsl';
import simFragment from './shaders/simFragment.glsl';

import { TextGeometry } from 'three/addons/geometries/TextGeometry.js';

export class Earth{
    constructor(scene,renderer,camera,canvas,assets){
        this.scene = scene;  
        this.renderer = renderer;
        this.camera = camera;
        this.canvas = canvas;
        
        this.globus = null;
        this.meshGlobus = null;
        this.samplerGlobus = null;
        this.dataTextureGlobus = null;
        this.dataTextureText = null;
        this.size = 256; // TODO add to debug
        this.number = this.size * this.size;
        this.tDiffuse = null;
        this.TextureLoader = new THREE.TextureLoader();
        this.time = 0;

        this.raycaster = new THREE.Raycaster();
        this.pointerZero = new THREE.Vector3(100.0, 100.0, 100.0);
        this.pointerCenter = new THREE.Object3D();
        this.lastIntersect = this.pointerZero;
        this.pointer = new THREE.Vector2(0.0, 0.0)
        this.pointerPrev = new THREE.Vector2(0.0, 0.0)
        this.pointerDir= new THREE.Vector3();
        this.indexRaycaste = 0;
        this.switchEarth = true;

        this.color = new THREE.Vector3(1.0,1.0,1.0);

        this.initShader = false;

        this.geometryText = null;
        this.font = assets.font;
        this.assets = assets;

        this.rotMat = new THREE.Matrix4();

        this.init();
        this.setupFBO();
        this.addObject();
        this.initEvents()
    }

    async init(){
        this.tDiffuse = this.assets.diffuse; 
        this.tBump = this.assets.bump; 
        this.tSpecular = this.assets.specular;
        // Globus ============================================================
        this.globus = new THREE.SphereGeometry(3, 32, 32); //suzanne
        this.globus.rotateY(Math.PI * -0.5);
        this.globus.rotateX(Math.PI * -0.05);

        this.MeshBasicMaterial = new THREE.MeshStandardMaterial({color: 0xffffFF, map: this.tDiffuse});

        this.meshGlobus = new THREE.Mesh(this.globus,this.MeshBasicMaterial);
        this.meshGlobus.castShadow = true; //default is false
        this.meshGlobus.receiveShadow = true; //default  


        this.scene.add(this.meshGlobus) 
        this.meshGlobus.visible = false
        
        // Create a sampler for a Mesh surface.
        this.samplerGlobus = new MeshSurfaceSampler(this.meshGlobus).build();
        this.dataTextureGlobus = this.getPointOnModel(this.samplerGlobus);  
        
        // Text ==============================================================
           
        this.geometryText = new TextGeometry( `  Make peace 
    not war`, {
                font: this.font,
                size: 250,
                depth: 1,
                curveSegments: 12,
                bevelEnabled: true,
                bevelThickness: 1,
                bevelSize: 1,
                bevelOffset: 0,
                bevelSegments: 5
            } );
    
            this.textmaterial = new THREE.MeshStandardMaterial({
                color: 0x0088ff,
                envMap: this.scene.environment,
                envMapIntensity: 1.0
            })
    
            this.geometryText.scale(0.005, 0.005,0.005) 
            this.geometryText.center()
    
            this.textMesh = new THREE.Mesh( this.geometryText, this.textmaterial );
            this.scene.add(this.textMesh) 
            this.textMesh.visible = false;
            // Create a sampler for a Mesh surface.
         this.samplerText = new MeshSurfaceSampler(this.textMesh).build();
         this.dataTextureText = this.getPointOnModel(this.samplerText);  
        

    }

    setupFBO() {

    
    // create FBO scene
        this.sceneFBO = new THREE.Scene();
        this.sceneFBO = new THREE.Scene();
        this.cameraFBO = new THREE.OrthographicCamera(-1, 1, 1, -1, -2, 2);
        this.cameraFBO.position.z = 1;
        this.cameraFBO.lookAt(new THREE.Vector3(0,0,0));

        let geo = new THREE.PlaneGeometry(2,2,2,2);
        this.simMaterial = new THREE.MeshBasicMaterial({
            color: 0xff00FF,
            //wireframe: true
        })
        this.simMaterial = new THREE.ShaderMaterial({
            uniforms: {
                time: { value: 0 },
                uTexture: { value: this.dataTextureGlobus.dataTexturePosition },
                uOrigin1: { value: this.dataTextureGlobus.dataTexturePosition },
                uOrigin2: { value: this.dataTextureText.dataTexturePosition },
                uVelocity: { value: this.dataTextureGlobus.dataTexturePosition },
                uMouse: {value: new THREE.Vector3() },  
                uRenderMode: {value: 0 },  
                uDir: {value: new THREE.Vector3()},  
                uBridge: {value: 0.0},  
            },
            vertexShader: simVertex,
            fragmentShader: simFragment,
        })
        this.simMesh = new THREE.Mesh(geo, this.simMaterial);
        this.sceneFBO.add(this.simMesh);

        this.renderTarget = new THREE.WebGLRenderTarget(this.size, this.size, {
            minFilter: THREE.NearestFilter,
            magFilter: THREE.NearestFilter,
            format: THREE.RGBAFormat,
            type: THREE.FloatType,
        })
    
        this.renderTarget1 = new THREE.WebGLRenderTarget(this.size, this.size, {
            minFilter: THREE.NearestFilter,
            magFilter: THREE.NearestFilter,
            format: THREE.RGBAFormat,
            type: THREE.FloatType,
        })

        this.renderTargetVelo1 = new THREE.WebGLRenderTarget(this.size, this.size, {
            minFilter: THREE.NearestFilter,
            magFilter: THREE.NearestFilter,
            format: THREE.RGBAFormat,
            type: THREE.FloatType,
        })
    
        this.renderTargetVelo2 = new THREE.WebGLRenderTarget(this.size, this.size, {
            minFilter: THREE.NearestFilter,
            magFilter: THREE.NearestFilter,
            format: THREE.RGBAFormat,
            type: THREE.FloatType,
        })
    } 

    getPointOnModel(sampler) {

        this._position = new THREE.Vector3();
        this._targetNormal = new THREE.Vector3();
        this._targetColor = new THREE.Color();
        this._targetUV = new THREE.Vector2();
    
        this._matrix = new THREE.Matrix4();
    
        let position = new Float32Array(4 * this.number);
        let normals = new Float32Array(4 * this.number);
        let UVs = new Float32Array(4 * this.number);
    
        for (let i = 0; i < this.number; i++) {
    
            sampler.sample(this._position, this._targetNormal, this._targetColor, this._targetUV);
    
            position[4 * i + 0] = this._position.x;
            position[4 * i + 1] = this._position.y;
            position[4 * i + 2] = this._position.z;
            position[4 * i + 3] = (Math.random() - 0.5) * 0.01;
    
            normals[4 * i + 0] = this._targetNormal.x;
            normals[4 * i + 1] = this._targetNormal.y;
            normals[4 * i + 2] = this._targetNormal.z;
            normals[4 * i + 3] = 0.0;
    
            UVs[4 * i + 0] = this._targetUV.x;
            UVs[4 * i + 1] = this._targetUV.y;
            UVs[4 * i + 2] = 0.5;
            UVs[4 * i + 3] = 1.0;
    
        }
    
        let dataTexturePosition = new THREE.DataTexture(
            position,
            this.size,
            this.size,
            THREE.RGBAFormat,
            THREE.FloatType);
    
        dataTexturePosition.needsUpdate = true;
        dataTexturePosition.name = "dataTexturePosition";
    
        let dataTextureNormals = new THREE.DataTexture(
            normals,
            this.size,
            this.size,
            THREE.RGBAFormat,
            THREE.FloatType);
    
        dataTextureNormals.needsUpdate = true;
        dataTextureNormals.name = "dataTextureNormals";
    
        let dataTextureUVs = new THREE.DataTexture(
            UVs,
            this.size,
            this.size,
            THREE.RGBAFormat,
            THREE.FloatType);
    
        dataTextureUVs.needsUpdate = true;
        dataTextureUVs.name = "dataTextureUVs";
    
        return {dataTexturePosition, dataTextureNormals, dataTextureUVs};
    }

    async addObject() {
        
        this.uniforms = {
            dataTextureUVs : this.dataTextureGlobus.dataTextureUVs,
            dataTexturePosition : this.dataTextureGlobus.dataTexturePosition, 
            tDiffuse : this.tDiffuse,
            tBump: this.tBump,
            tSpecular: this.tSpecular,
            color: this.color,
        }
        
         
        this.materialInstanced = new Material({ color: 0xffffff, wireframe: false, uniforms: this.uniforms });
        this.materialInstanced.envMap = this.scene.environment; 
        this.materialInstanced.envMapIntensity = 2.0; 
        this.materialInstanced.depthTest = true;
        this.materialInstanced.polygonOffset = true;
        this.materialInstanced.depthTest = true;
        this.materialInstanced.polygonOffsetFactor = 1;
        this.materialInstanced.polygonOffsetUnits = 0.1;
        this.materialInstanced.shadowIntensity = 0.5;

        this.depthMaterial = new DepthMaterial({ color: 0xffffff, wireframe: false, uniforms:this.uniforms , depthPacking: THREE.RGBADepthPacking });
        this.depthMaterial.polygonOffset = true;
        this.depthMaterial.depthTest = true;
        this.depthMaterial.polygonOffsetFactor = 1;
        this.depthMaterial.polygonOffsetUnits = 0.1;
        this.depthMaterial.opacity = 0.5;

        this.geometryInstanced = new THREE.SphereGeometry(0.05, 12, 6); 
        this.meshInstanced = new THREE.InstancedMesh(this.geometryInstanced, this.materialInstanced, this.number * 0.5);
        this.meshInstanced.castShadow = true; //default is false
        this.meshInstanced.receiveShadow = true; //default  
        this.depthMaterial.needsUpdate = true;
        this.meshInstanced.customDepthMaterial = this.depthMaterial;
        
        ////UV
        let uvInstance = new Float32Array(this.number);
        for (let i = 0; i < this.size; i++) {
            for (let j = 0; j < this.size; j++) {
                const index = i * this.size + j;

                uvInstance[2 * index + 0] = j / (this.size - 1);
                uvInstance[2 * index + 1] = i / (this.size - 1);
            }
        }
        this.geometryInstanced.setAttribute('uvRef', new THREE.InstancedBufferAttribute(uvInstance, 2));
        this.scene.add(this.meshInstanced);  
        
        this.dammy = new THREE.Mesh(
            new THREE.SphereGeometry(0.1, 12, 12),
            new THREE.MeshNormalMaterial());
        this.dammy.visible = false  
        this.scene.add(this.dammy); 

        //this.meshForRaycaster = this.meshGlobus;
        this.meshForRaycaster = [this.meshGlobus,this.textMesh];
    }

    mousePointerUpdate() {
   
        this.raycaster.setFromCamera(this.pointer, this.camera);
        const intersects = this.raycaster.intersectObjects([this.meshForRaycaster[this.indexRaycaste]]);

        if (intersects.length > 0) {
           

            let point = new THREE.Vector3().copy(intersects[0].point);
            this.pointerDir.subVectors(point,this.lastIntersect); 
            
            this.dammy.position.copy(point);
            this.simMaterial.uniforms.uMouse.value = point;
            this.simMaterial.uniforms.uDir.value = this.pointerDir.add(new THREE.Vector3(0.01,0.01,0.01));
           
            this.lastIntersect = intersects[0].point;

        } else {

             this.lastIntersect.lerp( new THREE.Vector3(0,3,-3), 0.05);

            this.dammy.position.copy(this.lastIntersect);
            this.simMaterial.uniforms.uMouse.value = this.lastIntersect;
            this.simMaterial.uniforms.uDir.value = new THREE.Vector3();
            
        }
    }

    //Events
initEvents() {
    this.canvas.addEventListener('mousemove', (event) => {
        this.mouseMove(event)
    })

    this.canvas.addEventListener('dblclick',(event) => {
        
        if(this.switchEarth == true){
            this.switchEarth = false;
        }else{
            this.switchEarth = true;
        }

    });

    const btn = document.querySelector("#btn");
    btn.addEventListener("click", (event) => {

        const accessKey = event.target.accessKey;

        if (event.key === 'clickme' || accessKey === 'clickme') {
            if (this.switchEarth == true) {
                this.switchEarth = false;
            } else {
                this.switchEarth = true;
            }
        }
    })       
}

mouseMove(event) {

    this.pointer.x = (event.clientX / this.canvas.width) * 2 - 1;
    this.pointer.y = -(event.clientY / this.canvas.height) * 2 + 1;   
        
}


    renderSimTexture(dt){
       
        this.time = dt;

        if(this.initShader = false){
            this.initShader = true;
                      
            //POSITIONS
            this.simMaterial.uniforms.uRenderMode.value = 1;
            this.simMaterial.uniforms.uTexture.value = this.dataTextureGlobus.dataTexturePosition;
            this.renderer.setRenderTarget(this.renderTarget1);
            this.renderer.render(this.sceneFBO, this.cameraFBO);
            //VELOCITY
            this.simMaterial.uniforms.uRenderMode.value = 2;
            this.simMaterial.uniforms.uTexture.value = this.dataTextureGlobus.dataTexturePosition;
            this.renderer.setRenderTarget(this.renderTargetVelo1);
            this.renderer.render(this.sceneFBO, this.cameraFBO);
        }

        this.mousePointerUpdate();

        //VELOCITY
        this.simMaterial.uniforms.uRenderMode.value = 3;
        //this.simMaterial.uniforms.uDir.value = this.pointerDir;
        this.renderer.setRenderTarget(this.renderTargetVelo2);
        this.renderer.render(this.sceneFBO, this.cameraFBO);

        //swap render targets
        const tmpVelo = this.renderTargetVelo1;
        this.renderTargetVelo1 = this.renderTargetVelo2;
        this.renderTargetVelo2 = tmpVelo;


        //POSITIONS
        this.simMaterial.uniforms.uRenderMode.value = 0;

        if(this.switchEarth == true)
        {   
            this.simMaterial.uniforms.uOrigin1.value = this.dataTextureGlobus.dataTexturePosition;
            this.indexRaycaste = 0;   
            this.color.lerp(new THREE.Vector3(1,1,1), 0.01 )           
            this.uniforms.color.value = this.color;

        }else if(this.switchEarth == false){
            this.simMaterial.uniforms.uOrigin1.value = this.dataTextureText.dataTexturePosition;
            this.indexRaycaste = 1;
            this.color.lerp(new THREE.Vector3(1,0,0), 0.01 )    
            this.uniforms.color.value = this.color;
        }
        this.renderer.setRenderTarget(this.renderTarget);
        this.renderer.render(this.sceneFBO, this.cameraFBO);
        this.renderer.setRenderTarget(null);
        this.renderer.render(this.scene, this.camera);

        //swap render targets
        const tmp = this.renderTarget;
        this.renderTarget = this.renderTarget1;
        this.renderTarget1 = tmp;

        this.uniforms.dataTexturePosition.value = this.renderTarget.texture;
       
        this.simMaterial.uniforms.uVelocity.value = this.renderTargetVelo1.texture;
        this.simMaterial.uniforms.uTexture.value = this.renderTarget1.texture;
        this.simMaterial.uniforms.time.value = this.time;
        

    }
}