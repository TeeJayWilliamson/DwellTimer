// TrainStopwatch.js
import React, { useState, useEffect} from 'react';
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

    const getNextTimeSlots = (startTime, count = 5) => {
        const slots = [];
        const time = new Date(startTime);
        const currentSlot = getTimeSlot(time.toLocaleTimeString());
        slots.push(currentSlot);
    
        // Get the start time of the next slot
        const [currentHour, currentMinute] = currentSlot.split('-')[0].split(':').map(Number);
        time.setHours(currentHour);
        time.setMinutes(currentMinute);
    
        // Add the next 4 time slots
        for (let i = 1; i < count; i++) {
            time.setMinutes(time.getMinutes() + 15);
            slots.push(getTimeSlot(time.toLocaleTimeString()));
        }
    
        return slots;
    };
    
const exportLogs = async () => {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Train Logs");

    // Find the earliest log time
    const earliestLog = logs.reduce((earliest, log) => {
        const logTime = new Date(`1970/01/01 ${log.time}`);
        const earliestTime = new Date(`1970/01/01 ${earliest.time}`);
        return logTime < earliestTime ? log : earliest;
    }, logs[0]);

    // If no logs exist, use current time
    const startTime = earliestLog 
        ? new Date(`1970/01/01 ${earliestLog.time}`)
        : new Date();

    // Get time slots starting from earliest log
    const timeSlots = getNextTimeSlots(startTime);
    const totalColumns = timeSlots.length * 2;

    // Location Header (Row 1)
    for (let i = 1; i <= totalColumns; i++) {
        const cell = worksheet.getCell(1, i);
        if (i === 1) {
            cell.value = selectedLocation || "LOCATION NAME";
        }
        cell.font = { name: "Calibri", size: 22, bold: true, color: { argb: "000000" } };
        cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFC000" } };
        cell.border = { top: { style: "thin" }, left: { style: "thin" }, bottom: { style: "thin" }, right: { style: "thin" } };
    }
    worksheet.mergeCells(`A1:${worksheet.getCell(1, totalColumns)._address}`);
    worksheet.getRow(1).height = 45;

    // Date Header (Row 2)
    for (let i = 1; i <= totalColumns; i++) {
        const cell = worksheet.getCell(2, i);
        if (i === 1) {
            cell.value = new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });
        }
        cell.font = { name: "Calibri", size: 12, bold: true };
        cell.alignment = { horizontal: "left", vertical: "middle" };
        cell.border = { top: { style: "thin" }, left: { style: "thin" }, bottom: { style: "thin" }, right: { style: "thin" } };
    }
    worksheet.mergeCells(`A2:${worksheet.getCell(2, totalColumns)._address}`);

    const rowColors = ["D0CECE", "DEEAF6"];

    // Time Slot Headers (Row 3)
    timeSlots.forEach((timeSlot, index) => {
        const colStart = index * 2 + 1;
        const headerCell = worksheet.getCell(3, colStart);
        headerCell.value = timeSlot;
        headerCell.font = { name: "Calibri", size: 12, bold: true, color: { argb: "000000" } };
        headerCell.alignment = { horizontal: "center", vertical: "middle" };
        headerCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "AEABAB" } };
        headerCell.border = { top: { style: "thin" }, left: { style: "thin" }, bottom: { style: "thin" }, right: { style: "thin" } };
        
        const secondCell = worksheet.getCell(3, colStart + 1);
        secondCell.border = { top: { style: "thin" }, left: { style: "thin" }, bottom: { style: "thin" }, right: { style: "thin" } };
        worksheet.mergeCells(3, colStart, 3, colStart + 1);
    });

    let maxRowUsed = 4; // Track the maximum row used across all columns

    // Calculate per-slot dwell times and counts
    const slotDwellTimes = new Array(timeSlots.length).fill(0);
    const slotCounts = new Array(timeSlots.length).fill(0);

    // Log Data and track counts
    timeSlots.forEach((timeSlot, slotIndex) => {
        const slotLogs = logs.filter((log) => getTimeSlot(log.time) === timeSlot);
        const colStart = slotIndex * 2 + 1;
        
        slotCounts[slotIndex] = slotLogs.length;
        slotDwellTimes[slotIndex] = slotLogs.reduce((sum, log) => sum + log.duration, 0);

        let previousTime = null;
        slotLogs.forEach((log, logIndex) => {
            const rowStart = 4 + (logIndex * 4);
            maxRowUsed = Math.max(maxRowUsed, rowStart + 3);
            const bgColor = rowColors[logIndex % rowColors.length];

            // Run number and time
            const runCell = worksheet.getCell(rowStart, colStart);
            const timeCell = worksheet.getCell(rowStart, colStart + 1);
            
            runCell.value = `Run: ${log.runNumber}`;
            timeCell.value = log.time;
            
            // Check if time difference is more than 3 minutes
            if (previousTime) {
                const currentTime = new Date(`1970/01/01 ${log.time}`);
                const prevTime = new Date(`1970/01/01 ${previousTime}`);
                const diffMinutes = (currentTime - prevTime) / (1000 * 60);
                
                if (diffMinutes > 3) {
                    timeCell.font = { name: "Calibri", size: 12, color: { argb: "C00000" } };
                }
            }
            previousTime = log.time;

            [runCell, timeCell].forEach(cell => {
                cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: bgColor } };
                cell.alignment = { horizontal: "center", vertical: "middle" };
                if (!cell.font) cell.font = { name: "Calibri", size: 12 };
                cell.border = { top: { style: "thin" }, left: { style: "thin" }, bottom: { style: "thin" }, right: { style: "thin" } };
            });

            // Duration (merged)
            const durationCells = [
                worksheet.getCell(rowStart + 1, colStart),
                worksheet.getCell(rowStart + 1, colStart + 1)
            ];
            
            durationCells[0].value = `${log.duration.toFixed(2)} seconds`;
            durationCells.forEach(cell => {
                cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: bgColor } };
                cell.alignment = { horizontal: "center", vertical: "middle" };
                cell.font = { 
                    name: "Calibri", 
                    size: 12,
                    color: { argb: log.duration > 30 ? "0070C0" : "000000" }
                };
                cell.border = { top: { style: "thin" }, left: { style: "thin" }, bottom: { style: "thin" }, right: { style: "thin" } };
            });
            worksheet.mergeCells(rowStart + 1, colStart, rowStart + 1, colStart + 1);

            // Crowd level
            const crowdLabelCell = worksheet.getCell(rowStart + 2, colStart);
            const crowdValueCell = worksheet.getCell(rowStart + 2, colStart + 1);
            
            crowdLabelCell.value = "Crowd Levels:";
            crowdValueCell.value = log.crowdLevel;
            
            [crowdLabelCell, crowdValueCell].forEach(cell => {
                cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: bgColor } };
                cell.alignment = { horizontal: "center", vertical: "middle" };
                cell.font = { name: "Calibri", size: 12 };
                cell.border = { top: { style: "thin" }, left: { style: "thin" }, bottom: { style: "thin" }, right: { style: "thin" } };
            });

            // Add empty row with borders
            const emptyRow = rowStart + 3;
            [colStart, colStart + 1].forEach(col => {
                const cell = worksheet.getCell(emptyRow, col);
                cell.border = { top: { style: "thin" }, left: { style: "thin" }, bottom: { style: "thin" }, right: { style: "thin" } };
            });
        });

        // If no logs for this slot, create empty structure
        if (slotLogs.length === 0) {
            for (let i = 0; i < 4; i++) {
                const currentRow = 4 + i;
                [colStart, colStart + 1].forEach(col => {
                    const cell = worksheet.getCell(currentRow, col);
                    cell.border = { top: { style: "thin" }, left: { style: "thin" }, bottom: { style: "thin" }, right: { style: "thin" } };
                });
            }
        }
    });

    // Start summary section 2 rows below last data
    let currentTotalRow = maxRowUsed + 2;

  // Total Trains row - one per time slot
    timeSlots.forEach((_, slotIndex) => {
        const colStart = slotIndex * 2 + 1;
        worksheet.mergeCells(currentTotalRow, colStart, currentTotalRow, colStart + 1);
        const cell = worksheet.getCell(currentTotalRow, colStart);
        cell.value = `Total Trains: ${slotCounts[slotIndex]}`;
        cell.font = { name: "Calibri", size: 12, bold: true };
        cell.alignment = { horizontal: "center", vertical: "middle" };
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "BDD7EE" } };
        cell.border = { top: { style: "thin" }, left: { style: "thin" }, bottom: { style: "thin" }, right: { style: "thin" } };
    });

    // Total Dwell row - one per time slot
    currentTotalRow++;
    timeSlots.forEach((_, slotIndex) => {
        const colStart = slotIndex * 2 + 1;
        worksheet.mergeCells(currentTotalRow, colStart, currentTotalRow, colStart + 1);
        const cell = worksheet.getCell(currentTotalRow, colStart);
        cell.value = `Total Dwell: ${slotDwellTimes[slotIndex].toFixed(2)}`;
        cell.font = { name: "Calibri", size: 12, bold: true };
        cell.alignment = { horizontal: "center", vertical: "middle" };
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "BDD7EE" } };
        cell.border = { top: { style: "thin" }, left: { style: "thin" }, bottom: { style: "thin" }, right: { style: "thin" } };
    });

    // Add empty row for spacing
    currentTotalRow++;

    // Single Staffing header
    currentTotalRow++;
    const staffingCell = worksheet.getCell(currentTotalRow, 1);
    staffingCell.value = "Staffing:";
    staffingCell.font = { name: "Calibri", size: 12, bold: true };
    staffingCell.alignment = { horizontal: "left", vertical: "middle" };
    staffingCell.border = { top: { style: "thin" }, left: { style: "thin" }, bottom: { style: "thin" }, right: { style: "thin" } };

    // Add staffing categories
    currentTotalRow++;
    const staffingStart = currentTotalRow;
    const staffingCategories = [
        { label: "GSMs", color: "800080" },
        { label: "DSMs", color: "800080" },
        { label: "Supvs", color: "000000" },
        { label: "TWPs", color: "0070C0" },
        { label: "CSRs", color: "000000" },
        { label: "TEOs", color: "800080" },
        { label: "Other", color: "800080" }
    ];

    // Create staffing header row
    staffingCategories.forEach((category, index) => {
        const cell = worksheet.getCell(staffingStart, index + 1);
        cell.value = category.label;
        cell.font = { name: "Calibri", size: 12, bold: true, color: { argb: category.color } };
        cell.alignment = { horizontal: "center", vertical: "middle" };
        cell.border = { top: { style: "thin" }, left: { style: "thin" }, bottom: { style: "thin" }, right: { style: "thin" } };
    });

    // Create staffing value row
    const staffingValueRow = staffingStart + 1;
    staffingCategories.forEach((_, index) => {
        const cell = worksheet.getCell(staffingValueRow, index + 1);
        cell.value = 0; // Default value, update as needed
        cell.font = { name: "Calibri", size: 12 };
        cell.alignment = { horizontal: "center", vertical: "middle" };
        cell.border = { top: { style: "thin" }, left: { style: "thin" }, bottom: { style: "thin" }, right: { style: "thin" } };
    });

