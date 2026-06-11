import { useRef, useState, useCallback } from 'react';
import { supabase } from '@/config/supabase';

export function useWebRTC(sessionId, userId) {
  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isCamOff, setIsCamOff] = useState(false);

  const peerRef = useRef(null);
  const channelRef = useRef(null);
  const streamRef = useRef(null);

  const sendSignal = useCallback((data) => {
    channelRef.current?.send({ type: 'broadcast', event: 'signal', payload: data });
  }, []);

  const createPeer = useCallback(async (asOfferer) => {
    setError(null);
    if (!streamRef.current) {
      try {
        streamRef.current = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        setLocalStream(streamRef.current);
      } catch (err) {
        setError('Camera or microphone access denied. Please allow permissions.');
        setStatus('idle');
        return false;
      }
    }
    const peer = new RTCPeerConnection({ iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] });
    streamRef.current.getTracks().forEach(t => peer.addTrack(t, streamRef.current));
    peer.onicecandidate = (e) => {
      if (e.candidate) sendSignal({ type: 'ice', candidate: e.candidate.toJSON() });
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
      const offer = await peer.createOffer();
      await peer.setLocalDescription(offer);
      sendSignal({ type: 'offer', sdp: peer.localDescription });
    }
    return true;
  }, [sendSignal]);

  const handleSignal = useCallback(async (data) => {
    if (!peerRef.current) {
      if (data.type === 'offer') await createPeer(false);
      else return;
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
    } catch (e) { console.error(e); }
  }, [createPeer, sendSignal]);

  // Subscribe to signaling channel
  const subscribe = useCallback(() => {
    const channel = supabase.channel(`webrtc_${sessionId}`);
    channel.on('broadcast', { event: 'signal' }, (payload) => handleSignal(payload.payload)).subscribe();
    channelRef.current = channel;
  }, [sessionId, handleSignal]);

  const startCall = useCallback(async () => {
    setStatus('calling');
    if (!channelRef.current) subscribe();
    const { data: session } = await supabase
      .from('video_call_sessions')
      .select('offerer_id')
      .eq('id', sessionId)
      .single();
    if (!session) return;
    if (!session.offerer_id) {
      await supabase.from('video_call_sessions').update({ offerer_id: userId }).eq('id', sessionId);
      await createPeer(true);
    } else {
      await createPeer(false);
    }
  }, [sessionId, userId, createPeer, subscribe]);

  const endCall = useCallback(() => {
    if (peerRef.current) { peerRef.current.close(); peerRef.current = null; }
    if (streamRef.current) { streamRef.current.getTracks().forEach(t => t.stop()); streamRef.current = null; }
    setLocalStream(null);
    setRemoteStream(null);
    setStatus('idle');
  }, []);

  const toggleMute = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getAudioTracks().forEach(t => { t.enabled = !t.enabled; });
      setIsMuted(prev => !prev);
    }
  }, []);

  const toggleCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getVideoTracks().forEach(t => { t.enabled = !t.enabled; });
      setIsCamOff(prev => !prev);
    }
  }, []);

  return { localStream, remoteStream, status, error, isMuted, isCamOff, startCall, endCall, toggleMute, toggleCamera };
}