import React, { useState, useEffect } from 'react';
import { saveAs } from 'file-saver';
import { Link } from 'react-router-dom';
import './TrainStopwatch.css';
import ExcelJS from "exceljs";

const getTimeSlot = (timeString) => {
    const time = new Date(`1970/01/01 ${timeString}`);
    const hours = time.getHours();
    const minutes = time.getMinutes();
    
    // Adjust logic for time slots to ensure consistent boundaries
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
    const [selectedLocation, setSelectedLocation] = useState('');
    const [showValidation, setShowValidation] = useState(false);
    const [attemptedStop, setAttemptedStop] = useState(false);
    const [delayReason, setDelayReason] = useState('');
    const [showInstructions, setShowInstructions] = useState(false);
    const [startTimestamp, setStartTimestamp] = useState('');

    // Updated list of locations
    const locations = [
        "Yonge & Bloor NB AM Rush Hour",
        "Yonge & Bloor SB AM Rush Hour",
        "Union NB AM Rush Hour",
        "St George SB AM Rush Hour",
        "Eglinton SB AM Rush Hour",
        "Sheppard SB AM Rush Hour",
        "Yonge & Bloor NB PM Rush Hour",
        "Yonge & Bloor SB PM Rush Hour",
        "Union NB PM Rush Hour",
        "St George SB PM Rush Hour",
        "Eglinton SB PM Rush Hour",
        "Sheppard SB PM Rush Hour"
    ];

    // Predefined delay reasons
    const delayReasons = [
        "Signal Issue",
        "Passenger Delay",
        "Equipment Problem",
        "Crowding",
        "Scheduled Stop",
        "Other"
    ];

    // Instruction text
    const instructionText = `
    Dwell Timer Usage Instructions:
    1. Select Location from dropdown
    2. Enter 3-digit Run Number
    3. Select Crowd Level
    4. Click 'Start' when train stops
    5. Click 'Stop' when train departs
    6. Select delay reason if applicable
    `;

    useEffect(() => {
        const savedLocation = localStorage.getItem('selectedLocation');
        if (savedLocation) {
            setSelectedLocation(savedLocation);
        }
    }, []);

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
        const now = new Date();
        setStartTime(Date.now() - elapsedTime);
        setStartTimestamp(now.toLocaleTimeString());
        setRunning(true);
        setAttemptedStop(false);
        setShowValidation(false);
    };
    
    const handleLocationChange = (e) => {
        const location = e.target.value;
        setSelectedLocation(location);
        localStorage.setItem('selectedLocation', location);
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
                time: startTimestamp,
                duration: parseFloat(finalElapsed),
                runNumber,
                crowdLevel,
                date: new Date().toLocaleDateString(),
                delayReason: delayReason || 'No Delay',
                location: selectedLocation
            };
            console.log("New Log Entry:", newLog);
            setLogs(prevLogs => [...prevLogs, newLog]);
            
            // Reset specific fields after logging
            setDelayReason('');
        }
    };

    const handleReset = () => {
        setRunning(false);
        setElapsedTime(0);
        setStartTime(null);
        setRunNumber('');
        setCrowdLevel('');
        setDelayReason('');
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

    const getNextTimeSlots = (startTime, count = 4) => {
        const slots = [];
        const uniqueSlots = new Set();
        
        const time = new Date(startTime);
        const currentSlot = getTimeSlot(time.toLocaleTimeString());
        uniqueSlots.add(currentSlot);
        
        // Get the start time of the next slot
        const [currentHour, currentMinute] = currentSlot.split('-')[0].split(':').map(Number);
        time.setHours(currentHour);
        time.setMinutes(currentMinute);
        
        // Keep adding slots until we have the required count of unique slots
        while (uniqueSlots.size < count) {
            time.setMinutes(time.getMinutes() + 15);
            const nextSlot = getTimeSlot(time.toLocaleTimeString());
            uniqueSlots.add(nextSlot);
        }
        
        // Convert Set back to Array
        return Array.from(uniqueSlots);
    };

    const calculateHeadways = (logs) => {
        // Sort logs by time
        const sortedLogs = [...logs].sort((a, b) => new Date(`1970/01/01 ${a.time}`) - new Date(`1970/01/01 ${b.time}`));
        
        // Calculate time differences between consecutive logs
        const headways = sortedLogs.slice(1).map((log, index) => {
            const prevLog = sortedLogs[index];
            const currentTime = new Date(`1970/01/01 ${log.time}`);
            const prevTime = new Date(`1970/01/01 ${prevLog.time}`);
            return (currentTime - prevTime) / (1000 * 60); // Convert to minutes
        });
    
        return {
            totalAvgHeadway: headways.length > 0 
                ? (headways.reduce((sum, hw) => sum + hw, 0) / headways.length).toFixed(2) 
                : "0.00",
            headwayByTimeSlot: sortedLogs.reduce((acc, log) => {
                const timeSlot = getTimeSlot(log.time);
                if (!acc[timeSlot]) {
                    acc[timeSlot] = [];
                }
                return acc;
            }, {})
        };
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
    
        // Set column widths to 90 pixels (approximately 72 points)
        for (let i = 1; i <= totalColumns; i++) {
            worksheet.getColumn(i).width = 14;
        }
    
        // Add an extra column for notes
        worksheet.getColumn(totalColumns + 1).width = 2;
    
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
    

    
        // Calculate the maximum number of logs in any time slot
        const maxLogs = Math.max(...timeSlots.map(slot => logs.filter(log => getTimeSlot(log.time) === slot).length));
    
        //  *** PREEMPTIVELY MERGE CELLS and ADD BORDERS ***
        timeSlots.forEach((timeSlot, slotIndex) => {
            const colStart = slotIndex * 2 + 1;
    
            // Iterate through the rows that *could* contain data based on maxLogs
            for (let i = 0; i < maxLogs; i++) {
                const rowStart = 4 + i * 3;
    
                // Merge the cells for Duration and apply border
                worksheet.mergeCells(rowStart + 1, colStart, rowStart + 1, colStart + 1);
                const durationCell = worksheet.getCell(rowStart + 1, colStart);
                durationCell.border = { top: { style: "thin" }, left: { style: "thin" }, bottom: { style: "thin" }, right: { style: "thin" } };
    
                // Merge the cells for Crowd Level and apply border
                worksheet.mergeCells(rowStart + 2, colStart, rowStart + 2, colStart + 1);
                const crowdCell = worksheet.getCell(rowStart + 2, colStart);
                crowdCell.border = { top: { style: "thin" }, left: { style: "thin" }, bottom: { style: "thin" }, right: { style: "thin" } };
            }
        });
    
        // Log Data and track counts
        timeSlots.forEach((timeSlot, slotIndex) => {
            const slotLogs = logs.filter((log) => getTimeSlot(log.time) === timeSlot);
            const colStart = slotIndex * 2 + 1;
    
            // Add logs for this time slot
            slotLogs.forEach((log, logIndex) => {
                const rowStart = 4 + logIndex * 3; // Each log entry takes 3 rows
                const bgColor = rowColors[logIndex % rowColors.length];
    
                // Run number and time
                const runCell = worksheet.getCell(rowStart, colStart + 1);
                const timeCell = worksheet.getCell(rowStart, colStart);
    
                runCell.value = log.runNumber;
                timeCell.value = log.time;
    
                // Time cell highlighting logic
                const currentLogIndex = logs.findIndex(l => l.time === log.time && l.runNumber === log.runNumber);
                if (currentLogIndex > 0) {
                    const previousLog = logs[currentLogIndex - 1];
                    const currentTime = new Date(`1970/01/01 ${log.time}`);
                    const prevTime = new Date(`1970/01/01 ${previousLog.time}`);
                    const diffMinutes = (currentTime - prevTime) / (1000 * 60);
    
                    if (diffMinutes > 3) {
                        timeCell.font = { name: "Calibri", size: 12, bold: true, color: { argb: "C00000" } };
                    } else {
                        timeCell.font = { name: "Calibri", size: 12, bold: true };
                    }
                } else {
                    timeCell.font = { name: "Calibri", size: 12, bold: true };
                }
    
                // Set up borders and formatting, without the right border for time cell
                timeCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: bgColor } };
                timeCell.alignment = { horizontal: "left", vertical: "middle" };
                timeCell.border = { 
                    top: { style: "thin" }, 
                    left: { style: "thin" }, 
                    bottom: { style: "thin" }
                };
    
                runCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: bgColor } };
                runCell.alignment = { horizontal: "right", vertical: "middle" };
                runCell.font = { name: "Calibri", size: 12, bold: true };
                runCell.border = { 
                    top: { style: "thin" }, 
                    bottom: { style: "thin" }, 
                    right: { style: "thin" }
                };
    
                // Duration (merged)
                const durationCell = worksheet.getCell(rowStart + 1, colStart);
    
                durationCell.value = log.duration.toFixed(2);
                durationCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: bgColor } };
                durationCell.alignment = { horizontal: "center", vertical: "middle" };
    
                // Make blue text (duration > 30) bold as well
                durationCell.font = {
                    name: "Calibri",
                    size: 12,
                    bold: true, // Always bold
                    color: { argb: log.duration > 30 ? "0070C0" : "000000" }
                };
                durationCell.border = { top: { style: "thin" }, left: { style: "thin" }, bottom: { style: "thin" }, right: { style: "thin" } };
    
                // Crowd level and Delay Reason
                const crowdCell = worksheet.getCell(rowStart + 2, colStart);
    
                crowdCell.value = `${log.crowdLevel} - ${log.delayReason}`; 
                crowdCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: bgColor } };
                crowdCell.alignment = { horizontal: "center", vertical: "middle" };
                crowdCell.font = { name: "Calibri", size: 12 };
                crowdCell.border = { top: { style: "thin" }, left: { style: "thin" }, bottom: { style: "thin" }, right: { style: "thin" } };
            });
    
            // Add empty rows to match the maximum number of logs (only for run number and time)
            for (let i = slotLogs.length; i < maxLogs; i++) {
                const rowStart = 4 + i * 3; // Each log entry takes 3 rows
    
                const runCell = worksheet.getCell(rowStart, colStart);
                const timeCell = worksheet.getCell(rowStart, colStart + 1);
    
                [runCell, timeCell].forEach(cell => {
                    cell.border = { top: { style: "thin" }, left: { style: "thin" }, bottom: { style: "thin" }, right: { style: "thin" } };
                });
            }
        });
    
        // Start summary section 2 rows below last data
        let currentTotalRow = 4 + maxLogs * 3 + 2;
    
        // Total Trains row - one per time slot
        timeSlots.forEach((_, slotIndex) => {
            const colStart = slotIndex * 2 + 1;
            worksheet.mergeCells(currentTotalRow, colStart, currentTotalRow, colStart + 1);
            const cell = worksheet.getCell(currentTotalRow, colStart);
            cell.value = `Total Trains: ${logs.filter(log => getTimeSlot(log.time) === timeSlots[slotIndex]).length}`;
            cell.font = { name: "Calibri", size: 12, bold: true };
            cell.alignment = { horizontal: "center", vertical: "middle" };
            cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "BDD7EE" } };
            cell.border = { top: { style: "thin" }, left: { style: "thin" }, bottom: { style: "thin" }, right: { style: "thin" } };
        });
    
        // Total Dwell row - one per time slot
        currentTotalRow++;
        timeSlots.forEach((timeSlot, slotIndex) => {
            const colStart = slotIndex * 2 + 1;
            worksheet.mergeCells(currentTotalRow, colStart, currentTotalRow, colStart + 1);
            const cell = worksheet.getCell(currentTotalRow, colStart);
    
            const slotLogs = logs.filter(log => getTimeSlot(log.time) === timeSlot);
            const totalDwell = slotLogs.reduce((sum, log) => sum + log.duration, 0);
            const avgDwell = slotLogs.length > 0 ? (totalDwell / slotLogs.length).toFixed(2) : "0.00";
    
            cell.value = `Average Dwell: ${avgDwell}`;
            cell.font = { name: "Calibri", size: 12, bold: true };
            cell.alignment = { horizontal: "center", vertical: "middle" };
            cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "BDD7EE" } };
            cell.border = { top: { style: "thin" }, left: { style: "thin" }, bottom: { style: "thin" }, right: { style: "thin" } };
        });
    
        // Add Overall Average Headway row
        currentTotalRow++;
        const headways = [];
    
        // Calculate headways between consecutive trains
        for (let i = 1; i < logs.length; i++) {
            const prevTime = new Date(`1970/01/01 ${logs[i-1].time}`);
            const currentTime = new Date(`1970/01/01 ${logs[i].time}`);
            const headwayMinutes = (currentTime - prevTime) / (1000 * 60);
            headways.push(headwayMinutes);
        }
    
        const avgHeadway = headways.length > 0
            ? (headways.reduce((sum, hw) => sum + hw, 0) / headways.length).toFixed(2)
            : "N/A";
    
        const headwayCell = worksheet.getCell(currentTotalRow, 1);
        worksheet.mergeCells(currentTotalRow, 1, currentTotalRow, totalColumns);
        headwayCell.value = `Overall Average Headway: ${avgHeadway} minutes`;
        headwayCell.font = { name: "Calibri", size: 12, bold: true };
        headwayCell.alignment = { horizontal: "center", vertical: "middle" };
        headwayCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "BDD7EE" } };
        headwayCell.border = { top: { style: "thin" }, left: { style: "thin" }, bottom: { style: "thin" }, right: { style: "thin" } };
    
