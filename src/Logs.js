import { Link } from 'react-router-dom';
import './Logs.css';

export default function Logs({ logs }) {
  const reversedLogs = [...logs].reverse();

  return (
    <div className="logs-container">
      <div className="ttc-header">
        <div className="ttc-logo">TTC</div>
        <h1 className="logs-title">Train Logs</h1>
      </div>

      {logs.length > 0 ? (
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
                  <td>{log.duration.toFixed(2)}s</td>
                  <td>
                    <span className={`crowd-level ${log.crowdLevel.toLowerCase()}`}>
                      {log.crowdLevel}
                    </span>
                  </td>
                  <td>{log.date}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="no-logs">No logs recorded yet.</p>
      )}
      
      <Link to="/" className="back-button">Back to Stopwatch</Link>
    </div>
  );
}