// IMPORTS

import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { Perlin } from 'three-noise';
import OrbitControls from 'threejs-orbit-controls';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { FilmPass } from 'three/examples/jsm/postprocessing/FilmPass.js';
import { SSAOPass } from 'three/examples/jsm/postprocessing/SSAOPass.js';
import { LuminanceFormat, PlaneGeometry } from 'three';
import * as dat from 'lil-gui'

import waterVertexShader from './shaders/vertex.glsl'
import waterFragmentShader from './shaders/fragment.glsl'

const gui = new dat.GUI()

// HELPERS

const loader = new GLTFLoader();
const modelLoader = (url) => {
  return new Promise((resolve, reject) => {
    loader.load(url, data => resolve(data), null, reject);
  });
}



// VARIABLES

let mixer, clock
clock = new THREE.Clock();

const perlin = new Perlin(Math.random())
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.z = 10;
//camera.position.y = 3
//camera.position.x = 3

const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enabled = true;
controls.enableZoom = true;
controls.enablePan = false;
controls.rotateSpeed = 0.5;
controls.maxDistance = 1500;
controls.minDistance = 0;

// MODELS

const loaderCube = new THREE.CubeTextureLoader();
loaderCube.setPath('assets/textures/cube/');
const textureCube = loaderCube.load([
  'px.png', 'nx.png',
  'py.png', 'ny.png',
  'pz.png', 'nz.png'
]);

const numCubes = 10;

let radius
const cubes = []
const r = 50;
let robot
const walls = new THREE.Group()
let wall1, wall2, wall3

// get mose position
const mouse = new THREE.Vector2();
let raycaster = new THREE.Raycaster();
let pointB = new THREE.Vector3(0, 0, -5);
let pointA = new THREE.Vector3(0, 0, 0);
let line = new THREE.Line()
let plane

// video
const video = document.getElementById('video');
const videoTexture = new THREE.VideoTexture(video);

videoTexture.flipY = false;

let geometry, material, pointsParticles


let lineParticlesGeometry, lineParticlesMaterial, lineParticles
let planeMaterial = new THREE.ShaderMaterial()
let bufferGeo = new THREE.BufferGeometry()
// let bufferGeo1 = new THREE.BufferGeometry()
// let bufferGeo2 = new THREE.BufferGeometry()

const indices = [];


const vertices = [];

const normals = [];

const colors = [];


const size = 5;
const segments = 128 / 2;

const halfSize = size / 2;
const segmentSize = size / segments;

// generate vertices, normals and color data for a simple grid geometry

for (let i = 0; i <= segments; i++) {

  const y = (i * segmentSize) - halfSize;

  for (let j = 0; j <= segments; j++) {

    const x = (j * segmentSize) - halfSize;

    vertices.push(x, - y, 0);
    // vertices1.push(x, - y, 0);
    // vertices2.push(x, - y, 0);
    normals.push(0, 0, 1);
    // normals1.push(0, 0, 1);
    // normals2.push(0, 0, 1);


    const r = 1;
    const g = 2;
    const b = 50;



    colors.push(r, g, b);
    // colors1.push(r, g, b);
    // colors2.push(r, g, b);

  }

}




// generate indices (data for element array buffer)

for (let i = 0; i < segments; i++) {

  for (let j = 0; j < segments; j++) {

    const a = i * (segments + 1) + (j + 1);
    const b = i * (segments + 1) + j;
    const c = (i + 1) * (segments + 1) + j;
    const d = (i + 1) * (segments + 1) + (j + 1);


    // generate two faces (triangles) per iteration

    indices.push(a, b, d); // face one
    indices.push(b, c, d); // face two
    // indices1.push(a, b, d); // face one
    // indices1.push(b, c, d); // face two
    // indices2.push(a, b, d); // face one
    // indices2.push(b, c, d); // face two





  }

}
// bufferGeo.computeBoundingBox();
// bufferGeo1.computeBoundingBox();
// bufferGeo2.computeBoundingBox();

