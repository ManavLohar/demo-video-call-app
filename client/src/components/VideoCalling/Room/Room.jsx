import React, { useCallback, useEffect, useState } from "react";
import styles from "./Room.module.scss";
import ReactPlayer from "react-player";
import { useSocket } from "../../../Context/Socket";
//import { usePeer } from "../Context/Peer";
import peer from "../../../Context/Peer";
import {
  MdCall,
  MdCallEnd,
  MdOutlineScreenShare,
  MdOutlineStopScreenShare,
} from "react-icons/md";
import { FaVideo, FaVideoSlash } from "react-icons/fa";
import { HiSpeakerWave, HiSpeakerXMark } from "react-icons/hi2";

const Room = () => {
  const socket = useSocket();

  const [remoteSocketId, setRemoteSocketId] = useState("");
  const [myStream, setMyStream] = useState("");
  const [remoteStream, setRemoteStream] = useState();
  const [isVideoOn, setIsVideoOn] = useState(true);
  const [isAudioOn, setIsAudioOn] = useState(true);
  const [screenShareStream, setScreenShareStream] = useState();
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [originalVideoTrack, setOriginalVideoTrack] = useState(null);

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
    if (screenShareStream) {
      const tracks = screenShareStream.getTracks();
      tracks.forEach((track) => {
        const existingSender = peer.peer
          .getSenders()
          .find((sender) => sender.track === track);
        if (!existingSender) {
          peer.peer.addTrack(track, screenShareStream);
        }
      });
      // peer.peer.getSenders().forEach((sender) => {
      //   if (sender.track.kind === "video") {
      //     peer.peer.removeTrack(sender);
      //   }
      // });
      // for (const track of screenShareStream.getTracks()) {
      //   peer.peer.addTrack(track, screenShareStream);
      // }
    }
    socket.emit("peer-nego-needed", { offer, to: remoteSocketId });
  }, [remoteSocketId, socket, screenShareStream]);

  useEffect(() => {
    peer.peer.addEventListener("negotiationneeded", handleNegoNeeded);
    return () => {
      peer.peer.removeEventListener("negotiationneeded", handleNegoNeeded);
    };
  }, [handleNegoNeeded]);

  const handleNegoNeedIncomming = useCallback(
    async ({ from, offer }) => {
      setRemoteSocketId(from);
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: true,
      });

      setMyStream(stream);
      const ans = await peer.getAnswer(offer);
      socket.emit("peer-nego-done", { to: from, ans });

      peer.peer.addEventListener("track", async (ev) => {
        const remoteStream = ev.streams;
        setRemoteStream(remoteStream[0]);
      });
    },
    [socket]
  );

  const handleNegoNeedFinal = useCallback(async ({ ans }) => {
    await peer.setLocalDescription(ans);

    peer.peer.addEventListener("track", async (ev) => {
      const remoteStream = ev.streams;
      console.log("remoteStresm: ", remoteStream);
      setRemoteStream(remoteStream[0]);
    });
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
      const videoTrack = myStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsVideoOn((prevState) => !prevState);

        // Update peer connection's senders
        const senders = peer.peer.getSenders();
        const videoSender = senders.find(
          (sender) => sender.track.kind === "video"
        );
        if (videoSender) {
          videoSender.replaceTrack(videoTrack);
        }
      }
    }
  }, [isVideoOn, myStream]);

  const toggleAudio = useCallback(() => {
    if (myStream) {
      const audioTrack = myStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsAudioOn((prevState) => !prevState);

        // Update peer connection's senders
        const senders = peer.peer.getSenders();
        const audioSender = senders.find(
          (sender) => sender.track.kind === "audio"
        );
        if (audioSender) {
          audioSender.replaceTrack(audioTrack);
        }
      }
    }
  }, [isAudioOn, myStream]);

  // For hang up call
  const hangUp = useCallback(() => {
    if (myStream) {
      myStream.getTracks().forEach((track) => track.stop());
      setMyStream(null);
      setRemoteStream(null);
      setRemoteSocketId(null);
      if (screenShareStream) {
        screenShareStream.getTracks().forEach((track) => track.stop());
        setScreenShareStream(null);
        setIsScreenSharing(false);
      }
      if (originalVideoTrack) {
        originalVideoTrack.stop();
        setOriginalVideoTrack(null);
      }
      socket.emit("user-hangup", { to: remoteSocketId });
    }
  }, [myStream, remoteSocketId, socket, screenShareStream, originalVideoTrack]);

  const toggleScreenStream = useCallback(async () => {
    if (isScreenSharing) {
      if (screenShareStream) {
        screenShareStream.getTracks().forEach((track) => track.stop());
        setScreenShareStream(null);
        setIsScreenSharing(false);

        const newVideoTrack = myStream.getVideoTracks()[0];
        newVideoTrack.enabled = true;
        setIsVideoOn(true);

        const senders = peer.peer.getSenders();
        const videoSender = senders.find(
          (sender) => sender.track.kind === "video"
        );

        if (videoSender && originalVideoTrack) {
          videoSender.replaceTrack(originalVideoTrack);
          myStream.getTracks().forEach((track) => {
            if (track.kind === "video") {
              track.stop();
            }
          });
          myStream.addTrack(originalVideoTrack);
        }
      }
    } else {
      try {
        const screenStream = await navigator.mediaDevices.getDisplayMedia({
          video: true,
        });
        setScreenShareStream(screenStream);
        setIsScreenSharing(true);

        const newVideoTrack = screenStream.getVideoTracks()[0];
        newVideoTrack.enabled = true;
        setIsVideoOn(true);

        const senders = peer.peer.getSenders();
        const videoSender = senders.find(
          (sender) => sender.track.kind === "video"
        );
        if (videoSender) {
          setOriginalVideoTrack(videoSender.track);
          const videoTrack = screenStream.getVideoTracks()[0];
          if (videoTrack) {
            videoSender.replaceTrack(videoTrack);
            myStream.getTracks().forEach((track) => {
              if (track.kind === "video") {
                track.stop();
              }
            });
            myStream.addTrack(videoTrack);
          }
        } else {
          for (const track of screenStream.getTracks()) {
            peer.peer.addTrack(track, screenStream);
          }
        }
      } catch (error) {
        console.error("There is an error: ", error);
      }
    }
  }, [isScreenSharing, screenShareStream, myStream]);

  useEffect(() => {
    return () => {
      if (originalVideoTrack) {
        originalVideoTrack.stop();
        setOriginalVideoTrack(null);
      }
    };
  }, [originalVideoTrack]);

  return (
    <div className={styles.room}>
      <div className={styles.header}>
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
      </div>
      <div className={styles.roomBox}>
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
              <button onClick={toggleScreenStream}>
                {isScreenSharing ? (
                  <MdOutlineStopScreenShare />
                ) : (
                  <MdOutlineScreenShare />
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Room;
