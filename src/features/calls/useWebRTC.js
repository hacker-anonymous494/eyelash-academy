import { useRef, useState, useEffect, useCallback } from 'react';
import { supabase } from '@/config/supabase';

export function useWebRTC(sessionId, userId) {
  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState(null);
  const peerRef = useRef(null);
  const channelRef = useRef(null);
  const offererRef = useRef(false);

  const sendSignal = useCallback((data) => {
    if (channelRef.current) {
      channelRef.current.send({ type: 'broadcast', event: 'signal', payload: data });
    }
  }, []);

  useEffect(() => {
    if (!sessionId || !userId) return;
    const channel = supabase.channel(`webrtc_${sessionId}`);
    channelRef.current = channel;
    channel.on('broadcast', { event: 'signal' }, (payload) => {
      handleSignal(payload.payload);
    }).subscribe();
    return () => { supabase.removeChannel(channel); channelRef.current = null; };
  }, [sessionId, userId]);

  const createPeer = async (asOfferer) => {
    let stream = null;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
    } catch (err) {
      setError('Camera/microphone access denied. Please allow and try again.');
      setStatus('idle');
      return;
    }
    setLocalStream(stream);
    const peer = new RTCPeerConnection({ iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] });
    stream.getTracks().forEach(t => peer.addTrack(t, stream));
    peer.onicecandidate = (e) => { if (e.candidate) sendSignal({ type: 'ice', candidate: e.candidate.toJSON() }); };
    peer.ontrack = (e) => { setRemoteStream(e.streams[0]); setStatus('connected'); };
    peer.oniceconnectionstatechange = () => {
      if (peer.iceConnectionState === 'disconnected' || peer.iceConnectionState === 'failed') setStatus('ended');
    };
    peerRef.current = peer;
    if (asOfferer) {
      offererRef.current = true;
      const offer = await peer.createOffer();
      await peer.setLocalDescription(offer);
      sendSignal({ type: 'offer', sdp: peer.localDescription });
    }
  };

  const handleSignal = async (data) => {
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
  };

  const startCall = useCallback(async () => {
    setError(null);
    setStatus('calling');
    const { data: session } = await supabase.from('video_call_sessions').select('offerer_id').eq('id', sessionId).single();
    if (!session) return;
    if (!session.offerer_id) {
      await supabase.from('video_call_sessions').update({ offerer_id: userId }).eq('id', sessionId);
      await createPeer(true);
    } else {
      await createPeer(false);
    }
  }, [sessionId, userId]);

  const endCall = useCallback(() => {
    if (peerRef.current) { peerRef.current.close(); peerRef.current = null; }
    if (localStream) { localStream.getTracks().forEach(t => t.stop()); setLocalStream(null); }
    setRemoteStream(null);
    setStatus('idle');
  }, [localStream]);

  return { localStream, remoteStream, status, error, startCall, endCall };
}