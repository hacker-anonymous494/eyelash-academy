import { useRef, useState, useEffect, useCallback } from 'react';
import { supabase } from '@/config/supabase';

const ICE_SERVERS = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  { urls: 'turn:openrelay.metered.ca:80', username: 'openrelayproject', credential: 'openrelayproject' },
  { urls: 'turn:openrelay.metered.ca:443', username: 'openrelayproject', credential: 'openrelayproject' },
  { urls: 'turn:openrelay.metered.ca:443?transport=tcp', username: 'openrelayproject', credential: 'openrelayproject' },
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
  const iceCandidateQueue  = useRef([]);
  const remoteDescSet      = useRef(false);
  const signalingReady     = useRef(false);
  const statusRef          = useRef('idle');
  const mountedRef         = useRef(true);
  const handleSignalRef    = useRef(null);
  const offerSent          = useRef(false);

  const safeSetStatus = useCallback((s) => {
    if (!mountedRef.current) return;
    statusRef.current = s;
    setStatus(s);
  }, []);

  const sendSignal = useCallback((data) => {
    if (channelRef.current && signalingReady.current) {
      channelRef.current.send({
        type: 'broadcast',
        event: 'signal',
        payload: { ...data, _from: userId },
      });
    }
  }, [userId]);

  const drainQueue = useCallback(async (peer) => {
    const q = iceCandidateQueue.current.splice(0);
    for (const c of q) {
      try { await peer.addIceCandidate(new RTCIceCandidate(c)); } catch (_) {}
    }
  }, []);

  const createPeerConnection = useCallback(async (asOfferer) => {
    setError(null);

    if (!streamRef.current) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        if (!mountedRef.current) { stream.getTracks().forEach(t => t.stop()); return null; }
        streamRef.current = stream;
        setLocalStream(stream);
      } catch (err) {
        const msg = err.name === 'NotAllowedError'
          ? 'Camera/microphone access denied. Please allow and try again.'
          : `Media error: ${err.message}`;
        setError(msg);
        safeSetStatus('idle');
        return null;
      }
    }

    if (peerRef.current) {
      peerRef.current.close();
      peerRef.current = null;
    }

    const peer = new RTCPeerConnection({ iceServers: ICE_SERVERS });
    peerRef.current = peer;
    remoteDescSet.current = false;
    iceCandidateQueue.current = [];

    streamRef.current.getTracks().forEach(track =>
      peer.addTrack(track, streamRef.current)
    );

    peer.ontrack = (e) => {
      if (!mountedRef.current) return;
      setRemoteStream(e.streams[0]);
      safeSetStatus('connected');
    };

    peer.onicecandidate = (e) => {
      if (e.candidate) {
        sendSignal({ type: 'ice', candidate: e.candidate.toJSON() });
      }
    };

    peer.oniceconnectionstatechange = () => {
      const s = peer.iceConnectionState;
      console.debug('[WebRTC] ICE state:', s);
      if (s === 'connected' || s === 'completed') safeSetStatus('connected');
      if (s === 'failed') {
        try { peer.restartIce(); } catch (_) {}
        setError('Connection unstable — attempting reconnect…');
      }
      if (s === 'disconnected') safeSetStatus('calling');
    };

    peer.onconnectionstatechange = () => {
      const s = peer.connectionState;
      console.debug('[WebRTC] connection state:', s);
      if (s === 'failed') setError('Peer connection failed. Please end and rejoin.');
      if (s === 'closed' && statusRef.current !== 'ended') safeSetStatus('ended');
    };

    if (asOfferer) {
      const offer = await peer.createOffer({ offerToReceiveAudio: true, offerToReceiveVideo: true });
      await peer.setLocalDescription(offer);
      sendSignal({ type: 'offer', sdp: peer.localDescription });
      offerSent.current = true;
    }

    return peer;
  }, [sendSignal, safeSetStatus, drainQueue]);

  // Signal handler
  const handleSignal = useCallback(async (data) => {
    if (data._from === userId) return;

    if (data.type === 'ready') {
      // answerer is present; if we are offerer and haven't sent an offer, do it now
      if (offerSent.current) return;
      const peer = peerRef.current;
      if (!peer) return;
      try {
        const offer = await peer.createOffer({ offerToReceiveAudio: true, offerToReceiveVideo: true });
        await peer.setLocalDescription(offer);
        sendSignal({ type: 'offer', sdp: peer.localDescription });
        offerSent.current = true;
      } catch (e) { console.error(e); }
      return;
    }

    if (data.type === 'offer') {
      if (!peerRef.current) {
        const peer = await createPeerConnection(false);
        if (!peer) return;
      }
      const peer = peerRef.current;
      if (!peer) return;
      try {
        await peer.setRemoteDescription(new RTCSessionDescription(data.sdp));
        remoteDescSet.current = true;
        await drainQueue(peer);
        const answer = await peer.createAnswer();
        await peer.setLocalDescription(answer);
        sendSignal({ type: 'answer', sdp: peer.localDescription });
        safeSetStatus('calling');
      } catch (e) {
        console.error('[WebRTC] offer handling error:', e);
        setError('Failed to process connection offer.');
      }
      return;
    }

    if (data.type === 'answer') {
      const peer = peerRef.current;
      if (!peer) return;
      if (peer.signalingState !== 'have-local-offer') return;
      try {
        await peer.setRemoteDescription(new RTCSessionDescription(data.sdp));
        remoteDescSet.current = true;
        await drainQueue(peer);
      } catch (e) {
        console.error('[WebRTC] answer handling error:', e);
      }
      return;
    }

    if (data.type === 'ice') {
      const peer = peerRef.current;
      if (!peer || !remoteDescSet.current) {
        iceCandidateQueue.current.push(data.candidate);
        return;
      }
      try { await peer.addIceCandidate(new RTCIceCandidate(data.candidate)); } catch (_) {}
      return;
    }

    if (data.type === 'end') {
      _cleanup(false);
    }
  }, [userId, createPeerConnection, sendSignal, safeSetStatus, drainQueue]);

  handleSignalRef.current = handleSignal;

  // Subscribe to signaling channel
  useEffect(() => {
    if (!sessionId || !userId) return;

    const channel = supabase.channel(`webrtc_${sessionId}`);
    channelRef.current = channel;

    channel
      .on('broadcast', { event: 'signal' }, (msg) => {
        handleSignalRef.current?.(msg.payload);
      })
      .subscribe((s) => {
        if (s === 'SUBSCRIBED') {
          signalingReady.current = true;
          console.log('[WebRTC] signaling channel SUBSCRIBED');
        }
      });

    return () => {
      supabase.removeChannel(channel);
      channelRef.current = null;
      signalingReady.current = false;
    };
  }, [sessionId, userId]);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      _cleanup(false);
    };
  }, []);

  function _cleanup(sendEnd = true) {
    if (sendEnd && channelRef.current && signalingReady.current) {
      try {
        channelRef.current.send({
          type: 'broadcast', event: 'signal',
          payload: { type: 'end', _from: userId },
        });
      } catch (_) {}
    }
    if (peerRef.current) { peerRef.current.close(); peerRef.current = null; }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    iceCandidateQueue.current = [];
    remoteDescSet.current = false;
  }

  // Public API
  const startCall = useCallback(async () => {
    if (statusRef.current === 'calling' || statusRef.current === 'connected') return;
    safeSetStatus('calling');
    setError(null);

    if (!signalingReady.current) {
      await new Promise(resolve => {
        const check = setInterval(() => {
          if (signalingReady.current) { clearInterval(check); resolve(); }
        }, 100);
        setTimeout(() => { clearInterval(check); resolve(); }, 3000);
      });
    }

    const { data: sess } = await supabase
      .from('video_call_sessions')
      .select('offerer_id')
      .eq('id', sessionId)
      .single();

    if (!sess) { setError('Session not found.'); safeSetStatus('idle'); return; }

    if (!sess.offerer_id) {
      const { error: claimErr } = await supabase
        .from('video_call_sessions')
        .update({ offerer_id: userId })
        .eq('id', sessionId)
        .is('offerer_id', null);

      if (!claimErr) {
        // We are offerer
        const peer = await createPeerConnection(false); // false because we'll send offer after ready
        if (peer) {
          // Wait for answerer to signal ready, OR if they already joined (joined_by includes them), send now
          const { data: session } = await supabase.from('video_call_sessions').select('joined_by').eq('id', sessionId).single();
          const joined = session?.joined_by || [];
          if (joined.length > 0) {
            // Answerer already present, send offer immediately
            const offer = await peer.createOffer({ offerToReceiveAudio: true, offerToReceiveVideo: true });
            await peer.setLocalDescription(offer);
            sendSignal({ type: 'offer', sdp: peer.localDescription });
            offerSent.current = true;
          }
          // else we wait for 'ready' signal to send offer (handled in handleSignal)
        }
      } else {
        await createPeerConnection(false); // answerer
      }
    } else if (sess.offerer_id === userId) {
      await createPeerConnection(true); // rejoin as offerer
    } else {
      // Answerer: create peer and send 'ready'
      const peer = await createPeerConnection(false);
      if (peer) {
        sendSignal({ type: 'ready' });
      }
    }
  }, [sessionId, userId, safeSetStatus, createPeerConnection, sendSignal]);

  const endCall = useCallback(() => {
    _cleanup(true);
    setLocalStream(null);
    setRemoteStream(null);
    safeSetStatus('ended');
  }, [safeSetStatus]);

  const toggleMute = useCallback(() => {
    if (!streamRef.current) return;
    streamRef.current.getAudioTracks().forEach(t => { t.enabled = !t.enabled; });
    setIsMuted(p => !p);
  }, []);

  const toggleCamera = useCallback(() => {
    if (!streamRef.current) return;
    streamRef.current.getVideoTracks().forEach(t => { t.enabled = !t.enabled; });
    setIsCamOff(p => !p);
  }, []);

  return { localStream, remoteStream, status, error, isMuted, isCamOff, startCall, endCall, toggleMute, toggleCamera };
}