import { useState, useEffect, useRef } from "react";
import { LOADING_MESSAGES } from "@/lib/research-types";

interface Props {
  structureName: string;
}

const ResearchLoading = ({ structureName }: Props) => {
  const [messageIndex, setMessageIndex] = useState(0);
  const intervalRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    intervalRef.current = setInterval(() => {
      setMessageIndex((prev) => (prev + 1) % LOADING_MESSAGES.length);
    }, 3000);
    return () => clearInterval(intervalRef.current);
  }, []);

  const message = LOADING_MESSAGES[messageIndex].replace("{nom}", structureName);

  return (
    <div className="flex flex-col items-center justify-center py-16 animate-fade-in">
      {/* Pulsing dot loader */}
      <div className="flex gap-1.5 mb-6">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="w-2.5 h-2.5 rounded-full bg-primary"
            style={{
              animation: `pulse 1.2s ease-in-out ${i * 0.2}s infinite`,
            }}
          />
        ))}
      </div>
      <p className="text-sm text-foreground font-medium transition-opacity duration-500">{message}</p>
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 0.25; transform: scale(0.85); }
          50% { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </div>
  );
};

export default ResearchLoading;
