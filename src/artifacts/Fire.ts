import * as THREE from 'three';

import fire_vs from '../shaders/fire_vs.glsl?raw';
import fire_ps from '../shaders/fire_ps.glsl?raw';

import fire_atlas from '../texture/fire_atlas.png';

interface IFireParticleDef {
    /**
     * X,Y,Z position of the point
     */
    position: THREE.Vector3;

    /**
     * Life of the point, range from 0 - 1
     */
    pointLife: number;

    /**
     * Size of the point, range 0 - 1
     */
    pointSize: number;

    /**
     * Texture offset
     */
    textureOffset: THREE.Vector2;

    /**
     * Texture repeat
     */
    textureRepeat: THREE.Vector2;
}

export class Fire {

    _material: THREE.Material;
    _bufferGeometry: THREE.BufferGeometry;
    _points: THREE.Points;
    _particles: IFireParticleDef[];
    _fireLight: THREE.PointLight;

    _fireGroupObj: THREE.Group;

    constructor() {
        const fireImg = new THREE.TextureLoader().load(fire_atlas);
        this._material = new THREE.ShaderMaterial(
            {
                uniforms: {
                    diffuseTexture: {
                        value: fireImg
                    },
                    pointMultiplier: {
                        value: 400.0
                    }
                },
                vertexShader: fire_vs,
                fragmentShader: fire_ps,
                blending: THREE.AdditiveBlending,
                depthTest: true,
                depthWrite: false,
                transparent: true
            }
        );

        this._bufferGeometry = new THREE.BufferGeometry();
        this._bufferGeometry.setAttribute('position', new THREE.Float32BufferAttribute([], 3));
        this._bufferGeometry.setAttribute('pointLife', new THREE.Float32BufferAttribute([], 1));
        this._bufferGeometry.setAttribute('pointSize', new THREE.Float32BufferAttribute([], 1));
        this._bufferGeometry.setAttribute('textureOffset', new THREE.Float32BufferAttribute([], 2));
        this._bufferGeometry.setAttribute('textureRepeat', new THREE.Float32BufferAttribute([], 2));

        this._points = new THREE.Points(this._bufferGeometry, this._material);

        this._particles = [];
        let numParticles = 64;

        for (let i = 0; i < numParticles; ++i) {
            this._particles.push(
                {
                    position: new THREE.Vector3(
                        (Math.random() * 2 - 1) * 0.25,
                        1.0 * i / numParticles,
                        (Math.random() * 2 - 1) * 0.25),
                    pointLife: Math.random(),
                    pointSize: Math.random(),
                    textureOffset: new THREE.Vector2(),
                    textureRepeat: new THREE.Vector2()
                }
            );
        }
        this.__updateGeometry(0);

        this._fireGroupObj = new THREE.Group();
        this._fireGroupObj.add(this._points);

        this._fireLight = new THREE.PointLight(0xffaa00, 0.75, 10, 0.5);
        this._fireLight.position.set(0, 0.25, 0);
        this._fireGroupObj.add(this._fireLight);
        this._fireGroupObj.name = "FIRE";
    }

    get RenderArtifact() {
        return this._fireGroupObj;
    };

    updateState(elapsedTime: number) {
        this.__updateGeometry(elapsedTime);
    }

    __updateGeometry(elapsedTime: number) {
        let positions: number[] = [];
        let life: number[] = [];
        let textureOffset: number[] = [];
        let textureRepeat: number[] = [];
        let pointSize: number[] = [];

        this.__ensureVariation();

        this._particles.forEach(p => {
            let newLife = p.pointLife + elapsedTime * 0.5;

            if (newLife >= 1.0) newLife = 0;

            p.pointLife = newLife;

            positions.push(p.position.x, p.pointLife * 0.5, p.position.z);
            life.push(p.pointLife);
            pointSize.push(p.pointSize);
            textureRepeat.push(1 / 8.0, 1 / 8.0);

            let tx = (Math.floor(p.pointLife * 8.0 * 8.0) % 8) / 8.0;
            let ty = 1 - Math.floor(Math.floor(p.pointLife * 8.0 * 8.0) / 8.0) / 8.0;
            textureOffset.push(tx, ty);
        });

        this._bufferGeometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
        this._bufferGeometry.setAttribute('pointLife', new THREE.Float32BufferAttribute(life, 1));
        this._bufferGeometry.setAttribute('textureOffset', new THREE.Float32BufferAttribute(textureOffset, 2));
        this._bufferGeometry.setAttribute('textureRepeat', new THREE.Float32BufferAttribute(textureRepeat, 2));
        this._bufferGeometry.setAttribute('pointSize', new THREE.Float32BufferAttribute(pointSize, 1));

        this._bufferGeometry.attributes.position.needsUpdate = true;
        this._bufferGeometry.attributes.pointLife.needsUpdate = true;
        this._bufferGeometry.attributes.textureOffset.needsUpdate = true;
        this._bufferGeometry.attributes.textureRepeat.needsUpdate = true;
        this._bufferGeometry.attributes.pointSize.needsUpdate = true;
    }

    __ensureVariation() {

        let x = Math.random()*100;

        if(x > 5) return; // only compute in 5% of rendered frames

        let sm = 0;
        this._particles.forEach(pt => { sm += pt.pointLife; });
        let mean = sm / this._particles.length;
        
        let sqDiff = 0;
        this._particles.forEach(pt => { sqDiff += Math.pow(pt.pointLife - mean, 2); });

        let stdDev = Math.sqrt(sqDiff / this._particles.length);
        
        if(stdDev < 0.1) {
            // too less variation, so delibrately randomize
            
            for (let i = 0; i < this._particles.length; ++i) {
                this._particles[i].position.y = 1.0 * i / this._particles.length;
                this._particles[i].pointLife = Math.random();
            }
        }
    }
}