import * as THREE from 'three';

/**
 * Player represents the physical and visual representation of the character.
 * Features a stylized modular explorer model with procedural animation feedback.
 */
export class Player {
  constructor(materials) {
    this.materials = materials;

    // Root container
    this.mesh = new THREE.Group();
    this.mesh.name = 'PlayerCharacter';

    // Animation state
    this.animationTime = 0;
    this.stridePhase = 0;
    this.torsoLean = 0;
    this.verticalBob = 0;
    this.landingSquash = 0;

    this._buildCharacterModel();
  }

  _buildCharacterModel() {
    // 1. Pivot container for procedural bob/lean
    this.bodyGroup = new THREE.Group();
    this.bodyGroup.position.y = 0;
    this.mesh.add(this.bodyGroup);

    // 2. Torso (Jacket + Explorer Belt)
    const torsoGeo = new THREE.BoxGeometry(0.56, 0.65, 0.36);
    this.torso = new THREE.Mesh(torsoGeo, this.materials.characterJacket);
    this.torso.position.y = 1.05;
    this.torso.castShadow = true;
    this.torso.receiveShadow = true;
    this.bodyGroup.add(this.torso);

    // Belt accent
    const beltGeo = new THREE.BoxGeometry(0.58, 0.08, 0.38);
    const belt = new THREE.Mesh(beltGeo, this.materials.characterTrim);
    belt.position.y = -0.26;
    belt.castShadow = true;
    this.torso.add(belt);

    // 3. Backpack
    const backpackGeo = new THREE.BoxGeometry(0.42, 0.48, 0.22);
    this.backpack = new THREE.Mesh(backpackGeo, this.materials.characterBackpack);
    this.backpack.position.set(0, 0.05, -0.26);
    this.backpack.castShadow = true;
    this.torso.add(this.backpack);

    // Sleeping roll / bedroll on top of backpack
    const bedrollGeo = new THREE.CylinderGeometry(0.08, 0.08, 0.44, 8);
    bedrollGeo.rotateZ(Math.PI / 2);
    const bedroll = new THREE.Mesh(bedrollGeo, this.materials.characterTrim);
    bedroll.position.set(0, 0.28, 0);
    bedroll.castShadow = true;
    this.backpack.add(bedroll);

    // 4. Head & Visor
    this.headGroup = new THREE.Group();
    this.headGroup.position.set(0, 0.46, 0);
    this.torso.add(this.headGroup);

    const headGeo = new THREE.BoxGeometry(0.38, 0.38, 0.38);
    const head = new THREE.Mesh(headGeo, this.materials.characterSkin);
    head.position.y = 0.16;
    head.castShadow = true;
    this.headGroup.add(head);

    // Explorer Cap / Hair
    const capGeo = new THREE.BoxGeometry(0.42, 0.16, 0.44);
    const cap = new THREE.Mesh(capGeo, this.materials.characterPants);
    cap.position.set(0, 0.3, -0.02);
    cap.castShadow = true;
    this.headGroup.add(cap);

    // Visor (Facing forward +Z) - Emissive, unmistakable heading
    const visorGeo = new THREE.BoxGeometry(0.34, 0.1, 0.08);
    const visor = new THREE.Mesh(visorGeo, this.materials.characterVisor);
    visor.position.set(0, 0.16, 0.18);
    this.headGroup.add(visor);

    // 5. Left Arm
    this.leftArmPivot = new THREE.Group();
    this.leftArmPivot.position.set(0.36, 0.22, 0);
    this.torso.add(this.leftArmPivot);

    const armGeo = new THREE.BoxGeometry(0.16, 0.52, 0.18);
    armGeo.translate(0, -0.22, 0);
    this.leftArm = new THREE.Mesh(armGeo, this.materials.characterJacket);
    this.leftArm.castShadow = true;
    this.leftArmPivot.add(this.leftArm);

    // 6. Right Arm
    this.rightArmPivot = new THREE.Group();
    this.rightArmPivot.position.set(-0.36, 0.22, 0);
    this.torso.add(this.rightArmPivot);

    this.rightArm = new THREE.Mesh(armGeo, this.materials.characterJacket);
    this.rightArm.castShadow = true;
    this.rightArmPivot.add(this.rightArm);

    // 7. Left Leg
    this.leftLegPivot = new THREE.Group();
    this.leftLegPivot.position.set(0.16, 0.72, 0);
    this.bodyGroup.add(this.leftLegPivot);

    const legGeo = new THREE.BoxGeometry(0.18, 0.44, 0.2);
    legGeo.translate(0, -0.22, 0);
    this.leftLeg = new THREE.Mesh(legGeo, this.materials.characterPants);
    this.leftLeg.castShadow = true;
    this.leftLegPivot.add(this.leftLeg);

    const bootGeo = new THREE.BoxGeometry(0.2, 0.26, 0.26);
    bootGeo.translate(0, -0.52, 0.03);
    const leftBoot = new THREE.Mesh(bootGeo, this.materials.characterBoots);
    leftBoot.castShadow = true;
    this.leftLegPivot.add(leftBoot);

    // 8. Right Leg
    this.rightLegPivot = new THREE.Group();
    this.rightLegPivot.position.set(-0.16, 0.72, 0);
    this.bodyGroup.add(this.rightLegPivot);

    this.rightLeg = new THREE.Mesh(legGeo, this.materials.characterPants);
    this.rightLeg.castShadow = true;
    this.rightLegPivot.add(this.rightLeg);

    const rightBoot = new THREE.Mesh(bootGeo, this.materials.characterBoots);
    rightBoot.castShadow = true;
    this.rightLegPivot.add(rightBoot);
  }

