"use client";
import { useEffect, useState } from "react";
import { useEditor } from "./store";
import { clientId } from "./api";
import { SceneSchema } from "@core/model";
export function useCollaboration() {
  const projectId = useEditor((s) => s.projectId),
    readOnly = useEditor((s) => s.readOnly);
  const [peers, setPeers] = useState<{ clientId: string; name: string }[]>([]),
    [connected, setConnected] = useState(false);
  useEffect(() => {
    if (!projectId || new URLSearchParams(location.search).has("share")) return;
    let socket: WebSocket;
    let stopped = false,
      timer: ReturnType<typeof setTimeout>;
    const connect = () => {
      socket = new WebSocket(
        `${location.protocol === "https:" ? "wss" : "ws"}://${location.host}/collaboration?projectId=${projectId}&clientId=${clientId()}`,
      );
      socket.onopen = () => setConnected(true);
      socket.onmessage = (e) => {
        const event = JSON.parse(e.data);
        if (event.type === "presence")
          setPeers(event.peers.filter((p: any) => p.clientId !== clientId()));
        if (event.type === "cursor")
          window.dispatchEvent(
            new CustomEvent("buildspace-remote-cursor", { detail: event }),
          );
        if (event.type === "revision") {
          const s = useEditor.getState();
          if (s.projectId !== projectId || event.revision <= s.revision) return;
          if (s.status !== "saved") {
            s.set({
              status: "conflict",
              message:
                "A collaborator saved a new revision. Your local edits are preserved; save a copy or reload.",
            });
            return;
          }
          const scene = SceneSchema.safeParse(event.scene);
          if (scene.success)
            s.set({
              scene: scene.data,
              revision: event.revision,
              past: [],
              future: [],
              dirty: 0,
              message: "Updated from your collaborator",
            });
        }
      };
      socket.onclose = () => {
        setConnected(false);
        setPeers([]);
        if (!stopped) timer = setTimeout(connect, 2500);
      };
    };
    function cursor(e: Event) {
      if (socket?.readyState === WebSocket.OPEN)
        socket.send(
          JSON.stringify({ type: "cursor", ...(e as CustomEvent).detail }),
        );
    }
    window.addEventListener("buildspace-cursor", cursor);
    connect();
    return () => {
      window.removeEventListener("buildspace-cursor", cursor);
      stopped = true;
      clearTimeout(timer);
      socket?.close();
      setPeers([]);
    };
  }, [projectId, readOnly]);
  return { peers, connected };
}
