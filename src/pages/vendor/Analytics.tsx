import React, { useState, useCallback, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Loader2, CalendarIcon, TrendingUp, ShoppingBag, DollarSign, BarChart3, AlertCircle } from 'lucide-react';
import { format, subDays } from 'date-fns';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { formatPrice } from '@/lib/utils';
import DashboardLayout from '@/components/DashboardLayout';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface AnalyticsData {
  rows: Array<{
    date: string;
    value: number;
    meta: {
      orders: number;
      revenue: number;
    };
  }>;
  summary: {
    total: number;
    revenue: number;
    avgOrderValue?: number;
  };
  labels: string[];
  series: Array<{
    name: string;
    data: number[];
  }>;
}

interface AnalyticsFilters {
  startDate: Date;
  endDate: Date;
  reportType: 'sales' | 'orders' | 'product_views';
  chartType: 'bar' | 'line' | 'pie' | 'table';
  interval: 'day' | 'week' | 'month';
}

const Analytics = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  const [filters, setFilters] = useState<AnalyticsFilters>({
    startDate: subDays(new Date(), 30),
    endDate: new Date(),
    reportType: 'sales',
    chartType: 'bar',
    interval: 'day'
  });

  // Cache for identical queries
  const [queryCache, setQueryCache] = useState<Map<string, AnalyticsData>>(new Map());

  const fetchAnalytics = useCallback(async (filterParams: AnalyticsFilters) => {
    if (!user?.id) {
      setError('User not authenticated');
      return;
    }

    setLoading(true);
    setError(null);

    // Create cache key
    const cacheKey = JSON.stringify({
      vendorId: user.id,
      startDate: filterParams.startDate.toISOString(),
      endDate: filterParams.endDate.toISOString(),
      reportType: filterParams.reportType
    });

    // Check cache first
    if (queryCache.has(cacheKey)) {
      setAnalyticsData(queryCache.get(cacheKey)!);
      setLoading(false);
      return;
    }

    try {
      // Get the current session
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.access_token) {
        throw new Error('Session expired — please log in again.');
      }

      const body = {
        startDate: filterParams.startDate.toISOString(),
        endDate: filterParams.endDate.toISOString(),
        reportType: filterParams.reportType,
        vendorId: user.id
      };

      const response = await fetch('https://jumcsxhftlhxzmeqpuvb.functions.supabase.co/analytics', {
        method: 'POST',
        mode: 'cors',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify(body)
      });

      const result = await response.json();
      console.log('Analytics Response:', result);

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Session expired — please log in again.');
        }
        if (result?.error?.includes('BQ_KEY_JSON') || result?.error?.includes('Server misconfigured')) {
          console.error('Server configuration error:', result.error);
          throw new Error('Server misconfigured — contact admin');
        }
        throw new Error(result?.error || 'Analytics request failed');
      }

      if (result.data || result.analytics) {
        const analyticsResponse = result.data || result.analytics;
        
        // Add average order value to summary if not present
        if (analyticsResponse.summary && !analyticsResponse.summary.avgOrderValue && analyticsResponse.summary.revenue && analyticsResponse.summary.total) {
          analyticsResponse.summary.avgOrderValue = analyticsResponse.summary.revenue / Math.max(analyticsResponse.summary.total, 1);
        }

        setAnalyticsData(analyticsResponse);
        
        // Cache the result (with 5 minute TTL)
        setQueryCache(prev => {
          const newCache = new Map(prev);
          newCache.set(cacheKey, analyticsResponse);
          // Simple cache cleanup - remove entries older than 5 minutes
          setTimeout(() => {
            newCache.delete(cacheKey);
          }, 5 * 60 * 1000);
          return newCache;
        });
      } else {
        // Handle empty response
        setAnalyticsData(null);
        setError('No analytics data available for the selected date range.');
      }
    } catch (err) {
      console.error('Analytics fetch error:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch analytics');
      toast.error(err instanceof Error ? err.message : 'Failed to fetch analytics');
    } finally {
      setLoading(false);
    }
  }, [user?.id, queryCache]);

  // Debounced generate report
  const [reportTimeout, setReportTimeout] = useState<NodeJS.Timeout | null>(null);
  
  const handleGenerateReport = useCallback(() => {
    if (reportTimeout) {
      clearTimeout(reportTimeout);
    }
    
    const timeout = setTimeout(() => {
      fetchAnalytics(filters);
    }, 250);
    
    setReportTimeout(timeout);
  }, [filters, fetchAnalytics, reportTimeout]);

  // Chart data transformation
  const chartData = useMemo(() => {
    if (!analyticsData?.rows) return [];
    
    return analyticsData.rows.map(row => ({
      date: format(new Date(row.date), 'MMM dd'),
      value: row.value,
      orders: row.meta.orders,
      revenue: row.meta.revenue
    }));
  }, [analyticsData]);

  const pieData = useMemo(() => {
    if (!analyticsData?.rows) return [];
    
    return analyticsData.rows.slice(0, 5).map((row, index) => ({
      name: format(new Date(row.date), 'MMM dd'),
      value: row.value,
      fill: `hsl(${220 + index * 30}, 70%, 50%)`
    }));
  }, [analyticsData]);

  const renderChart = () => {
    if (!analyticsData || chartData.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <BarChart3 className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold">No analytics data found</h3>
          <p className="text-muted-foreground">No data available for the selected date range.</p>
        </div>
      );
    }

    const chartProps = {
      width: '100%',
      height: 350,
      data: filters.chartType === 'pie' ? pieData : chartData,
      margin: { top: 5, right: 30, left: 20, bottom: 5 }
    };

    switch (filters.chartType) {
      case 'line':
        return (
          <ResponsiveContainer {...chartProps}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="revenue" stroke="hsl(var(--primary))" strokeWidth={2} />
              <Line type="monotone" dataKey="orders" stroke="hsl(var(--secondary))" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        );
      
      case 'pie':
        return (
          <ResponsiveContainer {...chartProps}>
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {pieData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.fill} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        );
      
      case 'table':
        return (
          <div className="border rounded-md">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="border-b bg-muted/50">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium">Date</th>
                    <th className="px-4 py-3 text-left font-medium">Orders</th>
                    <th className="px-4 py-3 text-left font-medium">Revenue</th>
                    <th className="px-4 py-3 text-left font-medium">Avg Order Value</th>
                  </tr>
                </thead>
                <tbody>
                  {chartData.map((row, index) => (
                    <tr key={index} className="border-b">
                      <td className="px-4 py-3">{row.date}</td>
                      <td className="px-4 py-3">{row.orders}</td>
                      <td className="px-4 py-3">{formatPrice(row.revenue)}</td>
                      <td className="px-4 py-3">{formatPrice(row.revenue / Math.max(row.orders, 1))}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );
      
      default: // bar
        return (
          <ResponsiveContainer {...chartProps}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="revenue" fill="hsl(var(--primary))" />
              <Bar dataKey="orders" fill="hsl(var(--secondary))" />
            </BarChart>
          </ResponsiveContainer>
        );
    }
  };

  return (
    <DashboardLayout title="Analytics Dashboard">
      <div className="space-y-6">
        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle>Report Filters</CardTitle>
            <CardDescription>Configure your analytics report parameters</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              {/* Start Date */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Start Date</label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !filters.startDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {filters.startDate ? format(filters.startDate, "PPP") : <span>Pick a date</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={filters.startDate}
                      onSelect={(date) => date && setFilters(prev => ({ ...prev, startDate: date }))}
                      initialFocus
                      className="pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
              </div>

              {/* End Date */}
              <div className="space-y-2">
                <label className="text-sm font-medium">End Date</label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !filters.endDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {filters.endDate ? format(filters.endDate, "PPP") : <span>Pick a date</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={filters.endDate}
                      onSelect={(date) => date && setFilters(prev => ({ ...prev, endDate: date }))}
                      initialFocus
                      className="pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
              </div>

              {/* Report Type */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Report Type</label>
                <Select value={filters.reportType} onValueChange={(value: any) => setFilters(prev => ({ ...prev, reportType: value }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sales">Sales</SelectItem>
                    <SelectItem value="orders">Orders</SelectItem>
                    <SelectItem value="product_views">Product Views</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Chart Type */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Chart Type</label>
                <Select value={filters.chartType} onValueChange={(value: any) => setFilters(prev => ({ ...prev, chartType: value }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="bar">Bar</SelectItem>
                    <SelectItem value="line">Line</SelectItem>
                    <SelectItem value="pie">Pie</SelectItem>
                    <SelectItem value="table">Table</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Generate Button */}
              <div className="space-y-2">
                <label className="text-sm font-medium">&nbsp;</label>
                <Button 
                  onClick={handleGenerateReport} 
                  disabled={loading}
                  className="w-full"
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Loading...
                    </>
                  ) : (
                    <>
                      <TrendingUp className="mr-2 h-4 w-4" />
                      Generate Report
                    </>
                  )}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Error State */}
        {error && (
          <Card className="border-destructive">
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 text-destructive">
                <AlertCircle className="h-5 w-5" />
                <span>{error}</span>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Summary Cards */}
        {analyticsData?.summary && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
                <ShoppingBag className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{analyticsData.summary.total}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatPrice(analyticsData.summary.revenue)}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Avg Order Value</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {formatPrice(analyticsData.summary.avgOrderValue || 0)}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Analytics Visualization</CardTitle>
            <CardDescription>
              {filters.reportType} data from {format(filters.startDate, 'MMM dd, yyyy')} to {format(filters.endDate, 'MMM dd, yyyy')}
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="w-full h-[85vh] bg-background">
              <iframe
                title="Vendor Analytics Looker Studio"
                src="https://lookerstudio.google.com/embed/reporting/87f6a9d6-0404-4cfa-ae30-fe81f826cba5/page/36vYF"
                width="100%"
                height="100%"
                frameBorder="0"
                style={{ 
                  border: 0,
                  display: 'block',
                  minHeight: '85vh'
                }}
                allowFullScreen
                sandbox="allow-storage-access-by-user-activation allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox"
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default Analytics;