// TrainStopwatch.js
import React, { useState, useEffect, useRef } from 'react';
import { saveAs } from 'file-saver';
import { Link } from 'react-router-dom';
import './TrainStopwatch.css';
import ExcelJS from "exceljs";

const getTimeSlot = (timeString) => {
    const time = new Date(`1970/01/01 ${timeString}`);
    const hours = time.getHours();
    const minutes = time.getMinutes();
    if (minutes >= 0 && minutes < 15) return `${hours}:00-${hours}:15`;
    if (minutes >= 15 && minutes < 30) return `${hours}:16-${hours}:30`;
    if (minutes >= 30 && minutes < 45) return `${hours}:31-${hours}:45`;
    if (minutes >= 45 && minutes < 60) return `${hours}:46-${hours + 1}:00`;
    return 'Other';
};

export default function TrainStopwatch({ logs, setLogs }) { // Receive logs and setLogs as props
    const [running, setRunning] = useState(false);
    const [startTime, setStartTime] = useState(null);
    const [elapsedTime, setElapsedTime] = useState(0);
    const [localTime, setLocalTime] = useState(new Date());
    const [runNumber, setRunNumber] = useState('');
    const [crowdLevel, setCrowdLevel] = useState('');
    const [selectedLocation, setSelectedLocation] = useState('');
    const [showValidation, setShowValidation] = useState(false);
    const [attemptedStop, setAttemptedStop] = useState(false);

    const locations = [
        "Yonge & Bloor NB AM Rush Hour",
        "Yonge & Bloor SB AM Rush Hour",
        "Union NB AM Rush Hour",
        "St George SB AM Rush Hour",
        "Yonge & Bloor NB PM Rush Hour",
        "Yonge & Bloor SB PM Rush Hour",
        "Union NB PM Rush Hour",
        "St George SB PM Rush Hour"
    ];

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

    const handleLocationChange = (e) => {
        setSelectedLocation(e.target.value);
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
            console.log("New Log Entry:", newLog); // Debugging log
            setLogs(prevLogs => [...prevLogs, newLog]); // Use the setLogs prop
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
  
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet("Train Logs");
  
      const logsByTimeSlot = logs.reduce((acc, log) => {
          const timeSlot = getTimeSlot(log.time);
          if (!acc[timeSlot]) {
              acc[timeSlot] = [];
          }
          acc[timeSlot].push(log);
          return acc;
      }, {});
  
      const now = new Date();
      const currentTimeSlot = getTimeSlot(now.toLocaleTimeString());
      const timeSlots = [currentTimeSlot];
      let nextTime = new Date(now);
  
      for (let i = 0; i < 3; i++) {
          nextTime.setMinutes(nextTime.getMinutes() + 15);
          timeSlots.push(getTimeSlot(nextTime.toLocaleTimeString()));
      }
  
      const uniqueTimeSlots = [...new Set(timeSlots)];
      const totalColumns = uniqueTimeSlots.length * 2;
  
      // Location Header
      worksheet.mergeCells(1, 1, 1, totalColumns);
      const locationCell = worksheet.getCell(1, 1);
      locationCell.value = selectedLocation || "LOCATION NAME";
      locationCell.font = { name: "Calibri", size: 22, bold: true, color: { argb: "000000" } };
      locationCell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
      locationCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFC000" } };
      locationCell.border = { top: { style: "thin" }, left: { style: "thin" }, bottom: { style: "thin" }, right: { style: "thin" } };
      worksheet.getRow(1).height = 45;
  
      // Date Header
      worksheet.mergeCells(2, 1, 2, totalColumns);
      const dateCell = worksheet.getCell(2, 1);
      dateCell.value = new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });
      dateCell.font = { name: "Calibri", size: 12, bold: true };
      dateCell.alignment = { horizontal: "left", vertical: "middle" };
      dateCell.border = { top: { style: "thin" }, left: { style: "thin" }, bottom: { style: "thin" }, right: { style: "thin" } };
  
      const rowColors = ["D0CECE", "DEEAF6"];
  
      // Time Slot Headers
      let columnIndex = 1;
      uniqueTimeSlots.forEach((timeSlot) => {
          worksheet.mergeCells(3, columnIndex, 3, columnIndex + 1);
          const headerCell = worksheet.getCell(3, columnIndex);
          headerCell.value = timeSlot;
          headerCell.font = { name: "Calibri", size: 12, bold: true, color: { argb: "000000" } };
          headerCell.alignment = { horizontal: "center", vertical: "middle" };
          headerCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "AEABAB" } };
          headerCell.border = { top: { style: "thin" }, left: { style: "thin" }, bottom: { style: "thin" }, right: { style: "thin" } };
          columnIndex += 2;
      });
  
      // Log Data
      uniqueTimeSlots.forEach((timeSlot, slotIndex) => {
          const slotLogs = logs.filter((log) => getTimeSlot(log.time) === timeSlot);
          let colStart = slotIndex * 2 + 1;
          let rowIndex = 4;
  
          slotLogs.forEach((log, logIndex) => {
              if (!log) return;
  
              const bgColor = rowColors[logIndex % rowColors.length];
  
              const runCell = worksheet.getCell(rowIndex, colStart);
              runCell.value = `Run: ${log.runNumber || "N/A"}`;
              runCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: bgColor } };
              runCell.alignment = { horizontal: "center", vertical: "middle" };
              runCell.font = { name: "Calibri", size: 12 };
              runCell.border = { top: { style: "thin" }, left: { style: "thin" }, bottom: { style: "thin" }, right: { style: "thin" } };
  
              const timeCell = worksheet.getCell(rowIndex, colStart + 1);
              timeCell.value = log.time || "N/A";
              timeCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: bgColor } };
              timeCell.alignment = { horizontal: "center", vertical: "middle" };
              timeCell.border = { top: { style: "thin" }, left: { style: "thin" }, bottom: { style: "thin" }, right: { style: "thin" } };
  
              rowIndex++;
  
              worksheet.mergeCells(rowIndex, colStart, rowIndex, colStart + 1);
              const durationCell = worksheet.getCell(rowIndex, colStart);
              const duration = typeof log.duration === "number" ? log.duration.toFixed(2) : "N/A";
              durationCell.value = `${duration} ${duration !== "N/A" ? "seconds" : ""}`;
              durationCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: bgColor } };
              durationCell.alignment = { horizontal: "center", vertical: "middle" };
              durationCell.border = { top: { style: "thin" }, left: { style: "thin" }, bottom: { style: "thin" }, right: { style: "thin" } };
  
              rowIndex++;
  
              const crowdLabelCell = worksheet.getCell(rowIndex, colStart);
              crowdLabelCell.value = "Crowd Levels:";
              crowdLabelCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: bgColor } };
              crowdLabelCell.alignment = { horizontal: "center", vertical: "middle" };
              crowdLabelCell.border = { top: { style: "thin" }, left: { style: "thin" }, bottom: { style: "thin" }, right: { style: "thin" } };
  
              const crowdValueCell = worksheet.getCell(rowIndex, colStart + 1);
              crowdValueCell.value = log.crowdLevel || "N/A";
              crowdValueCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: bgColor } };
              crowdValueCell.alignment = { horizontal: "center", vertical: "middle" };
              crowdValueCell.border = { top: { style: "thin" }, left: { style: "thin" }, bottom: { style: "thin" }, right: { style: "thin" } };
  
              rowIndex++;
          });
      });
  
