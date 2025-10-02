import * as THREE from 'three';

export class ObjectUtils {
    
    static readonly _model_lightSourceName = "LightSource";
    static readonly _model_lightDestName = "LightSource";
    static readonly _model_clickableDiamondName = "Diamond_100";
    static readonly _model_staticObstacleName = "Pillar_001";

    static readonly _model_lightSourceMatrix = new THREE.Matrix4()
        .compose(new THREE.Vector3(0,0,0),   // position
                    new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,1,0), Math.PI), // rotation
                    new THREE.Vector3(0.5, 0.5, 0.5));   // scale

    static readonly _model_lightDestMatrix = new THREE.Matrix4()
        .compose(new THREE.Vector3(),   // position
                    new THREE.Quaternion(), // rotation
                    new THREE.Vector3(0.5, 0.5, 0.5));   // scale

    static readonly _model_clickableDiamondMatrix = new THREE.Matrix4()
        .compose(new THREE.Vector3(),   // position
                    new THREE.Quaternion(), // rotation
                    new THREE.Vector3(0.25, 0.25, 0.25));   // scale

    static readonly _model_obstacleMatrix = new THREE.Matrix4()
        .compose(new THREE.Vector3(-24,0,0),   // position
                    new THREE.Quaternion(),//.setFromAxisAngle(new THREE.Vector3(0,0,1), Math.PI/2), // rotation
                    new THREE.Vector3(1,1,1));   // scale
                    
    static _model_clickableDiamondRotation(obj: THREE.Object3D, orientation: number) {
        let q1 = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1,0,0), - Math.PI/2);
        let q2 = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,0,1), - (orientation-1)*Math.PI/2);
        obj.quaternion.copy(q2).premultiply(q1);
    }
}