'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Button } from "@/components/ui/button";
import { AlertCircle, RefreshCcw } from "lucide-react";
import Logger from '@/lib/utils/logger';

interface Props {
  children?: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false
  };

  public static getDerivedStateFromError(_: Error): State {
    return { hasError: true };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    Logger.error('Uncaught error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
          return this.props.fallback;
      }
      return (
        <div className="min-h-[400px] flex flex-col items-center justify-center p-6 text-center bg-white/50 backdrop-blur-sm border border-red-100 rounded-3xl m-4 shadow-xl">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-6">
            <AlertCircle className="w-8 h-8 text-red-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">เกิดข้อผิดพลาดบางอย่าง</h2>
          <p className="text-gray-500 mb-8 max-w-md">ขออภัย ระบบขัดข้องชั่วคราว ทีมงานได้รับแจ้งข้อมูลแล้ว กรุณาลองใหม่อีกครั้ง</p>
          <Button 
            onClick={() => window.location.reload()}
            className="bg-indigo-600 hover:bg-indigo-700 h-11 px-8 rounded-xl shadow-lg shadow-indigo-500/20"
          >
            <RefreshCcw className="w-4 h-4 mr-2" /> โหลดข้อมูลใหม่
          </Button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
