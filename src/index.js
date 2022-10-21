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
import { PlaneGeometry } from 'three';
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

let wall1Geo = new THREE.PlaneGeometry(5, 5, 128, 128)
let wall2Geo = new THREE.PlaneGeometry(5, 5, 128, 128)
let wall3Geo = new THREE.PlaneGeometry(5, 5, 128, 128)
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

let geometry, material, points
let lineParticlesGeometry, lineParticlesMaterial, lineParticles
let planeMaterial = new THREE.ShaderMaterial()
let bufferGeo = new THREE.BufferGeometry()

const indices = [];

const vertices = [];
const normals = [];
const colors = [];

const size = 5;
const segments = 5;

const halfSize = size / 2;
const segmentSize = size / segments;

// generate vertices, normals and color data for a simple grid geometry

for (let i = 0; i <= segments; i++) {

  const y = (i * segmentSize) - halfSize;

  for (let j = 0; j <= segments; j++) {

    const x = (j * segmentSize) - halfSize;

    vertices.push(x, - y, 0);
    normals.push(0, 0, 1);

    const r = (x / size) + 0.5;
    const g = (y / size) + 0.5;

    colors.push(r, g, 1);

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

  }

}

bufferGeo.setIndex(indices);
bufferGeo.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
bufferGeo.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
bufferGeo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));




// play video with promise to wait for it to be ready


video.play();
video.loop = true;




window.addEventListener('mousemove', (e) => {
  mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
  // console.log(mouse.x, mouse.y);
})

async function loadModels() {

  /**
   * Robot
   */
  const model = await modelLoader('/assets/models/robot/Robot_Renaud.glb')
  robot = model.scene
  robot.scale.set(0.5, 0.5, 0.5)
  robot.rotation.y = 3 * Math.PI / 2
  robot.position.y = -1
  robot.traverse(function (el) {
    if (el.type == 'Mesh') {
      el.material.envMap = textureCube
      el.material.envMapIntensity = 1
    }
  })
  /**
   * Walls
   */

  wall1 = new THREE.Mesh(bufferGeo, new THREE.MeshPhongMaterial({
    side: THREE.DoubleSide,
    vertexColors: true
  }));
  wall1.colorsNeedUpdate = true;
  wall1.receiveShadow = true;

  wall2 = new THREE.Mesh(bufferGeo, new THREE.MeshPhongMaterial({
    side: THREE.DoubleSide,
    vertexColors: true
  }));
  wall2.colorsNeedUpdate = true;
  wall2.receiveShadow = true;
  wall3 = new THREE.Mesh(bufferGeo, new THREE.MeshPhongMaterial({
    side: THREE.DoubleSide,
    vertexColors: true
  }));
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
  color: 0x000000,
  size: parameters.size,
  sizeAttenuation: true,
  depthWrite: true,
  blending: THREE.AdditiveBlending
})


// const generateLineParticles= () => {
//   /**
//    * Geometry
//    */
//   lineParticlesGeometry = new THREE.BufferGeometry()
//   const positions = new Float32Array(parameters.count * 3)

//   for (let i = 0; i < parameters.count; i++) {
//     const i3 = i * 3

//     const x = Math.random() * r - r / 2
//     const y = Math.random() * r - r / 2
//     const z = Math.random() * r - r / 2
//     positions[i3] = x
//     positions[i3 + 1] = y
//     positions[i3 + 2] = z
//   }

//   lineParticlesGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
//   lineParticlesMaterial = new THREE.PointsMaterial({
//     color: 0xffffff,
//     size: parameters.size,
//     sizeAttenuation: true,
//     depthWrite: false,
//     blending: THREE.AdditiveBlending
//   })

//   /**
//     * Points
//     */
//   lineParticles = new THREE.Points(lineParticlesGeometry, lineParticlesMaterial)
//   scene.add(lineParticles)
//   // Destroy old galaxy
//   // if (points !== null) {
//   //   geometry.dispose()
//   //   material.dispose()
//   //   scene.remove(points)
//   // }
// }
// generateLineParticles()

