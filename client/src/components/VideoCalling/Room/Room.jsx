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
  const [screenShareStream, setScreenShareStream] = useState(null);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [originalVideoTrack, setOriginalVideoTrack] = useState(null);
  const [incomingCall, setIncomingCall] = useState(null);

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
      // const stream = await navigator.mediaDevices.getUserMedia({
      //   audio: true,
      //   video: true,
      // });
      setIncomingCall({ from, offer });
      // setMyStream(stream);
      console.log(`Incoming Call`, from, offer);
      // const ans = await peer.getAnswer(offer);
      // socket.emit("call-accepted", { to: from, ans });
    },
    [socket]
  );

  const acceptCall = async () => {
    if (!incomingCall) return;

    setRemoteSocketId(incomingCall.from);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: true,
      });
      setMyStream(stream);
      console.log(`Incoming Call Accepted:`, incomingCall.from);

      const ans = await peer.getAnswer(incomingCall.offer);
      socket.emit("call-accepted", { to: incomingCall.from, ans });
    } catch (error) {
      console.error("Error getting media devices", error);
    } finally {
      setIncomingCall(null); // Clear State After Handling
    }
  };

  const rejectCall = () => {
    console.log("Call Rejected!");
    setIncomingCall(null); // Reset State
  };

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
    async ({ from, offer, streamId }) => {
      setRemoteSocketId(from);
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: true,
      });

      setMyStream(stream);
      const ans = await peer.getAnswer(offer);
      socket.emit("peer-nego-done", { to: from, ans, streamId });

      peer.peer.addEventListener("track", async (ev) => {
        const streams = ev.streams;
        if (remoteStream) {
          // If there are multiple streams, assume the first one is the video stream
          // and the second one is the screen sharing stream
          // setRemoteStream(remoteStream[0]);
          setScreenShareStream(streams[0]);
        } else {
          // If there is only one stream, assume it's the video stream
          setRemoteStream(streams[0]);
        }
        console.log("Remote Stream: ", streams.getTracks());
      });
    },
    [socket]
  );

  const handleNegoNeedFinal = useCallback(async ({ ans, streamId }) => {
    await peer.setLocalDescription(ans);

    peer.peer.addEventListener("track", async (ev) => {
      const streams = ev.streams;
      if (remoteStream) {
        setScreenShareStream(streams[0]);
      } else {
        setRemoteStream(streams[0]);
      }
      console.log("remoteStream: ", remoteStream);
    });
  }, []);

  useEffect(() => {
    peer.peer.addEventListener("track", async (ev) => {
      const remoteStream = ev.streams;
      console.log("GOT TRACKS!!");
      setRemoteStream(remoteStream[0]);
    });
  }, []);

  const handleHangUp = useCallback(
    async ({ from }) => {
      alert(`Call Ended!`);
      if (remoteStream) {
        remoteStream.getTracks().forEach((track) => track.stop());
      }
      setRemoteStream(null);
      setMyStream(null);
      setIsScreenSharing(false);
      setScreenShareStream(null);
      setRemoteSocketId(null);
    },
    [remoteStream]
  );

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
      if (!videoTrack) return;

      const newState = !videoTrack.enabled;
      videoTrack.enabled = newState;
      setIsVideoOn(newState);

      const senders = peer.peer.getSenders();
      const videoSender = senders.find((s) => s.track?.kind === "video");

      console.log("sender", videoSender);

      if (videoSender) {
        videoSender.replaceTrack(newState ? videoTrack : getBlankVideoTrack());
      }
    }
  }, [myStream]);

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

  // Create blank video track
  const getBlankVideoTrack = () => {
    const canvas = document.createElement("canvas");
    canvas.width = 640;
    canvas.height = 480;
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "black";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    return canvas.captureStream().getVideoTracks()[0];
  };

  // For hang up call
  const hangUp = useCallback(() => {
    if (myStream) {
      myStream.getTracks().forEach((track) => track.stop());
    }
    if (screenShareStream) {
      screenShareStream.getTracks().forEach((track) => track.stop());
    }
    setMyStream(null);
    setRemoteStream(null);
    setScreenShareStream(null);
    setIsScreenSharing(false);
    setRemoteSocketId(null);
    socket.emit("user-hangup", { to: remoteSocketId });
  }, [myStream, remoteSocketId, socket, screenShareStream]);

  const toggleScreenStream = useCallback(async () => {
    if (isScreenSharing) {
      screenShareStream.getTracks().forEach((track) => track.stop());
      setScreenShareStream(null);
      setIsScreenSharing(false);

      const senders = peer.peer.getSenders();
      const videoSender = senders.find(
        (sender) => sender.track.kind === "video"
      );
      if (videoSender) {
        videoSender.replaceTrack(myStream.getVideoTracks()[0]);
      }

      const offer = await peer.getOffer();
      socket.emit("peer-nego-needed", { offer, to: remoteSocketId });

      // Replace remoteStream with previous remoteStream
      const previousRemoteStream = remoteStream;
      setRemoteStream(previousRemoteStream);
    } else {
      try {
        const screenStream = await navigator.mediaDevices.getDisplayMedia({
          video: true,
        });
        setScreenShareStream(screenStream);
        setIsScreenSharing(true);
        console.log(screenStream);

        for (const track of screenStream.getTracks()) {
          peer.peer.addTrack(track, screenStream);
        }

        const senders = peer.peer.getSenders();
        const videoSender = senders.find(
          (sender) => sender.track.kind === "video"
        );
        if (videoSender) {
          videoSender.replaceTrack(screenStream.getVideoTracks()[0]);
        }

        console.log("screenStreamId: ", screenStream.id);

        const offer = await peer.getOffer();
        socket.emit("peer-nego-needed", {
          offer,
          to: remoteSocketId,
          streamId: screenStream.id,
        });

        // Replace remoteStream with screenShareStream
        setRemoteStream(screenStream);
      } catch (error) {
        console.error("There is an error: ", error);
      }
    }
  }, [isScreenSharing, screenShareStream, remoteSocketId, myStream]);

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
            {incomingCall && (
              <div className={styles.AcceptBtn}>
                <p>{incomingCall.from} is calling...</p>
                <button onClick={acceptCall}>Accept</button>
                <button onClick={rejectCall}>Reject</button>
              </div>
            )}
          </div>
        </div>
      </div>
      <div className={styles.roomBox}>
        <div
          className={`${styles.streamingArea} ${
            isScreenSharing ? styles.newStreamingArea : ""
          }`}
        >
          <div className={styles.peersStream}>

            {myStream && (
              <div
                className={`${styles.myStream} ${
                  remoteStream ? styles.newMyStream : ""
                }`}
             style={{ backgroundColor: !isVideoOn ? "black" : "transparent"  ,height: isVideoOn ? "auto" : "200px",
              width: isVideoOn ? "auto" : "300px" }} >
             {myStream && isVideoOn ? (
              <ReactPlayer
                playing
                muted
                height="250px"
                width="350px"
                url={myStream}
              />
            ) : (
              <p style={{ color: "white", textAlign: "center", paddingTop: "100px" }}>
                Video is Off
              </p>
            )}
                
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
          </div>
          <div className={styles.shareScreenStream}>
            {isScreenSharing && (
              <div className={styles.remoteShareStream}>
                <ReactPlayer playing url={screenShareStream} />
              </div>
            )}
          </div>
          <div className={styles.streamButtonsBox}>
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
    </div>
  );
};

export default Room;
