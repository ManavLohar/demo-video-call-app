import React, { useCallback } from "react";
import { useState, useEffect } from "react";
import { useSocket } from "../../../Context/Socket";
import { useNavigate } from "react-router-dom";
import styles from "./Lobby.module.scss";
function Lobby() {
  const [name, setName] = useState("");
  const [roomId, setRoomId] = useState("");
  const socket = useSocket();
  const navigate = useNavigate();

  const handleJoinRoom = useCallback(
    ({ roomId, name }) => {
      console.log("called", roomId);
      navigate(`/room/${roomId}`, { state: { name } });
    },
    [navigate]
  );

  useEffect(() => {
    socket.on("join-room", handleJoinRoom);
    return () => {
      socket.off("join-room", handleJoinRoom);
    };
  }, [socket]);

  const handleSubmit = useCallback(
    (e) => {
      e.preventDefault();
      if (name && roomId) {
        // Send the name and room ID to the server
        socket.emit("join-room", { name, roomId });
      } else {
        alert("All fields are required");
      }
    },
    [name, roomId, socket]
  );

  return (
    <div className={styles.lobbyContainer}>
      <div className={styles.lobbyBox}>
        <h2>Join a Meeting</h2>
        <form>
          <input
            type="text"
            id="name"
            name="name"
            placeholder="Enter your name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className={styles.input}
          />

          <input
            type="text"
            id="roomId"
            name="roomId"
            placeholder="Enter Room ID"
            value={roomId}
            onChange={(e) => setRoomId(e.target.value)}
            required
            className={styles.input}
          />

          <button
            onClick={handleSubmit}
            type="submit"
            className={styles.button}
          >
            Join Meeting
          </button>
        </form>
      </div>
    </div>
  );
}

export default Lobby;
