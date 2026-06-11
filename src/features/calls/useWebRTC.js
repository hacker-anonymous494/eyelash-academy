import { useRef, useState, useEffect, useCallback } from 'react';
import { supabase } from '@/config/supabase';

const ICE_SERVERS = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  { urls: 'turn:openrelay.metered.ca:80', username: 'openrelayproject', credential: 'openrelayproject' },
  { urls: 'turn:openrelay.metered.ca:443', username: 'openrelayproject', credential: 'openrelayproject' },
];

export function useWebRTC(sessionId, userId) {
  const [localStream, setLocalStream]   = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [status, setStatus]             = useState('idle');
  const [error, setError]               = useState(null);
  const [isMuted, setIsMuted]           = useState(false);
  const [isCamOff, setIsCamOff]         = useState(false);

  const peerRef            = useRef(null);
  const channelRef         = useRef(null);
  const streamRef          = useRef(null);
  const remoteDescSet      = useRef(false);
  const statusRef          = useRef('idle');
  const mountedRef         = useRef(true);
  const signalSubRef       = useRef(null); // subscription for signal table

  const safeSetStatus = useCallback((s) => {
    if (!mountedRef.current) return;
    statusRef.current = s;
    setStatus(s);
  }, []);

  // Send via both broadcast and database
  const sendSignalDual = useCallback(async (data) => {
    if (!sessionId || !userId) return;
    const payload = { ...data, _from: userId };

    // 1. Broadcast (best-effort)
    if (channelRef.current) {
      channelRef.current.send({
        type: 'broadcast',
        event: 'signal',
        payload,
      }).catch(() => {});
    }

    // 2. Database (guaranteed delivery)
    await supabase.from('webrtc_signals').insert({
      session_id: sessionId,
      sender_id: userId,
      type: payload.type,
      data: payload,
    });
  }, [sessionId, userId]);

  // Listen for database signals
  useEffect(() => {
    if (!sessionId || !userId) return;

    // Polling fallback – remove after broadcast works
    const dbSubscription = supabase
      .channel(`db_signals_${sessionId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'webrtc_signals', filter: `session_id=eq.${sessionId}` },
        (payload) => {
          const signal = payload.new;
          if (signal.sender_id !== userId) {
            console.log('[WebRTC] DB signal received:', signal.type);
            handleSignal(signal.data);
          }
        }
      )
      .subscribe();

    signalSubRef.current = dbSubscription;

    return () => {
      supabase.removeChannel(dbSubscription);
    };
  }, [sessionId, userId]);

  // Cleanup on unmount
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      _cleanup(false);
    };
  }, []);

  function _cleanup(sendEnd = true) {
    if (sendEnd) {
      sendSignalDual({ type: 'end' }).catch(() => {});
    }
    if (peerRef.current) { peerRef.current.close(); peerRef.current = null; }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
  }

  const createPeerConnection = useCallback(async (asOfferer) => {
    setError(null);

    if (!streamRef.current) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        if (!mountedRef.current) { stream.getTracks().forEach(t => t.stop()); return null; }
        streamRef.current = stream;
        setLocalStream(stream);
      } catch (err) {
        setError('Camera/microphone access denied.');
        safeSetStatus('idle');
        return null;
      }
    }

    const peer = new RTCPeerConnection({ iceServers: ICE_SERVERS });
    peerRef.current = peer;
    remoteDescSet.current = false;

    streamRef.current.getTracks().forEach(track => peer.addTrack(track, streamRef.current));

    peer.ontrack = (e) => {
      if (!mountedRef.current) return;
      setRemoteStream(e.streams[0]);
      safeSetStatus('connected');
    };

    peer.onicecandidate = (e) => {
      if (e.candidate) {
        sendSignalDual({ type: 'ice', candidate: e.candidate.toJSON() });
      }
    };

    peer.oniceconnectionstatechange = () => {
      const s = peer.iceConnectionState;
      console.log('[WebRTC] ICE state:', s);
      if (s === 'connected' || s === 'completed') safeSetStatus('connected');
      if (s === 'failed') setError('Connection failed. Please rejoin.');
    };

    if (asOfferer) {
      const offer = await peer.createOffer({ offerToReceiveAudio: true, offerToReceiveVideo: true });
      await peer.setLocalDescription(offer);
      await sendSignalDual({ type: 'offer', sdp: peer.localDescription });
    }

    return peer;
  }, [sendSignalDual, safeSetStatus]);

  const handleSignal = useCallback(async (data) => {
    if (!peerRef.current) {
      if (data.type === 'offer') {
        await createPeerConnection(false);
        // Wait for peer to be set, then process offer
        setTimeout(() => handleSignal(data), 100);
      }
      return;
    }

    const peer = peerRef.current;
    try {
      if (data.type === 'offer') {
        await peer.setRemoteDescription(new RTCSessionDescription(data.sdp));
        remoteDescSet.current = true;
        const answer = await peer.createAnswer();
        await peer.setLocalDescription(answer);
        await sendSignalDual({ type: 'answer', sdp: peer.localDescription });
      } else if (data.type === 'answer') {
        await peer.setRemoteDescription(new RTCSessionDescription(data.sdp));
        remoteDescSet.current = true;
      } else if (data.type === 'ice') {
        if (!remoteDescSet.current) {
          // buffer? not needed since we wait for remote desc first
          setTimeout(() => handleSignal(data), 200);
          return;
        }
        await peer.addIceCandidate(new RTCIceCandidate(data.candidate));
      }
    } catch (e) {
      console.error('[WebRTC] signal error:', e);
    }
  }, [createPeerConnection, sendSignalDual]);

  // Subscribe to broadcast channel (for non-persistent signals)
  useEffect(() => {
    if (!sessionId || !userId) return;

    const channel = supabase.channel(`webrtc_${sessionId}`);
    channelRef.current = channel;

    channel
      .on('broadcast', { event: 'signal' }, (msg) => {
        const data = msg.payload;
        if (data._from === userId) return; // ignore own broadcast
        console.log('[WebRTC] broadcast received:', data.type);
        handleSignal(data);
      })
      .subscribe((s) => {
        if (s === 'SUBSCRIBED') {
          console.log('[WebRTC] broadcast channel SUBSCRIBED');
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [sessionId, userId, handleSignal]);

  const startCall = useCallback(async () => {
    if (statusRef.current === 'calling' || statusRef.current === 'connected') return;
    safeSetStatus('calling');
    setError(null);

    // Determine offerer role
    const { data: sess } = await supabase
      .from('video_call_sessions')
      .select('offerer_id')
      .eq('id', sessionId)
      .single();

    if (!sess) { setError('Session not found'); safeSetStatus('idle'); return; }

    if (!sess.offerer_id) {
      await supabase.from('video_call_sessions').update({ offerer_id: userId }).eq('id', sessionId).is('offerer_id', null);
      await createPeerConnection(true);
    } else if (sess.offerer_id === userId) {
      await createPeerConnection(true);
    } else {
      await createPeerConnection(false);
    }
  }, [sessionId, userId, safeSetStatus, createPeerConnection]);

  const endCall = useCallback(() => {
    _cleanup(true);
    setLocalStream(null);
    setRemoteStream(null);
    safeSetStatus('ended');
  }, [safeSetStatus]);

  const toggleMute = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getAudioTracks().forEach(t => { t.enabled = !t.enabled; });
      setIsMuted(p => !p);
    }
  }, []);

  const toggleCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getVideoTracks().forEach(t => { t.enabled = !t.enabled; });
      setIsCamOff(p => !p);
    }
  }, []);

  return { localStream, remoteStream, status, error, isMuted, isCamOff, startCall, endCall, toggleMute, toggleCamera };
}