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
    try {
      const today = format(new Date(), 'yyyy-MM-dd');
      const { data, error } = await supabase
        .from('training_tasks')
        .select(`
          *,
          course:courses(name)
        `)
        .eq('scheduled_date', today)
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
    <div className="space-y-6 animate-fade-in">
      {/* 页面标题 */}
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <ClipboardCheck className="h-6 w-6 text-primary" />
          实训打卡
        </h1>
        <p className="text-muted-foreground mt-1">
          {format(new Date(), 'yyyy年MM月dd日 EEEE', { locale: zhCN })}
        </p>
      </div>

      {/* 今日任务列表 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            今日实训任务
          </CardTitle>
          <CardDescription>
            {todayTasks.length > 0 
              ? `共 ${todayTasks.length} 个任务，已打卡 ${todayCheckIns.size} 个`
              : '今天没有安排实训任务'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {todayTasks.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Calendar className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>今天没有实训任务安排</p>
              <p className="text-sm mt-1">请查看最近的打卡记录</p>
            </div>
          ) : (
            <div className="space-y-4">
              {todayTasks.map((task) => {
                const isCheckedIn = todayCheckIns.has(task.id);
                
                return (
                  <div 
                    key={task.id}
                    className={`p-4 rounded-xl border transition-all ${
                      isCheckedIn 
                        ? 'bg-success/5 border-success/30' 
                        : 'bg-card border-border hover:border-primary/50'
                    }`}
                  >
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-start gap-3">
                          <div className={`p-2 rounded-lg ${
                            isCheckedIn ? 'bg-success/10' : 'bg-primary/10'
                          }`}>
                            {isCheckedIn ? (
                              <CheckCircle2 className="h-5 w-5 text-success" />
                            ) : (
                              <AlertCircle className="h-5 w-5 text-primary" />
                            )}
                          </div>
                          <div>
                            <h3 className="font-medium">{task.name}</h3>
                            <p className="text-sm text-muted-foreground mt-0.5">
                              {task.course?.name} · {task.task_number}
                            </p>
                            <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                              {task.start_time && task.end_time && (
                                <span className="flex items-center gap-1">
                                  <Clock className="h-4 w-4" />
                                  {task.start_time.slice(0, 5)} - {task.end_time.slice(0, 5)}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      <div>
                        {isCheckedIn ? (
                          <Badge className="bg-success/10 text-success hover:bg-success/20 px-4 py-2">
                            <CheckCircle2 className="h-4 w-4 mr-1" />
                            已打卡
                          </Badge>
                        ) : (
                          <Button 
                            onClick={() => handleCheckIn(task.id)}
                            disabled={checkingIn}
                            className="gradient-primary text-white"
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

      {/* 打卡历史 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <History className="h-5 w-5" />
            最近打卡记录
          </CardTitle>
        </CardHeader>
        <CardContent>
          {checkInRecords.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <History className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>暂无打卡记录</p>
            </div>
          ) : (
            <div className="space-y-3">
              {checkInRecords.map((record) => (
                <div 
                  key={record.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-secondary/30"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-primary/10">
                      <ClipboardCheck className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium text-sm">{record.task?.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {record.task?.task_number}
                      </p>
                    </div>
                  </div>
                  <div className="text-right flex items-center gap-3">
                    {getStatusBadge(record.status)}
                    <div>
                      <p className="text-sm font-medium">
                        {format(parseISO(record.check_in_time), 'HH:mm')}
                      </p>
                      <p className="text-xs text-muted-foreground">
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
