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
  const readyReceived      = useRef(false);
  const offerSent          = useRef(false);

  // Hold the latest handleSignal so effects always call the current version
  const handleSignalRef    = useRef(null);

  const safeSetStatus = useCallback((s) => {
    if (!mountedRef.current) return;
    statusRef.current = s;
    setStatus(s);
  }, []);

  // ── Send signal via broadcast + database ────────────────────────────────
  const sendSignalDual = useCallback(async (data) => {
    if (!sessionId || !userId) return;
    const payload = { ...data, _from: userId };

    if (channelRef.current) {
      channelRef.current.send({
        type: 'broadcast',
        event: 'signal',
        payload,
      }).catch(() => {});
    }

    await supabase.from('webrtc_signals').insert({
      session_id: sessionId,
      sender_id: userId,
      type: payload.type,
      data: payload,
    });
  }, [sessionId, userId]);

  // ── Create RTCPeerConnection ─────────────────────────────────────────────
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

    return peer;
  }, [sendSignalDual, safeSetStatus]);

  // ── Send offer (only after ready signal or if already answered) ─────────
  const sendOffer = useCallback(async () => {
    if (!peerRef.current || offerSent.current) return;
    const peer = peerRef.current;
    try {
      const offer = await peer.createOffer({ offerToReceiveAudio: true, offerToReceiveVideo: true });
      await peer.setLocalDescription(offer);
      await sendSignalDual({ type: 'offer', sdp: peer.localDescription });
      offerSent.current = true;
      console.log('[WebRTC] Offer sent');
    } catch (e) {
      console.error('[WebRTC] Failed to send offer:', e);
    }
  }, [sendSignalDual]);

  // ── handleSignal – must be defined BEFORE effects that use it ────────────
  const handleSignal = useCallback(async (data) => {
    if (data._from === userId) return;

    if (data.type === 'ready') {
      console.log('[WebRTC] ready received');
      readyReceived.current = true;
      if (!offerSent.current) await sendOffer();
      return;
    }

    if (data.type === 'offer') {
      console.log('[WebRTC] offer received');
      if (!peerRef.current) {
        await createPeerConnection(false);
        await new Promise(r => setTimeout(r, 200));
      }
      const peer = peerRef.current;
      if (!peer) return;
      try {
        await peer.setRemoteDescription(new RTCSessionDescription(data.sdp));
        remoteDescSet.current = true;
        const answer = await peer.createAnswer();
        await peer.setLocalDescription(answer);
        await sendSignalDual({ type: 'answer', sdp: peer.localDescription });
        console.log('[WebRTC] Answer sent');
      } catch (e) {
        console.error('[WebRTC] offer handling error:', e);
      }
      return;
    }

    if (data.type === 'answer') {
      console.log('[WebRTC] answer received');
      const peer = peerRef.current;
      if (!peer) return;
      try {
        await peer.setRemoteDescription(new RTCSessionDescription(data.sdp));
        remoteDescSet.current = true;
      } catch (e) {
        console.error('[WebRTC] answer error:', e);
      }
      return;
    }

    if (data.type === 'ice') {
      const peer = peerRef.current;
      if (!peer || !remoteDescSet.current) return;
      try {
        await peer.addIceCandidate(new RTCIceCandidate(data.candidate));
      } catch (e) {}
      return;
    }

    if (data.type === 'end') {
      _cleanup(false);
      safeSetStatus('ended');
    }
  }, [userId, sendOffer, createPeerConnection, sendSignalDual, safeSetStatus]);

  // Keep ref updated
  handleSignalRef.current = handleSignal;

  // ── Cleanup ─────────────────────────────────────────────────────────────
  function _cleanup(sendEnd = true) {
    if (sendEnd) {
      sendSignalDual({ type: 'end' }).catch(() => {});
    }
    if (peerRef.current) { peerRef.current.close(); peerRef.current = null; }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    readyReceived.current = false;
    offerSent.current = false;
  }

  // ── Listen for DB signals (real‑time) ──────────────────────────────────
  useEffect(() => {
    if (!sessionId || !userId) return;

    const dbChannel = supabase
      .channel(`db_signals_${sessionId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'webrtc_signals',
          filter: `session_id=eq.${sessionId}`,
        },
        (payload) => {
          const signal = payload.new;
          if (signal.sender_id !== userId) {
            console.log('[WebRTC] DB signal received:', signal.type);
            handleSignalRef.current?.(signal.data);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(dbChannel);
    };
  }, [sessionId, userId]);

  // ── Listen for broadcast signals ──────────────────────────────────────
  useEffect(() => {
    if (!sessionId || !userId) return;

    const channel = supabase.channel(`webrtc_${sessionId}`);
    channelRef.current = channel;

    channel
      .on('broadcast', { event: 'signal' }, (msg) => {
        const data = msg.payload;
        if (data._from === userId) return;
        console.log('[WebRTC] broadcast received:', data.type);
        handleSignalRef.current?.(data);
      })
      .subscribe((s) => {
        if (s === 'SUBSCRIBED') console.log('[WebRTC] broadcast channel SUBSCRIBED');
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [sessionId, userId]);

  // ── Poll existing signals on mount ──────────────────────────────────────
  useEffect(() => {
    if (!sessionId || !userId) return;
    const checkExisting = async () => {
      const { data: signals } = await supabase
        .from('webrtc_signals')
        .select('*')
        .eq('session_id', sessionId)
        .order('created_at', { ascending: true });

      if (!signals) return;
      for (const s of signals) {
        if (s.sender_id !== userId) {
          handleSignalRef.current?.(s.data);
        }
      }
    };
    checkExisting();
  }, [sessionId, userId]);

  // ── Mount/unmount cleanup ──────────────────────────────────────────────
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      _cleanup(false);
    };
  }, []);

  // ── startCall ──────────────────────────────────────────────────────────
  const startCall = useCallback(async () => {
    if (statusRef.current === 'calling' || statusRef.current === 'connected') return;
    safeSetStatus('calling');
    setError(null);

    const { data: sess } = await supabase
      .from('video_call_sessions')
      .select('offerer_id')
      .eq('id', sessionId)
      .single();

    if (!sess) { setError('Session not found'); safeSetStatus('idle'); return; }

    if (!sess.offerer_id) {
      await supabase.from('video_call_sessions').update({ offerer_id: userId }).eq('id', sessionId).is('offerer_id', null);
      await createPeerConnection(true);
      // Wait for ready – handleSignal will trigger sendOffer
    } else if (sess.offerer_id === userId) {
      await createPeerConnection(true);
      const { data: existingReady } = await supabase
        .from('webrtc_signals')
        .select('id')
        .eq('session_id', sessionId)
        .eq('type', 'ready')
        .maybeSingle();
      if (existingReady) {
        readyReceived.current = true;
        await sendOffer();
      }
    } else {
      await createPeerConnection(false);
      await sendSignalDual({ type: 'ready' });
      console.log('[WebRTC] ready sent');
    }
  }, [sessionId, userId, safeSetStatus, createPeerConnection, sendSignalDual, sendOffer]);

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