/**
 * ModelViewer - Three.js 3D 模型查看器组件
 * 支持 GLB/GLTF 格式，提供轨道控制、灯光、网格地面等功能
 */

import React, { Suspense, useRef, useState, useCallback } from 'react'
import { Canvas, useThree } from '@react-three/fiber'
import { 
  OrbitControls, 
  Stage, 
  useGLTF, 
  Environment,
  Grid,
  Center,
  Html,
  useProgress
} from '@react-three/drei'
import * as THREE from 'three'

// 加载进度指示器
function Loader() {
  const { progress } = useProgress()
  return (
    <Html center>
      <div className="flex flex-col items-center gap-2">
        <div className="w-32 h-2 bg-gray-700 rounded-full overflow-hidden">
          <div 
            className="h-full bg-blue-500 transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
        <span className="text-white text-sm">{progress.toFixed(0)}% 加载中...</span>
      </div>
    </Html>
  )
}

// 3D 模型组件
function Model({ url, onLoad, onError }) {
  const { scene } = useGLTF(url, true, true, (error) => {
    console.error('Failed to load model:', error)
    onError?.(error)
  })
  
  React.useEffect(() => {
    if (scene) {
      // 计算边界框并居中模型
      const box = new THREE.Box3().setFromObject(scene)
      const center = box.getCenter(new THREE.Vector3())
      const size = box.getSize(new THREE.Vector3())
      
      // 移动模型使其底部在原点
      scene.position.sub(center)
      scene.position.y += size.y / 2
      
      onLoad?.({ size, center })
    }
  }, [scene, onLoad])
  
  return <primitive object={scene} />
}

// 截图功能组件
function ScreenshotHelper({ onCapture }) {
  const { gl, scene, camera } = useThree()
  
  React.useEffect(() => {
    if (onCapture) {
      onCapture(() => {
        gl.render(scene, camera)
        return gl.domElement.toDataURL('image/png')
      })
    }
  }, [gl, scene, camera, onCapture])
  
  return null
}

// 主查看器组件
export default function ModelViewer({ 
  modelUrl,
  className = '',
  showGrid = true,
  showAxes = false,
  autoRotate = false,
  backgroundColor = '#1a1a2e',
  onScreenshot,
  onModelLoad,
  onError
}) {
  const containerRef = useRef(null)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [captureFunc, setCaptureFunc] = useState(null)
  const [modelInfo, setModelInfo] = useState(null)
  const [loadError, setLoadError] = useState(null)
  
  // 全屏切换
  const toggleFullscreen = useCallback(() => {
    if (!containerRef.current) return
    
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen?.()
      setIsFullscreen(true)
    } else {
      document.exitFullscreen?.()
      setIsFullscreen(false)
    }
  }, [])
  
  // 监听全屏变化
  React.useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement)
    }
    document.addEventListener('fullscreenchange', handleFullscreenChange)
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange)
  }, [])
  
  // 截图
  const handleScreenshot = useCallback(() => {
    if (captureFunc) {
      const dataUrl = captureFunc()
      onScreenshot?.(dataUrl)
      
      // 也可以直接下载
      const link = document.createElement('a')
      link.download = `model-screenshot-${Date.now()}.png`
      link.href = dataUrl
      link.click()
    }
  }, [captureFunc, onScreenshot])
  
  // 模型加载完成
  const handleModelLoad = useCallback((info) => {
    setModelInfo(info)
    setLoadError(null)
    onModelLoad?.(info)
  }, [onModelLoad])
  
  // 模型加载错误
  const handleError = useCallback((error) => {
    setLoadError(error.message || '加载失败')
    onError?.(error)
  }, [onError])
  
  if (!modelUrl) {
    return (
      <div className={`flex items-center justify-center bg-gray-800 rounded-lg ${className}`}>
        <div className="text-gray-400 text-center p-8">
          <svg className="w-16 h-16 mx-auto mb-4 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} 
              d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
          </svg>
          <p>请选择一个 3D 模型</p>
        </div>
      </div>
    )
  }
  
  return (
    <div 
      ref={containerRef}
      className={`relative bg-gray-900 rounded-lg overflow-hidden ${className}`}
      style={{ backgroundColor }}
    >
      {/* 工具栏 */}
      <div className="absolute top-3 right-3 z-10 flex gap-2">
        <button
          onClick={handleScreenshot}
          className="p-2 bg-gray-800/80 hover:bg-gray-700 rounded-lg text-white transition-colors"
          title="截图"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
              d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
              d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </button>
        <button
          onClick={toggleFullscreen}
          className="p-2 bg-gray-800/80 hover:bg-gray-700 rounded-lg text-white transition-colors"
          title={isFullscreen ? '退出全屏' : '全屏'}
        >
          {isFullscreen ? (
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                d="M6 18L18 6M6 6l12 12" />
            </svg>
          ) : (
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
            </svg>
          )}
        </button>
      </div>
      
      {/* 模型信息 */}
      {modelInfo && (
        <div className="absolute bottom-3 left-3 z-10 text-xs text-gray-400 bg-gray-800/80 px-2 py-1 rounded">
          尺寸: {modelInfo.size.x.toFixed(2)} x {modelInfo.size.y.toFixed(2)} x {modelInfo.size.z.toFixed(2)}
        </div>
      )}
      
      {/* 加载错误 */}
      {loadError && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-900/90 z-20">
          <div className="text-center text-red-400">
            <svg className="w-12 h-12 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <p>模型加载失败</p>
            <p className="text-sm mt-1">{loadError}</p>
          </div>
        </div>
      )}
      
      {/* Three.js Canvas */}
      <Canvas
        camera={{ position: [5, 5, 5], fov: 50 }}
        shadows
        gl={{ preserveDrawingBuffer: true }}
      >
        <color attach="background" args={[backgroundColor]} />
        
        {/* 灯光 */}
        <ambientLight intensity={0.5} />
        <directionalLight 
          position={[10, 10, 5]} 
          intensity={1} 
          castShadow
          shadow-mapSize={[2048, 2048]}
        />
        <directionalLight position={[-10, -10, -5]} intensity={0.3} />
        
        {/* 环境贴图 */}
        <Environment preset="city" />
        
        {/* 网格地面 */}
        {showGrid && (
          <Grid
            args={[20, 20]}
            cellSize={0.5}
            cellThickness={0.5}
            cellColor="#404040"
            sectionSize={2}
            sectionThickness={1}
            sectionColor="#606060"
            fadeDistance={30}
            fadeStrength={1}
            position={[0, 0, 0]}
          />
        )}
        
        {/* 坐标轴 */}
        {showAxes && <axesHelper args={[5]} />}
        
        {/* 模型 */}
        <Suspense fallback={<Loader />}>
          <Center>
            <Model 
              url={modelUrl} 
              onLoad={handleModelLoad}
              onError={handleError}
            />
          </Center>
        </Suspense>
        
        {/* 轨道控制器 */}
        <OrbitControls 
          makeDefault
          autoRotate={autoRotate}
          autoRotateSpeed={1}
          enableDamping
          dampingFactor={0.05}
          minDistance={1}
          maxDistance={50}
        />
        
        {/* 截图辅助 */}
        <ScreenshotHelper onCapture={setCaptureFunc} />
      </Canvas>
      
      {/* 操作提示 */}
      <div className="absolute bottom-3 right-3 text-xs text-gray-500">
        鼠标左键: 旋转 | 右键: 平移 | 滚轮: 缩放
      </div>
    </div>
  )
}

// 预加载模型
ModelViewer.preload = (url) => {
  useGLTF.preload(url)
}
