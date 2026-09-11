import React, { createContext, useContext, useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';

interface SocketContextType {
    socket: Socket | null;
    isConnected: boolean;
}

const SocketContext = createContext<SocketContextType>({
    socket: null,
    isConnected: false
});

export const useSocket = () => {
    const context = useContext(SocketContext);
    if (!context) {
        throw new Error('useSocket must be used within SocketProvider');
    }
    return context;
};

interface SocketProviderProps {
    children: React.ReactNode;
}

export const SocketProvider: React.FC<SocketProviderProps> = ({ children }) => {
    const [socket, setSocket] = useState<Socket | null>(null);
    const [isConnected, setIsConnected] = useState(false);

    useEffect(() => {
        // Get API URL from environment or detect automatically
        let apiUrl = import.meta.env.VITE_API_URL;

        if (!apiUrl) {
            // 检测是否在 Capacitor/Android 环境中运行
            // @ts-ignore
            const isCapacitor = window.Capacitor !== undefined;
            const isLocalFile = window.location.protocol === 'file:' || window.location.protocol === 'capacitor:';

            if (isCapacitor || isLocalFile) {
                // Capacitor 生产构建必须通过 VITE_API_URL 指定服务地址。
                // 本地 Android 调试可配合 adb reverse tcp:5000 tcp:5000。
                console.warn('[Socket] VITE_API_URL is not set; falling back to local development API.');
                apiUrl = 'http://localhost:5000';
            } else {
                const isDev = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
                if (isDev) {
                    apiUrl = 'http://localhost:5000';
                } else {
                    // 生产环境：使用当前域名（Socket.io 通过 /api 路径代理）
                    apiUrl = window.location.origin;
                }
            }
        }

        apiUrl = apiUrl.replace(/\/api\/?$/, '').replace(/\/$/, '');

        // Get auth token from localStorage
        const token = localStorage.getItem('token');

        // 后端统一在 /api/socket.io 暴露 Socket.io。
        const socketPath = '/api/socket.io';

        const newSocket = io(apiUrl, {
            path: socketPath,
            auth: {
                token
            },
            // 优先使用 websocket，失败后降级到 polling
            transports: ['websocket', 'polling'],
            // 重连配置
            reconnection: true,
            reconnectionAttempts: 5,
            reconnectionDelay: 1000,
            reconnectionDelayMax: 5000,
            // 超时配置（与后端匹配）
            timeout: 45000,
            // 自动升级连接
            upgrade: true,
            // 强制使用新连接
            forceNew: false,
            // 增加缓冲区
            withCredentials: true
        });

        newSocket.on('connect', () => {
            console.log('[Socket] Connected:', newSocket.id);
            setIsConnected(true);
        });

        newSocket.on('disconnect', () => {
            console.log('[Socket] Disconnected');
            setIsConnected(false);
        });

        newSocket.on('connect_error', (error) => {
            console.error('[Socket] Connection error:', error);
        });

        setSocket(newSocket);

        return () => {
            console.log('[Socket] Cleaning up connection');
            newSocket.close();
        };
    }, []);

    return (
        <SocketContext.Provider value={{ socket, isConnected }}>
            {children}
        </SocketContext.Provider>
    );
};
