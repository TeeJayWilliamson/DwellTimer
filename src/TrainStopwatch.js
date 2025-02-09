import { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import { Link } from 'react-router-dom';
import './TrainStopwatch.css';

export default function TrainStopwatch({ logs, setLogs }) {
  const [running, setRunning] = useState(false);
  const [startTime, setStartTime] = useState(null);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [localTime, setLocalTime] = useState(new Date());
  const [runNumber, setRunNumber] = useState('');
  const [crowdLevel, setCrowdLevel] = useState('');
  const [showValidation, setShowValidation] = useState(false);
  const [attemptedStop, setAttemptedStop] = useState(false);

  useEffect(() => {
    const timeInterval = setInterval(() => {
      setLocalTime(new Date());
    }, 1000);
    return () => clearInterval(timeInterval);
  }, []);

  useEffect(() => {
    let stopwatchInterval;
    if (running) {
      stopwatchInterval = setInterval(() => {
        setElapsedTime(Date.now() - (startTime ?? Date.now() - elapsedTime));
      }, 100);
    }
    return () => clearInterval(stopwatchInterval);
  }, [running, elapsedTime, startTime]); // Added startTime  

  const validateInputs = () => {
    return runNumber.length === 3 && crowdLevel !== '';
  };

  const handleStart = () => {
    setStartTime(Date.now() - elapsedTime);
    setRunning(true);
    setAttemptedStop(false);
    setShowValidation(false);
  };

  const handleStop = () => {
    if (!validateInputs()) {
      setShowValidation(true);
      setAttemptedStop(true);
      return;
    }
  
    if (running) {
      setRunning(false);
      setAttemptedStop(false);
      const finalElapsed = (elapsedTime / 1000).toFixed(2);
      const newLog = {
        time: new Date().toLocaleTimeString(),
        duration: parseFloat(finalElapsed),
        runNumber,
        crowdLevel,
        date: new Date().toLocaleDateString()
      };
      setLogs(newLog); // Now calling the addLog function from App.js
    }
  };

  const handleReset = () => {
    setRunning(false);
    setElapsedTime(0);
    setStartTime(null);
    setRunNumber('');
    setCrowdLevel('');
    setShowValidation(false);
    setAttemptedStop(false);
  };

  const handleRunNumberChange = (e) => {
    const value = e.target.value.replace(/\D/g, '').slice(0, 3);
    setRunNumber(value);
    if (attemptedStop) setShowValidation(true);
  };

  const handleCrowdLevelChange = (e) => {
    setCrowdLevel(e.target.value);
    if (attemptedStop) setShowValidation(true);
  };

  const exportLogs = () => {
    const ws = XLSX.utils.json_to_sheet(logs);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Logs");
    const excelBuffer = XLSX.write(wb, { bookType: "xlsx", type: "array" });
    const data = new Blob([excelBuffer], { type: "application/octet-stream" });
    saveAs(data, "TrainLogs.xlsx");
  };

  return (
    <div className="stopwatch-container">
      <div className="ttc-header">
        <div className="ttc-logo">TTC</div>
        <h1 className="stopwatch-title">Dwell Timer</h1>
      </div>

      <div className={`input-section ${running && 'running'}`}>
        <div className="input-group">
          <label htmlFor="runNumber">Run Number:</label>
          <input
            type="text"
            id="runNumber"
            value={runNumber}
            onChange={handleRunNumberChange}
            className={showValidation && runNumber.length !== 3 ? 'error' : ''}
            placeholder="Enter 3 digits"
          />
          {showValidation && runNumber.length !== 3 && (
            <span className="error-message">Enter a 3-digit run number</span>
          )}
        </div>

        <div className="input-group">
          <label htmlFor="crowdLevel">Crowd Level:</label>
          <select
            id="crowdLevel"
            value={crowdLevel}
            onChange={handleCrowdLevelChange}
            className={showValidation && !crowdLevel ? 'error' : ''}
          >
            <option value="">Select level</option>
            <option value="Light">Light</option>
            <option value="Moderate">Moderate</option>
            <option value="Heavy">Heavy</option>
          </select>
          {showValidation && !crowdLevel && (
            <span className="error-message">Select a crowd level</span>
          )}
        </div>
      </div>

      {running && !validateInputs() && (
        <div className="warning-message">
          ⚠️ Please enter Run Number and Crowd Level before stopping
        </div>
      )}

      <div className="time-display">
        <p className="local-time">{localTime.toLocaleTimeString()}</p>
        <div className="elapsed-time">
          {(elapsedTime / 1000).toFixed(2)}s
        </div>
      </div>

      <div className="control-section">
        <div className="primary-buttons">
          <button
            className={`control-button start-button ${running ? "disabled" : ""}`}
            onClick={handleStart}
            disabled={running}
          >
            Start
          </button>
          <button
            className="control-button stop-button"
            onClick={handleStop}
          >
            Stop
          </button>
        </div>
        
        <button
          className="control-button reset-button"
          onClick={handleReset}
        >
          Reset
        </button>
      </div>

      {logs.length > 0 && (
        <div className="last-log">
          <p className="last-log-text">
            Last Log: Run #{logs[logs.length - 1].runNumber} - {logs[logs.length - 1].time} - {logs[logs.length - 1].duration.toFixed(2)}s - {logs[logs.length - 1].crowdLevel}
          </p>
        </div>
      )}

      <div className="export-container">
        <Link to="/logs" className="action-button">View Logs</Link>
        <button className="action-button" onClick={exportLogs}>Export Logs</button>
      </div>
    </div>
  );
}