bufferGeo.setIndex(indices);
bufferGeo.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
bufferGeo.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
bufferGeo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));

// bufferGeo.computeVertexNormals();
bufferGeo.computeBoundingBox();




// play video with promise to wait for it to be ready


video.play();
video.loop = true;




window.addEventListener('mousemove', (e) => {
  mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
  // console.log(mouse.x, mouse.y);
})
let robotGeometry, robotMaterial, robotMesh

async function loadModels() {

  /**
   * Robot
   */
  const model = await modelLoader('/assets/models/robot/camera.glb')
  robot = model.scene

  robot.scale.set(3, 3, 3)
  // robot.rotation.y =  3 * Math.PI / 2
  robot.position.y = -1.2
  robot.traverse(function (el) {
    if (el.type == 'Mesh') {
      el.material.envMap = textureCube
      el.material.envMapIntensity = 1
      robotMesh = el
    }
  })
  /**
   * Walls
   */
  const material1 = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    side: THREE.DoubleSide,
    vertexColors: THREE.VertexColors
  })
  const material2 = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    side: THREE.DoubleSide,
    vertexColors: THREE.VertexColors
  })
  const material3 = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    side: THREE.DoubleSide,
    vertexColors: THREE.VertexColors
  })
  wall1 = new THREE.Mesh(bufferGeo, material1);
  wall1.colorsNeedUpdate = true;
  wall1.receiveShadow = true;

  wall2 = new THREE.Mesh(bufferGeo, material2);
  wall2.colorsNeedUpdate = true;
  wall2.receiveShadow = true;
  wall3 = new THREE.Mesh(bufferGeo, material3);
  wall3.colorsNeedUpdate = true;
  wall3.receiveShadow = true;
  wall1.name = 'wall1'
  wall2.name = 'wall2'
  wall3.name = 'wall3'

  wall2.rotation.y = Math.PI / 2
  wall2.position.x = -2.5
  wall3.position.z = -2.5
  wall1.rotation.x = Math.PI / 2
  wall1.position.y = -2.5
  walls.add(wall1, wall2, wall3)

  scene.add(robot, walls)
  // faces color
  // const colorsAttribute = bufferGeo.geometry.attributes.color;

  // console.log(bufferGeo);
  /**
   * Raycaster Visual Line
   */
  const rayOrigin = robot.position.clone();
  const rayDirection = new THREE.Vector3(0, 0, -5);

  raycaster.set(rayOrigin, rayDirection);

  pointA = rayOrigin.clone();


  const points = new THREE.BufferGeometry().setFromPoints([pointA, pointB]);
  line = new THREE.Line(points, new THREE.LineBasicMaterial({
    color: 0xff0000
  }));
  scene.add(line);

  // create particle to fit on the line
  // camera footer
  //crete 3 cylinder
  const geometry = new THREE.CylinderGeometry(0.1, 0.1, 1.39, 32);
  const material = new THREE.MeshBasicMaterial({ color: 0x000000 });
  const count = 3;
  const radius = 0.1;
  const cylinders = new THREE.Group();
  for (let i = 0; i < count; i++) {
    const cylinder = new THREE.Mesh(geometry, material);
    cylinders.add(cylinder);
    // set 3 cylinder position like cone
    cylinder.position.x = radius * Math.cos(i * 2 * Math.PI / count);
    cylinder.position.z = radius * Math.sin(i * 2 * Math.PI / count);
    cylinder.rotation.x = radius * Math.sin(i * 2 * (4 * Math.PI / 2) / count);
    cylinder.rotation.z = radius * Math.cos(i * 2 * (4 * Math.PI / 2) / count);
    // cylinder.position.z = -0.7;
    cylinder.position.y = -1.8;

    cylinder.scale.set(0.2, 1, 0.2);

    scene.add(cylinders);
  }


  /**
   * Screen for video
   */


  /**
 * Particles
 */



}

const PlaneGeo = new THREE.PlaneGeometry(2, 1.5, 128, 128);


