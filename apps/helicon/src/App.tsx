import { Canvas } from '@react-three/fiber'

export function App() {
  return (
    <Canvas shadows camera={{ position: [6, 4, 6], fov: 60 }}>
      <color attach="background" args={['#0e0e12']} />
    </Canvas>
  )
}
