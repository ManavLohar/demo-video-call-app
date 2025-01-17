import React, { useCallback } from "react";
import { useState, useEffect } from "react";
import { useSocket } from "../../../Context/Socket";
import { useNavigate } from 'react-router-dom'

function Lobby() {
  const [email, setEmail] = useState("");
  const [room, setRoom] = useState("");
  const socket = useSocket();
  const navigate = useNavigate()

  
    const handleJoinRoom=  useCallback(({room})=>{
      navigate(`/room/${room}`)
    },
    [navigate]
  )

  useEffect(() => {
      socket.on('join-room',handleJoinRoom );
      return () => {
        socket.off('join-room',handleJoinRoom );
      }
    },[socket])

  const handleSubmit = useCallback(
    (e) => {
      e.preventDefault();
      socket.emit("join-room", { email, room });
      //console.log("object");
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

        <button onClick={handleSubmit} type="submit">
          Join
        </button>
      </form>
    </div>
  );
}

export default Lobby;
