import { useEffect, useState } from "react";
import type { GameState, ServerMessage } from "@agent-tycoon/shared";

export type Connection = "connecting" | "open" | "closed";

/** Keeps a live copy of the server's game state over WebSocket, reconnecting on drop. */
export function useServer() {
  const [state, setState] = useState<GameState | null>(null);
  const [connection, setConnection] = useState<Connection>("connecting");

  useEffect(() => {
    let socket: WebSocket;
    let retry: ReturnType<typeof setTimeout>;
    let disposed = false;

    const connect = () => {
      const proto = location.protocol === "https:" ? "wss" : "ws";
      socket = new WebSocket(`${proto}://${location.host}/ws`);
      setConnection("connecting");
      socket.onopen = () => setConnection("open");
      socket.onmessage = (e) => {
        const msg = JSON.parse(e.data) as ServerMessage;
        if (msg.type === "state") setState(msg.state);
      };
      socket.onclose = () => {
        setConnection("closed");
        if (!disposed) retry = setTimeout(connect, 1000);
      };
    };
    connect();

    return () => {
      disposed = true;
      clearTimeout(retry);
      socket.close();
    };
  }, []);

  return { state, connection };
}