// Predefined delay reasons
const delayReasons = [
    "Signal Issue",
    "Passenger Delay", 
    "Equipment Problem",
    "Crowding",
    "Scheduled Stop",
    "Other"
];

// Collect only logs with actual, predefined delays
const delayLogs = logs.filter(log => 
    log.delayReason && 
    delayReasons.includes(log.delayReason.trim())
);

// Add Delay Notes to the additional column
if (delayLogs.length > 0) {
    const notesHeaderCell = worksheet.getCell(3, totalColumns + 2);
    notesHeaderCell.value = "Delay Notes";
    notesHeaderCell.font = { name: "Calibri", size: 12, bold: true };
    notesHeaderCell.alignment = { horizontal: "center", vertical: "middle" };
    notesHeaderCell.border = { 
        top: { style: "thin" }, 
        left: { style: "thin" }, 
        bottom: { style: "thin" }, 
        right: { style: "thin" } 
    };

    // Add an extra column for notes
    worksheet.getColumn(totalColumns + 2).width = 50;

    // Populate delay notes
    delayLogs.forEach((log, index) => {
        const noteCell = worksheet.getCell(4 + index, totalColumns + 2);
        
        noteCell.value = `Run #${log.runNumber}: ${log.delayReason} at ${log.time}`;
        noteCell.font = { name: "Calibri", size: 12 };
        noteCell.alignment = { horizontal: "left", vertical: "middle" };
        
        // Black border around the cell
        noteCell.border = {
            top: { style: "thin", color: { argb: "000000" } },
            left: { style: "thin", color: { argb: "000000" } },
            bottom: { style: "thin", color: { argb: "000000" } },
            right: { style: "thin", color: { argb: "000000" } }
        };
    });
}
    
    // Staffing section
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
    
    // Create staffing value row with data validation
    const staffingValueRow = staffingStart + 1;
    staffingCategories.forEach((_, index) => {
        const cell = worksheet.getCell(staffingValueRow, index + 1);
        cell.value = 0;
        cell.font = { name: "Calibri", size: 12 };
        cell.alignment = { horizontal: "center", vertical: "middle" };
        cell.border = { top: { style: "thin" }, left: { style: "thin" }, bottom: { style: "thin" }, right: { style: "thin" } };
    
        // Add data validation to only allow numbers
        cell.dataValidation = {
            type: 'whole',
            operator: 'greaterThanOrEqual',
            formula1: 0,
            allowBlank: false,
            showErrorMessage: true,
            errorTitle: 'Invalid Value',
            error: 'Please enter a number greater than or equal to 0'
        };
    });
    
    // Summary section
    currentTotalRow = staffingValueRow + 2;
    const summaryLabels = [
        { topLabel: "Total", bottomLabel: "Staff", color: "800080" },
        { topLabel: "Empty", bottomLabel: "Trains", color: "000000" },
        { topLabel: "Total", bottomLabel: "Trains", color: "FF0000" },
        { topLabel: "Average", bottomLabel: "Dwell", color: "0070C0" }
    ];
    
    // Staffing header row
    const staffingHeaderRow = currentTotalRow;
    const labelRow = staffingHeaderRow + 1;
    const valueRow = labelRow + 1;
    
    // Add the labels to the Summary
    summaryLabels.forEach((item, index) => {
        const firstColumn = index + 1;
    
        const topCell = worksheet.getCell(staffingHeaderRow, firstColumn);
        topCell.value = item.topLabel;
        topCell.font = { name: "Calibri", size: 12, bold: true, color: { argb: item.color } };
        topCell.alignment = { horizontal: "center", vertical: "middle" };
        topCell.border = { top: { style: "thin" }, left: { style: "thin" }, bottom: { style: "thin" }, right: { style: "thin" } };
    
        const bottomCell = worksheet.getCell(labelRow, firstColumn);
        bottomCell.value = item.bottomLabel;
        bottomCell.font = { name: "Calibri", size: 12, bold: true, color: { argb: item.color } };
        bottomCell.alignment = { horizontal: "center", vertical: "middle" };
        bottomCell.border = { top: { style: "thin" }, left: { style: "thin" }, bottom: { style: "thin" }, right: { style: "thin" } };
    
        const valueCell = worksheet.getCell(valueRow, firstColumn);
        valueCell.font = { name: "Calibri", size: 12 };
        valueCell.alignment = { horizontal: "center", vertical: "middle" };
        valueCell.border = { top: { style: "thin" }, left: { style: "thin" }, bottom: { style: "thin" }, right: { style: "thin" } };
    
        // Calculate values based on index
        if (index === 0) {
            // Total Staff - Set up formula to sum staffing values
            const firstStaffCell = worksheet.getCell(staffingValueRow, 1)._address;
            const lastStaffCell = worksheet.getCell(staffingValueRow, staffingCategories.length)._address;
            valueCell.value = { formula: `SUM(${firstStaffCell}:${lastStaffCell})` };
        } else if (index === 1) {
            valueCell.value = 0; // Empty Trains
        } else if (index === 2) {
            valueCell.value = logs.length; // Total Trains
        } else {
            // Average Dwell
            const totalDwell = logs.reduce((sum, log) => sum + log.duration, 0);
            const totalCount = Math.max(1, logs.length);
            valueCell.value = (totalDwell / totalCount).toFixed(2);
        }
    });
    
    // Write and save the workbook
    const buffer = await workbook.xlsx.writeBuffer();
    saveAs(new Blob([buffer], { type: "application/octet-stream" }), 
    `${new Date().toLocaleDateString("en-US", { month: "2-digit", day: "2-digit", year: "numeric" })} Dwells.xlsx`);
    };
    
    
    
    
    
    

    return (
        <div className="stopwatch-container">
            <div className="ttc-header">
                <img src="/TTC.png" alt="TTC Logo" className="ttc-logo" />
                <h1 className="stopwatch-title">Dwell Timer</h1>
            </div>

            {/* Instructions Toggle */}
            <div className="instructions-toggle">
                <button 
                    onClick={() => setShowInstructions(!showInstructions)}
                    className="info-button"
                >
                    {showInstructions ? 'Hide Instructions' : 'Show Instructions'}
                </button>
            </div>

            {/* Instructions Section */}
            {showInstructions && (
                <div className="instructions-section">
                    <pre className="instructions-text">{instructionText}</pre>
                </div>
            )}

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

                <div className="input-group">
                    <label htmlFor="delayReason">Delay Reason (Optional):</label>
                    <select
                        id="delayReason"
                        value={delayReason}
                        onChange={(e) => setDelayReason(e.target.value)}
                    >
                        <option value="">Select Delay Reason</option>
                        {delayReasons.map((reason, index) => (
                            <option key={index} value={reason}>{reason}</option>
                        ))}
                    </select>
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
