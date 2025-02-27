// Trevor Williamson
// 146TW - Station Supervisor
// Dwell Timer

// Logs.js
import { Link } from 'react-router-dom';
import './Logs.css';

export default function Logs({ logs }) {
    // Ensure logs is an array
    const validLogs = Array.isArray(logs) ? logs : [];

    const reversedLogs = [...validLogs].reverse();

    const clearLogs = () => {
        localStorage.removeItem('trainLogs');
        window.location.reload();
    };

    return (
        <div className="logs-container">
            <div className="ttc-header">
                <img src="/TTC.png" alt="TTC Logo" className="ttc-logo" />
                <h1 className="logs-title">Train Logs</h1>
            </div>

            <div className="logs-actions">
                <Link to="/" className="back-button">Back to Stopwatch</Link>
                {validLogs.length > 0 && (
                    <button onClick={clearLogs} className="clear-button">
                        Clear All Logs
                    </button>
                )}
            </div>

            {validLogs.length > 0 ? (
                <div className="logs-table">
                    <table>
                        <thead>
                            <tr>
                                <th>Run #</th>
                                <th>Time</th>
                                <th>Duration</th>
                                <th>Crowd Level</th>
                                <th>Date</th>
                            </tr>
                        </thead>
                        <tbody>
                            {reversedLogs.map((log, index) => (
                                <tr key={index} className={index === 0 ? 'most-recent' : ''}>
                                    <td>{log.runNumber}</td>
                                    <td>{log.time}</td>
                                    <td>{log.duration?.toFixed(2) || 'N/A'}s</td>
                                    <td>{log.crowdLevel}</td>
                                    <td>{log.date}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            ) : (
                <p className="no-logs">No logs recorded yet.</p>
            )}
        </div>
    );
}
