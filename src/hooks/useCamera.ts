import { useState, useRef, useCallback, useEffect } from 'react';
import { toast } from 'sonner';

export interface CameraOptions {
  facingMode?: 'user' | 'environment';
  quality?: number;
  maxWidth?: number;
  maxHeight?: number;
}

export function useCamera(options: CameraOptions = {}) {
  const {
    facingMode: initialFacingMode = 'environment',
    quality = 0.8,
    maxWidth = 1920,
    maxHeight = 1080,
  } = options;

  const [stream, setStream] = useState<MediaStream | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [image, setImage] = useState<string | null>(null);
  const [currentFacingMode, setCurrentFacingMode] = useState<'user' | 'environment'>(
    initialFacingMode
  );

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    streamRef.current = stream;
  }, [stream]);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
      setStream(null);
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, []);

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, [stopCamera]);

  const startCamera = useCallback(
    async (overrideFacingMode?: 'user' | 'environment'): Promise<MediaStream | null> => {
      stopCamera();

      if (typeof window === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
        const msg = 'Media Devices API is not supported in this environment';
        setError(msg);
        toast.error('Camera API not supported on this device');
        return null;
      }

      const targetFacingMode = overrideFacingMode || currentFacingMode;

      try {
        setLoading(true);
        setError(null);

        const mediaStream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: targetFacingMode },
            width: { ideal: maxWidth },
            height: { ideal: maxHeight },
          },
          audio: false,
        });

        setStream(mediaStream);
        setCurrentFacingMode(targetFacingMode);

        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
          await videoRef.current.play().catch((playErr) => {
            console.warn('Autoplay prevented or interrupted:', playErr);
          });
        }

        return mediaStream;
      } catch (err: any) {
        const message =
          err instanceof Error
            ? err.message
            : 'Failed to access camera. Please check permissions.';
        setError(message);
        toast.error('Camera access failed', { description: 'Please check app permissions.' });
        return null;
      } finally {
        setLoading(false);
      }
    },
    [currentFacingMode, maxWidth, maxHeight, stopCamera]
  );

  const switchCamera = useCallback(async (): Promise<'user' | 'environment'> => {
    const nextFacingMode = currentFacingMode === 'user' ? 'environment' : 'user';
    await startCamera(nextFacingMode);
    return nextFacingMode;
  }, [currentFacingMode, startCamera]);

  const capturePhoto = useCallback((): string | null => {
    if (!videoRef.current) {
      toast.error('Camera stream is not ready');
      return null;
    }

    const video = videoRef.current;
    if (video.readyState < 2) {
      toast.error('Video feed loading...');
      return null;
    }

    const canvas = canvasRef.current || document.createElement('canvas');
    const context = canvas.getContext('2d');

    if (!context) {
      toast.error('Failed to initialize image context');
      return null;
    }

    canvas.width = video.videoWidth || maxWidth;
    canvas.height = video.videoHeight || maxHeight;

    if (currentFacingMode === 'user') {
      context.translate(canvas.width, 0);
      context.scale(-1, 1);
    }

    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    const imageData = canvas.toDataURL('image/jpeg', quality);
    setImage(imageData);
    return imageData;
  }, [maxWidth, maxHeight, quality, currentFacingMode]);

  const captureBlob = useCallback(async (): Promise<Blob | null> => {
    if (!videoRef.current) return null;

    const video = videoRef.current;
    const canvas = canvasRef.current || document.createElement('canvas');
    const context = canvas.getContext('2d');

    if (!context) return null;

    canvas.width = video.videoWidth || maxWidth;
    canvas.height = video.videoHeight || maxHeight;

    if (currentFacingMode === 'user') {
      context.translate(canvas.width, 0);
      context.scale(-1, 1);
    }

    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    return new Promise((resolve) => {
      canvas.toBlob(
        (blob) => {
          resolve(blob);
        },
        'image/jpeg',
        quality
      );
    });
  }, [maxWidth, maxHeight, quality, currentFacingMode]);

  const resetImage = useCallback(() => {
    setImage(null);
  }, []);

  return {
    videoRef,
    canvasRef,
    stream,
    loading,
    error,
    image,
    facingMode: currentFacingMode,
    startCamera,
    stopCamera,
    switchCamera,
    capturePhoto,
    captureBlob,
    resetImage,
  };
}