planeMaterial = new THREE.ShaderMaterial({
  side: THREE.DoubleSide,
  vertexShader: waterVertexShader,
  fragmentShader: waterFragmentShader,
  uniforms:
  {
    video: { value: videoTexture },
    uTime: { value: 0 },
    uBigWavesElevation: { value: 0.1 },
    uBigWavesFrequency: { value: new THREE.Vector2(4, 1.5) },

  },
  transparent: true,
  // depthTest: false,
});
plane = new THREE.Mesh(PlaneGeo, planeMaterial);
plane.receiveShadow = true;
scene.add(plane);

let parameters = {
  count: null,
  size: 0.02,
};

parameters.count = 2000;
parameters.size = 0.03;

let paramradius = 0;


/**
 * Geometry and materials for particles
 */
geometry = new THREE.BufferGeometry()
material = new THREE.PointsMaterial({
  color: 0xffffff,
  size: parameters.size,
  sizeAttenuation: true,
  depthWrite: true,
  blending: THREE.AdditiveBlending
})

function particles() {
  // particles

}

// console.log(bufferGeo);

function raycast() {
  raycaster.setFromCamera(mouse, camera);
  const intersects = raycaster.intersectObjects(walls.children, true);
  const intersect = intersects[0]

  let intersectFace = null;





  if (intersects.length) {
    if (currentIntersect) {
      intersectFace = intersect.face

      bufferGeo.attributes.color.needsUpdate = true;

      pointB = intersect.point
      coneLight.target.position.set(pointB.x, pointB.y, pointB.z);
      coneLight.lookAt(pointB)
      plane.position.copy(pointB)
      paramradius = intersect.distance;
      // console.log(intersectFace);


      setTimeout(() => {

        bufferGeo.attributes.color.array[intersectFace.a * 3 + 0] = 1;
        bufferGeo.attributes.color.array[intersectFace.b * 3 + 1] = 2;
        bufferGeo.attributes.color.array[intersectFace.c * 3 + 2] = 50;

      }, 500);

      if (!currentIntersect) {


      }

      /**
       * Particles
       */
      const positions = new Float32Array(parameters.count * 3)

      for (let i = 0; i < parameters.count; i++) {
        const i3 = i * 3

        const x = Math.random() * r - r / 2
        const y = Math.random() * r - r / 2
        const z = Math.random() * r - r / 2

        // set radius to distance between pointA and pointB
        const radius = line.position

        positions[i3] = 0
        positions[i3 + 1] = 0
        positions[i3 + 2] = -radius

      }

      geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))


      /**
        * Points
        */
      pointsParticles = new THREE.Points(geometry, material)
      scene.add(pointsParticles)
      pointsParticles.rotation.copy(line.rotation)


      bufferGeo.attributes.color.array[intersectFace.a * 3 + 0] = Math.random();
      bufferGeo.attributes.color.array[intersectFace.b * 3 + 1] = Math.random();
      bufferGeo.attributes.color.array[intersectFace.c * 3 + 2] = Math.random();

      //reset  face color after 2 seconds




      robot.lookAt(intersects[0].point)
      robot.rotateY(- 2 * Math.PI / 2)
      line.geometry.attributes.position.setXYZ(1, pointB.x, pointB.y, pointB.z)
      line.geometry.attributes.position.needsUpdate = true

      const planeHeight = plane.geometry.parameters.height;
      const planeWidth = plane.geometry.parameters.width;
      //rotate plane depending on wall
      if (currentIntersect.object.name == 'wall1') {
        plane.rotation.x = Math.PI / 2
        plane.rotation.y = 0
        plane.rotation.z = 0
        //add offset to plane to stay on wall
        plane.position.y = pointB.y + 0.1
        // plane.position.x < 0 ? plane.position.x = pointB.x + planeHeight / 2 : plane.position.x = pointB.x - planeHeight / 2
        // plane.position.z < 0 ? plane.position.z = pointB.z + planeWidth / 2 : plane.position.z = pointB.z - planeWidth / 2
        //changer bufferGeo color 


      }
      if (currentIntersect.object.name == 'wall2') {
        plane.rotation.x = 0
        plane.rotation.y = Math.PI / 2
        plane.rotation.z = Math.PI
        plane.position.x = pointB.x + 0.001
        // plane.position.y < 0 ? plane.position.y = pointB.y + planeHeight / 2 : plane.position.y = pointB.y - planeHeight / 2
        // plane.position.z < 0 ? plane.position.z = pointB.z + planeWidth / 2 : plane.position.z = pointB.z - planeWidth / 2


      }
      if (currentIntersect.object.name == 'wall3') {
        plane.rotation.x = 0
        plane.rotation.y = 0
        plane.rotation.z = Math.PI
        plane.position.z = pointB.z + 0.001
        // plane.position.y < 0 ? plane.position.y = pointB.y + planeHeight / 2 : plane.position.y = pointB.y - planeHeight / 2
        // plane.position.x < 0 ? plane.position.x = pointB.x + planeWidth / 2 : plane.position.x = pointB.x - planeWidth / 2

      }

    }
    // intersects[0].object.material.color.set(0x00ff00);
    currentIntersect = intersects[0]
  }
  else {
    if (currentIntersect) {
      // currentIntersect.object.material.color.set(0xff0000);



      console.log('mouse leave')
    }

    currentIntersect = null
  }

  plane.geometry.elementsNeedUpdate = true;

}

