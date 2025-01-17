import { useState } from "react";
import "./App.css";
import { Routes, Route } from "react-router-dom";
import { SocketProvider } from "./Context/Socket";
import Lobby from "./components/VideoCalling/Lobby/Lobby";
import Room from "./components/VideoCalling/Room/Room";

function App() {
  return (
    <>
      <SocketProvider>
        <Routes>
          <Route path="/" element={<Lobby />} />
          <Route path="/room/:room" element={<Room />} />
        </Routes>
      </SocketProvider>
    </>
  );
}

export default App;
