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
camera.position.z = 8
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
let cube
let radius
const cubes = []
let robot
const walls = new THREE.Group()
let wall1, wall2, wall3
// get mose position
const mouse = new THREE.Vector2();
let raycaster = new THREE.Raycaster();
let pointB = new THREE.Vector3(0, 0, -5);
let line = new THREE.Line()
window.addEventListener('mousemove', (e) => {
  mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
  // console.log(mouse.x, mouse.y);
})

async function loadModels() {
  const ipod = await modelLoader('/assets/models/ipod/iPod.gltf')
  ipod.scene.scale.set(0.015, 0.015, 0.015)
  ipod.scene.position.set(-2, 1.1, 1)
  ipod.scene.rotation.y = Math.PI

  ipod.scene.traverse(function (el) {
    if (el.type == 'Mesh') {
      el.material.envMap = textureCube
      el.material.envMapIntensity = 1
    }
  })

  //////////////////

  const platform = await modelLoader('/assets/models/platform/scene.gltf')
  platform.scene.scale.set(0.2, 0.2, 0.2)
  mixer = new THREE.AnimationMixer(platform.scene);
  platform.animations.forEach((clip) => {
    mixer.clipAction(clip).play();
  });

  platform.scene.traverse(function (el) {
    if (el.type == 'Mesh') {
      el.material.envMap = textureCube
      el.material.envMapIntensity = 2
    }
  })

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

  // create 10 cubes

  // for (let i = 0; i < numCubes; i++) {
  //   const geometry = new THREE.BoxGeometry(1, 1, 1);
  //   const material = new THREE.MeshBasicMaterial({ color: 0xff0000 });
  //   cube = new THREE.Mesh(geometry, material);
  //   cubes.push(cube)
  //   radius = 2.5;
  //   // place cubes in a circle
  //   cube.position.x = Math.cos((i / numCubes) * Math.PI * 2) * radius;
  //   cube.position.y = Math.sin((i / numCubes) * Math.PI * 2) * radius;

  //   scene.add(cube);
  // }
  // cubes[2].add(robot)
  wall1 = new THREE.Mesh(new THREE.PlaneGeometry(3, 3, 3), new THREE.MeshNormalMaterial({side: THREE.DoubleSide}));

  wall2 = new THREE.Mesh(new THREE.PlaneGeometry(3, 3, 3), new THREE.MeshNormalMaterial({side: THREE.DoubleSide}));
  wall3 = new THREE.Mesh(new THREE.PlaneGeometry(3, 3, 3), new THREE.MeshNormalMaterial({side: THREE.DoubleSide}));
  // wall1.name = 'wall1'
  // wall2.name = 'wall2'
  // wall3.name = 'wall3'

  wall2.rotation.y = Math.PI / 2
  wall2.position.x = -1.5
  wall3.position.z = -1.5
  wall1.rotation.x = Math.PI / 2
  wall1.position.y = -1.5
  walls.add(wall1, wall2, wall3)


  scene.add(robot, walls)


  const rayOrigin = robot.position.clone();
  const rayDirection = new THREE.Vector3(0, 0, -5);
  raycaster.set(rayOrigin, rayDirection);

  const pointA = rayOrigin.clone();

  const points = new THREE.BufferGeometry().setFromPoints([pointA, pointB]);
  line = new THREE.Line(points, new THREE.LineBasicMaterial({ color: 0xff0000 }));
  scene.add(line);

}




const light = new THREE.DirectionalLight(0xFFFFFF);
const ambientLight = new THREE.AmbientLight(0x404040);

scene.add(light);
scene.add(ambientLight);

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


  renderer.antialias = true;
  renderer.setClearColor(0xffffff, 0);
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1;
  renderer.outputEncoding = THREE.sRGBEncoding;
  time += 0.01

  raycaster.setFromCamera(mouse, camera);
  const intersects = raycaster.intersectObjects(walls.children, true);

  if (intersects.length) {
    if (currentIntersect) {
      // currentIntersect.object.material.color.set(0xff0000);
      console.log('mouse enter')
      pointB.copy(intersects[0].point)
      robot.lookAt(intersects[0].point)
      robot.rotateY(Math.PI / 2)
      line.geometry.attributes.position.setXYZ(1, pointB.x, pointB.y, pointB.z)
      line.geometry.attributes.position.needsUpdate = true

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



  const delta = clock.getDelta();
  if (mixer) mixer.update(delta);

  cubes.forEach((cube, i) => {
    const angle = (i / numCubes * Math.PI * 2);
    cube.rotation.x = time;
    cube.rotation.y = time;
    cube.rotation.z = time;
    cube.position.x = Math.sin(angle + time) * radius;
    cube.position.y = Math.cos(angle + time) * radius;


  })
  if (robot) {

  }
  requestAnimationFrame(animate);
}
animate();

const init = () => {
  loadModels().catch(error => {
    console.log(error)
  })
}
init()
