import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Link } from 'react-router-dom';
import { 
  ClipboardCheck, 
  Upload, 
  Star, 
  Calendar,
  Clock,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
} from 'lucide-react';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { AiTutor } from '@/components/student/AiTutor';
import { DashboardSkeleton } from '@/components/ui/dashboard-skeleton';

interface TodayTask {
  id: string;
  name: string;
  task_number: string;
  start_time: string | null;
  end_time: string | null;
  course: {
    name: string;
  };
  isCheckedIn: boolean;
}

interface Stats {
  totalTasks: number;
  completedCheckIns: number;
  pendingEvaluations: number;
  averageScore: number;
}

export default function StudentDashboard() {
  const { user, profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [todayTasks, setTodayTasks] = useState<TodayTask[]>([]);
  const [stats, setStats] = useState<Stats>({
    totalTasks: 0,
    completedCheckIns: 0,
    pendingEvaluations: 0,
    averageScore: 0,
  });

  useEffect(() => {
    if (user?.id) {
      fetchDashboardData();
    }
  }, [user?.id]);

  const fetchDashboardData = async () => {
    if (!user?.id) return;

    try {
      const today = format(new Date(), 'yyyy-MM-dd');

      // 获取学生分配的课程
      const { data: studentCoursesData } = await supabase
        .from('student_courses')
        .select('course_id')
        .eq('user_id', user.id);
      
      const courseIds = studentCoursesData?.map(sc => sc.course_id) || [];
      
      // 如果学生没有分配课程，显示空数据
      if (courseIds.length === 0) {
        setTodayTasks([]);
        setStats({ totalTasks: 0, completedCheckIns: 0, pendingEvaluations: 0, averageScore: 0 });
        setLoading(false);
        return;
      }

      // 获取今日任务 - 只获取学生专业相关课程的任务
      const { data: tasksData } = await supabase
        .from('training_tasks')
        .select(`
          id,
          name,
          task_number,
          start_time,
          end_time,
          course:courses(name)
        `)
        .eq('scheduled_date', today)
        .in('course_id', courseIds);

      // 获取今日打卡记录
      const { data: checkInsData } = await supabase
        .from('check_ins')
        .select('task_id')
        .eq('user_id', user.id)
        .gte('check_in_time', `${today}T00:00:00`)
        .lte('check_in_time', `${today}T23:59:59`);

      const checkedInTaskIds = new Set(checkInsData?.map(c => c.task_id) || []);
      
      const todayTasksWithStatus = (tasksData || []).map(task => ({
        ...task,
        course: task.course as { name: string },
        isCheckedIn: checkedInTaskIds.has(task.id),
      }));
      setTodayTasks(todayTasksWithStatus);

      // 获取统计数据 - 只统计学生专业相关的任务
      const { count: totalTasksCount } = await supabase
        .from('training_tasks')
        .select('*', { count: 'exact', head: true })
        .in('course_id', courseIds);

      const { count: completedCheckInsCount } = await supabase
        .from('check_ins')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id);

      // 获取待评价的提交数
      const { count: pendingCount } = await supabase
        .from('submissions')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('status', 'pending');

      // 获取平均分
      const { data: submissionsData } = await supabase
        .from('submissions')
        .select('id')
        .eq('user_id', user.id);

      let avgScore = 0;
      if (submissionsData && submissionsData.length > 0) {
        const submissionIds = submissionsData.map(s => s.id);
        const { data: evaluationsData } = await supabase
          .from('evaluations')
          .select('score')
          .in('submission_id', submissionIds);
        
        if (evaluationsData && evaluationsData.length > 0) {
          avgScore = Math.round(
            evaluationsData.reduce((acc, e) => acc + e.score, 0) / evaluationsData.length
          );
        }
      }

      setStats({
        totalTasks: totalTasksCount || 0,
        completedCheckIns: completedCheckInsCount || 0,
        pendingEvaluations: pendingCount || 0,
        averageScore: avgScore,
      });
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return '早上好';
    if (hour < 18) return '下午好';
    return '晚上好';
  };

  if (loading) {
    return <DashboardSkeleton />;
  }

  const mainTask = todayTasks[0];

  return (
    <div className="space-y-4 md:space-y-6 animate-fade-in pb-4">
      {/* 欢迎区域 */}
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between md:gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-bold">
            {getGreeting()} 👋
          </h1>
          <p className="text-sm md:text-base text-muted-foreground mt-1">
            欢迎回来，{profile?.full_name || user?.email?.split('@')[0]}！
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs md:text-sm text-muted-foreground">
          <Calendar className="h-3.5 w-3.5 md:h-4 md:w-4" />
          <span>{format(new Date(), 'MM月dd日 EEEE', { locale: zhCN })}</span>
        </div>
      </div>

      {/* 今日实训任务卡片 */}
      <Card className="overflow-hidden border-0 shadow-soft">
        <div className="gradient-primary p-4 sm:p-6 text-white">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
            <div className="flex-1 min-w-0">
              <p className="text-sm opacity-90">今日实训任务</p>
              {mainTask ? (
                <>
                  <h2 className="text-xl font-bold mt-1">{mainTask.name}</h2>
                  <div className="flex items-center gap-4 mt-3 text-sm opacity-90">
                    {mainTask.start_time && mainTask.end_time && (
                      <span className="flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        {mainTask.start_time.slice(0, 5)} - {mainTask.end_time.slice(0, 5)}
                      </span>
                    )}
                    <span>任务编号：{mainTask.task_number}</span>
                  </div>
                </>
              ) : (
                <h2 className="text-xl font-bold mt-1">今天没有安排实训任务</h2>
              )}
            </div>
            {mainTask && (
              <div className="shrink-0 mt-2 sm:mt-0">
                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-white/20 text-sm whitespace-nowrap">
                  {mainTask.isCheckedIn ? (
                    <>
                      <CheckCircle2 className="h-4 w-4" />
                      <span>已打卡</span>
                    </>
                  ) : (
                    <>
                      <AlertCircle className="h-4 w-4" />
                      <span>待打卡</span>
                    </>
                  )}
                </span>
              </div>
            )}
          </div>
        </div>
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row gap-3">
            <Button asChild className="flex-1 h-12 gradient-primary text-white">
              <Link to="/student/check-in">
                <ClipboardCheck className="mr-2 h-5 w-5" />
                {todayTasks.length > 0 ? '立即打卡' : '查看打卡记录'}
              </Link>
            </Button>
            <Button asChild variant="outline" className="flex-1 h-12">
              <Link to="/student/submissions">
                <Upload className="mr-2 h-5 w-5" />
                提交成果
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* 统计卡片 */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 md:gap-4">
        <Card className="card-hover">
          <CardContent className="p-3 md:pt-6 md:px-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-1 md:gap-2">
              <div className="text-center md:text-left">
                <p className="text-xs md:text-sm text-muted-foreground">总任务</p>
                <p className="text-xl md:text-2xl font-bold mt-0.5">{stats.totalTasks}</p>
              </div>
              <div className="hidden md:flex h-12 w-12 rounded-xl bg-primary/10 items-center justify-center">
                <Calendar className="h-6 w-6 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="card-hover">
          <CardContent className="p-3 md:pt-6 md:px-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-1 md:gap-2">
              <div className="text-center md:text-left">
                <p className="text-xs md:text-sm text-muted-foreground">已打卡</p>
                <p className="text-xl md:text-2xl font-bold mt-0.5">{stats.completedCheckIns}</p>
              </div>
              <div className="hidden md:flex h-12 w-12 rounded-xl bg-success/10 items-center justify-center">
                <CheckCircle2 className="h-6 w-6 text-success" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="card-hover">
          <CardContent className="p-3 md:pt-6 md:px-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-1 md:gap-2">
              <div className="text-center md:text-left">
                <p className="text-xs md:text-sm text-muted-foreground">待评价</p>
                <p className="text-xl md:text-2xl font-bold mt-0.5">{stats.pendingEvaluations}</p>
              </div>
              <div className="hidden md:flex h-12 w-12 rounded-xl bg-warning/10 items-center justify-center">
                <Star className="h-6 w-6 text-warning" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="card-hover">
          <CardContent className="p-3 md:pt-6 md:px-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-1 md:gap-2">
              <div className="text-center md:text-left">
                <p className="text-xs md:text-sm text-muted-foreground">平均分</p>
                <p className="text-xl md:text-2xl font-bold mt-0.5">{stats.averageScore || '--'}</p>
              </div>
              <div className="hidden md:flex h-12 w-12 rounded-xl bg-info/10 items-center justify-center">
                <Star className="h-6 w-6 text-info" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 快捷操作 */}
      <Card className="border-0 md:border shadow-none md:shadow-sm">
        <CardHeader className="px-0 md:px-6 pb-2 md:pb-4">
          <CardTitle className="text-base md:text-lg">快捷操作</CardTitle>
          <CardDescription className="text-xs md:text-sm">常用功能快速入口</CardDescription>
        </CardHeader>
        <CardContent className="px-0 md:px-6">
          <div className="grid grid-cols-1 gap-2 md:grid-cols-3 md:gap-4">
            <Link 
              to="/student/check-in"
              className="flex items-center gap-3 p-3 md:p-4 rounded-xl border border-border hover:border-primary hover:bg-secondary/50 transition-all group active:scale-[0.98]"
            >
              <div className="h-10 w-10 md:h-12 md:w-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                <ClipboardCheck className="h-5 w-5 md:h-6 md:w-6 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm md:text-base">实训打卡</p>
                <p className="text-xs md:text-sm text-muted-foreground">签到记录考勤</p>
              </div>
              <ArrowRight className="h-4 w-4 md:h-5 md:w-5 text-muted-foreground shrink-0" />
            </Link>

            <Link 
              to="/student/submissions"
              className="flex items-center gap-3 p-3 md:p-4 rounded-xl border border-border hover:border-primary hover:bg-secondary/50 transition-all group active:scale-[0.98]"
            >
              <div className="h-10 w-10 md:h-12 md:w-12 rounded-xl bg-accent flex items-center justify-center shrink-0">
                <Upload className="h-5 w-5 md:h-6 md:w-6 text-accent-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm md:text-base">成果提交</p>
                <p className="text-xs md:text-sm text-muted-foreground">上传实训作品</p>
              </div>
              <ArrowRight className="h-4 w-4 md:h-5 md:w-5 text-muted-foreground shrink-0" />
            </Link>

            <Link 
              to="/student/evaluations"
              className="flex items-center gap-3 p-3 md:p-4 rounded-xl border border-border hover:border-primary hover:bg-secondary/50 transition-all group active:scale-[0.98]"
            >
              <div className="h-10 w-10 md:h-12 md:w-12 rounded-xl bg-warning/10 flex items-center justify-center shrink-0">
                <Star className="h-5 w-5 md:h-6 md:w-6 text-warning" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm md:text-base">评价查看</p>
                <p className="text-xs md:text-sm text-muted-foreground">查看老师评价</p>
              </div>
              <ArrowRight className="h-4 w-4 md:h-5 md:w-5 text-muted-foreground shrink-0" />
            </Link>
          </div>
        </CardContent>
      </Card>
      
      {/* AI 答疑助手浮动按钮 */}
      <AiTutor />
    </div>
  );
}
