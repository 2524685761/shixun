import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { Link } from 'react-router-dom';
import { Progress } from '@/components/ui/progress';
import { 
  Users, 
  BookOpen, 
  BarChart3,
  Settings,
  Calendar,
  ArrowRight,
  TrendingUp,
  ClipboardCheck,
  Star,
  GraduationCap,
} from 'lucide-react';

export default function AdminDashboard() {
  const { user } = useAuth();

  // 模拟数据
  const stats = {
    totalStudents: 320,
    totalTeachers: 15,
    totalCourses: 8,
    totalTasks: 45,
  };

  const overviewData = {
    checkInRate: 96,
    submissionRate: 89,
    evaluationRate: 92,
  };

  const recentActivities = [
    { type: 'user', text: '新增学生 张明', time: '5分钟前' },
    { type: 'course', text: '创建课程 PLC编程实训', time: '1小时前' },
    { type: 'task', text: '发布任务 电路焊接练习', time: '2小时前' },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* 欢迎区域 */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">
            管理中心 🎯
          </h1>
          <p className="text-muted-foreground mt-1">
            全校实训数据一览
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
                <p className="text-sm text-muted-foreground">学生总数</p>
                <p className="text-2xl font-bold mt-1">{stats.totalStudents}</p>
              </div>
              <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
                <GraduationCap className="h-6 w-6 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="card-hover">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">教师总数</p>
                <p className="text-2xl font-bold mt-1">{stats.totalTeachers}</p>
              </div>
              <div className="h-12 w-12 rounded-xl bg-success/10 flex items-center justify-center">
                <Users className="h-6 w-6 text-success" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="card-hover">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">实训课程</p>
                <p className="text-2xl font-bold mt-1">{stats.totalCourses}</p>
              </div>
              <div className="h-12 w-12 rounded-xl bg-warning/10 flex items-center justify-center">
                <BookOpen className="h-6 w-6 text-warning" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="card-hover">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">实训任务</p>
                <p className="text-2xl font-bold mt-1">{stats.totalTasks}</p>
              </div>
              <div className="h-12 w-12 rounded-xl bg-info/10 flex items-center justify-center">
                <ClipboardCheck className="h-6 w-6 text-info" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* 数据概览 */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              本月数据概览
            </CardTitle>
            <CardDescription>各项指标完成情况</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2">
                  <ClipboardCheck className="h-4 w-4 text-success" />
                  打卡率
                </span>
                <span className="font-medium">{overviewData.checkInRate}%</span>
              </div>
              <Progress value={overviewData.checkInRate} className="h-2" />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2">
                  <BookOpen className="h-4 w-4 text-info" />
                  成果提交率
                </span>
                <span className="font-medium">{overviewData.submissionRate}%</span>
              </div>
              <Progress value={overviewData.submissionRate} className="h-2" />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2">
                  <Star className="h-4 w-4 text-warning" />
                  评价完成率
                </span>
                <span className="font-medium">{overviewData.evaluationRate}%</span>
              </div>
              <Progress value={overviewData.evaluationRate} className="h-2" />
            </div>

            <Button asChild className="w-full mt-4">
              <Link to="/admin/statistics">
                <BarChart3 className="mr-2 h-4 w-4" />
                查看详细统计
              </Link>
            </Button>
          </CardContent>
        </Card>

        {/* 快捷操作 */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">快捷操作</CardTitle>
            <CardDescription>管理功能入口</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <Link 
                to="/admin/users"
                className="flex items-center gap-3 p-3 rounded-xl border border-border hover:border-primary hover:bg-secondary/50 transition-all group"
              >
                <div className="h-10 w-10 rounded-lg gradient-primary flex items-center justify-center">
                  <Users className="h-5 w-5 text-white" />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-sm">用户管理</p>
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
              </Link>

              <Link 
                to="/admin/courses"
                className="flex items-center gap-3 p-3 rounded-xl border border-border hover:border-primary hover:bg-secondary/50 transition-all group"
              >
                <div className="h-10 w-10 rounded-lg bg-success/10 flex items-center justify-center">
                  <BookOpen className="h-5 w-5 text-success" />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-sm">课程管理</p>
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
              </Link>

              <Link 
                to="/admin/statistics"
                className="flex items-center gap-3 p-3 rounded-xl border border-border hover:border-primary hover:bg-secondary/50 transition-all group"
              >
                <div className="h-10 w-10 rounded-lg bg-warning/10 flex items-center justify-center">
                  <BarChart3 className="h-5 w-5 text-warning" />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-sm">数据统计</p>
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
              </Link>

              <Link 
                to="/admin/settings"
                className="flex items-center gap-3 p-3 rounded-xl border border-border hover:border-primary hover:bg-secondary/50 transition-all group"
              >
                <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center">
                  <Settings className="h-5 w-5 text-muted-foreground" />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-sm">系统设置</p>
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 最近活动 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">最近活动</CardTitle>
          <CardDescription>系统操作记录</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {recentActivities.map((activity, index) => (
              <div key={index} className="flex items-center gap-4">
                <div className="h-2 w-2 rounded-full bg-primary" />
                <div className="flex-1">
                  <p className="text-sm">{activity.text}</p>
                </div>
                <span className="text-xs text-muted-foreground">{activity.time}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
