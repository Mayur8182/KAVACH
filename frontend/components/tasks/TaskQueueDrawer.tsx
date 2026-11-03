'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Activity,
  AlertCircle,
  CheckCircle2,
  Clock,
  ExternalLink,
  Layers,
  PauseCircle,
  Play,
  RefreshCw,
  RotateCcw,
  Search,
  Shield,
  SlidersHorizontal,
  StopCircle,
  Terminal,
  Trash2,
  X,
  Zap,
} from 'lucide-react';
import { api } from '@/lib/api/client';

export interface TaskRecord {
  id: string;
  project_id: string | null;
  task_type: string;
  status: 'QUEUED' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';
  priority: number;
  progress_percent: number;
  current_step: string | null;
  payload: Record<string, any>;
  result: Record<string, any> | null;
  error_message: string | null;
  exit_code: number | null;
  worker_id: string | null;
  created_at: string;
  started_at: string | null;
  completed_at: string | null;
  duration_ms: number | null;
}

interface TaskQueueDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  projectId?: string | null;
}

export const TaskQueueDrawer: React.FC<TaskQueueDrawerProps> = ({
  isOpen,
  onClose,
  projectId,
}) => {
  const [tasks, setTasks] = useState<TaskRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTask, setSelectedTask] = useState<TaskRecord | null>(null);
  const [actingTaskId, setActingTaskId] = useState<string | null>(null);

  const fetchTasks = useCallback(async () => {
    try {
      const res = await api.tasks.list({
        project_id: projectId || undefined,
        status: statusFilter === 'ALL' ? undefined : statusFilter,
        limit: 50,
      });
      const list = res ? (res.tasks || res.items || []) : [];
      setTasks(list);
    } catch (err) {
      console.error('Failed to fetch background tasks:', err);
    }
  }, [projectId, statusFilter]);

  // Polling when open and has active tasks
  useEffect(() => {
    if (!isOpen) return;

    fetchTasks();
    const interval = setInterval(() => {
      fetchTasks();
    }, 2500);

    return () => clearInterval(interval);
  }, [isOpen, fetchTasks]);

  const handleCancel = async (taskId: string) => {
    setActingTaskId(taskId);
    try {
      await api.tasks.cancel(taskId);
      await fetchTasks();
    } catch (err: any) {
      alert(`Failed to cancel task: ${err?.message || err}`);
    } finally {
      setActingTaskId(null);
    }
  };

  const handleRetry = async (taskId: string) => {
    setActingTaskId(taskId);
    try {
      await api.tasks.retry(taskId);
      await fetchTasks();
    } catch (err: any) {
      alert(`Failed to retry task: ${err?.message || err}`);
    } finally {
      setActingTaskId(null);
    }
  };

  const filteredTasks = useMemo(() => {
    return tasks.filter((t) => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchType = t.task_type.toLowerCase().includes(q);
        const matchId = t.id.toLowerCase().includes(q);
        const matchStep = (t.current_step || '').toLowerCase().includes(q);
        if (!matchType && !matchId && !matchStep) return false;
      }
      return true;
    });
  }, [tasks, searchQuery]);

  const activeCount = useMemo(() => {
    return tasks.filter((t) => t.status === 'RUNNING' || t.status === 'QUEUED').length;
  }, [tasks]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/40 backdrop-blur-sm transition-all duration-300">
      <div
        className="w-full max-w-2xl h-full bg-white border-l border-slate-200 shadow-2xl flex flex-col text-slate-900"
        style={{ fontFamily: 'Inter, system-ui, sans-serif' }}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-white shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-50 border border-blue-200 text-blue-600">
              <Activity size={20} className={activeCount > 0 ? 'animate-pulse' : ''} />
            </div>
            <div>
              <h2 className="text-base font-semibold text-slate-900 flex items-center gap-2">
                Asynchronous Task Queue
                {activeCount > 0 && (
                  <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-blue-100 text-blue-700 border border-blue-200">
                    {activeCount} Active
                  </span>
                )}
              </h2>
              <p className="text-xs text-slate-500">
                Deterministic security scanners, dependency audits, SBOM generation & worker jobs
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => fetchTasks()}
              title="Refresh Queue"
              className="p-1.5 rounded-md hover:bg-slate-100 text-slate-500 hover:text-slate-900 transition"
            >
              <RefreshCw size={16} />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-md hover:bg-slate-100 text-slate-500 hover:text-slate-900 transition"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Filters & Search */}
        <div className="px-6 py-3 border-b border-slate-200 bg-slate-50/80 flex flex-wrap items-center gap-3 shrink-0">
          <div className="relative flex-1 min-w-[200px]">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search by task type, ID, or step..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
            />
          </div>

          <div className="flex items-center gap-1 bg-white p-1 rounded-lg border border-slate-200 text-xs">
            {['ALL', 'RUNNING', 'QUEUED', 'COMPLETED', 'FAILED'].map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-2.5 py-1 rounded-md font-medium transition ${
                  statusFilter === st
                    ? 'bg-slate-900 text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                {st}
              </button>
            ))}
          </div>
        </div>

        {/* Task List (flex-1 with min-h-0 prevents flex overflow clipping) */}
        <div className="flex-1 min-h-0 overflow-y-auto px-6 py-4 space-y-3">
          {filteredTasks.length === 0 ? (
            <div className="h-64 flex flex-col items-center justify-center text-center p-6 rounded-xl border border-dashed border-slate-200 bg-slate-50/50">
              <Layers size={36} className="text-slate-400 mb-3" />
              <p className="text-sm font-semibold text-slate-700">No background tasks found</p>
              <p className="text-xs text-slate-500 mt-1 max-w-sm">
                Trigger a repository scan, container audit, SBOM generation, or IaC scan to monitor active worker jobs.
              </p>
            </div>
          ) : (
            filteredTasks.map((task) => {
              const isRunning = task.status === 'RUNNING';
              const isQueued = task.status === 'QUEUED';
              const isCompleted = task.status === 'COMPLETED';
              const isFailed = task.status === 'FAILED';
              const isCancelled = task.status === 'CANCELLED';

              return (
                <div
                  key={task.id}
                  className={`p-4 rounded-xl border transition-all duration-200 bg-white hover:border-slate-300 ${
                    isRunning
                      ? 'border-blue-400 shadow-[0_0_15px_rgba(59,130,246,0.08)] bg-blue-50/20'
                      : isFailed
                      ? 'border-rose-200 bg-rose-50/10'
                      : isCompleted
                      ? 'border-emerald-200'
                      : 'border-slate-200'
                  }`}
                >
                  {/* Top line: status badge, task type, priority, and actions */}
                  <div className="flex items-center justify-between gap-3 mb-2">
                    <div className="flex items-center gap-2">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                          isRunning
                            ? 'bg-blue-100 text-blue-700 border border-blue-200'
                            : isQueued
                            ? 'bg-amber-100 text-amber-700 border border-amber-200'
                            : isCompleted
                            ? 'bg-emerald-100 text-emerald-700 border border-emerald-200'
                            : isFailed
                            ? 'bg-rose-100 text-rose-700 border border-rose-200'
                            : 'bg-slate-100 text-slate-600 border border-slate-200'
                        }`}
                      >
                        {isRunning && <span className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-ping" />}
                        {isCompleted && <CheckCircle2 size={12} />}
                        {isFailed && <AlertCircle size={12} />}
                        {task.status}
                      </span>

                      <span className="text-sm font-semibold text-slate-900 tracking-tight">
                        {task.task_type}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      {(isRunning || isQueued) && (
                        <button
                          onClick={() => handleCancel(task.id)}
                          disabled={actingTaskId === task.id}
                          className="px-2 py-1 text-xs font-medium rounded bg-rose-50 text-rose-600 hover:bg-rose-100 border border-rose-200 flex items-center gap-1 transition"
                        >
                          <StopCircle size={12} />
                          Cancel
                        </button>
                      )}

                      {(isFailed || isCancelled) && (
                        <button
                          onClick={() => handleRetry(task.id)}
                          disabled={actingTaskId === task.id}
                          className="px-2 py-1 text-xs font-medium rounded bg-blue-50 text-blue-600 hover:bg-blue-100 border border-blue-200 flex items-center gap-1 transition"
                        >
                          <RotateCcw size={12} />
                          Retry
                        </button>
                      )}

                      <button
                        onClick={() => setSelectedTask(task)}
                        className="px-2 py-1 text-xs font-medium rounded bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200 flex items-center gap-1 transition"
                      >
                        Details
                      </button>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  {(isRunning || isQueued || task.progress_percent > 0) && (
                    <div className="mb-2">
                      <div className="flex justify-between items-center text-xs text-slate-500 mb-1">
                        <span className="truncate max-w-[80%]">
                          {task.current_step || 'Waiting in worker queue...'}
                        </span>
                        <span className="font-mono text-slate-700 font-medium">
                          {task.progress_percent}%
                        </span>
                      </div>
                      <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full transition-all duration-300 rounded-full ${
                            isFailed
                              ? 'bg-rose-500'
                              : isCompleted
                              ? 'bg-emerald-500'
                              : 'bg-blue-600'
                          }`}
                          style={{ width: `${task.progress_percent}%` }}
                        />
                      </div>
                    </div>
                  )}

                  {/* Error Message if Failed */}
                  {task.error_message && (
                    <div className="mt-2 p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs font-mono break-words">
                      {task.error_message}
                    </div>
                  )}

                  {/* Footer metadata: ID, Worker, Duration, Created At */}
                  <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                    <div className="flex items-center gap-3">
                      <span className="font-mono">ID: {task.id.slice(0, 8)}</span>
                      {task.worker_id && (
                        <span>Worker: {task.worker_id}</span>
                      )}
                    </div>
                    <div className="flex items-center gap-3">
                      {task.duration_ms !== null && (
                        <span>{task.duration_ms} ms</span>
                      )}
                      <span>
                        {new Date(task.created_at).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                          second: '2-digit',
                        })}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Task Details Modal (JSON Inspector) */}
        {selectedTask && (
          <div className="fixed inset-0 z-60 flex items-center justify-center bg-slate-900/60 p-4">
            <div className="bg-white border border-slate-200 rounded-xl max-w-lg w-full max-h-[80vh] flex flex-col shadow-2xl">
              <div className="px-5 py-3 border-b border-slate-200 flex items-center justify-between bg-slate-50">
                <h3 className="text-sm font-semibold text-slate-900">
                  Task Payload & Result: {selectedTask.task_type}
                </h3>
                <button
                  onClick={() => setSelectedTask(null)}
                  className="p-1 rounded text-slate-400 hover:text-slate-600"
                >
                  <X size={16} />
                </button>
              </div>
              <div className="p-5 overflow-y-auto space-y-4 text-xs font-mono">
                <div>
                  <span className="text-slate-600 block mb-1 font-sans font-medium">Input Payload:</span>
                  <pre className="p-3 bg-slate-900 rounded-lg text-slate-200 overflow-x-auto text-[11px]">
                    {JSON.stringify(selectedTask.payload, null, 2)}
                  </pre>
                </div>
                {selectedTask.result && (
                  <div>
                    <span className="text-slate-600 block mb-1 font-sans font-medium">Worker Result:</span>
                    <pre className="p-3 bg-slate-900 rounded-lg text-emerald-400 overflow-x-auto text-[11px]">
                      {JSON.stringify(selectedTask.result, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
