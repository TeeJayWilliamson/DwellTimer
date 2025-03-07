import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import './Logs.css';
import { saveAs } from 'file-saver';
import ExcelJS from "exceljs";

export default function Logs({ logs }) {
    // Add local state to manage logs within the component
    const [localLogs, setLocalLogs] = useState(logs || {});

    const organizeLogsByDate = () => {
        if (!localLogs || !Array.isArray(localLogs)) return {};
        if (!Array.isArray(localLogs) && typeof localLogs === 'object') return localLogs;
        return localLogs.reduce((acc, log) => {
            const date = log.date || new Date().toLocaleDateString();
            if (!acc[date]) {
                acc[date] = [];
            }
            acc[date].push(log);
            return acc;
        }, {});
    };

    const organizedLogs = organizeLogsByDate();
    const dates = Object.keys(organizedLogs).sort().reverse();

    const clearAllLogs = () => {
        localStorage.removeItem('trainLogs');
        window.location.reload(); // This will refresh the page and reload data from localStorage
    };

    const clearLogsByDate = (date) => {
        const updatedLogs = { ...organizedLogs };
        delete updatedLogs[date];
        localStorage.setItem('trainLogs', JSON.stringify(updatedLogs));
        setLocalLogs(updatedLogs);
    };

    const exportLogsByDate = async (date) => {
        const logsToExport = organizedLogs[date];
        if (!logsToExport || logsToExport.length === 0) return;
        await generateExcel(logsToExport, date);
    };

    const generateExcel = async (logsToExport, date) => {
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet("Train Logs");
        worksheet.columns = [
            { header: 'Run #', key: 'runNumber', width: 10 },
            { header: 'Time', key: 'time', width: 15 },
            { header: 'Duration (s)', key: 'duration', width: 15 },
            { header: 'Crowd Level', key: 'crowdLevel', width: 15 },
            { header: 'Location', key: 'location', width: 30 },
            { header: 'Delay Reason', key: 'delayReason', width: 20 }
        ];
        logsToExport.forEach(log => {
            worksheet.addRow({
                runNumber: log.runNumber,
                time: log.time,
                duration: log.duration.toFixed(2),
                crowdLevel: log.crowdLevel,
                location: log.location || 'N/A',
                delayReason: log.delayReason || 'No Delay'
            });
        });
        worksheet.getRow(1).font = { bold: true };
        const buffer = await workbook.xlsx.writeBuffer();
        saveAs(
            new Blob([buffer], { type: "application/octet-stream" }), 
            `Train_Logs_${date.replace(/\//g, '-')}.xlsx`
        );
    };

    const isOlderThanWeek = (dateStr) => {
        const parts = dateStr.split('/');
        if (parts.length !== 3) return false;
        const logDate = new Date(parseInt(parts[2]), parseInt(parts[0])-1, parseInt(parts[1]));
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        return logDate < weekAgo;
    };

    return (
        <div className="logs-container">
            <div className="ttc-header">
                <img src="/TTC.png" alt="TTC Logo" className="ttc-logo" />
                <h1 className="logs-title">Train Logs</h1>
            </div>

            <div className="logs-actions">
                <Link to="/" className="back-button">Back to Stopwatch</Link>
                {dates.length > 0 && (
                    <button onClick={clearAllLogs} className="clear-button">
                        Clear All Logs
                    </button>
                )}
            </div>

            {dates.length > 0 ? (
                dates.map(date => {
                    const dayLogs = organizedLogs[date];
                    const isExpiring = isOlderThanWeek(date);
                    return (
                        <div key={date} className={`date-section ${isExpiring ? 'expiring' : ''}`}>
                            <div className="date-header">
                                <h2 className="date-title">
                                    {date} 
                                    {isExpiring && <span className="expiring-tag">Expiring Soon</span>}
                                </h2>

                                {/*
                                <div className="date-actions">
                                    <button 
                                        onClick={() => exportLogsByDate(date)}
                                        className="export-button"
                                    >
                                        Export
                                    </button>
                                    <button 
                                        onClick={() => clearLogsByDate(date)}
                                        className="clear-date-button"
                                    >
                                        Clear
                                    </button>
                                </div>
                                */}
                            </div>
                            
                            <div className="logs-table">
                                <table>
                                    <thead>
                                        <tr>
                                            <th>Run #</th>
                                            <th>Time</th>
                                            <th>Duration</th>
                                            <th>Crowd Level</th>
                                            <th>Location</th>
                                            <th>Delay Reason</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {dayLogs.map((log, index) => (
                                            <tr key={index}>
                                                <td>{log.runNumber}</td>
                                                <td>{log.time}</td>
                                                <td>{log.duration?.toFixed(2) || 'N/A'}s</td>
                                                <td>{log.crowdLevel}</td>
                                                <td>{log.location || 'N/A'}</td>
                                                <td>{log.delayReason || 'N/A'}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    );
                })
            ) : (
                <p className="no-logs">No logs recorded yet.</p>
            )}
        </div>
    );
}