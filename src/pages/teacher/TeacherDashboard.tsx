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
  Loader2,
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { zhCN } from 'date-fns/locale';

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
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* 欢迎区域 */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">
            欢迎回来，{profile?.full_name || '老师'} 👨‍🏫
          </h1>
          <p className="text-muted-foreground mt-1">
            今天有 {stats.pendingEvaluations} 份成果等待您的评价
          </p>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Calendar className="h-4 w-4" />
          <span>{format(new Date(), 'yyyy年MM月dd日 EEEE', { locale: zhCN })}</span>
        </div>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="card-hover">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">学生总数</p>
                <p className="text-2xl font-bold mt-1">{stats.todayStudents}</p>
              </div>
              <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
                <Users className="h-6 w-6 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="card-hover">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">今日打卡</p>
                <div className="flex items-baseline gap-1 mt-1">
                  <p className="text-2xl font-bold">{stats.checkedIn}</p>
                  <span className="text-sm text-muted-foreground">/ {stats.todayStudents}</span>
                </div>
              </div>
              <div className="h-12 w-12 rounded-xl bg-success/10 flex items-center justify-center">
                <ClipboardCheck className="h-6 w-6 text-success" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="card-hover border-warning/50 bg-warning/5">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">待评价</p>
                <p className="text-2xl font-bold mt-1 text-warning">{stats.pendingEvaluations}</p>
              </div>
              <div className="h-12 w-12 rounded-xl bg-warning/10 flex items-center justify-center">
                <AlertCircle className="h-6 w-6 text-warning" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="card-hover">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">今日已评</p>
                <p className="text-2xl font-bold mt-1">{stats.evaluatedToday}</p>
              </div>
              <div className="h-12 w-12 rounded-xl bg-info/10 flex items-center justify-center">
                <Star className="h-6 w-6 text-info" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* 待评价成果 */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-lg">待评价成果</CardTitle>
              <CardDescription>最新提交的学生作品</CardDescription>
            </div>
            <Button asChild variant="outline" size="sm">
              <Link to="/teacher/evaluations">
                查看全部
                <ArrowRight className="ml-1 h-4 w-4" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            {pendingSubmissions.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Star className="h-10 w-10 mx-auto mb-2 opacity-50" />
                <p>暂无待评价成果</p>
              </div>
            ) : (
              <div className="space-y-3">
                {pendingSubmissions.map((submission) => (
                  <div 
                    key={submission.id}
                    className="flex items-center justify-between p-4 rounded-xl border border-border hover:border-primary/50 hover:bg-secondary/30 transition-all"
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <span className="text-sm font-medium text-primary">
                          {submission.profile?.full_name?.slice(0, 1) || '?'}
                        </span>
                      </div>
                      <div>
                        <p className="font-medium">{submission.profile?.full_name || '未知用户'}</p>
                        <p className="text-sm text-muted-foreground">{submission.task?.name || '未知任务'}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {getTimeAgo(submission.submitted_at)}
                      </span>
                      <Badge variant="outline" className="text-warning border-warning/50">
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
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">快捷操作</CardTitle>
            <CardDescription>常用功能快速入口</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <Link 
                to="/teacher/evaluations"
                className="flex items-center gap-4 p-4 rounded-xl border border-border hover:border-primary hover:bg-secondary/50 transition-all group"
              >
                <div className="h-12 w-12 rounded-xl gradient-primary flex items-center justify-center">
                  <Star className="h-6 w-6 text-white" />
                </div>
                <div className="flex-1">
                  <p className="font-medium">成果评价</p>
                  <p className="text-sm text-muted-foreground">批量评价学生作品</p>
                </div>
                <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
              </Link>

              <Link 
                to="/teacher/attendance"
                className="flex items-center gap-4 p-4 rounded-xl border border-border hover:border-primary hover:bg-secondary/50 transition-all group"
              >
                <div className="h-12 w-12 rounded-xl bg-success/10 flex items-center justify-center">
                  <ClipboardCheck className="h-6 w-6 text-success" />
                </div>
                <div className="flex-1">
                  <p className="font-medium">考勤管理</p>
                  <p className="text-sm text-muted-foreground">查看学生打卡情况</p>
                </div>
                <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
              </Link>

              <Link 
                to="/teacher/templates"
                className="flex items-center gap-4 p-4 rounded-xl border border-border hover:border-primary hover:bg-secondary/50 transition-all group"
              >
                <div className="h-12 w-12 rounded-xl bg-accent flex items-center justify-center">
                  <BookOpen className="h-6 w-6 text-accent-foreground" />
                </div>
                <div className="flex-1">
                  <p className="font-medium">评语模板</p>
                  <p className="text-sm text-muted-foreground">管理常用评语</p>
                </div>
                <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
