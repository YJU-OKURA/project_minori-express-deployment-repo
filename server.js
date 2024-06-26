const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const url = require('url');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

const rooms = {};

wss.on('connection', (ws, req) => {
  const query = url.parse(req.url, true).query;
  const classId = query.classId;
  const userId = query.userId;

  if (!rooms[classId]) {
    rooms[classId] = [];
  }
  rooms[classId].push({ userId, ws });

  console.log(`User ${userId} joined class ${classId}`);
  console.log(`Current users in class ${classId}:`, rooms[classId].map(client => client.userId));

  ws.on('message', (message) => {
    const data = JSON.parse(message);
    handleWebSocketMessage(data, classId, userId);
  });

  ws.on('close', () => {
    rooms[classId] = rooms[classId].filter(client => client.userId !== userId);
    if (rooms[classId].length === 0) {
      delete rooms[classId];
    }
    console.log(`User ${userId} left class ${classId}`);
  });
});

const handleWebSocketMessage = (data, classId, userId) => {
  const { event, data: eventData } = data;
  console.log(`Received ${event} from user ${userId} in class ${classId}`);
  switch (event) {
    case 'offer':
      broadcastToAll(classId, { event, data: eventData });
      break;
    case 'answer':
    case 'candidate':
      broadcastToOthers(classId, userId, { event, data: eventData });
      break;
    default:
      break;
  }
};

const broadcastToAll = (classId, message) => {
  if (rooms[classId]) {
    rooms[classId].forEach(client => {
      client.ws.send(JSON.stringify(message));
    });
  }
};

const broadcastToOthers = (classId, userId, message) => {
  if (rooms[classId]) {
    rooms[classId].forEach(client => {
      if (client.userId !== userId) {
        client.ws.send(JSON.stringify(message));
      }
    });
  }
};

server.listen(8080, () => {
  console.log('Server is listening on port 8080');
});