/**
 * Lights
 */
const light = new THREE.DirectionalLight(0xFFFFFF);
const ambientLight = new THREE.AmbientLight(0x404040);
ambientLight.intensity = 0.5;

const coneLight = new THREE.SpotLight(0xff00ff, 1, 5, Math.PI * 0.2, 0.25, 1);
coneLight.rotateX(Math.PI * 0.5);
coneLight.penumbra = 1;
coneLight.position.set(0, -1, 0);
coneLight.power = 5;
coneLight.castShadow = true;
coneLight.shadow.mapSize.width = 1024;
coneLight.shadow.mapSize.height = 1024;
coneLight.shadow.camera.fov = 30;
coneLight.shadow.camera.near = 0.5;
coneLight.shadow.camera.far = 3;


const coneLightHelper = new THREE.SpotLightHelper(coneLight);

scene.add(coneLight, coneLight.target);
scene.add(ambientLight);
const spotLightCameraHelper = new THREE.CameraHelper(coneLight.shadow.camera)

// scene.add(spotLightCameraHelper)

// POST EFFECTS IF NEEDED

const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));

const bloomEffect = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 0.1, 0, 0.8)
const ssaoPass = new SSAOPass(scene, camera, window.innerWidth, window.innerHeight);
const filmEffect = new FilmPass(.5, .5, 1, 0)


let time = 0
let currentIntersect = null

function animate(dt) {
  composer.render();

  controls.update();
  const delta = clock.getDelta();

  raycast()
  particles()
  renderer.antialias = true;
  renderer.setClearColor(0xffffff, 0);
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1;
  renderer.outputEncoding = THREE.sRGBEncoding;
  time += 0.01
  planeMaterial.uniforms.uTime.value = time;

  // update water shader
  // planeMaterial.uniforms.uTime.value = time;
  /**
     * Raycaster and intersections
     */


  if (mixer) mixer.update(delta);


  spotLightCameraHelper.update();
  requestAnimationFrame(animate);
}
animate();

const init = () => {
  loadModels().catch(error => {
    console.log(error)
  })
}
init()

  // /**
  //  * Cubes animation
  //  */

  // cubes.forEach((cube, i) => {
  //   const angle = (i / numCubes * Math.PI * 2);
  //   cube.rotation.x = time;
  //   cube.rotation.y = time;
  //   cube.rotation.z = time;
  //   cube.position.x = Math.sin(angle + time) * radius;
  //   cube.position.y = Math.cos(angle + time) * radius;


  // })
  // create 10 cubes



  // cubes[2].add(robot)
