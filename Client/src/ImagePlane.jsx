import React, { forwardRef, useRef, useEffect, useMemo } from 'react'; // Removed useState
import { useFrame, useLoader } from '@react-three/fiber';
import { TextureLoader } from 'three';
import * as THREE from 'three';
import { Html } from '@react-three/drei';
import DeleteButton from './DeleteButton';
import useStore from './store'; // Added

const ImagePlane = forwardRef(
  (
    { originalIndex, position, onClick, imageUrl, user, onDelete, onError },
    ref
  ) => {
    const {
      ensureImageComponentState,
      setBoxDimensionsForImage,
      imageComponentStates,
    } = useStore((state) => ({
      ensureImageComponentState: state.ensureImageComponentState,
      setBoxDimensionsForImage: state.setBoxDimensionsForImage,
      imageComponentStates: state.imageComponentStates,
    }));

    useEffect(() => {
      ensureImageComponentState(originalIndex);
    }, [originalIndex, ensureImageComponentState]);

    const boxDimensions = imageComponentStates[originalIndex]
      ?.boxDimensions || [1, 1];

    const texture = useLoader(
      TextureLoader,
      imageUrl,
      (loader) => {
        // Optional: You can configure the loader here if needed
      },
      (err) => {
        console.error(`TextureLoader failed for ${imageUrl}:`, err);
        if (onError) {
          onError(err); // Call the onError prop passed from LazyImagePlane
        }
      }
    );

    if (texture) {
      texture.minFilter = THREE.LinearFilter;
      texture.magFilter = THREE.LinearFilter;
      texture.flipY = false;
    }

    const meshRef = useRef();

    useEffect(() => {
      const currentTexture = texture;
      return () => {
        if (currentTexture) {
          currentTexture.dispose();
        }
      };
    }, [texture]);

    useEffect(() => {
      if (
        texture.image &&
        texture.image.naturalWidth &&
        texture.image.naturalHeight
      ) {
        const maxWidth = 10;
        const aspectRatio =
          texture.image.naturalWidth / texture.image.naturalHeight;

        let newWidth, newHeight;
        if (texture.image.naturalWidth > texture.image.naturalHeight) {
          newWidth = maxWidth;
          newHeight = maxWidth / aspectRatio;
        } else {
          newHeight = maxWidth;
          newWidth = maxWidth * aspectRatio;
        }

        newWidth = Math.round(newWidth);
        newHeight = Math.round(newHeight);

        const currentDimensions = imageComponentStates[originalIndex]
          ?.boxDimensions || [1, 1];
        if (
          currentDimensions[0] !== newWidth ||
          currentDimensions[1] !== newHeight
        ) {
          setBoxDimensionsForImage(originalIndex, [newWidth, newHeight]);
        }
      }
    }, [
      texture,
      originalIndex,
      imageComponentStates,
      setBoxDimensionsForImage,
      ensureImageComponentState,
    ]);

    const boxDepth = 0.05;
    const materials = useMemo(() => {
      const sideMaterial = new THREE.MeshBasicMaterial({
        color: 'black',
        roughness: 0.8,
        flatShading: true,
      });

      return [
        sideMaterial,
        sideMaterial,
        sideMaterial,
        sideMaterial,
        new THREE.MeshBasicMaterial({
          map: texture,
          toneMapped: false,
          side: THREE.FrontSide,
        }),
        sideMaterial,
      ];
    }, [texture]);

    const direction = useMemo(() => new THREE.Vector3(), []);
    const lastUpdateRef = useRef(0);
    const UPDATE_INTERVAL = 50;

    useFrame(({ camera, clock }) => {
      if (meshRef.current) {
        const now = clock.elapsedTime * 1000;
        if (now - lastUpdateRef.current < UPDATE_INTERVAL) {
          return;
        }
        lastUpdateRef.current = now;

        direction
          .subVectors(meshRef.current.position, camera.position)
          .normalize();
        meshRef.current.lookAt(camera.position);
        meshRef.current.rotation.z += Math.PI;
      }
    });

    const handleDelete = () => onDelete(originalIndex);
    const handleClick = (event) => {
      event.stopPropagation();
      if (onClick) {
        console.log(`Image clicked: ${originalIndex}`);
        onClick(originalIndex);
      }
    };

    return (
      <mesh
        position={position}
        ref={ref || meshRef}
        castShadow
        material={materials}
        userData={{ originalIndex }}
        onClick={handleClick}
      >
        <boxGeometry attach="geometry" args={[...boxDimensions, boxDepth]} />
        {user && (
          <Html
            position={[
              boxDimensions[0] / 2 - 0.5,
              boxDimensions[1] / 2 - 0.5,
              0.1,
            ]}
          >
            <DeleteButton onClick={handleDelete} />
          </Html>
        )}
      </mesh>
    );
  }
);

export default React.memo(ImagePlane);
