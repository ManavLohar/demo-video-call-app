import { useState } from "react";
import "./App.css";
import Lobby from "./components/Lobby";
import Room from "./components/Room";
import {Routes,Route} from 'react-router-dom'
import { SocketProvider } from "./Context/Socket";

function App() {
  return (
    <>
    <SocketProvider>
    <Routes>
    
  
    <Route path='/' element={<Lobby />} />
    
    <Route path='/room/:room' element={<Room/>} />
    
  </Routes>
  </SocketProvider>
      
    </>
  );
}

export default App;
