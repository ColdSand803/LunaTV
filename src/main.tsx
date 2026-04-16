import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import './app/globals.css'; // 复用原有的 CSS

// 这里可以先做一个简单的页面，之后再搬迁原有的 App 组件
const App = () => (
  <div className="flex items-center justify-center h-screen bg-black text-white">
    <div className="text-center">
      <h1 className="text-4xl font-bold mb-4">LunaTV (Hono + Vite 版)</h1>
      <p className="text-gray-400">正在脱胎换骨中...</p>
      <button 
        onClick={() => fetch('/api/health').then(r => r.json()).then(console.log)}
        className="mt-8 px-4 py-2 bg-blue-600 rounded"
      >
        测试后端 API
      </button>
    </div>
  </div>
);

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="*" element={<App />} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>
);