  /**
   * Procedural animation updates based on speed and grounded status.
   */
  updateAnimation(deltaTime, state, speedRatio) {
    this.animationTime += deltaTime;

    const isGrounded = state !== 'in-air';
    const isMoving = speedRatio > 0.05 && isGrounded;
    const isSprinting = state === 'sprinting';

    if (isGrounded) {
      if (isMoving) {
        // Frequency of steps scales with speed
        const strideSpeed = isSprinting ? 14 : 9;
        this.stridePhase += deltaTime * strideSpeed;

        const legSwing = Math.sin(this.stridePhase) * (isSprinting ? 0.9 : 0.6);
        const armSwing = -legSwing * 0.8;

        // Alternate limbs
        this.leftLegPivot.rotation.x = legSwing;
        this.rightLegPivot.rotation.x = -legSwing;

        this.leftArmPivot.rotation.x = armSwing;
        this.rightArmPivot.rotation.x = -armSwing;

        // Vertical hip bobbing
        const bob = Math.abs(Math.sin(this.stridePhase)) * 0.08;
        this.bodyGroup.position.y = bob;

        // Lean torso into running direction
        const targetLean = isSprinting ? 0.22 : 0.08;
        this.torsoLean = THREE.MathUtils.lerp(this.torsoLean, targetLean, deltaTime * 8);
        this.torso.rotation.x = this.torsoLean;
      } else {
        // IDLE: gentle breathing and reset limbs
        this.stridePhase = 0;
        const breath = Math.sin(this.animationTime * 2.2) * 0.02;
        this.bodyGroup.position.y = breath;

        this.leftLegPivot.rotation.x = THREE.MathUtils.lerp(this.leftLegPivot.rotation.x, 0, deltaTime * 10);
        this.rightLegPivot.rotation.x = THREE.MathUtils.lerp(this.rightLegPivot.rotation.x, 0, deltaTime * 10);
        this.leftArmPivot.rotation.x = THREE.MathUtils.lerp(this.leftArmPivot.rotation.x, 0, deltaTime * 10);
        this.rightArmPivot.rotation.x = THREE.MathUtils.lerp(this.rightArmPivot.rotation.x, 0, deltaTime * 10);

        this.torsoLean = THREE.MathUtils.lerp(this.torsoLean, 0, deltaTime * 8);
        this.torso.rotation.x = this.torsoLean;
      }
    } else {
      // IN AIR (Jumping or Falling): pose limbs
      const airPhase = 0.45;
      this.leftLegPivot.rotation.x = THREE.MathUtils.lerp(this.leftLegPivot.rotation.x, airPhase, deltaTime * 12);
      this.rightLegPivot.rotation.x = THREE.MathUtils.lerp(this.rightLegPivot.rotation.x, -airPhase * 0.6, deltaTime * 12);

      this.leftArmPivot.rotation.x = THREE.MathUtils.lerp(this.leftArmPivot.rotation.x, -airPhase, deltaTime * 12);
      this.rightArmPivot.rotation.x = THREE.MathUtils.lerp(this.rightArmPivot.rotation.x, -airPhase, deltaTime * 12);

      this.leftArmPivot.rotation.z = THREE.MathUtils.lerp(this.leftArmPivot.rotation.z, 0.3, deltaTime * 8);
      this.rightArmPivot.rotation.z = THREE.MathUtils.lerp(this.rightArmPivot.rotation.z, -0.3, deltaTime * 8);

      this.torsoLean = THREE.MathUtils.lerp(this.torsoLean, 0.1, deltaTime * 8);
      this.torso.rotation.x = this.torsoLean;
    }

    // Apply landing squash rebound
    if (this.landingSquash > 0.001) {
      this.landingSquash = THREE.MathUtils.lerp(this.landingSquash, 0, deltaTime * 12);
      this.bodyGroup.scale.set(
        1.0 + this.landingSquash * 0.45,
        1.0 - this.landingSquash * 0.55,
        1.0 + this.landingSquash * 0.45
      );
    } else {
      this.bodyGroup.scale.set(1, 1, 1);
    }
  }

  triggerLandingSquash() {
    this.landingSquash = 0.28;
  }

  getPosition() {
    return this.mesh.position;
  }

  setPosition(x, y, z) {
    this.mesh.position.set(x, y, z);
  }

  setRotationY(yaw) {
    this.mesh.rotation.y = yaw;
  }
}
