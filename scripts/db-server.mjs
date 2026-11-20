import { PGlite } from "@electric-sql/pglite";
import { fromNodeSocket } from "pg-gateway/node";
import net from "net";

const PORT = 5432;
const DATA_DIR = "./prisma/pgdata";

console.log(`Starting PostgreSQL Engine (PGlite) with data dir: ${DATA_DIR}...`);
const db = new PGlite(DATA_DIR);
await db.waitReady;
console.log("PostgreSQL engine is ready.");

const server = net.createServer(async (socket) => {
  await fromNodeSocket(socket, {
    serverVersion: "18.7",
    auth: {
      method: "trust", // Trust local connection
    },
    async handleQuery(query, { params }) {
      return await db.query(query, params);
    },
  });
});

server.listen(PORT, "127.0.0.1", () => {
  console.log(`PostgreSQL server listening on 127.0.0.1:${PORT}`);
});
