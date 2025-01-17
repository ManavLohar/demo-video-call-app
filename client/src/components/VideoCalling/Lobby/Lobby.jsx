import React, { useCallback } from "react";
import { useState, useEffect } from "react";
import { useSocket } from "../../../Context/Socket";
import { useNavigate } from 'react-router-dom'
import styles from "./Lobby.module.scss";
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
    <div className={styles.lobbyContainer}>
      <div className={styles.lobbyBox}>
      <h2>Join a Meeting</h2>
      <form>
        
        <input
          type="email"
          id="email"
          name="email"
          placeholder="Enter your email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className={styles.input}
        />
       
        

        
        <input
          type="text"
          id="roomId"
          name="roomId"
           placeholder="Enter Room ID"
          value={room}
          onChange={(e) => setRoom(e.target.value)}
          required
          className={styles.input}
          
        />
        
       

        <button onClick={handleSubmit} type="submit" className={styles.button}>
        Join Meeting
        </button>
      </form>
    </div>
    </div>
  );
}

export default Lobby;
