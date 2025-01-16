import React, { useCallback } from "react";
import { useState, useEffect } from "react";
import { useSocket } from "../Context/Socket";

function Lobby() {
  const [email, setEmail] = useState("");
  const [room, setRoom] = useState("");
  const socket = useSocket();

  // useEffect(() => {
  //     socket.on('joined-room', );
  //     return () => {
  //       socket.off('joined-room', );
  //     }
  //   },[socket])

  const handleJoinRoom = useCallback(
    (e) => {
      e.preventDefault();
      socket.emit("join-room", { email, room });
    },
    [email, room, socket]
  );

  return (
    <div>
      <form>
        <label htmlFor="email">Email:</label>
        <input
          type="email"
          id="email"
          name="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <br />
        <br />

        <label htmlFor="roomId">Room ID:</label>
        <input
          type="text"
          id="roomId"
          name="roomId"
          value={room}
          onChange={(e) => setRoom(e.target.value)}
          required
        />
        <br />
        <br />

        <button onClick={handleJoinRoom} type="submit">
          Join
        </button>
      </form>
    </div>
  );
}

export default Lobby;
