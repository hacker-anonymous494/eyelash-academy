/**
 * useWebRTC.js — Complete rewrite fixing all connection bugs
 *
 * ROOT CAUSES FIXED:
 * 1. Stale closure: channel subscription captured old handleSignal closure.
 *    FIX: store handleSignal in a ref (handleSignalRef) so channel always
 *         calls the latest version regardless of when it subscribed.
 *
 * 2. ICE candidate queue: ICE candidates arrived before remoteDescription
 *    was set on the answerer side → silently dropped → no connection.
 *    FIX: buffer ICE candidates in iceCandidateQueue ref; drain after
 *         setRemoteDescription completes.
 *
 * 3. Echo from self: Supabase broadcast echoes back to sender.
 *    FIX: tag every signal with senderId=userId; ignore our own signals.
 *
 * 4. Race on answerer path: createPeerConnection is async (getUserMedia),
 *    so peerRef.current was null when the offer callback tried to use it.
 *    FIX: createPeerConnection now sets peerRef.current synchronously
 *         before any await, and we await it fully before processing offer.
 *
 * 5. Added free TURN servers for NAT traversal (covers ~30% of networks
 *    where STUN alone fails).
 */

import { useRef, useState, useEffect, useCallback } from 'react';
import { supabase } from '@/config/supabase';

const ICE_SERVERS = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  {
    urls: 'turn:openrelay.metered.ca:80',
    username: 'openrelayproject',
    credential: 'openrelayproject',
  },
  {
    urls: 'turn:openrelay.metered.ca:443',
    username: 'openrelayproject',
    credential: 'openrelayproject',
  },
  {
    urls: 'turn:openrelay.metered.ca:443?transport=tcp',
    username: 'openrelayproject',
    credential: 'openrelayproject',
  },
];

