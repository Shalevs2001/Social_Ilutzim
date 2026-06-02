import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import App from './App';
import { EmployeeViewPage } from './components/employee/EmployeeView';
import { ScheduleViewPage } from './components/schedule/ScheduleViewPage';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<App />} />
        <Route path="/employee" element={<EmployeeViewPage />} />
        <Route path="/view/:id" element={<ScheduleViewPage />} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>
);
