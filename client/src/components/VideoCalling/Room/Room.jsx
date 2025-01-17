import React, { useCallback, useEffect, useState } from "react";
import styles from "./Room.module.scss";
import ReactPlayer from "react-player";
import { useSocket } from "../../../Context/Socket";
//import { usePeer } from "../Context/Peer";
import peer from "../../../Context/Peer";
import { MdCall, MdCallEnd } from "react-icons/md";
import { FaVideo, FaVideoSlash } from "react-icons/fa";
import { HiSpeakerWave, HiSpeakerXMark } from "react-icons/hi2";

const Room = () => {
  const socket = useSocket();

  const [remoteSocketId, setRemoteSocketId] = useState("");
  const [myStream, setMyStream] = useState("");
  const [remoteStream, setRemoteStream] = useState();
  const [isVideoOn, setIsVideoOn] = useState(true);
  const [isAudioOn, setIsAudioOn] = useState(true);

  const handleNewUserJoined = useCallback(
    async (data) => {
      const { email, id } = data;
      setRemoteSocketId(id);
    },
    [socket]
  );

  const handleCallUser = useCallback(async () => {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: true,
      video: true,
    });
    const offer = await peer.getOffer();
    socket.emit("user-call", { to: remoteSocketId, offer });
    setMyStream(stream);
  }, [remoteSocketId, socket]);

  const handleIncommingCall = useCallback(
    async ({ from, offer }) => {
      setRemoteSocketId(from);
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: true,
      });
      setMyStream(stream);
      console.log(`Incoming Call`, from, offer);
      const ans = await peer.getAnswer(offer);
      socket.emit("call-accepted", { to: from, ans });
    },
    [socket]
  );
  const sendStreams = useCallback(() => {
    for (const track of myStream.getTracks()) {
      peer.peer.addTrack(track, myStream);
    }
  }, [myStream]);
  const handleCallAccepted = useCallback(
    ({ from, ans }) => {
      peer.setLocalDescription(ans);
      console.log("Call Accepted!");
      sendStreams();
    },
    [sendStreams]
  );
  const handleNegoNeeded = useCallback(async () => {
    const offer = await peer.getOffer();
    socket.emit("peer-nego-needed", { offer, to: remoteSocketId });
  }, [remoteSocketId, socket]);

  useEffect(() => {
    peer.peer.addEventListener("negotiationneeded", handleNegoNeeded);
    return () => {
      peer.peer.removeEventListener("negotiationneeded", handleNegoNeeded);
    };
  }, [handleNegoNeeded]);

  const handleNegoNeedIncomming = useCallback(
    async ({ from, offer }) => {
      const ans = await peer.getAnswer(offer);
      socket.emit("peer-nego-done", { to: from, ans });
    },
    [socket]
  );
  const handleNegoNeedFinal = useCallback(async ({ ans }) => {
    await peer.setLocalDescription(ans);
  }, []);

  useEffect(() => {
    peer.peer.addEventListener("track", async (ev) => {
      const remoteStream = ev.streams;
      console.log("GOT TRACKS!!");
      setRemoteStream(remoteStream[0]);
    });
  }, []);

  const handleHangUp = useCallback(async ({ from }) => {
    alert(`Call Ended!`);
  }, []);

  useEffect(() => {
    socket.on("user-joined", handleNewUserJoined);
    socket.on("incoming-call", handleIncommingCall);
    socket.on("call-accepted", handleCallAccepted);
    socket.on("peer-nego-needed", handleNegoNeedIncomming);
    socket.on("peer-nego-final", handleNegoNeedFinal);
    socket.on("user-hangup", handleHangUp);

    return () => {
      socket.off("user-joined", handleNewUserJoined);
      socket.off("incoming-call", handleIncommingCall);
      socket.off("call-accepted", handleCallAccepted);
      socket.off("peer-nego-needed", handleNegoNeedIncomming);
      socket.off("peer-nego-final", handleNegoNeedFinal);
      socket.off("user-hangup", handleHangUp);
    };
  }, [
    handleNewUserJoined,
    handleIncommingCall,
    handleCallAccepted,
    handleNegoNeedIncomming,
    handleNegoNeedFinal,
    handleHangUp,
    socket,
  ]);

  const toggleVideo = useCallback(() => {
    if (myStream) {
      myStream.getVideoTracks()[0].enabled = !isVideoOn;
      setIsVideoOn(!isVideoOn);
    }
  }, [myStream, isVideoOn]);

  const toggleAudio = useCallback(() => {
    if (myStream) {
      myStream.getAudioTracks()[0].enabled = !isAudioOn;
      setIsAudioOn(!isAudioOn);
    }
  }, [myStream, isAudioOn]);

  const hangUp = useCallback(() => {
    if (myStream) {
      myStream.getTracks().forEach((track) => track.stop());
      setMyStream(null);
      setRemoteStream(null);
      setRemoteSocketId(null);
      socket.emit("user-hangup", { to: remoteSocketId });
    }
  }, [myStream, remoteSocketId, socket]);

  return (
    <div className={styles.room}>
      <div className={styles.header}>
        <h1>Room Page</h1>
      </div>
      <div className={styles.roomBox}>
        <div className={styles.sidebar}>
          <h4>{remoteSocketId ? "Connected" : "No one in room"}</h4>
          <div className={styles.sidebarButtons}>
            {myStream && (
              <button onClick={sendStreams} className={styles.sendStreamsBtn}>
                Send Stream <FaVideo />
              </button>
            )}
            {remoteSocketId && (
              <button onClick={handleCallUser} className={styles.callBtn}>
                CALL <MdCall />
              </button>
            )}
          </div>
        </div>
        <div className={styles.streamingArea}>
          {myStream && (
            <div className={styles.myStream}>
              <ReactPlayer
                playing
                muted
                height="250px"
                width="350px"
                url={myStream}
              />
            </div>
          )}
          {remoteStream && (
            <div className={styles.remoteStream}>
              <ReactPlayer
                playing
                // height="300px"
                // width="400px"
                url={remoteStream}
              />
            </div>
          )}
          {myStream && (
            <div className={styles.streamButtons}>
              <button onClick={toggleVideo}>
                {isVideoOn ? <FaVideo /> : <FaVideoSlash />}
              </button>
              <button onClick={toggleAudio}>
                {isAudioOn ? <HiSpeakerWave /> : <HiSpeakerXMark />}
              </button>
              <button onClick={hangUp}>
                <MdCallEnd />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Room;
