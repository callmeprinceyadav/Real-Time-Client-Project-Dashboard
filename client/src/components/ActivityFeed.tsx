import React, { useEffect, useState } from 'react';
import { useSocket } from '../context/SocketContext';
import { type ActivityLog } from '../types';
import { Activity } from 'lucide-react';

interface ActivityFeedProps {
  initialActivities?: ActivityLog[];
  projectId?: string;
}

const ActivityFeed: React.FC<ActivityFeedProps> = ({ initialActivities = [], projectId }) => {
  const { socket } = useSocket();
  const [activities, setActivities] = useState<ActivityLog[]>(initialActivities);

  useEffect(() => {
    setActivities(initialActivities);
  }, [initialActivities]);

  useEffect(() => {
    if (!socket) return;

    if (projectId) {
      socket.emit('joinProject', projectId);
    }

    const handleActivity = (activity: ActivityLog) => {
      // If scoped to a project, only show relevant activities
      if (projectId && activity.projectId !== projectId) return;
      setActivities((prev) => [activity, ...prev].slice(0, 50));
    };

    const handleMissedEvents = (events: ActivityLog[]) => {
      setActivities((prev) => {
        const existingIds = new Set(prev.map((a) => a.id));
        const newEvents = events.filter((e) => !existingIds.has(e.id));
        return [...newEvents, ...prev].sort(
          (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        ).slice(0, 50);
      });
    };

    socket.on('activityFeed', handleActivity);
    socket.on('missedEvents', handleMissedEvents);

    return () => {
      socket.off('activityFeed', handleActivity);
      socket.off('missedEvents', handleMissedEvents);
      if (projectId) {
        socket.emit('leaveProject', projectId);
      }
    };
  }, [socket, projectId]);

  return (
    <div className="activity-feed">
      <div className="feed-header">
        <Activity size={18} />
        <h3>Activity Feed</h3>
        <div className="live-badge">LIVE</div>
      </div>
      <div className="feed-list">
        {activities.length === 0 ? (
          <div className="feed-empty">No activity yet</div>
        ) : (
          activities.map((activity) => (
            <div key={activity.id} className="feed-item">
              <div className="feed-dot" data-action={activity.action} />
              <div className="feed-content">
                <p className="feed-details">
                  {activity.details} <span className="feed-time">· {formatTimeAgo(activity.createdAt)}</span>
                </p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

function formatTimeAgo(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const diff = Math.floor((now.getTime() - date.getTime()) / 1000);
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)} mins ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} hours ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)} days ago`;
  return date.toLocaleDateString();
}

export default ActivityFeed;
