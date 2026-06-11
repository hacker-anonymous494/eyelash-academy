import { useRef, useState, useEffect, useCallback } from 'react';
import { supabase } from '@/config/supabase';

export function useWebRTC(sessionId, userId) {
  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [status, setStatus] = useState('idle'); // idle | calling | connected | ended
  const [error, setError] = useState(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isCamOff, setIsCamOff] = useState(false);
  const peerRef = useRef(null);
  const channelRef = useRef(null);
  const streamRef = useRef(null);
  const offererRef = useRef(false);
  const signalingReady = useRef(false);

  // ── Subscribe to signaling channel on mount ─────────────────────────────
  useEffect(() => {
    if (!sessionId || !userId) return;
    const channel = supabase.channel(`webrtc_${sessionId}`);
    channelRef.current = channel;

    channel
      .on('broadcast', { event: 'signal' }, (payload) => {
        const data = payload.payload;
        handleSignal(data);
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          signalingReady.current = true;
          console.log('[WebRTC] Signaling channel ready');
        }
      });

    return () => {
      supabase.removeChannel(channel);
      channelRef.current = null;
      signalingReady.current = false;
    };
  }, [sessionId, userId]);

  // ── Clean up media on unmount ───────────────────────────────────────────
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
        streamRef.current = null;
      }
      if (peerRef.current) {
        peerRef.current.close();
        peerRef.current = null;
      }
    };
  }, []);

  // ── Send signaling message ─────────────────────────────────────────────
  const sendSignal = useCallback((data) => {
    if (channelRef.current && signalingReady.current) {
      channelRef.current.send({
        type: 'broadcast',
        event: 'signal',
        payload: data,
      });
    }
  }, []);

  // ── Create peer connection (internal) ───────────────────────────────────
  const createPeerConnection = useCallback(async (asOfferer) => {
    setError(null);
    let stream = streamRef.current;
    if (!stream) {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        streamRef.current = stream;
        setLocalStream(stream);
      } catch (err) {
        setError('Camera/microphone access denied.');
        setStatus('idle');
        return null;
      }
    }

    const peer = new RTCPeerConnection({
      iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
    });

    stream.getTracks().forEach(track => peer.addTrack(track, stream));

    peer.onicecandidate = (event) => {
      if (event.candidate) {
        sendSignal({ type: 'ice', candidate: event.candidate.toJSON() });
      }
    };

    peer.ontrack = (event) => {
      setRemoteStream(event.streams[0]);
      setStatus('connected');
    };

    peer.oniceconnectionstatechange = () => {
      if (
        peer.iceConnectionState === 'disconnected' ||
        peer.iceConnectionState === 'failed'
      ) {
        setStatus('ended');
      }
    };

    peerRef.current = peer;
    offererRef.current = asOfferer;

    if (asOfferer) {
      const offer = await peer.createOffer();
      await peer.setLocalDescription(offer);
      sendSignal({ type: 'offer', sdp: peer.localDescription });
    }

    return peer;
  }, [sendSignal]);

  // ── Handle incoming signaling data ─────────────────────────────────────
  const handleSignal = useCallback(async (data) => {
    // If we don't have a peer yet and we receive an offer, we are the answerer
    if (!peerRef.current) {
      if (data.type === 'offer') {
        await createPeerConnection(false);
        // After creating the peer, process the offer
        const peer = peerRef.current;
        if (!peer) return;
        try {
          await peer.setRemoteDescription(new RTCSessionDescription(data.sdp));
          const answer = await peer.createAnswer();
          await peer.setLocalDescription(answer);
          sendSignal({ type: 'answer', sdp: peer.localDescription });
        } catch (e) { console.error(e); }
      }
      return;
    }

    const peer = peerRef.current;
    try {
      if (data.type === 'offer') {
        // Should not happen if we are already offerer, but just in case
        await peer.setRemoteDescription(new RTCSessionDescription(data.sdp));
        const answer = await peer.createAnswer();
        await peer.setLocalDescription(answer);
        sendSignal({ type: 'answer', sdp: peer.localDescription });
      } else if (data.type === 'answer') {
        await peer.setRemoteDescription(new RTCSessionDescription(data.sdp));
      } else if (data.type === 'ice') {
        await peer.addIceCandidate(new RTCIceCandidate(data.candidate));
      }
    } catch (e) { console.error(e); }
  }, [createPeerConnection, sendSignal]);

  // ── Public: start call (joins the room) ─────────────────────────────────
  const startCall = useCallback(async () => {
    if (status === 'calling' || status === 'connected') return;
    setStatus('calling');
    setError(null);

    // Wait for signaling to be ready
    if (!signalingReady.current) {
      // Try again in 500ms
      setTimeout(() => startCall(), 500);
      return;
    }

    // Determine if we are the offerer (first person in the room)
    const { data: session } = await supabase
      .from('video_call_sessions')
      .select('offerer_id')
      .eq('id', sessionId)
      .single();

    if (!session) {
      setError('Session not found.');
      setStatus('idle');
      return;
    }

    if (!session.offerer_id) {
      // Become the offerer
      await supabase
        .from('video_call_sessions')
        .update({ offerer_id: userId })
        .eq('id', sessionId);
      await createPeerConnection(true);
    } else {
      // Someone else is offerer; just create peer (it will wait for offer)
      await createPeerConnection(false);
    }
  }, [status, sessionId, userId, createPeerConnection]);

  // ── End call ───────────────────────────────────────────────────────────
  const endCall = useCallback(() => {
    if (peerRef.current) {
      peerRef.current.close();
      peerRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    setLocalStream(null);
    setRemoteStream(null);
    setStatus('idle');
  }, []);

  // ── Toggle mute ────────────────────────────────────────────────────────
  const toggleMute = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getAudioTracks().forEach(t => { t.enabled = !t.enabled; });
      setIsMuted(prev => !prev);
    }
  }, []);

  // ── Toggle camera ──────────────────────────────────────────────────────
  const toggleCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getVideoTracks().forEach(t => { t.enabled = !t.enabled; });
      setIsCamOff(prev => !prev);
    }
  }, []);

  return {
    localStream,
    remoteStream,
    status,
    error,
    isMuted,
    isCamOff,
    startCall,
    endCall,
    toggleMute,
    toggleCamera,
  };
}