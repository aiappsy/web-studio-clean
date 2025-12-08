import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  Play, 
  Pause, 
  Square, 
  RefreshCw, 
  Download, 
  Upload,
  Settings,
  Eye,
  Code,
  Layout,
  Type,
  Palette,
  Globe,
  Loader2,
  CheckCircle,
  AlertCircle,
  Clock,
  Zap,
  Layers
} from 'lucide-react';

// Pipeline stages configuration
const PIPELINE_STAGES = [
  { id: 'outline', label: 'Website Outline', description: 'Create site structure and navigation' },
  { id: 'content', label: 'Content Generation', description: 'Generate SEO-optimized content' },
  { id: 'layout', label: 'Layout Design', description: 'Create responsive layout and styling' },
  { id: 'export', label: 'Export Build', description: 'Compile and package for deployment' },
  { id: 'deploy', label: 'Deploy', description: 'Deploy to hosting platform' }
];

// Pipeline status types
type StageStatus = 'idle' | 'running' | 'completed' | 'failed' | 'cancelled'