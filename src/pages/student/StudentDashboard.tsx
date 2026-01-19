import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
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

export default function StudentDashboard() {
  const { user } = useAuth();

  // 模拟数据 - 后续会从数据库获取
  const todayTask = {
    name: '电工基础实训 - 接线练习',
    taskNumber: 'EL-2024-001',
    time: '08:30 - 11:30',
    location: '实训楼A301',
    isCheckedIn: false,
  };

  const stats = {
    totalTasks: 12,
    completedTasks: 8,
    pendingEvaluations: 2,
    averageScore: 85,
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* 欢迎区域 */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">
            早上好 👋
          </h1>
          <p className="text-muted-foreground mt-1">
            欢迎回来，{user?.email?.split('@')[0]}！今天也要加油哦~
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

      {/* 今日实训任务卡片 */}
      <Card className="overflow-hidden border-0 shadow-soft">
        <div className="gradient-primary p-6 text-white">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm opacity-90">今日实训任务</p>
              <h2 className="text-xl font-bold mt-1">{todayTask.name}</h2>
              <div className="flex items-center gap-4 mt-3 text-sm opacity-90">
                <span className="flex items-center gap-1">
                  <Clock className="h-4 w-4" />
                  {todayTask.time}
                </span>
                <span>任务编号：{todayTask.taskNumber}</span>
              </div>
            </div>
            <div className="text-right">
              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-white/20 text-sm">
                {todayTask.isCheckedIn ? (
                  <>
                    <CheckCircle2 className="h-4 w-4" />
                    已打卡
                  </>
                ) : (
                  <>
                    <AlertCircle className="h-4 w-4" />
                    待打卡
                  </>
                )}
              </span>
            </div>
          </div>
        </div>
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row gap-3">
            <Button asChild className="flex-1 h-12 gradient-primary text-white">
              <Link to="/student/check-in">
                <ClipboardCheck className="mr-2 h-5 w-5" />
                立即打卡
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
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="card-hover">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">总任务数</p>
                <p className="text-2xl font-bold mt-1">{stats.totalTasks}</p>
              </div>
              <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
                <Calendar className="h-6 w-6 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="card-hover">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">已完成</p>
                <p className="text-2xl font-bold mt-1">{stats.completedTasks}</p>
              </div>
              <div className="h-12 w-12 rounded-xl bg-success/10 flex items-center justify-center">
                <CheckCircle2 className="h-6 w-6 text-success" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="card-hover">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">待评价</p>
                <p className="text-2xl font-bold mt-1">{stats.pendingEvaluations}</p>
              </div>
              <div className="h-12 w-12 rounded-xl bg-warning/10 flex items-center justify-center">
                <Star className="h-6 w-6 text-warning" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="card-hover">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">平均分</p>
                <p className="text-2xl font-bold mt-1">{stats.averageScore}</p>
              </div>
              <div className="h-12 w-12 rounded-xl bg-info/10 flex items-center justify-center">
                <Star className="h-6 w-6 text-info" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 快捷操作 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">快捷操作</CardTitle>
          <CardDescription>常用功能快速入口</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Link 
              to="/student/check-in"
              className="flex items-center gap-4 p-4 rounded-xl border border-border hover:border-primary hover:bg-secondary/50 transition-all group"
            >
              <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                <ClipboardCheck className="h-6 w-6 text-primary" />
              </div>
              <div className="flex-1">
                <p className="font-medium">实训打卡</p>
                <p className="text-sm text-muted-foreground">签到记录考勤</p>
              </div>
              <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
            </Link>

            <Link 
              to="/student/submissions"
              className="flex items-center gap-4 p-4 rounded-xl border border-border hover:border-primary hover:bg-secondary/50 transition-all group"
            >
              <div className="h-12 w-12 rounded-xl bg-accent flex items-center justify-center group-hover:bg-accent/80 transition-colors">
                <Upload className="h-6 w-6 text-accent-foreground" />
              </div>
              <div className="flex-1">
                <p className="font-medium">成果提交</p>
                <p className="text-sm text-muted-foreground">上传实训作品</p>
              </div>
              <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
            </Link>

            <Link 
              to="/student/evaluations"
              className="flex items-center gap-4 p-4 rounded-xl border border-border hover:border-primary hover:bg-secondary/50 transition-all group"
            >
              <div className="h-12 w-12 rounded-xl bg-warning/10 flex items-center justify-center group-hover:bg-warning/20 transition-colors">
                <Star className="h-6 w-6 text-warning" />
              </div>
              <div className="flex-1">
                <p className="font-medium">评价查看</p>
                <p className="text-sm text-muted-foreground">查看老师评价</p>
              </div>
              <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
