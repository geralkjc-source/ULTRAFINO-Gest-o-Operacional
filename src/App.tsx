import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import HomePage from './pages/HomePage';
import HistoryPage from './pages/HistoryPage';

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-gray-100 flex flex-col">
        <nav className="bg-white shadow-md p-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-800">Semáforo de Qualidade</h1>
          <ul className="flex space-x-4">
            <li>
              <Link to="/" className="text-blue-600 hover:text-blue-800">Status em Tempo Real</Link>
            </li>
            <li>
              <Link to="/history" className="text-blue-600 hover:text-blue-800">Histórico</Link>
            </li>
          </ul>
        </nav>
        <main className="flex-grow p-4">
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/history" element={<HistoryPage />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;
