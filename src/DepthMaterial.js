import {  MeshDepthMaterial } from "three";

export class DepthMaterial extends MeshDepthMaterial {
    constructor({ color, wireframe, uniforms, depthPacking }) {
        super({ color, wireframe, depthPacking });

        this.onBeforeCompile = (shader) => {

            shader.uniforms.uPositionData = uniforms.dataTexturePosition;  
            shader.uniforms.uUVData =  { value: uniforms.dataTextureUVs };  //this.shader.uniforms.source.value = this.front.texture;
            shader.uniforms.uDiffuse = { value:  uniforms.tDiffuse } ;   
            shader.uniforms.uBump =  { value:  uniforms.tBump } ;   
            shader.uniforms.uSpecular = { value:  uniforms.tSpecular }  
            // ---------------------------------------vertexShader
            shader.vertexShader = /*glsl*/ `

            uniform sampler2D uPositionData;
            uniform sampler2D uUVData;
            uniform sampler2D uDiffuse;
            uniform sampler2D uBump;
            uniform sampler2D uSpecular;
         
            attribute vec2 uvRef;

            varying vec4 vColor;

            // #ifdef USE_INSTANCING
            //     attribute vec3 instanceNormalEffect;
            //     attribute float instanceLayer;
                
            // #endif

            mat4 scale(float c)
            {
                return mat4(c, 0, 0, 0,
                            0, c, 0, 0,
                            0, 0, c, 0,
                            0, 0, 0, 1);
            }
            
            `  + shader.vertexShader;

            shader.vertexShader = shader.vertexShader.replace(
                "#include <project_vertex>",
            /*glsl*/ `     

            vec4 mvPosition = vec4( transformed, 1.0 );
        
            #ifdef USE_INSTANCING
                
                vec4 pos = texture2D(uPositionData, uvRef);                  
                vec4 colorUV = texture2D(uUVData, uvRef);
                vec4 colorD = texture2D(uDiffuse, colorUV.xy);
                vec4 colorB = texture2D(uBump, colorUV.xy);
                vec4 colorS = texture2D(uSpecular, colorUV.xy);
                
                float scaleInst = colorB.x * 2.0  * (1.0 - colorS.x) + 0.2;
                //float scaleInst = (1.0 - colorS.x) + 0.2;
                scaleInst += (pos.w);
            
                vec3 transformedPosition = transformed.xyz * scaleInst + pos.xyz;  
                mvPosition = instanceMatrix * vec4(transformedPosition, 1.0);

                vColor = vec4(colorD.xyz, 1.0);
                               
            #endif

            mvPosition = modelViewMatrix * mvPosition;
            gl_Position = projectionMatrix * mvPosition;
            `
            );



            // ---------------------------------------fragmentShader
            shader.fragmentShader = /*glsl*/  `
            
            ` + shader.fragmentShader;

        };
    }
}
