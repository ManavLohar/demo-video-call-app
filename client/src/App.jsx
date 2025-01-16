import { useState } from "react";
import "./App.css";
import Lobby from "./components/Lobby";
import Room from "./components/Room";
import {Routes,Route} from 'react-router-dom'
import { SocketProvider } from "./Context/Socket";
import { PeerProvider } from "./Context/Peer";

function App() {
  return (
    <>
    <SocketProvider>
    <PeerProvider>
    <Routes>
    
  
    <Route path='/' element={<Lobby />} />
    
    <Route path='/room/:room' element={<Room/>} />
    
  </Routes>
  </PeerProvider>
  </SocketProvider>
      
    </>
  );
}

export default App;
