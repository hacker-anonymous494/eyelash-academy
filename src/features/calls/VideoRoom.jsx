import { useRef, useEffect } from 'react';

export default function VideoRoom({ localStream, remoteStream, status, onEnd }) {
  const localVideo = useRef(null);
  const remoteVideo = useRef(null);

  useEffect(() => {
    if (localVideo.current && localStream) localVideo.current.srcObject = localStream;
  }, [localStream]);

  useEffect(() => {
    if (remoteVideo.current && remoteStream) remoteVideo.current.srcObject = remoteStream;
  }, [remoteStream]);

  return (
    <div className="fixed inset-0 z-50 bg-black/90 flex flex-col items-center justify-center">
      <div className="relative w-full h-full max-w-4xl mx-auto">
        {/* Remote video (full screen) */}
        <video ref={remoteVideo} autoPlay playsInline className="w-full h-full object-cover" />
        {/* Local video (PIP) */}
        <video ref={localVideo} autoPlay playsInline muted className="absolute bottom-4 right-4 w-32 h-44 rounded-xl border-2 border-white/30 object-cover" />
        {/* Controls */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex gap-4">
          <button onClick={onEnd} className="w-14 h-14 rounded-full bg-red-500 text-white flex items-center justify-center">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg>
          </button>
        </div>
        {status !== 'connected' && (
          <div className="absolute inset-0 flex items-center justify-center text-white text-xl">
            {status === 'calling' ? 'Calling...' : 'Call ended'}
          </div>
        )}
      </div>
    </div>
  );
}