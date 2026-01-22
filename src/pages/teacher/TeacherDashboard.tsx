import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Link } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { 
  ClipboardCheck, 
  Star, 
  Users,
  Calendar,
  Clock,
  AlertCircle,
  ArrowRight,
  BookOpen,
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { TeacherDashboardSkeleton } from '@/components/ui/dashboard-skeleton';

interface PendingSubmission {
  id: string;
  submitted_at: string;
  profile?: {
    full_name: string;
  };
  task?: {
    name: string;
  };
}

export default function TeacherDashboard() {
  const { user, profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    todayStudents: 0,
    checkedIn: 0,
    pendingEvaluations: 0,
    evaluatedToday: 0,
  });
  const [pendingSubmissions, setPendingSubmissions] = useState<PendingSubmission[]>([]);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const today = format(new Date(), 'yyyy-MM-dd');

      // 获取今日打卡统计
      const { data: checkInsData } = await supabase
        .from('check_ins')
        .select('user_id')
        .gte('check_in_time', `${today}T00:00:00`)
        .lte('check_in_time', `${today}T23:59:59`);

      const uniqueCheckedIn = new Set(checkInsData?.map(c => c.user_id) || []).size;

      // 获取待评价数量
      const { count: pendingCount } = await supabase
        .from('submissions')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending');

      // 获取今日已评价数量
      const { count: evaluatedTodayCount } = await supabase
        .from('evaluations')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', `${today}T00:00:00`)
        .lte('created_at', `${today}T23:59:59`);

      // 获取学生总数（有student角色的用户）
      const { count: studentCount } = await supabase
        .from('user_roles')
        .select('*', { count: 'exact', head: true })
        .eq('role', 'student');

      setStats({
        todayStudents: studentCount || 0,
        checkedIn: uniqueCheckedIn,
        pendingEvaluations: pendingCount || 0,
        evaluatedToday: evaluatedTodayCount || 0,
      });

      // 获取最近待评价的提交
      const { data: submissionsData } = await supabase
        .from('submissions')
        .select(`
          id,
          submitted_at,
          user_id,
          task:training_tasks(name)
        `)
        .eq('status', 'pending')
        .order('submitted_at', { ascending: false })
        .limit(5);

      // 获取用户资料
      const userIds = [...new Set(submissionsData?.map(s => s.user_id) || [])];
      let profilesMap: Record<string, { full_name: string }> = {};
      
      if (userIds.length > 0) {
        const { data: profilesData } = await supabase
          .from('profiles')
          .select('user_id, full_name')
          .in('user_id', userIds);
        
        profilesData?.forEach(p => {
          profilesMap[p.user_id] = { full_name: p.full_name };
        });
      }

      const submissionsWithProfiles = (submissionsData || []).map(s => ({
        id: s.id,
        submitted_at: s.submitted_at,
        profile: profilesMap[s.user_id],
        task: s.task as { name: string } | undefined,
      }));

      setPendingSubmissions(submissionsWithProfiles);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getTimeAgo = (dateString: string) => {
    const date = parseISO(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return '刚刚';
    if (diffMins < 60) return `${diffMins}分钟前`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}小时前`;
    return format(date, 'MM/dd HH:mm');
  };

  if (loading) {
    return <TeacherDashboardSkeleton />;
  }

  return (
    <div className="space-y-4 md:space-y-6 animate-fade-in pb-4">
      {/* 欢迎区域 */}
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between md:gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-bold">
            欢迎回来，{profile?.full_name || '老师'} 👨‍🏫
          </h1>
          <p className="text-sm md:text-base text-muted-foreground mt-1">
            今天有 {stats.pendingEvaluations} 份成果等待您的评价
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs md:text-sm text-muted-foreground">
          <Calendar className="h-3.5 w-3.5 md:h-4 md:w-4" />
          <span>{format(new Date(), 'MM月dd日 EEEE', { locale: zhCN })}</span>
        </div>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 md:gap-4">
        <Card className="card-hover">
          <CardContent className="p-3 md:pt-6 md:px-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-1 md:gap-2">
              <div className="text-center md:text-left">
                <p className="text-xs md:text-sm text-muted-foreground">学生总数</p>
                <p className="text-xl md:text-2xl font-bold mt-0.5">{stats.todayStudents}</p>
              </div>
              <div className="hidden md:flex h-12 w-12 rounded-xl bg-primary/10 items-center justify-center">
                <Users className="h-6 w-6 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="card-hover">
          <CardContent className="p-3 md:pt-6 md:px-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-1 md:gap-2">
              <div className="text-center md:text-left">
                <p className="text-xs md:text-sm text-muted-foreground">今日打卡</p>
                <div className="flex items-baseline justify-center md:justify-start gap-1 mt-0.5">
                  <p className="text-xl md:text-2xl font-bold">{stats.checkedIn}</p>
                  <span className="text-xs md:text-sm text-muted-foreground">/ {stats.todayStudents}</span>
                </div>
              </div>
              <div className="hidden md:flex h-12 w-12 rounded-xl bg-success/10 items-center justify-center">
                <ClipboardCheck className="h-6 w-6 text-success" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="card-hover border-warning/50 bg-warning/5">
          <CardContent className="p-3 md:pt-6 md:px-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-1 md:gap-2">
              <div className="text-center md:text-left">
                <p className="text-xs md:text-sm text-muted-foreground">待评价</p>
                <p className="text-xl md:text-2xl font-bold mt-0.5 text-warning">{stats.pendingEvaluations}</p>
              </div>
              <div className="hidden md:flex h-12 w-12 rounded-xl bg-warning/10 items-center justify-center">
                <AlertCircle className="h-6 w-6 text-warning" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="card-hover">
          <CardContent className="p-3 md:pt-6 md:px-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-1 md:gap-2">
              <div className="text-center md:text-left">
                <p className="text-xs md:text-sm text-muted-foreground">今日已评</p>
                <p className="text-xl md:text-2xl font-bold mt-0.5">{stats.evaluatedToday}</p>
              </div>
              <div className="hidden md:flex h-12 w-12 rounded-xl bg-info/10 items-center justify-center">
                <Star className="h-6 w-6 text-info" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid lg:grid-cols-2 gap-4 md:gap-6">
        {/* 待评价成果 */}
        <Card className="border-0 md:border shadow-none md:shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between px-0 md:px-6">
            <div>
              <CardTitle className="text-base md:text-lg">待评价成果</CardTitle>
              <CardDescription className="text-xs md:text-sm">最新提交的学生作品</CardDescription>
            </div>
            <Button asChild variant="outline" size="sm" className="h-8 text-xs md:text-sm">
              <Link to="/teacher/evaluations">
                查看全部
                <ArrowRight className="ml-1 h-3 w-3 md:h-4 md:w-4" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent className="px-0 md:px-6">
            {pendingSubmissions.length === 0 ? (
              <div className="text-center py-6 md:py-8 text-muted-foreground">
                <Star className="h-8 w-8 md:h-10 md:w-10 mx-auto mb-2 opacity-50" />
                <p className="text-sm">暂无待评价成果</p>
              </div>
            ) : (
              <div className="space-y-2 md:space-y-3">
                {pendingSubmissions.map((submission) => (
                  <div 
                    key={submission.id}
                    className="flex flex-col sm:flex-row sm:items-center gap-2 md:gap-3 p-2.5 md:p-4 rounded-xl border border-border hover:border-primary/50 hover:bg-secondary/30 transition-all"
                  >
                    <div className="flex items-center gap-2 md:gap-3 flex-1 min-w-0">
                      <div className="h-8 w-8 md:h-10 md:w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                        <span className="text-xs md:text-sm font-medium text-primary">
                          {submission.profile?.full_name?.slice(0, 1) || '?'}
                        </span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-sm truncate">{submission.profile?.full_name || '未知用户'}</p>
                        <p className="text-xs text-muted-foreground truncate">{submission.task?.name || '未知任务'}</p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between sm:justify-end gap-2 pl-10 sm:pl-0">
                      <span className="text-[10px] md:text-xs text-muted-foreground flex items-center gap-1 whitespace-nowrap">
                        <Clock className="h-3 w-3" />
                        {getTimeAgo(submission.submitted_at)}
                      </span>
                      <Badge variant="outline" className="text-warning border-warning/50 text-[10px] md:text-xs whitespace-nowrap">
                        待评价
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* 快捷操作 */}
        <Card className="border-0 md:border shadow-none md:shadow-sm">
          <CardHeader className="px-0 md:px-6">
            <CardTitle className="text-base md:text-lg">快捷操作</CardTitle>
            <CardDescription className="text-xs md:text-sm">常用功能快速入口</CardDescription>
          </CardHeader>
          <CardContent className="px-0 md:px-6">
            <div className="space-y-2 md:space-y-3">
              <Link 
                to="/teacher/evaluations"
                className="flex items-center gap-3 p-3 md:p-4 rounded-xl border border-border hover:border-primary hover:bg-secondary/50 transition-all group active:scale-[0.98]"
              >
                <div className="h-10 w-10 md:h-12 md:w-12 rounded-xl gradient-primary flex items-center justify-center shrink-0">
                  <Star className="h-5 w-5 md:h-6 md:w-6 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm md:text-base">成果评价</p>
                  <p className="text-xs md:text-sm text-muted-foreground">批量评价学生作品</p>
                </div>
                <ArrowRight className="h-4 w-4 md:h-5 md:w-5 text-muted-foreground shrink-0" />
              </Link>

              <Link 
                to="/teacher/attendance"
                className="flex items-center gap-3 p-3 md:p-4 rounded-xl border border-border hover:border-primary hover:bg-secondary/50 transition-all group active:scale-[0.98]"
              >
                <div className="h-10 w-10 md:h-12 md:w-12 rounded-xl bg-success/10 flex items-center justify-center shrink-0">
                  <ClipboardCheck className="h-5 w-5 md:h-6 md:w-6 text-success" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm md:text-base">考勤管理</p>
                  <p className="text-xs md:text-sm text-muted-foreground">查看学生打卡情况</p>
                </div>
                <ArrowRight className="h-4 w-4 md:h-5 md:w-5 text-muted-foreground shrink-0" />
              </Link>

              <Link 
                to="/teacher/templates"
                className="flex items-center gap-3 p-3 md:p-4 rounded-xl border border-border hover:border-primary hover:bg-secondary/50 transition-all group active:scale-[0.98]"
              >
                <div className="h-10 w-10 md:h-12 md:w-12 rounded-xl bg-accent flex items-center justify-center shrink-0">
                  <BookOpen className="h-5 w-5 md:h-6 md:w-6 text-accent-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm md:text-base">评语模板</p>
                  <p className="text-xs md:text-sm text-muted-foreground">管理常用评语</p>
                </div>
                <ArrowRight className="h-4 w-4 md:h-5 md:w-5 text-muted-foreground shrink-0" />
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
