import { useRef, useState, useEffect, useCallback } from 'react';
import { supabase } from '@/config/supabase';

export function useWebRTC(sessionId, userId) {
  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [status, setStatus] = useState('idle');
  const peerRef = useRef(null);
  const channelRef = useRef(null);
  const localStreamRef = useRef(null);
  const isOfferer = useRef(false);

  // ── sendSignal defined first as a stable ref ──
  const channelRefForSend = useRef(null);
  const sendSignal = useCallback((data) => {
    if (channelRefForSend.current) {
      channelRefForSend.current.send({
        type: 'broadcast',
        event: 'signal',
        payload: data,
      });
    }
  }, []);

  // ── Subscribe to the signaling channel ──
  useEffect(() => {
    if (!sessionId || !userId) return;
    const channel = supabase.channel(`webrtc_${sessionId}`);
    channelRef.current = channel;
    channelRefForSend.current = channel;

    channel
      .on('broadcast', { event: 'signal' }, (payload) => {
        handleSignal(payload.payload);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      channelRef.current = null;
      channelRefForSend.current = null;
    };
  }, [sessionId, userId]);

  // ── createPeer must come before handleSignal in the file order ──
  const createPeer = useCallback(async (asOfferer) => {
    let stream = localStreamRef.current;
    if (!stream) {
      stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      localStreamRef.current = stream;
      setLocalStream(stream);
    }

    const peer = new RTCPeerConnection({
      iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
    });

    stream.getTracks().forEach(track => peer.addTrack(track, stream));

    peer.onicecandidate = (e) => {
      if (e.candidate) {
        sendSignal({ type: 'ice', candidate: e.candidate.toJSON() });
      }
    };

    peer.ontrack = (e) => {
      setRemoteStream(e.streams[0]);
      setStatus('connected');
    };

    peer.oniceconnectionstatechange = () => {
      if (peer.iceConnectionState === 'disconnected' || peer.iceConnectionState === 'failed') {
        setStatus('ended');
      }
    };

    peerRef.current = peer;

    if (asOfferer) {
      isOfferer.current = true;
      setTimeout(async () => {
        const offer = await peer.createOffer();
        await peer.setLocalDescription(offer);
        sendSignal({ type: 'offer', sdp: peer.localDescription });
      }, 1000);
    }
  }, [sendSignal]);   // sendSignal is stable

  // ── handleSignal (after createPeer) ──
  const handleSignal = useCallback(async (data) => {
    if (!peerRef.current) {
      if (data.type === 'offer') {
        await createPeer(false);
        isOfferer.current = false;
      } else {
        return;
      }
    }

    const peer = peerRef.current;
    try {
      if (data.type === 'offer') {
        await peer.setRemoteDescription(new RTCSessionDescription(data.sdp));
        const answer = await peer.createAnswer();
        await peer.setLocalDescription(answer);
        sendSignal({ type: 'answer', sdp: peer.localDescription });
      } else if (data.type === 'answer') {
        await peer.setRemoteDescription(new RTCSessionDescription(data.sdp));
      } else if (data.type === 'ice') {
        await peer.addIceCandidate(new RTCIceCandidate(data.candidate));
      }
    } catch (e) {
      console.error('Signal error:', e);
    }
  }, [createPeer, sendSignal]);

  // ── startCall determines offerer/answerer ──
  const startCall = useCallback(async () => {
    setStatus('calling');
    const { data: session } = await supabase
      .from('video_call_sessions')
      .select('offerer_id')
      .eq('id', sessionId)
      .single();

    if (!session) return;

    if (!session.offerer_id) {
      await supabase
        .from('video_call_sessions')
        .update({ offerer_id: userId })
        .eq('id', sessionId);
      await createPeer(true);
    } else {
      await createPeer(false);
    }
  }, [sessionId, userId, createPeer]);

  // ── endCall cleans up ──
  const endCall = useCallback(() => {
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(t => t.stop());
      localStreamRef.current = null;
    }
    if (peerRef.current) {
      peerRef.current.close();
      peerRef.current = null;
    }
    setLocalStream(null);
    setRemoteStream(null);
    setStatus('idle');
  }, []);

  return { localStream, remoteStream, status, startCall, endCall };
}