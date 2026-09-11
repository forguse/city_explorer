import { Server } from 'socket.io';

let io: Server;

export const setSocketIO = (socketIO: Server) => {
    io = socketIO;
};

export const getSocketIO = (): Server => {
    if (!io) {
        throw new Error('Socket.io not initialized');
    }
    return io;
};
