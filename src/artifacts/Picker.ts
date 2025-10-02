import * as THREE from 'three';
import pick_vs from '../shaders/pick_vs.glsl?raw';
import pick_ps from '../shaders/pick_ps.glsl?raw';

/**
 * Used from https://stemkoski.github.io/Three.js/Shader-Glow.html
 * Thanks dude
 */

export class Picker {
    
    _baseObject: THREE.Object3D;
    _material: THREE.ShaderMaterial;
    _camera: THREE.Camera;

    constructor(camera: THREE.Camera) {

        this._camera = camera;

        this._material = new THREE.ShaderMaterial(
            {
                uniforms: 
                { 
                    "c":   { value: 1.0 },
                    "p":   { value: 1.4 },
                    glowColor: { value: new THREE.Color(0xffff00) },
                    viewVector: { value: this._camera.position }
                },
                vertexShader:   pick_vs,
                fragmentShader: pick_ps,
                side: THREE.FrontSide,
                blending: THREE.AdditiveBlending,
                transparent: false
            });
        
        this._baseObject = new THREE.Mesh(new THREE.SphereGeometry(0.5,16,16), this._material);
        this._baseObject.position.set(0,1,0);
        this.setInvisible();
    }

    setInvisible() {
        this._baseObject.visible = false;
    }

    setVisible(x: number, y: number, z:number) {
        this._baseObject.position.set(x,y,z);
        this._baseObject.visible = true;
    }

    updateOnRender() {
        this._material.uniforms.viewVector.value.set(
            new THREE.Vector3().subVectors(this._camera.position, this._baseObject.position)
        ); 
    }
}