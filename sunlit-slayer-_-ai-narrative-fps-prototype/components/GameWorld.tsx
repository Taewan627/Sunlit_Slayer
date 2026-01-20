
import React, { useEffect, useRef, useCallback } from 'react';
import * as THREE from 'three';
import { GameStatus, EnemyRadarPos } from '../types';

interface GameWorldProps {
  status: GameStatus;
  wave: number;
  totalZombies: number;
  ammo: number;
  isReloading: boolean;
  onKill: () => void;
  onHit: (damage: number) => void;
  onShoot: () => void;
  onReload: () => void;
  onUpdateRadar: (enemies: EnemyRadarPos[]) => void;
  requestLock: () => void;
  lastHitTime: number;
}

type Particle = THREE.Mesh & {
  velocity: THREE.Vector3;
  life: number;
};

const SETTINGS = {
  SENSITIVITY: 0.0012,
  ROTATION_SPEED: 25.0,   // 보간 속도를 높여 잔상(인풋랙) 체감 감소
  WALK_SPEED: 185.0,
  FRICTION: 12.0,
  JUMP_FORCE: 8.5,
  GRAVITY: 26.0,
  PLAYER_HEIGHT: 1.65,
  ZOMBIE_SPAWN_RADIUS: 40,
  RADAR_RANGE: 65,
  GUN_OFFSET: new THREE.Vector3(0.32, -0.38, -0.4),
  ADS_GUN_OFFSET: new THREE.Vector3(0, -0.22, -0.3),
  BASE_FOV: 75,
  ADS_FOV: 42,
  LOOK_UP_LIMIT: -Math.PI / 3.5, // 약 -50도
  LOOK_DOWN_LIMIT: Math.PI / 12, // 약 15도 (땅바닥 거의 못 보게 고정)
};

