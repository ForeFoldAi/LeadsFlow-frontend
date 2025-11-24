import { useState } from "react";
import ChatCard from "./chat-card";

export default function FloatingLogo() {
  const [isChatOpen, setIsChatOpen] = useState(false);

  return (
    <>
      <div className="fixed bottom-6 right-6 z-50">
        <div className="relative">
          <button
            onClick={() => setIsChatOpen(!isChatOpen)}
            className="transition-transform duration-300 hover:scale-110 active:scale-95"
          >
            <img
              src="/logo.png"
              alt="Logo"
              className="w-12 h-12 md:w-16 md:h-16 rounded-full shadow-lg hover:shadow-xl transition-shadow duration-300 cursor-pointer"
            />
          </button>
        </div>
      </div>
      <ChatCard isOpen={isChatOpen} onClose={() => setIsChatOpen(false)} />
    </>
  );
}