for (let i = 0; i < numCubes; i++) {
  const geometry = new THREE.BoxGeometry(1, 1, 1);
  const material = new THREE.MeshStandardMaterial({ color: 0xff0000 });
 const cube = new THREE.Mesh(geometry, material);
  cubes.push(cube)
  radius = 2.5;
  // place cubes in a circle
  cube.position.x = Math.cos((i / numCubes) * Math.PI * 2) * radius;
  cube.position.y = Math.sin((i / numCubes) * Math.PI * 2) * radius;
  cube.position.z = -2;
cube.receiveShadow = true;
  scene.add(cube);
}

/**
 * Lights
 */
const light = new THREE.DirectionalLight(0xFFFFFF);
const ambientLight = new THREE.AmbientLight(0x404040);

const coneLight = new THREE.SpotLight(0xf0ff00, 1, 5, Math.PI * 0.3, 0.25, 1);
coneLight.rotateX(Math.PI * 0.5);
coneLight.penumbra = 1;
coneLight.position.set(0, -1, 0);
coneLight.power = 10;
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
  raycaster.setFromCamera(mouse, camera);
  const intersects = raycaster.intersectObjects(walls.children, true);
  let intersectFace = null;


  if (intersects.length) {
    if (currentIntersect) {

      const intersect = intersects[0]
      // console.log(intersect);
      pointB = intersect.point
      coneLight.target.position.set(pointB.x, pointB.y, pointB.z);
      coneLight.lookAt(pointB)
      plane.position.copy(pointB)
      intersectFace = intersect.face
      paramradius = intersect.distance;
      console.log(paramradius);
      // particles
      const positions = new Float32Array(parameters.count * 3)

      for (let i = 0; i < parameters.count; i++) {
        const i3 = i * 3

        const x = Math.random() * r - r / 2
        const y = Math.random() * r - r / 2
        const z = Math.random() * r - r / 2

        const radius = Math.random() * paramradius

        positions[i3] = 0
        positions[i3 + 1] = 0
        positions[i3 + 2] = -radius
      }

      geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))


      /**
        * Points
        */
      points = new THREE.Points(geometry, material)
      scene.add(points)



      robot.lookAt(intersects[0].point)
      robot.rotateY(Math.PI / 2)
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
        plane.position.x < 0 ? plane.position.x = pointB.x + planeHeight / 2 : plane.position.x = pointB.x - planeHeight / 2
        plane.position.z < 0 ? plane.position.z = pointB.z + planeWidth / 2 : plane.position.z = pointB.z - planeWidth / 2

      }
      if (currentIntersect.object.name == 'wall2') {
        plane.rotation.x = 0
        plane.rotation.y = Math.PI / 2
        plane.rotation.z = Math.PI
        plane.position.x = pointB.x + 0.001
        plane.position.y < 0 ? plane.position.y = pointB.y + planeHeight / 2 : plane.position.y = pointB.y - planeHeight / 2
        plane.position.z < 0 ? plane.position.z = pointB.z + planeWidth / 2 : plane.position.z = pointB.z - planeWidth / 2


      }
      if (currentIntersect.object.name == 'wall3') {
        plane.rotation.x = 0
        plane.rotation.y = 0
        plane.rotation.z = Math.PI
        plane.position.z = pointB.z + 0.001
        plane.position.y < 0 ? plane.position.y = pointB.y + planeHeight / 2 : plane.position.y = pointB.y - planeHeight / 2
        plane.position.x < 0 ? plane.position.x = pointB.x + planeWidth / 2 : plane.position.x = pointB.x - planeWidth / 2

      }

    }
    // intersects[0].object.material.color.set(0x00ff00);
    currentIntersect = intersects[0]
  }
  else {
    if (currentIntersect) {
      // currentIntersect.object.material.color.set(0xff0000);

      // console.log('mouse leave')
    }

    currentIntersect = null
  }

  plane.geometry.elementsNeedUpdate = true;


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
