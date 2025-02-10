import { useState, useEffect } from 'react';
import { saveAs } from 'file-saver';
import { Link } from 'react-router-dom';
import './TrainStopwatch.css';
import ExcelJS from "exceljs";

// Helper function to determine time slot based on current hour
const getTimeSlot = (timeString) => {
  const time = new Date(`1970/01/01 ${timeString}`);
  const hours = time.getHours();
  const minutes = time.getMinutes();
  
  // Split current hour into 15-minute intervals
  if (minutes >= 0 && minutes < 15) return `${hours}:00-${hours}:15`;
  if (minutes >= 15 && minutes < 30) return `${hours}:16-${hours}:30`;
  if (minutes >= 30 && minutes < 45) return `${hours}:31-${hours}:45`;
  if (minutes >= 45 && minutes < 60) return `${hours}:46-${hours + 1}:00`;
  return 'Other';
};

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
  }, [running, elapsedTime, startTime]);

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
      setLogs(newLog);
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

  const exportLogs = async () => {
    if (!logs.length) {
        alert("No logs to export.");
        return;
    }

    // Create a new workbook and worksheet
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Train Logs");

    // Group logs by time slot
    const logsByTimeSlot = logs.reduce((acc, log) => {
        const timeSlot = getTimeSlot(log.time);
        if (!acc[timeSlot]) {
            acc[timeSlot] = [];
        }
        acc[timeSlot].push(log);
        return acc;
    }, {});

    // Define alternating green shades for rows
    const rowColors = ["E0F8E0", "B8E0B8"]; // Light green shades

    // Add headers with merged cells and styling
    let columnIndex = 1;
    Object.keys(logsByTimeSlot).forEach((timeSlot) => {
        // Merge two cells for the time slot header
        worksheet.mergeCells(1, columnIndex, 1, columnIndex + 1);

        // Style the merged header cell
        const headerCell = worksheet.getCell(1, columnIndex);
        headerCell.value = timeSlot;
        headerCell.alignment = { horizontal: "center", vertical: "middle" };
        headerCell.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: "FF0000" }, // Red background
        };
        headerCell.font = { bold: true, color: { argb: "FFFFFF" } }; // White font
        headerCell.border = {
            top: { style: "thin" },
            left: { style: "thin" },
            bottom: { style: "thin" },
            right: { style: "thin" }
        };

        columnIndex += 2; // Move to the next time slot (2 columns per slot)
    });

    // Add logs data under each time slot
    Object.entries(logsByTimeSlot).forEach(([timeSlot, slotLogs], slotIndex) => {
        let colStart = slotIndex * 2 + 1; // Start column for this time slot
        let rowIndex = 2; // Reset rowIndex for each time slot

        slotLogs.forEach((log, logIndex) => {
            const bgColor = rowColors[logIndex % rowColors.length]; // Alternate row colors

            // Add Run Number
            const runCell = worksheet.getCell(rowIndex, colStart);
            runCell.value = `Run: ${log.runNumber}`;
            runCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: bgColor } };
            runCell.border = { top: { style: "thin" }, left: { style: "thin" }, bottom: { style: "thin" }, right: { style: "thin" } };
            runCell.alignment = { horizontal: "center", vertical: "middle" };

            // Add Time
            const timeCell = worksheet.getCell(rowIndex, colStart + 1);
            timeCell.value = log.time;
            timeCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: bgColor } };
            timeCell.border = { top: { style: "thin" }, left: { style: "thin" }, bottom: { style: "thin" }, right: { style: "thin" } };
            timeCell.alignment = { horizontal: "center", vertical: "middle" };

            rowIndex++;

            // Add Duration (merged across two columns)
            worksheet.mergeCells(rowIndex, colStart, rowIndex, colStart + 1);
            const durationCell = worksheet.getCell(rowIndex, colStart);
            durationCell.value = `${log.duration.toFixed(2)} seconds`;
            durationCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: bgColor } };
            durationCell.border = { top: { style: "thin" }, left: { style: "thin" }, bottom: { style: "thin" }, right: { style: "thin" } };
            durationCell.alignment = { horizontal: "center", vertical: "middle" };

            rowIndex++;

            // Add Crowd Level Label and Value
            const crowdLabelCell = worksheet.getCell(rowIndex, colStart);
            crowdLabelCell.value = "Crowd Levels:";
            crowdLabelCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: bgColor } };
            crowdLabelCell.border = { top: { style: "thin" }, left: { style: "thin" }, bottom: { style: "thin" }, right: { style: "thin" } };
            crowdLabelCell.alignment = { horizontal: "center", vertical: "middle" };

            const crowdValueCell = worksheet.getCell(rowIndex, colStart + 1);
            crowdValueCell.value = log.crowdLevel;
            crowdValueCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: bgColor } };
            crowdValueCell.border = { top: { style: "thin" }, left: { style: "thin" }, bottom: { style: "thin" }, right: { style: "thin" } };
            crowdValueCell.alignment = { horizontal: "center", vertical: "middle" };

            rowIndex++;
        });
    });

    // Adjust column widths for readability
    worksheet.columns.forEach(column => {
        column.width = 20;
    });

    // Generate and save the Excel file
    const buffer = await workbook.xlsx.writeBuffer();
    saveAs(new Blob([buffer], { type: "application/octet-stream" }), `${new Date().toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' })} Dwells.xlsx`);
};  

  return (
    <div className="stopwatch-container">
      <div className="ttc-header">
        <img src="/TTC.png" alt="TTC Logo" className="ttc-logo" />
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
