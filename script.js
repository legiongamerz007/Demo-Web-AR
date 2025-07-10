let camera, scene, renderer;
let controller;
let reticle;    // used to show detected surface
let model = null;

init();
animate();

function init() {
  // Setup scene
  scene = new THREE.Scene();

  // Camera
  camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.01, 20);

  // Light
  const light = new THREE.HemisphereLight(0xffffff, 0xbbbbff, 1);
  light.position.set(0.5, 1, 0.25);
  scene.add(light);

  // Renderer
  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.xr.enabled = true;
  document.body.appendChild(renderer.domElement);

  // AR button
  document.body.appendChild(ARButton.createButton(renderer, { requiredFeatures: ['hit-test'] }));

  // Reticle (a ring showing where to place model)
  const geometry = new THREE.RingGeometry(0.1, 0.15, 32).rotateX(-Math.PI / 2);
  const material = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
  reticle = new THREE.Mesh(geometry, material);
  reticle.matrixAutoUpdate = false;
  reticle.visible = false;
  scene.add(reticle);

  // Controller
  controller = renderer.xr.getController(0);
  controller.addEventListener('select', onSelect);
  scene.add(controller);

  // Load GLB model
  const loader = new THREE.GLTFLoader();
  loader.load('model.glb', function (gltf) {
    model = gltf.scene;
    model.scale.set(0.2, 0.2, 0.2); // adjust size if needed
  }, undefined, function (error) {
    console.error(error);
  });

  // Handle resizing
  window.addEventListener('resize', onWindowResize, false);

  // Setup hit test source
  renderer.xr.addEventListener('sessionstart', setupHitTest);
}

function setupHitTest() {
  const session = renderer.xr.getSession();
  session.requestReferenceSpace('viewer').then((referenceSpace) => {
    session.requestHitTestSource({ space: referenceSpace }).then((source) => {
      renderer.xr.setAnimationLoop((timestamp, frame) => {
        if (frame) {
          const referenceSpace = renderer.xr.getReferenceSpace();
          const hitTestResults = frame.getHitTestResults(source);
          if (hitTestResults.length) {
            const hit = hitTestResults[0];
            const pose = hit.getPose(referenceSpace);
            reticle.visible = true;
            reticle.matrix.fromArray(pose.transform.matrix);
          } else {
            reticle.visible = false;
          }
        }
        renderer.render(scene, camera);
      });
    });
  });
}

function onSelect() {
  if (reticle.visible && model) {
    const clone = model.clone();
    clone.position.setFromMatrixPosition(reticle.matrix);
    clone.quaternion.setFromRotationMatrix(reticle.matrix);
    scene.add(clone);
  }
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

function animate() {
  renderer.setAnimationLoop(() => {
    renderer.render(scene, camera);
  });
}
