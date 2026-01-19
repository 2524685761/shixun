import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { 
  ClipboardCheck, 
  Clock, 
  Calendar,
  CheckCircle2,
  AlertCircle,
  MapPin,
  History,
  Loader2,
} from 'lucide-react';
import { format, isToday, parseISO } from 'date-fns';
import { zhCN } from 'date-fns/locale';

interface TrainingTask {
  id: string;
  name: string;
  task_number: string;
  scheduled_date: string;
  start_time: string | null;
  end_time: string | null;
  description: string | null;
  course: {
    name: string;
  };
}

interface CheckInRecord {
  id: string;
  check_in_time: string;
  status: string;
  task: {
    name: string;
    task_number: string;
  };
}

export default function CheckIn() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [checkingIn, setCheckingIn] = useState(false);
  const [todayTasks, setTodayTasks] = useState<TrainingTask[]>([]);
  const [checkInRecords, setCheckInRecords] = useState<CheckInRecord[]>([]);
  const [todayCheckIns, setTodayCheckIns] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchTodayTasks();
    fetchCheckInRecords();
  }, [user?.id]);

  const fetchTodayTasks = async () => {
    if (!user?.id) return;
    
    try {
      const today = format(new Date(), 'yyyy-MM-dd');
      
      // 获取学生分配的课程
      const { data: studentCoursesData } = await supabase
        .from('student_courses')
        .select('course_id')
        .eq('user_id', user.id);
      
      const courseIds = studentCoursesData?.map(sc => sc.course_id) || [];
      
      if (courseIds.length === 0) {
        setTodayTasks([]);
        setLoading(false);
        return;
      }

      // 获取今日任务 - 只获取学生专业相关的任务
      const { data, error } = await supabase
        .from('training_tasks')
        .select(`
          *,
          course:courses(name)
        `)
        .eq('scheduled_date', today)
        .in('course_id', courseIds)
        .order('start_time', { ascending: true });

      if (error) throw error;
      setTodayTasks(data || []);
    } catch (error) {
      console.error('Error fetching tasks:', error);
      toast.error('获取任务失败');
    }
  };

  const fetchCheckInRecords = async () => {
    if (!user?.id) return;
    
    try {
      const { data, error } = await supabase
        .from('check_ins')
        .select(`
          id,
          check_in_time,
          status,
          task:training_tasks(name, task_number)
        `)
        .eq('user_id', user.id)
        .order('check_in_time', { ascending: false })
        .limit(10);

      if (error) throw error;
      
      // Type assertion to handle the joined data
      const records = (data || []) as unknown as CheckInRecord[];
      setCheckInRecords(records);
      
      // 获取今日已打卡的任务ID
      const todayCheckInIds = new Set<string>();
      const today = format(new Date(), 'yyyy-MM-dd');
      
      const { data: todayData } = await supabase
        .from('check_ins')
        .select('task_id')
        .eq('user_id', user.id)
        .gte('check_in_time', `${today}T00:00:00`)
        .lte('check_in_time', `${today}T23:59:59`);
      
      todayData?.forEach(record => todayCheckInIds.add(record.task_id));
      setTodayCheckIns(todayCheckInIds);
    } catch (error) {
      console.error('Error fetching check-in records:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCheckIn = async (taskId: string) => {
    if (!user?.id) return;
    
    setCheckingIn(true);
    try {
      const now = new Date();
      const task = todayTasks.find(t => t.id === taskId);
      
      // 判断打卡状态
      let status = 'normal';
      if (task?.start_time) {
        const [hours, minutes] = task.start_time.split(':').map(Number);
        const taskStartTime = new Date();
        taskStartTime.setHours(hours, minutes, 0, 0);
        
        if (now > taskStartTime) {
          status = 'late';
        }
      }

      const { error } = await supabase
        .from('check_ins')
        .insert({
          user_id: user.id,
          task_id: taskId,
          status,
        });

      if (error) throw error;
      
      toast.success(status === 'late' ? '打卡成功（迟到）' : '打卡成功！');
      fetchCheckInRecords();
    } catch (error: any) {
      console.error('Check-in error:', error);
      toast.error(error.message || '打卡失败，请重试');
    } finally {
      setCheckingIn(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'normal':
        return <Badge className="bg-success/10 text-success hover:bg-success/20">正常</Badge>;
      case 'late':
        return <Badge className="bg-warning/10 text-warning hover:bg-warning/20">迟到</Badge>;
      case 'absent':
        return <Badge className="bg-destructive/10 text-destructive hover:bg-destructive/20">缺勤</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4 md:space-y-6 animate-fade-in pb-safe">
      {/* 页面标题 - 移动端优化 */}
      <div className="flex flex-col gap-2">
        <h1 className="text-xl md:text-2xl font-bold flex items-center gap-2">
          <ClipboardCheck className="h-5 w-5 md:h-6 md:w-6 text-primary" />
          实训打卡
        </h1>
        <p className="text-sm md:text-base text-muted-foreground">
          {format(new Date(), 'yyyy年MM月dd日 EEEE', { locale: zhCN })}
        </p>
      </div>

      {/* 今日任务列表 - 移动端优化 */}
      <Card className="border-0 md:border shadow-none md:shadow-sm">
        <CardHeader className="px-0 md:px-6 pb-3 md:pb-4">
          <CardTitle className="text-base md:text-lg flex items-center gap-2">
            <Calendar className="h-4 w-4 md:h-5 md:w-5" />
            今日实训任务
          </CardTitle>
          <CardDescription className="text-sm">
            {todayTasks.length > 0 
              ? `共 ${todayTasks.length} 个任务，已打卡 ${todayCheckIns.size} 个`
              : '今天没有安排实训任务'}
          </CardDescription>
        </CardHeader>
        <CardContent className="px-0 md:px-6">
          {todayTasks.length === 0 ? (
            <div className="text-center py-8 md:py-12 text-muted-foreground">
              <Calendar className="h-10 w-10 md:h-12 md:w-12 mx-auto mb-3 opacity-50" />
              <p className="text-sm md:text-base">今天没有实训任务安排</p>
              <p className="text-xs md:text-sm mt-1">请查看最近的打卡记录</p>
            </div>
          ) : (
            <div className="space-y-3 md:space-y-4">
              {todayTasks.map((task) => {
                const isCheckedIn = todayCheckIns.has(task.id);
                
                return (
                  <div 
                    key={task.id}
                    className={`p-3 md:p-4 rounded-xl border transition-all ${
                      isCheckedIn 
                        ? 'bg-success/5 border-success/30' 
                        : 'bg-card border-border hover:border-primary/50 active:scale-[0.99]'
                    }`}
                  >
                    <div className="flex flex-col gap-3">
                      <div className="flex items-start gap-3">
                        <div className={`p-2 rounded-lg shrink-0 ${
                          isCheckedIn ? 'bg-success/10' : 'bg-primary/10'
                        }`}>
                          {isCheckedIn ? (
                            <CheckCircle2 className="h-4 w-4 md:h-5 md:w-5 text-success" />
                          ) : (
                            <AlertCircle className="h-4 w-4 md:h-5 md:w-5 text-primary" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-medium text-sm md:text-base leading-tight">{task.name}</h3>
                          <p className="text-xs md:text-sm text-muted-foreground mt-0.5">
                            {task.course?.name} · {task.task_number}
                          </p>
                          {task.start_time && task.end_time && (
                            <div className="flex items-center gap-1 mt-1.5 text-xs md:text-sm text-muted-foreground">
                              <Clock className="h-3.5 w-3.5" />
                              <span>{task.start_time.slice(0, 5)} - {task.end_time.slice(0, 5)}</span>
                            </div>
                          )}
                        </div>
                      </div>
                      
                      {/* 打卡按钮 - 移动端全宽 */}
                      <div className="w-full">
                        {isCheckedIn ? (
                          <Badge className="w-full justify-center bg-success/10 text-success hover:bg-success/20 px-4 py-2.5 text-sm">
                            <CheckCircle2 className="h-4 w-4 mr-1.5" />
                            已打卡
                          </Badge>
                        ) : (
                          <Button 
                            onClick={() => handleCheckIn(task.id)}
                            disabled={checkingIn}
                            className="w-full h-11 md:h-10 gradient-primary text-white text-sm md:text-base"
                          >
                            {checkingIn ? (
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            ) : (
                              <ClipboardCheck className="h-4 w-4 mr-2" />
                            )}
                            立即打卡
                          </Button>
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

      {/* 打卡历史 - 移动端优化 */}
      <Card className="border-0 md:border shadow-none md:shadow-sm">
        <CardHeader className="px-0 md:px-6 pb-3 md:pb-4">
          <CardTitle className="text-base md:text-lg flex items-center gap-2">
            <History className="h-4 w-4 md:h-5 md:w-5" />
            最近打卡记录
          </CardTitle>
        </CardHeader>
        <CardContent className="px-0 md:px-6">
          {checkInRecords.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <History className="h-10 w-10 md:h-12 md:w-12 mx-auto mb-3 opacity-50" />
              <p className="text-sm md:text-base">暂无打卡记录</p>
            </div>
          ) : (
            <div className="space-y-2 md:space-y-3">
              {checkInRecords.map((record) => (
                <div 
                  key={record.id}
                  className="flex items-center justify-between p-2.5 md:p-3 rounded-lg bg-secondary/30"
                >
                  <div className="flex items-center gap-2.5 md:gap-3 min-w-0">
                    <div className="p-1.5 md:p-2 rounded-lg bg-primary/10 shrink-0">
                      <ClipboardCheck className="h-3.5 w-3.5 md:h-4 md:w-4 text-primary" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium text-xs md:text-sm truncate">{record.task?.name}</p>
                      <p className="text-[10px] md:text-xs text-muted-foreground">
                        {record.task?.task_number}
                      </p>
                    </div>
                  </div>
                  <div className="text-right flex items-center gap-2 md:gap-3 shrink-0">
                    {getStatusBadge(record.status)}
                    <div>
                      <p className="text-xs md:text-sm font-medium">
                        {format(parseISO(record.check_in_time), 'HH:mm')}
                      </p>
                      <p className="text-[10px] md:text-xs text-muted-foreground">
                        {format(parseISO(record.check_in_time), 'MM/dd')}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
