"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "./supabase/client";

const ICE_SERVERS: RTCIceServer[] = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" },
  { urls: "stun:stun2.l.google.com:19302" },
];

type SignalPayload =
  | { type: "ready" }
  | { type: "offer"; sdp: RTCSessionDescriptionInit }
  | { type: "answer"; sdp: RTCSessionDescriptionInit }
  | { type: "candidate"; candidate: RTCIceCandidateInit }
  | { type: "hangup" };

export type CallStatus = "idle" | "requesting-media" | "waiting" | "connecting" | "connected" | "ended" | "media-error";

/**
 * Peer-to-peer audio/video call between the two participants of a counseling
 * session, signaled through a Supabase Realtime broadcast channel (no TURN
 * server — works over STUN alone, which covers the vast majority of home and
 * mobile networks but can fail behind strict corporate/symmetric NAT).
 */
export function useCallRoom(roomId: string | null, isCaller: boolean) {
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [status, setStatus] = useState<CallStatus>("idle");
  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(true);

  const pcRef = useRef<RTCPeerConnection | null>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const connectedRef = useRef(false);

  const sendSignal = useCallback((payload: SignalPayload) => {
    channelRef.current?.send({ type: "broadcast", event: "signal", payload });
  }, []);

  async function sendOffer() {
    const pc = pcRef.current;
    if (!pc || pc.signalingState === "closed" || connectedRef.current) return;
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    sendSignal({ type: "offer", sdp: offer });
  }

  const hangup = useCallback(() => {
    sendSignal({ type: "hangup" });
    setStatus("ended");
  }, [sendSignal]);

  const toggleMic = useCallback(() => {
    setMicOn((prev) => {
      const next = !prev;
      localStreamRef.current?.getAudioTracks().forEach((t) => (t.enabled = next));
      return next;
    });
  }, []);

  const toggleCam = useCallback(() => {
    setCamOn((prev) => {
      const next = !prev;
      localStreamRef.current?.getVideoTracks().forEach((t) => (t.enabled = next));
      return next;
    });
  }, []);

  useEffect(() => {
    if (!roomId) return;
    let cancelled = false;
    connectedRef.current = false;
    setStatus("requesting-media");

    async function start() {
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      } catch {
        if (!cancelled) setStatus("media-error");
        return;
      }
      if (cancelled) {
        stream.getTracks().forEach((t) => t.stop());
        return;
      }
      localStreamRef.current = stream;
      setLocalStream(stream);
      setStatus("waiting");

      const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
      pcRef.current = pc;
      stream.getTracks().forEach((track) => pc.addTrack(track, stream));

      pc.ontrack = (e) => {
        connectedRef.current = true;
        setRemoteStream(e.streams[0]);
        setStatus("connected");
      };

      pc.onconnectionstatechange = () => {
        if (pc.connectionState === "connecting") setStatus((s) => (s === "connected" ? s : "connecting"));
      };

      const channel = supabase.channel(`call:${roomId}`, {
        config: { broadcast: { self: false } },
      });
      channelRef.current = channel;

      pc.onicecandidate = (e) => {
        if (e.candidate) sendSignal({ type: "candidate", candidate: e.candidate.toJSON() });
      };

      channel.on("broadcast", { event: "signal" }, async ({ payload }: { payload: SignalPayload }) => {
        if (!pcRef.current || cancelled) return;
        const activePc = pcRef.current;
        if (payload.type === "ready") {
          if (isCaller) await sendOffer();
        } else if (payload.type === "offer") {
          await activePc.setRemoteDescription(new RTCSessionDescription(payload.sdp));
          const answer = await activePc.createAnswer();
          await activePc.setLocalDescription(answer);
          sendSignal({ type: "answer", sdp: answer });
        } else if (payload.type === "answer") {
          if (activePc.signalingState === "have-local-offer") {
            await activePc.setRemoteDescription(new RTCSessionDescription(payload.sdp));
          }
        } else if (payload.type === "candidate") {
          try {
            await activePc.addIceCandidate(payload.candidate);
          } catch {
            // Benign if it arrives before the remote description is set.
          }
        } else if (payload.type === "hangup") {
          setStatus("ended");
        }
      });

      channel.subscribe(async (subStatus) => {
        if (subStatus === "SUBSCRIBED" && !cancelled) {
          sendSignal({ type: "ready" });
          if (isCaller) await sendOffer();
        }
      });
    }

    start();

    return () => {
      cancelled = true;
      pcRef.current?.close();
      pcRef.current = null;
      localStreamRef.current?.getTracks().forEach((t) => t.stop());
      localStreamRef.current = null;
      channelRef.current?.unsubscribe();
      channelRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId, isCaller]);

  return { localStream, remoteStream, status, micOn, camOn, toggleMic, toggleCam, hangup };
}

export type IncomingCall = {
  sessionId: string;
  patientId: string;
  patientName: string;
};

/** Pings a psychologist's dashboard that a patient just started a session and is waiting to connect. */
export function notifyIncomingCall(psychologistId: string, call: IncomingCall) {
  const channel = supabase.channel(`incoming:${psychologistId}`, {
    config: { broadcast: { self: false } },
  });
  channel.subscribe((subStatus) => {
    if (subStatus === "SUBSCRIBED") {
      channel.send({ type: "broadcast", event: "incoming_call", payload: call });
      setTimeout(() => channel.unsubscribe(), 2000);
    }
  });
}

/** Tells a patient still waiting in /session that the psychologist declined the call. */
export function rejectIncomingCall(sessionId: string) {
  const channel = supabase.channel(`call:${sessionId}`, {
    config: { broadcast: { self: false } },
  });
  channel.subscribe((subStatus) => {
    if (subStatus === "SUBSCRIBED") {
      channel.send({ type: "broadcast", event: "signal", payload: { type: "hangup" } });
      setTimeout(() => channel.unsubscribe(), 2000);
    }
  });
}
