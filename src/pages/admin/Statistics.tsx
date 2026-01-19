import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  BarChart3, 
  Download,
  Loader2,
  TrendingUp,
  Users,
  ClipboardCheck,
  Star,
  BookOpen,
  Calendar,
  CheckCircle2,
  Clock,
  XCircle,
} from 'lucide-react';
import { format, subDays, startOfMonth, endOfMonth } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
} from 'recharts';

interface Stats {
  totalStudents: number;
  totalTeachers: number;
  totalTasks: number;
  totalCheckIns: number;
  totalSubmissions: number;
  totalEvaluations: number;
  checkInRate: number;
  submissionRate: number;
  evaluationRate: number;
  averageScore: number;
}

interface DailyData {
  date: string;
  checkIns: number;
  submissions: number;
  evaluations: number;
}

interface StatusDistribution {
  name: string;
  value: number;
  color: string;
}

const COLORS = ['hsl(var(--success))', 'hsl(var(--warning))', 'hsl(var(--destructive))'];

export default function Statistics() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<Stats>({
    totalStudents: 0,
    totalTeachers: 0,
    totalTasks: 0,
    totalCheckIns: 0,
    totalSubmissions: 0,
    totalEvaluations: 0,
    checkInRate: 0,
    submissionRate: 0,
    evaluationRate: 0,
    averageScore: 0,
  });
  const [dailyData, setDailyData] = useState<DailyData[]>([]);
  const [checkInDistribution, setCheckInDistribution] = useState<StatusDistribution[]>([]);
  const [dateRange, setDateRange] = useState('7days');

  useEffect(() => {
    fetchStatistics();
  }, [dateRange]);

  const fetchStatistics = async () => {
    setLoading(true);
    try {
      // 计算日期范围
      let startDate: Date;
      const endDate = new Date();
      
      switch (dateRange) {
        case '7days':
          startDate = subDays(new Date(), 7);
          break;
        case '30days':
          startDate = subDays(new Date(), 30);
          break;
        case 'month':
          startDate = startOfMonth(new Date());
          break;
        default:
          startDate = subDays(new Date(), 7);
      }

      const startDateStr = format(startDate, 'yyyy-MM-dd');
      const endDateStr = format(endDate, 'yyyy-MM-dd');

      // 获取用户统计
      const { count: studentCount } = await supabase
        .from('user_roles')
        .select('*', { count: 'exact', head: true })
        .eq('role', 'student');

      const { count: teacherCount } = await supabase
        .from('user_roles')
        .select('*', { count: 'exact', head: true })
        .eq('role', 'teacher');

      // 获取任务统计
      const { count: taskCount } = await supabase
        .from('training_tasks')
        .select('*', { count: 'exact', head: true });

      // 获取打卡统计
      const { data: checkInsData } = await supabase
        .from('check_ins')
        .select('status, check_in_time')
        .gte('check_in_time', `${startDateStr}T00:00:00`)
        .lte('check_in_time', `${endDateStr}T23:59:59`);

      const totalCheckIns = checkInsData?.length || 0;
      const normalCheckIns = checkInsData?.filter(c => c.status === 'normal').length || 0;
      const lateCheckIns = checkInsData?.filter(c => c.status === 'late').length || 0;
      const absentCheckIns = checkInsData?.filter(c => c.status === 'absent').length || 0;

      // 获取提交统计
      const { data: submissionsData } = await supabase
        .from('submissions')
        .select('status, submitted_at')
        .gte('submitted_at', `${startDateStr}T00:00:00`)
        .lte('submitted_at', `${endDateStr}T23:59:59`);

      const totalSubmissions = submissionsData?.length || 0;
      const pendingSubmissions = submissionsData?.filter(s => s.status === 'pending').length || 0;
      const evaluatedSubmissions = submissionsData?.filter(s => s.status === 'evaluated').length || 0;

      // 获取评价统计
      const { data: evaluationsData } = await supabase
        .from('evaluations')
        .select('score, created_at')
        .gte('created_at', `${startDateStr}T00:00:00`)
        .lte('created_at', `${endDateStr}T23:59:59`);

      const totalEvaluations = evaluationsData?.length || 0;
      const averageScore = totalEvaluations > 0
        ? Math.round(evaluationsData!.reduce((acc, e) => acc + e.score, 0) / totalEvaluations)
        : 0;

      // 计算比率
      const expectedCheckIns = (studentCount || 0) * 7; // 假设每周7天都有任务
      const checkInRate = expectedCheckIns > 0 ? Math.round((totalCheckIns / expectedCheckIns) * 100) : 0;
      const submissionRate = totalCheckIns > 0 ? Math.round((totalSubmissions / totalCheckIns) * 100) : 0;
      const evaluationRate = totalSubmissions > 0 ? Math.round((evaluatedSubmissions / totalSubmissions) * 100) : 0;

      setStats({
        totalStudents: studentCount || 0,
        totalTeachers: teacherCount || 0,
        totalTasks: taskCount || 0,
        totalCheckIns,
        totalSubmissions,
        totalEvaluations,
        checkInRate: Math.min(checkInRate, 100),
        submissionRate: Math.min(submissionRate, 100),
        evaluationRate: Math.min(evaluationRate, 100),
        averageScore,
      });

      // 打卡状态分布
      setCheckInDistribution([
        { name: '正常', value: normalCheckIns, color: COLORS[0] },
        { name: '迟到', value: lateCheckIns, color: COLORS[1] },
        { name: '缺勤', value: absentCheckIns, color: COLORS[2] },
      ]);

      // 按天统计
      const dailyStats: Record<string, DailyData> = {};
      const days = dateRange === '7days' ? 7 : dateRange === '30days' ? 30 : new Date().getDate();
      
      for (let i = days - 1; i >= 0; i--) {
        const date = format(subDays(new Date(), i), 'MM/dd');
        dailyStats[date] = { date, checkIns: 0, submissions: 0, evaluations: 0 };
      }

      checkInsData?.forEach(c => {
        const date = format(new Date(c.check_in_time), 'MM/dd');
        if (dailyStats[date]) {
          dailyStats[date].checkIns++;
        }
      });

      submissionsData?.forEach(s => {
        const date = format(new Date(s.submitted_at), 'MM/dd');
        if (dailyStats[date]) {
          dailyStats[date].submissions++;
        }
      });

      evaluationsData?.forEach(e => {
        const date = format(new Date(e.created_at), 'MM/dd');
        if (dailyStats[date]) {
          dailyStats[date].evaluations++;
        }
      });

      setDailyData(Object.values(dailyStats));
    } catch (error) {
      console.error('Error fetching statistics:', error);
      toast.error('获取统计数据失败');
    } finally {
      setLoading(false);
    }
  };

  const exportToCSV = () => {
    const headers = ['日期', '打卡数', '提交数', '评价数'];
    const csvContent = [
      headers.join(','),
      ...dailyData.map(row => `${row.date},${row.checkIns},${row.submissions},${row.evaluations}`),
    ].join('\n');

    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `实训统计数据_${format(new Date(), 'yyyyMMdd')}.csv`;
    link.click();
    
    toast.success('数据导出成功');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* 页面标题 */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <BarChart3 className="h-6 w-6 text-primary" />
            数据统计
          </h1>
          <p className="text-muted-foreground mt-1">
            实训教学数据可视化分析
          </p>
        </div>
        
        <div className="flex gap-3">
          <Select value={dateRange} onValueChange={setDateRange}>
            <SelectTrigger className="w-[150px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7days">最近7天</SelectItem>
              <SelectItem value="30days">最近30天</SelectItem>
              <SelectItem value="month">本月</SelectItem>
            </SelectContent>
          </Select>
          
          <Button variant="outline" onClick={exportToCSV}>
            <Download className="h-4 w-4 mr-2" />
            导出数据
          </Button>
        </div>
      </div>

      {/* 核心指标 */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">学生总数</p>
                <p className="text-2xl font-bold mt-1">{stats.totalStudents}</p>
              </div>
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Users className="h-5 w-5 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">总打卡数</p>
                <p className="text-2xl font-bold mt-1">{stats.totalCheckIns}</p>
              </div>
              <div className="h-10 w-10 rounded-lg bg-success/10 flex items-center justify-center">
                <ClipboardCheck className="h-5 w-5 text-success" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">成果提交</p>
                <p className="text-2xl font-bold mt-1">{stats.totalSubmissions}</p>
              </div>
              <div className="h-10 w-10 rounded-lg bg-info/10 flex items-center justify-center">
                <BookOpen className="h-5 w-5 text-info" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">平均分</p>
                <p className="text-2xl font-bold mt-1">{stats.averageScore || '--'}</p>
              </div>
              <div className="h-10 w-10 rounded-lg bg-warning/10 flex items-center justify-center">
                <Star className="h-5 w-5 text-warning" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 完成率指标 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            完成率指标
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-3 gap-6">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-sm">
                  <CheckCircle2 className="h-4 w-4 text-success" />
                  打卡率
                </span>
                <span className="font-bold text-success">{stats.checkInRate}%</span>
              </div>
              <Progress value={stats.checkInRate} className="h-3" />
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-sm">
                  <BookOpen className="h-4 w-4 text-info" />
                  提交率
                </span>
                <span className="font-bold text-info">{stats.submissionRate}%</span>
              </div>
              <Progress value={stats.submissionRate} className="h-3" />
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-sm">
                  <Star className="h-4 w-4 text-warning" />
                  评价完成率
                </span>
                <span className="font-bold text-warning">{stats.evaluationRate}%</span>
              </div>
              <Progress value={stats.evaluationRate} className="h-3" />
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* 趋势图 */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg">数据趋势</CardTitle>
            <CardDescription>打卡、提交、评价数量变化</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={dailyData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="date" className="text-xs" />
                  <YAxis className="text-xs" />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                    }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="checkIns" 
                    stroke="hsl(var(--success))" 
                    strokeWidth={2}
                    name="打卡"
                  />
                  <Line 
                    type="monotone" 
                    dataKey="submissions" 
                    stroke="hsl(var(--info))" 
                    strokeWidth={2}
                    name="提交"
                  />
                  <Line 
                    type="monotone" 
                    dataKey="evaluations" 
                    stroke="hsl(var(--warning))" 
                    strokeWidth={2}
                    name="评价"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* 打卡状态分布 */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">打卡状态分布</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={checkInDistribution}
                    cx="50%"
                    cy="50%"
                    innerRadius={40}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {checkInDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex justify-center gap-4 mt-4">
              {checkInDistribution.map((item, index) => (
                <div key={index} className="flex items-center gap-2">
                  <div 
                    className="h-3 w-3 rounded-full"
                    style={{ backgroundColor: item.color }}
                  />
                  <span className="text-sm">{item.name}: {item.value}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 每日柱状图 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">每日统计</CardTitle>
          <CardDescription>每日打卡、提交数量对比</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dailyData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="date" className="text-xs" />
                <YAxis className="text-xs" />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                  }}
                />
                <Bar dataKey="checkIns" fill="hsl(var(--success))" name="打卡" radius={[4, 4, 0, 0]} />
                <Bar dataKey="submissions" fill="hsl(var(--info))" name="提交" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
