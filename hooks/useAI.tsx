'use client';

import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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

interface Project {
  id: string;
  name: string;
  description?: string;
  status: string;
  projectData?: any;
  createdAt: string;
  updatedAt: string;
}

interface PipelineStep {
  id: string;
  name: string;
  description: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  icon: React.ReactNode;
  progress: number;
  logs: string[];
  output?: any;
}

export function useAI(projectId: string) {
  const [loading, setLoading] = useState(false);
  const [project, setProject] = useState<Project | null>(null);
  const [pipelineSteps, setPipelineSteps] = useState<PipelineStep[]>([
    {
      id: 'architect',
      name: 'Website Architect',
      description: 'Planning and architecture design',
      status: 'pending',
      icon: React.createElement(Layout, { className: "h-5 w-5" }),
      progress: 0,
      logs: [],
    } as PipelineStep,
    {
      id: 'content',
      name: 'Content Writer',
      description: 'Generate website content',
      status: 'pending',
      icon: React.createElement(Type, { className: "h-5 w-5" }),
      progress: 0,
      logs: [],
    } as PipelineStep,
    {
      id: 'layout',
      name: 'Layout Designer',
      description: 'Create visual design and layout',
      status: 'pending',
      icon: React.createElement(Palette, { className: "h-5 w-5" }),
      progress: 0,
      logs: [],
    } as PipelineStep,
    {
      id: 'export',
      name: 'Export Compiler',
      description: 'Compile and export website',
      status: 'pending',
      icon: React.createElement(Code, { className: "h-5 w-5" }),
      progress: 0,
      logs: [],
    } as PipelineStep,
    {
      id: 'deployment',
      name: 'Deployment Agent',
      description: 'Deploy to hosting platform',
      status: 'pending',
      icon: React.createElement(Globe, { className: "h-5 w-5" }),
      progress: 0,
      logs: [],
    } as PipelineStep,
  ]);
  const [isRunning, setIsRunning] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [requirements, setRequirements] = useState('');
  const [targetAudience, setTargetAudience] = useState('');
  const [businessGoals, setBusinessGoals] = useState('');
  const [designPreferences, setDesignPreferences] = useState('');

  useEffect(() => {
    if (projectId) {
      loadProject(projectId);
    }
  }, [projectId]);

  const loadProject = async (id: string) => {
    try {
      const response = await fetch(`/api/projects/${id}`);
      if (response.ok) {
        const data = await response.json();
        setProject(data.data);
        
        // Load existing pipeline data if available
        if (data.data?.projectData?.pipeline) {
          setPipelineSteps(data.data.projectData.pipeline);
        }
      }
    } catch (error) {
      console.error('Error loading project:', error);
    } finally {
      setLoading(false);
    }
  };

  const runPipeline = async () => {
    if (!requirements.trim()) {
      return;
    }

    setIsRunning(true);
    
    try {
      const response = await fetch('/api/pipeline/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: project?.id,
          input: {
            requirements,
            targetAudience,
            businessGoals,
            designPreferences,
          },
        }),
      });

      if (response.ok) {
        const pipelineData = await response.json();
        
        // Simulate pipeline progress
        simulatePipelineProgress(pipelineData.data.pipelineId);
      } else {
        throw new Error('Failed to start pipeline');
      }
    } catch (error) {
      console.error('Error running pipeline:', error);
    } finally {
      setIsRunning(false);
    }
  };

  const simulatePipelineProgress = async (pipelineId: string) => {
    for (let i = 0; i < pipelineSteps.length; i++) {
      setCurrentStep(i);
      
      // Update step to running
      setPipelineSteps(prev => prev.map((step, index) => 
        index === i 
          ? { ...step, status: 'running', progress: 0, logs: ['Starting...'] }
          : step
      ));

      // Simulate step execution
      for (let progress = 0; progress <= 100; progress += 10) {
        await new Promise(resolve => setTimeout(resolve, 200));
        
        setPipelineSteps(prev => prev.map((step, index) => 
          index === i 
            ? { 
                ...step, 
                progress, 
                logs: [
                  ...step.logs, 
                  `Progress: ${progress}%`,
                  progress === 100 ? 'Step completed successfully!' : 'Processing...'
                ]
              }
            : step
        ));
      }

      // Mark step as completed
      setPipelineSteps(prev => prev.map((step, index) => 
        index === i 
          ? { ...step, status: 'completed', progress: 100 }
          : step
      ));
    }

    setIsRunning(false);
    setCurrentStep(pipelineSteps.length);
  };

  const stopPipeline = () => {
    setIsRunning(false);
    setPipelineSteps(prev => prev.map(step => 
      step.status === 'running' ? { ...step, status: 'pending', progress: 0 } : step
    ));
  };

  const resetPipeline = () => {
    setPipelineSteps(prev => prev.map(step => ({
      ...step,
      status: 'pending',
      progress: 0,
      logs: [],
      output: undefined,
    })));
    setCurrentStep(0);
  };

  // Skeleton loader component
  function SkeletonLoader({ 
    lines = 3, 
    className = '' 
  }: { 
    lines?: number
    className?: string 
  }) {
    return (
      <div className={`space-y-2 ${className}`}>
        {Array.from({ length: lines }).map((_, i) => {
          return React.createElement('div', {
            key: i,
            className: `h-4 bg-gray-200 rounded animate-pulse`,
            style: {
              width: `${Math.random() * 40 + 60}%`,
              animationDelay: `${i * 0.1}s`
            }
          }, '');
        })}
      </div>
    );
  }

  return {
    project,
    loading,
    pipelineSteps,
    isRunning,
    currentStep,
    requirements,
    targetAudience,
    businessGoals,
    designPreferences,
    setRequirements,
    setTargetAudience,
    setBusinessGoals,
    setDesignPreferences,
    runPipeline,
    stopPipeline,
    resetPipeline,
  };
}