// Add empty row for spacing after staffing
    currentTotalRow = staffingValueRow + 2;

    // Summary section with merged cells
    const summaryLabels = [
        { topLabel: "Total", bottomLabel: "Staff", color: "800080" },
        { topLabel: "Empty", bottomLabel: "Trains", color: "000000" },
        { topLabel: "Total", bottomLabel: "Trains", color: "FF0000" },
        { topLabel: "Average", bottomLabel: "Dwell", color: "0070C0" }
    ];

    // Staffing header row
    const staffingHeaderRow = currentTotalRow + 1;
    const labelRow = staffingHeaderRow + 1;
    const valueRow = labelRow + 1;

    // Add the labels to the Summary
    summaryLabels.forEach((item, index) => {
        const firstColumn = index * 2 + 1;
        const secondColumn = firstColumn + 1;

        const topCell = worksheet.getCell(staffingHeaderRow, firstColumn);
        topCell.value = item.topLabel;
        topCell.font = { name: "Calibri", size: 12, bold: true, color: { argb: item.color } };
        topCell.alignment = { horizontal: "center", vertical: "middle" };
        topCell.border = { top: { style: "thin" }, left: { style: "thin" }, bottom: { style: "thin" }, right: { style: "thin" } };
        worksheet.mergeCells(staffingHeaderRow, firstColumn, staffingHeaderRow, secondColumn);

        const bottomCell = worksheet.getCell(labelRow, firstColumn);
        bottomCell.value = item.bottomLabel;
        bottomCell.font = { name: "Calibri", size: 12, bold: true, color: { argb: item.color } };
        bottomCell.alignment = { horizontal: "center", vertical: "middle" };
        bottomCell.border = { top: { style: "thin" }, left: { style: "thin" }, bottom: { style: "thin" }, right: { style: "thin" } };
        worksheet.mergeCells(labelRow, firstColumn, labelRow, secondColumn);

        const valueCell = worksheet.getCell(valueRow, firstColumn);
        valueCell.font = { name: "Calibri", size: 12 };
        valueCell.alignment = { horizontal: "center", vertical: "middle" };
        valueCell.border = { top: { style: "thin" }, left: { style: "thin" }, bottom: { style: "thin" }, right: { style: "thin" } };
        worksheet.mergeCells(valueRow, firstColumn, valueRow, secondColumn);

        if (index === 0) {
            valueCell.value = 0; // Total Staff
        } else if (index === 1) {
            valueCell.value = 0; // Empty Trains
        } else if (index === 2) {
            valueCell.value = slotCounts.reduce((sum, count) => sum + count, 0); // Total Trains
        } else {
            valueCell.value = (slotDwellTimes.reduce((sum, dwell) => sum + dwell, 0) /
                Math.max(1, slotCounts.reduce((sum, count) => sum + count, 0))).toFixed(2); // Average Dwell
        }
    });
    currentTotalRow = valueRow + 2;

    // Add Notes label
    const notesCell = worksheet.getCell(staffingHeaderRow, 9);
    notesCell.value = "Notes:";
    notesCell.font = { name: "Calibri", size: 12, bold: true };
    notesCell.alignment = { horizontal: "left", vertical: "middle" };

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
