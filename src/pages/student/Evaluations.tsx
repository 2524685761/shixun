import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { 
  Star, 
  TrendingUp,
  Award,
  Calendar,
  MessageSquare,
  Loader2,
  BarChart3,
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { zhCN } from 'date-fns/locale';

interface Evaluation {
  id: string;
  score: number;
  comment: string | null;
  created_at: string;
  submission: {
    id: string;
    content: string | null;
    task: {
      name: string;
      task_number: string;
      course: {
        name: string;
      };
    };
  };
  teacher_profile?: {
    full_name: string;
  };
}

interface Stats {
  totalEvaluations: number;
  averageScore: number;
  highestScore: number;
  lowestScore: number;
  recentTrend: 'up' | 'down' | 'stable';
}

export default function Evaluations() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [evaluations, setEvaluations] = useState<Evaluation[]>([]);
  const [stats, setStats] = useState<Stats>({
    totalEvaluations: 0,
    averageScore: 0,
    highestScore: 0,
    lowestScore: 0,
    recentTrend: 'stable',
  });

  useEffect(() => {
    fetchEvaluations();
  }, [user?.id]);

  const fetchEvaluations = async () => {
    if (!user?.id) return;
    
    try {
      // 先获取用户的所有提交ID
      const { data: submissionsData, error: submissionsError } = await supabase
        .from('submissions')
        .select('id')
        .eq('user_id', user.id);

      if (submissionsError) throw submissionsError;
      
      const submissionIds = submissionsData?.map(s => s.id) || [];
      
      if (submissionIds.length === 0) {
        setEvaluations([]);
        setLoading(false);
        return;
      }

      // 获取这些提交的评价
      const { data: evaluationsData, error: evaluationsError } = await supabase
        .from('evaluations')
        .select(`
          id,
          score,
          comment,
          created_at,
          teacher_id,
          submission:submissions(
            id,
            content,
            task:training_tasks(
              name,
              task_number,
              course:courses(name)
            )
          )
        `)
        .in('submission_id', submissionIds)
        .order('created_at', { ascending: false });

      if (evaluationsError) throw evaluationsError;
      
      // 获取教师信息
      const teacherIds = [...new Set(evaluationsData?.map(e => e.teacher_id) || [])];
      let teacherMap: Record<string, { full_name: string }> = {};
      
      if (teacherIds.length > 0) {
        const { data: profilesData } = await supabase
          .from('profiles')
          .select('user_id, full_name')
          .in('user_id', teacherIds);
        
        profilesData?.forEach(p => {
          teacherMap[p.user_id] = { full_name: p.full_name };
        });
      }

      const evaluationsWithTeacher = (evaluationsData || []).map(e => ({
        ...e,
        teacher_profile: teacherMap[e.teacher_id],
      })) as unknown as Evaluation[];

      setEvaluations(evaluationsWithTeacher);
      
      // 计算统计数据
      if (evaluationsWithTeacher.length > 0) {
        const scores = evaluationsWithTeacher.map(e => e.score);
        const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
        
        // 计算趋势（比较最近3次和之前3次的平均分）
        let trend: 'up' | 'down' | 'stable' = 'stable';
        if (scores.length >= 6) {
          const recent = scores.slice(0, 3).reduce((a, b) => a + b, 0) / 3;
          const previous = scores.slice(3, 6).reduce((a, b) => a + b, 0) / 3;
          trend = recent > previous + 5 ? 'up' : recent < previous - 5 ? 'down' : 'stable';
        }
        
        setStats({
          totalEvaluations: evaluationsWithTeacher.length,
          averageScore: Math.round(avg * 10) / 10,
          highestScore: Math.max(...scores),
          lowestScore: Math.min(...scores),
          recentTrend: trend,
        });
      }
    } catch (error) {
      console.error('Error fetching evaluations:', error);
      toast.error('获取评价数据失败');
    } finally {
      setLoading(false);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-success';
    if (score >= 80) return 'text-info';
    if (score >= 70) return 'text-warning';
    if (score >= 60) return 'text-orange-500';
    return 'text-destructive';
  };

  const getScoreLevel = (score: number) => {
    if (score >= 90) return { label: '优秀', color: 'bg-success/10 text-success' };
    if (score >= 80) return { label: '良好', color: 'bg-info/10 text-info' };
    if (score >= 70) return { label: '中等', color: 'bg-warning/10 text-warning' };
    if (score >= 60) return { label: '及格', color: 'bg-orange-500/10 text-orange-500' };
    return { label: '不及格', color: 'bg-destructive/10 text-destructive' };
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
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Star className="h-6 w-6 text-primary" />
          评价查看
        </h1>
        <p className="text-muted-foreground mt-1">
          查看教师对您实训成果的评价与反馈
        </p>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4">
        <Card className="card-hover">
          <CardContent className="p-3 sm:pt-6 sm:px-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div className="text-center sm:text-left">
                <p className="text-xs sm:text-sm text-muted-foreground">平均分</p>
                <p className={`text-2xl sm:text-3xl font-bold mt-0.5 sm:mt-1 ${getScoreColor(stats.averageScore)}`}>
                  {stats.averageScore || '--'}
                </p>
              </div>
              <div className="hidden sm:flex h-12 w-12 rounded-xl bg-primary/10 items-center justify-center">
                <BarChart3 className="h-6 w-6 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="card-hover">
          <CardContent className="p-3 sm:pt-6 sm:px-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div className="text-center sm:text-left">
                <p className="text-xs sm:text-sm text-muted-foreground">最高分</p>
                <p className="text-2xl sm:text-3xl font-bold mt-0.5 sm:mt-1 text-success">
                  {stats.highestScore || '--'}
                </p>
              </div>
              <div className="hidden sm:flex h-12 w-12 rounded-xl bg-success/10 items-center justify-center">
                <Award className="h-6 w-6 text-success" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="card-hover">
          <CardContent className="p-3 sm:pt-6 sm:px-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div className="text-center sm:text-left">
                <p className="text-xs sm:text-sm text-muted-foreground">评价总数</p>
                <p className="text-2xl sm:text-3xl font-bold mt-0.5 sm:mt-1">{stats.totalEvaluations}</p>
              </div>
              <div className="hidden sm:flex h-12 w-12 rounded-xl bg-info/10 items-center justify-center">
                <Star className="h-6 w-6 text-info" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="card-hover">
          <CardContent className="p-3 sm:pt-6 sm:px-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div className="text-center sm:text-left">
                <p className="text-xs sm:text-sm text-muted-foreground">近期趋势</p>
                <p className="text-lg sm:text-xl font-bold mt-0.5 sm:mt-1 flex items-center justify-center sm:justify-start gap-1">
                  {stats.recentTrend === 'up' && (
                    <>
                      <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5 text-success" />
                      <span className="text-success">上升</span>
                    </>
                  )}
                  {stats.recentTrend === 'down' && (
                    <>
                      <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5 text-destructive rotate-180" />
                      <span className="text-destructive">下降</span>
                    </>
                  )}
                  {stats.recentTrend === 'stable' && (
                    <span className="text-muted-foreground">稳定</span>
                  )}
                </p>
              </div>
              <div className="hidden sm:flex h-12 w-12 rounded-xl bg-warning/10 items-center justify-center">
                <TrendingUp className="h-6 w-6 text-warning" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 分数分布 */}
      {evaluations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">分数分布</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[
                { range: '90-100', label: '优秀', color: 'bg-success' },
                { range: '80-89', label: '良好', color: 'bg-info' },
                { range: '70-79', label: '中等', color: 'bg-warning' },
                { range: '60-69', label: '及格', color: 'bg-orange-500' },
                { range: '0-59', label: '不及格', color: 'bg-destructive' },
              ].map(({ range, label, color }) => {
                const [min, max] = range.split('-').map(Number);
                const count = evaluations.filter(e => e.score >= min && e.score <= max).length;
                const percentage = (count / evaluations.length) * 100;
                
                return (
                  <div key={range} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">{label} ({range})</span>
                      <span className="font-medium">{count} 次</span>
                    </div>
                    <Progress value={percentage} className={`h-2 [&>div]:${color}`} />
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* 评价列表 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">评价记录</CardTitle>
          <CardDescription>
            按时间倒序排列的所有评价
          </CardDescription>
        </CardHeader>
        <CardContent>
          {evaluations.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Star className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>暂无评价记录</p>
              <p className="text-sm mt-1">完成实训任务后，等待老师评价</p>
            </div>
          ) : (
            <div className="space-y-4">
              {evaluations.map((evaluation) => {
                const scoreLevel = getScoreLevel(evaluation.score);
                
                return (
                  <div 
                    key={evaluation.id}
                    className="p-4 rounded-xl border border-border hover:border-primary/30 transition-all"
                  >
                    <div className="flex flex-col md:flex-row gap-4">
                      {/* 分数区域 */}
                      <div className="flex items-center md:flex-col md:items-center md:justify-center md:w-24 md:border-r md:pr-4">
                        <span className={`text-4xl font-bold ${getScoreColor(evaluation.score)}`}>
                          {evaluation.score}
                        </span>
                        <Badge className={`ml-2 md:ml-0 md:mt-2 ${scoreLevel.color}`}>
                          {scoreLevel.label}
                        </Badge>
                      </div>
                      
                      {/* 内容区域 */}
                      <div className="flex-1">
                        <div className="flex items-start justify-between">
                          <div>
                            <h3 className="font-medium">{evaluation.submission?.task?.name}</h3>
                            <p className="text-sm text-muted-foreground">
                              {evaluation.submission?.task?.course?.name} · {evaluation.submission?.task?.task_number}
                            </p>
                          </div>
                          <div className="text-right text-sm text-muted-foreground">
                            <div className="flex items-center gap-1">
                              <Calendar className="h-4 w-4" />
                              {format(parseISO(evaluation.created_at), 'MM/dd')}
                            </div>
                          </div>
                        </div>
                        
                        {evaluation.comment && (
                          <div className="mt-3 p-3 rounded-lg bg-secondary/30">
                            <div className="flex items-start gap-2">
                              <MessageSquare className="h-4 w-4 text-muted-foreground mt-0.5" />
                              <div className="flex-1">
                                <p className="text-sm text-muted-foreground mb-1">教师评语</p>
                                <p className="text-sm">{evaluation.comment}</p>
                              </div>
                            </div>
                          </div>
                        )}
                        
                        {evaluation.teacher_profile && (
                          <p className="mt-2 text-xs text-muted-foreground">
                            评价教师：{evaluation.teacher_profile.full_name}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