// Adjust column widths for paired columns
uniqueTimeSlots.forEach((_, slotIndex) => {
  const colStart = slotIndex * 2 + 1;
  worksheet.getColumn(colStart).width = 13.75; // ~110px
  worksheet.getColumn(colStart + 1).width = 11.25; // ~90px
});
  
      const buffer = await workbook.xlsx.writeBuffer();
      saveAs(new Blob([buffer], { type: "application/octet-stream" }), `${new Date().toLocaleDateString("en-US", { month: "2-digit", day: "2-digit", year: "numeric" })} Dwells.xlsx`);
  };
  

    return (
        <div className="stopwatch-container">
            <div className="ttc-header">
                <img src="/TTC.png" alt="TTC Logo" className="ttc-logo" />
                <h1 className="stopwatch-title">Dwell Timer</h1>
            </div>
            <div className="location-selector">
                <select
                    value={selectedLocation}
                    onChange={handleLocationChange}
                    className="location-dropdown"
                >
                    <option value="">Choose a location</option>
                    {locations.map((location, index) => (
                        <option key={index} value={location}>{location}</option>
                    ))}
                </select>
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
                    Next Train
                </button>
            </div>

            {logs.length > 0 && (
                <div className="last-log">
                    <p className="last-log-text">
                        Last Log: Run #{logs[logs.length - 1]?.runNumber} - {logs[logs.length - 1]?.time} - {logs[logs.length - 1]?.duration?.toFixed(2)}s - {logs[logs.length - 1]?.crowdLevel}
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