const GameWorld: React.FC<GameWorldProps> = ({ 
  status, wave, totalZombies, ammo, isReloading, 
  onKill, onHit, onShoot, onReload, onUpdateRadar, requestLock, lastHitTime 
}) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const core = useRef<{
    scene: THREE.Scene;
    camera: THREE.PerspectiveCamera;
    renderer: THREE.WebGLRenderer;
    clock: THREE.Clock;
    gun: THREE.Group;
    muzzleFlash: THREE.PointLight;
    muzzleFlashMesh: THREE.Mesh;
    zombies: THREE.Group[];
    particles: Particle[];
  } | null>(null);

  const gameRef = useRef({ status, ammo, isReloading, wave, totalZombies });
  useEffect(() => {
    gameRef.current = { status, ammo, isReloading, wave, totalZombies };
  }, [status, ammo, isReloading, wave, totalZombies]);

  const cbRef = useRef({ onKill, onHit, onShoot, onReload, onUpdateRadar, requestLock });
  useEffect(() => {
    cbRef.current = { onKill, onHit, onShoot, onReload, onUpdateRadar, requestLock };
  }, [onKill, onHit, onShoot, onReload, onUpdateRadar, requestLock]);

  const moveState = useRef({ forward: false, backward: false, left: false, right: false, aiming: false });
  const physics = useRef({ velocity: new THREE.Vector3(), isJumping: false });
  const anim = useRef({ recoil: 0, draw: 0, reload: 0, ads: 0 });
  const canShootRef = useRef(true);
  
  // 오일러 각도 추적 (직관적 제어를 위함)
  const currentPitch = useRef(0);
  const currentYaw = useRef(0);

  const createImpactEffect = (position: THREE.Vector3) => {
    if (!core.current) return;
    const { scene, particles } = core.current;

    const hitFlash = new THREE.PointLight(0xff3300, 35, 7);
    hitFlash.position.copy(position);
    scene.add(hitFlash);
    setTimeout(() => scene.remove(hitFlash), 50);

    const particleCount = 8;
    const geo = new THREE.BoxGeometry(0.1, 0.1, 0.1);
    const mat = new THREE.MeshStandardMaterial({ color: 0xcc0000, emissive: 0x660000 });

    for (let i = 0; i < particleCount; i++) {
      const p = new THREE.Mesh(geo, mat) as unknown as Particle;
      p.position.copy(position);
      p.velocity = new THREE.Vector3(
        (Math.random() - 0.5) * 0.3,
        (Math.random() * 0.25) + 0.1,
        (Math.random() - 0.5) * 0.3
      );
      p.life = 1.0;
      scene.add(p);
      particles.push(p);
    }
  };

  const shoot = useCallback(() => {
    const { status, ammo, isReloading } = gameRef.current;
    if (!canShootRef.current || status !== GameStatus.PLAYING || !core.current || ammo <= 0 || isReloading) {
      if (status === GameStatus.PLAYING && ammo === 0 && !isReloading) cbRef.current.onReload();
      return;
    }

    cbRef.current.onShoot();
    canShootRef.current = false;
    anim.current.recoil = moveState.current.aiming ? 0.12 : 0.28;

    const { camera, muzzleFlash, muzzleFlashMesh, zombies, scene } = core.current;
    muzzleFlash.intensity = 50;
    muzzleFlashMesh.visible = true;
    muzzleFlashMesh.scale.set(1.4, 1.4, 1.4);

    setTimeout(() => {
      if (core.current) {
        core.current.muzzleFlash.intensity = 0;
        core.current.muzzleFlashMesh.visible = false;
      }
    }, 45);

    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(new THREE.Vector2(0, 0), camera);
    const intersects = raycaster.intersectObjects(zombies, true);

    if (intersects.length > 0) {
      let hitObj = intersects[0].object;
      while (hitObj.parent && !zombies.includes(hitObj as any)) hitObj = hitObj.parent;
      
      if (zombies.includes(hitObj as any)) {
        const index = zombies.indexOf(hitObj as any);
        if (index > -1) {
          createImpactEffect(intersects[0].point);
          scene.remove(hitObj);
          zombies.splice(index, 1);
          cbRef.current.onKill();
        }
      }
    }
    setTimeout(() => { canShootRef.current = true; }, 100);
  }, []);

  const shootRef = useRef(shoot);
  useEffect(() => { shootRef.current = shoot; }, [shoot]);

  useEffect(() => {
    if (!mountRef.current) return;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xb2d1ff);
    scene.fog = new THREE.Fog(0xb2d1ff, 20, 160);

    const camera = new THREE.PerspectiveCamera(SETTINGS.BASE_FOV, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.rotation.order = 'YXZ'; // FPS 표준
    camera.position.set(0, SETTINGS.PLAYER_HEIGHT, 0);

    const renderer = new THREE.WebGLRenderer({ 
      antialias: true, 
      powerPreference: "high-performance",
      precision: 'highp',
      stencil: false,
      depth: true
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.autoClear = true; // 잔상 방지 핵심
    mountRef.current.appendChild(renderer.domElement);

    scene.add(new THREE.AmbientLight(0xffffff, 0.6));
    const sun = new THREE.DirectionalLight(0xffffff, 1.3);
    sun.position.set(80, 150, 50);
    sun.castShadow = true;
    sun.shadow.mapSize.set(1024, 1024);
    sun.shadow.camera.left = -100; sun.shadow.camera.right = 100;
    sun.shadow.camera.top = 100; sun.shadow.camera.bottom = -100;
    scene.add(sun);

    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(2500, 2500),
      new THREE.MeshStandardMaterial({ color: 0x999999, roughness: 0.85 })
    );
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    scene.add(floor);
    scene.add(new THREE.GridHelper(2500, 250, 0x666666, 0xaaaaaa));

    const gun = new THREE.Group();
    gun.position.copy(SETTINGS.GUN_OFFSET);
    const body = new THREE.Mesh(
      new THREE.BoxGeometry(0.12, 0.16, 0.55),
      new THREE.MeshStandardMaterial({ color: 0x111111, metalness: 0.8, roughness: 0.2 })
    );
    gun.add(body);
    const barrel = new THREE.Mesh(
      new THREE.CylinderGeometry(0.045, 0.045, 0.45),
      new THREE.MeshStandardMaterial({ color: 0x000000, metalness: 1.0 })
    );
    barrel.rotation.x = Math.PI / 2;
    barrel.position.z = -0.45;
    gun.add(barrel);
    
    const muzzleFlash = new THREE.PointLight(0xffbb00, 0, 12);
    muzzleFlash.position.set(0, 0, -0.7);
    gun.add(muzzleFlash);
    const muzzleFlashMesh = new THREE.Mesh(
      new THREE.SphereGeometry(0.12, 12, 12),
      new THREE.MeshBasicMaterial({ color: 0xffdd00, transparent: true, opacity: 0.8 })
    );
    muzzleFlashMesh.position.set(0, 0, -0.7);
    muzzleFlashMesh.visible = false;
    gun.add(muzzleFlashMesh);

    camera.add(gun);
    scene.add(camera);

    core.current = { 
      scene, camera, renderer, clock: new THREE.Clock(), 
      gun, muzzleFlash, muzzleFlashMesh, zombies: [], particles: [] 
    };

    const onMouseMove = (e: MouseEvent) => {
      if (document.pointerLockElement) {
        // 급작스런 마우스 스파이크 필터링
        if (Math.abs(e.movementX) > 600 || Math.abs(e.movementY) > 600) return;

        // 타겟 각도 업데이트 (Wrap-around 버그 방지를 위해 누적값 사용)
        currentYaw.current -= e.movementX * SETTINGS.SENSITIVITY;
        currentPitch.current -= e.movementY * SETTINGS.SENSITIVITY;
        
        // 상하 각도 강력 제한
        currentPitch.current = THREE.MathUtils.clamp(
          currentPitch.current, 
          SETTINGS.LOOK_UP_LIMIT, 
          SETTINGS.LOOK_DOWN_LIMIT
        );
      }
    };

    const onKey = (e: KeyboardEvent, isDown: boolean) => {
      const code = e.code.toLowerCase();
      const key = e.key.toLowerCase();
      if (code === 'keyw' || key === 'w') moveState.current.forward = isDown;
      else if (code === 'keys' || key === 's') moveState.current.backward = isDown;
      else if (code === 'keya' || key === 'a') moveState.current.left = isDown;
      else if (code === 'keyd' || key === 'd') moveState.current.right = isDown;
      else if (code === 'space' || key === ' ') {
        if (isDown && !physics.current.isJumping) {
          physics.current.velocity.y = SETTINGS.JUMP_FORCE;
          physics.current.isJumping = true;
        }
      } else if (code === 'keyr' || key === 'r') {
        if (isDown) cbRef.current.onReload();
      }
    };

    const onMouseDown = (e: MouseEvent) => {
      if (gameRef.current.status !== GameStatus.PLAYING) return;
      if (!document.pointerLockElement) {
        cbRef.current.requestLock();
        return;
      }
      if (e.button === 0) shootRef.current();
      else if (e.button === 2) moveState.current.aiming = true;
    };

    const onMouseUp = (e: MouseEvent) => {
      if (e.button === 2) moveState.current.aiming = false;
    };

    const handleResize = () => {
      if (!core.current) return;
      core.current.camera.aspect = window.innerWidth / window.innerHeight;
      core.current.camera.updateProjectionMatrix();
      core.current.renderer.setSize(window.innerWidth, window.innerHeight);
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('keydown', (e) => onKey(e, true));
    window.addEventListener('keyup', (e) => onKey(e, false));
    window.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mouseup', onMouseUp);
    window.addEventListener('resize', handleResize);
    window.addEventListener('contextmenu', (e) => e.preventDefault());

    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mouseup', onMouseUp);
      window.removeEventListener('resize', handleResize);
      renderer.dispose();
      if (mountRef.current) mountRef.current.removeChild(renderer.domElement);
    };
  }, []);

  useEffect(() => {
    if (status === GameStatus.PLAYING && core.current) {
      const { scene, zombies } = core.current;
      zombies.forEach(z => scene.remove(z));
      zombies.length = 0;
      
      const zombieMat = new THREE.MeshStandardMaterial({ color: 0x2e422e, roughness: 0.9 });
      const zombieGeo = new THREE.CapsuleGeometry(0.4, 1.2);

      for (let i = 0; i < totalZombies; i++) {
        const z = new THREE.Group();
        const body = new THREE.Mesh(zombieGeo, zombieMat);
        body.position.y = 1.0;
        body.castShadow = true;
        z.add(body);
        
        const head = new THREE.Mesh(new THREE.SphereGeometry(0.3), zombieMat);
        head.position.y = 1.9;
        z.add(head);
        
        const angle = Math.random() * Math.PI * 2;
        const d = SETTINGS.ZOMBIE_SPAWN_RADIUS + Math.random() * 20;
        z.position.set(Math.cos(angle) * d, 0, Math.sin(angle) * d);
        
        z.userData = { speed: 0.08 + (wave * 0.015), lastAttack: 0 };
        scene.add(z);
        zombies.push(z);
      }
      anim.current.draw = 0;
    }
  }, [status, wave, totalZombies]);

  useEffect(() => {
    let frameId: number;
    let radarTicks = 0;

    const loop = () => {
      frameId = requestAnimationFrame(loop);
      if (!core.current) return;
      const { camera, renderer, gun, clock, zombies, muzzleFlashMesh, particles, scene } = core.current;
      const dt = Math.min(clock.getDelta(), 0.05); // 물리 폭발 방지 (max delta 0.05)
      const time = clock.getElapsedTime();

      // [핵심 개선] 쿼터니언 기반 시선 보간
      // 오일러 각도로부터 타겟 쿼터니언 생성
      const targetQuat = new THREE.Quaternion().setFromEuler(
        new THREE.Euler(currentPitch.current, currentYaw.current, 0, 'YXZ')
      );
      // Slerp를 사용하여 최단 거리로 부드럽게 회전 (프레임 독립적)
      camera.quaternion.slerp(targetQuat, 1.0 - Math.exp(-SETTINGS.ROTATION_SPEED * dt));

      if (gameRef.current.status === GameStatus.PLAYING) {
        physics.current.velocity.x -= physics.current.velocity.x * SETTINGS.FRICTION * dt;
        physics.current.velocity.z -= physics.current.velocity.z * SETTINGS.FRICTION * dt;
        physics.current.velocity.y -= SETTINGS.GRAVITY * dt;

        const dz = Number(moveState.current.forward) - Number(moveState.current.backward);
        const dx = Number(moveState.current.right) - Number(moveState.current.left);

        if (dz !== 0) physics.current.velocity.z -= dz * SETTINGS.WALK_SPEED * dt;
        if (dx !== 0) physics.current.velocity.x += dx * SETTINGS.WALK_SPEED * dt;

        // 카메라의 현재 Y 회전값(Yaw) 추출하여 이동 방향 계산
        const yawEuler = new THREE.Euler().setFromQuaternion(camera.quaternion, 'YXZ');
        const yaw = yawEuler.y;
        
        const vx_world = physics.current.velocity.x * Math.cos(yaw) + physics.current.velocity.z * Math.sin(yaw);
        const vz_world = -physics.current.velocity.x * Math.sin(yaw) + physics.current.velocity.z * Math.cos(yaw);
        
        camera.position.x += vx_world * dt;
        camera.position.z += vz_world * dt;
        camera.position.y += physics.current.velocity.y * dt;

        if (camera.position.y < SETTINGS.PLAYER_HEIGHT) {
          camera.position.y = SETTINGS.PLAYER_HEIGHT;
          physics.current.velocity.y = 0;
          physics.current.isJumping = false;
        }

        radarTicks++;
        if (radarTicks >= 5) {
          radarTicks = 0;
          const range = SETTINGS.RADAR_RANGE;
          const lookX = -Math.sin(yaw); const lookZ = -Math.cos(yaw);
          const sideX = Math.cos(yaw); const sideZ = -Math.sin(yaw);

          const radarPositions: EnemyRadarPos[] = zombies.map((z, idx) => {
            const dx = z.position.x - camera.position.x;
            const dz = z.position.z - camera.position.z;
            const dist = Math.sqrt(dx * dx + dz * dz);
            const fDist = dx * lookX + dz * lookZ;
            const sDist = dx * sideX + dz * sideZ;
            let rx = sDist / range; let ry = -fDist / range;
            const mag = Math.sqrt(rx * rx + ry * ry);
            if (mag > 1) { rx /= mag; ry /= mag; }
            return { id: idx, relX: rx, relY: ry, dist };
          });
          cbRef.current.onUpdateRadar(radarPositions);
        }

        zombies.forEach(z => {
          z.lookAt(camera.position.x, 0, camera.position.z);
          const dir = new THREE.Vector3().subVectors(camera.position, z.position);
          dir.y = 0; // 수평 이동만 하도록 고정
          dir.normalize();
          z.position.add(dir.multiplyScalar(z.userData.speed * (dt * 60)));
          
          if (z.position.distanceTo(camera.position) < 1.6) {
            const now = Date.now();
            if (now - z.userData.lastAttack > 1000) { 
              cbRef.current.onHit(20); 
              z.userData.lastAttack = now; 
            }
          }
        });
      }

      const adsTarget = moveState.current.aiming ? 1 : 0;
      anim.current.ads = THREE.MathUtils.lerp(anim.current.ads, adsTarget, 1 - Math.exp(-12 * dt));
      camera.fov = THREE.MathUtils.lerp(SETTINGS.BASE_FOV, SETTINGS.ADS_FOV, anim.current.ads);
      camera.updateProjectionMatrix();

      anim.current.recoil *= Math.pow(0.8, dt * 60);
      if (anim.current.draw < 1) anim.current.draw += dt * 4;
      const drawAnim = Math.sin((1 - Math.min(1, anim.current.draw)) * Math.PI / 2) * -1.2;
      
      if (gameRef.current.isReloading) anim.current.reload = Math.min(1, anim.current.reload + dt * 1.6);
      else anim.current.reload = Math.max(0, anim.current.reload - dt * 4.0);
      
      const relAnimY = Math.sin(anim.current.reload * Math.PI) * -0.7;
      const speedMag = new THREE.Vector2(physics.current.velocity.x, physics.current.velocity.z).length();
      const bob = Math.sin(time * 11) * (speedMag > 5 ? (moveState.current.aiming ? 0.005 : 0.025) : 0.003);
      
      const posOffset = new THREE.Vector3().lerpVectors(SETTINGS.GUN_OFFSET, SETTINGS.ADS_GUN_OFFSET, anim.current.ads);
      gun.position.set(
        posOffset.x + bob, 
        posOffset.y + bob + anim.current.recoil * 0.45 + drawAnim + relAnimY, 
        posOffset.z + anim.current.recoil * 0.8
      );
      gun.rotation.x = anim.current.recoil * 0.4 + anim.current.reload * 0.6;

      if (muzzleFlashMesh.visible) muzzleFlashMesh.scale.multiplyScalar(Math.pow(0.85, dt * 60));

      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.position.add(p.velocity);
        p.velocity.y -= 0.015 * (dt * 60);
        p.life -= dt * 3;
        p.scale.setScalar(Math.max(0.001, p.life));
        if (p.life <= 0) { scene.remove(p); particles.splice(i, 1); }
      }

      renderer.render(scene, camera);
    };
    loop();
    return () => cancelAnimationFrame(frameId);
  }, []);

  return <div ref={mountRef} className="w-full h-full" />;
};

export default GameWorld;
