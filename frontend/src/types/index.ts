export interface User {
  id: number;
  email: string;
  full_name?: string;
  role: string;
  is_active: boolean;
}

export interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

export interface OverviewMetrics {
  kpis: {
    total_datasets: number;
    active_models: number;
    total_predictions: number;
    detected_anomalies: number;
    total_experiments: number;
  };
  recent_alerts: Array<{
    id: number;
    module: string;
    severity: string;
    title: string;
    message: string;
    score: number;
    created_at: string;
  }>;
  recent_training_jobs: Array<{
    id: number;
    job_id: string;
    target: string;
    task_type: string;
    status: string;
    progress_pct: number;
    created_at: string;
  }>;
}

export interface MLModelItem {
  id: number;
  name: string;
  module_type: string;
  task_type: string;
  algorithm: string;
  description: string;
  is_active: boolean;
  created_at: string;
  latest_version?: {
    version: string;
    status: string;
    target_column?: string;
    metrics?: string;
  };
}

export interface ExperimentItem {
  id: number;
  name: string;
  module_type: string;
  status: string;
  metrics?: string;
  parameters?: string;
  created_at: string;
  finished_at?: string;
}

export interface DatasetItem {
  id: number;
  name: string;
  description?: string;
  filename: string;
  row_count: number;
  column_count: number;
  format: string;
  source_type: string;
  is_sample: boolean;
  created_at: string;
  file_size_bytes?: number;
}

export interface DatasetColumn {
  column_name: string;
  data_type: string;
  inferred_type: string;
  is_nullable: boolean;
  is_target_candidate: boolean;
}

export interface DatasetDetail extends DatasetItem {
  schemas: DatasetColumn[];
  profile?: {
    missing_cells: number;
    missing_percentage: number;
    duplicate_rows: number;
    memory_usage_bytes: number;
    quality_score: number;
    summary_statistics: Record<string, any>;
    correlations: Record<string, any>;
  };
  preview?: Record<string, any>[];
}

export interface CopilotMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  structured_chart?: {
    chart_type: 'bar' | 'line' | 'pie';
    title: string;
    data: any[];
  } | null;
  created_at: string;
}
