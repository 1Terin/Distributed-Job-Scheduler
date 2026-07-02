import http from "http";
import app from "./app";
import { initWebsocket } from "./utils/broadcast";

const port = Number(process.env.PORT || 4000);
const server = http.createServer(app);

initWebsocket(server);

server.listen(port, () => {
  console.log(`Backend listening on http://localhost:${port}`);
  console.log(`WebSocket endpoint available at ws://localhost:${port}/ws`);
});
