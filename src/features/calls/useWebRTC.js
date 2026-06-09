import { useRef, useState, useEffect, useCallback } from 'react';
import { supabase } from '@/config/supabase';

export function useWebRTC(sessionId, userId) {
  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState(null);
  const peerRef = useRef(null);
  const channelRef = useRef(null);
  const localStreamRef = useRef(null);
  const isOfferer = useRef(false);
  const channelRefForSend = useRef(null);

  const sendSignal = useCallback((data) => {
    channelRefForSend.current?.send({ type: 'broadcast', event: 'signal', payload: data });
  }, []);

  useEffect(() => {
    if (!sessionId || !userId) return;
    const channel = supabase.channel(`webrtc_${sessionId}`);
    channelRef.current = channel;
    channelRefForSend.current = channel;
    channel.on('broadcast', { event: 'signal' }, (payload) => handleSignal(payload.payload)).subscribe();
    return () => {
      supabase.removeChannel(channel);
      channelRef.current = null;
      channelRefForSend.current = null;
    };
  }, [sessionId, userId]);

  const createPeer = useCallback(async (asOfferer) => {
    setError(null);
    let stream = localStreamRef.current;
    if (!stream) {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        localStreamRef.current = stream;
        setLocalStream(stream);
      } catch (err) {
        setError('Camera or microphone permission denied. Allow permissions and try again.');
        setStatus('idle');
        return;
      }
    }

    const peer = new RTCPeerConnection({ iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] });
    stream.getTracks().forEach(t => peer.addTrack(t, stream));
    peer.onicecandidate = (e) => e.candidate && sendSignal({ type: 'ice', candidate: e.candidate.toJSON() });
    peer.ontrack = (e) => { setRemoteStream(e.streams[0]); setStatus('connected'); };
    peer.oniceconnectionstatechange = () => {
      if (peer.iceConnectionState === 'disconnected' || peer.iceConnectionState === 'failed') setStatus('ended');
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
  }, [sendSignal]);

  const handleSignal = useCallback(async (data) => {
    if (!peerRef.current) {
      if (data.type === 'offer') { await createPeer(false); isOfferer.current = false; }
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
    } catch (e) { console.error('Signal error:', e); }
  }, [createPeer, sendSignal]);

  const startCall = useCallback(async () => {
    setStatus('calling');
    const { data: session } = await supabase.from('video_call_sessions').select('offerer_id').eq('id', sessionId).single();
    if (!session) return;
    if (!session.offerer_id) {
      await supabase.from('video_call_sessions').update({ offerer_id: userId }).eq('id', sessionId);
      await createPeer(true);
    } else {
      await createPeer(false);
    }
  }, [sessionId, userId, createPeer]);

  const endCall = useCallback(() => {
    localStreamRef.current?.getTracks().forEach(t => t.stop());
    localStreamRef.current = null;
    peerRef.current?.close();
    peerRef.current = null;
    setLocalStream(null);
    setRemoteStream(null);
    setStatus('idle');
  }, []);

  return { localStream, remoteStream, status, error, startCall, endCall };
}