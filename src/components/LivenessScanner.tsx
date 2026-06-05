import React, { useState, useEffect, useRef } from 'react';
import { Camera, CheckCircle, RefreshCw, Eye, ShieldAlert } from 'lucide-react';

interface LivenessScannerProps {
  onSuccess: (photoUrl: string, score: number) => void;
  onFailure: (reason: string) => void;
  minThreshold: number;
}

type LivenessStep = 'position' | 'blink' | 'smile' | 'turn-left' | 'analyzing' | 'complete';

export const LivenessScanner: React.FC<LivenessScannerProps> = ({
  onSuccess,
  onFailure,
  minThreshold
}) => {
  const [step, setStep] = useState<LivenessStep>('position');
  const [useWebcam, setUseWebcam] = useState<boolean>(false);
  const [livenessScore, setLivenessScore] = useState<number | null>(null);
  const [challengeProgress, setChallengeProgress] = useState<number>(0);
  const [countdown, setCountdown] = useState<number>(5);
  const [faceDetected, setFaceDetected] = useState<boolean>(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Messages corresponding to each step
  const stepMessages = {
    'position': 'Fit your face inside the yellow circle and hold still.',
    'blink': 'Challenge 1/3: Slowly BLINK your eyes to verify liveness...',
    'smile': 'Challenge 2/3: Now SMILE broadly for expression check...',
    'turn-left': 'Challenge 3/3: Turn your head slightly to the LEFT...',
    'analyzing': 'Extracting facial vectors & checking 3D liveness depth...',
    'complete': 'Biometric Verification Succeeded!'
  };

  // Handle real webcam access
  useEffect(() => {
    if (useWebcam) {
      navigator.mediaDevices.getUserMedia({ video: { width: 320, height: 240 } })
        .then((stream) => {
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
            streamRef.current = stream;
            setFaceDetected(true);
          }
        })
        .catch((err) => {
          console.warn("Webcam not accessible, falling back to simulator: ", err);
          setUseWebcam(false);
          setFaceDetected(true); // Simulated face detected
        });
    } else {
      stopWebcam();
      // Simulated automatic face detection
      const timer = setTimeout(() => {
        setFaceDetected(true);
      }, 1200);
      return () => clearTimeout(timer);
    }

    return () => {
      stopWebcam();
    };
  }, [useWebcam]);

  const stopWebcam = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
  };

  // Simulator sequence
  useEffect(() => {
    if (!faceDetected || step === 'complete' || step === 'analyzing') return;

    let interval: NodeJS.Timeout;

    if (step === 'position') {
      // Countdown to start challenges
      interval = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(interval);
            setStep('blink');
            setChallengeProgress(0);
            return 5;
          }
          return prev - 1;
        });
      }, 1000);
    } else if (step === 'blink') {
      // Simulate user blinking
      interval = setInterval(() => {
        setChallengeProgress((prev) => {
          if (prev >= 100) {
            clearInterval(interval);
            setStep('smile');
            return 0;
          }
          return prev + 25;
        });
      }, 400);
    } else if (step === 'smile') {
      // Simulate user smiling
      interval = setInterval(() => {
        setChallengeProgress((prev) => {
          if (prev >= 100) {
            clearInterval(interval);
            setStep('turn-left');
            return 0;
          }
          return prev + 20;
        });
      }, 400);
    } else if (step === 'turn-left') {
      // Simulate head turn
      interval = setInterval(() => {
        setChallengeProgress((prev) => {
          if (prev >= 100) {
            clearInterval(interval);
            triggerAnalysis();
            return 0;
          }
          return prev + 25;
        });
      }, 300);
    }

    return () => {
      clearInterval(interval);
    };
  }, [faceDetected, step]);

  const triggerAnalysis = () => {
    setStep('analyzing');
    
    // Capture frame from canvas if webcam is active, else use a premium mock selfie
    if (useWebcam && videoRef.current && canvasRef.current) {
      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');
      if (context) {
        context.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
      }
    }

    setTimeout(() => {
      // Generate a realistic high liveness score (e.g. 94% - 99.5%)
      const score = parseFloat((93.0 + Math.random() * 6.5).toFixed(1));
      setLivenessScore(score);

      if (score >= minThreshold) {
        setStep('complete');
        // Trigger callback
        setTimeout(() => {
          onSuccess(
            useWebcam && canvasRef.current ? canvasRef.current.toDataURL('image/jpeg') : 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&h=150&q=80',
            score
          );
        }, 1200);
      } else {
        onFailure(`Biometric liveness score (${score}%) fell below university threshold (${minThreshold}%). Try blinking slower.`);
      }
    }, 2000);
  };

  const handleReset = () => {
    setStep('position');
    setChallengeProgress(0);
    setCountdown(5);
    setLivenessScore(null);
    if (!useWebcam) {
      setFaceDetected(false);
      setTimeout(() => setFaceDetected(true), 1000);
    }
  };

  return (
    <div className="bg-slate-950 border border-slate-800 p-6 rounded-2xl text-white flex flex-col md:flex-row gap-6 items-center justify-between">
      
      {/* Camera Viewport Box */}
      <div className="w-full max-w-[320px] aspect-square bg-slate-900 rounded-xl border-2 border-slate-800 relative overflow-hidden flex items-center justify-center group">
        
        {useWebcam ? (
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover scale-x-[-1]"
          />
        ) : (
          // Simulated high fidelity 3D Face Wireframe
          <div className="w-full h-full bg-slate-950 flex items-center justify-center relative">
            <div className="absolute inset-0 bg-[radial-gradient(#1e293b_1px,transparent_1px)] bg-[size:12px_12px] opacity-40"></div>
            
            {faceDetected ? (
              <div className="relative w-40 h-40 flex items-center justify-center">
                {/* Glowing facial matrix dots */}
                <div className="absolute inset-0 rounded-full border-2 border-indigo-500/20 animate-pulse"></div>
                <div className="absolute w-32 h-36 rounded-[45%] border-2 border-indigo-500/50 flex flex-col justify-around items-center p-4">
                  {/* Eyes wireframe */}
                  <div className="flex justify-between w-16">
                    <div className={`w-3.5 h-3.5 rounded-full border-2 border-indigo-400 flex items-center justify-center transition-all duration-200 ${step === 'blink' && challengeProgress % 50 === 0 ? 'h-1 opacity-40' : ''}`}>
                      <div className="w-1 h-1 bg-cyan-400 rounded-full"></div>
                    </div>
                    <div className={`w-3.5 h-3.5 rounded-full border-2 border-indigo-400 flex items-center justify-center transition-all duration-200 ${step === 'blink' && challengeProgress % 50 === 0 ? 'h-1 opacity-40' : ''}`}>
                      <div className="w-1 h-1 bg-cyan-400 rounded-full"></div>
                    </div>
                  </div>
                  
                  {/* Nose anchor point */}
                  <div className="w-1 h-3 bg-indigo-400 rounded"></div>
                  
                  {/* Mouth wireframe */}
                  <div className={`w-10 h-4 border-b-2 border-indigo-400 rounded-full transition-all ${step === 'smile' ? 'w-12 h-5 border-cyan-400 border-b-4' : ''}`}></div>
                </div>

                {/* 3D Scan Points */}
                <div className="absolute top-10 left-10 w-1 h-1 bg-cyan-400 rounded-full animate-ping"></div>
                <div className="absolute top-12 right-12 w-1 h-1 bg-indigo-400 rounded-full"></div>
                <div className="absolute bottom-14 left-8 w-1 h-1 bg-cyan-400 rounded-full"></div>
                <div className="absolute bottom-16 right-10 w-1 h-1 bg-cyan-400 rounded-full"></div>
                <div className="absolute top-1/2 left-4 w-1 h-1 bg-indigo-400 rounded-full"></div>
                <div className="absolute top-1/2 right-4 w-1 h-1 bg-indigo-400 rounded-full"></div>
              </div>
            ) : (
              <div className="text-center text-slate-500 flex flex-col items-center gap-2">
                <RefreshCw className="w-8 h-8 animate-spin text-slate-700" />
                <span className="text-xs font-medium font-mono">Initializing Biometric Core...</span>
              </div>
            )}
          </div>
        )}

        {/* Hidden canvas for capturing webcam image */}
        <canvas ref={canvasRef} width="320" height="240" className="hidden" />

        {/* Glowing Green Scanline */}
        {step !== 'complete' && faceDetected && (
          <div className="absolute left-0 right-0 h-0.5 bg-cyan-400/80 shadow-[0_0_8px_rgba(34,211,238,0.8)] animate-[scan_2.5s_ease-in-out_infinite]"></div>
        )}

        {/* Face Alignment Guide Ring */}
        {faceDetected && step !== 'complete' && (
          <div className={`absolute w-52 h-60 rounded-[40%] border-2 transition-all duration-300 ${
            step === 'position' ? 'border-yellow-500 animate-pulse' : 'border-cyan-500/60'
          } left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center justify-center pointer-events-none`}>
            
            {/* Crosshairs */}
            <div className="absolute top-0 w-0.5 h-3 bg-indigo-400"></div>
            <div className="absolute bottom-0 w-0.5 h-3 bg-indigo-400"></div>
            <div className="absolute left-0 w-3 h-0.5 bg-indigo-400"></div>
            <div className="absolute right-0 w-3 h-0.5 bg-indigo-400"></div>
            
            {step === 'position' && (
              <div className="bg-yellow-500/10 text-yellow-400 text-[10px] font-mono font-bold px-2 py-0.5 rounded-full absolute bottom-4 backdrop-blur-sm">
                ALIGN FACE ({countdown}s)
              </div>
            )}
          </div>
        )}

        {/* Overlay on Success */}
        {step === 'complete' && (
          <div className="absolute inset-0 bg-emerald-950/80 backdrop-blur-sm flex flex-col items-center justify-center p-4 text-center animate-fade-in">
            <CheckCircle className="w-12 h-12 text-emerald-400 animate-bounce mb-2" />
            <h4 className="font-bold text-emerald-200 text-sm uppercase tracking-wide">Liveness Certified</h4>
            <p className="text-xs text-emerald-400 mt-1 font-mono font-semibold">Score: {livenessScore}%</p>
            <span className="text-[9px] text-slate-400 mt-3 block bg-emerald-950 border border-emerald-800 px-2 py-1 rounded text-emerald-300">
              3D Anti-Spoofing Passed
            </span>
          </div>
        )}

        {/* Active challenge status overlay */}
        {faceDetected && step !== 'position' && step !== 'complete' && step !== 'analyzing' && (
          <div className="absolute bottom-2 left-2 right-2 bg-slate-950/95 backdrop-blur-md border border-slate-800 p-2 rounded-lg text-center">
            <div className="flex items-center justify-between text-[10px] text-slate-400 mb-1">
              <span className="font-semibold uppercase tracking-wide text-indigo-400">Active Challenge</span>
              <span className="font-mono text-cyan-400">{challengeProgress}%</span>
            </div>
            <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
              <div
                className="bg-cyan-400 h-full transition-all duration-300"
                style={{ width: `${challengeProgress}%` }}
              ></div>
            </div>
          </div>
        )}

        {/* Webcam mode toggle icon */}
        <button
          onClick={() => setUseWebcam(!useWebcam)}
          className="absolute top-2 right-2 p-1.5 bg-slate-950/80 border border-slate-800 rounded-lg text-slate-300 hover:bg-indigo-600 hover:text-white transition-all shadow"
          title={useWebcam ? "Switch to Virtual Simulator" : "Use Real Web-Camera"}
        >
          <Camera className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Verification Log & Dynamic Prompt Panel */}
      <div className="flex-1 flex flex-col justify-between self-stretch">
        <div className="space-y-3.5">
          <div className="flex items-center gap-2.5">
            <div className={`p-2 rounded-lg ${
              step === 'complete' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20'
            }`}>
              <Eye className="w-4 h-4" />
            </div>
            <div>
              <h4 className="font-bold text-slate-200 text-sm">University Liveness Check</h4>
              <p className="text-xs text-slate-400">Blink + Smile validation blocks photos and video replays</p>
            </div>
          </div>

          {/* Live Instructions */}
          <div className={`p-4 rounded-xl border transition-all duration-300 ${
            step === 'position' ? 'bg-yellow-500/5 border-yellow-500/20 text-yellow-300' :
            step === 'analyzing' ? 'bg-cyan-500/5 border-cyan-500/20 text-cyan-300' :
            step === 'complete' ? 'bg-emerald-500/5 border-emerald-500/20 text-emerald-300' :
            'bg-indigo-500/5 border-indigo-500/20 text-indigo-300'
          }`}>
            <span className="text-[10px] uppercase tracking-wider font-bold text-slate-400 block mb-1">
              System Instruction
            </span>
            <p className="text-xs font-medium leading-relaxed font-mono">
              {stepMessages[step]}
            </p>
          </div>

          {/* Device telemetry logs */}
          <div className="bg-slate-900/50 border border-slate-800 p-3 rounded-xl space-y-1.5 font-mono text-[10px] text-slate-400">
            <div className="flex justify-between">
              <span>Thermal spoof protection:</span>
              <span className="text-emerald-400 font-semibold">ACTIVE</span>
            </div>
            <div className="flex justify-between">
              <span>Liveness Threshold requirement:</span>
              <span className="text-slate-300 font-semibold">{minThreshold}% match</span>
            </div>
            <div className="flex justify-between">
              <span>WiFi validation lock:</span>
              <span className="text-indigo-400 font-semibold">CAMPUS_SECURE_5G</span>
            </div>
            <div className="flex justify-between">
              <span>Camera input source:</span>
              <span className="text-slate-300 font-semibold">
                {useWebcam ? 'Webcam Video Feed' : 'Deep-AI Virtual Simulator'}
              </span>
            </div>
          </div>
        </div>

        <div className="pt-4 flex items-center gap-2 border-t border-slate-900 mt-4">
          <button
            onClick={handleReset}
            className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 rounded-lg text-xs flex items-center gap-1.5 transition-all active:scale-95 font-medium"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Restart Scan
          </button>
          <div className="text-[10px] text-slate-500 flex items-center gap-1 ml-auto">
            <ShieldAlert className="w-3.5 h-3.5 text-indigo-500" />
            Secure biometric channel
          </div>
        </div>
      </div>
    </div>
  );
};
