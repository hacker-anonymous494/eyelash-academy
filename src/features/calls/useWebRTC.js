import { useRef, useState, useEffect, useCallback } from 'react';
import { supabase } from '@/config/supabase';

export function useWebRTC(sessionId, userId) {
  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [status, setStatus] = useState('idle'); // idle / calling / connected / ended
  const peerRef = useRef(null);
  const channelRef = useRef(null);

  useEffect(() => {
    if (!sessionId || !userId) return;
    const channel = supabase.channel(`webrtc_${sessionId}`);
    channelRef.current = channel;

    channel
      .on('broadcast', { event: 'signal' }, (payload) => {
        handleSignal(payload.payload);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      cleanupMedia();
    };
  }, [sessionId, userId]);

  const cleanupMedia = () => {
    if (localStream) {
      localStream.getTracks().forEach(t => t.stop());
      setLocalStream(null);
    }
    if (peerRef.current) {
      peerRef.current.close();
      peerRef.current = null;
    }
    setRemoteStream(null);
    setStatus('idle');
  };

  const handleSignal = async (data) => {
    if (!peerRef.current) await createPeer();
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
  };

  const createPeer = async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
    setLocalStream(stream);
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
    return peer;
  };

  const sendSignal = (data) => {
    channelRef.current?.send({
      type: 'broadcast',
      event: 'signal',
      payload: data,
    });
  };

  const startCall = async () => {
    setStatus('calling');
    await createPeer();
    const peer = peerRef.current;
    const offer = await peer.createOffer();
    await peer.setLocalDescription(offer);
    sendSignal({ type: 'offer', sdp: peer.localDescription });
  };

  const endCall = () => {
    cleanupMedia();
  };

  return { localStream, remoteStream, status, startCall, endCall };
}