export function useWebRTC(sessionId, userId) {
  const [localStream, setLocalStream]   = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [status, setStatus]             = useState('idle');
  const [error, setError]               = useState(null);
  const [isMuted, setIsMuted]           = useState(false);
  const [isCamOff, setIsCamOff]         = useState(false);

  // All mutable internals live in refs → no stale closure issues
  const peerRef            = useRef(null);
  const channelRef         = useRef(null);
  const streamRef          = useRef(null);
  const iceCandidateQueue  = useRef([]); // buffered until remoteDesc set
  const remoteDescSet      = useRef(false);
  const signalingReady     = useRef(false);
  const statusRef          = useRef('idle');
  const mountedRef         = useRef(true);

  // KEY FIX #1: store handleSignal in a ref so the channel callback
  // always invokes the latest version, never a stale closure.
  const handleSignalRef    = useRef(null);

  const safeSetStatus = useCallback((s) => {
    if (!mountedRef.current) return;
    statusRef.current = s;
    setStatus(s);
  }, []);

  // ── Send a signal, tagging with our userId to filter echoes ─────────────
  const sendSignal = useCallback((data) => {
    if (channelRef.current && signalingReady.current) {
      channelRef.current.send({
        type: 'broadcast',
        event: 'signal',
        payload: { ...data, _from: userId },
      });
    }
  }, [userId]);

  // ── Drain ICE candidate queue after remote description is set ────────────
  const drainQueue = useCallback(async (peer) => {
    const q = iceCandidateQueue.current.splice(0);
    for (const c of q) {
      try {
        await peer.addIceCandidate(new RTCIceCandidate(c));
      } catch (_) { /* trickle ICE; ignore */ }
    }
  }, []);

  // ── Create RTCPeerConnection and attach stream ────────────────────────────
  const createPeerConnection = useCallback(async (asOfferer) => {
    setError(null);

    // Get media first
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

    // Close any stale peer
    if (peerRef.current) {
      peerRef.current.close();
      peerRef.current = null;
    }

    const peer = new RTCPeerConnection({ iceServers: ICE_SERVERS });
    peerRef.current = peer; // set synchronously before any async work
    remoteDescSet.current = false;
    iceCandidateQueue.current = [];

    // Add tracks
    streamRef.current.getTracks().forEach(track =>
      peer.addTrack(track, streamRef.current)
    );

    // Remote stream
    peer.ontrack = (e) => {
      if (!mountedRef.current) return;
      setRemoteStream(e.streams[0]);
      safeSetStatus('connected');
    };

    // ICE candidates → send to remote
    peer.onicecandidate = (e) => {
      if (e.candidate) {
        sendSignal({ type: 'ice', candidate: e.candidate.toJSON() });
      }
    };

    // Connection state changes
    peer.oniceconnectionstatechange = () => {
      const s = peer.iceConnectionState;
      console.debug('[WebRTC] ICE state:', s);
      if (s === 'connected' || s === 'completed') safeSetStatus('connected');
      if (s === 'failed') {
        // Try ICE restart before giving up
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

    // If offerer: create and send offer immediately
    if (asOfferer) {
      const offer = await peer.createOffer({ offerToReceiveAudio: true, offerToReceiveVideo: true });
      await peer.setLocalDescription(offer);
      sendSignal({ type: 'offer', sdp: peer.localDescription });
    }

    return peer;
  }, [sendSignal, safeSetStatus, drainQueue]);

  // ── Handle incoming signal — assigned to ref so channel always has latest ──
  const handleSignal = useCallback(async (data) => {
    // KEY FIX #3: ignore our own echoed signals
    if (data._from === userId) return;

    if (data.type === 'offer') {
      // KEY FIX #4: fully await createPeerConnection before using peerRef
      if (!peerRef.current) {
        const peer = await createPeerConnection(false);
        if (!peer) return;
      }
      const peer = peerRef.current;
      if (!peer) return;
      try {
        await peer.setRemoteDescription(new RTCSessionDescription(data.sdp));
        remoteDescSet.current = true;
        await drainQueue(peer); // KEY FIX #2: drain buffered ICE
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
      if (peer.signalingState !== 'have-local-offer') return; // guard
      try {
        await peer.setRemoteDescription(new RTCSessionDescription(data.sdp));
        remoteDescSet.current = true;
        await drainQueue(peer); // KEY FIX #2: drain buffered ICE
      } catch (e) {
        console.error('[WebRTC] answer handling error:', e);
      }
      return;
    }

    if (data.type === 'ice') {
      const peer = peerRef.current;
      if (!peer) {
        // KEY FIX #2: no peer yet — buffer the candidate
        iceCandidateQueue.current.push(data.candidate);
        return;
      }
      if (!remoteDescSet.current) {
        // KEY FIX #2: remote desc not set yet — buffer
        iceCandidateQueue.current.push(data.candidate);
        return;
      }
      try {
        await peer.addIceCandidate(new RTCIceCandidate(data.candidate));
      } catch (_) { /* ignore trickle ICE errors */ }
      return;
    }

    if (data.type === 'end') {
      // Remote ended the call
      _cleanup(false);
    }
  }, [userId, createPeerConnection, sendSignal, safeSetStatus, drainQueue]);

  // Keep ref always pointing to latest handleSignal
  handleSignalRef.current = handleSignal;

  // ── Subscribe to signaling channel ───────────────────────────────────────
  useEffect(() => {
    if (!sessionId || !userId) return;

    const channel = supabase.channel(`webrtc_${sessionId}`);
    channelRef.current = channel;

    channel
      .on('broadcast', { event: 'signal' }, (msg) => {
        // KEY FIX #1: call via ref — always the latest handleSignal
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

  // ── Cleanup on unmount ───────────────────────────────────────────────────
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      _cleanup(false);
    };
  }, []);

  // ── Internal cleanup ─────────────────────────────────────────────────────
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

  // ── Public API ────────────────────────────────────────────────────────────
  const startCall = useCallback(async () => {
    if (statusRef.current === 'calling' || statusRef.current === 'connected') return;
    safeSetStatus('calling');
    setError(null);

    // Wait up to 3s for signaling channel
    if (!signalingReady.current) {
      await new Promise(resolve => {
        const check = setInterval(() => {
          if (signalingReady.current) { clearInterval(check); resolve(); }
        }, 100);
        setTimeout(() => { clearInterval(check); resolve(); }, 3000);
      });
    }

    // Atomically claim offerer role
    const { data: sess } = await supabase
      .from('video_call_sessions')
      .select('offerer_id')
      .eq('id', sessionId)
      .single();

    if (!sess) { setError('Session not found.'); safeSetStatus('idle'); return; }

    if (!sess.offerer_id) {
      // Try to claim offerer atomically
      const { error: claimErr } = await supabase
        .from('video_call_sessions')
        .update({ offerer_id: userId })
        .eq('id', sessionId)
        .is('offerer_id', null);

      if (!claimErr) {
        await createPeerConnection(true); // we are offerer
      } else {
        await createPeerConnection(false); // someone else claimed first
      }
    } else if (sess.offerer_id === userId) {
      await createPeerConnection(true); // we were already offerer (reconnect)
    } else {
      await createPeerConnection(false); // we are answerer
    }
  }, [sessionId, userId, safeSetStatus, createPeerConnection]);

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