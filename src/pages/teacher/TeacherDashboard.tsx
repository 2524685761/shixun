import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
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

export default function TeacherDashboard() {
  const { user } = useAuth();

  // 模拟数据
  const stats = {
    todayStudents: 45,
    checkedIn: 42,
    pendingEvaluations: 8,
    evaluatedToday: 15,
  };

  const pendingSubmissions = [
    { id: 1, studentName: '张三', taskName: '电工接线实训', submittedAt: '10分钟前' },
    { id: 2, studentName: '李四', taskName: '电工接线实训', submittedAt: '25分钟前' },
    { id: 3, studentName: '王五', taskName: '电工接线实训', submittedAt: '1小时前' },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* 欢迎区域 */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">
            欢迎回来，老师 👨‍🏫
          </h1>
          <p className="text-muted-foreground mt-1">
            今天有 {stats.pendingEvaluations} 份成果等待您的评价
          </p>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Calendar className="h-4 w-4" />
          <span>{new Date().toLocaleDateString('zh-CN', { 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric',
            weekday: 'long'
          })}</span>
        </div>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="card-hover">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">今日学生</p>
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
                <p className="text-sm text-muted-foreground">已打卡</p>
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
            <div className="space-y-3">
              {pendingSubmissions.map((submission) => (
                <div 
                  key={submission.id}
                  className="flex items-center justify-between p-4 rounded-xl border border-border hover:border-primary/50 hover:bg-secondary/30 transition-all"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <span className="text-sm font-medium text-primary">
                        {submission.studentName.slice(0, 1)}
                      </span>
                    </div>
                    <div>
                      <p className="font-medium">{submission.studentName}</p>
                      <p className="text-sm text-muted-foreground">{submission.taskName}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {submission.submittedAt}
                    </span>
                    <Badge variant="outline" className="text-warning border-warning/50">
                      待评价
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
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
