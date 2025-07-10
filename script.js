let camera, scene, renderer;
let controller;
let reticle;
let model = null;

window.onload = () => {
  init();
};

function init() {
  scene = new THREE.Scene();

  camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.01, 20);

  const light = new THREE.HemisphereLight(0xffffff, 0xbbbbff, 1);
  light.position.set(0.5, 1, 0.25);
  scene.add(light);

  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.xr.enabled = true;
  document.body.appendChild(renderer.domElement);

  document.body.appendChild(ARButton.createButton(renderer, { requiredFeatures: ['hit-test'] }));

  // Reticle
  const geometry = new THREE.RingGeometry(0.1, 0.15, 32).rotateX(-Math.PI / 2);
  const material = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
  reticle = new THREE.Mesh(geometry, material);
  reticle.matrixAutoUpdate = false;
  reticle.visible = false;
  scene.add(reticle);

  controller = renderer.xr.getController(0);
  controller.addEventListener('select', onSelect);
  scene.add(controller);

  // Load model
  const loader = new THREE.GLTFLoader();
  loader.load('model.glb', function (gltf) {
    model = gltf.scene;
    model.scale.set(0.2, 0.2, 0.2); // adjust as needed
  }, undefined, function (error) {
    console.error(error);
  });

  window.addEventListener('resize', onWindowResize, false);

  setupHitTest();
}

function setupHitTest() {
  renderer.xr.addEventListener('sessionstart', async () => {
    const session = renderer.xr.getSession();
    const viewerSpace = await session.requestReferenceSpace('viewer');
    const hitTestSource = await session.requestHitTestSource({ space: viewerSpace });

    renderer.setAnimationLoop((timestamp, frame) => {
      if (frame) {
        const referenceSpace = renderer.xr.getReferenceSpace();
        const hitTestResults = frame.getHitTestResults(hitTestSource);
        if (hitTestResults.length > 0) {
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
