import React, { useState, useEffect } from "react";
import { BrowserRouter as Router, Route, Routes } from "react-router-dom";
import TrainStopwatch from "./TrainStopwatch";
import Logs from "./Logs";

export default function App() {
  const [logs, setLogs] = useState([]);

  // Helper function to check if a date is today
  const isToday = (dateString) => {
    const today = new Date();
    const date = new Date(dateString);
    return date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear();
  };

  // Load logs from localStorage on component mount
  useEffect(() => {
    const loadLogs = () => {
      const savedLogs = localStorage.getItem('trainLogs');
      const savedDate = localStorage.getItem('trainLogsDate');
      
      if (savedLogs && savedDate) {
        // Check if the saved logs are from today
        if (isToday(savedDate)) {
          setLogs(JSON.parse(savedLogs));
        } else {
          // Clear old logs if they're from a different day
          localStorage.removeItem('trainLogs');
          localStorage.removeItem('trainLogsDate');
          setLogs([]);
        }
      }
    };

    loadLogs();

    // Set up timer to check for midnight crossover
    const checkMidnight = () => {
      const now = new Date();
      if (now.getHours() === 0 && now.getMinutes() === 0) {
        // Clear logs at midnight
        localStorage.removeItem('trainLogs');
        localStorage.removeItem('trainLogsDate');
        setLogs([]);
      }
    };

    // Check every minute for midnight crossover
    const midnightInterval = setInterval(checkMidnight, 60000);

    // Also check for midnight crossover when the tab becomes visible
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        loadLogs();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      clearInterval(midnightInterval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  // Save logs to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('trainLogs', JSON.stringify(logs));
    localStorage.setItem('trainLogsDate', new Date().toISOString());
  }, [logs]);

  const addLog = (newLog) => {
    setLogs(prevLogs => {
      // Filter for only today's logs and add the new log
      const todaysLogs = prevLogs.filter(log => isToday(new Date(log.date)));
      return [...todaysLogs, newLog];
    });
  };

  return (
    <Router>
      <Routes>
        <Route path="/" element={<TrainStopwatch logs={logs} setLogs={addLog} />} />
        <Route path="/logs" element={<Logs logs={logs} />} />
      </Routes>
    </Router>
  );
}