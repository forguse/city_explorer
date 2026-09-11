import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import axios from 'axios';
import { CapacitorHttp } from '@capacitor/core';

const DebugPanel: React.FC = () => {
    const [debugInfo, setDebugInfo] = useState<any>({});
    const [show, setShow] = useState(true);
    const [apiTestResult, setApiTestResult] = useState<string>('');
    const [testing, setTesting] = useState(false);
    const [networkTestResult, setNetworkTestResult] = useState<string>('');
    const [testingNetwork, setTestingNetwork] = useState(false);

    useEffect(() => {
        // 获取实际使用的 API URL
        const actualApiUrl = api.defaults.baseURL;

        // 收集调试信息
        const info = {
            // @ts-ignore
            hasCapacitor: typeof window.Capacitor !== 'undefined',
            // @ts-ignore
            capacitorPlatform: window.Capacitor?.getPlatform?.() || 'N/A',
            protocol: window.location.protocol,
            hostname: window.location.hostname,
            origin: window.location.origin,
            href: window.location.href,
            // @ts-ignore
            viteApiUrl: import.meta.env.VITE_API_URL || 'undefined',
            actualApiUrl: actualApiUrl || 'undefined',
            userAgent: navigator.userAgent
        };
        setDebugInfo(info);
        console.log('[DebugPanel] Environment Info:', info);
    }, []);

    const testApiConnection = async () => {
        setTesting(true);
        setApiTestResult('测试中...');

        try {
            const startTime = Date.now();
            // 尝试调用一个简单的 API 端点
            const response = await api.get('/users/me');
            const duration = Date.now() - startTime;

            setApiTestResult(`✅ 成功！\n状态: ${response.status}\n耗时: ${duration}ms\n数据: ${JSON.stringify(response.data, null, 2)}`);
        } catch (error: any) {
            const duration = Date.now() - Date.now();
            let errorMsg = '❌ 失败！\n';

            if (error.response) {
                // 服务器返回了错误响应
                errorMsg += `状态码: ${error.response.status}\n`;
                errorMsg += `错误信息: ${JSON.stringify(error.response.data, null, 2)}\n`;
                errorMsg += `Headers: ${JSON.stringify(error.response.headers, null, 2)}`;
            } else if (error.request) {
                // 请求已发送但没有收到响应
                errorMsg += `网络错误: 无法连接到服务器\n`;
                errorMsg += `错误详情: ${error.message}\n`;
                errorMsg += `请求URL: ${api.defaults.baseURL}/users/me`;
            } else {
                // 其他错误
                errorMsg += `错误: ${error.message}`;
            }

            setApiTestResult(errorMsg);
        } finally {
            setTesting(false);
        }
    };

    const testNetworkConnectivity = async () => {
        try {
            console.log('[DebugPanel] 开始网络诊断...');
            setTestingNetwork(true);
            setNetworkTestResult('正在测试网络连接...\n\n📡 准备测试...');

            const results: string[] = [];
            const apiUrl = new URL(String(api.defaults.baseURL || '/api'), window.location.origin).toString().replace(/\/$/, '');
            const serverUrl = apiUrl.replace(/\/api$/, '');
            console.log('[DebugPanel] 准备开始测试...');

        // 测试 1: 测试基本互联网连接（百度）
        results.push('📡 测试 1: 基本互联网连接');
        setNetworkTestResult(results.join('\n')); // 实时更新
        try {
            const startTime = Date.now();
            const response = await CapacitorHttp.get({
                url: 'https://www.baidu.com',
                connectTimeout: 10000,
                readTimeout: 10000
            });
            const duration = Date.now() - startTime;
            results.push(`✅ 百度可访问 (${duration}ms)`);
            results.push(`   状态码: ${response.status}\n`);
        } catch (error: any) {
            results.push(`❌ 百度不可访问: ${error.message}\n`);
        }
        setNetworkTestResult(results.join('\n')); // 实时更新

        // 测试 2: 测试配置的服务器（不带 /api）
        results.push('📡 测试 2: 服务器根域名');
        setNetworkTestResult(results.join('\n')); // 实时更新
        try {
            const startTime = Date.now();
            const response = await CapacitorHttp.get({
                url: serverUrl,
                connectTimeout: 10000,
                readTimeout: 10000
            });
            const duration = Date.now() - startTime;
            results.push(`✅ 服务器可访问 (${duration}ms)`);
            results.push(`   状态码: ${response.status}`);
            results.push(`   响应大小: ${JSON.stringify(response.data).length} bytes\n`);
        } catch (error: any) {
            results.push(`❌ 服务器不可访问: ${error.message}\n`);
        }
        setNetworkTestResult(results.join('\n')); // 实时更新

        // 测试 3: 测试 API 端点（带 /api）
        results.push('📡 测试 3: API 端点');
        setNetworkTestResult(results.join('\n')); // 实时更新
        try {
            const startTime = Date.now();
            const response = await CapacitorHttp.get({
                url: apiUrl,
                connectTimeout: 10000,
                readTimeout: 10000
            });
            const duration = Date.now() - startTime;
            results.push(`✅ API 端点可访问 (${duration}ms)`);
            results.push(`   状态码: ${response.status}`);
            results.push(`   响应: ${JSON.stringify(response.data).substring(0, 100)}...\n`);
        } catch (error: any) {
            results.push(`❌ API 端点不可访问: ${error.message}\n`);
        }
        setNetworkTestResult(results.join('\n')); // 实时更新

        // 测试 4: 测试 /api/auth/login 端点
        results.push('📡 测试 4: 登录端点');
        setNetworkTestResult(results.join('\n')); // 实时更新
        try {
            const startTime = Date.now();
            const response = await CapacitorHttp.post({
                url: `${apiUrl}/auth/login`,
                headers: { 'Content-Type': 'application/json' },
                data: { username: 'test', password: 'test' },
                connectTimeout: 10000,
                readTimeout: 10000
            });
            const duration = Date.now() - startTime;
            results.push(`✅ 登录端点可访问 (${duration}ms)`);
            results.push(`   状态码: ${response.status}`);
            results.push(`   响应: ${JSON.stringify(response.data).substring(0, 100)}...\n`);
        } catch (error: any) {
            results.push(`❌ 登录端点不可访问: ${error.message}\n`);
        }

        results.push('\n✅ 诊断完成！');
        setNetworkTestResult(results.join('\n'));
        setTestingNetwork(false);
    } catch (error: any) {
        console.error('[DebugPanel] 网络诊断出错:', error);
        setNetworkTestResult(`❌ 诊断过程出错: ${error.message}`);
        setTestingNetwork(false);
    }
    };

    if (!show) return null;

    return (
        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.9)',
            color: '#00ff00',
            padding: '10px',
            fontSize: '12px',
            zIndex: 9999,
            maxHeight: '50vh',
            overflow: 'auto',
            fontFamily: 'monospace'
        }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                <strong>🐛 Debug Info</strong>
                <button
                    onClick={() => setShow(false)}
                    style={{
                        background: '#ff0000',
                        color: 'white',
                        border: 'none',
                        padding: '2px 8px',
                        cursor: 'pointer',
                        borderRadius: '3px'
                    }}
                >
                    关闭
                </button>
            </div>
            <div style={{ lineHeight: '1.6' }}>
                <div><strong>Capacitor:</strong> {debugInfo.hasCapacitor ? '✅ YES' : '❌ NO'}</div>
                <div><strong>Platform:</strong> {debugInfo.capacitorPlatform}</div>
                <div><strong>Protocol:</strong> {debugInfo.protocol}</div>
                <div><strong>Hostname:</strong> {debugInfo.hostname}</div>
                <div><strong>Origin:</strong> {debugInfo.origin}</div>
                <div><strong>Full URL:</strong> {debugInfo.href}</div>
                <div style={{ marginTop: '10px', padding: '5px', backgroundColor: 'rgba(255, 255, 0, 0.2)' }}>
                    <div><strong>VITE_API_URL (env):</strong> {debugInfo.viteApiUrl}</div>
                    <div><strong>🎯 实际 API URL:</strong> {debugInfo.actualApiUrl}</div>
                </div>

                {/* API 测试按钮 */}
                <div style={{ marginTop: '10px', padding: '5px', backgroundColor: 'rgba(0, 255, 255, 0.2)' }}>
                    <button
                        onClick={testApiConnection}
                        disabled={testing}
                        style={{
                            background: testing ? '#666' : '#00aaff',
                            color: 'white',
                            border: 'none',
                            padding: '5px 10px',
                            cursor: testing ? 'not-allowed' : 'pointer',
                            borderRadius: '3px',
                            width: '100%',
                            marginBottom: '5px'
                        }}
                    >
                        {testing ? '测试中...' : '🔍 测试 API 连接'}
                    </button>
                    {apiTestResult && (
                        <pre style={{
                            margin: 0,
                            padding: '5px',
                            backgroundColor: 'rgba(0, 0, 0, 0.5)',
                            fontSize: '10px',
                            whiteSpace: 'pre-wrap',
                            wordBreak: 'break-all',
                            maxHeight: '200px',
                            overflow: 'auto'
                        }}>
                            {apiTestResult}
                        </pre>
                    )}
                </div>

                {/* 网络诊断按钮 */}
                <div style={{ marginTop: '10px', padding: '5px', backgroundColor: 'rgba(255, 165, 0, 0.2)' }}>
                    <button
                        onClick={testNetworkConnectivity}
                        disabled={testingNetwork}
                        style={{
                            background: testingNetwork ? '#666' : '#ff8800',
                            color: 'white',
                            border: 'none',
                            padding: '5px 10px',
                            cursor: testingNetwork ? 'not-allowed' : 'pointer',
                            borderRadius: '3px',
                            width: '100%',
                            marginBottom: '5px'
                        }}
                    >
                        {testingNetwork ? '诊断中...' : '🔬 完整网络诊断'}
                    </button>
                    {networkTestResult && (
                        <pre style={{
                            margin: 0,
                            padding: '5px',
                            backgroundColor: 'rgba(0, 0, 0, 0.5)',
                            fontSize: '10px',
                            whiteSpace: 'pre-wrap',
                            wordBreak: 'break-all',
                            maxHeight: '300px',
                            overflow: 'auto'
                        }}>
                            {networkTestResult}
                        </pre>
                    )}
                </div>

                <div style={{ marginTop: '10px', fontSize: '10px', opacity: 0.7 }}>
                    <strong>User Agent:</strong><br/>
                    {debugInfo.userAgent}
                </div>
            </div>
        </div>
    );
};

export default DebugPanel;
