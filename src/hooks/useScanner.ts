import { useCallback, useEffect, useRef, useState } from 'react';
import { BrowserMultiFormatReader } from '@zxing/browser';
import { NotFoundException, ChecksumException, FormatException } from '@zxing/library';

export type ScanResult = { text: string; format: string };

interface UseScannerOptions {
  onResult: (result: ScanResult) => void;
  enabled: boolean;
}

export function useScanner(videoRef: React.RefObject<HTMLVideoElement>, { onResult, enabled }: UseScannerOptions) {
  const readerRef = useRef<BrowserMultiFormatReader | null>(null);
  const controlsRef = useRef<{ stop: () => void } | null>(null);
  const [cameras, setCameras] = useState<MediaDeviceInfo[]>([]);
  const [cameraIndex, setCameraIndex] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(false);
  const onResultRef = useRef(onResult);
  onResultRef.current = onResult;

  useEffect(() => {
    BrowserMultiFormatReader.listVideoInputDevices()
      .then(devices => {
        setCameras(devices);
        const backIdx = devices.findIndex(d =>
          /back|rear|environment/i.test(d.label)
        );
        if (backIdx >= 0) setCameraIndex(backIdx);
      })
      .catch(() => setError('Could not enumerate cameras'));
  }, []);

  useEffect(() => {
    if (!enabled || !videoRef.current || cameras.length === 0) return;
    const reader = new BrowserMultiFormatReader();
    readerRef.current = reader;
    setIsReady(false);
    setError(null);
    const deviceId = cameras[cameraIndex]?.deviceId;

    reader.decodeFromVideoDevice(deviceId, videoRef.current, (result, err) => {
      setIsReady(true);
      if (result) {
        onResultRef.current({
          text: result.getText(),
          format: result.getBarcodeFormat().toString(),
        });
      } else if (err && !(err instanceof NotFoundException) && !(err instanceof ChecksumException) && !(err instanceof FormatException)) {
        setError('Camera error. Please retry.');
      }
    }).then(controls => {
      controlsRef.current = controls;
    }).catch(e => {
      setError(e?.message ?? 'Camera not accessible');
    });

    return () => {
      controlsRef.current?.stop();
      controlsRef.current = null;
    };
  }, [enabled, cameras, cameraIndex, videoRef]);

  const flipCamera = useCallback(() => {
    controlsRef.current?.stop();
    setCameraIndex(i => (i + 1) % Math.max(cameras.length, 1));
  }, [cameras.length]);

  const decodeFromImage = useCallback(async (file: File): Promise<ScanResult[]> => {
    const url = URL.createObjectURL(file);
    const reader = new BrowserMultiFormatReader();
    try {
      const result = await reader.decodeFromImageUrl(url);
      return [{ text: result.getText(), format: result.getBarcodeFormat().toString() }];
    } catch {
      return [];
    } finally {
      URL.revokeObjectURL(url);
    }
  }, []);

  return { cameras, cameraIndex, error, isReady, flipCamera, decodeFromImage };
}
