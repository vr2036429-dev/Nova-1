import React, { useState, useRef, useEffect } from 'react';
import { 
  Camera, 
  Monitor, 
  Eye, 
  Scan, 
  Sparkles, 
  RotateCw, 
  CheckCircle2, 
  Upload, 
  HelpCircle,
  VideoOff,
  Crosshair
} from 'lucide-react';
import { ScreenElement } from '../types';
import { multimodalService } from '../services/multimodalService';

export const MultimodalView: React.FC = () => {
  const [activeSubTab, setActiveSubTab] = useState<'screen' | 'camera' | 'upload'>('screen');
  const [screenElements, setScreenElements] = useState<ScreenElement[]>([]);
  const [cameraActive, setCameraActive] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [visionPrompt, setVisionPrompt] = useState('Look at this screen and tell me what I should press to proceed.');
  const [analysisResult, setAnalysisResult] = useState('');
  const [capturedImage, setCapturedImage] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    // Scan screen elements upon loading screen tab
    if (activeSubTab === 'screen') {
      const elements = multimodalService.scanScreenElements();
      setScreenElements(elements);
    }
  }, [activeSubTab]);

  // Clean up camera on unmount or tab switch
  useEffect(() => {
    return () => {
      multimodalService.stopCameraStream();
    };
  }, []);

  const handleStartCamera = async () => {
    try {
      setCameraActive(true);
      const stream = await multimodalService.startCameraStream();
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
    } catch (e: any) {
      alert(`Camera initialization error: ${e.message}`);
      setCameraActive(false);
    }
  };

  const handleStopCamera = () => {
    multimodalService.stopCameraStream();
    setCameraActive(false);
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  };

  const handleCaptureCameraAndAnalyze = async () => {
    if (!videoRef.current) return;
    setAnalyzing(true);
    setAnalysisResult('');

    try {
      const snapshot = multimodalService.captureSnapshotFromVideo(videoRef.current);
      setCapturedImage(snapshot);
      const analysis = await multimodalService.analyzeVisualContent(
        snapshot, 
        visionPrompt || 'Analyze this camera frame, describe physical objects or text in detail.',
        'camera'
      );
      setAnalysisResult(analysis);
    } catch (err: any) {
      setAnalysisResult(`Vision processing failed: ${err.message}`);
    } finally {
      setAnalyzing(false);
    }
  };

  const handleCaptureScreenAndAnalyze = async () => {
    setAnalyzing(true);
    setAnalysisResult('');

    try {
      const screenshot = await multimodalService.captureViewportScreenshot();
      setCapturedImage(screenshot);
      const analysis = await multimodalService.analyzeVisualContent(
        screenshot,
        visionPrompt || 'Inspect this UI screenshot. Identify clickable elements, errors, and guide user.',
        'screen'
      );
      setAnalysisResult(analysis);
    } catch (err: any) {
      setAnalysisResult(`Screen analysis failed: ${err.message}`);
    } finally {
      setAnalyzing(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = reader.result as string;
      setCapturedImage(base64);
      setAnalyzing(true);
      try {
        const analysis = await multimodalService.analyzeVisualContent(
          base64,
          visionPrompt || 'Explain this image or document in detail.',
          'camera'
        );
        setAnalysisResult(analysis);
      } catch (err: any) {
        setAnalysisResult(`Upload analysis failed: ${err.message}`);
      } finally {
        setAnalyzing(false);
      }
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-cyan-900/40 pb-4">
        <div>
          <h2 className="text-xl font-bold font-['Chakra_Petch'] text-cyan-400 tracking-wider flex items-center gap-2">
            <Eye className="w-5 h-5 text-cyan-400" />
            MULTIMODAL PERCEPTION BRAIN
          </h2>
          <p className="text-xs text-slate-400 font-mono mt-1">
            Real-time Android screen hierarchy, accessibility scanning, and Gemini 2.5 Flash optical vision.
          </p>
        </div>

        {/* Sub-tabs */}
        <div className="flex rounded-lg bg-slate-900 border border-slate-800 p-1">
          <button
            onClick={() => {
              handleStopCamera();
              setActiveSubTab('screen');
              setVisionPrompt('Look at this screen and tell me what I should press to proceed.');
            }}
            className={`px-3 py-1.5 rounded-md text-xs font-mono flex items-center gap-1.5 transition ${
              activeSubTab === 'screen' ? 'bg-cyan-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Monitor className="w-3.5 h-3.5" /> Screen Intelligence
          </button>
          <button
            onClick={() => {
              setActiveSubTab('camera');
              setVisionPrompt('Inspect this physical object, error, or document in front of the lens.');
            }}
            className={`px-3 py-1.5 rounded-md text-xs font-mono flex items-center gap-1.5 transition ${
              activeSubTab === 'camera' ? 'bg-cyan-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Camera className="w-3.5 h-3.5" /> Camera Vision
          </button>
          <button
            onClick={() => {
              handleStopCamera();
              setActiveSubTab('upload');
              setVisionPrompt('Analyze this uploaded image, chart, or screenshot.');
            }}
            className={`px-3 py-1.5 rounded-md text-xs font-mono flex items-center gap-1.5 transition ${
              activeSubTab === 'upload' ? 'bg-cyan-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Upload className="w-3.5 h-3.5" /> Image / Doc
          </button>
        </div>
      </div>

      {/* Main Mode Content */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Visual Capture / Inspection Viewport */}
        <div className="lg:col-span-7 space-y-4">
          <div className="bg-slate-950/80 border border-cyan-900/50 rounded-xl overflow-hidden shadow-xl shadow-cyan-950/20 relative">
            <div className="bg-slate-900/90 px-4 py-2 border-b border-cyan-900/40 flex items-center justify-between text-xs font-mono text-cyan-400">
              <span className="flex items-center gap-2">
                <Crosshair className="w-3.5 h-3.5 animate-spin" />
                {activeSubTab === 'screen' ? 'ACTIVE SCREEN BUFFER SCANNER' : activeSubTab === 'camera' ? 'OPTICAL SENSOR FEED' : 'STATIC MEDIA BUFFER'}
              </span>
              <span className="text-slate-500 text-[10px]">GEMINI 2.5 FLASH VISION READY</span>
            </div>

            {/* Screen Tab View */}
            {activeSubTab === 'screen' && (
              <div className="p-4 space-y-4">
                <div className="bg-slate-900/60 rounded-lg p-4 border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono text-slate-300">Accessibility Elements Detected:</span>
                    <span className="text-xs font-mono text-cyan-400 font-bold">{screenElements.length}</span>
                  </div>
                  <div className="max-h-48 overflow-y-auto space-y-1.5 pr-2">
                    {screenElements.map((el) => (
                      <div
                        key={el.id}
                        className="p-2 rounded bg-slate-950/70 border border-slate-800/80 text-xs flex items-center justify-between hover:border-cyan-700/50 transition"
                      >
                        <div className="truncate">
                          <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-cyan-950 text-cyan-300 mr-2 uppercase">
                            {el.type}
                          </span>
                          <span className="text-slate-200 font-medium">{el.label}</span>
                        </div>
                        <span className="text-[10px] font-mono text-slate-500">
                          {el.x},{el.y}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <button
                  onClick={handleCaptureScreenAndAnalyze}
                  disabled={analyzing}
                  className="w-full py-2.5 bg-gradient-to-r from-cyan-600 to-blue-600 text-white font-['Chakra_Petch'] font-semibold rounded-lg hover:from-cyan-500 hover:to-blue-500 transition flex items-center justify-center gap-2 shadow-lg shadow-cyan-900/30"
                >
                  {analyzing ? <RotateCw className="w-4 h-4 animate-spin" /> : <Scan className="w-4 h-4" />}
                  {analyzing ? 'Reasoning over screen...' : 'Capture & Analyze Screen with ULTRON'}
                </button>
              </div>
            )}

            {/* Camera Tab View */}
            {activeSubTab === 'camera' && (
              <div className="p-4 space-y-4">
                <div className="relative aspect-video bg-black rounded-lg overflow-hidden border border-slate-800 flex items-center justify-center">
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className={`w-full h-full object-cover ${cameraActive ? 'block' : 'hidden'}`}
                  />

                  {!cameraActive && (
                    <div className="text-center p-6 space-y-3">
                      <Camera className="w-10 h-10 text-slate-600 mx-auto" />
                      <p className="text-xs text-slate-400 font-mono">Camera feed is currently standby.</p>
                      <button
                        onClick={handleStartCamera}
                        className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-mono rounded-lg transition"
                      >
                        Activate Camera Feed
                      </button>
                    </div>
                  )}

                  {cameraActive && (
                    <div className="absolute top-2 right-2">
                      <button
                        onClick={handleStopCamera}
                        className="p-1.5 bg-slate-900/80 hover:bg-slate-900 text-rose-400 rounded-md text-xs font-mono flex items-center gap-1 border border-slate-700"
                        title="Turn off camera"
                      >
                        <VideoOff className="w-3.5 h-3.5" /> Stop
                      </button>
                    </div>
                  )}
                </div>

                {cameraActive && (
                  <button
                    onClick={handleCaptureCameraAndAnalyze}
                    disabled={analyzing}
                    className="w-full py-2.5 bg-gradient-to-r from-cyan-600 to-blue-600 text-white font-['Chakra_Petch'] font-semibold rounded-lg hover:from-cyan-500 hover:to-blue-500 transition flex items-center justify-center gap-2 shadow-lg shadow-cyan-900/30"
                  >
                    {analyzing ? <RotateCw className="w-4 h-4 animate-spin" /> : <Eye className="w-4 h-4" />}
                    {analyzing ? 'Reasoning over visual feed...' : 'Capture Frame & Ask ULTRON'}
                  </button>
                )}
              </div>
            )}

            {/* Upload Tab View */}
            {activeSubTab === 'upload' && (
              <div className="p-4 space-y-4">
                <label className="border-2 border-dashed border-cyan-900/60 hover:border-cyan-500/60 rounded-xl p-8 flex flex-col items-center justify-center cursor-pointer transition bg-slate-900/30">
                  <Upload className="w-8 h-8 text-cyan-400 mb-2" />
                  <span className="text-sm font-semibold text-slate-200">Click to upload screenshot or image</span>
                  <span className="text-xs text-slate-500 mt-1 font-mono">PNG, JPG, WebP supported</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </label>
              </div>
            )}
          </div>

          {/* Captured Preview thumbnail if available */}
          {capturedImage && (
            <div className="bg-slate-900/40 border border-slate-800 rounded-lg p-3 flex items-center gap-3">
              <img
                src={capturedImage}
                alt="Captured visual input"
                className="w-16 h-12 object-cover rounded border border-cyan-900/60"
              />
              <div className="text-xs">
                <p className="font-mono text-cyan-300">Visual Snapshot Cached</p>
                <p className="text-slate-500 text-[10px]">Processed by Gemini 2.5 Flash Vision Multimodal Core</p>
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Prompt & Multimodal AI Reasoning Output */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-slate-900/70 border border-cyan-900/40 rounded-xl p-4 space-y-3">
            <label className="block text-xs font-mono text-cyan-300 uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
              Multimodal Question / Intent Prompt
            </label>
            <textarea
              rows={2}
              value={visionPrompt}
              onChange={(e) => setVisionPrompt(e.target.value)}
              className="w-full bg-slate-950/80 border border-slate-700 rounded-lg p-2.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500 font-sans"
              placeholder="What would you like ULTRON to explain about this image/screen?"
            />
            <div className="flex flex-wrap gap-1.5">
              {[
                'Tell me what I should press',
                'Explain this error message',
                'Summarize the text here',
                'What is this object?',
              ].map((suggestion) => (
                <button
                  key={suggestion}
                  onClick={() => setVisionPrompt(suggestion)}
                  className="px-2 py-0.5 rounded bg-slate-800 hover:bg-cyan-900/40 text-[10px] font-mono text-slate-300 border border-slate-700 transition"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>

          {/* Analysis Result Box */}
          <div className="bg-slate-950/90 border border-slate-800 rounded-xl p-4 min-h-[220px] space-y-2">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <span className="text-xs font-mono text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400" />
                ULTRON Visual Intelligence Output
              </span>
              {analyzing && <RotateCw className="w-3.5 h-3.5 text-cyan-400 animate-spin" />}
            </div>

            {analyzing ? (
              <div className="py-12 text-center space-y-2">
                <div className="w-6 h-6 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin mx-auto" />
                <p className="text-xs font-mono text-cyan-400">Multimodal Neural Processing in Progress...</p>
              </div>
            ) : analysisResult ? (
              <div className="text-xs text-slate-200 leading-relaxed font-sans whitespace-pre-wrap">
                {analysisResult}
              </div>
            ) : (
              <div className="py-12 text-center text-slate-500 space-y-1">
                <HelpCircle className="w-6 h-6 mx-auto text-slate-600" />
                <p className="text-xs font-mono">No visual inspection performed yet.</p>
                <p className="text-[11px] text-slate-600">Select an input mode and tap Analyze.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
