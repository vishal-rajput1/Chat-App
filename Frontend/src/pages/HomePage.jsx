import React from 'react'
import { useChatStore } from '../store/useChatStore'
import Sidebar from '../components/Sidebar';
import NoChatSelected from '../components/NoChatSelected';
import ChatContainer from '../components/ChatContainer';

const HomePage = () => {
  const { selectedUser } = useChatStore();

  return (
    <div className='min-h-[100dvh] bg-base-200'>
      <div className="flex items-center justify-center pt-16 md:pt-20 md:px-4">
        <div className="bg-base-100 md:rounded-lg shadow-cl w-full max-w-6xl h-[calc(100dvh-4rem)] md:h-[calc(100vh-8rem)]">
          <div className="flex h-full rounded-lg overflow-hidden">
            <div className={selectedUser ? "hidden md:block" : "block"}><Sidebar/></div>
            {!selectedUser ? <NoChatSelected /> : <ChatContainer />}
          </div>
        </div>
      </div>  
    </div>

  )
} 

export default HomePage
