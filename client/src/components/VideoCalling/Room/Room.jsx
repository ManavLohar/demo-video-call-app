import React, { useCallback, useEffect, useState, useRef } from "react";
import styles from "./Room.module.scss";
import ReactPlayer from "react-player";
import { useSocket } from "../../../Context/Socket";
//import { usePeer } from "../Context/Peer";
import peer from "../../../Context/Peer";
import { useLocation } from "react-router-dom";
import {
  MdCall,
  MdCallEnd,
  MdOutlineScreenShare,
  MdOutlineStopScreenShare,
} from "react-icons/md";
import { FaVideo, FaVideoSlash } from "react-icons/fa";
import { HiSpeakerWave, HiSpeakerXMark } from "react-icons/hi2";
import { IoCloseOutline, IoSend } from "react-icons/io5";
import { TbMessageOff, TbMessagePlus } from "react-icons/tb";

const Room = () => {
  const socket = useSocket(); // Custom hook

  // For video Calling
  const [remoteSocketId, setRemoteSocketId] = useState("");

  // For containing streams
  const [myStream, setMyStream] = useState("");
  const [remoteStream, setRemoteStream] = useState();
  const [screenShareStream, setScreenShareStream] = useState(null);
  const [isScreenSharing, setIsScreenSharing] = useState(false);

  // For video/audio on/off functionality
  const [isVideoOn, setIsVideoOn] = useState(true);
  const [isAudioOn, setIsAudioOn] = useState(true);
  const [originalVideoTrack, setOriginalVideoTrack] = useState(null);

  // For containing caller details
  const [incomingCall, setIncomingCall] = useState(null);
  const [currentTrackId, setCurrentTrackId] = useState(false);

  // For hide and show call and share stream button
  const [isCallAccepted, setIsCallAccepted] = useState(false);
  const [isStreamSent, setIsStreamSent] = useState(false);

  // For chat functionality
  const [allMessages, setAllMessages] = useState([]);
  const [message, setMessage] = useState("");
  const location = useLocation();
  const [username, setUsername] = useState(location.state?.name);
  const [messageBoxVisibility, setMessageBoxVisibility] = useState(false);
  const messageListRef = useRef(null);

  const handleNewUserJoined = useCallback(
    async (data) => {
      const { email, id } = data;
      // setName(email);
      console.log(email);
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
    socket.emit("user-call", { to: remoteSocketId, name: username, offer });
    setMyStream(stream);
  }, [remoteSocketId, socket]);

  const handleIncommingCall = useCallback(
    async ({ from, name, offer }) => {
      setRemoteSocketId(from);
      // const stream = await navigator.mediaDevices.getUserMedia({
      //   audio: true,
      //   video: true,
      // });
      setIncomingCall({ from, name, offer });
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
      setIsCallAccepted(true);

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
    setIsStreamSent(true);
  }, [myStream]);

  const handleCallAccepted = useCallback(
    ({ from, ans }) => {
      peer.setLocalDescription(ans);
      console.log("Call Accepted!");
      setIsCallAccepted(true);
      // sendStreams();
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
    socket.emit("peer-nego-needed", {
      offer,
      to: remoteSocketId,
      shareStream: false,
    });
  }, [remoteSocketId, socket, screenShareStream]);

  useEffect(() => {
    peer.peer.addEventListener("negotiationneeded", handleNegoNeeded);
    return () => {
      peer.peer.removeEventListener("negotiationneeded", handleNegoNeeded);
    };
  }, [handleNegoNeeded]);

  const handleNegoNeedIncomming = useCallback(
    async ({ from, offer, shareStream }) => {
      setRemoteSocketId(from);
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: true,
      });

      setMyStream(stream);
      // console.log("Remote peer", localpeer);
      const ans = await peer.getAnswer(offer);
      socket.emit("peer-nego-done", { to: from, ans, shareStream });

      if (!shareStream) {
        peer.peer.addEventListener("track", (ev) => {
          const streams = ev.streams;
          setScreenShareStream(streams[0]);
          setIsScreenSharing(true);
          // console.log("It replaced from true side!");
        });
      } else {
        peer.peer.addEventListener("track", (ev) => {
          const streams = ev.streams;
          setRemoteStream(streams[0]);
          setIsScreenSharing(false);
          // console.log("It replaced from false side!");
          setScreenShareStream("");
        });
      }
    },
    [socket]
  );

  const handleNegoNeedFinal = useCallback(async ({ ans, shareStream }) => {
    await peer.setLocalDescription(ans);

    // peer.peer.addEventListener("track", async (ev) => {
    //   const streams = ev.streams;
    //   if (currentTrackId) {
    //     setScreenShareStream(streams[0]);
    //   } else {
    //     setRemoteStream(streams[0]);
    //   }
    //   console.log("remoteStream: ", remoteStream);
    // });
  }, []);

  useEffect(() => {
    if (currentTrackId) {
      peer.peer.addEventListener("track", async (ev) => {
        const remoteStream = ev.streams;
        setScreenShareStream(remoteStream[0]);
        console.log("first It's called");
      });
    } else {
      console.log("UseEffect side Remote Stream: ", remoteStream);
      console.log("currentTrackId", currentTrackId);
      // setRemoteStreamSet(true);
      peer.peer.addEventListener("track", async (ev) => {
        const remoteStream = ev.streams;
        console.log("GOT TRACKS!!");
        console.log("It replaced from useEffect");
        setRemoteStream(remoteStream[0]);
        // console.log("All Streams", remoteStream);
        // setCurrentTrackId(remoteStream[0].id);
      });
      setCurrentTrackId(true);
    }
  }, []);
  console.log("currentTrackId", currentTrackId);

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

  const handleReceiveMessage = useCallback((newMessage) => {
    setAllMessages((prevMessages) => [...prevMessages, newMessage]);
  }, []);

  useEffect(() => {
    socket.on("user-joined", handleNewUserJoined);
    socket.on("incoming-call", handleIncommingCall);
    socket.on("call-accepted", handleCallAccepted);
    socket.on("peer-nego-needed", handleNegoNeedIncomming);
    socket.on("peer-nego-final", handleNegoNeedFinal);
    socket.on("user-hangup", handleHangUp);
    socket.on("receive-message", handleReceiveMessage);

    return () => {
      socket.off("user-joined", handleNewUserJoined);
      socket.off("incoming-call", handleIncommingCall);
      socket.off("call-accepted", handleCallAccepted);
      socket.off("peer-nego-needed", handleNegoNeedIncomming);
      socket.off("peer-nego-final", handleNegoNeedFinal);
      socket.off("user-hangup", handleHangUp);
      socket.off("receive-message", handleReceiveMessage);
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
    setIsCallAccepted(false);
    setIsStreamSent(false);
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
      socket.emit("peer-nego-needed", {
        offer,
        to: remoteSocketId,
        shareStream: false,
      });

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
          shareStream: true,
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

  const handleSendMessage = useCallback(
    async (e) => {
      e.preventDefault();
      if (message.trim() === "") return;

      const newMessage = {
        text: message,
        // from: socket.id,
        from: username,
        to: remoteSocketId,
      };

      socket.emit("send-message", newMessage);
      setAllMessages((prevMessages) => [...prevMessages, newMessage]);
      setMessage("");
    },
    [message, socket, remoteSocketId]
  );

  useEffect(() => {
    setUsername(location.state?.name);
  }, [location]);

  useEffect(() => {
    if (messageListRef.current) {
      messageListRef.current.scrollTop = messageListRef.current.scrollHeight;
    }
  }, [allMessages]);

  return (
    <div className={styles.room}>
      <div className={styles.header}>
        <div className={styles.sidebar}>
          <h4>{remoteSocketId ? "Connected" : "No one in room"}</h4>
          <div className={styles.sidebarButtons}>
            {!isStreamSent && myStream && (
              <button onClick={sendStreams} className={styles.sendStreamsBtn}>
                Send Stream <FaVideo />
              </button>
            )}
            {remoteSocketId && !isCallAccepted && (
              <button onClick={handleCallUser} className={styles.callBtn}>
                CALL <MdCall />
              </button>
            )}
            {incomingCall && (
              <div className={styles.AcceptBtn}>
                <p>{incomingCall.name} is calling...</p>
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
                style={{
                  backgroundColor: !isVideoOn ? "black" : "transparent",
                  height: isVideoOn ? "auto" : "200px",
                  width: isVideoOn ? "auto" : "300px",
                }}
              >
                {myStream && isVideoOn ? (
                  <ReactPlayer
                    playing
                    muted
                    height="250px"
                    width="350px"
                    url={myStream}
                  />
                ) : (
                  <p
                    style={{
                      color: "white",
                      textAlign: "center",
                      paddingTop: "100px",
                    }}
                  >
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
                <button
                  onClick={() => setMessageBoxVisibility(!messageBoxVisibility)}
                >
                  {messageBoxVisibility ? <TbMessageOff /> : <TbMessagePlus />}
                </button>
              </div>
            )}
          </div>
        </div>
        <div
          className={styles.chatArea}
          style={{
            right: messageBoxVisibility ? "0" : "-400px",
            opacity: messageBoxVisibility ? "1" : "0",
          }}
        >
          <div className={styles.closeChatArea}>
            <button onClick={() => setMessageBoxVisibility(false)}>
              <IoCloseOutline />
            </button>
          </div>
          <div className={styles.messageList} ref={messageListRef}>
            {allMessages.length > 0 ? (
              allMessages.map((message, index) => {
                return (
                  <div key={index} className={styles.message}>
                    <p>
                      <span>
                        {message.from === username ? "You" : message.from}{" "}
                      </span>
                      <span>{message.text}</span>
                    </p>
                  </div>
                );
              })
            ) : (
              <h3>Say something to start the conversation!</h3>
            )}
          </div>
          <div className={styles.chatBox}>
            <form onSubmit={handleSendMessage}>
              <input
                type="text"
                value={message}
                placeholder="type your message here..."
                onChange={(e) => setMessage(e.target.value)}
              />
              <div className={styles.submitIcon} onClick={handleSendMessage}>
                <IoSend />
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Room;
